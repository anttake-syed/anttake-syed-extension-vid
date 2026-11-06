import React, { useState } from 'react';

export default function WhiteboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('features'); // 'features' or 'shortcuts'

  const integrations = [
    {
      id: 'youtube',
      name: 'YouTube Video & Shorts',
      icon: 'smart_display',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.3)',
      howTo: 'Paste any YouTube link (watch, youtu.be, or shorts) with Ctrl+V',
      result: 'Renders an interactive video card with inline play/pause and external open button.',
    },
    {
      id: 'google-docs',
      name: 'Google Docs & Drive',
      icon: 'description',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      border: 'rgba(59, 130, 246, 0.3)',
      howTo: 'Paste a shareable Google Docs or Drive file link',
      result: 'Creates a custom branded Google Docs card with quick 1-click access.',
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      icon: 'table_chart',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      howTo: 'Paste any Google Spreadsheets URL',
      result: 'Displays an emerald spreadsheet badge card with formatted link.',
    },
    {
      id: 'google-slides',
      name: 'Google Slides',
      icon: 'co_present',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      howTo: 'Paste a Google Slides presentation link',
      result: 'Renders a presentation deck preview card ready for presentations.',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: 'calendar_month',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.3)',
      howTo: 'Paste a Google Calendar event or schedule link',
      result: 'Creates a neat calendar reference badge on your whiteboard.',
    },
    {
      id: 'github-figma',
      name: 'GitHub, Figma & Web Links',
      icon: 'link',
      color: '#a78bfa',
      bg: 'rgba(167, 139, 250, 0.12)',
      border: 'rgba(167, 139, 250, 0.3)',
      howTo: 'Paste any website, GitHub repo, or Figma design URL',
      result: 'Automatically detects the service with custom icons and quick navigation button.',
    },
    {
      id: 'images-videos',
      name: 'Images, Videos & Direct Media',
      icon: 'perm_media',
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.3)',
      howTo: 'Drag & drop image/video files directly onto the canvas or paste image URLs',
      result: 'Places full visual media directly on the canvas with resize/rotation controls.',
    },
  ];

  const shortcutSections = [
    {
      title: 'Tools',
      items: [
        { keys: ['V', '1'], label: 'Select tool' },
        { keys: ['H', 'Space'], label: 'Hand / Pan tool' },
        { keys: ['F'], label: 'Frame (Group Container)' },
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
        { keys: ['Ctrl', 'C'], label: 'Copy selected' },
        { keys: ['Ctrl', 'X'], label: 'Cut selected' },
        { keys: ['Ctrl', 'V'], label: 'Paste elements' },
        { keys: ['Ctrl', 'D'], label: 'Duplicate selected' },
        { keys: ['Ctrl', 'A'], label: 'Select all elements' },
        { keys: ['Ctrl', ']'], label: 'Bring forward (Shift+] to front)' },
        { keys: ['Ctrl', '['], label: 'Send backward (Shift+[ to back)' },
        { keys: ['Delete'], label: 'Delete selected (or Backspace)' },
        { keys: ['Esc'], label: 'Deselect / Cancel active tool' },
        { keys: ['Ctrl', 'S'], label: 'Save board' },
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
        { keys: ['Touchpad 2-finger tap / Right-click'], label: 'Open menu (Cut, Copy, Paste, Layers)' },
        { keys: ['Touchscreen Long-press / Double-tap'], label: 'Open menu (Cut, Copy, Paste, Layers)' },
        { keys: ['Double-click canvas or element'], label: 'Open actions menu anywhere' },
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
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                {activeTab === 'features' ? 'integration_instructions' : 'keyboard'}
              </span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                Features & Shortcuts
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Supported smart link embeds, integrations, and keyboard & gesture controls
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

        {/* ── Tab Switcher ── */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '3px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('features')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'features' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: activeTab === 'features' ? '#e0e7ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '17px', color: activeTab === 'features' ? '#818cf8' : 'inherit' }}>
              bolt
            </span>
            <span>Smart Embeds & Integrations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'shortcuts' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: activeTab === 'shortcuts' ? '#e0e7ff' : '#94a3b8',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '17px', color: activeTab === 'shortcuts' ? '#818cf8' : 'inherit' }}>
              keyboard
            </span>
            <span>Keyboard & Gestures</span>
          </button>
        </div>

        {/* ── Tab 1: Smart Embeds & Integrations ── */}
        {activeTab === 'features' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '12px',
                color: '#c7d2fe',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#818cf8', flexShrink: 0 }}>
                info
              </span>
              <span>
                <strong>How to use:</strong> Simply copy any link or URL to your clipboard, click anywhere on the whiteboard canvas, and press <strong>Ctrl+V</strong> (or <strong>Cmd+V</strong>). The whiteboard instantly detects the service and embeds it with rich interactive controls.
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '12px',
              }}
            >
              {integrations.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: item.bg,
                        border: `1px solid ${item.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.color,
                        flexShrink: 0,
                      }}
                    >
                      <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        {item.name}
                      </h4>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                    <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Action: </span>
                    {item.howTo}
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                    <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Result: </span>
                    {item.result}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 2: Keyboard & Gestures ── */}
        {activeTab === 'shortcuts' && (
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
        )}

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
