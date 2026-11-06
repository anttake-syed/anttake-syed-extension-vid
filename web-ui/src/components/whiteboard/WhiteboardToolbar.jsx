import React from 'react';
import { TOOLS, COLORS, SIZES } from './whiteboardConstants.js';

export default function WhiteboardToolbar({
  tool,
  onToolClick,
}) {
  return (
    <div className="wb-toolbar" role="toolbar" aria-label="Whiteboard tools">
      {/* Select + Creation Tools */}
      <div className="wb-tool-group">
        <span className="wb-group-label">Tools</span>
        {TOOLS.filter(t => !['image', 'video'].includes(t.id)).map(t => {
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              title={t.label}
              onClick={() => onToolClick(t.id)}
              className="wb-tool-btn"
              data-active={active}
              aria-pressed={active}
            >
              <span className="material-symbols-rounded">{t.icon}</span>
              <span className="wb-tool-label">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="wb-divider" aria-hidden="true" />

      {/* Media Pickers (Images & Videos from Library) */}
      <div className="wb-tool-group wb-tool-group--media">
        <span className="wb-group-label">Media</span>
        {TOOLS.filter(t => ['image', 'video'].includes(t.id)).map(t => {
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              title={t.label}
              onClick={() => onToolClick(t.id)}
              className="wb-tool-btn"
              data-active={active}
              aria-pressed={active}
            >
              <span className="material-symbols-rounded">{t.icon}</span>
              <span className="wb-tool-label">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

