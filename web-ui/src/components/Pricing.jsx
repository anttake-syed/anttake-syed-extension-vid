import React, { useState, useEffect } from 'react';
import { SERVER_URL } from '../config.js';

// ── Static plan definitions (estimated) ──────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    tagline: 'Get started at no cost.',
    cta: 'Get Started',
    highlight: false,
    features: [
      { ok: true,  text: 'Unlimited screenshots & recordings' },
      { ok: true,  text: 'Local storage (self-hosted)' },
      { ok: true,  text: 'Browser extension' },
      { ok: true,  text: '1 whiteboard' },
      { ok: false, text: 'Google Drive cloud sync' },
      { ok: false, text: 'Unlimited whiteboards' },
      { ok: false, text: 'Priority support' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 7,
    priceYearly: 5,
    tagline: 'Everything you need for serious work.',
    cta: 'Upgrade to Pro',
    badge: 'BEST VALUE',
    highlight: true,
    features: [
      { ok: true, text: 'Everything in Free' },
      { ok: true, text: '10 GB Google Drive storage' },
      { ok: true, text: 'Google Drive auto-sync' },
      { ok: true, text: 'Unlimited whiteboards' },
      { ok: true, text: 'Priority support' },
      { ok: true, text: 'Early access to new features' },
    ],
  },
];

const FAQ = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes — upgrade or cancel whenever you like. Changes take effect from your next billing cycle.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Free plan data stays local on your machine. Pro syncs to your own Google Drive — we never hold your files on our servers.',
  },
  {
    q: 'What does "no infinite canvas" mean?',
    a: 'Our whiteboards use a focused, fixed-size canvas instead of endless scroll. Sessions stay clean, exports stay sharp.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We use LemonSqueezy for payments — all major credit and debit cards are supported, including Visa, Mastercard, and Amex.',
  },
];

export default function Pricing({ user, isAuthenticated, onSignIn }) {
  const [billingCycle, setBillingCycle]       = useState('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [openFaq, setOpenFaq]                 = useState(null);

  const handleSubscribe = async (plan) => {
    if (plan.id === 'free') {
      if (!isAuthenticated) onSignIn();
      return;
    }
    if (!isAuthenticated) { onSignIn(); return; }
    try {
      setCheckoutLoading(plan.id);
      const res = await fetch(`${SERVER_URL}/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.jwt}`,
        },
        body: JSON.stringify({ planName: plan.name.toLowerCase(), interval: billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      alert(err.message);
      setCheckoutLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '44px 20px 80px', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px', lineHeight: 1.15 }}>
          Two plans. No surprises.
        </h1>
        <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '440px', margin: '0 auto 32px', lineHeight: 1.7 }}>
          Start free — upgrade when you need cloud sync and unlimited boards.
        </p>

        {/* Billing toggle */}
        <div style={{ display: 'inline-flex', background: '#0f172a', padding: '4px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          {[
            { id: 'monthly', label: 'Monthly' },
            { id: 'yearly',  label: 'Yearly', badge: 'SAVE 28%' },
          ].map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setBillingCycle(id)}
              style={{
                padding: '8px 24px',
                background: billingCycle === id ? '#1e293b' : 'transparent',
                color: billingCycle === id ? 'white' : '#64748b',
                border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: billingCycle === id ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                fontFamily: "'Outfit', sans-serif", fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {label}
              {badge && (
                <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', fontSize: '10px', padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '64px' }}>
        {PLANS.map((plan) => {
          const isFree    = plan.id === 'free';
          const price     = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const isLoading = checkoutLoading === plan.id;

          return (
            <div
              key={plan.id}
              style={{
                background: plan.highlight
                  ? 'linear-gradient(160deg, #1a2347 0%, #0f172a 100%)'
                  : '#1e293b',
                border: `1px solid ${plan.highlight ? '#6366f1' : '#2d3a50'}`,
                borderRadius: '22px',
                padding: '32px',
                position: 'relative',
                boxShadow: plan.highlight
                  ? '0 24px 50px rgba(99,102,241,0.18)'
                  : '0 4px 20px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Badge */}
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', padding: '4px 18px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)', whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              {/* Plan header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: plan.highlight ? '#818cf8' : '#f8fafc', margin: '0 0 4px' }}>
                  {plan.name}
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{plan.tagline}</p>
              </div>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '48px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
                  ${price}
                </span>
                <span style={{ color: '#475569', fontWeight: 500, fontSize: '15px' }}>/mo</span>
              </div>
              {billingCycle === 'yearly' && !isFree && (
                <p style={{ fontSize: '12px', color: '#34d399', margin: '0 0 24px', fontWeight: 500 }}>
                  Billed ${price * 12}/yr — you save ${(plan.priceMonthly - plan.priceYearly) * 12}/yr
                </p>
              )}
              <div style={{ marginBottom: billingCycle === 'yearly' && !isFree ? 0 : '24px' }} />

              {/* CTA button */}
              <button
                onClick={() => handleSubscribe(plan)}
                disabled={isLoading || (isFree && isAuthenticated)}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: '12px', border: 'none',
                  background: plan.highlight
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : '#273044',
                  color: plan.highlight ? 'white' : '#94a3b8',
                  fontSize: '14px', fontWeight: 700,
                  cursor: (isFree && isAuthenticated) ? 'default' : 'pointer',
                  marginBottom: '28px',
                  fontFamily: "'Outfit', sans-serif",
                  boxShadow: plan.highlight ? '0 8px 20px rgba(99,102,241,0.3)' : 'none',
                  opacity: (isFree && isAuthenticated) ? 0.45 : 1,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (!(isFree && isAuthenticated)) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              >
                {isLoading ? (
                  <>
                    <div style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                    Processing…
                  </>
                ) : isFree && isAuthenticated ? (
                  'Current Plan'
                ) : (
                  <>
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      {isFree ? 'rocket_launch' : 'bolt'}
                    </span>
                    {plan.cta}
                  </>
                )}
              </button>

              {/* Feature list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3d4f6a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                  What's included
                </div>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '17px', color: f.ok ? '#10b981' : '#2d3a50', flexShrink: 0, marginTop: '1px' }}>
                      {f.ok ? 'check_circle' : 'remove'}
                    </span>
                    <span style={{ fontSize: '13px', color: f.ok ? '#cbd5e1' : '#3d4f6a', lineHeight: 1.5 }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Trust bar ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '64px' }}>
        {[
          { icon: 'lock',           text: 'Private by Default' },
          { icon: 'crop_free',      text: 'No Infinite Canvas' },
          { icon: 'payments',       text: 'Powered by LemonSqueezy' },
        ].map(b => (
          <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#334155' }}>{b.icon}</span>
            <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{b.text}</span>
          </div>
        ))}
      </div>

      {/* ── FAQ ── */}
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', textAlign: 'center', marginBottom: '28px' }}>
          Questions & Answers
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '640px', margin: '0 auto' }}>
          {FAQ.map((item, i) => (
            <div
              key={i}
              style={{ background: '#1e293b', border: '1px solid #2d3a50', borderRadius: '14px', overflow: 'hidden' }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                  color: '#e2e8f0', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  fontFamily: "'Outfit', sans-serif", textAlign: 'left',
                }}
              >
                {item.q}
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: '20px', color: '#475569', flexShrink: 0, transition: 'transform 0.3s ease', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}
                >
                  expand_more
                </span>
              </button>
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: openFaq === i ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.3s ease',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '0 20px 16px', color: '#64748b', fontSize: '14px', lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
