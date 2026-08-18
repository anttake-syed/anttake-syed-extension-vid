import React, { useState } from 'react';

// Update this once the extension is approved on the Chrome Web Store
const CHROME_STORE_URL = '#';

function GetExtensionBanner() {
  const steps = [
    { n: '1', text: 'Click the button below to go to the Chrome Web Store' },
    { n: '2', text: 'Search "AntCapture" and open the extension page' },
    { n: '3', text: 'Click "Add to Chrome" then confirm — done!' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(168,85,247,0.07) 100%)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: '20px',
      padding: '32px',
      marginBottom: '24px',
      display: 'flex',
      gap: '32px',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {/* Left: icon + text */}
      <div style={{ flex: 1, minWidth: '260px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#818cf8' }}>extension</span>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Step 1 to get started</div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f1f5f9' }}>Get the AntCapture Extension</h3>
          </div>
        </div>

        <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
          All recording and screenshots happen through the Chrome extension. Install it in seconds — it&apos;s free.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {steps.map(s => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px', fontWeight: 700, color: '#a5b4fc' }}>
                {s.n}
              </div>
              <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', paddingTop: '2px' }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: CTA */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', borderRadius: '12px', padding: '14px 24px',
            fontWeight: 700, fontSize: '15px', textDecoration: 'none',
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            transition: 'opacity 0.15s, transform 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <circle cx="24" cy="24" r="10" fill="white"/>
            <path d="M24 14h18.7A24 24 0 0 0 5.3 14z" fill="#ef4444"/>
            <path d="M14 24A10 10 0 0 1 24 14H5.3A24 24 0 0 0 14 40.4z" fill="#34a853"/>
            <path d="M24 34a10 10 0 0 1-10-10L5.3 40.4A24 24 0 0 0 42.7 14H24z" fill="#fbbc05"/>
            <circle cx="24" cy="24" r="7" fill="#4285f4"/>
          </svg>
          Add to Chrome
        </a>
        <span style={{ fontSize: '11px', color: '#475569', textAlign: 'center' }}>
          Free · Chrome Web Store
        </span>
      </div>
    </div>
  );
}

const DriveLogoSVG = ({ size = 20 }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
    <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
    <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
  </svg>
);

const ThumbnailVideo = ({ item }) => {
  const [videoHovered, setVideoHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0a0f1d' }}
      onMouseEnter={() => setVideoHovered(true)}
      onMouseLeave={() => setVideoHovered(false)}
    >
      {/* Skeleton / Loading State */}
      {!isLoaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.5) 0%, rgba(15,23,42,0.8) 100%)',
          animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '28px', color: 'rgba(148,163,184,0.4)' }}>
            movie
          </span>
        </div>
      )}

      {/* Video Element */}
      <video
        src={item.src}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          opacity: isLoaded ? 1 : 0, transition: 'opacity 0.3s ease'
        }}
        muted
        onLoadedData={() => setIsLoaded(true)}
        onMouseOver={e => { if (isLoaded) e.target.play().catch(()=>{}); }}
        onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }}
      />

      {/* Play Icon Overlay */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', transition: 'opacity 0.2s', zIndex: 2,
        opacity: (!isLoaded || videoHovered) ? 0 : 1,
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '22px', color: 'white', marginLeft: '3px' }}>
            play_arrow
          </span>
        </div>
      </div>
    </div>
  );
};

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
  const [videoHovered, setVideoHovered] = React.useState(false);
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
        <ThumbnailVideo item={item} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#475569' }}>
            {item.type === 'video' ? 'videocam' : 'image'}
          </span>
        </div>
      )}

      {/* Type badge */}
      <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
        <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: item.type === 'video' ? '#a5b4fc' : '#6ee7b7' }}>
          {item.type === 'video' ? 'Video' : 'Screenshot'}
        </div>
        {item.type === 'video' && (
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em' }}>
            {(item.mimeType || '').includes('mp4') || (item.title || '').toLowerCase().endsWith('.mp4') ? 'MP4' : 'WEBM'}
          </div>
        )}
        {item.type === 'video' && (
          <div title={(item.hasAudio === false) ? 'No Audio (Muted)' : 'Contains Audio'} style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '1px 6px', display: 'flex', alignItems: 'center', border: `1px solid ${(item.hasAudio === false) ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)'}` }}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'white' }}>
              {(item.hasAudio === false) ? 'volume_off' : 'volume_up'}
            </span>
          </div>
        )}
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

export default function Dashboard({ isAuthenticated, isLocalMode, stats, captures, loadingCaptures, dbStats, onSignIn, onOpenMedia, onGoToLibrary }) {
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
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {greeting} <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#f59e0b' }}>waving_hand</span>
            </h2>
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
        <>
          <section className="hero-banner slideIn">
            <div className="hero-text">
              <h2>Record. Screenshot. Sync.</h2>
              <p>
                {isLocalMode
                  ? 'Capture anything on your screen and save it to your local self-hosted dashboard. Runs entirely on your own machine.'
                  : 'Capture anything on your screen and automatically back it up to Google Drive. Works as a Chrome extension — no account needed to start.'}
              </p>
              <div className="hero-pills">
                <span className="pill">✓ Tab &amp; window recording</span>
                <span className="pill">✓ One-click screenshots</span>
                {isLocalMode
                  ? <span className="pill">✓ SQLite local storage</span>
                  : <span className="pill">✓ Cloud sync</span>}
              </div>
            </div>
            <button className="btn-hero" onClick={onSignIn}>
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="G" className="google-icon" />
              Sign in with Google
            </button>
          </section>
          <GetExtensionBanner />
        </>
      )}

      {/* ── Stats Row ── */}
      <section className="stats-row">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} isAuthenticated={isAuthenticated} onSignIn={onSignIn} />
        ))}
      </section>

      {/* ── Storage Health Bar (Drive) — cloud mode only ── */}
      {isAuthenticated && !isLocalMode && driveUsedPct !== null && dbStats?.storageServer !== 'local' && (
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

      {/* ── Storage Health Bar (Local) — local mode only ── */}
      {isAuthenticated && isLocalMode && dbStats && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#818cf8' }}>hard_drive</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>Local Database Storage</span>
              <span style={{ color: '#818cf8' }}>{dbStats.dbSizeFormatted} Used</span>
            </div>
            <div style={{ height: '6px', background: '#0f172a', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.max(2, (dbStats.dbSizeBytes / 1073741824) * 100))}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '999px', transition: 'width 0.6s ease' }} />
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
          <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>Open the AntCapture extension and click &quot;Record Screen&quot; or &quot;Screenshot&quot; to get started.</p>
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
