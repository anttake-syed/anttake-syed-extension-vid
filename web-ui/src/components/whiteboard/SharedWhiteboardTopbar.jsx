import React from 'react';
import { IS_LOCAL_MODE } from '../../config.js';

/**
 * SharedWhiteboardTopbar
 *
 * Shown on the shared/public view of a whiteboard (isSharedBoard === true).
 * Replaces the full WhiteboardTopbar so viewers only get pan/zoom controls
 * and CTAs to sign in or edit.
 *
 * Props:
 *   boardName         — string, board title (read-only display)
 *   zoom              — number, current zoom level
 *   onZoomIn/Out/Reset — zoom controls (pan/zoom is still allowed in read-only)
 *   isAuthenticated   — bool, whether the current visitor is signed in
 *   user              — user object (may be null)
 *   hasCloudAccess    — bool, whether the signed-in user has an active Cloud plan
 *   isOwner           — bool, whether the signed-in user is the board owner
 *   isEditLink        — bool, whether the URL has ?access=edit
 *   onSignIn          — fn, open the login modal
 *   onEdit            — fn, called when the Edit button is clicked
 *   onUpgrade         — fn, navigate to the pricing page
 */
export default function SharedWhiteboardTopbar({
  boardName,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isAuthenticated,
  user,
  hasCloudAccess,
  isOwner,
  isEditLink,
  onSignIn,
  onEdit,
  onUpgrade,
}) {
  // Show "Sign in to edit" banner when: ?access=edit URL + not signed in
  const showSignInBanner = isEditLink && !isAuthenticated && !IS_LOCAL_MODE;
  // Show "Upgrade to edit" nudge when: ?access=edit + signed in but no cloud
  const showUpgradeBanner = isEditLink && isAuthenticated && !hasCloudAccess && !isOwner && !IS_LOCAL_MODE;

  return (
    <>
      {/* ── Main Topbar ── */}
      <div className="wb-topbar" style={{ gap: '10px' }}>
        {/* Left: Title + badge */}
        <div className="wb-topbar-left" style={{ gap: '10px', minWidth: 0 }}>
          {/* AntCapture logo-link back to home */}
          <a
            href="/"
            title="AntCapture Home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
              <circle cx="16" cy="16" r="16" fill="url(#stb-g)" />
              <circle cx="16" cy="16" r="6" fill="white" opacity="0.9" />
              <defs>
                <linearGradient id="stb-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
          </a>

          {/* Board name */}
          <span
            className="truncate"
            title={boardName}
            style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', minWidth: 0 }}
          >
            {boardName}
          </span>

          {/* Access mode badge */}
          {isEditLink ? (
            /* Edit-link badge */
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                padding: '3px 9px',
                borderRadius: '20px',
                background: (isAuthenticated && (isOwner || hasCloudAccess))
                  ? 'rgba(99,241,120,0.12)'
                  : 'rgba(251,191,36,0.12)',
                color: (isAuthenticated && (isOwner || hasCloudAccess))
                  ? '#6ee7b7'
                  : '#fbbf24',
                border: (isAuthenticated && (isOwner || hasCloudAccess))
                  ? '1px solid rgba(99,241,120,0.25)'
                  : '1px solid rgba(251,191,36,0.25)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>edit</span>
              {(isAuthenticated && (isOwner || hasCloudAccess)) ? 'Edit Access' : 'Sign in to Edit'}
            </span>
          ) : (
            /* View-only badge */
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                padding: '3px 9px',
                borderRadius: '20px',
                background: 'rgba(99,102,241,0.12)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.25)',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>visibility</span>
              View Only
            </span>
          )}
        </div>

        {/* Center + Right: Zoom controls + Auth/Edit CTAs */}
        <div className="wb-topbar-tools">
          <div className="wb-group">
            <button onClick={onZoomOut} className="wb-zoom-btn" aria-label="Zoom out" title="Zoom out">-</button>
            <span className="wb-zoom-label">{Math.round(zoom * 100)}%</span>
            <button onClick={onZoomIn} className="wb-zoom-btn" aria-label="Zoom in" title="Zoom in">+</button>
            <button onClick={onZoomReset} className="wb-zoom-reset" title="Reset zoom and pan">Reset</button>
          </div>

          <div className="wb-group">
            {/* "Get Cloud" chip — only shown to logged-in free users */}
            {isAuthenticated && !hasCloudAccess && !IS_LOCAL_MODE && (
              <button
                onClick={onUpgrade}
                title="Upgrade to AntCapture Cloud to edit whiteboards"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontFamily: "'Outfit', sans-serif",
                  flexShrink: 0,
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>workspace_premium</span>
                <span className="hide-below-sm">Get Cloud</span>
              </button>
            )}

            {/* Sign in button — only shown to unauthenticated visitors */}
            {!isAuthenticated && !IS_LOCAL_MODE && (
              <button
                onClick={onSignIn}
                title="Sign in with Google"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#1f2937',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontFamily: "'Outfit', sans-serif",
                  flexShrink: 0,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="hide-below-sm">Sign in</span>
              </button>
            )}

            {/* Avatar chip for authenticated users */}
            {isAuthenticated && user?.picture && (
              <img
                src={user.picture}
                alt={user.name || 'You'}
                title={user.name || user.email || ''}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px solid rgba(99,102,241,0.4)',
                  flexShrink: 0,
                  objectFit: 'cover',
                }}
              />
            )}

            {/* Edit button — always visible, behaviour depends on auth/ownership */}
            <button
              onClick={onEdit}
              title={
                !isAuthenticated
                  ? 'Sign in to edit this board'
                  : isOwner
                    ? 'Open editor'
                    : hasCloudAccess
                      ? 'Copy this board to your account to edit'
                      : 'Upgrade to Cloud to edit'
              }
              style={{
                background: (isOwner && isAuthenticated)
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.08)',
                border: (isOwner && isAuthenticated)
                  ? 'none'
                  : '1px solid rgba(255,255,255,0.12)',
                color: (isOwner && isAuthenticated) ? 'white' : '#94a3b8',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: "'Outfit', sans-serif",
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!(isOwner && isAuthenticated)) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
                  e.currentTarget.style.color = '#f1f5f9';
                }
              }}
              onMouseLeave={e => {
                if (!(isOwner && isAuthenticated)) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
              {(isAuthenticated && !isOwner && hasCloudAccess)
                ? <><span className="hide-below-sm">Copy &amp; </span>Edit</>
                : 'Edit'
              }
              {/* Lock icon for non-cloud users who are not the owner */}
              {isAuthenticated && !isOwner && !hasCloudAccess && !IS_LOCAL_MODE && (
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: '13px', color: '#fbbf24' }}
                >
                  lock
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── "Sign in to edit" banner — non-blocking, shown below topbar ── */}
      {showSignInBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '8px 20px',
            background: 'linear-gradient(90deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
            borderBottom: '1px solid rgba(99,102,241,0.25)',
            fontSize: '13px',
            color: '#c4b5fd',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '16px', flexShrink: 0 }}>edit_note</span>
          <span>
            <strong style={{ color: '#e2e8f0' }}>This board has been shared for editing.</strong>
            {' '}Sign in to start editing.
          </span>
          <button
            onClick={onSignIn}
            style={{
              background: '#ffffff',
              border: 'none',
              color: '#1f2937',
              borderRadius: '6px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'Outfit', sans-serif",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      )}

      {/* ── "Upgrade to edit" banner — for free-tier signed-in users on edit links ── */}
      {showUpgradeBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '8px 20px',
            background: 'linear-gradient(90deg, rgba(245,158,11,0.12), rgba(249,115,22,0.12))',
            borderBottom: '1px solid rgba(245,158,11,0.25)',
            fontSize: '13px',
            color: '#fcd34d',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: '16px', flexShrink: 0 }}>workspace_premium</span>
          <span>
            <strong style={{ color: '#fef3c7' }}>Editing requires AntCapture Cloud.</strong>
            {' '}You are viewing in read-only mode.
          </span>
          <button
            onClick={onUpgrade}
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              padding: '5px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              flexShrink: 0,
            }}
          >
            Get Cloud
          </button>
        </div>
      )}
    </>
  );
}
