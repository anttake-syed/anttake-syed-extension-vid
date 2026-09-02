import React, { useState, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../config.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(status) {
  if (status === 'PASS')    return '#22c55e';
  if (status === 'FAIL')    return '#ef4444';
  if (status === 'HEALTHY') return '#22c55e';
  if (status === 'DEGRADED') return '#f59e0b';
  if (status === 'DOWN')    return '#ef4444';
  return '#94a3b8';
}
function statusBg(status) {
  if (status === 'PASS' || status === 'HEALTHY') return 'rgba(34,197,94,0.08)';
  if (status === 'FAIL' || status === 'DOWN')    return 'rgba(239,68,68,0.08)';
  if (status === 'DEGRADED') return 'rgba(245,158,11,0.08)';
  return 'rgba(148,163,184,0.08)';
}
function statusIcon(status) {
  if (status === 'PASS')    return 'check_circle';
  if (status === 'FAIL')    return 'cancel';
  if (status === 'HEALTHY') return 'check_circle';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'DOWN')    return 'cancel';
  return 'help';
}
function levelColor(level) {
  const l = level?.toUpperCase();
  if (l === 'ERROR') return '#ef4444';
  if (l === 'WARN')  return '#f59e0b';
  if (l === 'INFO')  return '#6366f1';
  return '#94a3b8';
}
function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return new Date(isoStr).toLocaleDateString();
}
function fmtDuration(ms) {
  if (ms === undefined || ms === null) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Copy to clipboard hook ─────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = React.useState(null);
  const copy = (data, id) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  return { copy, copied };
}

function CopyBtn({ data, id, label = '', size = '16px', style = {} }) {
  const { copy, copied } = useCopy();
  const isCopied = copied === id;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); copy(data, id); }}
      title={isCopied ? 'Copied!' : `Copy ${label}`}
      style={{
        background: isCopied ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.1)',
        border: `1px solid ${isCopied ? '#22c55e40' : 'rgba(148,163,184,0.2)'}`,
        borderRadius: '6px', padding: '3px 7px',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
        color: isCopied ? '#22c55e' : '#94a3b8',
        fontSize: '11px', fontWeight: 600, transition: 'all 0.15s',
        ...style
      }}
    >
      <span className="material-symbols-rounded" style={{ fontSize: size }}>
        {isCopied ? 'check' : 'content_copy'}
      </span>
      {label && <span>{isCopied ? 'Copied!' : label}</span>}
    </button>
  );
}


// ── Subcomponents ─────────────────────────────────────────────────────────────
function OverallBadge({ status, pass, fail, durationMs }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      background: statusBg(status),
      border: `1px solid ${statusColor(status)}30`,
      borderRadius: '16px', padding: '20px 28px',
      marginBottom: '28px',
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: '40px', color: statusColor(status) }}>
        {statusIcon(status)}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: statusColor(status), lineHeight: 1.2 }}>
          System {status}
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
          {pass} passed · {fail} failed · {fmtDuration(durationMs)} total
        </div>
      </div>
      <div style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
        color: statusColor(status), textTransform: 'uppercase',
        background: `${statusColor(status)}18`, padding: '4px 10px', borderRadius: '6px',
      }}>
        {status}
      </div>
    </div>
  );
}

