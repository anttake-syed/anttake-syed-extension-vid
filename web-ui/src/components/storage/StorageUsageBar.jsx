import React from 'react';

/**
 * StorageUsageBar — modular presentation for the bottom dashboard storage health bars.
 * Consumes the standardized state from StorageService.
 */
export default function StorageUsageBar({ storageState, icon, extraInfo }) {
  if (!storageState || storageState.status === 'loading') {
    return null; // hide if no data
  }

  const { status, usedFormatted, totalFormatted, percentage, label, planName, hasNoLimit } = storageState;
  
  const isWarning = status === 'near_limit' || status === 'full';
  const color = isWarning ? '#f87171' : storageState.type === 'cloud' ? '#38bdf8' : '#818cf8';
  
  let gradient = 'linear-gradient(90deg,#6366f1,#8b5cf6)'; // local
  if (storageState.type === 'cloud') gradient = 'linear-gradient(90deg,#38bdf8,#6366f1)';
  if (isWarning) gradient = 'linear-gradient(90deg,#f87171,#ef4444)';

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
        {typeof icon === 'string' ? (
          <span className="material-symbols-rounded" style={{ fontSize: '20px', color }}>{icon}</span>
        ) : (
          icon
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div>
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
    </div>
  );
}
