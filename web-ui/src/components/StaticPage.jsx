import React from 'react';

const S = {
  section: { background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', marginBottom: '16px', maxWidth: '800px' },
};

const SectionHeader = ({ icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '20px' }}>
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#818cf8' }}>{icon}</span>
    </div>
    <div>
      <h2 style={{ margin: 0, fontWeight: '700', fontSize: '22px', color: '#f1f5f9' }}>{title}</h2>
      {subtitle && <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  </div>
);

export default function StaticPage({ title, content }) {
  const getIcon = () => {
    if (title.toLowerCase().includes('privacy'))  return 'shield';
    if (title.toLowerCase().includes('security'))  return 'lock';
    if (title.toLowerCase().includes('terms'))     return 'gavel';
    if (title.toLowerCase().includes('refund'))    return 'assignment_return';
    return 'article';
  };
  const getSubtitle = () => {
    if (title.toLowerCase().includes('privacy'))  return 'How we handle and protect your data';
    if (title.toLowerCase().includes('security'))  return 'Our security practices and standards';
    if (title.toLowerCase().includes('terms'))     return 'Your agreement with AntCapture';
    if (title.toLowerCase().includes('refund'))    return 'Our refund and cancellation policy';
    return 'Learn how to get the most out of AntCapture';
  };

  return (
    <div style={S.section} className="fadeInScale">
      <SectionHeader icon={getIcon()} title={title} subtitle={getSubtitle()} />
      <div style={{ lineHeight: '1.8', color: '#cbd5e1', whiteSpace: 'pre-wrap', fontSize: '15px' }}>
        {content}
      </div>
    </div>
  );
}
