import React, { useEffect, useRef } from 'react';

/**
 * ConfirmDeleteModal
 * A premium, animated in-UI confirmation dialog.
 * Props:
 *   isOpen      – boolean, controls visibility
 *   title       – string, headline text
 *   message     – string, body copy
 *   confirmText – string, label for the destructive button (default: "Delete")
 *   onConfirm   – () => void, called when user confirms
 *   onCancel    – () => void, called when user cancels or presses Escape
 *   loading     – boolean, disables buttons while action is in flight
 */
export default function ConfirmDeleteModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}) {
  const cancelRef = useRef(null);

  /* Auto-focus Cancel on open for keyboard safety */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [isOpen]);

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape' && !loading) onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="cdm-overlay"
      onClick={() => !loading && onCancel?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflowY: 'auto',
        animation: 'cdmFadeIn 0.18s ease both',
      }}
    >
      <style>{`
        @keyframes cdmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cdmSlideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .cdm-cancel-btn:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(255,255,255,0.18) !important;
          color: #f1f5f9 !important;
        }
        .cdm-confirm-btn:hover:not(:disabled) {
          background: #dc2626 !important;
          box-shadow: 0 6px 24px rgba(220,38,38,0.45) !important;
          transform: translateY(-1px);
        }
        .cdm-overlay { padding: 24px; }
        .cdm-card {
          padding: 32px 30px 28px;
          max-height: calc(100dvh - 48px);
          overflow-y: auto;
        }
        .cdm-actions { gap: 10px; }
        @media (min-width: 640px) {
          .cdm-actions > * { flex: 1; }
        }
        @media (max-width: 639.98px) {
          .cdm-overlay { padding: var(--space-4); }
          .cdm-card {
            padding: var(--space-6) var(--space-5) var(--space-5);
            max-height: calc(100dvh - 2 * var(--space-4));
          }
        }
        @media (pointer: coarse) {
          .cdm-actions > * { min-height: var(--tap-target); }
        }
      `}</style>

      {/* Dialog card */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cdm-title"
        aria-describedby="cdm-message"
        className="cdm-card"
        style={{
          background: '#0d1526',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(239,68,68,0.08)',
          animation: 'cdmSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Icon + heading */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
          {/* Danger icon ring */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            border: '1.5px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-rounded" style={{ fontSize: '32px', color: '#f87171' }}>
              delete_forever
            </span>
          </div>

          <div>
            <h2
              id="cdm-title"
              className="break-anywhere"
              style={{ margin: 0, fontSize: '19px', fontWeight: '700', color: 'var(--text-main)', lineHeight: 1.3 }}
            >
              {title}
            </h2>
            <p
              id="cdm-message"
              className="break-anywhere"
              style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6' }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        {/* Warning note */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: '10px', padding: '12px 14px',
        }}>
          <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#f87171', flexShrink: 0, marginTop: '1px' }}>
            warning
          </span>
          <span style={{ fontSize: '13px', color: 'var(--danger-soft)', lineHeight: '1.5' }}>
            This action is <strong>permanent</strong> and cannot be undone. The capture will be removed from all storage locations.
          </span>
        </div>

        {/* Action buttons */}
        <div className="dialog-actions cdm-actions">
          <button
            ref={cancelRef}
            className="cdm-cancel-btn"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: 'var(--text-dim)',
              fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.18s ease',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>

          <button
            className="cdm-confirm-btn"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '12px 16px',
              background: loading ? 'rgba(239,68,68,0.5)' : 'var(--danger)',
              border: 'none',
              borderRadius: '10px', color: 'white',
              fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.18s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(239,68,68,0.35)',
            }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  animation: 'spin 0.7s linear infinite',
                  display: 'inline-block',
                }} />
                Deleting…
              </>
            ) : (
              <>
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete_forever</span>
                {confirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
