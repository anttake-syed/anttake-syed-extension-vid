import React, { useState } from 'react';

export default function WhiteboardShareModal({ board, boardName, onClose }) {
  const [copied, setCopied] = useState(false);

  const slug = (boardName || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const shareUrl = `${window.location.origin}/whiteboard/${board.id}/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.getElementById('wb-share-url-input');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  return (
    <div className="wb-overlay" style={{ zIndex: 4500 }} onClick={onClose}>
      <div
        className="wb-dialog"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '100%', background: '#0d1527', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', padding: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#a5b4fc' }}>share</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>Share Whiteboard</h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-dim)' }}>Anyone with this link can view this board</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Board Title Preview */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#6366f1' }}>space_dashboard</span>
          <span className="truncate" style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{boardName}</span>
        </div>

        {/* Copy Link Input Bar */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <input
            id="wb-share-url-input"
            readOnly
            value={shareUrl}
            onClick={e => e.target.select()}
            style={{ width: '100%', background: '#070b14', border: '1px solid #334155', borderRadius: '12px', color: '#cbd5e1', fontSize: '13px', padding: '12px 110px 12px 14px', outline: 'none', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' }}
          />
          <button
            onClick={handleCopy}
            style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: copied ? 'rgba(52,211,153,0.18)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: copied ? '1px solid rgba(52,211,153,0.4)' : 'none', color: copied ? '#34d399' : 'white', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.2s' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Footer info note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#818cf8' }}>info</span>
          <span>Shared viewers can pan, zoom, and inspect your canvas without editing your content.</span>
        </div>
      </div>
    </div>
  );
}
