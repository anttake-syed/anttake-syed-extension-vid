import React, { useState, useEffect } from 'react';
import './index.css';
import { BACKEND_URL } from './config';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useCaptures } from './hooks/useCaptures';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import MediaModal from './components/MediaModal';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import FeedbackForm from './components/FeedbackForm';
import StaticPage from './components/StaticPage';

export default function App() {
  const { user, isAuthenticated, isInitializing, logout, updateUser } = useAuth();

  const {
    captures, setCaptures, filteredCaptures, dbStats,
    storagePreference, loadingCaptures, savingPref,
    filter, setFilter, fetchCaptures, fetchStats,
    saveStoragePreference, refresh,
  } = useCaptures(user, isAuthenticated);

  const [activeNav, setActiveNav] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('nav') || 'Dashboard';
  });
  const [activeMedia, setActiveMedia] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    document.title = `${activeNav} - AntCapture`;
  }, [activeNav]);

  // Stats derived from captures + dbStats
  const stats = [
    { label: 'Total Captures', value: (dbStats?.total ?? captures.length).toString(), icon: '📁' },
    {
      label: 'Local Storage Used',
      value: dbStats?.dbSizeFormatted ?? '0 B',
      icon: '🗄️',
      sub: dbStats ? `${dbStats.localCount} files local` : null,
    },
    {
      label: 'Google Drive Used',
      value: dbStats?.appDriveFormatted ?? '0 B',
      icon: '☁️',
      sub: dbStats ? `${dbStats.driveCount} files on Drive${dbStats.driveLimitBytes > 0 ? ` (Overall: ${dbStats.driveUsageFormatted} / ${dbStats.driveLimitFormatted})` : ''}` : null,
    },
    {
      label: 'This Week',
      value: captures.filter((c) => c.date && new Date(c.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length.toString(),
      icon: '📈',
    },
  ];

  // ── Settings handlers ──────────────────────────────────────────────────────
  const handleNameUpdate = async (newName) => {
    const res = await fetch(`${BACKEND_URL}/user/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.jwt}` },
      body: JSON.stringify({ name: newName }),
    });
    if (!res.ok) throw new Error('Failed to update name');
    updateUser({ name: newName });
  };

  const handleDeleteAllCaptures = async () => {
    const res = await fetch(`${BACKEND_URL}/captures/all`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.jwt}` },
    });
    if (!res.ok) throw new Error('Failed to delete captures');
    setCaptures([]);
  };

  const handleDeleteAccount = async () => {
    const res = await fetch(`${BACKEND_URL}/account`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user.jwt}` },
    });
    if (!res.ok) throw new Error('Failed to delete account');
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
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a' }}>
        <div className="btn-spinner" style={{ width: '32px', height: '32px', borderTopColor: '#6366f1', borderRightColor: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div className={`layout ${isAuthenticated ? 'isAuthenticated' : ''}`}>
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
      {activeMedia && (
        <MediaModal
          item={activeMedia}
          onClose={() => setActiveMedia(null)}
          user={user}
          onSyncSuccess={() => { refresh(); setActiveMedia(null); }}
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

        {/* ── Page Content ── */}
        {activeNav === 'Settings' && isAuthenticated ? (
          <Settings
            user={user}
            captures={captures}
            onNameUpdate={handleNameUpdate}
            onDeleteAllCaptures={handleDeleteAllCaptures}
            onDeleteAccount={handleDeleteAccount}
            storagePreference={storagePreference}
            saveStoragePreference={saveStoragePreference}
            savingPref={savingPref}
          />
        ) : activeNav === 'Feedback' && isAuthenticated ? (
          <FeedbackForm user={user} />
        ) : activeNav === 'Privacy' ? (
          <StaticPage
            title="Privacy Policy"
            content="This is the Privacy Policy for AntCapture. We do not store your data on our servers; it is stored safely in your Google Drive."
          />
        ) : activeNav === 'Security' ? (
          <StaticPage
            title="Security"
            content="We use industry standard encryption and best practices. Your authentication tokens are secure and never exposed."
          />
        ) : activeNav === 'Documentation' ? (
          <StaticPage
            title="Documentation"
            content={"Welcome to AntCapture!\n\n1. Install the Chrome Extension and click 'Load Unpacked' in chrome://extensions.\n2. Sign in with Google in the extension popup.\n3. Click 'Record Screen' to start recording or 'Take Screenshot' to capture.\n4. Everything syncs automatically — open this dashboard to view your library."}
          />
        ) : (
          <Dashboard
            isAuthenticated={isAuthenticated}
            stats={stats}
            filteredCaptures={filteredCaptures}
            loadingCaptures={loadingCaptures}
            filter={filter}
            setFilter={setFilter}
            onSignIn={() => setShowModal(true)}
            onOpenMedia={setActiveMedia}
          />
        )}
      </main>
    </div>
  );
}
