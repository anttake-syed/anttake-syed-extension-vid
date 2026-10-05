import React from 'react';
import { Page } from './layout/Page.jsx';
import '../styles/pages/settings.css';

const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="static-card__head">
    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-symbols-rounded" style={{ fontSize: '24px', color: 'var(--primary-soft)' }}>{icon}</span>
    </div>
    <div className="min-w-0">
      <h2 className="static-card__title" style={{ fontWeight: '700', color: '#f1f5f9' }}>{title}</h2>
      {subtitle && <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>{subtitle}</div>}
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
    <Page width="narrow">
      <div className="static-card fadeInScale">
        <SectionHeader icon={getIcon()} title={title} subtitle={getSubtitle()} />
        <div className="static-card__body" style={{ color: '#cbd5e1' }}>
          {content}
        </div>
      </div>
    </Page>
  );
}
