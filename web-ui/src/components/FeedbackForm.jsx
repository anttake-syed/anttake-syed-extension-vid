import React, { useState } from 'react';
import { SERVER_URL } from '../config';

const S = {
  section: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', maxWidth: '620px' },
  label: { fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', display: 'block' },
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-symbols-rounded" style={{ fontSize: '22px', color: '#818cf8' }}>{icon}</span>
    </div>
    <div>
      <h2 style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#f1f5f9' }}>{title}</h2>
      {subtitle && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>}
    </div>
  </div>
);

export default function FeedbackForm({ user }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (submitted) {
    return (
      <div style={{ ...S.section, textAlign: 'center', padding: '48px 24px' }} className="fadeInScale">
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#34d399' }}>check_circle</span>
        </div>
        <h2 style={{ margin: '0 0 12px', color: '#f8fafc', fontSize: '22px' }}>Thank you!</h2>
        <p style={{ color: '#94a3b8', fontSize: '15px', marginBottom: '24px' }}>Your feedback has been received. We review every message carefully.</p>
        <button
          onClick={() => { setText(''); setSubmitted(false); setError(null); }}
          style={{ background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
          onMouseLeave={e => e.currentTarget.style.background = '#0f172a'}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>refresh</span> Send Another
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!text.trim()) {return;}
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.jwt}`,
        },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {throw new Error(data.error || 'Failed to submit feedback');}
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.section} className="fadeInScale">
      <SectionHeader icon="chat_bubble" title="Submit Feedback" subtitle="Found a bug or have a feature idea? We want to hear it." />

      <label style={S.label}>Your Message</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe the issue or share your idea..."
        rows={6}
        style={{
          width: '100%', background: '#0f172a', border: '1px solid #334155',
          borderRadius: '12px', padding: '16px', color: '#f1f5f9', marginBottom: '20px',
          outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontSize: '14px',
          fontFamily: 'inherit', transition: 'border-color 0.2s'
        }}
        onFocus={e => e.target.style.borderColor = '#6366f1'}
        onBlur={e => e.target.style.borderColor = '#334155'}
      />

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#f87171', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>error</span> {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          style={{
            background: loading || !text.trim() ? '#334155' : 'linear-gradient(135deg,#6366f1,#a855f7)',
            border: 'none', color: 'white', borderRadius: '10px',
            padding: '12px 28px', cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
            opacity: loading || !text.trim() ? 0.7 : 1
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>send</span>
          {loading ? 'Sending...' : 'Send Feedback'}
        </button>
        <span style={{ fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>account_circle</span>
          Sent as <strong style={{ color: '#94a3b8', fontWeight: '500' }}>{user?.email}</strong>
        </span>
      </div>
    </div>
  );
}
