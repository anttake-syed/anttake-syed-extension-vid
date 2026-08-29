import React, { useState, useEffect, useCallback } from 'react';
import { SERVER_URL } from '../config.js';

function generateDefaultName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `Board ${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 172800) return 'Yesterday at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) +
    ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function EmptyPreview() {
  return (
    <div aria-hidden="true" style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10,
      backgroundImage:'radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)', backgroundSize:'22px 22px', background:'#070d1a' }}>
      <svg width="64" height="44" viewBox="0 0 72 48" fill="none" style={{ opacity:0.22 }}>
        <path d="M6 36 Q18 8 32 24 Q46 40 60 14" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <rect x="10" y="26" width="14" height="9" rx="2" stroke="#818cf8" strokeWidth="1.5" fill="none"/>
        <circle cx="54" cy="32" r="6" stroke="#a78bfa" strokeWidth="1.5" fill="none"/>
      </svg>
      <span style={{ fontSize:10, color:'#374151', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase' }}>No preview yet</span>
    </div>
  );
}

function IconBtn({ icon, label, onClick, danger }) {
  const [h, setH] = useState(false);
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: h ? (danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)') : 'transparent',
        border: 'none',
        color: h ? (danger ? '#f87171' : '#e2e8f0') : '#6b7280',
        cursor: 'pointer', padding: '7px 9px', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', flexShrink: 0,
      }}>
      <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{icon}</span>
    </button>
  );
}

const CARD_H = 200;

function GridCard({ board, onOpen, onRename, onDelete }) {
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  const thumb = board.thumbnail || null;

  const commit = () => {
    const v = draft.trim() || board.name;
    setEditing(false);
    if (v !== board.name) onRename(board.id, v);
  };

  return (
    <article
      role="button"
      tabIndex={editing ? -1 : 0}
      aria-label={`Open whiteboard: ${board.name}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !editing && onOpen(board)}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !editing) { e.preventDefault(); onOpen(board); } }}
      style={{
        background: '#0d1526',
        border: `1.5px solid ${hov ? '#6366f1' : '#1a2540'}`,
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(.25,.46,.45,.94)',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? '0 24px 56px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.25)' : '0 4px 16px rgba(0,0,0,0.35)',
        display: 'flex', flexDirection: 'column',
        outline: 'none',
      }}>
      {/* Preview */}
      <div style={{ height: CARD_H, background: '#070d1a', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {thumb
          ? <img src={thumb} alt={`Preview of ${board.name}`} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform 0.3s ease', transform: hov ? 'scale(1.03)' : 'scale(1)' }} />
          : <EmptyPreview />}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          opacity: hov ? 1 : 0, transition:'opacity 0.2s', background:'rgba(7,13,26,0.45)' }}>
          <div style={{ background:'rgba(99,102,241,0.92)', backdropFilter:'blur(10px)', borderRadius:10,
            padding:'8px 18px', display:'flex', alignItems:'center', gap:7, color:'white', fontSize:14, fontWeight:700, letterSpacing:'-0.01em' }}>
            <span className="material-symbols-rounded" style={{ fontSize:17 }}>open_in_full</span>Open Board
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding:'14px 16px 14px', borderTop:`1px solid ${hov ? 'rgba(99,102,241,0.15)' : '#1a2540'}`,
        transition:'border-color 0.22s', display:'flex', flexDirection:'column', gap:10, background:'#0d1526' }}>
        {editing ? (
          <input
            value={draft} autoFocus
            aria-label="Rename board"
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setEditing(false); setDraft(board.name); } }}
            onClick={e => e.stopPropagation()}
            style={{ background:'#0a1020', border:'1.5px solid #6366f1', borderRadius:8, color:'#f9fafb',
              padding:'6px 10px', fontSize:14, fontWeight:600, outline:'none', width:'100%', fontFamily:"'Outfit',sans-serif", boxSizing:'border-box' }} />
        ) : (
          <span title={board.name} style={{ fontSize:15, color:'#f1f5f9', fontWeight:700,
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3 }}>
            {board.name}
          </span>
        )}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <span style={{ fontSize:11, color:'#4b5563', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.07em' }}>Last edited</span>
            <span style={{ fontSize:12, color:'#6b7280' }}>{formatDate(board.updatedAt)}</span>
          </div>
          <div style={{ display:'flex', gap:2 }} onClick={e => e.stopPropagation()}>
            <IconBtn icon="edit" label="Rename board" onClick={e => { e.stopPropagation(); setEditing(true); setDraft(board.name); }} />
            <IconBtn icon="delete" label="Delete board" danger onClick={e => { e.stopPropagation(); onDelete(board.id); }} />
          </div>
        </div>
      </div>
    </article>
  );
}

