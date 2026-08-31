import React, { useState } from 'react';
import { SERVER_URL } from '../config.js';

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
  'Unlimited local screenshots & recordings',
  'Browser extension',
  'Local library & VoidBoard',
  'Self-managed storage on your own server',
  'Open-source — run on your infrastructure',
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

export default function Pricing({ user, isAuthenticated, onSignIn }) {
  const [billing, setBilling]             = useState('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [openFaq, setOpenFaq]             = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm]     = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent]     = useState(false);

  const yearlyPrice  = 10;
  const monthlyPrice = 12;
  const price        = billing === 'yearly' ? yearlyPrice : monthlyPrice;

  const handleSubscribe = async () => {
    if (!isAuthenticated) { onSignIn(); return; }
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
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      alert(err.message);
      setCheckoutLoading(false);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // In production, POST to a contact endpoint
    setContactSent(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 20px 100px', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', marginBottom: '44px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '999px', padding: '5px 16px', marginBottom: '20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: '#818cf8' }}>auto_awesome</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#818cf8', letterSpacing: '0.04em' }}>SIMPLE PRICING</span>
        </div>
        <h1 style={{ fontSize: '40px', fontWeight: 800, color: '#f8fafc', margin: '0 0 14px', lineHeight: 1.15 }}>
          One plan. Everything included.
        </h1>
        <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '420px', margin: '0 auto 36px', lineHeight: 1.7 }}>
          Get the full AntCapture cloud experience — capture, store, and collaborate from anywhere.
        </p>

        {/* Billing toggle — Yearly first */}
        <div style={{ display: 'inline-flex', background: '#0f172a', padding: '4px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          {[
            { id: 'yearly',  label: 'Yearly',  badge: 'SAVE 17%' },
            { id: 'monthly', label: 'Monthly' },
          ].map(({ id, label, badge }) => (
            <button
              key={id}
              onClick={() => setBilling(id)}
              style={{
                padding: '9px 26px',
                background: billing === id ? '#1e293b' : 'transparent',
                color: billing === id ? 'white' : '#64748b',
                border: 'none', borderRadius: '8px',
                fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: billing === id ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                fontFamily: "'Outfit', sans-serif", fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '8px',
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px', marginBottom: '72px', alignItems: 'start' }}>

        {/* Cloud Plan */}
        <div style={{
          background: 'linear-gradient(160deg, #1a2347 0%, #0f172a 100%)',
          border: '1px solid #6366f1',
          borderRadius: '22px', padding: '36px',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(99,102,241,0.2)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Best value badge */}
          <div style={{
            position: 'absolute', top: '-14px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', padding: '5px 20px', borderRadius: '999px',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em',
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)', whiteSpace: 'nowrap',
          }}>
            ✦ BEST VALUE — MOST POPULAR
          </div>

          {/* Header */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#818cf8' }}>cloud</span>
              <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#818cf8', margin: 0 }}>Cloud</h2>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Full-featured cloud storage, capture &amp; collaboration.
            </p>
          </div>

          {/* Price */}
          <div style={{ margin: '22px 0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '52px', fontWeight: 800, color: 'white', lineHeight: 1 }}>${price}</span>
              <span style={{ color: '#475569', fontWeight: 500, fontSize: '16px' }}>/mo</span>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '6px 0 0', fontWeight: 400 }}>
              {billing === 'yearly' ? 'Billed annually' : 'Billed monthly'}
            </p>
          </div>

          {/* CTA */}
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
        <div style={{
          background: '#131c30',
          border: '1px solid #2d3a50',
          borderRadius: '22px', padding: '36px',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#94a3b8' }}>corporate_fare</span>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Custom</h2>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 24px', lineHeight: 1.6 }}>
            For large storage, specialized requirements, future teams, business requirements, etc.
          </p>

          <div style={{ margin: '0 0 24px' }}>
            <span style={{ fontSize: '32px', fontWeight: 800, color: '#94a3b8' }}>Contact us</span>
          </div>

          <button
            onClick={() => setShowContactForm(true)}
            style={{
              width: '100%', padding: '14px',
              borderRadius: '12px', border: '1px solid #2d3a50',
              background: '#1e293b',
              color: '#e2e8f0', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', marginBottom: '28px',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#273044'; e.currentTarget.style.borderColor = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#2d3a50'; }}
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
                <span className="material-symbols-rounded" style={{ fontSize: '17px', color: '#6366f1', flexShrink: 0 }}>check_circle</span>
                <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Self-Hosted Banner ── */}
      <div style={{
        background: '#0d1525',
        border: '1px solid #1e2d45',
        borderRadius: '18px', padding: '28px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '24px', flexWrap: 'wrap',
        marginBottom: '72px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ background: 'rgba(51,65,85,0.6)', borderRadius: '12px', padding: '10px', flexShrink: 0 }}>
            <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#64748b', display: 'block' }}>dns</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>Self-Hosted</h3>
              <span style={{ background: 'rgba(100,116,139,0.2)', color: '#64748b', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>FREE</span>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 10px', lineHeight: 1.6, maxWidth: '500px' }}>
              Free open-source version. Run AntCapture on your own infrastructure — your server, your storage, your control. No subscription needed.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SELF_HOSTED_FEATURES.map((f, i) => (
                <span key={i} style={{ fontSize: '11px', color: '#475569', background: '#1e293b', border: '1px solid #2d3a50', borderRadius: '6px', padding: '3px 10px' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '10px',
            border: '1px solid #2d3a50', background: '#1e293b',
            color: '#94a3b8', textDecoration: 'none',
            fontSize: '13px', fontWeight: 600,
            transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2d3a50'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>open_in_new</span>
          View on GitHub
        </a>
      </div>

      {/* ── FAQ ── */}
      <div style={{ marginBottom: '72px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', textAlign: 'center', marginBottom: '28px' }}>
          Questions &amp; Answers
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '660px', margin: '0 auto' }}>
          {FAQ.map((item, i) => (
            <div key={i} style={{ background: '#1e293b', border: '1px solid #2d3a50', borderRadius: '14px', overflow: 'hidden' }}>
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
                <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#475569', flexShrink: 0, transition: 'transform 0.3s ease', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>
                  expand_more
                </span>
              </button>
              <div style={{ display: 'grid', gridTemplateRows: openFaq === i ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s ease' }}>
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

      {/* ── Contact Form Modal ── */}
      {showContactForm && (
        <div
          onClick={() => { setShowContactForm(false); setContactSent(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111827', border: '1px solid #1e293b',
              borderRadius: '20px', padding: '36px',
              width: '100%', maxWidth: '480px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
            }}
          >
            {contactSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#10b981', display: 'block', marginBottom: '16px' }}>check_circle</span>
                <h3 style={{ color: '#f8fafc', fontWeight: 700, fontSize: '20px', margin: '0 0 8px' }}>Message sent!</h3>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>We'll get back to you within 1 business day.</p>
                <button onClick={() => { setShowContactForm(false); setContactSent(false); }} style={{ padding: '10px 28px', background: '#1e293b', border: '1px solid #2d3a50', borderRadius: '10px', color: '#e2e8f0', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <h3 style={{ color: '#f8fafc', fontWeight: 700, fontSize: '20px', margin: 0 }}>Contact Us — Custom Plan</h3>
                  <button onClick={() => setShowContactForm(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>close</span>
                  </button>
                </div>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px', lineHeight: 1.6 }}>
                  Tell us about your storage, team size, or any custom requirement — we'll build a plan around you.
                </p>
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { label: 'Name', key: 'name', type: 'text', placeholder: 'Your name' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'you@company.com' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                      <input
                        type={type} required
                        placeholder={placeholder}
                        value={contactForm[key]}
                        onChange={e => setContactForm(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width: '100%', padding: '11px 14px', background: '#1e293b', border: '1px solid #2d3a50', borderRadius: '10px', color: '#f8fafc', fontSize: '14px', fontFamily: "'Outfit', sans-serif", outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What do you need?</label>
                    <textarea
                      required rows={4}
                      placeholder="Describe your storage needs, team size, or any custom requirements…"
                      value={contactForm.message}
                      onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                      style={{ width: '100%', padding: '11px 14px', background: '#1e293b', border: '1px solid #2d3a50', borderRadius: '10px', color: '#f8fafc', fontSize: '14px', fontFamily: "'Outfit', sans-serif", outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
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
    </div>
  );
}
