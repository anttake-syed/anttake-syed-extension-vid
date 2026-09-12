import React from 'react';

/**
 * CloudUpgradeBanner — Inline paywall notice.
 *
 * Placed at the top of pages (like Whiteboards or Library) when the user
 * doesn't have an active cloud subscription.
 */
export default function CloudUpgradeBanner({ featureName, description, onUpgrade }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: '20px',
      padding: '28px 32px',
      margin: '0 0 28px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      flexWrap: 'wrap',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Decorative glow */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ flex: 1, minWidth: '260px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', padding: '3px 12px', marginBottom: '12px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#818cf8' }}>lock</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>CLOUD PLAN REQUIRED</span>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
          {featureName}
        </h3>
        <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
          {description || `Upgrade to AntCapture Cloud to unlock ${featureName} and all premium features.`}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['25 GB cloud storage', '1,000 Cloud Whiteboards', 'Cloud library', 'Search & fuzzy search', 'Sharing'].map(f => (
            <span key={f} style={{ fontSize: '12px', color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '6px', padding: '3px 10px', fontWeight: 500 }}>
              ✓ {f}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start', flexShrink: 0 }}>
        <button
          onClick={onUpgrade}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', borderRadius: '12px', padding: '13px 24px',
            fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
            fontFamily: "'Outfit', sans-serif",
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>bolt</span>
          Upgrade to Cloud
        </button>
        <span style={{ fontSize: '12px', color: '#475569', paddingLeft: '4px' }}>
          From $12/mo &middot; Cancel anytime
        </span>
      </div>
    </div>
  );
}
