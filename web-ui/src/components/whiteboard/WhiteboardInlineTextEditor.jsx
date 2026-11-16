import React, { useState, useEffect, useRef } from 'react';

/**
 * WhiteboardInlineTextEditor
 * Seamless, distraction-free inline canvas text editor placed directly at the click location.
 * Provides a natural Google Docs / Excalidraw-like writing experience:
 * - Clean, transparent background matching canvas text
 * - Auto-expands smoothly as the user types
 * - Allows multiline editing (Enter adds new line in paragraphs/code)
 * - Clean commit on outside click or blur
 * - No annoying "Enter to save" popups or jarring dashed borders
 */
export default function WhiteboardInlineTextEditor({
  initialText = '',
  x,
  y,
  color = '#f8fafc',
  fontSize = 24,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  centered = false,
  minWidth = 140,
  placeholder = 'Type something…',
  mode = 'text',
  onCommit,
  onCancel,
}) {
  const [value, setValue]    = useState(initialText);
  const textareaRef          = useRef(null);
  const containerRef         = useRef(null);
  const committedRef         = useRef(false);

  // World -> screen position
  const screenLeft     = Math.round(x * zoom + panOffset.x);
  const screenTop      = centered ? Math.round(y * zoom + panOffset.y) : Math.round((y - fontSize) * zoom + panOffset.y);
  const scaledFontSize = Math.max(13, Math.round(fontSize * zoom));

  const adjustSize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.width  = 'auto';
    el.style.height = `${Math.max(scaledFontSize * 1.3, el.scrollHeight)}px`;
    el.style.width  = `${Math.max(minWidth, el.scrollWidth + 12)}px`;
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd   = el.value.length;
      adjustSize();
    }
  }, []);

  useEffect(() => { adjustSize(); }, [value, zoom]);

  const doCommit = (val) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit(val !== undefined ? val : value);
  };

  const doCancel = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    if (initialText) {
      onCommit(initialText);
    } else {
      onCancel();
    }
  };

  // Commit naturally when focus leaves the editor
  const handleContainerBlur = (e) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget)) {
      return;
    }
    doCommit(value);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation(); // Stop whiteboard shortcuts (like delete, space, v) while typing

    if (e.key === 'Escape') {
      e.preventDefault();
      doCommit(value);
      return;
    }

    // In single-line prompt modes (embed url / frame title), Enter commits immediately.
    // In normal text or code mode, Enter inserts a new line naturally like a document!
    if (e.key === 'Enter') {
      if (mode === 'embed-url' || mode === 'frame-title') {
        e.preventDefault();
        doCommit(value);
      }
      // For normal text, code, or shape-text, Enter naturally inserts a new line
    }
  };

  const isCode = mode === 'code-content';

  return (
    <div
      ref={containerRef}
      style={{
        position:      'absolute',
        left:          `${screenLeft}px`,
        top:           `${screenTop}px`,
        transform:     centered ? 'translate(-50%, -50%)' : 'none',
        zIndex:        120,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e)     => e.stopPropagation()}
      onBlur={handleContainerBlur}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); adjustSize(); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        spellCheck={false}
        style={{
          fontSize:          `${scaledFontSize}px`,
          lineHeight:        isCode ? 1.4 : 1.25,
          fontFamily:        isCode ? "'Fira Code', monospace, sans-serif" : "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
          color:             color || '#f8fafc',
          caretColor:        color || '#f8fafc',
          background:        isCode ? 'rgba(10, 15, 29, 0.95)' : 'rgba(2, 6, 23, 0.45)',
          border:            '1px solid rgba(99, 102, 241, 0.4)',
          borderRadius:      isCode ? '6px' : '4px',
          padding:           '2px 6px',
          outline:           'none',
          boxShadow:         '0 0 0 1px rgba(99, 102, 241, 0.3), 0 2px 8px rgba(0,0,0,0.4)',
          resize:            'none',
          overflow:          'hidden',
          whiteSpace:        'pre',
          textAlign:         centered ? 'center' : 'left',
          display:           'block',
          boxSizing:         'border-box',
          margin:            0,
          // Override parent's user-select: none so the textarea is fully interactive
          userSelect:        'text',
          WebkitUserSelect:  'text',
          MozUserSelect:     'text',
          cursor:            'text',
        }}
      />
    </div>
  );
}
