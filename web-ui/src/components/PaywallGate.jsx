import React, { useState, useEffect, useRef } from 'react';

/**
 * PaywallGate
 *
 * Renders a full-screen overlay when a cloud-authenticated user does not have
 * an active Cloud plan.  Two distinct states:
 *
 *  - 'new'     : User has never purchased. Gate should stay until they do.
 *  - 'expired' : User previously had a plan that has since lapsed.
 *
 * The gate is NEVER shown while the subscription is still resolving (isReady=false),
 * so paying users never see a flash on reload.
 *
 * Props:
 *  - isReady          : boolean — subscription resolved flag from useAuth
 *  - isAuthenticated  : boolean
 *  - hasCloudAccess   : boolean — true when the server confirms an active plan
 *  - entitlements     : object from useAuth
 *  - isLocalMode      : boolean
 *  - onGoToPricing    : () => void
 *  - onSignIn         : () => void
 */
export default function PaywallGate({
  isReady,
  isAuthenticated,
  hasCloudAccess,
  entitlements,
  isLocalMode,
  isGatedPage,
  onGoToPricing,
  onSignIn,
}) {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('new'); // 'new' | 'expired'
  const hasRenderedRef = useRef(false);

  useEffect(() => {
    // Never gate local-mode, unauthenticated users, or while resolving
    if (isLocalMode || !isAuthenticated || !isReady) {
      return;
    }

    if (hasCloudAccess) {
      // They have access — hide the gate (with a graceful fade-out)
      if (visible) setVisible(false);
      return;
    }

    // Determine whether this looks like an expired plan or a brand-new user.
    // We use the 'plan' field: if it was ever set to a non-free value we know
    // the server has a record of a past subscription.
    const wasEverPaid = entitlements?.plan && entitlements.plan !== 'free';
    setMode(wasEverPaid ? 'expired' : 'new');
    setVisible(true);
    hasRenderedRef.current = true;
  }, [isReady, isAuthenticated, hasCloudAccess, entitlements, isLocalMode]);

  // Only renders on the cloud-gated pages (Whiteboards / My Library) — every
  // other page stays freely usable. The component itself stays mounted across
  // navigation so `visible` doesn't reset and the pop-in animation doesn't
  // replay every time the active page changes.
  if (!visible || !isGatedPage) return null;

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(10, 10, 18, 0.92)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    animation: 'paywallFadeIn 0.4s ease',
    padding: '24px',
  };

  return (
    <>
      <style>{`
        @keyframes paywallFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes paywallSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .paywall-card {
          position: relative;
          width: 100%;
          max-width: 480px;
          border-radius: 28px;
          overflow: hidden;
          animation: paywallSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .paywall-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(123,97,255,0.22) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .paywall-body {
          position: relative;
          z-index: 1;
          background: linear-gradient(165deg, #1a1a2e 0%, #12121e 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 28px;
          padding: 48px 40px 40px;
          text-align: center;
        }
        .paywall-icon-ring {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          margin: 0 auto 24px;
        }
        .paywall-title {
          font-size: 26px;
          font-weight: 700;
          color: #f0f0fa;
          letter-spacing: -0.5px;
          margin: 0 0 12px;
          line-height: 1.2;
          font-family: 'Inter', 'Outfit', sans-serif;
        }
        .paywall-desc {
          font-size: 14.5px;
          color: #8888aa;
          line-height: 1.65;
          margin: 0 0 32px;
          font-family: 'Inter', sans-serif;
        }
        .paywall-desc strong {
          color: #b8b8d0;
          font-weight: 600;
        }
        .paywall-cta {
          display: block;
          width: 100%;
          padding: 15px 24px;
          border-radius: 14px;
          border: none;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Outfit', 'Inter', sans-serif;
          letter-spacing: 0.02em;
          transition: all 0.2s ease;
          margin-bottom: 12px;
        }
        .paywall-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(123, 97, 255, 0.45);
        }
        .paywall-cta-primary {
          background: linear-gradient(135deg, #7b61ff 0%, #5a3fe0 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(123, 97, 255, 0.35);
        }
        .paywall-cta-secondary {
          background: rgba(255,255,255,0.05);
          color: #8888aa;
          border: 1px solid rgba(255,255,255,0.08);
          font-weight: 600;
          font-size: 13px;
        }
        .paywall-cta-secondary:hover {
          background: rgba(255,255,255,0.08);
          color: #b0b0c8;
          box-shadow: none;
          transform: none;
        }
        .paywall-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 28px;
          text-align: left;
        }
        .paywall-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #9090b0;
          font-family: 'Inter', sans-serif;
        }
        .paywall-feature .check {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(123,97,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9b80ff;
          font-size: 13px;
        }
        .paywall-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.07);
          margin: 0 0 24px;
        }
        .paywall-expiry-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(249,115,22,0.12);
          border: 1px solid rgba(249,115,22,0.25);
          border-radius: 100px;
          padding: 5px 14px;
          font-size: 12px;
          font-weight: 600;
          color: #fb923c;
          font-family: 'Inter', sans-serif;
          margin-bottom: 20px;
        }
        .paywall-timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255,255,255,0.04);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 12.5px;
          color: #7070a0;
          font-family: 'Inter', sans-serif;
          border: 1px solid rgba(255,255,255,0.06);
        }
      `}</style>

      <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Subscription required">
        <div className="paywall-card">
          <div className="paywall-glow" />
          <div className="paywall-body">
            {mode === 'expired' ? (
              <ExpiredView onGoToPricing={onGoToPricing} />
            ) : (
              <NewUserView onGoToPricing={onGoToPricing} onSignIn={onSignIn} isAuthenticated={isAuthenticated} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── New User (never purchased) ────────────────────────────────────────────────
function NewUserView({ onGoToPricing, onSignIn, isAuthenticated }) {
  const features = [
    'Unlimited cloud storage for captures',
    'Share recordings with a secure link',
    'VoidBoard — infinite collaborative canvas',
    'Google Drive sync & backup',
    '14-day money-back guarantee',
  ];

  return (
    <>
      <div className="paywall-icon-ring" style={{ background: 'linear-gradient(135deg, rgba(123,97,255,0.25), rgba(90,63,224,0.15))' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '34px', color: '#9b80ff' }}>cloud_lock</span>
      </div>

      <h1 className="paywall-title">Unlock AntCapture Cloud</h1>
      <p className="paywall-desc">
        Cloud features are available on the <strong>Cloud plan</strong>.<br />
        Sign up once and your captures are safe, shareable, and accessible anywhere.
      </p>

      <div className="paywall-features">
        {features.map((f) => (
          <div key={f} className="paywall-feature">
            <span className="check material-symbols-rounded" style={{ fontSize: '13px' }}>check</span>
            {f}
          </div>
        ))}
      </div>

      <button id="paywall-upgrade-btn" className="paywall-cta paywall-cta-primary" onClick={onGoToPricing}>
        View Plans & Pricing
      </button>

      {!isAuthenticated && (
        <button id="paywall-signin-btn" className="paywall-cta paywall-cta-secondary" onClick={onSignIn}>
          Already have an account? Sign in
        </button>
      )}
    </>
  );
}

// ── Expired Plan ──────────────────────────────────────────────────────────────
function ExpiredView({ onGoToPricing }) {
  return (
    <>
      <div className="paywall-icon-ring" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.22), rgba(239,68,68,0.12))' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '34px', color: '#fb923c' }}>timer_off</span>
      </div>

      <div className="paywall-expiry-badge">
        <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>warning</span>
        Plan Expired
      </div>

      <h1 className="paywall-title">Your Cloud plan has ended</h1>
      <p className="paywall-desc">
        Your data is <strong>safe and untouched</strong> — we hold it securely for you.<br />
        Renew within <strong>30 days</strong> to restore full access instantly. After that, captures
        may be permanently removed.
      </p>

      <div className="paywall-timer">
        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>hourglass_top</span>
        Your library is preserved · Renew to get it back
      </div>

      <hr className="paywall-divider" />

      <div className="paywall-features" style={{ marginBottom: '24px' }}>
        {[
          'All your captures are still stored safely',
          'Renew now to restore access immediately',
          'No data loss if you renew within 30 days',
        ].map((f) => (
          <div key={f} className="paywall-feature">
            <span className="check material-symbols-rounded" style={{ fontSize: '13px', color: '#fb923c', background: 'rgba(249,115,22,0.15)' }}>info</span>
            {f}
          </div>
        ))}
      </div>

      <button id="paywall-renew-btn" className="paywall-cta paywall-cta-primary" onClick={onGoToPricing}
        style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}>
        Renew My Plan
      </button>
    </>
  );
}
