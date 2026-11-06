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
          {tool === 'select' && 'Click to select · Shift-click for multi-select · Drag to marquee'}
          {tool === 'pan'    && 'Drag to pan the canvas · Use Ctrl+Scroll to zoom'}
          {tool === 'image'  && 'Pick an image from your library'}
          {tool === 'video'  && 'Pick a video from your library'}
          {tool === 'frame'  && 'Drag to create a grouped frame container'}
        </span>
      </div>

      <div className="hide-below-md" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: '#475569' }}>
          {Math.round(zoom * 100)}% · {elementsCount} element{elementsCount !== 1 ? 's' : ''}
        </span>
      </div>
      <span className="wb-status-hint show-below-sm">Best on a larger screen</span>
    </div>
  );
}
