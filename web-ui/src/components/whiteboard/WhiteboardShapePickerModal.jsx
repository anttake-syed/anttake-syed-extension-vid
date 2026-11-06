import React, { useState } from 'react';
import { PREBUILT_SHAPES, DEVICE_FRAMES } from './whiteboardConstants.js';

export default function WhiteboardShapePickerModal({
  isOpen,
  onSelectShape,
  onSelectDeviceFrame,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('shapes'); // 'shapes' | 'frames'

  if (!isOpen) return null;

  return (
    <div className="wb-overlay" style={{ zIndex: 4000 }} onClick={onClose}>
      <div
        className="wb-dialog"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '560px', width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              Shapes & Device Frames
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Choose prebuilt flowchart shapes or responsive device containers
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
          <button
            onClick={() => setActiveTab('shapes')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'shapes' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'shapes' ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>shapes</span>
            Prebuilt Shapes ({PREBUILT_SHAPES.length})
          </button>

          <button
            onClick={() => setActiveTab('frames')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'frames' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
              color: activeTab === 'frames' ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>devices</span>
            Device Frames ({DEVICE_FRAMES.length})
          </button>
        </div>

        {/* Grid display */}
        {activeTab === 'shapes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', maxHeight: '340px', overflowY: 'auto' }}>
            {PREBUILT_SHAPES.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectShape(s);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 12px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#818cf8' }}>
                  {s.icon}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'frames' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px', maxHeight: '340px', overflowY: 'auto' }}>
            {DEVICE_FRAMES.map(df => (
              <button
                key={df.id}
                onClick={() => {
                  onSelectDeviceFrame(df);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  padding: '16px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#38bdf8' }}>
                    {df.icon}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{df.label}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {df.w} × {df.h} px · Holds nested objects
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
