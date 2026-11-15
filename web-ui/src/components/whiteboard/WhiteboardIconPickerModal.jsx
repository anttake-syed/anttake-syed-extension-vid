import React, { useState, useEffect, useRef } from 'react';

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

/**
 * WhiteboardIconPickerModal
 * Converted to a clean side flyout panel anchored adjacent to the whiteboard toolbar.
 */
export default function WhiteboardIconPickerModal({
  isOpen,
  onSelectIcon,
  onClose,
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handler); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategory = ICON_CATEGORIES.find(c => c.name === selectedCategory) || ICON_CATEGORIES[0];
  const filteredIcons = currentCategory.icons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div
      ref={panelRef}
      style={{
        position:      'absolute',
        left:          '72px',
        top:           '50%',
        transform:     'translateY(-50%)',
        zIndex:        3000,
        width:         '320px',
        maxHeight:     'calc(100vh - 120px)',
        background:    'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        border:        '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius:  '16px',
        boxShadow:     '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        animation:     'wbSlideInLeft 0.18s ease',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>Icon Library</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>Click to place on canvas</div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center' }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '17px' }}>close</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '0 8px' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#64748b' }}>search</span>
          <input
            type="text"
            placeholder="Search icons…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              color: '#f8fafc',
              fontSize: '12px',
              outline: 'none',
              fontFamily: "'Outfit', sans-serif",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories chips */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '6px 12px 8px', flexShrink: 0 }}>
        {ICON_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => { setSelectedCategory(cat.name); setSearch(''); }}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              background: selectedCategory === cat.name ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
              color: selectedCategory === cat.name ? '#38bdf8' : '#64748b',
              fontWeight: 600,
              fontSize: '10px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.12s',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Icons Grid */}
      <div style={{ overflowY: 'auto', padding: '8px 12px 14px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          {filteredIcons.map(icon => (
            <button
              key={icon}
              onClick={() => { onSelectIcon(icon); onClose(); }}
              title={icon}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 4px',
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
                color: '#38bdf8',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = 'rgba(56, 189, 248, 0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(30,41,59,0.6)'; }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{icon}</span>
            </button>
          ))}
        </div>
        {filteredIcons.length === 0 && (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
            No icons found
          </div>
        )}
      </div>
    </div>
  );
}
