import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../config.js';

// ── Helpers ─────────────────────────────────────────────────
function generateDefaultName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `Board ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const TOOLS = [
  { id: 'select',  icon: 'near_me',       label: 'Select'  },
  { id: 'pen',     icon: 'draw',          label: 'Pen'     },
  { id: 'text',    icon: 'text_fields',   label: 'Text'    },
  { id: 'rect',    icon: 'crop_square',   label: 'Rect'    },
  { id: 'circle',  icon: 'circle',        label: 'Circle'  },
  { id: 'arrow',   icon: 'arrow_forward', label: 'Arrow'   },
  { id: 'eraser',  icon: 'ink_eraser',    label: 'Eraser'  },
  { id: 'image',   icon: 'image',         label: 'Image'   },
  { id: 'video',   icon: 'movie',         label: 'Video'   },
];

const COLORS = ['#f8fafc','#f87171','#fb923c','#facc15','#4ade80','#60a5fa','#a78bfa','#f472b6','#94a3b8'];
const SIZES  = [2, 4, 8, 14, 20];

// ── Library Image Picker Modal ───────────────────────────────
const getFullSrc = (src, jwt) => {
  if (!src) return '';
  const url = src.startsWith('/') ? `${SERVER_URL}${src}` : src;
  if (!jwt) return url;
  return url.includes('?') ? `${url}&token=${jwt}` : `${url}?token=${jwt}`;
};

function LibraryPicker({ user, onSelect, onClose, initialTab }) {
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState(initialTab || 'all'); // 'all' | 'images' | 'videos'

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${SERVER_URL}/captures`, {
          headers: { Authorization: `Bearer ${user?.jwt}` },
        });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        setCaptures(data.captures || []);
      } catch { setCaptures([]); }
      finally  { setLoading(false); }
    }
    load();
  }, [user]);

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
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(2,6,23,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }} onClick={onClose}>
      <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'24px', width:'1060px', maxWidth:'100%', height:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.6)', overflow:'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding:'22px 28px 18px', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#080e1c', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.2))', border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize:'22px', color:'#a5b4fc' }}>photo_library</span>
            </div>
            <div>
              <h3 style={{ color:'#f8fafc', fontSize:'18px', fontWeight:700, margin:0, letterSpacing:'-0.02em' }}>Import from Library</h3>
              <p style={{ color:'#94a3b8', fontSize:'13px', margin:'3px 0 0' }}>Click any capture to add it to your board</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.05)', border:'none', color:'#94a3b8', cursor:'pointer', width:'36px', height:'36px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.color='#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8'; }}>
            <span className="material-symbols-rounded" style={{ fontSize:'20px' }}>close</span>
          </button>
        </div>

        {/* Filter + Search bar */}
        <div style={{ padding:'14px 28px', borderBottom:'1px solid #1e293b', background:'#080e1c', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap', flexShrink:0 }}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:'6px' }}>
            <button style={TAB_STYLE(tab === 'all')} onClick={() => setTab('all')}>All ({captures.length})</button>
            <button style={TAB_STYLE(tab === 'images')} onClick={() => setTab('images')}>
              <span style={{ marginRight:'6px' }}>🖼️</span>Images ({imgCount})
            </button>
            <button style={TAB_STYLE(tab === 'videos')} onClick={() => setTab('videos')}>
              <span style={{ marginRight:'6px' }}>🎬</span>Videos ({vidCount})
            </button>
          </div>
          {/* Search */}
          <div style={{ position:'relative', flex:'1', minWidth:'160px', maxWidth:'320px', marginLeft:'auto' }}>
            <span className="material-symbols-rounded" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', fontSize:'17px', color:'#64748b' }}>search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              autoFocus
              style={{ width:'100%', background:'#1e293b', border:'1px solid #334155', borderRadius:'9px', color:'#f1f5f9', fontSize:'13px', padding:'9px 12px 9px 38px', outline:'none', fontFamily:"'Outfit', sans-serif", boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#6366f1'}
              onBlur={e => e.target.style.borderColor='#334155'}
            />
          </div>
        </div>

        {/* Grid */}
        <div style={{ padding:'24px 32px', overflowY:'auto', flex:1, background:'#020617' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'80px 0', color:'#64748b' }}>
              <div className="btn-spinner" style={{ margin:'0 auto 16px', width:'32px', height:'32px', borderTopColor:'#6366f1', borderRightColor:'#6366f1' }} />
              <p style={{ fontSize:'15px', fontWeight:500 }}>Loading your captures…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 0', color:'#475569' }}>
              <div style={{ width:'80px', height:'80px', borderRadius:'24px', background:'rgba(255,255,255,0.02)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <span className="material-symbols-rounded" style={{ fontSize:'40px', color:'#334155' }}>search_off</span>
              </div>
              <p style={{ fontSize:'16px', fontWeight:600, color:'#e2e8f0', margin:'0 0 6px' }}>No captures found</p>
              <p style={{ margin:0, fontSize:'14px' }}>Try adjusting your search terms.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'20px' }}>
              {filtered.map(cap => {
                const src = getFullSrc(cap.src, user?.jwt);
                const isVideo = cap.type === 'video';
                
                return (
                  <div
                    key={cap.id}
                    onClick={() => onSelect(src, isVideo, cap.title)}
                    style={{ borderRadius:'16px', overflow:'hidden', border:'1px solid #1e293b', cursor:'pointer', transition:'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', background:'#0f172a', display:'flex', flexDirection:'column' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e293b'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ aspectRatio:'16/10', background:'#070b14', position:'relative', overflow:'hidden' }}>
                      {isVideo ? (
                        <>
                          <video src={src} style={{ width:'100%', height:'100%', objectFit:'cover' }} muted onMouseOver={e => e.target.play()} onMouseOut={e => { e.target.pause(); e.target.currentTime=0; }} />
                          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                            <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                              <span className="material-symbols-rounded" style={{ fontSize:'20px', color:'white', marginLeft:'2px' }}>play_arrow</span>
                            </div>
                          </div>
                        </>
                      ) : src ? (
                        <img src={src} alt={cap.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      ) : (
                        <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <span className="material-symbols-rounded" style={{ fontSize:'32px', color:'#334155' }}>image</span>
                        </div>
                      )}
                      
                      {/* Type Badge */}
                      <div style={{ position:'absolute', top:'10px', left:'10px', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(4px)', borderRadius:'8px', padding:'3px 10px', fontSize:'11px', fontWeight:700, color: isVideo ? '#a5b4fc' : '#6ee7b7', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {isVideo ? 'Video' : 'Screenshot'}
                      </div>
                    </div>
                    
                    <div style={{ padding:'12px 14px', borderTop:'1px solid #1e293b' }}>
                      <div style={{ fontSize:'14px', color:'#f8fafc', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'4px' }}>
                        {cap.title || 'Untitled'}
                      </div>
                      <div style={{ fontSize:'12px', color:'#64748b', display:'flex', justifyContent:'space-between' }}>
                        <span>{new Date(cap.date).toLocaleDateString()}</span>
                        <span>{cap.size || ''}</span>
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

// ── Main WhiteboardEditor ────────────────────────────────────
export default function WhiteboardEditor({ board, onClose, user }) {
  const [boardName, setBoardName]         = useState(board?.name || generateDefaultName());
  const [editingName, setEditingName]     = useState(false);
  const [nameDraft, setNameDraft]         = useState(boardName);
  const [tool, setTool]                   = useState('select');
  const [color, setColor]                 = useState('#f8fafc');
  const [strokeSize, setStrokeSize]       = useState(4);
  const [showLibrary, setShowLibrary]     = useState('none'); // 'none', 'images', 'videos'
  const [elements, setElements]           = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [isSaved, setIsSaved]             = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [zoom, setZoom]                   = useState(1);
  const [boardStateItemId, setBoardStateItemId] = useState(null);
  const [contextMenu, setContextMenu]     = useState(null); // {x,y,elIdx}

  const canvasRef      = useRef(null);
  const drawing        = useRef(false);
  const currentPath    = useRef([]);
  const liveShape      = useRef(null); // {startPt, endPt} for live shape preview
  const dragRef        = useRef(null);
  const nameInputRef   = useRef(null);
  const boardThumbItemId = useRef(null);
  const needsCommitRef = useRef(false);
  
  const historyRef = useRef([[]]);
  const historyStepRef = useRef(0);

  const commitToHistory = (newElements) => {
    const nextStep = historyStepRef.current + 1;
    const newHistory = historyRef.current.slice(0, nextStep);
    newHistory.push(newElements);
    historyRef.current = newHistory;
    historyStepRef.current = nextStep;
    setHasUnsavedChanges(true);
  };

  useEffect(() => {
    if (needsCommitRef.current) {
      commitToHistory(elements);
      needsCommitRef.current = false;
    }
  }, [elements]);

  useEffect(() => {
    if (board?.id && boardName) {
      const slug = boardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
      const targetUrl = `/whiteboard/${board.id}/${slug}`;
      const currentPath = window.location.pathname;
      
      if (currentPath !== targetUrl) {
        if (currentPath.startsWith(`/whiteboard/${board.id}`)) {
          window.history.replaceState(null, '', targetUrl);
        } else {
          window.history.pushState(null, '', targetUrl);
        }
      }
    }
  }, [board?.id, boardName]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes on your whiteboard. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Canvas draw ──────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((el, idx) => {
      ctx.save();
      if (el.type === 'path') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        el.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.strokeRect(el.x, el.y, el.w, el.h);
      } else if (el.type === 'circle') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.beginPath();
        ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w/2), Math.abs(el.h/2), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'arrow') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth   = el.size;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
        // arrowhead
        const angle = Math.atan2(el.y2 - el.y, el.x2 - el.x);
        const hw = 10 + el.size;
        ctx.beginPath();
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - hw * Math.cos(angle - Math.PI/6), el.y2 - hw * Math.sin(angle - Math.PI/6));
        ctx.lineTo(el.x2 - hw * Math.cos(angle + Math.PI/6), el.y2 - hw * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = el.color;
        ctx.fill();
      } else if (el.type === 'text') {
        ctx.fillStyle  = el.color;
        ctx.font       = `${el.fontSize}px 'Outfit', sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
      } else if (el.type === 'image' && el.img) {
        ctx.drawImage(el.img, el.x, el.y, el.w, el.h);
        
        // Draw title
        if (el.title) {
          ctx.font = "14px 'Outfit', sans-serif";
          const tw = ctx.measureText(el.title).width;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(el.x, el.y - 24, tw + 12, 24);
          ctx.fillStyle = "white";
          ctx.fillText(el.title, el.x + 6, el.y - 8);
        }

        // Draw play button if paused video
        if (el.isVideo && !el.isPlaying) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.beginPath();
          ctx.arc(el.x + el.w/2, el.y + el.h/2, 24, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.moveTo(el.x + el.w/2 - 8, el.y + el.h/2 - 10);
          ctx.lineTo(el.x + el.w/2 + 12, el.y + el.h/2);
          ctx.lineTo(el.x + el.w/2 - 8, el.y + el.h/2 + 10);
          ctx.fill();
        }

        if (selectedId === idx) {
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth   = 2;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(el.x - 2, el.y - 2, el.w + 4, el.h + 4);
          ctx.setLineDash([]);
          // Resize handle
          ctx.fillStyle = '#6366f1';
          ctx.fillRect(el.x + el.w - 4, el.y + el.h - 4, 8, 8);
        }
      }
      ctx.restore();
    });

    // live path (pen/eraser)
    if (drawing.current && currentPath.current.length > 1 && (tool === 'pen' || tool === 'eraser')) {
      ctx.save();
      ctx.strokeStyle = tool === 'eraser' ? '#020617' : color;
      ctx.lineWidth   = tool === 'eraser' ? strokeSize * 5 : strokeSize;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      currentPath.current.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.restore();
    }

    // live shape preview (rect/circle/arrow)
    if (drawing.current && liveShape.current) {
      const { startPt: s, endPt: ep, tool: lt } = liveShape.current;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = strokeSize;
      ctx.lineCap     = 'round';
      ctx.setLineDash([6, 4]);
      if (lt === 'rect') {
        ctx.strokeRect(s.x, s.y, ep.x - s.x, ep.y - s.y);
      } else if (lt === 'circle') {
        const cx = (s.x + ep.x) / 2, cy = (s.y + ep.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs((ep.x - s.x) / 2), Math.abs((ep.y - s.y) / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (lt === 'arrow') {
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(ep.x, ep.y); ctx.stroke();
        const angle = Math.atan2(ep.y - s.y, ep.x - s.x);
        const hw = 10 + strokeSize;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ep.x, ep.y);
        ctx.lineTo(ep.x - hw * Math.cos(angle - Math.PI/6), ep.y - hw * Math.sin(angle - Math.PI/6));
        ctx.lineTo(ep.x - hw * Math.cos(angle + Math.PI/6), ep.y - hw * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
      ctx.restore();
    }
  }, [elements, color, strokeSize, tool, selectedId]);

  useEffect(() => { redraw(); }, [redraw]);

  // Video animation loop
  useEffect(() => {
    let frameId;
    const loop = () => {
      if (elements.some(el => el.isVideo && el.isPlaying)) redraw();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [elements, redraw]);

  // Load board state on mount
  useEffect(() => {
    async function loadBoardState() {
      try {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}`, {
          headers: { Authorization: `Bearer ${user?.jwt}` },
        });
        const data = await res.json();
        
        if (data.board?.name) {
          setBoardName(data.board.name);
          setNameDraft(data.board.name);
        }
        
        const items = data.board?.items || [];

        const stateItem = items.find(i => i.type === 'board_state');
        if (stateItem?.content) {
          setBoardStateItemId(stateItem.id);
          const state = JSON.parse(stateItem.content);
          if (state.elements) {
            const restored = await Promise.all(
              state.elements.map(el => {
                if (el.type === 'image' && el.src) {
                  return new Promise(resolve => {
                    if (el.isVideo) {
                      const video = document.createElement('video');
                      video.crossOrigin = 'anonymous';
                      video.muted = true;
                      video.loop = true;
                      video.src = el.src;
                      video.onloadeddata = () => {
                        video.currentTime = 0.5;
                      };
                      video.onseeked = () => {
                        resolve({ ...el, img: video, isPlaying: false });
                      };
                      // Fallback just in case seek fails or video is too short
                      setTimeout(() => resolve({ ...el, img: video, isPlaying: false }), 1500);
                      video.onerror = () => resolve(el);
                    } else {
                      const img = new Image();
                      img.crossOrigin = 'anonymous';
                      img.onload = () => resolve({ ...el, img });
                      img.onerror = () => resolve(el);
                      img.src = el.src;
                    }
                  });
                }
                return Promise.resolve(el);
              })
            );
            setElements(restored);
            historyRef.current = [restored];
            historyStepRef.current = 0;
          }
        }
      } catch (err) {
        console.error('Failed to load board state', err);
      }
    }
    if (board?.id && user?.jwt) loadBoardState();
  }, [board?.id, user?.jwt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width  = rect.width;
        canvas.height = rect.height;
        redraw();
      }
    };
    
    // ResizeObserver ensures we get the size correctly even if flex layout is delayed
    const obs = new ResizeObserver(resize);
    obs.observe(canvas.parentElement);
    
    return () => obs.disconnect();
  }, [redraw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Right-click context menu
  const onContextMenu = (e) => {
    e.preventDefault();
    const pos = getPos(e);
    let hit = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === 'image') {
        if (pos.x >= el.x && pos.x <= el.x + el.w && pos.y >= el.y && pos.y <= el.y + el.h) { hit = i; break; }
      }
    }
    if (hit !== null) setContextMenu({ x: e.clientX, y: e.clientY, elIdx: hit });
  };

  const ctxBringFront = () => {
    if (contextMenu === null) return;
    const next = [...elements];
    const [el] = next.splice(contextMenu.elIdx, 1);
    next.push(el);
    setElements(next); commitToHistory(next); setContextMenu(null);
  };
  const ctxSendBack = () => {
    if (contextMenu === null) return;
    const next = [...elements];
    const [el] = next.splice(contextMenu.elIdx, 1);
    next.unshift(el);
    setElements(next); commitToHistory(next); setContextMenu(null);
  };
  const ctxDelete = () => {
    if (contextMenu === null) return;
    const next = elements.filter((_, i) => i !== contextMenu.elIdx);
    setElements(next); commitToHistory(next); setSelectedId(null); setContextMenu(null);
  };

  const onMouseDown = (e) => {
    setContextMenu(null);
    if (e.button !== 0) return;
    const pos = getPos(e);

    if (tool === 'select') {
      let hit = null;
      let hitResize = false;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (el.type === 'image') {
          if (selectedId === i) {
            const hx = el.x + el.w, hy = el.y + el.h;
            if (pos.x >= hx - 8 && pos.x <= hx + 8 && pos.y >= hy - 8 && pos.y <= hy + 8) {
              hit = i; hitResize = true; break;
            }
          }
          if (pos.x >= el.x && pos.x <= el.x + el.w && pos.y >= el.y && pos.y <= el.y + el.h) {
            if (el.isVideo) {
              const cx = el.x + el.w/2, cy = el.y + el.h/2;
              if (Math.hypot(pos.x - cx, pos.y - cy) < 24) {
                const next = [...elements];
                next[i].isPlaying = !next[i].isPlaying;
                if (next[i].isPlaying) next[i].img.play(); else next[i].img.pause();
                setElements(next);
                return; // handled play toggle
              }
            }
            hit = i; break;
          }
        }
        else if (el.type === 'text') {
          if (pos.x >= el.x && pos.x <= el.x + 200 && pos.y >= el.y - 20 && pos.y <= el.y + 5) { hit = i; break; }
        }
        else if (el.type === 'rect') {
          if (pos.x >= el.x && pos.x <= el.x + el.w && pos.y >= el.y && pos.y <= el.y + el.h) { hit = i; break; }
        }
        else if (el.type === 'circle') {
          const cx = el.x + el.w/2, cy = el.y + el.h/2;
          const rx = Math.abs(el.w/2), ry = Math.abs(el.h/2);
          if (pos.x >= cx - rx && pos.x <= cx + rx && pos.y >= cy - ry && pos.y <= cy + ry) { hit = i; break; }
        }
        else if (el.type === 'arrow') {
          const minX = Math.min(el.x, el.x2), maxX = Math.max(el.x, el.x2);
          const minY = Math.min(el.y, el.y2), maxY = Math.max(el.y, el.y2);
          if (pos.x >= minX - 10 && pos.x <= maxX + 10 && pos.y >= minY - 10 && pos.y <= maxY + 10) { hit = i; break; }
        }
        else if (el.type === 'path') {
          let pathHit = false;
          for(let p of el.points) {
             if(Math.hypot(p.x - pos.x, p.y - pos.y) < el.size + 5) { pathHit = true; break; }
          }
          if (pathHit) { hit = i; break; }
        }
      }
      setSelectedId(hit);
      if (hit !== null) {
        dragRef.current = { 
          idx: hit, isResize: hitResize,
          startX: pos.x, startY: pos.y, 
          origX: elements[hit].x, origY: elements[hit].y,
          origW: elements[hit].w, origH: elements[hit].h,
          origX2: elements[hit].x2, origY2: elements[hit].y2,
          origPoints: elements[hit].points ? [...elements[hit].points] : null
        };
      }
      return;
    }

    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const next = [...elements, { type:'text', text, x: pos.x, y: pos.y, color, fontSize: 20 + strokeSize * 2 }];
        setElements(next); commitToHistory(next);
      }
      return;
    }

    drawing.current = true;
    currentPath.current = [pos];
    if (['rect','circle','arrow'].includes(tool)) liveShape.current = { startPt: pos, endPt: pos, tool };
  };

  const onMouseMove = (e) => {
    if (tool === 'select' && dragRef.current) {
      const pos = getPos(e);
      const { idx, isResize, startX, startY, origX, origY, origW, origH, origX2, origY2, origPoints } = dragRef.current;
      const dx = pos.x - startX, dy = pos.y - startY;
      setElements(prev => prev.map((el, i) => {
        if (i !== idx) return el;
        if (isResize && el.type === 'image') {
          const ratio = origW / origH;
          const newW = Math.max(20, origW + dx);
          const newH = newW / ratio;
          return { ...el, w: newW, h: newH };
        } else {
          if (el.type === 'path') {
            return { ...el, points: origPoints.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          } else if (el.type === 'arrow') {
            return { ...el, x: origX + dx, y: origY + dy, x2: origX2 + dx, y2: origY2 + dy };
          } else {
            return { ...el, x: origX + dx, y: origY + dy };
          }
        }
      }));
      return;
    }
    if (!drawing.current) return;
    const pos = getPos(e);
    currentPath.current = [...currentPath.current, pos];
    if (liveShape.current) liveShape.current = { ...liveShape.current, endPt: pos };
    redraw();
  };

  const onMouseUp = (e) => {
    if (dragRef.current) { 
      dragRef.current = null; 
      needsCommitRef.current = true;
      setElements(prev => prev);
    }
    if (!drawing.current) return;
    drawing.current = false;
    const pts = currentPath.current;
    liveShape.current = null;
    if (pts.length < 2) { currentPath.current = []; redraw(); return; }

    const startPt = pts[0];
    const endPt   = pts[pts.length - 1];
    const minDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
    if (minDist < 3) { currentPath.current = []; redraw(); return; }

    let newEl = null;
    if (tool === 'pen' || tool === 'eraser') {
      newEl = { type:'path', points: pts, color: tool === 'eraser' ? '#020617' : color, size: tool === 'eraser' ? strokeSize * 5 : strokeSize };
    } else if (tool === 'rect') {
      newEl = { type:'rect', x:startPt.x, y:startPt.y, w:endPt.x-startPt.x, h:endPt.y-startPt.y, color, size:strokeSize };
    } else if (tool === 'circle') {
      newEl = { type:'circle', x:startPt.x, y:startPt.y, w:endPt.x-startPt.x, h:endPt.y-startPt.y, color, size:strokeSize };
    } else if (tool === 'arrow') {
      newEl = { type:'arrow', x:startPt.x, y:startPt.y, x2:endPt.x, y2:endPt.y, color, size:strokeSize };
    }
    if (newEl) { const next = [...elements, newEl]; setElements(next); commitToHistory(next); }
    currentPath.current = [];
    redraw();
  };

  const handleImageInsert = (src, isVideo, title) => {
    setShowLibrary('none');
    if (!src) return;

    if (isVideo) {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.loop = true;
      video.src = src;
      
      video.onloadeddata = () => {
        video.currentTime = 0.5;
      };
      
      video.onseeked = () => {
        const maxW = 480, maxH = 360;
        const ratio = Math.min(1, Math.min(maxW / video.videoWidth, maxH / video.videoHeight));
        const next = [...elements, { type:'image', img: video, isVideo: true, title: title || 'Video', isPlaying: false, src, x:60, y:60, w:video.videoWidth * ratio, h:video.videoHeight * ratio }];
        setElements(next);
        commitToHistory(next);
      };
      
      video.onerror = () => alert("Could not load video for preview.");
      video.load();
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const maxW = 480, maxH = 360;
        const ratio = Math.min(1, Math.min(maxW / img.width, maxH / img.height));
        const next = [...elements, { type:'image', img, title: title || 'Image', src, x:60, y:60, w:img.width * ratio, h:img.height * ratio }];
        setElements(next);
        commitToHistory(next);
      };
      img.onerror = () => alert("Could not load image.");
      img.src = src;
    }
  };

  const handleToolClick = (t) => {
    if (t === 'image') { setShowLibrary('images'); return; }
    if (t === 'video') { setShowLibrary('videos'); return; }
    setTool(t);
    setSelectedId(null);
  };

  const handleUndo = () => {
    if (historyStepRef.current > 0) {
      historyStepRef.current -= 1;
      setElements(historyRef.current[historyStepRef.current]);
      setHasUnsavedChanges(true);
    }
  };
  
  const handleRedo = () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current += 1;
      setElements(historyRef.current[historyStepRef.current]);
      setHasUnsavedChanges(true);
    }
  };

  const handleClear = () => { 
    if (window.confirm('Clear the whiteboard?')) { 
      setElements([]); 
      setSelectedId(null); 
      commitToHistory([]);
    } 
  };

  const handleNameCommit = () => {
    const trimmed = nameDraft.trim() || generateDefaultName();
    setBoardName(trimmed);
    setEditingName(false);
    setIsSaved(false);
    
    // Save new name to server
    fetch(`${SERVER_URL}/boards/${board.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
      body: JSON.stringify({ name: trimmed }),
    }).catch(console.error);
  };

  // Generate a tiny fixed-size thumbnail (320×180 JPEG)
  const generateThumbnail = () => {
    try {
      const src = canvasRef.current;
      if (!src) return null;
      // If width or height is 0, we can't draw, but it shouldn't be 0 if mounted correctly.
      if (src.width === 0 || src.height === 0) {
        console.warn('Canvas width or height is 0, cannot generate thumbnail');
        return null;
      }
      const THUMB_W = 320, THUMB_H = 180;
      const tc = document.createElement('canvas');
      tc.width = THUMB_W; tc.height = THUMB_H;
      const ctx = tc.getContext('2d');
      ctx.fillStyle = '#0a0f1c';
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);
      // letterbox-fit the drawing
      const scale = Math.min(THUMB_W / src.width, THUMB_H / src.height);
      const dw = src.width * scale, dh = src.height * scale;
      ctx.drawImage(src, (THUMB_W - dw) / 2, (THUMB_H - dh) / 2, dw, dh);
      return tc.toDataURL('image/jpeg', 0.45);
    } catch (e) {
      console.error('Failed to generate thumbnail (possibly CORS or tainted canvas):', e);
      return null;
    }
  };

  const handleSave = async () => {
    setIsSaved(true);
    const thumbnail = generateThumbnail();
    console.log('[WhiteboardEditor] Generated thumbnail:', thumbnail ? `${thumbnail.substring(0, 40)}... (${thumbnail.length} bytes)` : 'NULL');

    const elementsToSave = elements.map(el => {
      const { img, ...rest } = (el.type === 'image' ? el : el);
      return el.type === 'image' ? rest : el;
    });

    try {
      // ── 1. Save elements (board_state) ──
      const stateContent = JSON.stringify({ elements: elementsToSave });
      if (boardStateItemId) {
        await fetch(`${SERVER_URL}/boards/${board.id}/items/${boardStateItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ content: stateContent }),
        });
      } else {
        const res = await fetch(`${SERVER_URL}/boards/${board.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ type: 'board_state', content: stateContent }),
        });
        const d = await res.json();
        if (d.item) setBoardStateItemId(d.item.id);
      }

      // ── 2. Save thumbnail on the board directly ──
      if (thumbnail) {
        console.log(`[WhiteboardEditor] Sending PATCH to /boards/${board.id} with thumbnail`);
        const resThumb = await fetch(`${SERVER_URL}/boards/${board.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.jwt}` },
          body: JSON.stringify({ thumbnail }),
        });
        if (!resThumb.ok) {
          console.error('[WhiteboardEditor] Failed to save thumbnail on server:', await resThumb.text());
        }
      }
    } catch (err) {
      console.error('Save failed', err);
    }
    setHasUnsavedChanges(false);
    setTimeout(() => setIsSaved(false), 2000);
  };
  
  const handleClose = async () => {
    if (hasUnsavedChanges) {
      setShowExitModal(true);
    } else {
      onClose();
    }
  };

  const getCursor = () => {
    if (tool === 'select') return 'default';
    if (tool === 'eraser') return 'cell';
    if (tool === 'text')   return 'text';
    return 'crosshair';
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'#020617', display:'flex', flexDirection:'column', fontFamily:"'Outfit', sans-serif" }}>

      {/* ── Top Bar ── */}
      <div style={{ height:'56px', background:'#0f172a', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', gap:'12px', flexShrink:0 }}>
        {/* Left */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={handleClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', padding:'6px', borderRadius:'8px', transition:'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='#1e293b'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <span className="material-symbols-rounded" style={{ fontSize:'20px' }}>arrow_back</span>
          </button>

          {/* Editable name */}
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={handleNameCommit}
              onKeyDown={e => { if (e.key === 'Enter') handleNameCommit(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus
              style={{ background:'#1e293b', border:'1px solid #6366f1', borderRadius:'8px', color:'#f8fafc', padding:'5px 10px', fontSize:'14px', fontWeight:600, fontFamily:"'Outfit', sans-serif", outline:'none', minWidth:'200px' }}
            />
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', group:true }}
              onClick={() => { setNameDraft(boardName); setEditingName(true); }}>
              <span style={{ fontSize:'14px', fontWeight:700, color:'#f8fafc' }}>{boardName}</span>
              <span className="material-symbols-rounded" style={{ fontSize:'14px', color:'#475569' }}>edit</span>
            </div>
          )}
        </div>

        {/* Center — zoom */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', padding:'4px 8px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontFamily:"'Outfit', sans-serif" }}>-</button>
          <span style={{ color:'#64748b', fontSize:'13px', minWidth:'42px', textAlign:'center' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', padding:'4px 8px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontFamily:"'Outfit', sans-serif" }}>+</button>
          <button onClick={() => setZoom(1)} style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:'11px', fontFamily:"'Outfit', sans-serif" }}>Reset</button>
        </div>

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={handleUndo} title="Undo" style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', padding:'6px 10px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', fontFamily:"'Outfit', sans-serif" }}>
            <span className="material-symbols-rounded" style={{ fontSize:'16px' }}>undo</span>
          </button>
          <button onClick={handleRedo} title="Redo" style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', padding:'6px 10px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', fontFamily:"'Outfit', sans-serif" }}>
            <span className="material-symbols-rounded" style={{ fontSize:'16px' }}>redo</span>
          </button>
          <button onClick={handleClear} title="Clear all" style={{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', padding:'6px 10px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px', fontSize:'13px', fontFamily:"'Outfit', sans-serif" }}>
            <span className="material-symbols-rounded" style={{ fontSize:'16px' }}>delete_sweep</span>
          </button>
          <button onClick={handleSave} style={{ background: isSaved ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color: isSaved ? '#34d399' : 'white', padding:'6px 16px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', fontWeight:600, fontFamily:"'Outfit', sans-serif", transition:'all 0.2s' }}>
            <span className="material-symbols-rounded" style={{ fontSize:'16px' }}>{isSaved ? 'check_circle' : 'save'}</span>
            {isSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Content Row ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>

        {/* Left Toolbar — modern lean sidebar */}
        <div style={{ width:'64px', background:'#080e1c', borderRight:'1px solid #1a2236', display:'flex', flexDirection:'column', padding:'8px 0', gap:0, flexShrink:0, overflowY:'auto' }}>
          {/* Draw tools group */}
          <div style={{ padding:'8px 8px 4px' }}>
            <span style={{ fontSize:'8px', fontWeight:700, color:'#2d3f5a', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', textAlign:'center', marginBottom:'6px' }}>Draw</span>
            {TOOLS.filter(t => !['select','image', 'video'].includes(t.id)).map(t => {
              const active = tool === t.id;
              return (
                <button key={t.id} title={t.label} onClick={() => handleToolClick(t.id)}
                  style={{ width:'100%', background: active ? 'rgba(99,102,241,0.18)' : 'none', border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', color: active ? '#818cf8' : '#475569', padding:'7px 4px', borderRadius:'9px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', transition:'all 0.12s', marginBottom:'2px' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background='#111c30'; e.currentTarget.style.color='#94a3b8'; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background='none'; e.currentTarget.style.color='#475569'; }}}>
                  <span className="material-symbols-rounded" style={{ fontSize:'17px' }}>{t.icon}</span>
                  <span style={{ fontSize:'8px', fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ height:'1px', background:'#1a2236', margin:'4px 10px' }} />

          {/* Select + Media group */}
          <div style={{ padding:'4px 8px' }}>
            <span style={{ fontSize:'8px', fontWeight:700, color:'#2d3f5a', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', textAlign:'center', marginBottom:'6px' }}>Media</span>
            {TOOLS.filter(t => ['select','image', 'video'].includes(t.id)).map(t => {
              const active = tool === t.id;
              return (
                <button key={t.id} title={t.label} onClick={() => handleToolClick(t.id)}
                  style={{ width:'100%', background: active ? 'rgba(99,102,241,0.18)' : 'none', border: active ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', color: active ? '#818cf8' : '#475569', padding:'7px 4px', borderRadius:'9px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', transition:'all 0.12s', marginBottom:'2px' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background='#111c30'; e.currentTarget.style.color='#94a3b8'; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background='none'; e.currentTarget.style.color='#475569'; }}}>
                  <span className="material-symbols-rounded" style={{ fontSize:'17px' }}>{t.icon}</span>
                  <span style={{ fontSize:'8px', fontWeight:700, letterSpacing:'0.04em', textTransform:'uppercase' }}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ height:'1px', background:'#1a2236', margin:'4px 10px' }} />

          {/* Colors */}
          <div style={{ padding:'4px 8px 8px' }}>
            <span style={{ fontSize:'8px', fontWeight:700, color:'#2d3f5a', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', textAlign:'center', marginBottom:'6px' }}>Color</span>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} title={c}
                  style={{ width:'22px', height:'22px', borderRadius:'6px', background:c, border: color === c ? '2px solid #6366f1' : '2px solid transparent', cursor:'pointer', transition:'all 0.12s', outline: color === c ? '2px solid rgba(99,102,241,0.3)' : 'none', outlineOffset:'1px' }}
                />
              ))}
            </div>
          </div>

          <div style={{ height:'1px', background:'#1a2236', margin:'0 10px 4px' }} />

          {/* Stroke sizes */}
          <div style={{ padding:'4px 8px 8px' }}>
            <span style={{ fontSize:'8px', fontWeight:700, color:'#2d3f5a', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', textAlign:'center', marginBottom:'6px' }}>Size</span>
            {SIZES.map(s => (
              <button key={s} onClick={() => setStrokeSize(s)} title={`Size ${s}`}
                style={{ width:'100%', height:'22px', background: strokeSize === s ? 'rgba(99,102,241,0.15)' : 'none', border: strokeSize === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'3px' }}>
                <div style={{ width: Math.min(32, s * 2.5 + 6), height: Math.min(s, 8), background: strokeSize === s ? '#818cf8' : '#475569', borderRadius:'999px' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Area */}
        <div style={{ flex:1, overflow:'hidden', position:'relative', background:'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize:'24px 24px', backgroundColor:'#020617' }}>
          <div style={{ transform:`scale(${zoom})`, transformOrigin:'top left', width: `${100/zoom}%`, height: `${100/zoom}%` }}>
            <canvas
              ref={canvasRef}
              style={{ display:'block', width:'100%', height:'100%', cursor: getCursor() }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onContextMenu={onContextMenu}
            />
          </div>
        </div>
      </div>

      {/* ── Status / Tip Bar ── */}
      <div style={{ height:'32px', background:'#0a0f1e', borderTop:'1px solid #1e293b', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
          <span style={{ fontSize:'11px', color:'#334155', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>AntCapture Whiteboard</span>
          <span style={{ fontSize:'11px', color:'#334155' }}>·</span>
          <span style={{ fontSize:'11px', color:'#475569' }}>
            {tool === 'pen'    && '✏️  Click and drag to draw freely'}
            {tool === 'eraser' && '🧹  Drag over strokes to erase'}
            {tool === 'text'   && '📝  Click anywhere to add text'}
            {tool === 'rect'   && '⬜  Drag to draw a rectangle'}
            {tool === 'circle' && '⭕  Drag to draw an ellipse'}
            {tool === 'arrow'  && '➡️  Drag to draw an arrow'}
            {tool === 'select' && '🖱️  Click an image to select and drag it'}
            {tool === 'image'  && '🖼️  Pick an image from your library'}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <span style={{ fontSize:'11px', color:'#334155' }}>No infinite canvas — focused &amp; distraction-free</span>
        </div>
      </div>

      {/* Library Picker */}
      {showLibrary !== 'none' && (
        <LibraryPicker user={user} onSelect={handleImageInsert} onClose={() => setShowLibrary('none')} initialTab={showLibrary} />
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          style={{ position:'fixed', top: contextMenu.y, left: contextMenu.x, zIndex:3000, background:'#0f172a', border:'1px solid #334155', borderRadius:'12px', padding:'6px', boxShadow:'0 12px 40px rgba(0,0,0,0.5)', minWidth:'180px', fontFamily:"'Outfit',sans-serif" }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {[
            { icon:'flip_to_front', label:'Bring to Front', fn: ctxBringFront },
            { icon:'flip_to_back',  label:'Send to Back',   fn: ctxSendBack  },
          ].map(item => (
            <button key={item.label} onClick={item.fn}
              style={{ width:'100%', background:'none', border:'none', color:'#cbd5e1', cursor:'pointer', padding:'9px 14px', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', fontWeight:600, fontFamily:"'Outfit',sans-serif", textAlign:'left', transition:'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background='#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <span className="material-symbols-rounded" style={{ fontSize:'17px', color:'#6366f1' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ height:'1px', background:'#1e293b', margin:'4px 6px' }} />
          <button onClick={ctxDelete}
            style={{ width:'100%', background:'none', border:'none', color:'#f87171', cursor:'pointer', padding:'9px 14px', borderRadius:'8px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', fontWeight:600, fontFamily:"'Outfit',sans-serif", transition:'background 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background='none'}>
            <span className="material-symbols-rounded" style={{ fontSize:'17px' }}>delete</span>
            Delete
          </button>
        </div>
      )}

      {/* Exit Warning Modal */}
      {showExitModal && (
        <div style={{ position:'fixed', inset:0, zIndex:4000, background:'rgba(2,6,23,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
          <div style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:'24px', width:'420px', maxWidth:'100%', padding:'32px', boxShadow:'0 24px 64px rgba(0,0,0,0.6)' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'20px' }}>
              <span className="material-symbols-rounded" style={{ fontSize:'28px', color:'#fbbf24' }}>warning</span>
            </div>
            <h3 style={{ margin:'0 0 12px', fontSize:'20px', fontWeight:700, color:'#f8fafc' }}>Unsaved Changes</h3>
            <p style={{ margin:'0 0 28px', fontSize:'15px', color:'#94a3b8', lineHeight:'1.5' }}>
              You have unsaved changes on your whiteboard. Do you want to save them before leaving?
            </p>
            <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
              <button onClick={() => setShowExitModal(false)} style={{ background:'transparent', border:'none', color:'#94a3b8', padding:'10px 16px', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={() => { setShowExitModal(false); onClose(); }} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', padding:'10px 16px', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                Discard
              </button>
              <button onClick={async () => { setShowExitModal(false); await handleSave(); onClose(); }} style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'white', padding:'10px 20px', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                Save &amp; Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