function CheckCard({ check, onClick }) {
  return (
    <div
      onClick={() => onClick(check)}
      style={{
        background: 'var(--card-bg, #1e293b)',
        border: `1px solid ${statusColor(check.status)}28`,
        borderRadius: '12px', padding: '16px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}
      onMouseEnter={e => e.currentTarget.style.background = statusBg(check.status)}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg, #1e293b)'}
    >
      <span className="material-symbols-rounded" style={{ fontSize: '22px', color: statusColor(check.status), flexShrink: 0 }}>
        {statusIcon(check.status)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '2px' }}>
          {check.name}
        </div>
        {check.error && (
          <div style={{ fontSize: '11px', color: '#ef4444', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {check.error}
          </div>
        )}
      </div>
      <div style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
        color: statusColor(check.status), flexShrink: 0,
      }}>
        {check.status}
      </div>
      <div style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>
        {fmtDuration(check.durationMs)}
      </div>
    </div>
  );
}

function CheckDetailModal({ check, onClose }) {
  if (!check) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a', border: '1px solid #1e293b',
          borderRadius: '20px', padding: '32px', width: '520px', maxWidth: '95vw',
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '28px', color: statusColor(check.status) }}>
            {statusIcon(check.status)}
          </span>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>{check.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {check.status} · {fmtDuration(check.durationMs)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '20px' }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {check.error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '16px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Error
            </div>
            <div style={{ fontSize: '13px', color: '#fca5a5', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {check.error}
            </div>
            {check.code && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Code: {check.code}</div>
            )}
          </div>
        )}

        {check.detail && (
          <div style={{
            background: '#1e293b', borderRadius: '10px', padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Details
              </div>
              <CopyBtn data={check} id={`check-detail-${check.name}`} label="Copy" size="13px" />
            </div>
            <pre style={{
              fontSize: '12px', color: '#94a3b8', margin: 0,
              fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {JSON.stringify(check.detail, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorRow({ entry, onExpand, expanded }) {
  const ts  = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
  const ago = timeAgo(entry.timestamp);
  return (
    <>
      <tr
        onClick={() => onExpand(entry)}
        style={{ cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}
      >
        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>{ts}</span>
          <span style={{ fontSize: '11px', color: '#475569', marginLeft: '6px' }}>({ago})</span>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            color: levelColor(entry.level),
            background: `${levelColor(entry.level)}15`,
            padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase',
          }}>
            {entry.level}
          </span>
        </td>
        <td style={{ padding: '10px 14px', fontSize: '12px', color: '#6366f1', fontFamily: 'monospace' }}>
          {entry.feature}
        </td>
        <td style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
          {entry.operation}
        </td>
        <td style={{ padding: '10px 14px', maxWidth: '260px' }}>
          <span style={{
            fontSize: '12px', color: '#fca5a5',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
          }}>
            {entry.error?.message || entry.meta?.message || '—'}
          </span>
        </td>
        <td style={{ padding: '10px 14px' }}>
          <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>
            {entry.requestId?.slice(0, 12) || '—'}
          </span>
        </td>
        <td style={{ padding: '10px 14px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <CopyBtn data={entry} id={`row-${entry.requestId}-${entry.timestamp}`} size="14px" />
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#475569' }}>
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: '0 14px 12px 14px', background: 'rgba(99,102,241,0.04)' }}>
            <pre style={{
              fontSize: '11px', color: '#94a3b8', margin: 0,
              fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: '240px', overflowY: 'auto',
              background: '#0f172a', borderRadius: '8px', padding: '12px',
            }}>
              {JSON.stringify(entry, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDiagnostics({ user }) {
  const [health,       setHealth]       = useState(null);
  const [errors,       setErrors]       = useState([]);   // ← restored — was accidentally removed
  const [activity,     setActivity]     = useState([]);
  const [sysInfo,      setSysInfo]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [errLoading,   setErrLoading]   = useState(false);
  const [actLoading,   setActLoading]   = useState(false);
  const [lastRun,      setLastRun]      = useState(null);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [expandedError, setExpandedError] = useState(null);
  const [forbidden,    setForbidden]    = useState(false);
  const [tab,          setTab]          = useState('health');
  
  // Capture Lookup state
  const [captureIdInput, setCaptureIdInput] = useState('');
  const [captureData, setCaptureData] = useState(null);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [captureError, setCaptureError] = useState('');

  // Recovery state
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  const runRecovery = async () => {
    setRecoveryLoading(true);
    setRecoveryResult(null);
    setRecoveryError('');
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/recover-processing`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setRecoveryResult(data);
    } catch (err) {
      setRecoveryError(err.message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  const authHeader = { Authorization: `Bearer ${user?.jwt}` };

  const fetchCaptureDiagnostics = async (e) => {
    if (e) e.preventDefault();
    if (!captureIdInput.trim()) return;
    
    setCaptureLoading(true);
    setCaptureError('');
    setCaptureData(null);
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/capture/${captureIdInput.trim()}`, { headers: authHeader });
      if (!r.ok) {
        if (r.status === 404) throw new Error('Capture not found');
        throw new Error(`HTTP Error ${r.status}`);
      }
      const data = await r.json();
      setCaptureData(data);
    } catch (err) {
      setCaptureError(err.message);
    } finally {
      setCaptureLoading(false);
    }
  };

  // ── Fetch health ───────────────────────────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/health`, { headers: authHeader });
      if (r.status === 403) { setForbidden(true); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setHealth(data);
      setLastRun(new Date());

      // Also fetch sysInfo
      const r2 = await fetch(`${SERVER_URL}/api/admin/diagnostics/info`, { headers: authHeader });
      if (r2.ok) setSysInfo(await r2.json());
    } catch (e) {
      console.error('Health fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.jwt]);

  // ── Fetch errors ───────────────────────────────────────────────────────────
  const fetchErrors = useCallback(async () => {
    setErrLoading(true);
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/errors`, { headers: authHeader });
      if (r.status === 403) { setForbidden(true); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setErrors(data.errors || []);
    } catch (e) {
      console.error('Errors fetch error:', e);
    } finally {
      setErrLoading(false);
    }
  }, [user?.jwt]);

  // ── Fetch activity ─────────────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    setActLoading(true);
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/activity`, { headers: authHeader });
      if (r.status === 403) { setForbidden(true); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setActivity(data.activity || []);
    } catch (e) {
      console.error('Activity fetch error:', e);
    } finally {
      setActLoading(false);
    }
  }, [user?.jwt]);

  useEffect(() => {
    fetchHealth();
    fetchErrors();
    fetchActivity();
  }, [fetchHealth, fetchErrors, fetchActivity]);

  // ── Forbidden ──────────────────────────────────────────────────────────────
  if (forbidden) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center',
      }}>
        <span className="material-symbols-rounded" style={{ fontSize: '64px', color: '#ef4444' }}>block</span>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9' }}>403 Forbidden</div>
        <div style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '400px' }}>
          Your account does not have admin access. Contact the server administrator to grant your account the admin role.
        </div>
      </div>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading && !health) {
    return (
      <div style={{ padding: '36px 40px', maxWidth: '1000px' }}>
        <div style={{ marginBottom: '32px' }}>
          <div className="skeleton-box" style={{ width: '280px', height: '32px', borderRadius: '8px', marginBottom: '8px' }} />
          <div className="skeleton-box" style={{ width: '200px', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '80px', borderRadius: '16px', marginBottom: '28px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: '68px', borderRadius: '12px' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: '1000px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#6366f1' }}>monitor_heart</span>
            System Diagnostics
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '6px 0 0' }}>
            Live health checks · Admin only · {lastRun ? `Last run ${timeAgo(lastRun.toISOString())}` : 'Not yet run'}
          </p>
        </div>
        <button
          onClick={() => { fetchHealth(); fetchErrors(); fetchActivity(); }}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '10px',
            background: loading ? '#1e293b' : '#6366f1',
            color: loading ? '#64748b' : 'white',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          <span className="material-symbols-rounded" style={{
            fontSize: '16px',
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}>refresh</span>
          {loading ? 'Running…' : 'Run Checks'}
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#1e293b', borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'health',   label: 'Health Checks', icon: 'check_circle' },
          { id: 'activity', label: 'Live Activity', icon: 'bolt' },
          { id: 'errors',   label: `Recent Errors${errors.length ? ` (${errors.length})` : ''}`, icon: 'error' },
          { id: 'info',     label: 'System Info', icon: 'info' },
          { id: 'capture',  label: 'Capture Lookup', icon: 'search' },
          { id: 'recovery', label: 'Recovery Tools', icon: 'build' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: tab === t.id ? '#6366f1' : 'transparent',
              color: tab === t.id ? 'white' : '#64748b',
              fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Health Checks Tab ── */}
      {tab === 'health' && health && (
        <>
          <OverallBadge
            status={health.overallStatus}
            pass={health.pass}
            fail={health.fail}
            durationMs={health.durationMs}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {health.checks?.map(check => (
              <CheckCard key={check.name} check={check} onClick={setSelectedCheck} />
            ))}
          </div>
          <div style={{ marginTop: '14px', textAlign: 'right' }}>
            <CopyBtn
              data={{
                copied_at: new Date().toISOString(),
                context: 'AntCapture system health report',
                overallStatus: health.overallStatus,
                pass: health.pass,
                fail: health.fail,
                durationMs: health.durationMs,
                checks: health.checks
              }}
              id="health-all"
              label="Copy Full Health Report"
              size="14px"
            />
          </div>
        </>
      )}

      {/* ── Activity Tab ── */}
      {tab === 'activity' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              {actLoading ? 'Loading…' : `${activity.length} recent events (in-memory, resets on restart)`}
            </div>
            <button
              onClick={fetchActivity}
              style={{
                background: 'none', border: '1px solid #1e293b', borderRadius: '8px',
                color: '#94a3b8', cursor: 'pointer', padding: '6px 12px',
                fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>refresh</span>
              Refresh
            </button>
          </div>

          {activity.length === 0 ? (
            <div style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '14px', padding: '40px', textAlign: 'center',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#6366f1', display: 'block', marginBottom: '12px' }}>
                history
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
                No activity recorded
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Server activity will appear here as it happens.
              </div>
            </div>
          ) : (
            <div style={{ overflow: 'auto', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#64748b', textAlign: 'left' }}>
                    {['Time', 'Level', 'Feature', 'Operation', 'Details', 'Request ID', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.map((entry, i) => (
                    <ErrorRow
                      key={i}
                      entry={entry}
                      onExpand={e => setExpandedError(expandedError === e ? null : e)}
                      expanded={expandedError === entry}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Errors Tab ── */}
      {tab === 'errors' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              {errLoading ? 'Loading…' : `${errors.length} recent error${errors.length !== 1 ? 's' : ''} (in-memory, resets on restart)`}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {errors.length > 0 && (
                <CopyBtn
                  data={{
                    copied_at: new Date().toISOString(),
                    context: 'AntCapture admin error log',
                    errors
                  }}
                  id="errors-all"
                  label="Copy All as Prompt"
                  size="14px"
                />
              )}
              <button
                onClick={fetchErrors}
                style={{
                  background: 'none', border: '1px solid #1e293b', borderRadius: '8px',
                  color: '#94a3b8', cursor: 'pointer', padding: '6px 12px',
                  fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>refresh</span>
                Refresh
              </button>
            </div>
          </div>

          {errors.length === 0 ? (
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
              borderRadius: '14px', padding: '40px', textAlign: 'center',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#22c55e', display: 'block', marginBottom: '12px' }}>
                check_circle
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
                No errors recorded
              </div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                Error events appear here as they occur. Check your cloud logging dashboard for full history.
              </div>
            </div>
          ) : (
            <div style={{ overflow: 'auto', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#1e293b', color: '#64748b', textAlign: 'left' }}>
                    {['Time', 'Level', 'Feature', 'Operation', 'Error', 'Request ID', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontWeight: 600, fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {errors.map((entry, i) => (
                    <ErrorRow
                      key={i}
                      entry={entry}
                      onExpand={e => setExpandedError(expandedError === e ? null : e)}
                      expanded={expandedError === entry}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── System Info Tab ── */}
      {tab === 'info' && (
        <div>
          {sysInfo ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {[
                { label: 'Mode',        value: sysInfo.mode,        icon: 'cloud' },
                { label: 'Environment', value: sysInfo.environment, icon: 'code' },
                { label: 'Node.js',     value: sysInfo.nodeVersion, icon: 'terminal' },
                { label: 'Uptime',      value: `${Math.floor(sysInfo.uptime / 60)}m ${sysInfo.uptime % 60}s`, icon: 'schedule' },
                { label: 'RSS Memory',  value: sysInfo.memory?.rss,       icon: 'memory' },
                { label: 'Heap Used',   value: sysInfo.memory?.heapUsed,  icon: 'storage' },
                { label: 'Heap Total',  value: sysInfo.memory?.heapTotal, icon: 'dns' },
                { label: 'Checked At',  value: new Date(sysInfo.checkedAt).toLocaleTimeString(), icon: 'access_time' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  background: 'var(--card-bg, #1e293b)', borderRadius: '12px',
                  padding: '18px 20px', border: '1px solid #1e293b22',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#6366f1' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                    <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '14px', padding: '32px', textAlign: 'center' }}>
              Run health checks first to load system info.
            </div>
          )}
        </div>
      )}

      {/* ── Capture Lookup Tab ── */}
      {tab === 'capture' && (
        <div>
          <form onSubmit={fetchCaptureDiagnostics} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Enter Capture ID..."
              value={captureIdInput}
              onChange={e => setCaptureIdInput(e.target.value)}
              style={{
                flex: 1, padding: '12px 16px', borderRadius: '10px',
                background: '#1e293b', border: '1px solid #1e293b22',
                color: 'white', fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={captureLoading}
              style={{
                padding: '12px 24px', borderRadius: '10px', background: '#6366f1',
                color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600
              }}
            >
              {captureLoading ? 'Searching...' : 'Lookup'}
            </button>
          </form>

          {captureError && (
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px' }}>
              {captureError}
            </div>
          )}

          {captureData && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'Capture ID', value: captureData.captureId, icon: 'tag' },
                  { label: 'User ID', value: captureData.userId, icon: 'person' },
                  { label: 'Storage Provider', value: captureData.storageProvider, icon: 'cloud' },
                  { label: 'Upload Status', value: captureData.uploadStatus, icon: 'publish' },
                  { label: 'Expected Size', value: captureData.expectedSize ? `${(captureData.expectedSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown', icon: 'save' },
                  { label: 'Uploaded Size', value: captureData.uploadedSize ? `${(captureData.uploadedSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown', icon: 'file_download_done' },
                  { label: 'D1 Asset Status', value: captureData.d1AssetStatus, icon: 'dns' },
                  { label: 'UploadThing Key', value: captureData.uploadThingFileKey || 'N/A', icon: 'key' },
                  { label: 'Callback Received', value: captureData.callbackReceived ? 'Yes' : 'No', icon: 'call_received' },
                  { label: 'Library Visible', value: captureData.libraryVisible ? 'Yes' : 'No', icon: 'visibility' },
                  { label: 'Storage Usage', value: captureData.storageUsage, icon: 'data_usage' },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{
                    background: 'var(--card-bg, #1e293b)', borderRadius: '12px',
                    padding: '18px 20px', border: '1px solid #1e293b22',
                    display: 'flex', alignItems: 'center', gap: '14px',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#6366f1' }}>{icon}</span>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                      <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 style={{ color: '#f1f5f9', fontSize: '16px', marginBottom: '12px' }}>Timestamps</h3>
              <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(captureData.timestamps).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#94a3b8' }}>{key}</span>
                    <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{val ? new Date(val).toLocaleString() : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recovery Tab ── */}
      {tab === 'recovery' && (
        <div>
          <div style={{ background: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #1e293b22' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#ef4444' }}>build</span>
              Stuck Capture Recovery
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              If UploadThing webhook deliveries failed (e.g., due to Vercel timeout), some captures may remain stuck in the <code style={{ color: '#f59e0b' }}>'processing'</code> state even though the file reached the CDN successfully.
              <br/><br/>
              This tool fetches all files from the UploadThing CDN and cross-references them with any captures that have been processing for more than 2 minutes. Matching captures will be forcibly activated and added to the database.
            </p>
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={runRecovery}
                disabled={recoveryLoading}
                style={{
                  background: '#ef4444', color: 'white', padding: '12px 24px', borderRadius: '8px',
                  fontWeight: 600, border: 'none', cursor: recoveryLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', opacity: recoveryLoading ? 0.7 : 1
                }}
              >
                <span className="material-symbols-rounded">{recoveryLoading ? 'hourglass_empty' : 'play_arrow'}</span>
                {recoveryLoading ? 'Running Recovery...' : 'Run Stuck Capture Recovery'}
              </button>
            </div>

            {recoveryError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Recovery Failed</div>
                <div style={{ fontSize: '14px' }}>{recoveryError}</div>
              </div>
            )}

            {recoveryResult && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>
                  {recoveryResult.message}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
                  Total processing checked: {recoveryResult.total} | Successfully recovered: {recoveryResult.recovered}
                </div>
                {recoveryResult.results && recoveryResult.results.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recoveryResult.results.map((r, i) => (
                      <div key={i} style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{r.id}</span>
                        {r.status === 'recovered' ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>Recovered ({r.fileKey})</span>
                        ) : (
                          <span style={{ color: '#f59e0b' }}>Skipped: {r.reason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Check Detail Modal ── */}
      <CheckDetailModal check={selectedCheck} onClose={() => setSelectedCheck(null)} />


      {/* ── Spin animation ── */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
