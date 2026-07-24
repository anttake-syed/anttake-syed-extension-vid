import React, { useState } from 'react';
import { SERVER_URL } from '../config';

export default function LocalLoginModal({ onClose, onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('Password is required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {throw new Error(data.error || 'Login failed');}
      // data.jwt is the signed JWT — pass up to useAuth.login()
      onLogin(data.jwt);
      if (onClose) {onClose();}
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', background: '#0f172a', border: '1px solid #334155',
    borderRadius: '10px', padding: '12px 14px', color: '#f1f5f9',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px', padding: '32px' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Brand */}
        <div className="modal-brand" style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div className="brand-icon-sm" style={{ margin: '0 auto 16px' }}>
            <svg viewBox="0 0 32 32" width="40" height="40" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#lg)" />
              <circle cx="16" cy="16" r="6" fill="white" opacity="0.9" />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a78bfa" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#f8fafc', fontWeight: 700 }}>
            Local Admin Login
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
            Self-hosted mode — sign in with your local credentials.
          </p>

          {/* Self-hosted badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)',
            borderRadius: '999px', padding: '4px 12px', marginTop: '12px',
            fontSize: '11px', fontWeight: 600, color: '#a78bfa',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>dns</span>
            Self-Hosted Instance
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#a78bfa'}
              onBlur={e => e.target.style.borderColor = '#334155'}
              autoComplete="username"
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your local admin password"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#a78bfa'}
              onBlur={e => e.target.style.borderColor = '#334155'}
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#f87171',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', flexShrink: 0 }}>error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              background: loading ? 'rgba(167,139,250,0.4)' : 'linear-gradient(135deg,#a78bfa,#6366f1)',
              border: 'none', borderRadius: '10px', color: 'white',
              padding: '13px', fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? (
              <><div className="btn-spinner" style={{ borderTopColor: 'white' }} /> Signing in...</>
            ) : (
              <><span className="material-symbols-rounded" style={{ fontSize: '18px' }}>lock_open</span> Sign In</>
            )}
          </button>
        </form>

        <p style={{ margin: '20px 0 0', fontSize: '11px', color: '#475569', textAlign: 'center', lineHeight: 1.6 }}>
          Default credentials are set in your <code style={{ color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '1px 5px', borderRadius: '4px' }}>.env</code> file.
          Change them in Settings after login.
        </p>
      </div>
    </div>
  );
}
