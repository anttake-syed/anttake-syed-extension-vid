import React, { useState, useEffect } from 'react';
import { SERVER_URL } from '../config.js';

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
      <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>
        <div className="btn-spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px', borderTopColor: '#6366f1', borderRightColor: '#6366f1' }} />
        <p>Loading subscription details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '48px', color: '#f87171', marginBottom: '16px' }}>error</span>
        <h2 style={{ color: 'white', margin: '0 0 12px' }}>Failed to load subscription</h2>
        <p style={{ color: '#94a3b8' }}>{error}</p>
      </div>
    );
  }

  // Active sub
  if (sub && sub.status === 'active') {
    const isCancelAtPeriodEnd = sub.cancelAtPeriodEnd;
    
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: 'white', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-rounded" style={{ color: '#6366f1', fontSize: '32px' }}>card_membership</span>
          Subscription Management
        </h1>
        
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Current Plan</div>
              <div style={{ fontSize: '24px', color: 'white', fontWeight: 800 }}>{sub.planName.charAt(0).toUpperCase() + sub.planName.slice(1)} Plan</div>
            </div>
            <div style={{ background: isCancelAtPeriodEnd ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: isCancelAtPeriodEnd ? '#f59e0b' : '#34d399', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
              {isCancelAtPeriodEnd ? 'Cancels at period end' : 'Active'}
            </div>
          </div>
          
          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #1e293b', marginBottom: '12px' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Renews on</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {sub.renewsAt ? new Date(sub.renewsAt).toLocaleDateString() : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px' }}>Cloud Quota</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                {sub.Plan ? (sub.Plan.cloudStorageLimit / (1024*1024*1024)).toFixed(0) + ' GB' : 'Unlimited'}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {sub.updateUrl && (
              <a
                href={sub.updateUrl}
                target="_blank"
                rel="noreferrer"
                style={{ flex: 1, textAlign: 'center', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
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
                style={{ flex: 1, textAlign: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                Cancel Subscription
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Free/No sub
  return (
    <div style={{ padding: '80px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', background: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <span className="material-symbols-rounded" style={{ fontSize: '40px', color: '#64748b' }}>star_outline</span>
      </div>
      <h2 style={{ fontSize: '28px', color: 'white', marginBottom: '12px' }}>No Active Subscription</h2>
      <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
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
    </div>
  );
}
