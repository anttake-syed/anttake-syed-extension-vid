import React from 'react';

/**
 * LockedFeature — Inline paywall gate.
 *
 * Renders an inline card explaining that a cloud plan is required.
 * Does NOT blur or show the underlying content (which the user cannot access).
 *
 * Props:
 *   featureName  — e.g. "Cloud Library" or "1,000 Cloud Whiteboards"
 *   description  — short description of what this feature does
 *   onUpgrade    — callback to navigate to the pricing page
 *   children     — the actual feature UI (rendered ONLY if isLocked is false)
 *   isLocked     — if false, renders children normally
 */
export default function LockedFeature({ featureName, description, onUpgrade, children, isLocked }) {
  if (!isLocked) return children;

  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '40px auto',
      padding: '0 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '999px',
          padding: '4px 14px',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#818cf8' }}>lock</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>
            CLOUD PLAN REQUIRED
          </span>
        </div>

        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: '28px', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
            {featureName}
          </h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '16px', lineHeight: 1.6, maxWidth: '600px' }}>
            {description || `Upgrade to AntCapture Cloud to unlock ${featureName} and all premium features.`}
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
          {['25 GB cloud storage', '1,000 Cloud Whiteboards', 'Cloud library', 'Search & fuzzy search', 'Sharing'].map(f => (
            <span
              key={f}
              style={{
                fontSize: '13px',
                color: '#a5b4fc',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontWeight: 500,
              }}
            >
              ✓ {f}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={onUpgrade}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              borderRadius: '12px',
              padding: '14px 28px',
              fontWeight: 700,
              fontSize: '16px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              boxShadow: '0 8px 32px rgba(99,102,241,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>bolt</span>
            Upgrade to Cloud
          </button>
          
          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
            From $12/mo &middot; Cancel anytime
          </span>
        </div>
      </div>
    </div>
  );
}
