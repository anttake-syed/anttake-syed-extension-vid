import React from 'react';

/**
 * CloudUpgradeBanner — Inline paywall notice.
 *
 * Placed at the top of pages (like Whiteboards or Library) when the user
 * doesn't have an active cloud subscription.
 */
export default function CloudUpgradeBanner({ featureName, description, onUpgrade }) {
  return (
    <div className="upsell-banner">
      {/* Decorative glow */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div className="upsell-banner__body">
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

      <div className="upsell-banner__cta">
        <button
          onClick={onUpgrade}
          className="upsell-banner__btn"
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
