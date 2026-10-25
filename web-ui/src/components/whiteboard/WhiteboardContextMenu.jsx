import React from 'react';

/**
 * WhiteboardContextMenu
 * Right click actions: Bring to front, Send to back, Delete element
 */
export default function WhiteboardContextMenu({
  contextMenu,
  onBringToFront,
  onSendToBack,
  onDelete,
}) {
  if (!contextMenu) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 1000,
        backgroundColor: '#1e293b',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        padding: '4px',
        minWidth: '160px',
        backdropFilter: 'blur(12px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '7px 12px',
          background: 'none',
          border: 'none',
          color: '#e2e8f0',
          fontSize: '13px',
          cursor: 'pointer',
          borderRadius: '4px',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => onBringToFront(contextMenu.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        Bring to Front
      </button>
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '7px 12px',
          background: 'none',
          border: 'none',
          color: '#e2e8f0',
          fontSize: '13px',
          cursor: 'pointer',
          borderRadius: '4px',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => onSendToBack(contextMenu.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
        Send to Back
      </button>
      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '7px 12px',
          background: 'none',
          border: 'none',
          color: '#ef4444',
          fontSize: '13px',
          cursor: 'pointer',
          borderRadius: '4px',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => onDelete(contextMenu.id)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
        Delete
      </button>
    </div>
  );
}
