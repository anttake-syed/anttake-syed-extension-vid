import React, { useState, useEffect } from 'react';
import { SERVER_URL } from '../config.js';
import { Page } from './layout/Page.jsx';
import '../styles/pages/billing.css';

export default function SubscriptionManage({
  user,
  initialSubscription = null,
  initialEntitlements = null,
  onSubscriptionUpdate = null
}) {
  const [sub, setSub] = useState(initialSubscription);
  const [entitlements, setEntitlements] = useState(initialEntitlements);
  const [loading, setLoading] = useState(!initialEntitlements);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSub = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/subscription`, {
        headers: { 'Authorization': `Bearer ${user.jwt}` }
      });
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = await res.json();
      setSub(data.subscription);
      setEntitlements(data.entitlements);
      if (onSubscriptionUpdate) {
        onSubscriptionUpdate(user.jwt, user.sub || user.email);
      }
    } catch (err) {
      if (!entitlements) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSub();
  }, [user]);

  if (loading && !entitlements) {
    return (
      <Page width="narrow" className="billing-page billing-page--empty" style={{ color: 'var(--text-muted)' }}>
        <div className="btn-spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px', borderTopColor: 'var(--primary)', borderRightColor: 'var(--primary)' }} />
        <p>Loading subscription details...</p>
      </Page>
    );
  }

  if (error && !entitlements) {
    return (
      <Page width="narrow" className="billing-page" style={{ textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#f87171', marginBottom: '16px' }}>error</span>
        <h2 style={{ color: 'white', margin: '0 0 12px' }}>Failed to load subscription</h2>
        <p className="break-anywhere" style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>{error}</p>
        <button
          onClick={() => { setLoading(true); fetchSub(); }}
          style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>refresh</span>
          Retry
        </button>
      </Page>
    );
  }

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState(null);

  async function handleCancelSubscription() {
    setCancelling(true);
    setCancelMessage(null);
    try {
      const res = await fetch(`${SERVER_URL}/subscription/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.jwt}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      setSub(data.subscription);
      setEntitlements(data.entitlements);
      if (onSubscriptionUpdate) {
        onSubscriptionUpdate(user.jwt, user.sub || user.email);
      }
      setConfirmCancelOpen(false);
    } catch (err) {
      setCancelMessage({ type: 'error', text: err.message });
    } finally {
      setCancelling(false);
    }
  }

  if (entitlements && entitlements.cloud) {
    const isCancelAtPeriodEnd = entitlements.cancelAtPeriodEnd;
    
    return (
      <Page width="narrow" className="billing-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h1 className="billing-title" style={{ color: 'white', margin: 0 }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '32px', flexShrink: 0 }}>card_membership</span>
            Subscription Management
          </h1>
          <button
            type="button"
            title="Refresh status"
            onClick={() => fetchSub(true)}
            disabled={refreshing}
            style={{
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: 'var(--text-dim)',
              padding: '8px 12px',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { if (!refreshing) e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { if (!refreshing) e.currentTarget.style.color = 'var(--text-dim)'; }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>sync</span>
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
        
        <div className="billing-card" style={{ background: 'var(--bg-tertiary)', border: '1px solid #334155', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div className="billing-card__head">
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Current Plan</div>
              <div className="break-anywhere" style={{ fontSize: '24px', color: 'white', fontWeight: 800 }}>{entitlements.plan.charAt(0).toUpperCase() + entitlements.plan.slice(1)} Plan</div>
            </div>
            <div style={{ background: isCancelAtPeriodEnd ? 'rgba(100,116,139,0.15)' : 'rgba(16,185,129,0.15)', color: isCancelAtPeriodEnd ? '#94a3b8' : '#34d399', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
              {isCancelAtPeriodEnd ? 'Access ends at period end' : 'Active'}
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div className="billing-row" style={{ paddingBottom: '12px', borderBottom: '1px solid #1e293b', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>{isCancelAtPeriodEnd ? 'Expires on' : 'Renews on'}</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {entitlements.currentPeriodEnd ? new Date(entitlements.currentPeriodEnd).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="billing-row">
              <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Cloud Quota</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {sub?.Plan ? (sub.Plan.cloudStorageLimit / (1024*1024*1024)).toFixed(0) + ' GB' : 'Unlimited'}
              </span>
            </div>
            {isCancelAtPeriodEnd && (
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: '8px', color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>info</span>
                  <span>Your plan access will continue until the end of your billing period. You can re-subscribe at any time.</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', paddingLeft: '26px' }}>
                  📁 Your captures and data remain stored for 30 days after access ends — download them anytime during this window.
                </div>
              </div>
            )}
          </div>
          
          <div className="billing-actions">
            {sub && sub.updateUrl && (
              <a
                href={sub.updateUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textAlign: 'center', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--primary-soft)', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.15)'}
              >
                Update Payment Method
              </a>
            )}
            {!isCancelAtPeriodEnd && (
              <button
                type="button"
                onClick={() => { setCancelMessage(null); setConfirmCancelOpen(true); }}
                style={{ textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmCancelOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                  <span className="material-symbols-rounded">warning</span>
                </div>
                <h3 style={{ margin: 0, color: 'white', fontSize: '18px', fontWeight: 700 }}>Cancel Subscription?</h3>
              </div>

              <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px' }}>
                Are you sure you want to cancel your AntCapture Cloud subscription?
              </p>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.5' }}>
                ✨ <strong>You will keep full access</strong> to Cloud storage, Screen recording sync, and Whiteboards until <strong>{entitlements.currentPeriodEnd ? new Date(entitlements.currentPeriodEnd).toLocaleDateString() : 'the end of your period'}</strong>. No further charges will occur.
              </div>

              {/* Refund Info & Contact */}
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a5b4fc', fontWeight: 600, marginBottom: '4px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>help_outline</span>
                  Looking for a refund?
                </div>
                Cancelling stops renewals. If you purchased within the last 14 days and want a full refund, contact us via{' '}
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSdoXSIVDaVBnik4oA3CsIigkfa6PcJshfH7dRTqrkDnn9Kj7g/viewform" target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Feedback Form</a>{' '}or email{' '}
                <a href={`mailto:support@antcapture.com?subject=Refund%20Request%20-%20${encodeURIComponent(user?.email || '')}&body=Hi%20AntCapture%20Team,%0A%0AI%20would%20like%20to%20request%20a%20refund%20for%20my%20Cloud%20subscription%20associated%20with%20${encodeURIComponent(user?.email || '')}.%0A%0AThank%20you!`} style={{ color: '#818cf8', textDecoration: 'underline' }}>
                  support@antcapture.com
                </a>.
              </div>

              {cancelMessage && (
                <div style={{ marginBottom: '16px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '13px' }}>
                  {cancelMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setConfirmCancelOpen(false)}
                  style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Keep Subscription
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelSubscription}
                  style={{ background: '#ef4444', border: 'none', color: 'white', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {cancelling ? (
                    <>
                      <div className="btn-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                      Cancelling...
                    </>
                  ) : (
                    'End Subscription'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Billing Support / Refund Card */}
        <div style={{ marginTop: '24px', background: 'var(--bg-secondary)', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-soft)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>mail</span>
            </div>
            <div>
              <div style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>Billing or Refund Questions?</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>14-day money-back guarantee applies to new subscriptions.</div>
            </div>
          </div>
          <a
            href={`mailto:support@antcapture.com?subject=Billing%20Support%20-%20${encodeURIComponent(user?.email || '')}`}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>send</span>
            Contact Support
          </a>
        </div>
      </Page>
    );
  }

  // Free/No sub
  return (
    <Page width="narrow" className="billing-page billing-page--empty">
      <div style={{ width: '80px', height: '80px', background: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '40px', color: 'var(--text-muted)' }}>star_outline</span>
      </div>
      <h2 className="billing-heading" style={{ color: 'white', marginBottom: '12px' }}>No Active Subscription</h2>
      <p style={{ color: 'var(--text-dim)', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
        Subscribe to an AntCapture Cloud plan to unlock unlimited cloud storage, screen recording sync, and the Whiteboard Editor.
      </p>
      <a
        href="/pricing"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '14px 28px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 24px rgba(99,102,241,0.3)', transition: 'transform 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
      >
        View Plans & Upgrade <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>arrow_forward</span>
      </a>
    </Page>
  );
}
