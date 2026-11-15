import React, { useState, useEffect, useRef } from 'react';

/**
 * WhiteboardInlineTextEditor
 * Modern inline canvas text editor placed directly at the click location.
 * Auto-expands as user types, supports Shift+Enter for multiline,
 * and commits seamlessly on Enter, Escape, or Blur without modal popups.
 */
export default function WhiteboardInlineTextEditor({
  initialText = '',
  x,
  y,
  color = '#f8fafc',
  fontSize = 24,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  onCommit,
  onCancel,
}) {
  const [value, setValue] = useState(initialText);
  const textareaRef = useRef(null);
  const committedRef = useRef(false);

  // Position calculation: world to screen
  const screenLeft = Math.round(x * zoom + panOffset.x);
  const screenTop  = Math.round((y - fontSize) * zoom + panOffset.y);
  const scaledFontSize = Math.max(12, Math.round(fontSize * zoom));

  const adjustSize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.width = 'auto';
    el.style.height = `${Math.max(scaledFontSize * 1.35, el.scrollHeight)}px`;
    el.style.width  = `${Math.max(120, el.scrollWidth + 16)}px`;
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
      adjustSize();
    }
  }, []);

  useEffect(() => {
    adjustSize();
  }, [value, zoom]);

  const handleBlur = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(value);
  };

  const handleKeyDown = (e) => {
    // Stop propagation so whiteboard shortcuts don't hijack typing
    e.stopPropagation();

    if (e.key === 'Escape') {
      e.preventDefault();
      if (committedRef.current) return;
      committedRef.current = true;
      if (initialText) {
        onCommit(initialText); // restore previous text if editing existing
      } else {
        onCancel();
      }
      return;
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline on Shift+Enter
        return;
      }
      // Enter without Shift commits
      e.preventDefault();
      if (committedRef.current) return;
      committedRef.current = true;
      onCommit(value);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenLeft}px`,
        top: `${screenTop}px`,
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          adjustSize();
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Type text…"
        rows={1}
        style={{
          fontSize: `${scaledFontSize}px`,
          lineHeight: 1.25,
          fontFamily: "'Outfit', sans-serif",
          color: color || '#f8fafc',
          caretColor: color || '#f8fafc',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1.5px dashed #6366f1',
          borderRadius: '6px',
          padding: '2px 8px',
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.25), 0 4px 14px rgba(0,0,0,0.5)',
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: 'pre',
          display: 'block',
          boxSizing: 'border-box',
          margin: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          display: 'flex',
          gap: '8px',
          fontSize: '10px',
          color: '#94a3b8',
          background: 'rgba(15, 23, 42, 0.9)',
          padding: '2px 6px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span>↵ Enter to save</span>
        <span>·</span>
        <span>Shift+↵ for new line</span>
        <span>·</span>
        <span>Esc to cancel</span>
      </div>
    </div>
  );
}
