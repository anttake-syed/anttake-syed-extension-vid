import React, { useState } from 'react';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'html', 'css', 'sql', 'json', 'bash', 'rust', 'go'
];

export default function WhiteboardCodeModal({
  isOpen,
  initialCode = '',
  initialLanguage = 'javascript',
  onCommit,
  onClose,
}) {
  const [code, setCode] = useState(initialCode || `// Write your code here\nfunction calculate() {\n  const rate = 1.25;\n  return rate * 100;\n}`);
  const [language, setLanguage] = useState(initialLanguage || 'javascript');

  if (!isOpen) return null;

  return (
    <div className="wb-overlay" style={{ zIndex: 4000 }} onClick={onClose}>
      <div
        className="wb-dialog"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              Add Code Block
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Insert editable styled code with syntax header and line numbering
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Language:</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              color: '#38bdf8',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Code textarea */}
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={10}
          autoFocus
          placeholder="Paste or write code here..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#090e17',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            color: '#f8fafc',
            padding: '14px',
            fontSize: '13px',
            fontFamily: "'Fira Code', monospace",
            lineHeight: 1.5,
            outline: 'none',
            resize: 'vertical',
            marginBottom: '20px',
          }}
        />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '9px 16px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (code.trim()) {
                onCommit({ code: code.trim(), language });
              }
              onClose();
            }}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              color: 'white',
              padding: '9px 20px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>
            Add to Whiteboard
          </button>
        </div>
      </div>
    </div>
  );
}
