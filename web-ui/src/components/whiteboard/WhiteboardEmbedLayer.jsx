import React from 'react';
import WhiteboardEmbedCard from './WhiteboardEmbedCard.jsx';

/**
 * WhiteboardEmbedLayer
 * Renders HTML cards (YouTube embeds & Link previews) positioned over the canvas.
 * Includes an active drag shield to prevent iframes from stealing pointer events during drag.
 */
export default function WhiteboardEmbedLayer({
  elements,
  panOffset,
  zoom,
  selectedId,
  selectedIds,
  activeVideoEmbedId,
  isDragging,
  onStartDrag,
  onTogglePlay,
  onSelect,
}) {
  const hasEmbeds = elements.some(el => el.type === 'embed' || el.type === 'link');
  if (!hasEmbeds && !isDragging) return null;

  return (
    <div className="wb-embed-container">
      {/* ── Active Drag Shield ──
          When any object is being dragged, this invisible shield prevents
          iframes from capturing mouse events and freezing the drag. */}
      {isDragging && <div className="wb-embed-drag-shield" />}

      <div
        className="wb-embed-layer"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
        }}
      >
        {elements.map((el, idx) => {
          if (el.type !== 'embed' && el.type !== 'link') return null;
          const isSelected = selectedIds.includes(idx) || selectedId === idx;
          const isPlaying = activeVideoEmbedId === idx;

          return (
            <WhiteboardEmbedCard
              key={idx}
              element={el}
              index={idx}
              isSelected={isSelected}
              isPlaying={isPlaying}
              onStartDrag={onStartDrag}
              onTogglePlay={onTogglePlay}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
