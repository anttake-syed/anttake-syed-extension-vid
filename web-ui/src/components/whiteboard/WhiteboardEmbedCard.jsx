import React from 'react';
import { detectSmartService } from './whiteboardHelpers.js';

/**
 * WhiteboardEmbedCard
 * Renders individual embedded media (YouTube video player / thumbnail) or Web Link card.
 */
export default function WhiteboardEmbedCard({
  element: el,
  index: idx,
  isSelected,
  isPlaying,
  onStartDrag,
  onTogglePlay,
  onSelect,
}) {
  const isEmbed = el.type === 'embed';
  const thumbUrl = el.videoId
    ? `https://img.youtube.com/vi/${el.videoId}/hqdefault.jpg`
    : null;

  const service = !isEmbed ? detectSmartService(el.url) : null;

  let hostname = el.url;
  if (!isEmbed) {
    try {
      hostname = new URL(el.url).hostname;
    } catch (_) {}
  }

  const handleMouseDown = (e) => {
    // Left click only
    if (e.button !== 0) return;
    e.stopPropagation();
    onStartDrag(e, idx);
  };

  return (
    <div
      className={`wb-embed-card ${isSelected ? 'wb-embed-card--selected' : ''}`}
      style={{
        left: `${el.x}px`,
        top: `${el.y}px`,
        width: `${el.w || (isEmbed ? 420 : 360)}px`,
        height: `${el.h || (isEmbed ? 260 : 150)}px`,
        transform: el.rotation ? `rotate(${el.rotation}rad)` : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(idx, e);
      }}
      onMouseDown={handleMouseDown}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* ── Card Header (Draggable) ── */}
      <div className="wb-embed-header" onMouseDown={handleMouseDown}>
        {isEmbed ? (
          <>
            <span className="wb-embed-badge wb-embed-badge--youtube">
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>smart_display</span>
              YouTube
            </span>
            <span className="wb-embed-title">{el.title || 'YouTube Video'}</span>
            <button
              type="button"
              className="wb-embed-action-btn"
              title="Open on YouTube"
              aria-label="Open on YouTube"
              onClick={(e) => {
                e.stopPropagation();
                window.open(el.url || `https://www.youtube.com/watch?v=${el.videoId}`, '_blank', 'noopener,noreferrer');
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>open_in_new</span>
            </button>
            <button
              type="button"
              className="wb-embed-action-btn"
              title={isPlaying ? 'Stop Video' : 'Play Inline'}
              aria-label={isPlaying ? 'Stop Video' : 'Play Inline'}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlay(idx);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: '16px', color: isPlaying ? '#f87171' : '#38bdf8' }}
              >
                {isPlaying ? 'stop_circle' : 'play_circle'}
              </span>
            </button>
          </>
        ) : (
          <>
            <span
              className="wb-embed-badge wb-embed-badge--link"
              style={service ? {
                background: service.bg,
                borderColor: service.border,
                color: service.color,
              } : undefined}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
                {service ? service.icon : 'link'}
              </span>
              {service ? service.name : 'Link'}
            </span>
            <span className="wb-embed-title">{el.title || (service ? `${service.name} Document` : hostname)}</span>
            <button
              type="button"
              className="wb-embed-action-btn"
              title="Open in new tab"
              aria-label="Open in new tab"
              onClick={(e) => {
                e.stopPropagation();
                window.open(el.url, '_blank', 'noopener,noreferrer');
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>open_in_new</span>
            </button>
          </>
        )}
      </div>

      {/* ── Card Body ── */}
      {isEmbed ? (
        <div className="wb-embed-body">
          {isPlaying ? (
            <iframe
              src={`https://www.youtube.com/embed/${el.videoId}?autoplay=1&rel=0&modestbranding=1`}
              title={el.title || 'YouTube Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              className="wb-embed-placeholder"
              style={{
                backgroundImage: thumbUrl
                  ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url(${thumbUrl})`
                  : undefined,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(idx, e);
                onTogglePlay(idx);
              }}
            >
              <div className="wb-embed-play-btn" title="Click to play video">
                <span className="material-symbols-rounded" style={{ fontSize: '30px', transform: 'translateX(2px)' }}>
                  play_arrow
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="wb-link-card-body" onMouseDown={handleMouseDown}>
          <div>
            <div className="wb-link-host">
              <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>language</span>
              <span>{hostname}</span>
            </div>
            <div className="wb-link-url" style={{ marginTop: '8px' }}>
              {el.url}
            </div>
          </div>

          <button
            type="button"
            className="wb-link-btn"
            onClick={(e) => {
              e.stopPropagation();
              window.open(el.url, '_blank', 'noopener,noreferrer');
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <span>Visit Website</span>
            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}
