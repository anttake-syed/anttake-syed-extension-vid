import React from 'react';

// Icon map — proper icons per nav item
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

      <nav>
        <ul className="nav-list">
          {Object.keys(NAV_ICONS).map((item) => (
            <li
              key={item}
              className={`nav-item ${activeNav === item ? 'active' : ''}`}
              onClick={() => {
                if (PUBLIC_ITEMS.includes(item)) {
                  onNavClick(item);
                } else {
                  // requireAuth — opens login modal if not authenticated
                  if (isAuthenticated) onNavClick(item);
                  else onSignIn();
                }
              }}
            >
              <span className="nav-icon">{NAV_ICONS[item]}</span>
              {item}
              {!isAuthenticated && !PUBLIC_ITEMS.includes(item) && (
                <span className="nav-lock">🔒</span>
              )}
            </li>
          ))}
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
