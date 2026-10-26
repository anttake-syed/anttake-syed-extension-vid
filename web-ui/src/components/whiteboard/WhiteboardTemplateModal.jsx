import React, { useState } from 'react';
import { WHITEBOARD_TEMPLATES } from './whiteboardTemplates.js';

export default function WhiteboardTemplateModal({ isOpen, onClose, onSelectTemplate }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  if (!isOpen) return null;

  const categories = ['All', ...new Set(WHITEBOARD_TEMPLATES.map(t => t.category))];
  const filtered = selectedCategory === 'All' 
    ? WHITEBOARD_TEMPLATES 
    : WHITEBOARD_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="wb-modal-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
      <div 
        className="wb-modal-content wb-template-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '92%', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(168,85,247,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.3)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>dashboard_customize</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc', fontFamily: "'Outfit', sans-serif" }}>
                Whiteboard Templates
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Select an industry standard starter canvas to instantly populate your board.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="wb-modal-close"
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Category Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
                color: selectedCategory === cat ? '#ffffff' : '#94a3b8',
                border: selectedCategory === cat ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(tpl => (
            <div
              key={tpl.id}
              onClick={() => {
                onSelectTemplate(tpl);
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>{tpl.icon}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {tpl.category}
                    </span>
                  </div>
                  {tpl.badge && (
                    <span style={{ background: 'rgba(168,85,247,0.18)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.3)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700 }}>
                      {tpl.badge}
                    </span>
                  )}
                </div>

                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
                  {tpl.title}
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', lineHeight: 1.5 }}>
                  {tpl.description}
                </p>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>Click to apply to canvas</span>
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#818cf8' }}>
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
