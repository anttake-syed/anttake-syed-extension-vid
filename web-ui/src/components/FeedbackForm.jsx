import React, { useState } from 'react';
import { BACKEND_URL } from '../config';

export default function FeedbackForm({ user }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (submitted) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '40px 24px', color: '#f1f5f9', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ marginTop: 0, color: '#a5b4fc' }}>Thank you for your feedback!</h2>
        <p style={{ color: '#94a3b8' }}>We've received your message and will review it shortly.</p>
        <button
          onClick={() => { setText(''); setSubmitted(false); setError(null); }}
          style={{ marginTop: '16px', background: 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', color: 'white', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontWeight: '600' }}
        >
          Send Another
        </button>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.jwt}`,
        },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', color: '#f1f5f9', maxWidth: '600px' }}>
      <h2 style={{ marginTop: 0 }}>Submit Feedback</h2>
      <p style={{ color: '#94a3b8', marginTop: 0, marginBottom: '20px', fontSize: '14px' }}>
        Found a bug? Have a feature idea? We read every message.
      </p>

      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        Your Message
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe the issue or share your idea..."
        rows={6}
        style={{
          width: '100%', background: '#1e293b', border: '1px solid #334155',
          borderRadius: '8px', padding: '12px', color: 'white', marginBottom: '16px',
          outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontSize: '14px',
          fontFamily: 'inherit',
        }}
      />

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          id="feedback-submit-btn"
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          style={{
            background: loading || !text.trim() ? '#334155' : 'linear-gradient(135deg,#6366f1,#a855f7)',
            border: 'none', color: 'white', borderRadius: '8px',
            padding: '10px 24px', cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px', transition: 'background 0.2s',
          }}
        >
          {loading ? 'Sending...' : 'Send Feedback'}
        </button>
        <span style={{ fontSize: '12px', color: '#475569' }}>
          Sent as <strong style={{ color: '#94a3b8' }}>{user?.email}</strong>
        </span>
      </div>
    </div>
  );
}
