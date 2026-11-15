import React, { useState, useEffect, useRef } from 'react';
import { SERVER_URL, IS_LOCAL_MODE } from '../../config.js';
import { getFullSrc } from './whiteboardHelpers.js';

export default function WhiteboardLibraryPicker({
  user,
  captures: initialCaptures,
  onSelect,
  onClose,
  initialTab,
}) {
  const [captures, setCaptures] = useState(() => initialCaptures || []);
  const [loading, setLoading]   = useState(() => !initialCaptures || initialCaptures.length === 0);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState(initialTab || 'all'); // 'all' | 'images' | 'videos'
  const fileInputRef            = useRef(null);

  useEffect(() => {
    if (initialCaptures && initialCaptures.length > 0) {
      setCaptures(initialCaptures);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        let token = user?.jwt;
        if (!token) {
          try {
            const raw = localStorage.getItem('antcapture_user') || localStorage.getItem('user');
            if (raw) {
              const parsed = JSON.parse(raw);
              token = parsed?.jwt;
            }
          } catch (_) {}
        }
        if (!token && IS_LOCAL_MODE) {
          token = 'local-mode';
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${SERVER_URL}/captures`, { headers });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const loaded = (data.captures || []).map(c => {
          let src = c.fileUrl || c.src;
          if (src && src.startsWith('/')) {
            src = `${SERVER_URL}${src}`;
          }
          return { ...c, src };
        });
        setCaptures(loaded);
      } catch {
        setCaptures(initialCaptures || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, initialCaptures]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video');
    const objectUrl = URL.createObjectURL(file);
    onSelect(objectUrl, isVideo, file.name);
    onClose();
  };

  const filtered = captures.filter(c => {
    const matchSearch = !search || (c.title || '').toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'all' || (tab === 'images' && c.type !== 'video') || (tab === 'videos' && c.type === 'video');
    return matchSearch && matchTab;
  });
  const imgCount = captures.filter(c => c.type !== 'video').length;
  const vidCount = captures.filter(c => c.type === 'video').length;

  const TAB_STYLE = (active) => ({
    background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
    border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
    color: active ? '#a5b4fc' : '#64748b',
    borderRadius: '8px', padding: '6px 14px', cursor: 'pointer',
    fontSize: '13px', fontWeight: 600, fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s',
  });

  return (
    <div className="wb-overlay" style={{ zIndex: 2000 }} onClick={onClose}>
      <div className="wb-library" onClick={e => e.stopPropagation()}>
        {/* Hidden File Input for Device Upload */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,video/*"
          onChange={handleFileUpload}
        />

        {/* Header */}
        <div className="wb-library-head">
          <div className="wb-library-title">
            <div style={{ width: '44px', height: '44px', flexShrink: 0, borderRadius: '12px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#a5b4fc' }}>photo_library</span>
            </div>
            <div className="min-w-0">
              <h3 style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Import Media</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '3px 0 0' }}>Select from your captures or upload from your computer</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="wb-library-upload-btn"
              title="Upload image or video file from your computer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>upload_file</span>
              Upload from Computer
            </button>

            <button
              onClick={onClose}
              className="wb-library-close"
              aria-label="Close"
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
            </button>
          </div>
        </div>

        {/* Filter + Search bar */}
        <div className="wb-library-filters">
          {/* Tabs */}
          <div className="wb-library-tabs">
            <button style={TAB_STYLE(tab === 'all')} onClick={() => setTab('all')}>All ({captures.length})</button>
            <button style={TAB_STYLE(tab === 'images')} onClick={() => setTab('images')}>
              <span className="material-symbols-rounded" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: '6px' }}>image</span>Images ({imgCount})
            </button>
            <button style={TAB_STYLE(tab === 'videos')} onClick={() => setTab('videos')}>
              <span className="material-symbols-rounded" style={{ fontSize: '15px', verticalAlign: 'middle', marginRight: '6px' }}>movie</span>Videos ({vidCount})
            </button>
          </div>
          {/* Search */}
          <div className="wb-library-search">
            <span className="material-symbols-rounded" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '17px', color: '#64748b' }}>search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '9px', color: '#f1f5f9', fontSize: '13px', padding: '9px 12px 9px 38px', outline: 'none', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#334155'}
            />
          </div>
        </div>

        {/* Grid */}
        <div className="wb-library-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
              <div className="btn-spinner" style={{ margin: '0 auto 16px', width: '32px', height: '32px', borderTopColor: '#6366f1', borderRightColor: '#6366f1' }} />
              <p style={{ fontSize: '15px', fontWeight: 500 }}>Loading your captures…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#334155' }}>photo_library</span>
              </div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 6px' }}>No captures found</p>
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#94a3b8' }}>
                {search ? 'Try adjusting your search terms, or' : 'Upload an image or video directly from your device:'}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(99,102,241,0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif"
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>upload_file</span>
                Choose File from Computer
              </button>
            </div>
          ) : (
            <div className="wb-library-grid">
              {filtered.map(cap => {
                const token = user?.jwt || (() => {
                  try {
                    const raw = localStorage.getItem('antcapture_user') || localStorage.getItem('user');
                    return raw ? JSON.parse(raw)?.jwt : '';
                  } catch (_) { return ''; }
                })();
                const src = getFullSrc(cap.src, token);
                const isVideo = cap.type === 'video';

                return (
                  <div
                    key={cap.id}
                    onClick={() => onSelect(src, isVideo, cap.title)}
                    style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e293b', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', background: '#0f172a', display: 'flex', flexDirection: 'column' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ aspectRatio: '16/10', background: '#070b14', position: 'relative', overflow: 'hidden' }}>
                      {isVideo ? (
                        <>
                          <video src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted onMouseOver={e => e.target.play()} onMouseOut={e => { e.target.pause(); e.target.currentTime = 0; }} />
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                              <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'white', marginLeft: '2px' }}>play_arrow</span>
                            </div>
                          </div>
                        </>
                      ) : src ? (
                        <img src={src} alt={cap.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#334155' }}>image</span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, color: isVideo ? '#a5b4fc' : '#6ee7b7', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {isVideo ? 'Video' : 'Screenshot'}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', borderTop: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                        {cap.title || 'Untitled'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span>{new Date(cap.date || cap.createdAt || Date.now()).toLocaleDateString()}</span>
                        <span>{cap.size ? (typeof cap.size === 'number' ? `${Math.round(cap.size / 1024)} KB` : cap.size) : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
