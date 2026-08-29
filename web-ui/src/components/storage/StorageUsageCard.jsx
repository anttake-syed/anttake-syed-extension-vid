import React from 'react';

/**
 * StorageUsageCard — modular presentation for dashboard stats row.
 * Consumes the standardized state from StorageService.
 */
export default function StorageUsageCard({ storageState, isAuthenticated, onSignIn, icon }) {
  if (!isAuthenticated) {
    return (
      <div className="stat-card blurred" onClick={onSignIn} style={{ cursor: 'pointer' }}>
        <div className="stat-icon">
          <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>{icon || 'hard_drive'}</span>
        </div>
        <div className="stat-value">—</div>
        <div className="stat-label">Storage</div>
        <div className="lock-overlay">
          <span className="material-symbols-rounded" style={{ fontSize: '18px', verticalAlign: 'middle' }}>lock</span> Sign in to view
        </div>
      </div>
    );
  }

  if (storageState.status === 'loading') {
    return (
      <div className="stat-card">
        <div className="stat-icon" style={{ opacity: 0.5 }}>
          <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>{icon || 'hard_drive'}</span>
        </div>
        <div className="stat-value" style={{ fontSize: '16px', color: '#94a3b8' }}>Calculating...</div>
        <div className="stat-label">Storage Usage</div>
      </div>
    );
  }

  const { status, usedFormatted, totalFormatted, percentage, label, hasNoLimit } = storageState;
  
  // Theme colors based on status
  const isWarning = status === 'near_limit' || status === 'full';
  const color = isWarning ? '#f87171' : '#818cf8';
  const barGradient = isWarning ? 'linear-gradient(90deg,#f87171,#ef4444)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)';

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="stat-icon">
          <span className="material-symbols-rounded" style={{ fontSize: '28px', color }}>{icon || 'hard_drive'}</span>
        </div>
        {status === 'full' && (
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
            FULL
          </span>
        )}
      </div>
      
      <div style={{ margin: '4px 0' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          {hasNoLimit ? usedFormatted : `${percentage}%`} 
          <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
            {hasNoLimit ? 'stored locally' : 'used'}
          </span>
        </div>
        {!hasNoLimit && (
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
            {usedFormatted} / {totalFormatted}
          </div>
        )}
      </div>

      {!hasNoLimit && (
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', marginTop: 'auto' }}>
          <div style={{ height: '100%', width: `${Math.max(2, percentage)}%`, background: barGradient, borderRadius: '999px', transition: 'width 0.6s ease' }} />
        </div>
      )}
      
      <div className="stat-label" style={{ marginTop: '4px', color: '#94a3b8' }}>{label}</div>
    </div>
  );
}
