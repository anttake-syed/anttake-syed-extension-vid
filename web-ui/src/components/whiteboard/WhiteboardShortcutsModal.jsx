import React from 'react';

export default function WhiteboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: 'Tools',
      items: [
        { keys: ['V', '1'], label: 'Select tool' },
        { keys: ['H', 'Space'], label: 'Hand / Pan tool' },
        { keys: ['P', '2'], label: 'Pen / Draw' },
        { keys: ['E'], label: 'Eraser' },
        { keys: ['R', '3'], label: 'Rectangle' },
        { keys: ['O', 'C'], label: 'Circle / Ellipse' },
        { keys: ['A'], label: 'Arrow' },
        { keys: ['T', '4'], label: 'Text tool' },
      ],
    },
    {
      title: 'Actions & Editing',
      items: [
        { keys: ['Ctrl', 'Z'], label: 'Undo' },
        { keys: ['Ctrl', 'Y'], label: 'Redo (or Ctrl+Shift+Z)' },
        { keys: ['Ctrl', 'S'], label: 'Save board' },
        { keys: ['Ctrl', 'A'], label: 'Select all elements' },
        { keys: ['Ctrl', 'D'], label: 'Duplicate selected' },
        { keys: ['Delete'], label: 'Delete selected (or Backspace)' },
        { keys: ['Esc'], label: 'Deselect / Cancel active tool' },
      ],
    },
    {
      title: 'Navigation & Zoom',
      items: [
        { keys: ['Ctrl', '+'], label: 'Zoom in' },
        { keys: ['Ctrl', '-'], label: 'Zoom out' },
        { keys: ['Ctrl', '0'], label: 'Reset zoom & pan (100%)' },
        { keys: ['Shift', '1'], label: 'Zoom to fit elements' },
        { keys: ['Space', '+ drag'], label: 'Hold Space to pan canvas' },
      ],
    },
    {
      title: 'Touchpad, Mouse & Touch Gestures',
      items: [
        { keys: ['Touchpad 2-finger drag'], label: 'Pan canvas smoothly' },
        { keys: ['Touchpad pinch / Ctrl+Scroll'], label: 'Zoom smoothly' },
        { keys: ['Middle-click + drag'], label: 'Pan canvas' },
        { keys: ['Touchscreen 2-finger drag'], label: 'Pan canvas' },
        { keys: ['Touchscreen pinch'], label: 'Pinch to zoom in / out' },
        { keys: ['1-finger drag on canvas'], label: 'Draw / Select / Move' },
      ],
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #131b2e 0%, #0b1120 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>keyboard</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                Keyboard Shortcuts & Gestures
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Standard keyboard, touchpad, mouse, and touchscreen controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {shortcutSections.map((sec) => (
            <div
              key={sec.title}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '14px 16px',
              }}
            >
              <h4
                style={{
                  margin: '0 0 10px 0',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#818cf8',
                }}
              >
                {sec.title}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sec.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {item.keys.map((k, kIdx) => (
                        <span
                          key={kIdx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.14)',
                            borderRadius: '5px',
                            padding: '2px 7px',
                            fontSize: '11px',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: '#f8fafc',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
