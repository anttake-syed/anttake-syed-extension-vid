import React, { useState, useEffect } from 'react';
import './index.css';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ─── Login Modal ─────────────────────────────────────────────────────────────
function LoginModal({ onClose }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = () => {
    setLoading(true);
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const origin = window.location.origin;
    window.open(
      `${BACKEND_URL}/auth/google?source=web&mode=popup&origin=${encodeURIComponent(origin)}`,
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    setTimeout(() => setLoading(false), 5000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-brand">
          <div className="brand-icon-sm">
            <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#mg)"/>
              <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
              <defs>
                <linearGradient id="mg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
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
            <><div className="btn-spinner"/><span>Redirecting to Google...</span></>
          ) : (
            <>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
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

// ─── Media Player Modal ───────────────────────────────────────────────────────
function MediaModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000, background: 'rgba(0,0,0,0.85)' }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ width: '80%', maxWidth: '900px', background: '#0f172a', border: '1px solid #334155', padding: '0', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose} aria-label="Close" style={{ zIndex: 10, top: '15px', right: '15px' }}>✕</button>
        <div className="modal-brand" style={{ padding: '20px', paddingBottom: '15px', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>{item.title}{item.ext}</h2>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
            {item.date ? new Date(item.date).toLocaleDateString() : ''} • {item.size}
          </p>
        </div>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', minHeight: '300px' }}>
          {item.type === 'video' ? (
            <video
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '60vh', outline: 'none', background: '#000' }}
              src={item.src}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={item.src}
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              alt={item.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeNav, setActiveNav] = useState('Dashboard');
  const [activeMedia, setActiveMedia] = useState(null);

  // ── Real captures state (replaces mockCaptures) ───────────────────────────
  const [captures, setCaptures] = useState([]);
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [filter, setFilter] = useState('All');

  // ── Derived stats from real data ──────────────────────────────────────────
  const stats = [
    { label: 'Total Captures', value: captures.length.toString(), icon: '📁' },
    {
      label: 'Storage Used',
      value: captures.length === 0 ? '0 MB' : captures.reduce((acc, c) => {
        const mb = parseFloat(c.size) || 0;
        return acc + mb;
      }, 0).toFixed(1) + ' MB',
      icon: '☁️'
    },
    {
      label: 'This Week',
      value: captures.filter(c => {
        if (!c.date) return false;
        return new Date(c.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }).length.toString(),
      icon: '📈'
    },
  ];

  // ── Filtered captures ─────────────────────────────────────────────────────
  const filteredCaptures = captures.filter(c => {
    if (filter === 'Videos') return c.type === 'video';
    if (filter === 'Screenshots') return c.type === 'image';
    return true;
  });

  // ── Fetch captures when user logs in ─────────────────────────────────────
const fetchCaptures = async (jwt) => {
  setLoadingCaptures(true);

  try {
    const res = await fetch(`${BACKEND_URL}/captures`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // ✅ FIX: map fileUrl → src so UI works
    const normalized = (data.captures || []).map((c) => ({
      ...c,
      src: c.fileUrl,
    }));

    setCaptures(normalized);
  } catch (err) {
    console.error('Failed to fetch captures:', err);
  } finally {
    setLoadingCaptures(false);
  }
};

  // ── Auth helpers ──────────────────────────────────────────────────────────
  // IMPORTANT: stores the raw JWT string on userData so fetch calls can use it
  const processAuthData = (authData) => {
    try {
      console.log('✨ Processing Auth Data...');
      const base64Url = authData.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const userData = JSON.parse(jsonPayload);
      userData.jwt = authData; // ← critical: store raw JWT for API calls

      localStorage.setItem('antcapture_user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setShowModal(false);

      // Fetch captures immediately after login
      fetchCaptures(authData);
    } catch (e) {
      console.error('Auth parse error:', e);
    }
  };

  useEffect(() => {
    // 1. Restore session from localStorage
    const storedUser = localStorage.getItem('antcapture_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setIsAuthenticated(true);
      // Fetch captures for restored session
      if (userData.jwt) fetchCaptures(userData.jwt);
    }

    // 2. Handle redirect fallback (legacy / extension)
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      processAuthData(authData);
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }

    // 3. Listen for popup auth success
    const handleMessage = (event) => {
      if (event.origin !== BACKEND_URL) return;
      if (event.data?.type === 'AUTH_SUCCESS' && event.data.auth_data) {
        processAuthData(event.data.auth_data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const requireAuth = (fn) => {
    if (isAuthenticated) { fn?.(); }
    else { setShowModal(true); }
  };

  const handleLogout = () => {
    localStorage.removeItem('antcapture_user');
    setUser(null);
    setIsAuthenticated(false);
    setCaptures([]);
    setShowProfileMenu(false);
  };

  return (
    <div className={`layout ${isAuthenticated ? 'isAuthenticated' : ''}`}>
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
      {activeMedia && <MediaModal item={activeMedia} onClose={() => setActiveMedia(null)} />}

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" style={{flexShrink:0}}>
            <circle cx="10" cy="10" r="10" fill="url(#sl)"/>
            <circle cx="10" cy="10" r="4" fill="white" opacity="0.9"/>
            <defs>
              <linearGradient id="sl" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/><stop offset="1" stopColor="#a855f7"/>
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
            {isAuthenticated && user ? (
              <div className="profile-container">
                <div
                  className="user-pill animated fadeIn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  {user.picture ? (
                    <img src={user.picture} className="user-avatar profile-circle" alt="Profile" />
                  ) : (
                    <div className="user-avatar profile-circle">{user.name?.charAt(0) || 'U'}</div>
                  )}
                  <span className="user-name">{user.name}</span>
                  <span className="chevron">▼</span>
                </div>

                {showProfileMenu && (
                  <div className="profile-dropdown animated fadeInScale">
                    <div className="dropdown-header">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item" onClick={() => setActiveNav('Settings')}>
                      <span className="item-icon">⚙</span> Settings
                    </button>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <span className="item-icon">🚪</span> Sign Out
                    </button>
                  </div>
                )}

                <button className="btn-primary" onClick={() => requireAuth()}>
                  + New Capture
                </button>
              </div>
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

        {/* Hero Banner — logged out only */}
        {!isAuthenticated && (
          <section className="hero-banner slideIn">
            <div className="hero-text">
              <h2>Record. Screenshot. Sync.</h2>
              <p>Capture anything on your screen and automatically back it up to Google Drive. Works as a Chrome extension — no account needed to start.</p>
              <div className="hero-pills">
                <span className="pill">✓ Tab & window recording</span>
                <span className="pill">✓ One-click screenshots</span>
                <span className="pill">✓ 5GB Free Storage</span>
              </div>
            </div>
            <button className="btn-hero" onClick={() => setShowModal(true)}>
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="G" className="google-icon" />
              Sign in with Google
            </button>
          </section>
        )}

        {/* Stats Row */}
        <section className="stats-row">
          {stats.map(s => (
            <div
              key={s.label}
              className={`stat-card ${!isAuthenticated ? 'blurred' : ''}`}
              onClick={() => !isAuthenticated && setShowModal(true)}
            >
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value">{isAuthenticated ? s.value : '—'}</div>
              <div className="stat-label">{s.label}</div>
              {!isAuthenticated && <div className="lock-overlay"><span>🔒 Sign in to view</span></div>}
            </div>
          ))}
        </section>

        {/* Section header */}
        <div className="section-header">
          <h3>
            Recent Captures{' '}
            <span className="count-badge">{isAuthenticated ? filteredCaptures.length : 0}</span>
          </h3>
          {isAuthenticated && (
            <div className="filter-row">
              {['All', 'Videos', 'Screenshots'].map(f => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Media Grid */}
        <section className="media-grid">
          {!isAuthenticated ? (
            // Logged out: show 3 blurred placeholder cards
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="media-card card-preview" onClick={() => setShowModal(true)}>
                <div className="media-preview">
                  <div className="media-thumb-icon">
                    <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.3}}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div className="media-overlay">
                    <div className="overlay-actions">
                      <button className="media-action-btn locked" onClick={() => setShowModal(true)}>🔒</button>
                    </div>
                  </div>
                </div>
                <div className="media-info">
                  <div className="media-title" style={{filter:'blur(6px)'}}>Capture title here</div>
                  <div className="media-meta" style={{filter:'blur(4px)'}}>
                    <span>Just now · 0 MB</span>
                    <span className="tag image">image</span>
                  </div>
                </div>
              </div>
            ))
          ) : loadingCaptures ? (
            // Loading state
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              <p>Loading your captures...</p>
            </div>
          ) : filteredCaptures.length === 0 ? (
            // Empty state
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <p style={{ marginBottom: '6px' }}>No captures yet.</p>
              <p style={{ fontSize: '13px' }}>Use the Chrome extension to record or take a screenshot — it'll show up here automatically.</p>
            </div>
          ) : (
            // Real captures
            filteredCaptures.map(item => (
              <div
                key={item.id}
                className="media-card"
                onClick={(e) => {
                  if (e.target.closest('.media-action-btn')) return;
                  setActiveMedia(item);
                }}
              >
                <div className="media-preview">
                  {/* Show real thumbnail for images */}
                  {item.type === 'image' && item.src ? (
                    <img
                      src={item.src}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
                      alt={item.title}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="media-thumb-icon">
                      <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.5}}>
                        <rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>
                      </svg>
                    </div>
                  )}
                  {item.duration && <div className="duration-badge">{item.duration}</div>}
                  <div className="media-overlay">
                    <div className="overlay-actions">
                      <button
                        className="media-action-btn play-btn"
                        onClick={(e) => { e.stopPropagation(); setActiveMedia(item); }}
                        title="Preview"
                      >▶</button>
                      <button
                        className="media-action-btn download-btn"
                        onClick={(e) => { e.stopPropagation(); window.open(item.driveUrl, '_blank'); }}
                        title="Open in Drive"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="media-info">
                  <div className="media-title">
                    {item.title}
                    <span className="file-ext">{item.ext}</span>
                  </div>
                  <div className="media-meta">
                    <span>
                      {item.date ? new Date(item.date).toLocaleDateString() : 'Just now'} · {item.size}
                    </span>
                    <span className={`tag ${item.type}`}>{item.type}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* CTA banner — logged out only */}
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