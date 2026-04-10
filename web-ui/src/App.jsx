import React, { useState, useEffect } from 'react';
import './index.css';

const BACKEND_URL = 'http://localhost:3001';

// ─── Login Modal ─────────────────────────────────────────────────────────────
function LoginModal({ onClose }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = `${BACKEND_URL}/auth/google?source=web`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-brand">
          <div className="brand-icon-sm">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#mg)" />
              <circle cx="16" cy="16" r="6" fill="white" opacity="0.9" />
              <defs>
                <linearGradient id="mg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" /><stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h2>Sign in to AntCapture</h2>
          <p>Connect your Google account to upload recordings, sync across devices, and access your library.</p>
        </div>

        <button
          id="google-signin-btn"
          className={`google-btn ${loading ? 'loading' : ''}`}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <><div className="btn-spinner" /><span>Redirecting to Google...</span></>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="modal-footer">
          By signing in you authorize AntCapture to store recordings in your Google Drive.
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const mockCaptures = [
  { id: 1, title: 'Product Demo v2', type: 'video', date: '2 hours ago', size: '12.4 MB', duration: '2:34' },
  { id: 2, title: 'Bug Report — Checkout UI', type: 'image', date: '5 hours ago', size: '2.1 MB', duration: null },
  { id: 3, title: 'Feature Walkthrough', type: 'video', date: 'Yesterday', size: '45.8 MB', duration: '8:12' },
  { id: 4, title: 'Onboarding Flow', type: 'video', date: '2 days ago', size: '28.3 MB', duration: '5:01' },
  { id: 5, title: 'Dashboard Screenshot', type: 'image', date: '3 days ago', size: '1.7 MB', duration: null },
  { id: 6, title: 'Sprint Review Recording', type: 'video', date: 'Last week', size: '91.2 MB', duration: '22:48' },
];

const stats = [
  { label: 'Total Captures', value: '128', icon: '📁' },
  { label: 'Storage Used', value: '3.2 GB', icon: '☁️' },
  { label: 'This Week', value: '14', icon: '📈' },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeNav, setActiveNav] = useState('Dashboard');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || sessionStorage.getItem('antcapture_token');
    if (token) {
      sessionStorage.setItem('antcapture_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsAuthenticated(true);
    }
  }, []);

  const requireAuth = (fn) => {
    if (isAuthenticated) { fn?.(); }
    else { setShowModal(true); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('antcapture_token');
    setIsAuthenticated(false);
  };

  return (
    <div className="layout">
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="10" cy="10" r="10" fill="url(#sl)" />
            <circle cx="10" cy="10" r="4" fill="white" opacity="0.9" />
            <defs>
              <linearGradient id="sl" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" /><stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          AntCapture
        </div>

        <nav>
          <ul className="nav-list">
            {['Dashboard', 'My Library', 'Settings', 'Cloud Connect'].map(item => (
              <li
                key={item}
                className={`nav-item ${activeNav === item ? 'active' : ''}`}
                onClick={() => requireAuth(() => setActiveNav(item))}
              >
                <span className="nav-icon">
                  {item === 'Dashboard' ? '⊞' : item === 'My Library' ? '🗂' : item === 'Settings' ? '⚙' : '☁'}
                </span>
                {item}
                {!isAuthenticated && item !== 'Dashboard' && <span className="nav-lock">🔒</span>}
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
          ) : (
            <button className="btn-signin-sidebar" onClick={() => setShowModal(true)}>
              Sign in with Google
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* Top Header */}
        <header className="header">
          <div className="title-section">
            <h1>Capture Library</h1>
            <p>Your recordings and screenshots, synced across all devices.</p>
          </div>
          <div className="header-actions">
            {isAuthenticated ? (
              <>
                <div className="user-pill">
                  <div className="user-avatar">S</div>
                  <span>Saleh</span>
                </div>
                <button className="btn-primary" onClick={() => requireAuth()}>
                  + New Capture
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => setShowModal(true)}>Sign In</button>
                <button className="btn-primary glow-pulse" onClick={() => setShowModal(true)}>
                  Get Started Free →
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero Banner — shown only when logged out */}
        {!isAuthenticated && (
          <section className="hero-banner">
            <div className="hero-text">
              <h2>Record. Screenshot. Sync.</h2>
              <p>Capture anything on your screen and automatically back it up to Google Drive. Works as a Chrome extension — no account needed to start.</p>
              <div className="hero-pills">
                <span className="pill">✓ Tab & window recording</span>
                <span className="pill">✓ Auto cloud sync</span>
                <span className="pill">✓ Zero file size limits</span>
              </div>
            </div>
            <button className="btn-hero" onClick={() => setShowModal(true)}>
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google — it's free
            </button>
          </section>
        )}

        {/* Stats Row */}
        <section className="stats-row">
          {stats.map(s => (
            <div key={s.label} className={`stat-card ${!isAuthenticated ? 'blurred' : ''}`} onClick={() => !isAuthenticated && setShowModal(true)}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{isAuthenticated ? s.value : '—'}</div>
              <div className="stat-label">{s.label}</div>
              {!isAuthenticated && <div className="lock-overlay"><span>🔒 Sign in to view</span></div>}
            </div>
          ))}
        </section>

        {/* Section header */}
        <div className="section-header">
          <h3>Recent Captures <span className="count-badge">{mockCaptures.length}</span></h3>
          {isAuthenticated && (
            <div className="filter-row">
              <button className="filter-btn active">All</button>
              <button className="filter-btn">Videos</button>
              <button className="filter-btn">Screenshots</button>
            </div>
          )}
        </div>

        {/* Media Grid */}
        <section className="media-grid">
          {mockCaptures.map(item => (
            <div
              key={item.id}
              className={`media-card ${!isAuthenticated ? 'card-preview' : ''}`}
              onClick={() => requireAuth()}
            >
              <div className="media-preview">
                <div className="media-thumb-icon">{item.type === 'video' ? '🎬' : '🖼️'}</div>
                {item.duration && <div className="duration-badge">{item.duration}</div>}
                <div className="media-overlay">
                  {isAuthenticated ? (
                    <button className="play-btn">▶</button>
                  ) : (
                    <button className="play-btn locked" onClick={() => setShowModal(true)}>🔒</button>
                  )}
                </div>
              </div>
              <div className="media-info">
                <div className="media-title">{item.title}</div>
                <div className="media-meta">
                  <span>{item.date} · {item.size}</span>
                  <span className={`tag ${item.type}`}>{item.type}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* CTA banner at bottom for logged out users */}
        {!isAuthenticated && (
          <div className="cta-banner">
            <div>
              <strong>Ready to sync your captures?</strong>
              <span> Sign in to unlock your cloud library, Drive backup, and more.</span>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>Sign in with Google →</button>
          </div>
        )}
      </main>
    </div>
  );
}
