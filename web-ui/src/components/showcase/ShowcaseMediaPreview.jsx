import React from 'react';

export default function ShowcaseMediaPreview({ type, accentColor = '#6366f1' }) {
  switch (type) {
    case 'extension':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {/* Simulated Browser Bar & Extension Pin */}
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '8px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            </div>
            {/* Pulsing Pin Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.5)',
              padding: '2px 6px',
              borderRadius: '6px'
            }}>
              <span className="material-symbols-rounded" style={{ fontSize: '12px', color: '#818cf8' }}>
                push_pin
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#a5b4fc' }}>AntCapture</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            Pin to your browser toolbar for 1-click recording
          </span>
        </div>
      );

    case 'library':
      return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Mock Fuzzy Search & Video Card */}
          <div style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '13px', color: '#64748b' }}>search</span>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Search recordings...</span>
          </div>
          <div style={{
            width: '100%',
            height: '56px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px', color: '#c084fc' }}>
              play_circle
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>Instant Cloud Stream</span>
          </div>
        </div>
      );

    case 'whiteboards':
      return (
        <div style={{
          width: '100%',
          height: '68px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px dashed rgba(236, 72, 153, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Spatial Canvas Mock Elements */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '12px',
            background: 'rgba(236, 72, 153, 0.18)',
            border: '1px solid rgba(236, 72, 153, 0.5)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            color: '#f472b6',
            fontWeight: 600
          }}>
            Capture #102
          </div>
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '14px',
            background: 'rgba(99, 102, 241, 0.18)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            color: '#a5b4fc',
            fontWeight: 600
          }}>
            Feedback Note 📌
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8' }}>100%</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Cloud Health</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#a855f7' }}>Fast</div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>Drive Sync</div>
          </div>
        </div>
      );

    case 'settings':
    default:
      return (
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: accentColor
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>tune</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
            Configurable Storage & Privacy
          </span>
        </div>
      );
  }
}
