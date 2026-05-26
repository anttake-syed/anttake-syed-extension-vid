import React from 'react';

export default function StaticPage({ title, content }) {
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '12px',
      padding: '24px',
      color: '#f1f5f9',
    }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <div style={{ lineHeight: '1.6', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    </div>
  );
}
