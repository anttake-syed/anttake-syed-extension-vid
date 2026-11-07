import React from 'react';

export default function WhiteboardContextMenu({
  contextMenu,
  hasSelection,
  hasClipboard,
  isReadOnly = false,
  onCut,
  onCopy,
  onPaste,
  onDuplicate,
  onSelectAll,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDelete,
  onClose,
}) {
  if (!contextMenu) return null;

  const MenuItem = ({ icon, label, shortcut, onClick, disabled = false, danger = false }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick?.();
      }}
      disabled={disabled}
      style={{
        width: '100%',
        background: 'none',
        border: 'none',
        color: disabled ? '#475569' : danger ? '#f87171' : '#cbd5e1',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '7px 10px',
        borderRadius: '7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: "'Outfit', sans-serif",
        textAlign: 'left',
        transition: 'background 0.1s ease, color 0.1s ease',
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.12)' : '#1e293b';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span
          className="material-symbols-rounded"
          style={{
            fontSize: '17px',
            color: disabled ? '#475569' : danger ? '#f87171' : '#818cf8',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {shortcut && (
        <span
          style={{
            fontSize: '11px',
            color: '#64748b',
            fontFamily: 'monospace',
            marginLeft: '14px',
            fontWeight: 500,
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );

  const Divider = () => (
    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 2px' }} />
  );

  const isElementMenu = Boolean(hasSelection || contextMenu.hasHit);

  return (
    <div
      style={{
        position: 'fixed',
        top: `min(${contextMenu.y}px, calc(100dvh - 340px))`,
        left: `min(${contextMenu.x}px, calc(100vw - 220px))`,
        zIndex: 3500,
        background: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '6px',
        boxShadow: '0 16px 48px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(99, 102, 241, 0.1)',
        minWidth: '200px',
        fontFamily: "'Outfit', sans-serif",
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onMouseLeave={onClose}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── READ-ONLY MODE MENU ── */}
      {isReadOnly ? (
        <>
          {isElementMenu && (
            <MenuItem icon="content_copy" label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
          )}
          <MenuItem icon="select_all" label="Select All" shortcut="Ctrl+A" onClick={onSelectAll} />
        </>
      ) : isElementMenu ? (
        /* ── ELEMENT SELECTED MENU ── */
        <>
          <MenuItem icon="content_cut" label="Cut" shortcut="Ctrl+X" onClick={onCut} />
          <MenuItem icon="content_copy" label="Copy" shortcut="Ctrl+C" onClick={onCopy} />
          <MenuItem
            icon="content_paste"
            label="Paste"
            shortcut="Ctrl+V"
            onClick={onPaste}
          />
          <MenuItem icon="content_copy" label="Duplicate" shortcut="Ctrl+D" onClick={onDuplicate} />
          <MenuItem icon="select_all" label="Select All" shortcut="Ctrl+A" onClick={onSelectAll} />

          <Divider />

          {/* Layer Order Controls */}
          <MenuItem
            icon="arrow_upward"
            label="Bring Forward"
            shortcut="Ctrl+]"
            onClick={onBringForward}
          />
          <MenuItem
            icon="arrow_downward"
            label="Send Backward"
            shortcut="Ctrl+["
            onClick={onSendBackward}
          />
          <MenuItem
            icon="flip_to_front"
            label="Bring to Front"
            shortcut="Ctrl+Shift+]"
            onClick={onBringToFront}
          />
          <MenuItem
            icon="flip_to_back"
            label="Send to Back"
            shortcut="Ctrl+Shift+["
            onClick={onSendToBack}
          />

          <Divider />

          <MenuItem
            icon="delete"
            label="Delete"
            shortcut="Del"
            danger
            onClick={onDelete}
          />
        </>
      ) : (
        /* ── CANVAS BACKGROUND MENU ── */
        <>
          <MenuItem
            icon="content_paste"
            label="Paste"
            shortcut="Ctrl+V"
            onClick={onPaste}
          />
          <MenuItem icon="select_all" label="Select All" shortcut="Ctrl+A" onClick={onSelectAll} />
        </>
      )}
    </div>
  );
}
