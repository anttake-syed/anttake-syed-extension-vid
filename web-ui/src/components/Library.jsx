import React, { useState, useMemo } from 'react';

const DriveLogoSVG = ({ size = 20 }) => (
  <svg viewBox="0 0 87.3 78" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H.97c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25 29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.4C.4 49.8 0 51.35 0 52.9h27.45z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l5.65 9.5z" fill="#ea4335"/>
    <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.55 0-3.1.45-4.5 1.2z" fill="#00832d"/>
    <path d="M59.85 52.9h27.45c0-1.55-.4-3.1-1.2-4.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25 59.85 52.9z" fill="#2684fc"/>
    <path d="M27.45 52.9H0l13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2L59.85 52.9z" fill="#ffba00"/>
  </svg>
);

function MediaCard({ item, onOpen, viewMode }) {
  const [videoHovered, setVideoHovered] = useState(false);
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onOpen(item)}
        style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
          padding: '12px 16px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#1a2744'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#1e293b'; }}
      >
        {/* Thumbnail */}
        <div style={{ width: '72px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#0f172a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {item.storageLocation === 'drive' ? <DriveLogoSVG size={20} />
            : item.type === 'image' && item.src ? <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : item.type === 'video' && item.src ? <video src={item.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
            : <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#475569' }}>{item.type === 'video' ? 'videocam' : 'image'}</span>}
        </div>

        {/* Info */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.title || 'Untitled'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
            {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
          </div>
        </div>

        {/* Size */}
        <div style={{ fontSize: '12px', color: '#64748b', flexShrink: 0, minWidth: '64px', textAlign: 'right' }}>{item.size || '—'}</div>

        {/* Type badge */}
        <div style={{ flexShrink: 0, display: 'flex', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: item.type === 'video' ? 'rgba(99,102,241,0.15)' : 'rgba(52,211,153,0.15)', color: item.type === 'video' ? '#a5b4fc' : '#6ee7b7' }}>
            {item.type === 'video' ? 'Video' : 'Screenshot'}
          </span>
          {item.type === 'video' && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'rgba(248, 250, 252, 0.1)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)' }}>
              {(item.mimeType || '').includes('mp4') || (item.title || '').toLowerCase().endsWith('.mp4') ? 'MP4' : 'WEBM'}
            </span>
          )}
        </div>

        {/* Storage badge */}
        <div style={{ flexShrink: 0 }}>
          {item.storageLocation === 'drive' && <DriveLogoSVG size={16} />}
          {item.storageLocation === 'local' && <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#6366f1' }}>hard_drive</span>}
          {item.storageLocation === 'both' && <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>BOTH</span>}
        </div>

        <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#475569', flexShrink: 0 }}>chevron_right</span>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={() => onOpen(item)}
      style={{ borderRadius: '12px', overflow: 'hidden', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)'; e.currentTarget.style.borderColor = '#6366f1'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#334155'; }}
    >
      {/* Preview */}
      <div style={{ aspectRatio: '16/10', background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
        {item.storageLocation === 'drive' ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <DriveLogoSVG size={28} />
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Private on Drive</span>
          </div>
        ) : item.type === 'image' && item.src ? (
          <img src={item.src} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : item.type === 'video' && item.src ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}
            onMouseEnter={() => setVideoHovered(true)}
            onMouseLeave={() => setVideoHovered(false)}
          >
            <video src={item.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted
              onMouseOver={e => e.target.play()} onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }} />
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', transition: 'opacity 0.2s',
              opacity: videoHovered ? 0 : 1,
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '22px', color: 'white', marginLeft: '3px' }}>play_arrow</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '36px', color: '#334155' }}>
              {item.type === 'video' ? 'videocam' : 'image'}
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '4px' }}>
          <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600, color: item.type === 'video' ? '#a5b4fc' : '#6ee7b7' }}>
            {item.type === 'video' ? 'Video' : 'Screenshot'}
          </div>
          {item.type === 'video' && (
            <div style={{ background: 'rgba(0,0,0,0.6)', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em' }}>
              {(item.mimeType || '').includes('mp4') || (item.title || '').toLowerCase().endsWith('.mp4') ? 'MP4' : 'WEBM'}
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
      </div>
      {/* Footer */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title || 'Untitled'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'} · {item.size || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Library({ captures, loadingCaptures, onOpenMedia, isAuthenticated, onSignIn }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  const filtered = useMemo(() => {
    let list = [...captures];

    if (typeFilter === 'Videos') {list = list.filter(c => c.type === 'video');}
    else if (typeFilter === 'Screenshots') {list = list.filter(c => c.type === 'image');}

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.title || '').toLowerCase().includes(q));
    }

    if (sort === 'newest') {list.sort((a, b) => new Date(b.date) - new Date(a.date));}
    else if (sort === 'oldest') {list.sort((a, b) => new Date(a.date) - new Date(b.date));}

    return list;
  }, [captures, typeFilter, search, sort]);

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '64px', color: '#334155', marginBottom: '20px' }}>photo_library</span>
        <h2 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>Your Media Library</h2>
        <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '360px', fontSize: '15px' }}>Sign in with Google to access your full capture library — all your recordings and screenshots in one place.</p>
        <button className="btn-primary glow-pulse" onClick={onSignIn} style={{ padding: '12px 28px', fontSize: '15px' }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#475569', pointerEvents: 'none' }}>search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search captures..."
            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#f1f5f9', fontSize: '14px', padding: '9px 12px 9px 38px', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#6366f1'}
            onBlur={e => e.target.style.borderColor = '#334155'}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: 'flex', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
          {['All', 'Videos', 'Screenshots'].map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{ padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'background 0.15s, color 0.15s', background: typeFilter === f ? '#6366f1' : 'transparent', color: typeFilter === f ? 'white' : '#64748b' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', padding: '9px 12px', cursor: 'pointer', outline: 'none' }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
          {[['grid', 'grid_view'], ['list', 'view_list']].map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)} title={mode} style={{ padding: '9px 12px', border: 'none', cursor: 'pointer', background: viewMode === mode ? '#334155' : 'transparent', color: viewMode === mode ? '#f1f5f9' : '#64748b', transition: 'background 0.15s' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '18px', display: 'block' }}>{icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Count bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          {search && ` for "${search}"`}
        </span>
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Grid or List ── */}
      {loadingCaptures ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div className="btn-spinner" style={{ margin: '0 auto 12px', width: '28px', height: '28px', borderTopColor: '#6366f1', borderRightColor: '#6366f1' }} />
          <p>Loading your library...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '52px', color: '#334155', display: 'block', marginBottom: '16px' }}>folder_open</span>
          <p style={{ margin: 0, fontWeight: 600, color: '#475569' }}>No captures found</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {filtered.map(item => <MediaCard key={item.id} item={item} onOpen={onOpenMedia} viewMode="grid" />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(item => <MediaCard key={item.id} item={item} onOpen={onOpenMedia} viewMode="list" />)}
        </div>
      )}
    </>
  );
}
