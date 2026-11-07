import React, { useState, useRef, useEffect } from 'react';

/**
 * WhiteboardUserMenu
 *
 * Clean, lightweight user profile pill and dropdown menu for whiteboard topbars.
 * Displays user avatar, name, and email, with:
 *   - "Switch / Add Account" (triggers onSignIn)
 *   - "Sign Out" (triggers onLogout)
 *
 * Props:
 *   user       — object with name, email, picture
 *   onLogout   — function to log the user out
 *   onSwitch   — function to open the sign-in modal to switch account
 */
export default function WhiteboardUserMenu({ user, onLogout, onSwitch }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener('pointerdown', handleOutside);
    }
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* Trigger Pill */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        title={user.name || user.email || 'Your account'}
        style={{
          background: open ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          padding: '3px 8px 3px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
          transition: 'all 0.15s ease',
        }}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name || 'Account'}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid rgba(99,102,241,0.5)',
            }}
          />
        ) : (
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {user.name?.charAt(0) || 'U'}
          </div>
        )}
        <span
          className="hide-below-sm"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#e2e8f0',
            maxWidth: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.name || user.email}
        </span>
        <span
          className="material-symbols-rounded"
          style={{
            fontSize: '14px',
            color: '#94a3b8',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
          }}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '230px',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15)',
            padding: '8px',
            zIndex: 4000,
            fontFamily: "'Outfit', sans-serif",
            animation: 'fadeIn 0.15s ease both',
          }}
        >
          {/* Account info header */}
          <div
            style={{
              padding: '8px 10px 10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#f8fafc',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name || 'Signed In User'}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '2px',
              }}
            >
              {user.email || ''}
            </div>
          </div>

          {/* Switch / Add Account */}
          {onSwitch && (
            <button
              onClick={() => {
                setOpen(false);
                onSwitch();
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s ease, color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#818cf8' }}>
                switch_account
              </span>
              <span>Switch Account</span>
            </button>
          )}

          {/* Sign Out */}
          {onLogout && (
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#f87171',
                borderRadius: '8px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#f87171' }}>
                logout
              </span>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
