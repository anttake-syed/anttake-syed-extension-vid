import React from 'react';
import { IS_LOCAL_MODE } from '../config';

const PAGE_TITLES = {
  Settings: 'Settings',
  Feedback: 'Feedback',
  Privacy: 'Privacy Policy',
  Security: 'Security',
  Documentation: 'Documentation',
  Dashboard: 'Command Center',
  'My Library': 'Capture Library',
};

const PAGE_SUBTITLES = {
  Settings: 'Manage your account and preferences.',
  Feedback: "We'd love to hear from you.",
  Privacy: 'Important information about AntCapture.',
  Security: 'Important information about AntCapture.',
  Documentation: 'Important information about AntCapture.',
  Dashboard: 'Overview of your captures and cloud storage health.',
  'My Library': 'Your recordings and screenshots, synced across all devices.',
};

export default function Header({ activeNav, isAuthenticated, user, showProfileMenu, setShowProfileMenu, onSignIn, onLogout, onNavClick }) {
  const title = PAGE_TITLES[activeNav] || activeNav;
  const subtitle = PAGE_SUBTITLES[activeNav] || '';

  return (
    <header className="header">
      <div className="title-section">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <div className="header-actions">
        {isAuthenticated && user ? (
          <div className="profile-container">
            <div className="user-pill animated fadeIn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              {user.picture ? (
                <img src={user.picture} className="user-avatar profile-circle" alt="Profile" />
              ) : (
                <div className="user-avatar profile-circle">{user.name?.charAt(0) || 'U'}</div>
              )}
              <span className="user-name">{user.name}</span>
              <span className="chevron">▼</span>
            </div>

            {showProfileMenu && (
              <div className="profile-dropdown animated fadeInScale">
                <div className="dropdown-header">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item" onClick={() => { onNavClick('Settings'); setShowProfileMenu(false); }}>
                  <span className="item-icon material-symbols-rounded">settings</span> Settings
                </button>
                {!IS_LOCAL_MODE && (
                  <button className="dropdown-item logout" onClick={onLogout}>
                    <span className="item-icon material-symbols-rounded">logout</span> Sign Out
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="btn-ghost" onClick={onSignIn}>Sign In</button>
            <button className="btn-primary glow-pulse" onClick={onSignIn}>Get Started Free →</button>
          </>
        )}
      </div>
    </header>
  );
}
