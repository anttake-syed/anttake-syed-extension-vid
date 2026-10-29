import React, { useState, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../config.js';
import { Page, SectionHead, Grid, TableScroll } from './layout/Page.jsx';
import '../styles/pages/diagnostics.css';

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
    <div className="diag-overall" style={{
      background: statusBg(status),
      border: `1px solid ${statusColor(status)}30`,
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: '40px', color: statusColor(status), flexShrink: 0 }}>
        {statusIcon(status)}
      </span>
      <div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: statusColor(status), lineHeight: 1.2 }}>
          System {status}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
          {pass} passed · {fail} failed · {fmtDuration(durationMs)} total
        </div>
      </div>
      <div className="hide-below-sm" style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', flexShrink: 0,
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
      className="diag-check-card"
      onClick={() => onClick(check)}
      style={{
        background: 'var(--card-bg)',
        border: `1px solid ${statusColor(check.status)}28`,
      }}
      onMouseEnter={e => e.currentTarget.style.background = statusBg(check.status)}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg)'}
    >
      <span className="material-symbols-rounded" style={{ fontSize: '22px', color: statusColor(check.status), flexShrink: 0 }}>
        {statusIcon(check.status)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="break-anywhere" style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', marginBottom: '2px' }}>
          {check.name}
        </div>
        {check.error && (
          <div className="truncate" style={{ fontSize: '11px', color: 'var(--danger)' }}>
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
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
        {fmtDuration(check.durationMs)}
      </div>
    </div>
  );
}

function CheckDetailModal({ check, onClose }) {
  if (!check) return null;
  return (
    <div className="diag-modal-overlay" onClick={onClose}>
      <div className="diag-modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '28px', color: statusColor(check.status), flexShrink: 0 }}>
            {statusIcon(check.status)}
          </span>
          <div className="min-w-0">
            <div className="break-anywhere" style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>{check.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {check.status} · {fmtDuration(check.durationMs)}
            </div>
          </div>
          <button onClick={onClose} className="diag-modal-close">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {check.error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '16px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--danger)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Error
            </div>
            <div style={{ fontSize: '13px', color: 'var(--danger-soft)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {check.error}
            </div>
            {check.code && (
              <div className="break-anywhere" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>Code: {check.code}</div>
            )}
          </div>
        )}

        {check.detail && (
          <div style={{
            background: 'var(--bg-tertiary)', borderRadius: '10px', padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Details
              </div>
              <CopyBtn data={check} id={`check-detail-${check.name}`} label="Copy" size="13px" />
            </div>
            <pre style={{
              fontSize: '12px', color: 'var(--text-dim)', margin: 0,
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
        <td style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ts}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginLeft: '6px' }}>({ago})</span>
        </td>
        <td>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            color: levelColor(entry.level),
            background: `${levelColor(entry.level)}15`,
            padding: '2px 7px', borderRadius: '4px', textTransform: 'uppercase',
          }}>
            {entry.level}
          </span>
        </td>
        <td style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace' }}>
          {entry.feature}
        </td>
        <td style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
          {entry.operation}
        </td>
        <td style={{ maxWidth: '260px' }}>
          <span className="truncate" style={{ fontSize: '12px', color: 'var(--danger-soft)', display: 'block' }}>
            {entry.error?.message || entry.meta?.message || '—'}
          </span>
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-faint)', fontFamily: 'monospace' }}>
            {entry.requestId?.slice(0, 12) || '—'}
          </span>
        </td>
        <td>
          <div className="diag-row-actions">
            <CopyBtn data={entry} id={`row-${entry.requestId}-${entry.timestamp}`} size="14px" />
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--text-faint)' }}>
              {expanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: '0 14px 12px 14px', background: 'rgba(99,102,241,0.04)' }}>
            <pre style={{
              fontSize: '11px', color: 'var(--text-dim)', margin: 0,
              fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              maxHeight: '240px', overflowY: 'auto',
              background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px',
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

  // Capture Activation & Stuck Captures state
  const [activationData, setActivationData] = useState(null);
  const [activationLoading, setActivationLoading] = useState(false);
  const [healResult, setHealResult] = useState(null);
  const [healLoading, setHealLoading] = useState(false);
  const [healError, setHealError] = useState('');

  // Recovery state
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');

  // Billing Lookup state
  const [billingEmail, setBillingEmail] = useState('');
  const [billingResult, setBillingResult] = useState(null);

  // Storage & User Analytics state
  const [storageAnalytics, setStorageAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const authHeader = { Authorization: `Bearer ${user?.jwt}` };

  const fetchActivationData = useCallback(async () => {
    setActivationLoading(true);
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/capture-activation`, { headers: authHeader });
      if (r.ok) {
        const data = await r.json();
        setActivationData(data);
      }
    } catch (err) {
      console.error('Failed to fetch capture activation data:', err);
    } finally {
      setActivationLoading(false);
    }
  }, [user?.jwt]);

  const runHealStuckCaptures = async () => {
    setHealLoading(true);
    setHealResult(null);
    setHealError('');
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/heal-stuck-captures`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' }
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setHealResult(data);
      // Refresh activation data and health checks
      fetchActivationData();
      fetchHealth();
    } catch (err) {
      setHealError(err.message);
    } finally {
      setHealLoading(false);
    }
  };

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

  const handleBillingLookup = async (e) => {
    e.preventDefault();
    if (!billingEmail.trim()) return;
    setBillingResult(null);
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/billing/${encodeURIComponent(billingEmail.trim())}`, { headers: authHeader });
      const data = await r.json();
      setBillingResult(data);
    } catch (err) {
      setBillingResult({ error: err.message });
    }
  };

  const fetchStorageAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const r = await fetch(`${SERVER_URL}/api/admin/diagnostics/storage-analytics`, { headers: authHeader });
      if (r.status === 403) { setForbidden(true); return; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setStorageAnalytics(data);
    } catch (err) {
      setAnalyticsError(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [user?.jwt]);

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
    fetchActivationData();
    fetchStorageAnalytics();
  }, [fetchHealth, fetchErrors, fetchActivity, fetchActivationData, fetchStorageAnalytics]);

  // ── Forbidden ──────────────────────────────────────────────────────────────
  if (forbidden) {
    return (
      <Page>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: '16px', textAlign: 'center',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '64px', color: 'var(--danger)' }}>block</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9' }}>403 Forbidden</div>
          <div style={{ fontSize: '14px', color: 'var(--text-dim)', maxWidth: '400px' }}>
            Your account does not have admin access. Contact the server administrator to grant your account the admin role.
          </div>
        </div>
      </Page>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading && !health) {
    return (
      <Page>
        <div style={{ marginBottom: '32px' }}>
          <div className="skeleton-box" style={{ width: 'min(280px, 100%)', height: '32px', borderRadius: '8px', marginBottom: '8px' }} />
          <div className="skeleton-box" style={{ width: 'min(200px, 100%)', height: '16px', borderRadius: '4px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '80px', borderRadius: '16px', marginBottom: '28px' }} />
        <Grid cols={2} gap="12px">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="skeleton-box" style={{ height: '68px', borderRadius: '12px' }} />
          ))}
        </Grid>
      </Page>
    );
  }

  return (
    <Page>
      {/* ── Header ── */}
      <SectionHead
        className="diag-head"
        title={
          <h1 className="diag-title">
            <span className="material-symbols-rounded" style={{ fontSize: '28px', color: 'var(--primary)' }}>monitor_heart</span>
            System Diagnostics
          </h1>
        }
        subtitle={
          <p className="diag-subtitle">
            Live health checks · Admin only · {lastRun ? `Last run ${timeAgo(lastRun.toISOString())}` : 'Not yet run'}
          </p>
        }
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-onboarding', { detail: { variant: 'standard' } }))}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.1)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
              }}
              title="Preview the interactive Free / New User Walkthrough"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>explore</span>
              Free Tour UI
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-onboarding', { detail: { variant: 'pro' } }))}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.1)',
                color: '#c084fc',
                border: '1px solid rgba(168, 85, 247, 0.3)', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, transition: 'all 0.15s',
              }}
              title="Preview the Subscribed Pro Cloud Studio Walkthrough"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>verified</span>
              Pro Tour UI
            </button>
            <button
              onClick={() => { fetchHealth(); fetchErrors(); fetchActivity(); fetchActivationData(); }}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '10px',
                background: loading ? 'var(--bg-tertiary)' : 'var(--primary)',
                color: loading ? 'var(--text-muted)' : 'white',
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
        }
      />

      {/* ── Tab bar ── */}
      <div className="diag-tabs">
        {[
          { id: 'health',   label: 'Health Checks', icon: 'check_circle' },
          { id: 'storage',  label: 'Storage & Analytics', icon: 'pie_chart' },
          { id: 'activity', label: 'Live Activity', icon: 'bolt' },
          { id: 'errors',   label: `Recent Errors${errors.length ? ` (${errors.length})` : ''}`, icon: 'error' },
          { id: 'info',     label: 'System Info', icon: 'info' },
          { id: 'capture',  label: 'Capture Lookup', icon: 'search' },
          { id: 'billing',  label: 'Billing Lookup', icon: 'payments' },
          { id: 'recovery', label: `Recovery Tools${activationData?.stuckCount > 0 ? ` (${activationData.stuckCount} stuck)` : ''}`, icon: 'build' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`diag-tab${tab === t.id ? ' is-active' : ''}`}
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
          <Grid cols={2} gap="10px">
            {health.checks?.map(check => (
              <CheckCard key={check.name} check={check} onClick={setSelectedCheck} />
            ))}
          </Grid>
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
          <SectionHead
            className="diag-toolbar"
            title={
              <div className="diag-toolbar-text">
                {actLoading ? 'Loading…' : `${activity.length} recent events (in-memory, resets on restart)`}
              </div>
            }
            actions={
              <button onClick={fetchActivity} className="diag-btn-ghost">
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>refresh</span>
                Refresh
              </button>
            }
          />

          {activity.length === 0 ? (
            <div className="diag-empty" style={{
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '40px', color: 'var(--primary)', display: 'block', marginBottom: '12px' }}>
                history
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
                No activity recorded
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Server activity will appear here as it happens.
              </div>
            </div>
          ) : (
            <TableScroll className="diag-table-wrap">
              <table className="diag-table">
                <thead>
                  <tr>
                    {['Time', 'Level', 'Feature', 'Operation', 'Details', 'Request ID', ''].map(h => (
                      <th key={h}>
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
            </TableScroll>
          )}
        </div>
      )}

      {/* ── Errors Tab ── */}
      {tab === 'errors' && (
        <div>
          <SectionHead
            className="diag-toolbar"
            title={
              <div className="diag-toolbar-text">
                {errLoading ? 'Loading…' : `${errors.length} recent error${errors.length !== 1 ? 's' : ''} (in-memory, resets on restart)`}
              </div>
            }
            actions={
              <>
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
                    style={{ minHeight: '32px' }}
                  />
                )}
                <button onClick={fetchErrors} className="diag-btn-ghost">
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>refresh</span>
                  Refresh
                </button>
              </>
            }
          />

          {errors.length === 0 ? (
            <div className="diag-empty" style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#22c55e', display: 'block', marginBottom: '12px' }}>
                check_circle
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', marginBottom: '6px' }}>
                No errors recorded
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Error events appear here as they occur. Check your cloud logging dashboard for full history.
              </div>
            </div>
          ) : (
            <TableScroll className="diag-table-wrap">
              <table className="diag-table">
                <thead>
                  <tr>
                    {['Time', 'Level', 'Feature', 'Operation', 'Error', 'Request ID', ''].map(h => (
                      <th key={h}>
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
            </TableScroll>
          )}
        </div>
      )}

      {/* ── System Info Tab ── */}
      {tab === 'info' && (
        <div>
          {sysInfo ? (
            <Grid cols={2} gap="14px">
              {[
                { label: 'Mode',        value: sysInfo.mode,        icon: 'cloud' },
                { label: 'Billing Mode', value: sysInfo.lemonSqueezyMode, icon: 'payments' },
                { label: 'Environment', value: sysInfo.environment, icon: 'code' },
                { label: 'Node.js',     value: sysInfo.nodeVersion, icon: 'terminal' },
                { label: 'Uptime',      value: `${Math.floor(sysInfo.uptime / 60)}m ${sysInfo.uptime % 60}s`, icon: 'schedule' },
                { label: 'RSS Memory',  value: sysInfo.memory?.rss,       icon: 'memory' },
                { label: 'Heap Used',   value: sysInfo.memory?.heapUsed,  icon: 'storage' },
                { label: 'Heap Total',  value: sysInfo.memory?.heapTotal, icon: 'dns' },
                { label: 'Checked At',  value: new Date(sysInfo.checkedAt).toLocaleTimeString(), icon: 'access_time' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="diag-stat">
                  <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div className="diag-stat-label">{label}</div>
                    <div className="diag-stat-value">{value}</div>
                  </div>
                </div>
              ))}
            </Grid>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '32px 0', textAlign: 'center' }}>
              Run health checks first to load system info.
            </div>
          )}
        </div>
      )}

      {/* ── Capture Lookup Tab ── */}
      {tab === 'capture' && (
        <div>
          <form onSubmit={fetchCaptureDiagnostics} className="diag-search" style={{ marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Enter Capture ID..."
              value={captureIdInput}
              onChange={e => setCaptureIdInput(e.target.value)}
              style={{
                padding: '12px 16px', borderRadius: '10px',
                background: 'var(--bg-tertiary)', border: '1px solid #1e293b22',
                color: 'white', fontSize: '14px'
              }}
            />
            <button
              type="submit"
              disabled={captureLoading}
              style={{
                padding: '12px 24px', borderRadius: '10px', background: 'var(--primary)',
                color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600
              }}
            >
              {captureLoading ? 'Searching...' : 'Lookup'}
            </button>
          </form>

          {captureError && (
            <div className="break-anywhere" style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
              {captureError}
            </div>
          )}

          {captureData && (
            <div>
              <Grid cols={2} gap="14px" style={{ marginBottom: '24px' }}>
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
                  <div key={label} className="diag-stat">
                    <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--primary)', flexShrink: 0 }}>{icon}</span>
                    <div>
                      <div className="diag-stat-label">{label}</div>
                      <div className="diag-stat-value">{value}</div>
                    </div>
                  </div>
                ))}
              </Grid>

              <h3 style={{ color: '#f1f5f9', fontSize: '16px', marginBottom: '12px' }}>Timestamps</h3>
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(captureData.timestamps).map(([key, val]) => (
                  <div key={key} className="diag-kv-row" style={{ fontSize: '13px' }}>
                    <span className="break-anywhere" style={{ color: 'var(--text-dim)' }}>{key}</span>
                    <span style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{val ? new Date(val).toLocaleString() : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* ── Billing Lookup Tab ── */}
      {tab === 'billing' && (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="diag-panel-pad" style={{ borderBottom: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded">payments</span>
              Billing Diagnostics
            </h3>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '14px' }}>
              Search for a user by email to view their complete Lemon Squeezy billing state, subscriptions, and webhooks.
            </p>
            <form onSubmit={handleBillingLookup} className="diag-search" style={{ marginTop: '20px' }}>
              <input
                type="text"
                placeholder="user@example.com"
                value={billingEmail}
                onChange={e => setBillingEmail(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)', border: '1px solid #334155', borderRadius: '8px',
                  padding: '10px 16px', color: 'white', fontSize: '14px', outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={loading || !billingEmail}
                style={{
                  background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '0 20px', fontSize: '14px', fontWeight: 600, cursor: (loading || !billingEmail) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !billingEmail) ? 0.5 : 1
                }}
              >
                Search
              </button>
            </form>
          </div>

          {billingResult && (
            <div className="diag-panel-pad">
              {billingResult.error ? (
                <div className="break-anywhere" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px' }}>
                  {billingResult.error}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Identity */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '15px' }}>Identity (AntCapture)</h4>
                    <div className="diag-fields">
                      <div className="diag-field">User ID<div style={{ fontFamily: 'monospace' }}>{billingResult.identity.userId}</div></div>
                      <div className="diag-field">Email<div>{billingResult.identity.email}</div></div>
                      <div className="diag-field">Created<div>{new Date(billingResult.identity.createdAt).toLocaleString()}</div></div>
                    </div>
                  </div>

                  {/* Customer & Subscription */}
                  <Grid cols={2} gap="24px">
                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid #334155', minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '15px' }}>LemonSqueezy Customer</h4>
                      {billingResult.customer ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="diag-field">LS Customer ID<div style={{ fontFamily: 'monospace' }}>{billingResult.customer.lsCustomerId}</div></div>
                          <div className="diag-field">LS Subscription ID<div style={{ fontFamily: 'monospace' }}>{billingResult.customer.lsSubscriptionId || 'N/A'}</div></div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No LemonSqueezy customer record found.</div>
                      )}
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid #334155', minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '15px' }}>Active Subscription</h4>
                      {billingResult.subscription ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="diag-field">Plan<div>{billingResult.subscription.planName}</div></div>
                          <div className="diag-field">Status<div>{billingResult.subscription.status}</div></div>
                          <div className="diag-field">Renews At<div>{billingResult.subscription.currentPeriodEnd ? new Date(billingResult.subscription.currentPeriodEnd).toLocaleString() : 'N/A'}</div></div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No subscription found.</div>
                      )}
                    </div>
                  </Grid>

                  {/* Entitlements */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '15px' }}>Computed Entitlements (What they are allowed to use)</h4>
                    <div className="diag-fields" style={{ '--diag-min': '150px' }}>
                      <div className="diag-field">Cloud Features<div style={{ color: billingResult.entitlements.cloud ? '#22c55e' : 'var(--danger)', fontWeight: 'bold' }}>{billingResult.entitlements.cloud ? 'GRANTED' : 'DENIED'}</div></div>
                      <div className="diag-field">Current Plan<div>{billingResult.entitlements.plan}</div></div>
                      <div className="diag-field">Warning Level<div>{billingResult.entitlements.warningLevel || 'None'}</div></div>
                    </div>
                  </div>

                  {/* Webhooks */}
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#e2e8f0', fontSize: '15px' }}>Webhook History ({billingResult.webhooks?.length || 0})</h4>
                    {billingResult.webhooks?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {billingResult.webhooks.map(wh => (
                          <div key={wh.id} className="diag-list-row" style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px', border: '1px solid #334155' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--primary)', flexShrink: 0 }}>webhook</span>
                              <div className="min-w-0">
                                <div className="break-anywhere" style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{wh.eventName}</div>
                                <div className="break-anywhere" style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'monospace' }}>{wh.lsEventId}</div>
                              </div>
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: '12px', textAlign: 'right', marginLeft: 'auto' }}>
                              {new Date(wh.processedAt).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-dim)', fontSize: '14px' }}>No webhooks recorded.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Recovery Tab ── */}
      {tab === 'recovery' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Capture Activation & Stuck Capture Healing */}
          <div className="diag-panel-pad" style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid #1e293b22' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: '18px', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ color: activationData?.stuckCount > 0 ? 'var(--danger)' : '#22c55e' }}>
                    {activationData?.stuckCount > 0 ? 'warning' : 'task_alt'}
                  </span>
                  Capture Activation Status
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                  Detects captures that reached the CDN but were not activated in the dashboard (stuck in <code>processing</code>).
                </p>
              </div>
              <button
                onClick={fetchActivationData}
                disabled={activationLoading}
                className="diag-btn-ghost"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px', animation: activationLoading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>
                Refresh Status
              </button>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px' }}>
              <div style={{
                background: activationData?.stuckCount > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                border: `1px solid ${activationData?.stuckCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '8px', padding: '12px 14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Stuck (Invisible)</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: activationData?.stuckCount > 0 ? 'var(--danger)' : '#22c55e', marginTop: '4px' }}>
                  {activationData ? activationData.stuckCount : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>File on CDN, pending activate</div>
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px', padding: '12px 14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Auto-Healed</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                  {activationData ? activationData.autoHealedTotal : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Healed at read time</div>
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px', padding: '12px 14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unuploaded Drafts</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', marginTop: '4px' }}>
                  {activationData ? activationData.orphanedCount : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>No CDN file received yet</div>
              </div>
            </div>

            {/* Stuck Captures list & Action */}
            {activationData?.stuckCaptures && activationData.stuckCaptures.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px', padding: '14px', marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '13px' }}>
                        {activationData.stuckCaptures.length} capture(s) currently invisible to users
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Their files exist on CDN but captures are in 'processing' status. Auto-heal will fix them on next user refresh, or you can force-heal now:
                      </div>
                    </div>
                    <button
                      onClick={runHealStuckCaptures}
                      disabled={healLoading}
                      style={{
                        background: 'var(--primary)', color: 'white', border: 'none',
                        borderRadius: '6px', padding: '8px 16px', fontWeight: 600, fontSize: '12px',
                        cursor: healLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>healing</span>
                      {healLoading ? 'Healing...' : 'Heal All Now'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {activationData.stuckCaptures.map(c => (
                    <div key={c.id} style={{
                      background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '6px',
                      fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }} className="truncate">{c.title || c.id}</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'monospace' }}>
                          User: {c.userEmail || c.userId} · Key: {c.providerObjectId}
                        </div>
                      </div>
                      <div style={{ color: 'var(--warning)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {c.ageMinutes}m old
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {healResult && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px 14px', borderRadius: '8px', marginTop: '14px', fontSize: '13px', color: '#22c55e' }}>
                <div style={{ fontWeight: 600 }}>{healResult.message}</div>
                {healResult.healed && healResult.healed.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Healed: {healResult.healed.map(h => h.title || h.id).join(', ')}
                  </div>
                )}
              </div>
            )}

            {healError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '12px 14px', borderRadius: '8px', marginTop: '14px', fontSize: '13px' }}>
                {healError}
              </div>
            )}
          </div>

          {/* Section 2: UploadThing Deep CDN Sync */}
          <div className="diag-panel-pad" style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid #1e293b22' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--danger)' }}>build</span>
              UploadThing Deep CDN Sync
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.6' }}>
              If UploadThing webhook deliveries failed (e.g., due to Vercel timeout), some captures may remain stuck in the <code style={{ color: 'var(--warning)' }}>'processing'</code> state even though the file reached the CDN successfully.
              <br/><br/>
              This tool fetches all files from the UploadThing CDN and cross-references them with any captures that have been processing for more than 2 minutes. Matching captures will be forcibly activated and added to the database.
            </p>
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={runRecovery}
                disabled={recoveryLoading}
                className="full-below-sm"
                style={{
                  background: 'var(--danger)', color: 'white', padding: '12px 24px', borderRadius: '8px',
                  fontWeight: 600, border: 'none', cursor: recoveryLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: recoveryLoading ? 0.7 : 1
                }}
              >
                <span className="material-symbols-rounded">{recoveryLoading ? 'hourglass_empty' : 'play_arrow'}</span>
                {recoveryLoading ? 'Running Recovery...' : 'Run Stuck Capture Recovery'}
              </button>
            </div>

            {recoveryError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Recovery Failed</div>
                <div className="break-anywhere" style={{ fontSize: '14px' }}>{recoveryError}</div>
              </div>
            )}

            {recoveryResult && (
              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <div className="break-anywhere" style={{ color: '#22c55e', fontWeight: 600, marginBottom: '8px' }}>
                  {recoveryResult.message}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '12px' }}>
                  Total processing checked: {recoveryResult.total} | Successfully recovered: {recoveryResult.recovered}
                </div>
                {recoveryResult.results && recoveryResult.results.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recoveryResult.results.map((r, i) => (
                      <div key={i} className="diag-kv-row" style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                        <span className="break-anywhere" style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{r.id}</span>
                        {r.status === 'recovered' ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>Recovered ({r.fileKey})</span>
                        ) : (
                          <span style={{ color: 'var(--warning)' }}>Skipped: {r.reason}</span>
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

      {/* ── Storage & User Analytics Tab ── */}
      {tab === 'storage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
                Storage & User Analytics
              </h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
                Real-time CDN utilization, user growth, plan distribution, and storage footprint.
              </p>
            </div>
            <button
              onClick={fetchStorageAnalytics}
              disabled={analyticsLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px',
                background: 'var(--bg-tertiary)', border: '1px solid #334155',
                color: 'white', cursor: analyticsLoading ? 'not-allowed' : 'pointer',
                fontSize: '13px', fontWeight: 600, flexShrink: 0
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px', animation: analyticsLoading ? 'spin 1s linear infinite' : 'none' }}>
                refresh
              </span>
              Refresh
            </button>
          </div>

          {analyticsError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '14px 16px', borderRadius: '10px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', flexShrink: 0 }}>error</span>
              <span className="break-anywhere">{analyticsError}</span>
            </div>
          )}

          {analyticsLoading && !storageAnalytics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-box" style={{ height: '100px', borderRadius: '14px' }} />
              ))}
            </div>
          )}

          {!analyticsLoading && !storageAnalytics && !analyticsError && (
            <div style={{
              textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)', fontSize: '14px',
              background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid #334155'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', color: 'var(--text-faint)' }}>pie_chart</span>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>No analytics data yet</div>
              Click <strong>Refresh</strong> to load storage and user analytics.
            </div>
          )}

          {storageAnalytics && (() => {
            try {
              const sa = storageAnalytics;
              const uploadThing = sa.uploadThing || {};
              const database = sa.database || {};
              const userGrowth = sa.userGrowth || {};
              const planDistribution = Array.isArray(sa.planDistribution) ? sa.planDistribution : [];
              const signupTrend = Array.isArray(userGrowth.signupTrend) ? userGrowth.signupTrend : [];
              const topUsers = Array.isArray(sa.topUsers) ? sa.topUsers : [];
              const maxPlanCount = planDistribution.length > 0 ? Math.max(...planDistribution.map(p => Number(p?.count) || 0), 1) : 1;
              const maxDayCount  = signupTrend.length  > 0 ? Math.max(...signupTrend.map(d => Number(d?.count) || 0),  1) : 1;
              const planColors = ['#94a3b8', '#6366f1', '#10b981', '#f59e0b', '#38bdf8'];
              return (
              <>
                {/* ── Row 1: KPI Metric Cards ── */}
                <Grid cols={4} gap="14px">
                  {/* Storage */}
                  <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>CDN Storage</span>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#6366f1' }}>cloud_sync</span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{uploadThing.usedFormatted || '0 GB'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '6px 0 10px' }}>of {uploadThing.limitFormatted || '2.00 GB'} · {uploadThing.percentUsed ?? 0}% used</div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '999px',
                        width: `${Math.min(100, uploadThing.percentUsed ?? 0)}%`,
                        background: (uploadThing.percentUsed ?? 0) > 85 ? '#ef4444' : (uploadThing.percentUsed ?? 0) > 60 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>

                  {/* Total Users */}
                  <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>Total Users</span>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#38bdf8' }}>group</span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{Number(database.totalUsers ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{Number(database.activeSubscribers ?? 0)}</span> paid ·{' '}
                      <span style={{ color: '#94a3b8' }}>{Number(database.freeUsers ?? 0)}</span> free
                    </div>
                  </div>

                  {/* New Users */}
                  <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>New Signups</span>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#a78bfa' }}>person_add</span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{(userGrowth.newLast7d ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span><span style={{ color: '#a78bfa', fontWeight: 600 }}>{userGrowth.newLast24h ?? 0}</span> today</span>
                      <span><span style={{ color: '#a78bfa', fontWeight: 600 }}>{userGrowth.newLast30d ?? 0}</span> last 30d</span>
                    </div>
                  </div>

                  {/* Captures */}
                  <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '14px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>Captures</span>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#10b981' }}>folder_open</span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>{Number(database.totalCaptures ?? database.totalFiles ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px' }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{Number(database.activeCaptures ?? database.totalFiles ?? 0)}</span> active · {uploadThing.filesUploaded ?? 0} on CDN
                    </div>
                  </div>
                </Grid>

                {/* ── Row 2: Signup Trend Chart + Plan Distribution ── */}
                <Grid cols={2} gap="16px">
                  {/* Signup Trend — mini bar chart */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Signup Trend</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>New users per day — last 30 days</div>
                      </div>
                      <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#a78bfa' }}>show_chart</span>
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px'
                    }}>
                      {signupTrend.map(({ date, count }) => (
                        <div
                          key={date}
                          title={`${date}: ${count} new user${count !== 1 ? 's' : ''}`}
                          style={{
                            flex: 1, minWidth: 0,
                            height: `${Math.max(4, Math.round(((Number(count) || 0) / maxDayCount) * 80))}px`,
                            background: (Number(count) || 0) > 0
                              ? `linear-gradient(180deg, #a78bfa, #6366f1)`
                              : 'rgba(255,255,255,0.06)',
                            borderRadius: '3px 3px 0 0',
                            cursor: 'default',
                            transition: 'opacity 0.15s',
                            opacity: 0.85,
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>30 days ago</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Today</span>
                    </div>
                  </div>

                  {/* Plan Distribution */}
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid #334155', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>Plan Distribution</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Users by subscription tier</div>
                      </div>
                      <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#10b981' }}>pie_chart</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {planDistribution.map((p, i) => (
                        <div key={p.planName || i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>{p.planName}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: planColors[i] || '#6366f1' }}>{Number(p.count || 0).toLocaleString()}</span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '999px',
                              width: `${Math.round(((Number(p.count) || 0) / maxPlanCount) * 100)}%`,
                              background: planColors[i] || '#6366f1',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                        </div>
                      ))}
                      {planDistribution.length === 0 && (
                        <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                          No plan data available
                        </div>
                      )}
                    </div>
                  </div>
                </Grid>

                {/* ── Row 3: Per-User Storage Table ── */}
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: '14px', border: '1px solid #334155', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', color: '#f1f5f9', fontWeight: 700 }}>
                      User Storage Breakdown
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      Top {topUsers.length} storage consumers
                    </span>
                  </div>
                  <TableScroll>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155' }}>
                          {['User / Email', 'Joined', 'Plan', 'Captures', 'Storage', 'Role', ''].map(h => (
                            <th key={h} style={{ padding: '11px 16px', fontWeight: 600, fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topUsers.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <td style={{ padding: '11px 16px' }}>
                              <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{u.name || 'Unnamed'}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{u.email}</div>
                            </td>
                            <td style={{ padding: '11px 16px', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                background: u.plan !== 'free' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                                color: u.plan !== 'free' ? '#818cf8' : 'var(--text-dim)',
                                textTransform: 'uppercase'
                              }}>
                                {u.plan}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', color: '#cbd5e1', fontSize: '12px' }}>
                              {Number(u.captureCount || 0).toLocaleString()}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{ fontWeight: 700, color: (u.bytesUsed || 0) > 1024 * 1024 * 500 ? '#f59e0b' : '#34d399', fontSize: '12px' }}>
                                {u.formattedUsage || '0 MB'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{
                                fontSize: '10px', color: u.role === 'admin' ? '#c084fc' : 'var(--text-dim)',
                                fontWeight: u.role === 'admin' ? 700 : 400
                              }}>
                                {u.role}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => { setBillingEmail(u.email); setTab('billing'); }}
                                style={{
                                  background: 'transparent', border: '1px solid #334155', borderRadius: '6px',
                                  color: 'var(--text-dim)', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600
                                }}
                              >
                                Billing
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!sa.topUsers || sa.topUsers.length === 0) && (
                          <tr>
                            <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                              No user data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </TableScroll>
                </div>
              </>
              );
            } catch (renderErr) {
              return (
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '14px', padding: '24px', textAlign: 'center'
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '36px', color: 'var(--danger)', display: 'block', marginBottom: '10px' }}>error</span>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: '6px' }}>Analytics render error</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{renderErr.message}</div>
                  <button
                    onClick={() => { setStorageAnalytics(null); fetchStorageAnalytics(); }}
                    style={{ marginTop: '16px', padding: '8px 18px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                  >
                    Retry
                  </button>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* ── Check Detail Modal ── */}
      <CheckDetailModal check={selectedCheck} onClose={() => setSelectedCheck(null)} />

      {/* ── Spin animation ── */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Page>
  );
}
