import React, { useState } from 'react';

/**
 * WhiteboardTextPromptModal
 * Modal to prompt user for text content when creating a text element.
 */
export default function WhiteboardTextPromptModal({
  isOpen,
  onClose,
  onSubmit,
}) {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px 0', color: '#f8fafc', fontSize: '17px', fontWeight: 600 }}>
          Add Text Note
        </h3>
        <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>
          Enter the text you want to place onto the whiteboard canvas.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your notes or labels here..."
            style={{
              width: '100%',
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#f8fafc',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: '20px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                backgroundColor: '#6366f1',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: text.trim() ? 'pointer' : 'not-allowed',
                opacity: text.trim() ? 1 : 0.5,
              }}
            >
              Add to Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
