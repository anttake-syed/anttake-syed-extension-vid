import React from 'react';

export default function WhiteboardTextPromptModal({
  isOpen,
  value,
  onChange,
  onCommit,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="wb-overlay" style={{ zIndex: 4000 }} onClick={onClose}>
      <div
        className="wb-dialog wb-dialog--compact"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
          Add Text
        </h3>
        <input
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onCommit();
            if (e.key === 'Escape') onClose();
          }}
          placeholder="Type something…"
          className="wb-text-input"
          style={{
            width: '100%',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--primary)',
            borderRadius: '10px',
            color: 'var(--text-main)',
            padding: '10px 14px',
            outline: 'none',
            fontFamily: "'Outfit', sans-serif",
            boxSizing: 'border-box',
            marginBottom: '20px'
          }}
        />
        <div className="dialog-actions" style={{ gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '9px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onCommit}
            style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none',
              color: 'white',
              padding: '9px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
