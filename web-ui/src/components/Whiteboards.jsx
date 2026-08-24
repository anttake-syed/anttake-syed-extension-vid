import React, { useState, useEffect, useRef } from 'react';
import { SERVER_URL } from '../config.js';

function generateDefaultName() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `Board ${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const FEATURE_PILLS = [
  { icon: 'no_photography', label: 'No Ads, Ever' },
  { icon: 'photo_library',  label: 'Import from Library' },
  { icon: 'crop_free',      label: 'No Infinite Canvas — Focused' },
  { icon: 'draw',           label: 'Pen, Shapes & Text' },
  { icon: 'lock',           label: 'Private by Default' },
];

export default function Whiteboards({ user, isAuthenticated, onSignIn, onOpenBoard }) {
  const [boards, setBoards]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameRef = useRef(null);

  useEffect(() => {
    async function fetchBoards() {
      if (!isAuthenticated) { setLoading(false); return; }
      try {
        const res = await fetch(`${SERVER_URL}/boards`, {
          headers: { 'Authorization': `Bearer ${user.jwt}` }
        });
        if (!res.ok) throw new Error('Failed to fetch boards');
        const data = await res.json();
        setBoards(data.boards || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBoards();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (renamingId !== null) renameRef.current?.focus();
  }, [renamingId]);

  const handleCreateBoard = async () => {
    const name = generateDefaultName();
    try {
      const res = await fetch(`${SERVER_URL}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.jwt}` },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to create board');
      const data = await res.json();
      setBoards(prev => [data.board, ...prev]);
      onOpenBoard(data.board);
    } catch (err) { alert(err.message); }
  };

  const startRename = (e, board) => {
    e.stopPropagation();
    setRenamingId(board.id);
    setRenameDraft(board.name);
  };

  const commitRename = async (boardId) => {
    const trimmed = renameDraft.trim() || generateDefaultName();
    setBoards(prev => prev.map(b => b.id === boardId ? { ...b, name: trimmed } : b));
    setRenamingId(null);
    try {
      await fetch(`${SERVER_URL}/boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.jwt}` },
        body: JSON.stringify({ name: trimmed }),
      });
    } catch (err) { console.error('Rename failed', err); }
  };

  const handleDeleteBoard = async (e, boardId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this whiteboard?')) return;
    setBoards(prev => prev.filter(b => b.id !== boardId));
    try {
      await fetch(`${SERVER_URL}/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.jwt}` },
      });
    } catch (err) { console.error('Delete failed', err); }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'40px 20px' }}>
        {/* Feature highlight */}
        <div style={{ background:'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.07))', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'20px', padding:'36px 40px', marginBottom:'32px' }}>
          <h1 style={{ fontSize:'28px', fontWeight:800, color:'#f8fafc', margin:'0 0 8px' }}>
            ✏️ AntCapture Whiteboards
          </h1>
          <p style={{ color:'#94a3b8', fontSize:'15px', margin:'0 0 20px', maxWidth:'540px' }}>
            A clean, focused whiteboard built right into your capture dashboard. No infinite canvas, no distractions — just you and your ideas.
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', marginBottom:'28px' }}>
            {FEATURE_PILLS.map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', padding:'5px 12px', borderRadius:'999px' }}>
                <span className="material-symbols-rounded" style={{ fontSize:'14px', color:'#818cf8' }}>{f.icon}</span>
                <span style={{ fontSize:'12px', color:'#94a3b8', fontWeight:500 }}>{f.label}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary" onClick={onSignIn}>Sign in with Google to get started</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'20px 0' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'24px', fontWeight:700, color:'#f8fafc', margin:'0 0 4px' }}>My Whiteboards</h1>
          <p style={{ color:'#64748b', margin:0, fontSize:'14px' }}>Focused, distraction-free boards. No infinite canvas · No ads.</p>
        </div>
        <button
          onClick={handleCreateBoard}
          style={{ display:'flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg, #6366f1, #8b5cf6)', color:'white', padding:'10px 20px', borderRadius:'10px', fontSize:'14px', fontWeight:600, border:'none', cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,0.3)', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(99,102,241,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 12px rgba(99,102,241,0.3)'; }}
        >
          <span className="material-symbols-rounded" style={{ fontSize:'18px' }}>add</span>
          New Board
        </button>
      </div>

      {/* Feature pills bar */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'28px' }}>
        {FEATURE_PILLS.map(f => (
          <div key={f.label} style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', padding:'4px 12px', borderRadius:'999px' }}>
            <span className="material-symbols-rounded" style={{ fontSize:'13px', color:'#6366f1' }}>{f.icon}</span>
            <span style={{ fontSize:'12px', color:'#64748b', fontWeight:500 }}>{f.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#64748b' }}>
          <div className="btn-spinner" style={{ margin:'0 auto 12px', width:'28px', height:'28px', borderTopColor:'#6366f1', borderRightColor:'#6366f1' }} />
          <p>Loading whiteboards…</p>
        </div>
      ) : boards.length === 0 ? (
        <div style={{ background:'#1e293b', border:'1px dashed #334155', borderRadius:'20px', padding:'72px 24px', textAlign:'center' }}>
          <span className="material-symbols-rounded" style={{ fontSize:'56px', color:'#334155', display:'block', marginBottom:'16px' }}>draw</span>
          <h3 style={{ color:'#64748b', margin:'0 0 8px', fontWeight:600 }}>No whiteboards yet</h3>
          <p style={{ color:'#475569', fontSize:'14px', margin:'0 0 24px' }}>
            Click <strong style={{ color:'#94a3b8' }}>New Board</strong> above to create your first focused whiteboard.
          </p>
          <button onClick={handleCreateBoard} style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'linear-gradient(135deg, #6366f1, #8b5cf6)', color:'white', padding:'10px 22px', borderRadius:'10px', border:'none', cursor:'pointer', fontWeight:600, fontSize:'14px' }}>
            <span className="material-symbols-rounded" style={{ fontSize:'18px' }}>add</span>
            Create First Board
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' }}>
          {boards.map(board => (
            <div
              key={board.id}
              onClick={() => renamingId !== board.id && onOpenBoard(board)}
              style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:'16px', overflow:'hidden', cursor:'pointer', transition:'all 0.2s', display:'flex', flexDirection:'column', position:'relative' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#6366f1'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 10px 25px rgba(0,0,0,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='#334155'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}
            >
              {/* Preview area */}
              <div style={{ height:'140px', background:'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize:'20px 20px', backgroundColor:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize:'48px', color:'#334155' }}>draw</span>
              </div>

              {/* Info */}
              <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:'6px' }}>
                {renamingId === board.id ? (
                  <input
                    ref={renameRef}
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                    onBlur={() => commitRename(board.id)}
                    onKeyDown={e => { if (e.key === 'Enter') commitRename(board.id); if (e.key === 'Escape') setRenamingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{ background:'#0f172a', border:'1px solid #6366f1', borderRadius:'6px', color:'#f8fafc', padding:'4px 8px', fontSize:'14px', fontWeight:600, outline:'none', width:'100%', fontFamily:"'Outfit', sans-serif" }}
                  />
                ) : (
                  <h3 style={{ margin:0, fontSize:'15px', color:'#f1f5f9', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{board.name}</h3>
                )}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'12px', color:'#475569' }}>
                    Updated {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                  <div style={{ display:'flex', gap:'4px' }}>
                    <button
                      onClick={e => startRename(e, board)}
                      title="Rename"
                      style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', padding:'4px', borderRadius:'6px', display:'flex', alignItems:'center', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='#334155'; e.currentTarget.style.color='#94a3b8'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#475569'; }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize:'15px' }}>edit</span>
                    </button>
                    <button
                      onClick={e => handleDeleteBoard(e, board.id)}
                      title="Delete"
                      style={{ background:'none', border:'none', color:'#475569', cursor:'pointer', padding:'4px', borderRadius:'6px', display:'flex', alignItems:'center', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; e.currentTarget.style.color='#f87171'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#475569'; }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize:'15px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
