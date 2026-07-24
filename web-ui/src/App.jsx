import React, { useState, useEffect } from 'react';
import './index.css';
import { SERVER_URL, IS_LOCAL_MODE } from './config.js';

// Hooks
import { useAuth } from './hooks/useAuth.js';
import { useCaptures } from './hooks/useCaptures.js';

// Components
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import LoginModal from './components/LoginModal.jsx';
import MediaModal from './components/MediaModal.jsx';
import Dashboard from './components/Dashboard.jsx';
import Library from './components/Library.jsx';
import Settings from './components/Settings.jsx';
import FeedbackForm from './components/FeedbackForm.jsx';
import StaticPage from './components/StaticPage.jsx';
import ServerHealthBadge from './components/ServerHealthBadge.jsx';

const NAV_TO_PATH = {
  'Dashboard': '/',
  'My Library': '/library',
  'Settings': '/settings',
  'Feedback': '/feedback',
  'Privacy': '/privacy-policy',
  'Security': '/security',
  'Documentation': '/documentation'
};

const PATH_TO_NAV = Object.fromEntries(Object.entries(NAV_TO_PATH).map(([k, v]) => [v, k]));

export default function App() {
  const { user, isAuthenticated, isInitializing, logout, updateUser } = useAuth();

  const {
    captures, setCaptures, dbStats,
    storagePreference, loadingCaptures, savingPref,
    saveStoragePreference, deleteCapture, refresh,
  } = useCaptures(user, isAuthenticated);

  const [activeNav, setActiveNav] = useState(() => {
    const path = window.location.pathname;
    // Check path first
    if (PATH_TO_NAV[path]) {return PATH_TO_NAV[path];}
    
    // Fallback to query params for legacy links
    const params = new URLSearchParams(window.location.search);
    return params.get('nav') || 'Dashboard';
  });
  const [activeMedia, setActiveMedia] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Sync state to URL and Document Title
  useEffect(() => {
    document.title = `${activeNav} - AntCapture`;
    
    const targetPath = NAV_TO_PATH[activeNav] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeNav]);

  // Close login modal automatically on successful login
  useEffect(() => {
    if (isAuthenticated) {
      setShowModal(false);
    }
  }, [isAuthenticated]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (PATH_TO_NAV[path]) {
        setActiveNav(PATH_TO_NAV[path]);
      } else {
        setActiveNav('Dashboard');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Stats derived from captures + dbStats
  const stats = [
    { label: 'Total Captures', value: (dbStats?.total ?? captures.length).toString(), icon: 'folder' },
    {
      label: 'Local Storage Used',
      value: dbStats?.dbSizeFormatted ?? '0 B',
      icon: 'hard_drive',
      sub: dbStats ? `${dbStats.localCount} files local` : null,
    },
    // Only show Google Drive stat in cloud mode
    ...(!IS_LOCAL_MODE && dbStats?.storageServer !== 'local' ? [{
      label: 'Google Drive Used',
      value: dbStats?.appDriveFormatted ?? '0 B',
      icon: 'drive',
      isDrive: true,
      sub: dbStats ? `${dbStats.driveCount} files on Drive${dbStats.driveLimitBytes > 0 ? ` (Overall: ${dbStats.driveUsageFormatted} / ${dbStats.driveLimitFormatted})` : ''}` : null,
    }] : []),
    {
      label: 'This Week',
      value: captures.filter((c) => {
        // eslint-disable-next-line react-hooks/purity
        const now = Date.now();
        return c.date && new Date(c.date) > new Date(now - 7 * 24 * 60 * 60 * 1000);
      }).length.toString(),
      icon: 'trending_up',
    },
  ];

  // ── Settings handlers ──────────────────────────────────────────────────────
  const handleNameUpdate = async (newName) => {
    const res = await fetch(`${SERVER_URL}/user/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.jwt}` },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) {throw new Error('Failed to update name');}
    updateUser({ name: newName });
  };

  const handleDeleteAllCaptures = async () => {
    const res = await fetch(`${SERVER_URL}/captures/all`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.jwt}` },
    });
    if (!res.ok) {throw new Error('Failed to delete captures');}
    setCaptures([]);
  };

  const handleDeleteAccount = async () => {
    const res = await fetch(`${SERVER_URL}/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.jwt}` },
    });
    if (!res.ok) {throw new Error('Failed to delete account');}
    logout();
  };

  const handleLogout = () => {
    logout();
    setActiveNav('Dashboard');
    setShowProfileMenu(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isInitializing) {
    return (
      <div className="layout">
        <aside className="sidebar" style={{ pointerEvents: 'none' }}>
          <div className="logo" style={{ marginBottom: '32px' }}>
            <div className="skeleton-box" style={{ width: '22px', height: '22px', borderRadius: '50%' }}></div>
            <div className="skeleton-box" style={{ width: '120px', height: '20px', borderRadius: '4px' }}></div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: '10px' }}></div>)}
          </nav>
        </aside>
        <main className="main-content" style={{ padding: '36px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '240px', height: '36px', borderRadius: '8px' }}></div>
            <div className="skeleton-box" style={{ width: '160px', height: '42px', borderRadius: '21px' }}></div>
          </div>
          <div className="skeleton-box" style={{ width: '100%', height: '140px', borderRadius: '16px', marginBottom: '28px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton-box" style={{ width: '100%', height: '140px', borderRadius: '16px' }}></div>)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`layout ${isAuthenticated ? 'isAuthenticated' : ''}`}>
      {showModal && !IS_LOCAL_MODE && <LoginModal onClose={() => setShowModal(false)} />}
      {activeMedia && (
        <MediaModal
          item={activeMedia}
          user={user}
          dbStats={dbStats}
          onClose={() => setActiveMedia(null)}
          onSyncSuccess={() => { refresh(); setActiveMedia(null); }}
          onDelete={(id) => { deleteCapture(id); setActiveMedia(null); }}
        />
      )}

      <Sidebar
        activeNav={activeNav}
        isAuthenticated={isAuthenticated}
        onNavClick={setActiveNav}
        onSignIn={() => setShowModal(true)}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Header
          activeNav={activeNav}
          isAuthenticated={isAuthenticated}
          user={user}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          onSignIn={() => setShowModal(true)}
          onLogout={handleLogout}
          onNavClick={setActiveNav}
        />
        {/* Server health pill — only visible in local/self-hosted mode */}
        <div style={{ position: 'fixed', top: '14px', right: '20px', zIndex: 200 }}>
          <ServerHealthBadge />
        </div>


        {/* ── Page Content ── */}
        {activeNav === 'Settings' && isAuthenticated ? (
          <Settings user={user} captures={captures} dbStats={dbStats} onNameUpdate={handleNameUpdate} onDeleteAllCaptures={handleDeleteAllCaptures} onDeleteAccount={handleDeleteAccount} storagePreference={storagePreference} saveStoragePreference={saveStoragePreference} savingPref={savingPref} />
        ) : activeNav === 'Feedback' && isAuthenticated ? (
          <FeedbackForm user={user} />
        ) : activeNav === 'Privacy' ? (
          <StaticPage
            title="Privacy Policy"
            content={`Last updated: June 2025

AntCapture is built with your privacy as the foundation. Here's exactly what we do and don't do with your data.

DATA WE COLLECT
- Your Google account name, email, and profile picture — used only to identify your account
- Screenshots and recordings you capture — stored in your chosen location (local database or your personal Google Drive)
- Storage preferences you set in Settings

DATA WE DON'T COLLECT
- We never sell your data to third parties
- We never use your captures for advertising or analytics
- We never access files in your Google Drive beyond what you explicitly upload through AntCapture
- We don't track your browsing activity

WHERE YOUR FILES LIVE
When you choose "Local" storage, your files are stored in our database and served only to you when you're logged in. When you choose "Google Drive", files go directly to your personal Google Drive — we don't keep a copy.

GOOGLE OAUTH
We use Google OAuth 2.0 for authentication. We request only the minimum permissions needed: your profile info and access to files created by AntCapture. We never request access to your existing Drive files.

DATA DELETION
You can delete all your captures or your entire account at any time from the Settings page. Deletion is immediate and permanent.

CONTACT
Questions about privacy? Reach us through the Feedback page.`}
          />
        ) : activeNav === 'Security' ? (
          <StaticPage
            title="Security"
            content={`Last updated: June 2025

AntCapture takes security seriously. Here's how we protect your account and data.

AUTHENTICATION
- All authentication is handled via Google OAuth 2.0 — we never store your Google password
- Sessions are secured with signed JWT tokens that expire after 7 days
- Tokens are stored locally in your browser and never transmitted except to our server

DATA IN TRANSIT
- All communication between the extension, web UI, and server uses HTTPS in production
- API requests require a valid JWT — unauthenticated requests are rejected

DATA AT REST
- Files stored locally in our database are tied to your account email
- Only you can access your captures — each request is verified against your JWT
- Google Drive files are stored in your own Drive under your own Google account

EXTENSION SECURITY
- The Chrome extension only communicates with our server (localhost in development, your domain in production)
- No third-party scripts or tracking are included in the extension
- The extension requests only the permissions it needs — no broad host access

REPORTING ISSUES
If you discover a security vulnerability, please report it responsibly through the Feedback page rather than publicly disclosing it.`}
          />
        ) : activeNav === 'Documentation' ? (
          <StaticPage
            title="Documentation"
            content={`Welcome to AntCapture — your screen capture and cloud sync tool.

GETTING STARTED
1. Sign In
   Click the AntCapture icon in your Chrome toolbar and sign in with Google. You only need to sign in once — the extension remembers your session.

2. Sign In to the Web Dashboard
   Visit this dashboard and sign in with the same Google account. Your captures will appear automatically.

TAKING SCREENSHOTS
- Click the AntCapture extension icon
- Click "Take Screenshot"
- The screenshot saves to your computer and syncs to your dashboard automatically

RECORDING YOUR SCREEN
- Click the AntCapture extension icon
- Click "Record Screen" and choose what to share (tab, window, or entire screen)
- Click "Stop Recording" when finished
- The recording saves locally and syncs to your dashboard

STORAGE OPTIONS
In Settings you can choose where your captures are stored:
- Local — stored securely in our database, accessible from any browser
- Google Drive — uploaded directly to your personal Google Drive

You can also sync individual captures between Local and Drive from the capture card menu.

YOUR LIBRARY
The My Library page shows all your captures. You can filter by videos or screenshots, preview any capture, and download or open it in Google Drive.

TROUBLESHOOTING
- Captures not appearing? Make sure you're signed in to both the extension and the dashboard with the same Google account.
- Upload failing? Check that your server is running on port 3001.
- Extension not recording? Make sure you've granted screen share permission when prompted by Chrome.`}
          />
        ) : activeNav === 'My Library' ? (
          <Library
            captures={captures}
            loadingCaptures={loadingCaptures}
            onOpenMedia={setActiveMedia}
            isAuthenticated={isAuthenticated}
            onSignIn={() => setShowModal(true)}
          />
        ) : (
          <Dashboard
            isAuthenticated={isAuthenticated}
            isLocalMode={IS_LOCAL_MODE}
            stats={stats}
            captures={captures}
            loadingCaptures={loadingCaptures}
            dbStats={dbStats}
            onSignIn={() => setShowModal(true)}
            onOpenMedia={setActiveMedia}
            onGoToLibrary={() => setActiveNav('My Library')}
          />
        )}
      </main>
    </div>
  );
}
