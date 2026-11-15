import React from 'react';
import { TOOLS } from './whiteboardConstants.js';

/**
 * WhiteboardStatusBar
 * Clean bottom status bar displaying active tool hints, current zoom %, and element counts.
 */
export default function WhiteboardStatusBar({
  tool,
  zoom,
  elementsCount,
  onZoomReset,
}) {
  const currentTool = TOOLS.find(t => t.id === tool);

  return (
    <div className="wb-statusbar">
      <div className="wb-status-left">
        <span
          className="hide-below-sm"
          style={{
            fontSize: '11px',
            color: '#334155',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}
        >
          AntCapture Whiteboard
        </span>
        <span className="hide-below-sm" style={{ fontSize: '11px', color: '#334155' }}>·</span>
        <span className="material-symbols-rounded" style={{ fontSize: '13px', color: 'var(--text-faint)', flexShrink: 0 }}>
          {currentTool?.icon || 'near_me'}
        </span>
        <span className="truncate" style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
          {tool === 'pen'    && 'Click and drag to draw freely'}
          {tool === 'eraser' && 'Drag over strokes to erase'}
          {tool === 'text'   && 'Click anywhere to add text'}
          {tool === 'rect'   && 'Drag to draw a rectangle'}
          {tool === 'circle' && 'Drag to draw an ellipse'}
          {tool === 'arrow'  && 'Drag to draw an arrow'}
          {tool === 'shapes' && 'Pick a prebuilt shape or device frame'}
          {tool === 'icon'   && 'Choose an icon to insert'}
          {tool === 'code'   && 'Add a styled code block'}
          {tool === 'select' && 'Click to select · Shift-click for multi-select · Drag to marquee'}
          {tool === 'pan'    && 'Drag to pan the canvas · Use Ctrl+Scroll to zoom'}
          {tool === 'image'  && 'Pick an image from your library'}
          {tool === 'video'  && 'Pick a video from your library'}
          {tool === 'frame'  && 'Drag to create a grouped frame container (holds objects)'}
        </span>
      </div>

      <div className="hide-below-md" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        {onZoomReset ? (
          <button
            onClick={onZoomReset}
            title="Click to reset zoom to 100%"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              padding: '2px 8px',
              color: '#94a3b8',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f8fafc'; e.currentTarget.style.borderColor = '#6366f1'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
          >
            <span>{Math.round(zoom * 100)}%</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>(Reset 100%)</span>
          </button>
        ) : (
          <span style={{ fontSize: '11px', color: '#475569' }}>
            {Math.round(zoom * 100)}%
          </span>
        )}
        <span style={{ fontSize: '11px', color: '#475569' }}>
          {elementsCount} element{elementsCount !== 1 ? 's' : ''}
        </span>
      </div>
      <span className="wb-status-hint show-below-sm">Best on a larger screen</span>
    </div>
  );
}
