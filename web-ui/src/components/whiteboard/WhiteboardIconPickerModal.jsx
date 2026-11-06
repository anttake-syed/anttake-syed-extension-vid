import React, { useState } from 'react';

const ICON_CATEGORIES = [
  {
    name: 'All',
    icons: [
      'star', 'favorite', 'thumb_up', 'verified', 'bolt', 'lightbulb',
      'language', 'mail', 'call', 'chat', 'forum', 'send', 'share',
      'smartphone', 'tablet', 'desktop_windows', 'laptop', 'tv', 'router',
      'cloud', 'database', 'terminal', 'code', 'bug_report', 'security',
      'settings', 'home', 'search', 'folder', 'dashboard', 'analytics',
      'shopping_cart', 'credit_card', 'payments', 'sell', 'storefront',
      'play_arrow', 'videocam', 'photo_camera', 'mic', 'music_note',
      'check_circle', 'cancel', 'error', 'help', 'info', 'warning'
    ]
  },
  {
    name: 'Dev & System',
    icons: ['terminal', 'code', 'bug_report', 'database', 'cloud', 'security', 'settings', 'dns', 'memory', 'lan', 'api', 'hub']
  },
  {
    name: 'Communication',
    icons: ['mail', 'call', 'chat', 'forum', 'send', 'share', 'contact_support', 'sms', 'notifications', 'chat_bubble']
  },
  {
    name: 'Devices',
    icons: ['smartphone', 'tablet', 'desktop_windows', 'laptop', 'tv', 'router', 'watch', 'keyboard', 'mouse', 'headphones']
  },
  {
    name: 'Media',
    icons: ['play_arrow', 'videocam', 'photo_camera', 'mic', 'music_note', 'volume_up', 'image', 'movie', 'radio', 'equalizer']
  },
  {
    name: 'Commerce & UI',
    icons: ['shopping_cart', 'credit_card', 'payments', 'sell', 'storefront', 'receipt', 'account_balance', 'price_check', 'local_mall']
  }
];

export default function WhiteboardIconPickerModal({
  isOpen,
  onSelectIcon,
  onClose,
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const currentCategory = ICON_CATEGORIES.find(c => c.name === selectedCategory) || ICON_CATEGORIES[0];
  const filteredIcons = currentCategory.icons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="wb-overlay" style={{ zIndex: 4000 }} onClick={onClose}>
      <div
        className="wb-dialog"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '620px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
              Icon Library
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Select an icon to add directly to your whiteboard
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

        {/* Search Input */}
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search icons (e.g. cloud, database, phone, mail)..."
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              color: '#f8fafc',
              padding: '10px 14px',
              fontSize: '13px',
              outline: 'none',
              fontFamily: "'Outfit', sans-serif",
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '14px' }}>
          {ICON_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: selectedCategory === cat.name ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
                color: selectedCategory === cat.name ? '#ffffff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Icons Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: '10px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px',
          }}
        >
          {filteredIcons.map(icon => (
            <button
              key={icon}
              title={icon}
              onClick={() => {
                onSelectIcon(icon);
                onClose();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 8px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#f8fafc',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '28px', color: '#38bdf8' }}>
                {icon}
              </span>
            </button>
          ))}

          {filteredIcons.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '13px' }}>
              No icons found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
