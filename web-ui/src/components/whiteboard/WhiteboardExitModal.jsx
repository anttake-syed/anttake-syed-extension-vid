import React from 'react';

export default function WhiteboardExitModal({
  isOpen,
  onCancel,
  onDiscard,
  onSaveAndExit,
}) {
  if (!isOpen) return null;

  return (
    <div className="wb-overlay" style={{ zIndex: 4000 }} onClick={onCancel}>
      <div className="wb-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px'
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#fbbf24' }}>warning</span>
        </div>
        <h3 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
          Unsaved Changes
        </h3>
        <p style={{ margin: '0 0 28px', fontSize: '15px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
          You have unsaved changes on your whiteboard. Do you want to save them before leaving?
        </p>
        <div className="dialog-actions" style={{ gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onDiscard}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Discard
          </button>
          <button
            onClick={onSaveAndExit}
            style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Save &amp; Leave
          </button>
        </div>
      </div>
    </div>
  );
}
