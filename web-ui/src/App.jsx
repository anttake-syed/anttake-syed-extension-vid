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
import Pricing from './components/Pricing.jsx';
import SubscriptionManage from './components/SubscriptionManage.jsx';
import Whiteboards from './components/Whiteboards.jsx';
import WhiteboardEditor from './components/WhiteboardEditor.jsx';

import StaticPage from './components/StaticPage.jsx';
import ServerHealthBadge from './components/ServerHealthBadge.jsx';
import AdminDiagnostics from './components/AdminDiagnostics.jsx';

const NAV_TO_PATH = {
  'Dashboard':      '/',
  'My Library':     '/library',
  'Whiteboards':    '/whiteboards',
  'Pricing':        '/pricing',
  'Subscription':   '/subscription',
  'Settings':       '/settings',
  'Feedback':       '/feedback',
  'Privacy':        '/privacy-policy',
  'Terms':          '/terms-of-service',
  'Refund Policy':  '/refund-policy',
  'Security':       '/security',
  'Documentation':  '/documentation',
  'Diagnostics':    '/admin/diagnostics',
};

const PATH_TO_NAV = Object.fromEntries(Object.entries(NAV_TO_PATH).map(([k, v]) => [v, k]));

// ── Feedback Page ──────────────────────────────────────────────────────────────
// Replace this URL with your actual Google Form embed link.
// In Google Forms: Send → Embed → copy the src="..." URL from the <iframe> tag.
const GOOGLE_FORM_EMBED_URL = 'YOUR_GOOGLE_FORM_EMBED_URL_HERE';

