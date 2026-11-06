import React, { useState } from 'react';

/**
 * WhiteboardShareModal
 *
 * Two sharing tiers:
 *  - View Only  : anyone with the link can view (pan/zoom) the board.
 *  - Edit Access: recipients who also hold an active Cloud plan can edit.
 *
 * The Edit tab is accessible only when the OWNER has a Cloud plan.
 * Free users see the Edit tab locked with an upgrade prompt.
 */
export default function WhiteboardShareModal({ board, boardName, user, onClose }) {
  const [shareMode, setShareMode] = useState('view'); // 'view' | 'edit'
  const [copied, setCopied]       = useState(false);

  // Determine whether the current owner has Cloud access.
  // We check a few possible shapes of the user object.
  const ownerIsPaid = Boolean(
    (user?.plan && user.plan !== 'free') ||
    user?.hasCloudAccess ||
    user?.entitlements?.hasCloudAccess
  );

  const slug = (boardName || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const baseUrl  = `${window.location.origin}/whiteboard/${board.id}/${slug}`;
  const shareUrl = shareMode === 'edit'
    ? `${baseUrl}?access=edit`
    : `${baseUrl}?access=view`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers that block clipboard API
      const input = document.getElementById('wb-share-url-input');
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const handleTabClick = (mode) => {
    if (mode === 'edit' && !ownerIsPaid) return; // locked for free users
    setShareMode(mode);
    setCopied(false);
  };

  // ── Tab styles ────────────────────────────────────────────────
  const tabBase = {
    flex: 1,
    padding: '8px 12px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.18s',
    fontFamily: "'Outfit', sans-serif",
  };

  const tabView = {
    ...tabBase,
    background: shareMode === 'view' ? 'rgba(99,102,241,0.18)' : 'transparent',
    color:      shareMode === 'view' ? '#a5b4fc' : '#64748b',
    border:     shareMode === 'view' ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
  };

  const tabEdit = {
    ...tabBase,
    background: shareMode === 'edit' ? 'rgba(168,85,247,0.18)' : 'transparent',
    color:      shareMode === 'edit' ? '#c4b5fd' : ownerIsPaid ? '#64748b' : '#475569',
    border:     shareMode === 'edit' ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
    cursor:     ownerIsPaid ? 'pointer' : 'not-allowed',
    opacity:    ownerIsPaid ? 1 : 0.65,
  };

  return (
    <div className="wb-overlay" style={{ zIndex: 4500 }} onClick={onClose}>
      <div
        className="wb-dialog"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          background: '#0d1527',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '24px',
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#a5b4fc' }}>share</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>Share Whiteboard</h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-dim)' }}>Choose who can access this board</p>
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

        {/* ── Board Title Preview ── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#6366f1' }}>space_dashboard</span>
          <span className="truncate" style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{boardName}</span>
        </div>

        {/* ── Permission Tabs ── */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '5px', marginBottom: '16px' }}>
          {/* View Only */}
          <button
            style={tabView}
            onClick={() => handleTabClick('view')}
            title="Anyone with this link can view the board"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>visibility</span>
            View Only
          </button>

          {/* Edit Access */}
          <button
            style={tabEdit}
            onClick={() => handleTabClick('edit')}
            title={ownerIsPaid
              ? 'Share an edit link — recipients need an active Cloud plan to edit'
              : 'Upgrade to Cloud to share edit access'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
            Edit Access
            {ownerIsPaid ? (
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: 'white', borderRadius: '5px', padding: '1px 6px', letterSpacing: '0.03em' }}>
                CLOUD
              </span>
            ) : (
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: 'white', borderRadius: '5px', padding: '1px 6px', letterSpacing: '0.03em' }}>
                PRO
              </span>
            )}
          </button>
        </div>

        {/* ── Mode Description ── */}
        {shareMode === 'view' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#818cf8', flexShrink: 0, marginTop: '1px' }}>info</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Anyone with this link can <strong style={{ color: '#c7d2fe' }}>pan, zoom, and inspect</strong> the canvas — no editing allowed.
              {!ownerIsPaid && (
                <span style={{ display: 'block', marginTop: '5px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#fbbf24', verticalAlign: 'middle' }}>lock</span>{' '}
                  <strong style={{ color: '#fcd34d' }}>Edit Access links</strong> require a{' '}
                  <a href="/pricing" style={{ color: '#f59e0b', textDecoration: 'underline', cursor: 'pointer' }}>Cloud plan</a>.
                </span>
              )}
            </span>
          </div>
        )}

        {shareMode === 'edit' && ownerIsPaid && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#c084fc', flexShrink: 0, marginTop: '1px' }}>shield_person</span>
            <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Recipients who also have an active <strong style={{ color: '#c4b5fd' }}>Cloud plan</strong> can edit this board. Everyone else will be downgraded to view-only automatically.
            </span>
          </div>
        )}

        {/* ── Copy Link Input Bar ── */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <input
            id="wb-share-url-input"
            readOnly
            value={shareUrl}
            onClick={e => e.target.select()}
            style={{
              width: '100%',
              background: '#070b14',
              border: `1px solid ${shareMode === 'edit' ? 'rgba(168,85,247,0.3)' : '#334155'}`,
              borderRadius: '12px',
              color: '#cbd5e1',
              fontSize: '13px',
              padding: '12px 110px 12px 14px',
              outline: 'none',
              fontFamily: "'Outfit', sans-serif",
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
              background: copied
                ? 'rgba(52,211,153,0.18)'
                : shareMode === 'edit'
                  ? 'linear-gradient(135deg,#8b5cf6,#a855f7)'
                  : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: copied ? '1px solid rgba(52,211,153,0.4)' : 'none',
              color: copied ? '#34d399' : 'white',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.2s',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* ── Access mode status chip ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em',
              borderRadius: '6px', padding: '3px 9px',
              background: shareMode === 'edit' ? 'rgba(168,85,247,0.12)' : 'rgba(99,102,241,0.1)',
              color:      shareMode === 'edit' ? '#c4b5fd' : '#818cf8',
              border:     shareMode === 'edit' ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
              {shareMode === 'edit' ? 'edit' : 'visibility'}
            </span>
            {shareMode === 'edit' ? 'Edit — Cloud plan required to edit' : 'View only — anyone can view'}
          </span>
        </div>
      </div>
    </div>
  );
}

