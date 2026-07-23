import React, { useState, useEffect } from 'react';
import { SERVER_URL, IS_LOCAL_MODE } from '../config';

/**
 * ServerHealthBadge
 * Shows a live "Server Online / Offline" pill in the web-ui header.
 * Only visible in Local Mode (self-hosted). In cloud mode the server
 * is always managed by the platform, so we don't need to show this.
 */
export default function ServerHealthBadge() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'online' | 'offline'

  async function checkHealth() {
    try {
      const res = await fetch(`${SERVER_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  }

  useEffect(() => {
    if (!IS_LOCAL_MODE) {return;} // Cloud mode: don't poll
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkHealth();
    const interval = setInterval(checkHealth, 15_000); // Recheck every 15s
    return () => clearInterval(interval);
  }, []);

  // Only render in local/self-hosted mode
  if (!IS_LOCAL_MODE) {return null;}

  const config = {
    checking: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', dot: '#94a3b8', label: 'Checking...' },
    online:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  dot: '#34d399', label: 'Server Online' },
    offline:  { color: '#f87171', bg: 'rgba(248,113,113,0.1)', dot: '#f87171', label: 'Server Offline' },
  }[status];

  return (
    <div
      title={status === 'offline' ? `Cannot reach ${SERVER_URL} — run: cd server && npm start` : `Connected to ${SERVER_URL}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: config.bg,
        border: `1px solid ${config.color}33`,
        borderRadius: '20px',
        padding: '4px 10px',
        fontSize: '11px',
        fontWeight: '600',
        color: config.color,
        cursor: status === 'offline' ? 'help' : 'default',
        userSelect: 'none',
        transition: 'all 0.3s',
      }}
    >
      {/* Pulsing dot */}
      <span style={{ position: 'relative', width: '7px', height: '7px', flexShrink: 0 }}>
        <span style={{
          position: 'absolute', inset: 0,
          background: config.dot,
          borderRadius: '50%',
          animation: status === 'online' ? 'healthPulse 2s infinite' : 'none',
        }} />
      </span>
      {config.label}
      {status === 'offline' && (
        <button
          onClick={checkHealth}
          title="Retry connection"
          style={{
            background: 'none', border: 'none', color: config.color,
            cursor: 'pointer', padding: '0 0 0 2px', display: 'flex',
            alignItems: 'center', fontSize: '13px',
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>refresh</span>
        </button>
      )}
      <style>{`
        @keyframes healthPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
