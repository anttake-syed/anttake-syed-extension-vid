import React from 'react';

const DriveLogoSVG = ({ size = 22 }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
    <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
    <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
  </svg>
);

function StatCard({ icon, value, label, sub, isAuthenticated, onSignIn, isDrive }) {
  return (
    <div
      className={`stat-card ${!isAuthenticated ? 'blurred' : ''}`}
      onClick={() => !isAuthenticated && onSignIn()}
      style={{ cursor: !isAuthenticated ? 'pointer' : 'default' }}
    >
      <div className="stat-icon">
        {isDrive ? <DriveLogoSVG size={28} /> : (
          <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>{icon}</span>
        )}
      </div>
      <div className="stat-value">{isAuthenticated ? value : '—'}</div>
      <div className="stat-label">{label}</div>
      {isAuthenticated && sub && <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{sub}</div>}
      {!isAuthenticated && (
        <div className="lock-overlay">
          <span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle' }}>lock</span> Sign in to view
        </div>
      )}
    </div>
  );
}

function MediaThumb({ item, onOpen }) {
  return (
    <div
      onClick={() => onOpen(item)}
      style={{
        borderRadius: '12px', overflow: 'hidden', background: '#1e293b',
        border: '1px solid #334155', cursor: 'pointer', position: 'relative',
        transition: 'transform 0.15s, box-shadow 0.15s',
        aspectRatio: '16/10',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {item.storageLocation === 'drive' ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <DriveLogoSVG size={28} />
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Private on Drive</span>
        </div>
      ) : item.type === 'image' && item.src ? (
        <img src={item.src} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : item.type === 'video' && item.src ? (
        <video src={item.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#475569' }}>
            {item.type === 'video' ? 'videocam' : 'image'}
          </span>
        </div>
      )}

      {/* Type badge */}
      <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: item.type === 'video' ? '#a5b4fc' : '#6ee7b7' }}>
        {item.type === 'video' ? 'Video' : 'Screenshot'}
      </div>

      {/* Storage badges */}
      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
        {(item.storageLocation === 'local' || item.storageLocation === 'both') && (
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '4px', display: 'flex', alignItems: 'center' }} title="Saved locally">
            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#818cf8' }}>hard_drive</span>
          </div>
        )}
        {(item.storageLocation === 'drive' || item.storageLocation === 'both') && (
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '4px', display: 'flex', alignItems: 'center' }} title="Saved in Google Drive">
            <DriveLogoSVG size={14} />
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '32px', color: 'white', opacity: 0 }}>play_circle</span>
      </div>

      {/* Title */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '20px 10px 8px', fontSize: '12px', color: '#e2e8f0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.title || 'Untitled'}
      </div>
    </div>
  );
}

export default function Dashboard({ isAuthenticated, stats, captures, loadingCaptures, dbStats, onSignIn, onOpenMedia, onGoToLibrary }) {
  const recentCaptures = captures.slice(0, 6);
  const driveUsedPct = dbStats?.driveLimitBytes > 0
    ? Math.min(100, Math.round((dbStats.driveUsageBytes / dbStats.driveLimitBytes) * 100))
    : null;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      {/* ── Welcome Hero ── */}
      {isAuthenticated ? (
        <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.08) 100%)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '16px', padding: '28px 32px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#818cf8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px', textTransform: 'uppercase' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#f8fafc' }}>{greeting} 👋</h2>
            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '14px' }}>
              {captures.length === 0
                ? 'No captures yet — open the extension to start recording.'
                : `You have ${captures.length} capture${captures.length !== 1 ? 's' : ''} in your library.`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="javascript:void(0)" onClick={onGoToLibrary} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>photo_library</span> View Library
            </a>
          </div>
        </div>
      ) : (
        <section className="hero-banner slideIn">
          <div className="hero-text">
            <h2>Record. Screenshot. Sync.</h2>
            <p>Capture anything on your screen and automatically back it up to Google Drive. Works as a Chrome extension — no account needed to start.</p>
            <div className="hero-pills">
              <span className="pill">✓ Tab &amp; window recording</span>
              <span className="pill">✓ One-click screenshots</span>
              <span className="pill">✓ Cloud sync</span>
            </div>
          </div>
          <button className="btn-hero" onClick={onSignIn}>
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="G" className="google-icon" />
            Sign in with Google
          </button>
        </section>
      )}

      {/* ── Stats Row ── */}
      <section className="stats-row">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} isAuthenticated={isAuthenticated} onSignIn={onSignIn} />
        ))}
      </section>

      {/* ── Storage Health Bar (Drive) ── */}
      {isAuthenticated && driveUsedPct !== null && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <DriveLogoSVG size={20} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Google Drive Storage</span>
              <span style={{ color: driveUsedPct > 80 ? '#f87171' : '#94a3b8' }}>{dbStats.driveUsageFormatted} / {dbStats.driveLimitFormatted} ({driveUsedPct}%)</span>
            </div>
            <div style={{ height: '6px', background: '#0f172a', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${driveUsedPct}%`, background: driveUsedPct > 80 ? 'linear-gradient(90deg,#f87171,#ef4444)' : 'linear-gradient(90deg,#4ade80,#22d3ee)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Activity ── */}
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#818cf8' }}>history</span>
          Recent Activity
          <span className="count-badge">{isAuthenticated ? recentCaptures.length : 0}</span>
        </h3>
        {isAuthenticated && captures.length > 6 && (
          <button onClick={onGoToLibrary} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all {captures.length} <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>arrow_forward</span>
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} onClick={onSignIn} style={{ aspectRatio: '16/10', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', filter: 'blur(2px)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#334155' }}>image</span>
            </div>
          ))}
        </div>
      ) : loadingCaptures ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <div className="btn-spinner" style={{ margin: '0 auto 12px', width: '28px', height: '28px', borderTopColor: '#6366f1', borderRightColor: '#6366f1' }} />
          <p>Loading recent captures...</p>
        </div>
      ) : recentCaptures.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '48px 24px', textAlign: 'center', marginBottom: '28px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '52px', color: '#334155', display: 'block', marginBottom: '16px' }}>screenshot_monitor</span>
          <h3 style={{ color: '#64748b', margin: '0 0 8px', fontWeight: 600 }}>No captures yet</h3>
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>Open the AntCapture extension and click "Record Screen" or "Screenshot" to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {recentCaptures.map(item => <MediaThumb key={item.id} item={item} onOpen={onOpenMedia} />)}
        </div>
      )}

      {/* ── Security Guidance (logged out) ── */}
      {!isAuthenticated && (
        <div className="cta-banner" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ fontSize: '24px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', height: 'fit-content' }}>🛡️</div>
            <div>
              <strong style={{ color: '#34d399', fontSize: '15px', display: 'block', marginBottom: '4px' }}>Secure Account Architecture</strong>
              <span style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.5', display: 'block', maxWidth: '600px' }}>
                For your security, Google isolates authentication between browser extensions and web applications. Sign in to both the AntCapture Extension and this Dashboard using the same Google account to enable syncing.
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
