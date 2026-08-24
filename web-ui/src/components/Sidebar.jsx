// Icon map — proper icons per nav item
const MAIN_NAV = ['Dashboard', 'My Library', 'Whiteboards', 'Settings', 'Feedback'];
const SECONDARY_NAV = ['Pricing', 'Privacy', 'Security', 'Documentation'];

const NAV_ICONS = {
  Dashboard:     'dashboard',
  'My Library':  'photo_library',
  Whiteboards:   'draw',
  Settings:      'settings',
  Feedback:      'chat_bubble',
  Pricing:       'payments',
  Privacy:       'shield',
  Security:      'lock',
  Documentation: 'article',
};

// Items that don't require login
const PUBLIC_ITEMS = ['Dashboard', 'Pricing', 'Privacy', 'Security', 'Documentation'];

export default function Sidebar({ activeNav, isAuthenticated, onNavClick, onSignIn, onLogout }) {
  const renderNavItem = (item, secondary = false) => (
    <li
      key={item}
      className={`nav-item ${activeNav === item ? 'active' : ''} ${secondary ? 'nav-item-secondary' : ''}`}
      onClick={() => {
        if (PUBLIC_ITEMS.includes(item)) {onNavClick(item);}
        else if (isAuthenticated) {onNavClick(item);}
        else {onSignIn();}
      }}
    >
      <span className="nav-icon material-symbols-rounded" style={{ fontSize: secondary ? '18px' : '20px', fontWeight: '300' }}>
        {NAV_ICONS[item]}
      </span>
      {item}
      {!isAuthenticated && !PUBLIC_ITEMS.includes(item) && (
        <span className="nav-lock material-symbols-rounded" style={{ fontSize: '14px', marginLeft: 'auto', color: '#475569' }}>lock</span>
      )}
    </li>
  );

  return (
    <aside className="sidebar">
      <div className="logo">
        <svg viewBox="0 0 40 40" width="24" height="24" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="20" cy="20" r="20" fill="url(#sidebar-grad)" />
          <path d="M14 20a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" fill="white" opacity="0.9"/>
          <defs>
            <linearGradient id="sidebar-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span style={{ color: '#f8fafc', fontWeight: '700', letterSpacing: '-0.02em', fontSize: '19px' }}>
          Ant<span style={{ color: '#94a3b8', fontWeight: '500' }}>Capture</span>
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* ── Main navigation ── */}
        <ul className="nav-list">
          {MAIN_NAV.map((item) => renderNavItem(item, false))}
        </ul>

        {/* ── Divider ── */}
        <div style={{
          margin: '10px 16px 6px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute',
            top: '-9px',
            left: '8px',
            background: '#0f172a',
            padding: '0 6px',
            fontSize: '10px',
            fontWeight: '600',
            color: '#334155',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Info
          </span>
        </div>

        {/* ── Secondary navigation ── */}
        <ul className="nav-list" style={{ marginTop: '4px' }}>
          {SECONDARY_NAV.map((item) => renderNavItem(item, true))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {isAuthenticated ? (
          <button className="btn-logout" onClick={onLogout}>
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>logout</span> Sign Out
          </button>
        ) : (
          <button className="btn-signin-sidebar" onClick={onSignIn}>
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}

