import React from 'react';
import { COLORS, SIZES } from './whiteboardConstants.js';

/**
 * WhiteboardContextBar
 * Floating contextual property bar that floats right above or beside the canvas
 * and automatically adapts to show ONLY what is relevant to the active tool or selection:
 * - When selecting/editing Shapes (rect, circle, arrow, pen): shows Color Swatches & Stroke Width
 * - When selecting/editing Text: shows Text Color Swatches & Font Size scaling
 * - When selecting Media (Image / Video): shows Play/Pause (for videos), Title, and Media Actions
 * - When nothing or pure Select is active: shows Canvas quick status & Clear Selection
 */
export default function WhiteboardContextBar({
  tool,
  selectedElement,
  selectedCount = 0,
  color,
  strokeSize,
  setColor,
  setStrokeSize,
  onOpenTemplates,
  onUpdateSelectedElement,
  onDeleteSelected,
}) {
  // Determine contextual mode:
  // 1. If an element is selected, format context based on element type
  // 2. Otherwise format context based on active drawing tool
  const isSelected = selectedElement != null;
  const targetType = isSelected ? selectedElement.type : tool;

  const showShapeStyles = ['pen', 'rect', 'circle', 'arrow'].includes(targetType);
  const showTextStyles  = targetType === 'text';
  const showMediaStyles = targetType === 'image' || selectedElement?.isVideo;

  const currentColor = isSelected ? (selectedElement.color || color) : color;
  const currentSize  = isSelected ? (selectedElement.size || selectedElement.fontSize || strokeSize) : strokeSize;

  const handleColorChange = (c) => {
    setColor(c);
    if (isSelected && onUpdateSelectedElement) {
      onUpdateSelectedElement({ color: c });
    }
  };

  const handleSizeChange = (s) => {
    setStrokeSize(s);
    if (isSelected && onUpdateSelectedElement) {
      if (selectedElement.type === 'text') {
        onUpdateSelectedElement({ fontSize: 16 + s * 3 });
      } else {
        onUpdateSelectedElement({ size: s });
      }
    }
  };

  return (
    <div className="wb-context-bar" role="region" aria-label="Contextual Tool Properties">
      {/* Templates Button - always accessible in the contextual toolbar */}
      <div className="wb-context-section">
        <button
          onClick={onOpenTemplates}
          className="wb-context-btn wb-context-btn--templates"
          title="Browse whiteboard templates (Kanban, Flowchart, Mind Map, etc.)"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px', color: '#818cf8' }}>
            dashboard_customize
          </span>
          <span className="wb-context-btn-text">Templates</span>
        </button>
      </div>

      {(showShapeStyles || showTextStyles || showMediaStyles || isSelected) && (
        <div className="wb-context-divider" />
      )}

      {/* ── Selection Indicator ── */}
      {isSelected && (
        <div className="wb-context-section wb-context-selected-info">
          <span className="wb-context-pill">
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
              {selectedElement.isVideo ? 'videocam' : selectedElement.type === 'image' ? 'image' : selectedElement.type === 'text' ? 'title' : 'category'}
            </span>
            <span>
              {selectedElement.isVideo ? 'Video' : selectedElement.type === 'image' ? 'Image' : selectedElement.type === 'text' ? 'Text' : selectedElement.type.toUpperCase()}
              {selectedCount > 1 ? ` (+${selectedCount - 1})` : ''}
            </span>
          </span>

          {onDeleteSelected && (
            <button
              onClick={onDeleteSelected}
              className="wb-context-icon-btn wb-context-icon-btn--danger"
              title="Delete selected item"
              aria-label="Delete selected item"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>delete</span>
            </button>
          )}
        </div>
      )}

      {/* ── Contextual Color Palette (Shapes & Text only) ── */}
      {(showShapeStyles || showTextStyles) && (
        <>
          {isSelected && <div className="wb-context-divider" />}
          <div className="wb-context-section">
            <span className="wb-context-label">{showTextStyles ? 'Text Color' : 'Stroke'}</span>
            <div className="wb-context-colors">
              {COLORS.map(c => {
                const isActive = currentColor === c;
                return (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    title={c}
                    aria-label={`Color ${c}`}
                    className="wb-context-swatch"
                    style={{
                      background: c,
                      transform: isActive ? 'scale(1.2)' : 'none',
                      borderColor: isActive ? 'var(--primary, #6366f1)' : 'rgba(255,255,255,0.15)',
                      boxShadow: isActive ? '0 0 0 2px rgba(99,102,241,0.5)' : 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Contextual Thickness / Font Size ── */}
      {(showShapeStyles || showTextStyles) && (
        <>
          <div className="wb-context-divider" />
          <div className="wb-context-section">
            <span className="wb-context-label">{showTextStyles ? 'Font Size' : 'Thickness'}</span>
            <div className="wb-context-sizes">
              {SIZES.map(s => {
                const isActive = currentSize === s;
                return (
                  <button
                    key={s}
                    onClick={() => handleSizeChange(s)}
                    title={showTextStyles ? `Text size ${s}` : `Stroke size ${s}px`}
                    className={`wb-context-size-btn ${isActive ? 'is-active' : ''}`}
                  >
                    <div
                      style={{
                        width: Math.min(26, s * 2 + 4),
                        height: Math.min(s, 7),
                        background: isActive ? '#a5b4fc' : '#64748b',
                        borderRadius: '999px',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Contextual Media controls (Video playback toggle / Image info) ── */}
      {showMediaStyles && selectedElement && (
        <div className="wb-context-section wb-context-media-ctrls">
          {selectedElement.isVideo && (
            <button
              onClick={() => {
                if (!selectedElement.img) return;
                const nextPlaying = !selectedElement.isPlaying;
                if (nextPlaying) selectedElement.img.play(); else selectedElement.img.pause();
                if (onUpdateSelectedElement) onUpdateSelectedElement({ isPlaying: nextPlaying });
              }}
              className="wb-context-btn"
              title={selectedElement.isPlaying ? 'Pause video' : 'Play video preview'}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                {selectedElement.isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{selectedElement.isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          )}
          {selectedElement.title && (
            <span className="wb-context-title-tag truncate" style={{ maxWidth: '140px' }} title={selectedElement.title}>
              {selectedElement.title}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
