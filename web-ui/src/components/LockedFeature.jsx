import React from 'react';

/**
 * LockedFeature — Premium glassmorphic paywall overlay.
 *
 * Wraps a feature section and shows a lock overlay when the user
 * doesn't have cloud access. The underlying content is blurred/dimmed
 * to hint that the feature exists but isn't available.
 *
 * Props:
 *   featureName  — "Whiteboards", "Cloud Library", etc.
 *   description  — short description of what this feature does
 *   onUpgrade    — callback to navigate to the pricing page
 *   children     — the actual feature UI (shown blurred behind the lock)
 *   isLocked     — if false, renders children normally (no lock)
 */
export default function LockedFeature({ featureName, description, onUpgrade, onSignOut, children, isLocked }) {
  if (!isLocked) return children;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '400px' }}>
      {/* Blurred feature preview */}
      <div style={{
        filter: 'blur(6px)',
        opacity: 0.35,
        pointerEvents: 'none',
        userSelect: 'none',
        overflow: 'hidden',
        borderRadius: '16px',
      }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}>
        <div style={{
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '24px',
          padding: '48px 40px',
          maxWidth: '420px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.08)',
        }}>
          {/* Lock icon with glow */}
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(99,102,241,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 30px rgba(99,102,241,0.2)',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '34px', color: '#818cf8' }}>
              lock
            </span>
          </div>

          {/* Cloud badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '999px',
            padding: '4px 14px',
            marginBottom: '16px',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#818cf8' }}>
              cloud
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.05em' }}>
              CLOUD PLAN REQUIRED
            </span>
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#f8fafc',
            margin: '0 0 10px',
            lineHeight: 1.2,
          }}>
            {featureName}
          </h2>

          <p style={{
            fontSize: '14px',
            color: '#64748b',
            margin: '0 0 32px',
            lineHeight: 1.7,
          }}>
            {description || `Upgrade to AntCapture Cloud to unlock ${featureName} and all premium features.`}
          </p>

          <button
            onClick={onUpgrade}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              marginBottom: '16px',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>bolt</span>
            Upgrade to Cloud
          </button>

          {onSignOut && (
            <button
              onClick={onSignOut}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: '#94a3b8',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s',
                marginBottom: '12px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              Sign out
            </button>
          )}

          <p style={{ fontSize: '12px', color: '#334155', margin: 0 }}>
            From $10/mo · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
