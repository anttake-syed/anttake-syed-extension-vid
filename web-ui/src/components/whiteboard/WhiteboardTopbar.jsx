import React, { useState, useRef, useEffect } from 'react';

export default function WhiteboardTopbar({
  boardName,
  editingName,
  nameDraft,
  nameInputRef,
  setNameDraft,
  setEditingName,
  handleNameCommit,
  nameCommittedRef,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  handleUndo,
  handleRedo,
  handleSave,
  isSaving,
  isSaved,
  saveError,
  hasUnsavedChanges,
  handleClose,
  onOpenShare,
  onOpenShortcuts,
  infiniteCanvas,
  onToggleInfiniteCanvas,
  isReadOnly,
  isSharedBoard,
  onDuplicateToMyBoards,
  isCopying,
  copySuccess,
}) {
  const [showCanvasMenu, setShowCanvasMenu] = useState(false);
  const canvasMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (canvasMenuRef.current && !canvasMenuRef.current.contains(e.target)) {
        setShowCanvasMenu(false);
      }
    };
    if (showCanvasMenu) {
      window.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, [showCanvasMenu]);

  return (
    <div className="wb-topbar">
      {/* Left */}
      <div className="wb-topbar-left">
        <button onClick={handleClose} className="wb-back-btn" aria-label="Back">
          <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>

        {/* Editable name */}
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={handleNameCommit}
            onKeyDown={e => {
              if (e.key === 'Enter') handleNameCommit();
              if (e.key === 'Escape') {
                nameCommittedRef.current = true;
                setEditingName(false);
              }
            }}
            autoFocus
            className="wb-name-input"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--primary)', borderRadius: '8px', color: 'var(--text-main)', padding: '5px 10px', fontSize: '14px', fontWeight: 600, fontFamily: "'Outfit', sans-serif", outline: 'none' }}
          />
        ) : (
          <div
            className="wb-name"
            onClick={() => {
              nameCommittedRef.current = false;
              setNameDraft(boardName);
              setEditingName(true);
            }}
          >
            <span className="truncate" title={boardName} style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {boardName}
            </span>
            <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--text-faint)', flexShrink: 0 }}>
              edit
            </span>
          </div>
        )}
      </div>

      {/* Zoom + Actions */}
      <div className="wb-topbar-tools">
        {/* Center — zoom */}
        <div className="wb-group">
          <button onClick={onZoomOut} className="wb-zoom-btn" aria-label="Zoom out" title="Zoom out (or Ctrl+Scroll)">-</button>
          <span className="wb-zoom-label">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} className="wb-zoom-btn" aria-label="Zoom in" title="Zoom in (or Ctrl+Scroll)">+</button>
          <button onClick={onZoomReset} className="wb-zoom-reset" title="Reset zoom and pan">Reset</button>
        </div>

        {/* Right */}
        <div className="wb-group">
          {/* Subtle auto-save status indicator */}
          <div className="wb-save-status hide-below-sm" data-state={isSaving ? 'saving' : isSaved ? 'saved' : hasUnsavedChanges ? 'unsaved' : 'saved'}>
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
              {isSaving ? 'sync' : isSaved ? 'check' : hasUnsavedChanges ? 'edit_note' : 'cloud_done'}
            </span>
            <span>
              {isSaving ? 'Saving…' : isSaved ? 'All saved' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}
            </span>
          </div>

          <button onClick={handleUndo} title="Undo" aria-label="Undo" className="wb-action-btn">
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>undo</span>
          </button>
          <button onClick={handleRedo} title="Redo" aria-label="Redo" className="wb-action-btn">
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>redo</span>
          </button>

          {/* Canvas Mode Dropdown */}
          <div style={{ position: 'relative' }} ref={canvasMenuRef}>
            <button
              onClick={() => setShowCanvasMenu(prev => !prev)}
              title="Canvas Mode: Infinite Canvas or Fixed Board"
              aria-label="Canvas Mode Options"
              className="wb-action-btn"
              style={{
                color: infiniteCanvas ? '#a5b4fc' : '#38bdf8',
                borderColor: infiniteCanvas ? 'rgba(99,102,241,0.3)' : 'rgba(56,189,248,0.3)',
                background: infiniteCanvas ? 'rgba(99,102,241,0.08)' : 'rgba(56,189,248,0.08)',
                gap: '5px',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                {infiniteCanvas ? 'all_out' : 'fit_screen'}
              </span>
              <span className="hide-below-md" style={{ fontSize: '12px', fontWeight: 600 }}>
                {infiniteCanvas ? 'Infinite Canvas' : 'Fixed Board'}
              </span>
              <span className="material-symbols-rounded" style={{ fontSize: '14px', marginLeft: '-2px', color: '#94a3b8' }}>
                arrow_drop_down
              </span>
            </button>

            {/* Dropdown Menu */}
            {showCanvasMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  width: '240px',
                  background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '6px',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
                  zIndex: 2500,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Canvas Layout Mode
                </div>

                {/* Option 1: Infinite Canvas */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCanvasMenu(false);
                    if (!infiniteCanvas) onToggleInfiniteCanvas(true);
                  }}
                  style={{
                    background: infiniteCanvas ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = infiniteCanvas ? 'rgba(99, 102, 241, 0.2)' : 'transparent'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#818cf8' }}>all_out</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Infinite Canvas</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Free pan & zoom anywhere</div>
                  </div>
                  {infiniteCanvas && (
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#818cf8' }}>check</span>
                  )}
                </button>

                {/* Option 2: Fixed Board */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCanvasMenu(false);
                    if (infiniteCanvas) onToggleInfiniteCanvas(false);
                  }}
                  style={{
                    background: !infiniteCanvas ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = !infiniteCanvas ? 'rgba(56, 189, 248, 0.2)' : 'transparent'}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#38bdf8' }}>fit_screen</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Fixed Board</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Strict 4000 × 3000 screen fit</div>
                  </div>
                  {!infiniteCanvas && (
                    <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#38bdf8' }}>check</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Features & Shortcuts button */}
          <button
            onClick={onOpenShortcuts}
            title="Features, Smart Integrations & Keyboard Shortcuts (?)"
            aria-label="Features and Shortcuts"
            className="wb-action-btn"
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px', color: '#a5b4fc' }}>integration_instructions</span>
            <span className="hide-below-md" style={{ fontSize: '12px', fontWeight: 600 }}>Features & Shortcuts</span>
          </button>

          {/* Share button */}
          <button
            onClick={onOpenShare}
            title="Share Whiteboard"
            aria-label="Share Whiteboard"
            className="wb-action-btn"
            style={{ color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)' }}
          >
            <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>share</span>
            <span className="hide-below-sm" style={{ fontSize: '12px', fontWeight: 600 }}>Share</span>
          </button>

          {/* If viewing a shared board or read-only: show "Copy to Edit" button */}
          {isSharedBoard && (
            <button
              onClick={onDuplicateToMyBoards}
              disabled={isCopying}
              className="wb-save-btn"
              title="Copy this whiteboard to your account to edit"
              style={{
                background: copySuccess ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg, #10b981, #059669)',
                border: copySuccess ? '1px solid #34d399' : 'none',
                color: copySuccess ? '#34d399' : 'white',
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: isCopying ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                {isCopying ? 'progress_activity' : copySuccess ? 'check_circle' : 'content_copy'}
              </span>
              <span>{isCopying ? 'Copying…' : copySuccess ? 'Copied & Opening!' : 'Copy & Edit'}</span>
            </button>
          )}

          {/* Manual Save button (Only for owner/editor) */}
          {!isReadOnly && (
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="wb-save-btn"
              style={{
                background: saveError ? 'rgba(239,68,68,0.15)' : isSaved ? 'rgba(52,211,153,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none',
                color: saveError ? '#f87171' : isSaved ? '#34d399' : 'white',
                padding: '6px 16px',
                borderRadius: '8px',
                cursor: isSaving ? 'default' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s'
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                {isSaving ? 'progress_activity' : saveError ? 'error' : isSaved ? 'check_circle' : 'save'}
              </span>
              {isSaving ? 'Saving…' : saveError ? 'Save failed' : isSaved ? 'Saved!' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
