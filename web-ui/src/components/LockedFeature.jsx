import React from 'react';

/**
 * LockedFeature — Inline paywall gate.
 *
 * Renders a blurred preview of the feature behind a centred overlay card.
 * The card's design matches the Dashboard upsell banner so the UI feels
 * cohesive across the whole app.
 *
 * Props:
 *   featureName  — e.g. "Cloud Library" or "Infinite Whiteboards"
 *   description  — short description of what this feature does
 *   onUpgrade    — callback to navigate to the pricing page
 *   children     — the actual feature UI (blurred behind the lock card)
 *   isLocked     — if false, renders children normally (no lock)
 */
export default function LockedFeature({ featureName, description, onUpgrade, children, isLocked }) {
  if (!isLocked) return children;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '420px', overflow: 'hidden', borderRadius: '20px' }}>

      {/* Blurred feature preview */}
      <div style={{
        filter: 'blur(5px)',
        opacity: 0.28,
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {children}
      </div>

      {/* Overlay — matches Dashboard upsell banner exactly */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(9,11,30,0.97) 0%, rgba(15,20,50,0.97) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '20px',
          padding: '36px 40px',
          maxWidth: '520px',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '32px',
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 50px rgba(99,102,241,0.06)',
        }}>

          {/* Decorative glow — same as Dashboard */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Left: text */}
          <div style={{ flex: 1, minWidth: '220px' }}>

            {/* Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '999px',
              padding: '3px 12px',
              marginBottom: '14px',
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#818cf8' }}>lock</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>
                CLOUD PLAN REQUIRED
              </span>
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.25 }}>
              {featureName}
            </h3>

            <p style={{ margin: '0 0 18px', color: '#94a3b8', fontSize: '14px', lineHeight: 1.65 }}>
              {description || `Upgrade to AntCapture Cloud to unlock ${featureName} and all premium features.`}
            </p>

            {/* Feature pills — same style as Dashboard */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {['25 GB cloud storage', 'Infinite Whiteboards', 'Cloud library', 'Sharing'].map(f => (
                <span
                  key={f}
                  style={{
                    fontSize: '12px',
                    color: '#a5b4fc',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontWeight: 500,
                  }}
                >
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>

          {/* Right: CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={onUpgrade}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                borderRadius: '12px',
                padding: '13px 24px',
                fontWeight: 700,
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 4px 24px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
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
      </div>
    </div>
  );
}
