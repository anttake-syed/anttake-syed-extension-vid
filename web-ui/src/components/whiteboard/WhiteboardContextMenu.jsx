import React from 'react';

export default function WhiteboardContextMenu({
  contextMenu,
  onBringToFront,
  onSendToBack,
  onDelete,
  onClose,
}) {
  if (!contextMenu) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: `min(${contextMenu.y}px, calc(100dvh - 150px))`,
        left: `min(${contextMenu.x}px, calc(100vw - 196px))`,
        zIndex: 3000,
        background: 'var(--bg-secondary)',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '6px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        minWidth: '180px',
        fontFamily: "'Outfit', sans-serif"
      }}
      onMouseLeave={onClose}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onBringToFront}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#cbd5e1',
          cursor: 'pointer',
          padding: '9px 14px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          textAlign: 'left',
          transition: 'background 0.12s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '17px', color: '#6366f1' }}>flip_to_front</span>
        Bring to Front
      </button>
      <button
        onClick={onSendToBack}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#cbd5e1',
          cursor: 'pointer',
          padding: '9px 14px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          textAlign: 'left',
          transition: 'background 0.12s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '17px', color: '#6366f1' }}>flip_to_back</span>
        Send to Back
      </button>

      <div style={{ height: '1px', background: '#1e293b', margin: '4px 6px' }} />

      <button
        onClick={onDelete}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#f87171',
          cursor: 'pointer',
          padding: '9px 14px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          transition: 'background 0.12s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>delete</span>
        Delete
      </button>
    </div>
  );
}
