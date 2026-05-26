// Icon map — proper icons per nav item
const MAIN_NAV = ['Dashboard', 'My Library', 'Settings', 'Feedback'];
const SECONDARY_NAV = ['Privacy', 'Security', 'Documentation'];

const NAV_ICONS = {
  Dashboard:     '⊞',
  'My Library':  '🗂',
  Settings:      '⚙️',
  Feedback:      '💬',
  Privacy:       '🛡️',
  Security:      '🔒',
  Documentation: '📖',
};

// Items that don't require login
const PUBLIC_ITEMS = ['Dashboard', 'Privacy', 'Security', 'Documentation'];

export default function Sidebar({ activeNav, isAuthenticated, onNavClick, onSignIn, onLogout }) {
  const renderNavItem = (item, secondary = false) => (
    <li
      key={item}
      className={`nav-item ${activeNav === item ? 'active' : ''} ${secondary ? 'nav-item-secondary' : ''}`}
      onClick={() => {
        if (PUBLIC_ITEMS.includes(item)) onNavClick(item);
        else if (isAuthenticated) onNavClick(item);
        else onSignIn();
      }}
    >
      <span className="nav-icon" style={secondary ? { fontSize: '13px' } : {}}>
        {NAV_ICONS[item]}
      </span>
      {item}
      {!isAuthenticated && !PUBLIC_ITEMS.includes(item) && (
        <span className="nav-lock">🔒</span>
      )}
    </li>
  );

  return (
    <aside className="sidebar">
      <div className="logo">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="10" cy="10" r="10" fill="url(#sl)" />
          <circle cx="10" cy="10" r="4" fill="white" opacity="0.9" />
          <defs>
            <linearGradient id="sl" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        AntCapture
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
          <button className="btn-logout" onClick={onLogout}>Sign Out</button>
        ) : (
          <button className="btn-signin-sidebar" onClick={onSignIn}>
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}

