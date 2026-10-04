import React, { useState, useEffect } from 'react';

/**
 * SubscriptionWarningBanner
 *
 * Shows context-appropriate renewal/payment warnings based on the
 * server-computed entitlements.warningLevel. Only renders when there
 * is something actionable to show — never nags active, auto-renewing users.
 *
 * warningLevel values (set by server in computeEntitlements):
 *   'info'           — cancel scheduled, expires in 4–7 days
 *   'warning'        — cancel scheduled, expires in 2–3 days
 *   'critical'       — cancel scheduled, expires tomorrow or today
 *   'payment_failed' — last payment failed (status = past_due)
 */
export default function SubscriptionWarningBanner({ entitlements, onManageSubscription }) {
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible]     = useState(false);
  const [exiting, setExiting]     = useState(false);

  const level = entitlements?.warningLevel;

  useEffect(() => {
    if (level && !dismissed) {
      setVisible(true);
      setExiting(false);
    } else if (!level || dismissed) {
      if (visible) {
        setExiting(true);
        const t = setTimeout(() => { setVisible(false); setExiting(false); }, 350);
        return () => clearTimeout(t);
      }
    }
  }, [level, dismissed]);

  if (!visible) return null;

  const configs = {
    info: {
      bg:    'rgba(99,102,241,0.12)',
      border:'rgba(99,102,241,0.3)',
      icon:  'info',
      color: '#818cf8',
      text:  `Your Cloud plan expires in ${entitlements.daysUntilExpiry} day${entitlements.daysUntilExpiry !== 1 ? 's' : ''}. Renew to keep access.`,
    },
    warning: {
      bg:    'rgba(234,179,8,0.12)',
      border:'rgba(234,179,8,0.35)',
      icon:  'warning',
      color: '#facc15',
      text:  `Your Cloud plan expires in ${entitlements.daysUntilExpiry} day${entitlements.daysUntilExpiry !== 1 ? 's' : ''}. Renew now to avoid interruption.`,
    },
    critical: {
      bg:    'rgba(249,115,22,0.12)',
      border:'rgba(249,115,22,0.4)',
      icon:  'timer',
      color: '#fb923c',
      text:  `Your Cloud plan expires ${entitlements.daysUntilExpiry <= 0 ? 'today' : 'tomorrow'}. Renew immediately to keep access.`,
    },
    payment_failed: {
      bg:    'rgba(239,68,68,0.12)',
      border:'rgba(239,68,68,0.4)',
      icon:  'credit_card_off',
      color: '#f87171',
      text:  `We couldn't process your Cloud renewal. Update your payment method to keep Cloud active.`,
    },
  };

  const cfg = configs[level];
  if (!cfg) return null;

  return (
    <div style={{
      background:   cfg.bg,
      border:       `1px solid ${cfg.border}`,
      borderRadius: '14px',
      padding:      '12px 18px',
      marginBottom: '20px',
      display:      'flex',
      alignItems:   'center',
      gap:          '12px',
      animation:    exiting
        ? 'bannerExit 0.35s ease forwards'
        : 'bannerEnter 0.3s ease forwards',
      overflow:     'hidden',
    }}>
      <span
        className="material-symbols-rounded"
        style={{ fontSize: '20px', color: cfg.color, flexShrink: 0 }}
      >
        {cfg.icon}
      </span>

      <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', lineHeight: 1.5, flex: 1 }}>
        {cfg.text}
      </p>

      <button
        onClick={onManageSubscription}
        style={{
          flexShrink:   0,
          background:   cfg.color,
          color:        '#0f172a',
          border:       'none',
          borderRadius: '8px',
          padding:      '6px 14px',
          fontSize:     '12px',
          fontWeight:   700,
          cursor:       'pointer',
          whiteSpace:   'nowrap',
          fontFamily:   "'Outfit', sans-serif",
        }}
      >
        Manage Plan
      </button>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          flexShrink:  0,
          background:  'none',
          border:      'none',
          color:       'rgba(255,255,255,0.35)',
          cursor:      'pointer',
          fontSize:    '18px',
          lineHeight:  1,
          padding:     '0 0 0 4px',
        }}
      >
        ×
      </button>
    </div>
  );
}
