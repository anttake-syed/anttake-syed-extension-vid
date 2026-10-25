import React from 'react';

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
  setZoom,
  handleUndo,
  handleRedo,
  handleSave,
  isSaving,
  isSaved,
  saveError,
  hasUnsavedChanges,
  handleClose,
  onOpenShare,
}) {
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
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="wb-zoom-btn" aria-label="Zoom out">-</button>
          <span className="wb-zoom-label">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(3, z + 0.25))} className="wb-zoom-btn" aria-label="Zoom in">+</button>
          <button onClick={() => setZoom(1)} className="wb-zoom-reset">Reset</button>
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

          {/* Manual Save button */}
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
        </div>
      </div>
    </div>
  );
}
