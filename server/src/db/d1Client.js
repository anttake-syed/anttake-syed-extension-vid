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
function buildWhere(where = {}) {
  const keys = Object.keys(where).filter(k => where[k] !== undefined);
  if (keys.length === 0) return { clause: '', params: [] };
  const clause = 'WHERE ' + keys.map(k => `"${k}" = ?`).join(' AND ');
  const params = keys.map(k => where[k]);
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
      
      // Recursive nested include
      if (typeof val === 'object' && val.include) {
        subRows = await resolveIncludes(rel.table, subRows, val.include);
      }
      
      row[key] = rel.type === 'one' ? (subRows[0] || null) : subRows;
    }
  }
  return rows;
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

    async findMany({ where = {}, orderBy = {}, include } = {}) {
      const { clause, params } = buildWhere(where);
      const orderKeys = Object.keys(orderBy);
      const orderClause = orderKeys.length
        ? 'ORDER BY ' + orderKeys.map(k => `"${k}" ${orderBy[k] === 'desc' ? 'DESC' : 'ASC'}`).join(', ')
        : '';
      let rows = await query(`SELECT * FROM "${tableName}" ${clause} ${orderClause}`, params);
      rows = rows.map(coerceRow);
      if (include && rows.length > 0) {
        rows = await resolveIncludes(tableName, rows, include);
      }
      return rows;
    },

    async create({ data }) {
      const id = data.id || newId();
      const now = new Date().toISOString();
      const fullData = {
        id,
        createdAt: now,
        updatedAt: now,
        ...data,
      };

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
      const updatedData = { ...data, updatedAt: new Date().toISOString() };
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
};

module.exports = d1;
