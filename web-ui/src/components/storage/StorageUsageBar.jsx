import React from 'react';

/**
 * StorageUsageBar — modular presentation for the bottom dashboard storage health bars.
 * Consumes the standardized state from StorageService.
 */
export default function StorageUsageBar({ storageState, icon, extraInfo, ctaLabel, onCtaClick, ctaHref }) {
  if (!storageState || storageState.status === 'loading') {
    return null; // hide if no data
  }

  const { status, usedFormatted, totalFormatted, percentage, label, planName, hasNoLimit } = storageState;
  // Only offer the upgrade path once storage is actually full — not at
  // near_limit, so it doesn't nag before it's actually blocking anything.
  const showCta = status === 'full' && (onCtaClick || ctaHref);
  
  const isWarning = status === 'near_limit' || status === 'full';
  const color = isWarning ? '#f87171' : '#818cf8';

  // Same #6366f1 → #a855f7 brand gradient as AntCaptureCloudLogoSVG, so the
  // cloud storage bar visually matches the cloud badge shown elsewhere.
  let gradient = 'linear-gradient(90deg,#6366f1,#8b5cf6)'; // local
  if (storageState.type === 'cloud') gradient = 'linear-gradient(90deg,#6366f1,#a855f7)';
  if (isWarning) gradient = 'linear-gradient(90deg,#f87171,#ef4444)';

  return (
    <div className="storage-bar">
      <div className="storage-bar__icon">
        {typeof icon === 'string' ? (
          <span className="material-symbols-rounded" style={{ fontSize: '20px', color }}>{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div className="storage-bar__body">
        <div className="storage-bar__head">
          <div className="min-w-0">
            <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '13px', display: 'block' }}>{label}</span>
            {planName && <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 500 }}>{planName} Plan</span>}
          </div>
          <span style={{ color: isWarning ? '#f87171' : '#94a3b8', fontSize: '12px', fontWeight: 500 }}>
            <strong style={{ color: isWarning ? '#f87171' : '#f8fafc' }}>{usedFormatted}</strong> 
            {!hasNoLimit && ` / ${totalFormatted}`}
            {hasNoLimit && ' Stored'}
          </span>
        </div>
        <div style={{ height: '6px', background: '#0f172a', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.max(2, percentage)}%`, background: gradient, borderRadius: '999px', transition: 'width 0.6s ease' }} />
        </div>
        {extraInfo && (
          <div style={{ marginTop: '12px' }}>
            {extraInfo}
          </div>
        )}
      </div>
      {showCta && (
        <a
          href={ctaHref}
          target={ctaHref ? '_blank' : undefined}
          rel={ctaHref ? 'noopener noreferrer' : undefined}
          onClick={onCtaClick}
          className="storage-bar__cta"
        >
          {ctaLabel || 'Upgrade'}
          <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>arrow_forward</span>
        </a>
      )}
    </div>
  );
}
