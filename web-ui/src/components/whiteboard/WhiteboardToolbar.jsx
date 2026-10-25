import React from 'react';
import { TOOLS, COLORS, SIZES } from './whiteboardConstants.js';

export default function WhiteboardToolbar({
  tool,
  color,
  strokeSize,
  onToolClick,
  setColor,
  setStrokeSize,
}) {
  return (
    <div className="wb-toolbar" role="toolbar" aria-label="Whiteboard tools">
      {/* Draw tools group */}
      <div className="wb-tool-group wb-tool-group--draw">
        <span className="wb-group-label">Draw</span>
        {TOOLS.filter(t => !['select', 'image', 'video'].includes(t.id)).map(t => {
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

      {/* Select + Media group */}
      <div className="wb-tool-group wb-tool-group--media">
        <span className="wb-group-label">Media</span>
        {TOOLS.filter(t => ['select', 'image', 'video'].includes(t.id)).map(t => {
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

      {/* Colors */}
      <div className="wb-tool-group">
        <span className="wb-group-label">Color</span>
        <div className="wb-colors">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
              className="wb-swatch"
              style={{
                background: c,
                border: color === c ? '2px solid var(--primary)' : '2px solid transparent',
                outline: color === c ? '2px solid rgba(99,102,241,0.3)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <div className="wb-divider wb-divider--tight" aria-hidden="true" />

      {/* Stroke sizes */}
      <div className="wb-tool-group">
        <span className="wb-group-label">Size</span>
        {SIZES.map(s => (
          <button
            key={s}
            onClick={() => setStrokeSize(s)}
            title={`Size ${s}`}
            aria-label={`Size ${s}`}
            aria-pressed={strokeSize === s}
            className="wb-size-btn"
            style={{
              background: strokeSize === s ? 'rgba(99,102,241,0.15)' : 'none',
              border: strokeSize === s ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            }}
          >
            <div
              style={{
                width: Math.min(32, s * 2.5 + 6),
                height: Math.min(s, 8),
                maxWidth: '100%',
                background: strokeSize === s ? 'var(--primary-soft)' : 'var(--text-faint)',
                borderRadius: '999px',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
