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

  const showShapeStyles = ['pen', 'rect', 'circle', 'arrow', 'frame'].includes(targetType);
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

      {/* ── Selection Indicator & Controls ── */}
      {isSelected && (
        <div className="wb-context-section wb-context-selected-info">
          <span className="wb-context-pill">
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
              {selectedElement.isVideo ? 'videocam' : selectedElement.type === 'image' ? 'image' : selectedElement.type === 'text' ? 'title' : selectedElement.type === 'frame' ? 'crop_free' : 'category'}
            </span>
            <span>
              {selectedElement.isVideo ? 'Video' : selectedElement.type === 'image' ? 'Image' : selectedElement.type === 'text' ? 'Text' : selectedElement.type === 'frame' ? (selectedElement.title || 'Frame') : selectedElement.type.toUpperCase()}
              {selectedCount > 1 ? ` (+${selectedCount - 1})` : ''}
            </span>
          </span>

          {/* Quick Rotate 90 degrees */}
          {['rect', 'circle', 'image', 'frame'].includes(selectedElement.type) && onUpdateSelectedElement && (
            <button
              onClick={() => {
                const currentRot = selectedElement.rotation || 0;
                const nextRot = (currentRot + Math.PI / 2) % (Math.PI * 2);
                onUpdateSelectedElement({ rotation: nextRot });
              }}
              className="wb-context-icon-btn"
              title="Rotate 90°"
              aria-label="Rotate 90 degrees"
            >
              <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>rotate_right</span>
            </button>
          )}

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
            <span className="wb-context-label">{showTextStyles ? 'Text Color' : 'Color'}</span>
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

      {/* ── Fill Texture Mode (Outline only vs Textured semi-fill vs Hatch) ── */}
      {showShapeStyles && ['rect', 'circle'].includes(targetType) && (
        <>
          <div className="wb-context-divider" />
          <div className="wb-context-section">
            <span className="wb-context-label">Fill</span>
            <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '7px' }}>
              <button
                onClick={() => {
                  if (isSelected && onUpdateSelectedElement) onUpdateSelectedElement({ fillStyle: 'none' });
                }}
                className={`wb-context-icon-btn ${(!selectedElement?.fillStyle || selectedElement?.fillStyle === 'none') ? 'is-active' : ''}`}
                title="Outline only (transparent inside)"
                style={{
                  background: (!selectedElement?.fillStyle || selectedElement?.fillStyle === 'none') ? 'rgba(99,102,241,0.25)' : 'none',
                  color: (!selectedElement?.fillStyle || selectedElement?.fillStyle === 'none') ? '#a5b4fc' : '#94a3b8',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>check_box_outline_blank</span>
              </button>
              <button
                onClick={() => {
                  if (isSelected && onUpdateSelectedElement) onUpdateSelectedElement({ fillStyle: 'solid' });
                }}
                className={`wb-context-icon-btn ${selectedElement?.fillStyle === 'solid' ? 'is-active' : ''}`}
                title="Textured soft fill"
                style={{
                  background: selectedElement?.fillStyle === 'solid' ? 'rgba(99,102,241,0.25)' : 'none',
                  color: selectedElement?.fillStyle === 'solid' ? '#a5b4fc' : '#94a3b8',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>format_color_fill</span>
              </button>
              <button
                onClick={() => {
                  if (isSelected && onUpdateSelectedElement) onUpdateSelectedElement({ fillStyle: 'hachure' });
                }}
                className={`wb-context-icon-btn ${selectedElement?.fillStyle === 'hachure' ? 'is-active' : ''}`}
                title="Pencil sketch hatch fill"
                style={{
                  background: selectedElement?.fillStyle === 'hachure' ? 'rgba(99,102,241,0.25)' : 'none',
                  color: selectedElement?.fillStyle === 'hachure' ? '#a5b4fc' : '#94a3b8',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>texture</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Corner Curvature Toggle (for Rectangles) ── */}
      {showShapeStyles && targetType === 'rect' && (
        <>
          <div className="wb-context-divider" />
          <div className="wb-context-section">
            <span className="wb-context-label">Edges</span>
            <button
              onClick={() => {
                const currentRadius = selectedElement?.radius !== undefined ? selectedElement.radius : 12;
                const nextRadius = currentRadius === 0 ? 12 : 0;
                if (isSelected && onUpdateSelectedElement) onUpdateSelectedElement({ radius: nextRadius });
              }}
              className="wb-context-btn"
              title={selectedElement?.radius === 0 ? 'Click to enable smooth rounded corners' : 'Click to toggle sharp square corners'}
              style={{ padding: '3px 8px', fontSize: '11px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px', color: '#818cf8' }}>
                {selectedElement?.radius === 0 ? 'square' : 'rounded_corner'}
              </span>
              <span>{selectedElement?.radius === 0 ? 'Sharp' : 'Curved'}</span>
            </button>
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
