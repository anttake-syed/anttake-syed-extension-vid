import React, { useState, useEffect, useRef } from 'react';
import '../styles/pages/billing.css';

/**
 * PurchaseSuccessToast
 *
 * Shown exactly once when the user returns from LemonSqueezy checkout
 * and their Cloud entitlement is confirmed. It auto-dismisses after 7 s.
 * No annoying modals, no retention flows — just a clean, confident signal
 * that their plan is active.
 *
 * Triggered by the custom event `antcapture:billing-success` dispatched
 * from useAuth.js after syncSubscription confirms cloud === true.
 */
export default function PurchaseSuccessToast({ entitlements }) {
  const [visible, setVisible]   = useState(false);
  const [leaving, setLeaving]   = useState(false);
  const timerRef                = useRef(null);
  const shownRef                = useRef(false);

  const dismiss = () => {
    if (!visible) return;
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, 400);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    const handler = () => {
      // Only show once per page load
      if (shownRef.current) return;
      shownRef.current = true;
      setVisible(true);
      setLeaving(false);
      timerRef.current = setTimeout(dismiss, 7000);
    };

    window.addEventListener('antcapture:billing-success', handler);
    return () => {
      window.removeEventListener('antcapture:billing-success', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  const renewDate = entitlements?.currentPeriodEnd
    ? new Date(entitlements.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div
      className="toast purchase-toast"
      style={{
        // Animate in/out
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'translateY(16px)' : 'translateY(0)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',

        // Card styling
        background: 'linear-gradient(135deg, #0d1f14 0%, #0a1a10 100%)',
        border: '1px solid rgba(16,185,129,0.35)',
        borderRadius: '18px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.08), 0 8px 32px rgba(16,185,129,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Top green progress bar — drains over 7 s */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'rgba(16,185,129,0.25)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            animation: 'shrink-bar 7s linear forwards',
          }}
        />
      </div>

      <div style={{ padding: '20px 20px 20px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Icon */}
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(52,211,153,0.15))',
            border: '1px solid rgba(16,185,129,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#10b981' }}>
              verified
            </span>
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#ecfdf5', marginBottom: '3px', fontFamily: "'Outfit', sans-serif" }}>
              AntCapture Cloud is active
            </div>
            <div style={{ fontSize: '13px', color: '#6ee7b7', lineHeight: 1.5, fontFamily: "'Outfit', sans-serif" }}>
              {renewDate
                ? `Your plan renews on ${renewDate}.`
                : 'All Cloud features are now unlocked.'}
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="purchase-toast__close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, color: 'var(--success)', opacity: 0.6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
          {['Cloud storage', 'Sync', 'Whiteboards'].map(f => (
            <span key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '999px', padding: '3px 10px',
              fontSize: '11px', fontWeight: 600, color: '#34d399',
              fontFamily: "'Outfit', sans-serif",
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>check</span>
              {f}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}