function ListRow({ board, onOpen, onRename, onDelete }) {
  const [hov, setHov] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  const thumb = board.thumbnail || null;
  const commit = () => { const v = draft.trim() || board.name; setEditing(false); if (v !== board.name) onRename(board.id, v); };

  return (
    <article
      role="button"
      tabIndex={editing ? -1 : 0}
      aria-label={`Open whiteboard: ${board.name}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => !editing && onOpen(board)}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !editing) { e.preventDefault(); onOpen(board); } }}
      style={{
        display:'flex', alignItems:'center', gap:18, padding:'14px 18px',
        borderRadius:14, background: hov ? '#0d1526' : 'transparent',
        cursor:'pointer', transition:'all 0.15s', outline:'none',
        border:`1.5px solid ${hov ? '#1a2540' : 'transparent'}`,
        boxShadow: hov ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
      }}>
      {/* Thumbnail */}
      <div style={{ width:96, height:62, borderRadius:10, overflow:'hidden', background:'#070d1a', flexShrink:0, border:'1.5px solid #1a2540' }}>
        {thumb ? <img src={thumb} alt={`Preview of ${board.name}`} style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : <EmptyPreview />}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        {editing ? (
          <input value={draft} autoFocus aria-label="Rename board"
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key==='Enter') commit(); if (e.key==='Escape') { setEditing(false); setDraft(board.name); } }}
            onClick={e => e.stopPropagation()}
            style={{ background:'#0a1020', border:'1.5px solid #6366f1', borderRadius:8, color:'#f9fafb',
              padding:'5px 10px', fontSize:15, fontWeight:600, outline:'none', width:'100%', fontFamily:"'Outfit',sans-serif", boxSizing:'border-box' }} />
        ) : (
          <div title={board.name} style={{ fontSize:15, color:'#f1f5f9', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}>{board.name}</div>
        )}
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          <div>
            <span style={{ fontSize:10, color:'#374151', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', display:'block' }}>Last Edited</span>
            <span style={{ fontSize:12, color:'#6b7280' }}>{formatDate(board.updatedAt)}</span>
          </div>
          {board.createdAt && (
            <div>
              <span style={{ fontSize:10, color:'#374151', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', display:'block' }}>Created</span>
              <span style={{ fontSize:12, color:'#6b7280' }}>{formatDate(board.createdAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:4, opacity: hov ? 1 : 0, transition:'opacity 0.15s' }} onClick={e => e.stopPropagation()}>
        <IconBtn icon="edit" label="Rename board" onClick={e => { e.stopPropagation(); setEditing(true); setDraft(board.name); }} />
        <IconBtn icon="delete" label="Delete board" danger onClick={e => { e.stopPropagation(); onDelete(board.id); }} />
        <IconBtn icon="arrow_forward" label="Open board" onClick={e => { e.stopPropagation(); onOpen(board); }} />
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div aria-hidden="true" style={{ background:'#0d1526', border:'1.5px solid #1a2540', borderRadius:18, overflow:'hidden', animation:'wb-pulse 1.8s ease-in-out infinite' }}>
      <div style={{ height:CARD_H, background:'#070d1a' }}/>
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ height:16, background:'#1a2540', borderRadius:6, width:'65%' }}/>
        <div style={{ height:11, background:'#1a2540', borderRadius:4, width:'40%' }}/>
      </div>
    </div>
  );
}

function ViewToggle({ value, onChange }) {
  return (
    <div role="group" aria-label="View mode" style={{ display:'flex', background:'#0d1526', borderRadius:10, border:'1px solid #1a2540', padding:3, gap:3 }}>
      {[{ v:'grid', icon:'grid_view', label:'Grid view' }, { v:'list', icon:'view_list', label:'List view' }].map(o => (
        <button key={o.v} onClick={() => onChange(o.v)} aria-label={o.label} aria-pressed={value === o.v} title={o.label}
          style={{ background: value===o.v ? '#1e2f4d' : 'transparent', border:'none', borderRadius:7, padding:'7px 14px', cursor:'pointer',
            color: value===o.v ? '#e2e8f0' : '#4b5563', display:'flex', alignItems:'center', gap:6, transition:'all 0.15s', fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:600 }}>
          <span className="material-symbols-rounded" style={{ fontSize:17 }}>{o.icon}</span>
          {o.label.split(' ')[0]}
        </button>
      ))}
    </div>
  );
}

export default function Whiteboards({ user, isAuthenticated, onSignIn, onOpenBoard }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('updated');

  const fetchBoards = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/boards`, { headers: { Authorization:`Bearer ${user.jwt}` } });
      const data = await res.json();
      setBoards(data.boards || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isAuthenticated, user]);

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch(`${SERVER_URL}/boards`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${user.jwt}` },
        body: JSON.stringify({ name: generateDefaultName() }),
      });
      const d = await res.json();
      const nb = { ...d.board, items:[] };
      setBoards(p => [nb, ...p]);
      onOpenBoard(nb);
    } catch(e) { alert(e.message); }
    finally { setCreating(false); }
  };

  const handleRename = async (id, name) => {
    setBoards(p => p.map(b => b.id===id ? {...b, name} : b));
    fetch(`${SERVER_URL}/boards/${id}`, {
      method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${user.jwt}` },
      body: JSON.stringify({ name }),
    }).catch(console.error);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this whiteboard? This cannot be undone.')) return;
    setBoards(p => p.filter(b => b.id !== id));
    fetch(`${SERVER_URL}/boards/${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${user.jwt}` } }).catch(console.error);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth:640, margin:'40px 0', padding:'0', textAlign:'left', fontFamily:"'Outfit',sans-serif" }}>
        <div style={{ width:80, height:80, background:'linear-gradient(135deg,#4338ca,#7c3aed)', borderRadius:22,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28, boxShadow:'0 16px 48px rgba(99,102,241,.4)' }}>
          <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize:42, color:'white' }}>draw</span>
        </div>
        <h1 style={{ fontSize:32, fontWeight:800, color:'#f9fafb', margin:'0 0 12px', letterSpacing:'-0.5px' }}>AntCapture Whiteboards</h1>
        <p style={{ color:'#6b7280', fontSize:16, lineHeight:1.75, margin:'0 0 32px', maxWidth:500 }}>
          Draw, diagram and brainstorm — right inside your capture dashboard.
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:40 }}>
          {['Pen, Shapes & Text','Undo / Redo','Import from Library','Private by Default'].map(l => (
            <span key={l} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:999, padding:'6px 14px', fontSize:13, color:'#9ca3af', fontWeight:500 }}>{l}</span>
          ))}
        </div>
        <button onClick={onSignIn} style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white',
          border:'none', borderRadius:14, padding:'14px 36px', fontSize:16, fontWeight:700, cursor:'pointer',
          boxShadow:'0 8px 28px rgba(99,102,241,.4)', fontFamily:"'Outfit',sans-serif" }}>
          Sign in to get started
        </button>
      </div>
    );
  }

  const filtered = boards
    .filter(b => b.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  return (
    <>
      {/* Toolbar & Create Button Row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, gap:16, flexWrap:'wrap' }}>
        <button
          onClick={handleCreate}
          disabled={creating}
          aria-label="Create new whiteboard"
          style={{ display:'flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white', padding:'11px 22px', borderRadius:12, fontSize:15, fontWeight:700, border:'none',
            cursor: creating ? 'not-allowed' : 'pointer', boxShadow:'0 4px 20px rgba(99,102,241,.4)',
            fontFamily:"'Outfit',sans-serif", transition:'all 0.18s', opacity: creating ? 0.7 : 1 }}>
          {creating
            ? <div role="status" aria-label="Creating board" style={{ width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid white',borderRadius:'50%',animation:'wb-spin .7s linear infinite'}}/>
            : <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize:20 }}>add</span>}
          New Board
        </button>
      </div>

      {/* Filters Row */}
      <div role="toolbar" aria-label="Board controls" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 200px', maxWidth:320 }}>
            <label htmlFor="wb-search" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(0,0,0,0)' }}>Search boards</label>
            <span aria-hidden="true" className="material-symbols-rounded" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', fontSize:17, color:'#4b5563', pointerEvents:'none' }}>search</span>
            <input
              id="wb-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search boards…"
              style={{ width:'100%', background:'#0d1526', border:'1.5px solid #1a2540', borderRadius:11,
                color:'#e5e7eb', padding:'9px 12px 9px 36px', fontSize:14, outline:'none',
                fontFamily:"'Outfit',sans-serif", boxSizing:'border-box', transition:'border-color .15s' }}
              onFocus={e => e.target.style.borderColor='#6366f1'}
              onBlur={e => e.target.style.borderColor='#1a2540'} />
          </div>

          <div>
            <label htmlFor="wb-sort" style={{ position:'absolute', width:1, height:1, overflow:'hidden', clip:'rect(0,0,0,0)' }}>Sort boards</label>
            <select id="wb-sort" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort boards"
              style={{ background:'#0d1526', border:'1.5px solid #1a2540', borderRadius:11, color:'#9ca3af',
                padding:'9px 14px', fontSize:14, outline:'none', cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>
              <option value="updated">Last edited</option>
              <option value="created">Date created</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* Count bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span aria-live="polite" style={{ fontSize: '13px', color: '#64748b' }}>
          {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'board' : 'boards'}`}
          {search && ` for "${search}"`}
        </span>
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div role="status" aria-label="Loading boards" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:22 }}>
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : boards.length === 0 ? (
        <div style={{ textAlign:'left', padding:'64px 0', maxWidth: 480 }}>
          <div style={{ width:88, height:88, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.18)',
            borderRadius:26, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
            <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize:44, color:'#4338ca' }}>draw</span>
          </div>
          <h2 style={{ color:'#e5e7eb', margin:'0 0 10px', fontWeight:800, fontSize:24 }}>Start your first board</h2>
          <p style={{ color:'#4b5563', fontSize:15, margin:'0 0 32px', lineHeight:1.75 }}>
            Create a whiteboard to draw, diagram, or annotate your screenshots.
          </p>
          <button onClick={handleCreate} style={{ display:'inline-flex', alignItems:'center', gap:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color:'white', padding:'13px 28px', borderRadius:12, border:'none', cursor:'pointer',
            fontWeight:700, fontSize:15, fontFamily:"'Outfit',sans-serif", boxShadow:'0 8px 28px rgba(99,102,241,.4)' }}>
            <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize:20 }}>add</span>
            Create your first board
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div role="status" style={{ textAlign:'left', padding:'48px 0', color:'#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ width:64, height:64, background:'rgba(255,255,255,0.03)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
             <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize:32, opacity:.5 }}>search_off</span>
          </div>
          <p style={{ fontSize:16, margin:0, fontWeight: 500, color: '#e2e8f0' }}>No boards found</p>
          <p style={{ fontSize:14, margin:'4px 0 0', color: '#6b7280' }}>We couldn't find anything matching "<strong style={{ color:'#9ca3af' }}>{search}</strong>"</p>
        </div>
      ) : view === 'list' ? (
        <div role="list" aria-label="Whiteboards" style={{ display:'flex', flexDirection:'column', gap:6,
          background:'#080f1e', border:'1.5px solid #1a2540', borderRadius:18, overflow:'hidden', padding:10 }}>
          {filtered.map(b => <ListRow key={b.id} board={b} onOpen={onOpenBoard} onRename={handleRename} onDelete={handleDelete}/>)}
        </div>
      ) : (
        <div role="list" aria-label="Whiteboards" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:22 }}>
          {filtered.map(b => <GridCard key={b.id} board={b} onOpen={onOpenBoard} onRename={handleRename} onDelete={handleDelete}/>)}
        </div>
      )}

      <style>{`
        @keyframes wb-spin { to { transform:rotate(360deg); } }
        @keyframes wb-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        article[role="button"]:focus-visible { outline: 2px solid #6366f1; outline-offset: 3px; }
        button:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
        input:focus-visible { outline: none; }
      `}</style>
    </>
  );
}
