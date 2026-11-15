import React, { useState, useEffect, useRef } from 'react';
import { PREBUILT_SHAPES, DEVICE_FRAMES } from './whiteboardConstants.js';

/**
 * WhiteboardShapePicker
 * Renders as a left-side flyout panel anchored to the toolbar.
 * Slides in from the left — no centered popup overlay.
 */
export default function WhiteboardShapePickerModal({
  isOpen,
  onSelectShape,
  onSelectDeviceFrame,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('shapes'); // 'shapes' | 'frames'
  const panelRef = useRef(null);

  // Close on click-outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    // slight delay so the opening click doesn't immediately close it
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handler); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position:     'absolute',
        left:         '72px',   // right next to the toolbar
        top:          '50%',
        transform:    'translateY(-50%)',
        zIndex:       3000,
        width:        '300px',
        maxHeight:    'calc(100vh - 120px)',
        background:   'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        border:       '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        boxShadow:    '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        display:      'flex',
        flexDirection: 'column',
        overflow:     'hidden',
        animation:    'wbSlideInLeft 0.18s ease',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>Shapes & Frames</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>Click to place on canvas</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>close</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '10px 12px 0', flexShrink: 0 }}>
        {[
          { id: 'shapes', label: `Shapes (${PREBUILT_SHAPES.length})`, icon: 'shapes' },
          { id: 'frames', label: `Devices (${DEVICE_FRAMES.length})`, icon: 'devices' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '7px 8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? '#a5b4fc' : '#64748b',
              fontWeight: 600,
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ overflowY: 'auto', padding: '10px 12px 14px', flex: 1 }}>
        {activeTab === 'shapes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {PREBUILT_SHAPES.map(s => (
              <button
                key={s.id}
                onClick={() => { onSelectShape(s); onClose(); }}
                style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'center',
                  gap:            '5px',
                  padding:        '10px 6px',
                  background:     'rgba(30, 41, 59, 0.6)',
                  border:         '1px solid rgba(255,255,255,0.07)',
                  borderRadius:   '10px',
                  color:          '#e2e8f0',
                  cursor:         'pointer',
                  transition:     'all 0.12s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = 'rgba(99,102,241,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#818cf8' }}>{s.icon}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, textAlign: 'center', color: '#94a3b8', lineHeight: 1.2 }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'frames' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {DEVICE_FRAMES.map(df => (
              <button
                key={df.id}
                onClick={() => { onSelectDeviceFrame(df); onClose(); }}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '12px',
                  padding:     '12px 14px',
                  background:  'rgba(30, 41, 59, 0.6)',
                  border:      '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  color:       '#e2e8f0',
                  cursor:      'pointer',
                  textAlign:   'left',
                  transition:  'all 0.12s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '24px', color: '#38bdf8', flexShrink: 0 }}>{df.icon}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{df.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{df.w} × {df.h}px</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
