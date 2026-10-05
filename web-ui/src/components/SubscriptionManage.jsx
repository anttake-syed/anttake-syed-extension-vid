import React, { useState, useEffect } from 'react';
import { SERVER_URL } from '../config.js';
import { Page } from './layout/Page.jsx';
import '../styles/pages/billing.css';

export default function SubscriptionManage({ user }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchSub() {
      try {
        const res = await fetch(`${SERVER_URL}/subscription`, {
          headers: { 'Authorization': `Bearer ${user.jwt}` }
        });
        if (!res.ok) throw new Error('Failed to fetch subscription');
        const data = await res.json();
        setSub(data.subscription);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSub();
  }, [user]);

  if (loading) {
    return (
      <Page width="narrow" className="billing-page billing-page--empty" style={{ color: 'var(--text-muted)' }}>
        <div className="btn-spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px', borderTopColor: 'var(--primary)', borderRightColor: 'var(--primary)' }} />
        <p>Loading subscription details...</p>
      </Page>
    );
  }
  
  if (error) {
    return (
      <Page width="narrow" className="billing-page" style={{ textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#f87171', marginBottom: '16px' }}>error</span>
        <h2 style={{ color: 'white', margin: '0 0 12px' }}>Failed to load subscription</h2>
        <p className="break-anywhere" style={{ color: 'var(--text-dim)' }}>{error}</p>
      </Page>
    );
  }

  // Active sub
  if (sub && sub.status === 'active') {
    const isCancelAtPeriodEnd = sub.cancelAtPeriodEnd;
    
    return (
      <Page width="narrow" className="billing-page">
        <h1 className="billing-title" style={{ color: 'white' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '32px', flexShrink: 0 }}>card_membership</span>
          Subscription Management
        </h1>
        
        <div className="billing-card" style={{ background: 'var(--bg-tertiary)', border: '1px solid #334155', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div className="billing-card__head">
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Current Plan</div>
              <div className="break-anywhere" style={{ fontSize: '24px', color: 'white', fontWeight: 800 }}>{sub.planName.charAt(0).toUpperCase() + sub.planName.slice(1)} Plan</div>
            </div>
            <div style={{ background: isCancelAtPeriodEnd ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: isCancelAtPeriodEnd ? 'var(--warning)' : '#34d399', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
              {isCancelAtPeriodEnd ? 'Cancels at period end' : 'Active'}
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div className="billing-row" style={{ paddingBottom: '12px', borderBottom: '1px solid #1e293b', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Renews on</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {sub.renewsAt ? new Date(sub.renewsAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="billing-row">
              <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Cloud Quota</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {sub.Plan ? (sub.Plan.cloudStorageLimit / (1024*1024*1024)).toFixed(0) + ' GB' : 'Unlimited'}
              </span>
            </div>
          </div>
          
          <div className="billing-actions">
            {sub.updateUrl && (
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
            {sub.cancelUrl && !isCancelAtPeriodEnd && (
              <a
                href={sub.cancelUrl}
                target="_blank"
                rel="noreferrer"
                style={{ textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                Cancel Subscription
              </a>
            )}
          </div>
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
