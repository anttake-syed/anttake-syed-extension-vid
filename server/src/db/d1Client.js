/**
 * db/d1Client.js — Cloudflare D1 HTTP API client
 *
 * Wraps the Cloudflare D1 REST API in a Prisma-compatible interface
 * so controllers don't need to change when switching from SQLite → D1.
 *
 * Required env vars (set in .env when SERVER_MODE=cloud):
 *   CF_ACCOUNT_ID      — found on Cloudflare dashboard home page
 *   CF_D1_DATABASE_ID  — found in Workers & Pages > D1 > your database
 *   CF_API_TOKEN       — create at dash.cloudflare.com/profile/api-tokens
 *                        with permission: Account > D1 > Edit
 *
 * D1 REST API docs:
 *   https://developers.cloudflare.com/api/operations/cloudflare-d1-query-database
 */

const CF_ACCOUNT_ID     = process.env.CF_ACCOUNT_ID;
const CF_D1_DATABASE_ID = process.env.CF_D1_DATABASE_ID;
const CF_API_TOKEN      = process.env.CF_API_TOKEN;

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}`;

// ── Raw query helper ──────────────────────────────────────────────────────────
async function query(sql, params = []) {
  if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_API_TOKEN) {
    throw new Error(
      'D1 not configured. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, and CF_API_TOKEN in .env'
    );
  }

  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const msg = json.errors?.[0]?.message || 'D1 query failed';
    throw new Error(`D1 Error: ${msg}`);
  }

  // D1 returns: { result: [{ results: [...rows], success: true }] }
  return json.result?.[0]?.results ?? [];
}

// ── ID generator (cuid-like using timestamp + random) ─────────────────────────
function newId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

// ── Prisma-compatible model interface ─────────────────────────────────────────
// Each model mirrors the Prisma methods used in controllers:
//   findUnique({ where })
//   findMany({ where, orderBy, include })
//   create({ data })
//   update({ where, data })
//   delete({ where })
//   upsert({ where, create, update })
//   count({ where })
//   deleteMany({ where })

// ── Helper: build a simple WHERE clause from a flat object ─────────────────────
// Supports:
//   { key: value }          → "key" = ?
//   { key: { in: [...] } }  → "key" IN (?,?,?)
//   { key: { gte: val } }   → "key" >= ?
//   { key: { lt:  val } }   → "key" < ?
function buildWhere(where = {}) {
  const keys = Object.keys(where).filter(k => where[k] !== undefined);
  if (keys.length === 0) return { clause: '', params: [] };

  const parts = [];
  const params = [];

  for (const k of keys) {
    const val = where[k];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      // Operator object: { in, gte, lte, lt, gt, not }
      if (val.in !== undefined) {
        const arr = val.in;
        if (!arr || arr.length === 0) {
          // Nothing can match an empty IN list — use a always-false condition
          parts.push('1 = 0');
        } else {
          parts.push(`"${k}" IN (${arr.map(() => '?').join(', ')})`);
          params.push(...arr);
        }
      }
      if (val.gte !== undefined) { parts.push(`"${k}" >= ?`); params.push(val.gte instanceof Date ? val.gte.toISOString() : val.gte); }
      if (val.gt  !== undefined) { parts.push(`"${k}" > ?`);  params.push(val.gt  instanceof Date ? val.gt.toISOString()  : val.gt);  }
      if (val.lte !== undefined) { parts.push(`"${k}" <= ?`); params.push(val.lte instanceof Date ? val.lte.toISOString() : val.lte); }
      if (val.lt  !== undefined) { parts.push(`"${k}" < ?`);  params.push(val.lt  instanceof Date ? val.lt.toISOString()  : val.lt);  }
    } else {
      parts.push(`"${k}" = ?`);
      params.push(val instanceof Date ? val.toISOString() : val);
    }
  }

  const clause = parts.length > 0 ? 'WHERE ' + parts.join(' AND ') : '';
  return { clause, params };
}

// ── Helper: build SET clause ──────────────────────────────────────────────────
function buildSet(data = {}) {
  const keys = Object.keys(data).filter(k => data[k] !== undefined);
  const clause = keys.map(k => `"${k}" = ?`).join(', ');
  const params = keys.map(k => {
    // Convert BigInt to number for D1 (D1 stores as INTEGER)
    if (typeof data[k] === 'bigint') return Number(data[k]);
    if (data[k] instanceof Date) return data[k].toISOString();
    return data[k];
  });
  return { clause, params };
}

// ── Helper: coerce a raw D1 row to look like a Prisma row ────────────────────
function coerceRow(row) {
  if (!row) return null;
  const r = { ...row };
  // Convert ISO date strings back to Date objects
  for (const k of Object.keys(r)) {
    if (typeof r[k] === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(r[k])) {
      r[k] = new Date(r[k]);
    }
  }
  return r;
}

// ── Relations Map for `include` ─────────────────────────────────────────────
const RELATIONS = {
  User: {
    subscription: { table: 'Subscription', fkey: 'userId', type: 'one' },
    storageAccount: { table: 'StorageAccount', fkey: 'userId', type: 'one' },
    googleDriveConnection: { table: 'GoogleDriveConnection', fkey: 'userId', type: 'one' },
    usage: { table: 'Usage', fkey: 'userId', type: 'one' }
  },
  Subscription: {
    plan: { table: 'Plan', fkey: 'id', localKey: 'planId', type: 'one' }
  },
  Capture: {
    storageObject: { table: 'StorageObject', fkey: 'captureId', type: 'one' }
  },
  Board: {
    items: { table: 'BoardItem', fkey: 'boardId', type: 'many' }
  },
  BoardItem: {
    board: { table: 'Board', fkey: 'id', localKey: 'boardId', type: 'one' },
    capture: { table: 'Capture', fkey: 'id', localKey: 'captureId', type: 'one' }
  }
};

async function resolveIncludes(modelName, rows, includeObj) {
  if (!rows || rows.length === 0 || !includeObj) return rows;
  const rels = RELATIONS[modelName];
  if (!rels) return rows;

  for (const row of rows) {
    for (const [key, val] of Object.entries(includeObj)) {
      if (!val) continue;
      const rel = rels[key];
      if (!rel) continue;

      let subRows = [];
      if (rel.localKey) {
        // BelongsTo (e.g. Subscription -> Plan)
        if (row[rel.localKey]) {
          subRows = await query(`SELECT * FROM "${rel.table}" WHERE "${rel.fkey}" = ?`, [row[rel.localKey]]);
        }
      } else {
        // HasOne / HasMany (e.g. User -> Subscription)
        subRows = await query(`SELECT * FROM "${rel.table}" WHERE "${rel.fkey}" = ?`, [row.id]);
      }
      
      subRows = subRows.map(coerceRow);
      
      // Recursive nested include — handles both { include: {...} } and { select: {...} } patterns
      if (typeof val === 'object') {
        if (val.include) {
          subRows = await resolveIncludes(rel.table, subRows, val.include);
        } else if (val.select) {
          // Extract only relation keys from the select object for recursion
          const nestedRels = Object.fromEntries(
            Object.entries(val.select).filter(([k, v]) => typeof v === 'object' && v !== null)
          );
          if (Object.keys(nestedRels).length > 0) {
            subRows = await resolveIncludes(rel.table, subRows, nestedRels);
          }
        }
      }
      
      row[key] = rel.type === 'one' ? (subRows[0] || null) : subRows;
    }
  }
  return rows;
}

// ── Table Column Cache & Filtering ───────────────────────────────────────────
const tableColumnsCache = new Map();

async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }
  try {
    const rows = await query(`PRAGMA table_info("${tableName}")`);
    if (Array.isArray(rows) && rows.length > 0) {
      const colSet = new Set(rows.map(r => r.name));
      tableColumnsCache.set(tableName, colSet);
      return colSet;
    }
  } catch (err) {
    console.warn(`[d1Client] Warning: Could not inspect table_info for "${tableName}":`, err.message);
  }
  return null;
}

// ── Model factory ─────────────────────────────────────────────────────────────
function makeModel(tableName) {
  return {
    async findUnique({ where, include } = {}) {
      const { clause, params } = buildWhere(where);
      let rows = await query(`SELECT * FROM "${tableName}" ${clause} LIMIT 1`, params);
      rows = rows.map(coerceRow);
      if (include && rows.length > 0) {
        rows = await resolveIncludes(tableName, rows, include);
      }
      return rows[0] || null;
    },

    async findMany({ where = {}, orderBy = {}, include, select, take, skip } = {}) {
      const { clause, params } = buildWhere(where);
      const orderKeys = Object.keys(orderBy);
      const orderClause = orderKeys.length
        ? 'ORDER BY ' + orderKeys.map(k => `"${k}" ${orderBy[k] === 'desc' ? 'DESC' : 'ASC'}`).join(', ')
        : '';

      // Build SELECT clause — strip Prisma-only pseudo-fields like _count
      let selectClause = '*';
      let wantedCols = null;
      if (select && typeof select === 'object') {
        const plainCols = Object.keys(select).filter(k => {
          if (k === '_count') return false;             // aggregate, resolved separately
          const v = select[k];
          return v === true || (typeof v === 'object'); // nested include-style selects become *
        });
        if (plainCols.length > 0) {
          // Always include 'id' so relation resolution works
          const colSet = new Set(['id', ...plainCols.filter(k => typeof select[k] === 'true' || select[k] === true)]);
          // For nested selects (relations), we still fetch all cols and use resolveIncludes
          selectClause = '*';
          wantedCols = plainCols;
        }
      }

      const limitClause  = take  ? `LIMIT ${parseInt(take, 10)}`  : '';
      const offsetClause = skip  ? `OFFSET ${parseInt(skip, 10)}` : '';

      let rows = await query(
        `SELECT ${selectClause} FROM "${tableName}" ${clause} ${orderClause} ${limitClause} ${offsetClause}`.trim(),
        params
      );
      rows = rows.map(coerceRow);

      // Resolve nested relation selects (treated like include)
      const resolvedInclude = select
        ? Object.fromEntries(
            Object.entries(select)
              .filter(([k, v]) => k !== '_count' && typeof v === 'object' && v !== null)
              .map(([k, v]) => [k, v])
          )
        : null;

      if ((include || (resolvedInclude && Object.keys(resolvedInclude).length > 0)) && rows.length > 0) {
        rows = await resolveIncludes(tableName, rows, include || resolvedInclude);
      }

      // Strip columns not in select (if a plain-columns select was requested)
      if (wantedCols) {
        rows = rows.map(row => {
          const out = {};
          for (const k of wantedCols) out[k] = row[k];
          return out;
        });
      }

      return rows;
    },

    async create({ data }) {
      const id = data.id || newId();
      const now = new Date().toISOString();
      const fullData = { id, ...data };
      
      const noCreatedAt = ['LemonSqueezyEvent', 'Usage'];
      const noUpdatedAt = ['StorageOperation', 'LemonSqueezyPayment', 'LemonSqueezyEvent'];
      
      if (!noCreatedAt.includes(tableName) && !fullData.createdAt) {
        fullData.createdAt = now;
      }
      if (!noUpdatedAt.includes(tableName) && !fullData.updatedAt) {
        fullData.updatedAt = now;
      }

      // Schema defaults for tables where Prisma schema specifies defaults but D1 requires explicit values
      if (tableName === 'BoardItem') {
        if (fullData.x === undefined || fullData.x === null) fullData.x = 0;
        if (fullData.y === undefined || fullData.y === null) fullData.y = 0;
        if (fullData.width === undefined || fullData.width === null) fullData.width = 300;
        if (fullData.height === undefined || fullData.height === null) fullData.height = 200;
        if (fullData.rotation === undefined || fullData.rotation === null) fullData.rotation = 0;
        if (fullData.zIndex === undefined || fullData.zIndex === null) fullData.zIndex = 0;
        if (fullData.type === undefined || fullData.type === null) fullData.type = 'capture';
      } else if (tableName === 'Board') {
        if (fullData.title === undefined || fullData.title === null) fullData.title = 'Untitled Board';
        if (fullData.width === undefined || fullData.width === null) fullData.width = 1920;
        if (fullData.height === undefined || fullData.height === null) fullData.height = 1080;
        if (fullData.background === undefined || fullData.background === null) fullData.background = '#1a1a2e';
      } else if (tableName === 'Capture') {
        if (fullData.status === undefined || fullData.status === null) fullData.status = 'processing';
        if (fullData.hasAudio === undefined || fullData.hasAudio === null) fullData.hasAudio = false;
      }

      // Dynamically filter out any properties that do not exist on the target D1 table
      const validCols = await getTableColumns(tableName);
      if (validCols) {
        for (const k of Object.keys(fullData)) {
          if (!validCols.has(k)) {
            delete fullData[k];
          }
        }
      }

      const keys = Object.keys(fullData);
      const placeholders = keys.map(() => '?').join(', ');
      const vals = keys.map(k => {
        if (typeof fullData[k] === 'bigint') return Number(fullData[k]);
        if (fullData[k] instanceof Date) return fullData[k].toISOString();
        return fullData[k];
      });

      await query(
        `INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
        vals
      );

      const rows = await query(`SELECT * FROM "${tableName}" WHERE "id" = ? LIMIT 1`, [id]);
      return coerceRow(rows[0]);
    },

    async update({ where, data }) {
      const { clause: whereClause, params: whereParams } = buildWhere(where);
      const updatedData = { ...data };
      
      const noUpdatedAt = ['StorageOperation', 'LemonSqueezyPayment', 'LemonSqueezyEvent'];
      if (!noUpdatedAt.includes(tableName)) {
        updatedData.updatedAt = new Date().toISOString();
      }

      // Dynamically filter out any properties that do not exist on the target D1 table
      const validCols = await getTableColumns(tableName);
      if (validCols) {
        for (const k of Object.keys(updatedData)) {
          if (!validCols.has(k)) {
            delete updatedData[k];
          }
        }
      }
      
      const { clause: setClause, params: setParams } = buildSet(updatedData);

      await query(
        `UPDATE "${tableName}" SET ${setClause} ${whereClause}`,
        [...setParams, ...whereParams]
      );

      const rows = await query(`SELECT * FROM "${tableName}" ${whereClause} LIMIT 1`, whereParams);
      return coerceRow(rows[0]);
    },

    async upsert({ where, create, update }) {
      const existing = await this.findUnique({ where });
      if (existing) {
        return this.update({ where, data: update });
      }
      return this.create({ data: { ...where, ...create } });
    },

    async delete({ where }) {
      const { clause, params } = buildWhere(where);
      const rows = await query(`SELECT * FROM "${tableName}" ${clause} LIMIT 1`, params);
      await query(`DELETE FROM "${tableName}" ${clause}`, params);
      return coerceRow(rows[0]);
    },

    async deleteMany({ where = {} }) {
      const { clause, params } = buildWhere(where);
      await query(`DELETE FROM "${tableName}" ${clause}`, params);
      // D1 doesn't return row count easily; return a count object shape
      return { count: -1 };
    },

    async count({ where = {} } = {}) {
      const { clause, params } = buildWhere(where);
      const rows = await query(`SELECT COUNT(*) as cnt FROM "${tableName}" ${clause}`, params);
      return rows[0]?.cnt ?? 0;
    },

    async groupBy({ by = [], where = {}, _count = {} } = {}) {
      const { clause, params } = buildWhere(where);
      const groupCols = by.map(k => `"${k}"`).join(', ');

      const countParts = Object.keys(_count).length > 0
        ? Object.keys(_count).map(k => `COUNT("${k}") as "count_${k}"`)
        : ['COUNT(*) as "count_all"'];

      const sql = `SELECT ${groupCols}, ${countParts.join(', ')} FROM "${tableName}" ${clause} GROUP BY ${groupCols}`;
      const rows = await query(sql, params);

      return rows.map(row => {
        const result = {};
        for (const k of by) result[k] = row[k];
        if (Object.keys(_count).length > 0) {
          result._count = {};
          for (const k of Object.keys(_count)) result._count[k] = Number(row[`count_${k}`] ?? 0);
        } else {
          result._count = Number(row['count_all'] ?? 0);
        }
        return result;
      });
    },

    async aggregate({ where = {}, _sum = {}, _count = {}, _avg = {}, _min = {}, _max = {} } = {}) {
      const { clause, params } = buildWhere(where);
      const selectParts = [];

      if (_count && Object.keys(_count).length > 0) {
        for (const k of Object.keys(_count)) {
          selectParts.push(`COUNT("${k}") as "count_${k}"`);
        }
      } else {
        selectParts.push(`COUNT(*) as "count_all"`);
      }

      for (const k of Object.keys(_sum || {})) {
        selectParts.push(`SUM(COALESCE("${k}", 0)) as "sum_${k}"`);
      }
      for (const k of Object.keys(_avg || {})) {
        selectParts.push(`AVG("${k}") as "avg_${k}"`);
      }
      for (const k of Object.keys(_min || {})) {
        selectParts.push(`MIN("${k}") as "min_${k}"`);
      }
      for (const k of Object.keys(_max || {})) {
        selectParts.push(`MAX("${k}") as "max_${k}"`);
      }

      const sql = `SELECT ${selectParts.join(', ')} FROM "${tableName}" ${clause}`;
      const rows = await query(sql, params);
      const row = rows[0] || {};

      const result = { _count: {}, _sum: {}, _avg: {}, _min: {}, _max: {} };
      if (_count && Object.keys(_count).length > 0) {
        for (const k of Object.keys(_count)) {
          result._count[k] = Number(row[`count_${k}`] ?? 0);
        }
      } else {
        result._count = Number(row['count_all'] ?? 0);
      }

      for (const k of Object.keys(_sum || {})) {
        result._sum[k] = row[`sum_${k}`] !== null && row[`sum_${k}`] !== undefined ? Number(row[`sum_${k}`]) : null;
      }
      for (const k of Object.keys(_avg || {})) {
        result._avg[k] = row[`avg_${k}`] !== null && row[`avg_${k}`] !== undefined ? Number(row[`avg_${k}`]) : null;
      }
      for (const k of Object.keys(_min || {})) {
        result._min[k] = row[`min_${k}`] ?? null;
      }
      for (const k of Object.keys(_max || {})) {
        result._max[k] = row[`max_${k}`] ?? null;
      }

      return result;
    },
  };
}

// ── Export Prisma-shaped object with all models ───────────────────────────────
const d1 = {
  _raw: query, // expose raw query for complex joins

  user:                  makeModel('User'),
  session:               makeModel('Session'),
  capture:               makeModel('Capture'),
  storageObject:         makeModel('StorageObject'),
  storageAccount:        makeModel('StorageAccount'),
  storageOperation:      makeModel('StorageOperation'),
  googleDriveConnection: makeModel('GoogleDriveConnection'),
  plan:                  makeModel('Plan'),
  subscription:          makeModel('Subscription'),
  usage:                 makeModel('Usage'),
  board:                 makeModel('Board'),
  boardItem:             makeModel('BoardItem'),
  lemonSqueezyCustomer:  makeModel('LemonSqueezyCustomer'),
  lemonSqueezyPayment:   makeModel('LemonSqueezyPayment'),
  lemonSqueezyEvent:     makeModel('LemonSqueezyEvent'),
  appSettings:           makeModel('AppSettings'),
};

module.exports = d1;
