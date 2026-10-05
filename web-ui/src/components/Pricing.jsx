import React, { useState } from 'react';
import { SERVER_URL } from '../config.js';
import { Page } from './layout/Page.jsx';
import '../styles/pages/pricing.css';

const GitHubLogoSVG = ({ size = 20, color = '#64748b' }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill={color} style={{ flexShrink: 0 }} aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

const CLOUD_FEATURES = [
  '25 GB cloud storage',
  'Screenshot + video capture',
  'Cloud library',
  'Whiteboard — up to 1,000 boards',
  'Up to 5,000 objects per board',
  'Search + fuzzy search',
  'Keyboard shortcuts',
  'Google Drive integration',
  'Export & sharing'
];

const SELF_HOSTED_FEATURES = [
  { text: 'Unlimited local screenshots & recordings', highlight: true },
  { text: 'Browser extension', highlight: true },
  { text: 'Local library & VoidBoard', highlight: true },
  { text: 'Self-managed storage on your own server', highlight: true },
  { text: 'Open-source — run on your infrastructure', highlight: true },
];

const FAQ = [
  {
    q: 'Can I switch between monthly and yearly billing?',
    a: 'Yes — you can switch at any time. Changes take effect from your next billing cycle.',
  },
  {
    q: 'Where is my cloud data stored?',
    a: 'Cloud plan data is stored securely on our infrastructure via GoBoard Drive. Self-hosted users keep everything on their own servers.',
  },
  {
    q: 'What happens if I cancel my Cloud plan?',
    a: 'You keep access until the end of your billing period. Your data is yours — you can export it at any time.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We use LemonSqueezy — all major credit and debit cards are supported (Visa, Mastercard, Amex).',
  },
];

export default function Pricing({ user, isAuthenticated, onSignIn, paywalled = false, subscription, entitlements, onManageSubscription }) {
  const [billing, setBilling]             = useState('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [openFaq, setOpenFaq]             = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm]     = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent]     = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  // Is this user already subscribed to cloud?
  const isSubscribed = entitlements?.cloud === true;

  // Human phrase for how much time is left in the current period.
  // entitlements.daysUntilExpiry is computed server-side (ceil of days remaining).
  const formatTimeLeft = (days) => {
    if (days === null || days === undefined) { return null; }
    if (days <= 0) { return 'today'; }
    if (days === 1) { return 'tomorrow'; }
    if (days < 7) { return `in ${days} days`; }
    if (days < 14) { return 'in 1 week'; }
    if (days < 31) { return `in ${Math.round(days / 7)} weeks`; }
    if (days < 45) { return 'in about a month'; }
    return `in ${Math.round(days / 30)} months`;
  };
  const timeLeft = formatTimeLeft(entitlements?.daysUntilExpiry);

  const yearlyPrice  = 10;
  const monthlyPrice = 12;
  const price        = billing === 'yearly' ? yearlyPrice : monthlyPrice;

  const handleSubscribe = async () => {
    if (!isAuthenticated) { onSignIn(); return; }
    setCheckoutError(null);
    try {
      setCheckoutLoading(true);
      const res = await fetch(`${SERVER_URL}/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.jwt}`,
        },
        body: JSON.stringify({ planName: 'cloud', interval: billing }),
      });
      const data = await res.json();
      if (!res.ok) {
        // data.error is always a calm, user-safe message from the server —
        // data.adminDetail (only ever present for admin accounts) carries
        // the real underlying error for debugging without exposing it to
        // everyone else.
        const err = new Error(data.error || 'Checkout failed');
        err.adminDetail = data.adminDetail;
        throw err;
      }
      window.location.href = data.checkoutUrl;
      setTimeout(() => setCheckoutLoading(false), 1000);
    } catch (err) {
      setCheckoutLoading(false);
      setCheckoutError({ message: err.message || 'Something went wrong. Please try again.', adminDetail: err.adminDetail });
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // In production, POST to a contact endpoint
    setContactSent(true);
  };

  return (
    <Page className="pricing-page" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Paywall Notice — only shown when redirected from a locked feature ── */}
      {paywalled && isAuthenticated && (
        <div className="pricing-paywall" style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '18px',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))',
            border: '1px solid rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px', color: 'var(--primary-soft)' }}>lock</span>
          </div>
          <div className="pricing-paywall__text">
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginBottom: '3px' }}>
              A subscription is required to use AntCapture Cloud
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Your account is active but you don’t have a plan yet. Choose a plan below to unlock cloud storage, whiteboards, and all premium features.
            </div>
          </div>
          <div className="pricing-paywall__account" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '6px 14px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--primary-soft)', flexShrink: 0 }}>account_circle</span>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)', minWidth: 0 }}>Signed in as <strong style={{ color: '#c7d2fe' }}>{user?.email}</strong></span>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="pricing-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '999px', padding: '5px 16px', marginBottom: '20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--primary-soft)' }}>auto_awesome</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-soft)', letterSpacing: '0.04em' }}>SIMPLE PRICING</span>
        </div>
        <h1 className="pricing-hero__title" style={{ fontWeight: 800, color: 'var(--text-main)', margin: '0 0 14px', lineHeight: 1.15 }}>
          One plan. Everything included.
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 36px', lineHeight: 1.7 }}>
          Get the full AntCapture cloud experience — capture, store, and collaborate from anywhere.
        </p>

        {/* Billing toggle — Yearly first */}
        <div className="pricing-toggle" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid #1e293b' }}>
          {[
            { id: 'yearly',  label: 'Yearly',  badge: 'SAVE 17%' },
            { id: 'monthly', label: 'Monthly' },
          ].map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setBilling(id)}
              className="pricing-toggle__btn"
              style={{
                background: billing === id ? 'var(--bg-tertiary)' : 'transparent',
                color: billing === id ? 'white' : 'var(--text-muted)',
                border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: billing === id ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                fontFamily: "'Outfit', sans-serif", fontSize: '14px',
              }}
            >
              {label}
              {badge && (
                <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Plan Cards Grid ── */}
      <div className="pricing-plans">

        {/* Cloud Plan */}
        <div className="pricing-card" style={{
          background: 'linear-gradient(160deg, #1a2347 0%, #0f172a 100%)',
          border: '1px solid #6366f1',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(99,102,241,0.2)',
        }}>
          {/* Best value / current plan badge */}
          <div className="pricing-card__badge" style={{
            background: isSubscribed
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', padding: '5px 20px', borderRadius: '999px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
            boxShadow: isSubscribed
              ? '0 4px 14px rgba(16,185,129,0.4)'
              : '0 4px 14px rgba(99,102,241,0.4)',
          }}>
            {isSubscribed ? '✓ YOUR CURRENT PLAN' : '✦ BEST VALUE — MOST POPULAR'}
          </div>

          {/* Header */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px', color: 'var(--primary-soft)' }}>cloud</span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-soft)', margin: 0 }}>Cloud</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Full-featured cloud storage, capture &amp; collaboration.
            </p>
          </div>

          {/* Price or subscription status */}
          {isSubscribed ? (
            <div style={{ margin: '22px 0 4px' }}>
              {/* Status badge */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#10b981' }}>verified</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>Active</span>
                {entitlements?.cancelAtPeriodEnd && (
                  <span style={{ fontSize: '11px', background: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.25)', borderRadius: '6px', padding: '2px 8px', fontWeight: 600 }}>
                    Cancels at period end
                  </span>
                )}
              </div>
              {/* Renewal / expiry line */}
              {entitlements?.currentPeriodEnd && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--text-faint)' }}>
                    {entitlements.cancelAtPeriodEnd ? 'calendar_today' : 'autorenew'}
                  </span>
                  <p style={{ fontSize: '13px', color: 'var(--text-faint)', margin: 0 }}>
                    {entitlements.cancelAtPeriodEnd ? 'Access until ' : 'Renews '}
                    <strong style={{ color: 'var(--text-muted)' }}>
                      {new Date(entitlements.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </strong>
                    {timeLeft && (
                      <span style={{ color: entitlements.cancelAtPeriodEnd ? '#fbbf24' : 'var(--text-faint)' }}>
                        {' · '}{entitlements.cancelAtPeriodEnd ? `expires ${timeLeft}` : `renews ${timeLeft}`}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ margin: '22px 0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '52px', fontWeight: 800, color: 'white', lineHeight: 1 }}>${price}</span>
                <span style={{ color: 'var(--text-faint)', fontWeight: 500, fontSize: '16px' }}>/mo</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-faint)', margin: '6px 0 0', fontWeight: 400 }}>
                {billing === 'yearly' ? 'Billed annually' : 'Billed monthly'}
              </p>
            </div>
          )}

          {/* CTA */}
          {isSubscribed ? (
            // Subscribed state: two calm options, no pushy cancel button here
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '20px 0 28px' }}>
              <button
                onClick={onManageSubscription}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: '10px', border: '1px solid rgba(16,185,129,0.35)',
                  background: 'rgba(16,185,129,0.08)',
                  color: '#10b981', fontSize: '14px', fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>manage_accounts</span>
                Manage subscription
              </button>
              {/* Subtle text link for cancel — keeps it professional, not aggressive */}
              <p style={{ textAlign: 'center', margin: 0, fontSize: '12px', color: '#334155' }}>
                Need to cancel?{' '}
                <button
                  onClick={onManageSubscription}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    color: 'var(--text-faint)', fontSize: '12px', textDecoration: 'underline',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Go to subscription settings
                </button>
              </p>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontSize: '15px', fontWeight: 700,
                cursor: checkoutLoading ? 'default' : 'pointer',
                margin: '24px 0 28px',
                fontFamily: "'Outfit', sans-serif",
                boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!checkoutLoading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
            >
              {checkoutLoading ? (
                <>
                  <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Processing…
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>bolt</span>
                  Get Cloud
                </>
              )}
            </button>
          )}

          {checkoutError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 14px', margin: '-16px 0 20px', fontSize: '13px', color: 'var(--danger-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>error</span>
                <span>{checkoutError.message}</span>
              </div>
              {checkoutError.adminDetail && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(239,68,68,0.2)', fontFamily: 'monospace', fontSize: '11px', color: '#f87171', wordBreak: 'break-word' }}>
                  <strong>Admin detail:</strong> {checkoutError.adminDetail}
                </div>
              )}
            </div>
          )}

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3d4f6a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
              What's included
            </div>
            {CLOUD_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '17px', color: '#10b981', flexShrink: 0 }}>check_circle</span>
                <span style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Plan */}
        <div className="pricing-card" style={{
          background: '#131c30',
          border: '1px solid #2d3a50',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px', color: 'var(--text-dim)' }}>corporate_fare</span>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Custom</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
            For large storage, specialized requirements, future teams, business requirements, etc.
          </p>

          <div style={{ margin: '0 0 24px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-dim)' }}>Contact us</span>
          </div>

          <button
            onClick={() => setShowContactForm(true)}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '12px', border: '1px solid #2d3a50',
              background: 'var(--bg-tertiary)',
              color: '#e2e8f0', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', marginBottom: '28px',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#273044'; e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = '#2d3a50'; }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>mail</span>
            Contact Us
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3d4f6a', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
              Tailored for you
            </div>
            {[
              'Custom storage quota',
              'Priority onboarding & support',
              'Team & multi-seat access',
              'SLA & compliance options',
              'Custom integrations',
              'Everything in Cloud',
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '17px', color: 'var(--primary)', flexShrink: 0 }}>check_circle</span>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Self-Hosted Banner ── */}
      <div className="pricing-selfhost" style={{
        background: '#0d1525',
        border: '1px solid #1e2d45',
        borderRadius: '18px',
      }}>
        <div className="pricing-selfhost__body">
          <div style={{ background: 'rgba(51,65,85,0.6)', borderRadius: '12px', padding: '10px', flexShrink: 0 }}>
            <GitHubLogoSVG size={24} color="#64748b" />
          </div>
          <div className="min-w-0">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Self-Hosted</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', margin: '0 0 10px', lineHeight: 1.6, maxWidth: '500px' }}>
              Free open-source version. Run AntCapture on your own infrastructure — your server, your storage, your control. No subscription needed.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SELF_HOSTED_FEATURES.map((f, i) => (
                <span key={i} style={{ 
                  fontSize: '11px', 
                  color: f.highlight ? 'var(--text-main)' : 'var(--text-dim)', 
                  background: f.highlight ? 'rgba(99,102,241,0.15)' : 'var(--bg-tertiary)', 
                  border: f.highlight ? '1px solid rgba(99,102,241,0.3)' : '1px solid #2d3a50', 
                  borderRadius: '6px', 
                  padding: '3px 10px',
                  fontWeight: f.highlight ? 600 : 400
                }}>
                  {f.text}
                </span>
              ))}
            </div>
          </div>
        </div>
        <a
          href="https://github.com/anttake-syed/anttake-syed-extension-vid"
          target="_blank"
          rel="noopener noreferrer"
          className="pricing-selfhost__link"
          style={{
            padding: '11px 22px', borderRadius: '10px',
            border: '1px solid #2d3a50', background: 'var(--bg-tertiary)',
            color: 'var(--text-dim)', textDecoration: 'none',
            fontSize: '13px', fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-faint)'; e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d3a50'; e.currentTarget.style.color = 'var(--text-dim)'; }}
        >
          <GitHubLogoSVG size={16} color="currentColor" />
          View on GitHub
          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>open_in_new</span>
        </a>
      </div>

      {/* ── FAQ ── */}
      <div className="pricing-faq">
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', textAlign: 'center', marginBottom: '28px' }}>
          Questions &amp; Answers
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '660px', margin: '0 auto' }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: 'var(--bg-tertiary)', border: '1px solid #2d3a50', borderRadius: '14px', overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="pricing-faq__q"
                style={{
                  width: '100%', padding: '16px 20px', background: 'none', border: 'none',
                  color: '#e2e8f0', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  fontFamily: "'Outfit', sans-serif", textAlign: 'left',
                }}
              >
                {item.q}
                <span className="material-symbols-rounded" style={{ fontSize: '20px', color: 'var(--text-faint)', flexShrink: 0, transition: 'transform 0.3s ease', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </button>
              <div style={{ display: 'grid', gridTemplateRows: openFaq === i ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '0 20px 16px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact Form Modal ── */}
      {showContactForm && (
        <div
          onClick={() => { setShowContactForm(false); setContactSent(false); }}
          className="pricing-modal-overlay"
          style={{
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="pricing-modal"
            style={{
              background: '#111827', border: '1px solid #1e293b',
              borderRadius: '20px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            }}
          >
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#10b981', display: 'block', marginBottom: '16px' }}>check_circle</span>
                <h3 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '20px', margin: '0 0 8px' }}>Message sent!</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 24px' }}>We'll get back to you within 1 business day.</p>
                <button onClick={() => { setShowContactForm(false); setContactSent(false); }} style={{ padding: '10px 28px', background: 'var(--bg-tertiary)', border: '1px solid #2d3a50', borderRadius: '10px', color: '#e2e8f0', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>Close</button>
              </div>
            ) : (
              <>
                <div className="pricing-modal__head">
                  <h3 style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '20px', margin: 0 }}>Contact Us — Custom Plan</h3>
                  <button onClick={() => setShowContactForm(false)} className="pricing-icon-btn" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>close</span>
                  </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
                  Tell us about your storage, team size, or any custom requirement — we'll build a plan around you.
                </p>
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Name', key: 'name', type: 'text', placeholder: 'Your name' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'you@company.com' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        type={type} required
                        placeholder={placeholder}
                        value={contactForm[key]}
                        onChange={e => setContactForm(p => ({ ...p, [key]: e.target.value }))}
                        className="pricing-input"
                        style={{ width: '100%', padding: '11px 14px', background: 'var(--bg-tertiary)', border: '1px solid #2d3a50', borderRadius: '10px', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What do you need?</label>
                    <textarea
                      required rows={4}
                      placeholder="Describe your storage needs, team size, or any custom requirements…"
                      value={contactForm.message}
                      onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                      className="pricing-input"
                      style={{ width: '100%', padding: '11px 14px', background: 'var(--bg-tertiary)', border: '1px solid #2d3a50', borderRadius: '10px', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button
                    type="submit"
                    style={{ padding: '13px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                  >
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Page>
  );
}