function FeedbackPage() {
  return (
    <div style={{ padding: '36px 40px', maxWidth: '800px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Feedback
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          Found a bug, have a feature idea, or just want to say hi? Fill out the form below.
        </p>
      </div>
      {GOOGLE_FORM_EMBED_URL === 'YOUR_GOOGLE_FORM_EMBED_URL_HERE' ? (
        <div style={{
          padding: '48px 32px',
          background: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '16px', display: 'block', color: 'var(--accent)' }}>
            assignment
          </span>
          <p style={{ fontSize: '15px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: 600 }}>
            Google Form not configured yet
          </p>
          <p style={{ fontSize: '13px' }}>
            Set <code style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>GOOGLE_FORM_EMBED_URL</code> in <code style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>App.jsx</code> to your Google Form embed link.
          </p>
        </div>
      ) : (
        <iframe
          src={GOOGLE_FORM_EMBED_URL}
          width="100%"
          height="800"
          frameBorder="0"
          marginHeight="0"
          marginWidth="0"
          title="AntCapture Feedback Form"
          style={{
            borderRadius: '16px',
            border: '1px solid var(--border)',
            background: 'var(--card-bg)',
          }}
        >
          Loading…
        </iframe>
      )}
    </div>
  );
}

export default function App() {
  const { user, isAuthenticated, isInitializing, logout, updateUser } = useAuth();

  const {
    captures, setCaptures, dbStats,
    storagePreference, loadingCaptures, savingPref,
    saveStoragePreference, deleteCapture, refresh,
  } = useCaptures(user, isAuthenticated);

  const [activeNav, setActiveNav] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/whiteboard/')) return 'Whiteboards';
    if (path.startsWith('/capture/')) return 'My Library';
    if (PATH_TO_NAV[path]) {return PATH_TO_NAV[path];}
    
    const params = new URLSearchParams(window.location.search);
    return params.get('nav') || 'Dashboard';
  });
  
  const [activeBoard, setActiveBoard] = useState(() => {
    const match = window.location.pathname.match(/^\/whiteboard\/([^/]+)/);
    return match ? { id: match[1] } : null;
  });

  const [activeMedia, setActiveMedia] = useState(null);
  
  const [pendingCaptureId, setPendingCaptureId] = useState(() => {
    const match = window.location.pathname.match(/^\/capture\/([^/]+)/);
    return match ? match[1] : null;
  });

  useEffect(() => {
    if (pendingCaptureId && captures.length > 0 && !activeMedia) {
      const found = captures.find(c => c.id === pendingCaptureId);
      if (found) {
        setActiveMedia(found);
        setPendingCaptureId(null);
      }
    }
  }, [pendingCaptureId, captures, activeMedia]);
  const [wbRefreshKey, setWbRefreshKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync state to URL and Document Title
  useEffect(() => {
    document.title = `${activeNav} - AntCapture`;
    
    if (activeBoard || activeMedia) return;
    
    const targetPath = NAV_TO_PATH[activeNav] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeNav, activeBoard, activeMedia]);

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
      
      const boardMatch = path.match(/^\/whiteboard\/([^/]+)/);
      if (boardMatch) {
        setActiveBoard({ id: boardMatch[1] });
        setActiveNav('Whiteboards');
        return;
      } else {
        setActiveBoard(null);
      }
      
      const captureMatch = path.match(/^\/capture\/([^/]+)/);
      if (captureMatch) {
        setPendingCaptureId(captureMatch[1]);
        setActiveNav('My Library');
        return;
      } else {
        setActiveMedia(null);
        setPendingCaptureId(null);
      }
      
      if (PATH_TO_NAV[path]) {
        setActiveNav(PATH_TO_NAV[path]);
      } else {
        setActiveNav('Dashboard');
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const stats = [
    { label: 'Total Captures', value: (dbStats?.total ?? captures.length).toString(), icon: 'folder' },
    {
      label: 'Local Storage Used',
      value: dbStats?.localBytesFormatted ?? '0 B',
      icon: 'hard_drive',
      sub: dbStats ? `${dbStats.localCount} files local` : null,
    },
    // Only show Google Drive stat in cloud mode
    ...(!IS_LOCAL_MODE && dbStats?.storageServer !== 'local' ? [{
      label: 'Google Drive Used',
      value: dbStats?.appDriveFormatted ?? '0 B',
      icon: 'drive',
      isDrive: true,
      sub: dbStats ? `${dbStats.driveCount} files on Drive` : null,
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
    let pageSkeleton;
    if (activeNav === 'Pricing') {
      pageSkeleton = (
        <div style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '340px', height: '42px', borderRadius: '8px', marginBottom: '16px' }}></div>
            <div className="skeleton-box" style={{ width: '440px', height: '24px', borderRadius: '6px', marginBottom: '32px' }}></div>
            <div className="skeleton-box" style={{ width: '180px', height: '36px', borderRadius: '12px' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '64px' }}>
            <div className="skeleton-box" style={{ height: '380px', borderRadius: '22px' }}></div>
            <div className="skeleton-box" style={{ height: '380px', borderRadius: '22px' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '640px', margin: '0 auto' }}>
            <div className="skeleton-box" style={{ height: '56px', borderRadius: '14px' }}></div>
            <div className="skeleton-box" style={{ height: '56px', borderRadius: '14px' }}></div>
            <div className="skeleton-box" style={{ height: '56px', borderRadius: '14px' }}></div>
          </div>
        </div>
      );
    } else if (activeNav === 'Whiteboards') {
      pageSkeleton = (
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
            <div>
              <div className="skeleton-box" style={{ width: '200px', height: '32px', borderRadius: '6px', marginBottom: '8px' }}></div>
              <div className="skeleton-box" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
            </div>
            <div className="skeleton-box" style={{ width: '140px', height: '40px', borderRadius: '10px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: 22 }}>
            <div className="skeleton-box" style={{ width: '260px', height: '36px', borderRadius: '9px' }}></div>
            <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '9px' }}></div>
            <div className="skeleton-box" style={{ width: '120px', height: '36px', borderRadius: '9px' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-box" style={{ height: '220px', borderRadius: '14px' }}></div>
            ))}
          </div>
        </div>
      );
    } else if (activeNav === 'My Library') {
      pageSkeleton = (
        <div style={{ maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
            <div className="skeleton-box" style={{ width: '180px', height: '32px', borderRadius: '6px' }}></div>
            <div className="skeleton-box" style={{ width: '240px', height: '38px', borderRadius: '10px' }}></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="skeleton-box" style={{ height: '240px', borderRadius: '14px' }}></div>
            ))}
          </div>
        </div>
      );
    } else {
      pageSkeleton = (
        <>
          <div className="skeleton-box" style={{ width: '100%', height: '140px', borderRadius: '16px', marginBottom: '28px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton-box" style={{ width: '100%', height: '140px', borderRadius: '16px' }}></div>)}
          </div>
        </>
      );
    }

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
          {pageSkeleton}
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
          onClose={() => { 
            setActiveMedia(null);
            const targetPath = NAV_TO_PATH[activeNav] || '/';
            window.history.pushState(null, '', targetPath);
          }}
          onSyncSuccess={() => { refresh(); setActiveMedia(null); }}
          onDelete={(id) => { deleteCapture(id); setActiveMedia(null); }}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} 
        onClick={() => setMobileMenuOpen(false)}
      />

      <Sidebar
        activeNav={activeNav}
        isAuthenticated={isAuthenticated}
        onNavClick={(nav) => { setActiveNav(nav); setActiveBoard(null); setActiveMedia(null); setMobileMenuOpen(false); }}
        onSignIn={() => { setShowModal(true); setMobileMenuOpen(false); }}
        onLogout={() => { handleLogout(); setMobileMenuOpen(false); }}
        mobileMenuOpen={mobileMenuOpen}
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
          onNavClick={(nav) => { setActiveNav(nav); setActiveBoard(null); setActiveMedia(null); }}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        {/* Server health pill — only visible in local/self-hosted mode */}
        <div style={{ position: 'fixed', top: '14px', right: '20px', zIndex: 200 }}>
          <ServerHealthBadge />
        </div>


        {/* ── Page Content ── */}
        {activeBoard ? (
          <WhiteboardEditor board={activeBoard} onClose={() => { 
            setActiveBoard(null);
            const targetPath = NAV_TO_PATH[activeNav] || '/';
            window.history.pushState(null, '', targetPath);
            setWbRefreshKey(k => k + 1); 
          }} user={user} />
        ) : activeNav === 'Settings' && isAuthenticated ? (
          <Settings user={user} captures={captures} dbStats={dbStats} onNameUpdate={handleNameUpdate} onDeleteAllCaptures={handleDeleteAllCaptures} onDeleteAccount={handleDeleteAccount} storagePreference={storagePreference} saveStoragePreference={saveStoragePreference} savingPref={savingPref} onManageSubscription={() => setActiveNav('Subscription')} />
        ) : activeNav === 'Subscription' && isAuthenticated ? (
          <SubscriptionManage user={user} />
        ) : activeNav === 'Whiteboards' ? (
          <Whiteboards key={wbRefreshKey} user={user} isAuthenticated={isAuthenticated} onSignIn={() => setShowModal(true)} onOpenBoard={setActiveBoard} />
        ) : activeNav === 'Pricing' ? (
          <Pricing user={user} isAuthenticated={isAuthenticated} onSignIn={() => setShowModal(true)} />
        ) : activeNav === 'Feedback' ? (
          <FeedbackPage />
        ) : activeNav === 'Terms' ? (
          <StaticPage
            title="Terms of Service"
            content={`Last updated: August 2025

Please read these Terms of Service ("Terms") carefully before using AntCapture. By accessing or using the Service, you agree to be bound by these Terms.

1. ACCEPTANCE OF TERMS
By creating an account or using AntCapture, you confirm that you are at least 18 years old and agree to these Terms and our Privacy Policy.

2. DESCRIPTION OF SERVICE
AntCapture is a screen capture, video recording, and cloud storage tool available as a browser extension and web dashboard. We offer a Cloud subscription plan and a free self-hosted option.

3. SUBSCRIPTION AND BILLING
- Cloud Plan: $10/month billed annually ($120/year) or $12/month billed monthly.
- Billing is processed securely via LemonSqueezy. By subscribing, you authorise us to charge your chosen payment method on a recurring basis.
- Prices are in USD and inclusive of any applicable taxes where required by law.
- You may cancel your subscription at any time from the Settings page. Cancellation takes effect at the end of the current billing period — you retain access until that date.

4. FREE / SELF-HOSTED TIER
The self-hosted version of AntCapture is free and open-source. You are responsible for your own infrastructure, storage, and security. We provide no uptime guarantee or support for self-hosted deployments.

5. ACCEPTABLE USE
You agree not to:
- Use AntCapture to capture, store, or share content that violates any law or third-party rights.
- Attempt to reverse-engineer, resell, or exploit the Service commercially without written permission.
- Use the Service to collect or store sensitive personal data of others without their consent.

6. INTELLECTUAL PROPERTY
AntCapture and its original content, features, and functionality are owned by AntCapture and protected by applicable intellectual property laws. Your captures and data remain yours.

7. DISCLAIMER OF WARRANTIES
The Service is provided "as is" without warranties of any kind, express or implied, including but not limited to fitness for a particular purpose or uninterrupted availability.

8. LIMITATION OF LIABILITY
To the maximum extent permitted by law, AntCapture shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.

9. CHANGES TO TERMS
We may update these Terms at any time. We will notify you of significant changes via email or an in-app notice. Continued use after changes constitutes acceptance.

10. GOVERNING LAW
These Terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved through binding arbitration or the courts of the applicable jurisdiction.

11. CONTACT
For questions about these Terms, please reach us through the Feedback page or the Custom plan contact form on our Pricing page.`}
          />
        ) : activeNav === 'Refund Policy' ? (
          <StaticPage
            title="Refund Policy"
            content={`Last updated: August 2025

We want you to be completely satisfied with AntCapture. This Refund Policy explains your rights and our process.

1. MONEY-BACK GUARANTEE
We offer a 14-day money-back guarantee for new Cloud plan subscriptions. If you are not satisfied for any reason, contact us within 14 days of your initial purchase and we will issue a full refund — no questions asked.

2. HOW TO REQUEST A REFUND
- Email us through the Feedback page or the contact form on our Pricing page.
- Include the email address associated with your account and your reason for the refund request (optional but helpful).
- Refunds are typically processed within 5–10 business days depending on your bank or card provider.

3. RENEWALS
- Subscription renewals (monthly or annual) are not refundable after the renewal date has passed, except where required by applicable law.
- If you wish to avoid a renewal charge, please cancel your subscription at least 24 hours before the next billing date from the Settings page.

4. PARTIAL REFUNDS
We do not issue partial or pro-rated refunds for unused time within a billing period, except where required by law.

5. PAYMENT PROCESSOR
All payments are securely handled by LemonSqueezy. Refunds will be returned to the original payment method used at checkout.

6. EXCEPTIONS
Refunds may be denied if we reasonably determine that the policy is being abused (e.g., repeated purchase-and-refund cycles).

7. SELF-HOSTED / FREE TIER
The self-hosted version of AntCapture is free and no refunds are applicable.

8. CONTACT
For refund requests or billing questions, please use the contact form on our Pricing page or reach us through the Feedback page. We respond within 1 business day.`}
          />
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
        ) : activeNav === 'Documentation' ? (
          <StaticPage
            title="Documentation"
            content={`Welcome to the AntCapture Documentation.

KEYBOARD SHORTCUTS
AntCapture is designed for speed. Use these shortcuts to capture instantly:
• Alt + Shift + S : Capture visible screen (Screenshot)
• Alt + Shift + C : Start/Stop Camera recording
• Alt + Shift + V : Start/Stop Screen recording

FUZZY SEARCH
Your Library supports advanced fuzzy search. You don't need to type exact filenames — just type fragments, and the dashboard will instantly filter your captures based on title, format, or date.

AUTO-SAVE WORKFLOW (edit.html)
When you finish a recording, AntCapture opens the Studio (edit.html).
If you have Auto-Save enabled in Settings, a 5-second countdown begins immediately.
• If you do nothing, the capture automatically saves to your preferred destination and the tab closes.
• If you click "Cancel Auto-Save" (the lightning bolt icon) during the countdown, the auto-save is aborted, allowing you to manually review or discard the file.

STORAGE OPTIONS
• Local: Saves directly to your computer or self-hosted server's database. Fast and completely private.
• Google Drive: Uploads directly to a private folder in your Google Drive. Files do not touch our servers.
• Both: Keeps a local copy for instant access and backs up to Google Drive automatically.

VOIDBOARD — LIMITS & HOW MEDIA WORKS
Each account can create up to 1,000 VoidBoards. Each board can hold up to 5,000 objects (shapes, text, images, videos, and other elements).

HOW MEDIA GETS INTO YOUR BOARDS
AntCapture does not support direct file uploads from your computer into the web UI, cloud, or VoidBoard. All media must come through one of these two paths:

1. Chrome Extension (primary method)
   Take a screenshot or record a video directly using the AntCapture Chrome extension. The capture is saved to your cloud library automatically. You can then insert it into any VoidBoard from your library.

2. Google Drive (external media)
   If you have existing images or videos on your device that you want to use in a board, upload them to your Google Drive first. From there, you can link or insert them into your VoidBoard via the Drive integration.

IMPORTANT: There is no drag-and-drop or file-picker upload directly into the web UI or whiteboard canvas. Only media captured by the extension or linked from Google Drive can be used.

HOW WHITEBOARD MEDIA STORAGE WORKS
Media shown inside a VoidBoard is never duplicated. The actual file (image or video) lives in your cloud library or Google Drive. The whiteboard stores only the reference to that media — its position on the canvas, size, layer order, and any other layout data. This means:
• Your storage is not used twice for the same file.
• Moving or resizing media on the canvas does not affect the original file.
• Deleting a capture from your library will remove it from any board it was placed in.`}
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

        ) : activeNav === 'Diagnostics' && isAuthenticated ? (
          <AdminDiagnostics user={user} />
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
