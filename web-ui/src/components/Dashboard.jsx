import React from 'react';

export default function Dashboard({
  isAuthenticated,
  stats,
  filteredCaptures,
  loadingCaptures,
  filter,
  setFilter,
  onSignIn,
  onOpenMedia,
}) {
  return (
    <>
      {/* Hero — logged out only */}
      {!isAuthenticated && (
        <section className="hero-banner slideIn">
          <div className="hero-text">
            <h2>Record. Screenshot. Sync.</h2>
            <p>Capture anything on your screen and automatically back it up to Google Drive. Works as a Chrome extension — no account needed to start.</p>
            <div className="hero-pills">
              <span className="pill">✓ Tab &amp; window recording</span>
              <span className="pill">✓ One-click screenshots</span>
              <span className="pill">✓ 5GB Free Storage</span>
            </div>
          </div>
          <button className="btn-hero" onClick={onSignIn}>
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="G" className="google-icon" />
            Sign in with Google
          </button>
        </section>
      )}

      {/* Stats */}
      <section className="stats-row">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card ${!isAuthenticated ? 'blurred' : ''}`} onClick={() => !isAuthenticated && onSignIn()}>
            <div className="stat-icon">
              {s.icon === 'drive' ? (
                /* Official Google Drive colour logo SVG */
                <svg viewBox="0 0 87.3 78" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
                  <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
                  <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
                  <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
                </svg>
              ) : (
                <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>{s.icon}</span>
              )}
            </div>
            <div className="stat-value">{isAuthenticated ? s.value : '—'}</div>
            <div className="stat-label">{s.label}</div>
            {isAuthenticated && s.sub && <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{s.sub}</div>}
            {!isAuthenticated && <div className="lock-overlay"><span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle' }}>lock</span> Sign in to view</div>}
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
            {['All', 'Videos', 'Screenshots'].map((f) => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Media Grid */}
      <section className="media-grid">
        {!isAuthenticated ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="media-card card-preview" onClick={onSignIn}>
              <div className="media-preview">
                <div className="media-thumb-icon">
                  <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <div className="media-overlay">
                  <div className="overlay-actions">
                    <button className="media-action-btn locked" onClick={onSignIn}>🔒</button>
                  </div>
                </div>
              </div>
              <div className="media-info">
                <div className="media-title" style={{ filter: 'blur(6px)' }}>Capture title here</div>
                <div className="media-meta" style={{ filter: 'blur(4px)' }}>
                  <span>Just now · 0 MB</span>
                  <span className="tag image">image</span>
                </div>
              </div>
            </div>
          ))
        ) : loadingCaptures ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p>Loading your captures...</p>
          </div>
        ) : filteredCaptures.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <p style={{ marginBottom: '6px' }}>No captures yet.</p>
            <p style={{ fontSize: '13px' }}>Use the Chrome extension to record or take a screenshot — it'll show up here automatically.</p>
          </div>
        ) : (
          filteredCaptures.map((item) => (
            <div key={item.id} className="media-card" onClick={(e) => { if (e.target.closest('.media-action-btn')) return; onOpenMedia(item); }}>
              <div className="media-preview">
                {item.storageLocation === 'drive' ? (
                  <div className="media-thumb-icon" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <svg viewBox="0 0 87.3 78" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
                      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
                      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
                      <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
                      <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
                    </svg>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Private on Drive</span>
                  </div>
                ) : item.type === 'image' && item.src ? (
                  <img src={item.src} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} alt={item.title} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : item.type === 'video' && item.src ? (
                  <video src={item.src} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} muted loop onMouseOver={(e) => e.target.play()} onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }} />
                ) : (
                  <div className="media-thumb-icon">
                    <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ opacity: 0.5 }}>
                      <rect x="2" y="2" width="20" height="20" rx="2.18" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                {item.duration && <div className="duration-badge">{item.duration}</div>}
                <div className="media-overlay">
                  <div className="overlay-actions">
                    {item.type === 'video' && (
                      <button className="media-action-btn play-btn" onClick={(e) => { e.stopPropagation(); onOpenMedia(item); }} title="Preview">▶</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="media-info">
                <div className="media-title">{item.title}<span className="file-ext">{item.ext}</span></div>
                <div className="media-meta">
                  <span>{item.date ? new Date(item.date).toLocaleDateString() : 'Just now'} · {item.size}</span>
                  <span className={`tag ${item.type}`}>{item.type}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Connection Guidance Banner */}
      {!isAuthenticated && (
        <div className="cta-banner" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ fontSize: '24px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', height: 'fit-content' }}>
              🛡️
            </div>
            <div>
              <strong style={{ color: '#34d399', fontSize: '15px', display: 'block', marginBottom: '4px' }}>Secure Account Architecture</strong>
              <span style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', display: 'block', maxWidth: '600px' }}>
                For your security, Google isolates authentication between browser extensions and web applications. To enable automatic background syncing and dashboard access, please sign in to both the AntCapture Extension and this Dashboard using the same Google account.
              </span>
            </div>
          </div>
          <button className="btn-primary" onClick={onSignIn} style={{ whiteSpace: 'nowrap', marginTop: '10px' }}>
            Connect Web Dashboard
          </button>
        </div>
      )}
    </>
  );
}
