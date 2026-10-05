// Icon map — proper icons per nav item
const MAIN_NAV = ['Dashboard', 'My Library', 'Whiteboards', 'Settings', 'Feedback'];
const SECONDARY_NAV = ['Pricing', 'Privacy', 'Terms', 'Refund Policy', 'Security', 'Documentation'];
const ADMIN_NAV = ['Diagnostics'];  // Only visible to admins; access is also enforced server-side

// Items that require a cloud subscription (shown with lock badge when unsubscribed)
const CLOUD_GATED_ITEMS = ['My Library', 'Whiteboards'];

const NAV_ICONS = {
  Dashboard:       'dashboard',
  'My Library':    'photo_library',
  Whiteboards:     'draw',
  Settings:        'settings',
  Feedback:        'chat_bubble',
  Pricing:         'payments',
  Privacy:         'shield',
  Terms:           'gavel',
  'Refund Policy': 'assignment_return',
  Security:        'lock',
  Documentation:   'article',
  Diagnostics:     'monitor_heart',
};

// Items that don't require login
const PUBLIC_ITEMS = ['Dashboard', 'Pricing', 'Privacy', 'Terms', 'Refund Policy', 'Security', 'Documentation'];

export default function Sidebar({ activeNav, isAuthenticated, hasCloudAccess = true, user, onNavClick, onSignIn, onLogout, mobileMenuOpen }) {
  const isAdmin = user?.role === 'admin';
  // Show cloud lock badges when user is signed in but hasn't subscribed
  const showCloudLock = isAuthenticated && !hasCloudAccess;

  const renderNavItem = (item, secondary = false) => {
    const isCloudLocked = showCloudLock && CLOUD_GATED_ITEMS.includes(item);
    return (
      <li
        key={item}
        className={`nav-item ${activeNav === item ? 'active' : ''} ${secondary ? 'nav-item-secondary' : ''}`}
        onClick={() => {
          if (PUBLIC_ITEMS.includes(item)) {onNavClick(item);}
          else if (isAuthenticated) {onNavClick(item);}
          else {onSignIn();}
        }}
        title={isCloudLocked ? `${item} — requires AntCapture Cloud plan` : item}
      >
        <span className="nav-icon material-symbols-rounded" style={{ fontSize: secondary ? '18px' : '20px', fontWeight: '300' }}>
          {NAV_ICONS[item]}
        </span>
        <span className="nav-label">{item}</span>
        {!isAuthenticated && !PUBLIC_ITEMS.includes(item) && (
          <span className="nav-lock material-symbols-rounded" style={{ fontSize: '14px', marginLeft: 'auto', color: '#475569' }}>lock</span>
        )}
        {isCloudLocked && (
          <span
            className="nav-lock material-symbols-rounded"
            style={{ fontSize: '14px', marginLeft: 'auto', color: '#6366f1', opacity: 0.7 }}
            title="Cloud plan required"
          >cloud_off</span>
        )}
      </li>
    );
  };

  return (
    <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} aria-label="Main navigation">
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
        <span className="logo-text" style={{ color: '#f8fafc', fontWeight: '700', letterSpacing: '-0.02em', fontSize: '19px' }}>
          Ant<span style={{ color: '#94a3b8', fontWeight: '500' }}>Capture</span>
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* ── Main navigation ── */}
        <ul className="nav-list">
          {MAIN_NAV.map((item) => renderNavItem(item, false))}
        </ul>

        {/* ── Divider ── */}
        <div className="nav-divider">
          <span className="nav-divider-label">Info</span>
        </div>

        {/* ── Secondary navigation ── */}
        <ul className="nav-list" style={{ marginTop: '4px' }}>
          {SECONDARY_NAV.map((item) => renderNavItem(item, true))}
        </ul>

        {/* ── Admin navigation (only shown to admins) ── */}
        {isAuthenticated && isAdmin && (
          <>
            <div className="nav-divider nav-divider--admin">
              <span className="nav-divider-label">Admin</span>
            </div>
            <ul className="nav-list" style={{ marginTop: '4px' }}>
              {ADMIN_NAV.map((item) => renderNavItem(item, true))}
            </ul>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        {/* ── Cloud upgrade nudge — only for logged-in, unsubscribed users ── */}
        {isAuthenticated && !hasCloudAccess && (
          <div
            className="sidebar-upgrade"
            onClick={() => onNavClick('Pricing')}
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.13) 0%, rgba(139,92,246,0.1) 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.16) 100%)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.13) 0%, rgba(139,92,246,0.1) 100%)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#818cf8' }}>bolt</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8', letterSpacing: '0.03em' }}>
                Upgrade to Cloud
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
              Unlock storage, whiteboards &amp; more. From $12/mo.
            </p>
          </div>
        )}

        {isAuthenticated ? (
          <button className="btn-logout" onClick={onLogout} title="Sign out">
            <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>logout</span>
            <span className="btn-label">Sign Out</span>
          </button>
        ) : (
          <button className="btn-signin-sidebar" onClick={onSignIn} title="Sign in with Google">
            <span className="material-symbols-rounded show-rail-only" style={{ fontSize: '18px' }}>login</span>
            <span className="btn-label">Sign in with Google</span>
          </button>
        )}
      </div>
    </aside>
  );
}

