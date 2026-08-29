import React, { useRef, useCallback } from 'react';

/**
 * ProgressBar — a completely isolated scrub/seek control.
 * It NEVER updates any parent state during drag — it directly sets
 * video.currentTime to avoid triggering expensive React re-renders
 * on every `timeupdate` event.
 *
 * Props:
 *   currentTime  {number}   — current playback position in seconds
 *   duration     {number}   — total video duration in seconds
 *   onSeek       {function} — called with (newTime: number) on seek commit
 *   buffered     {number}   — 0-1 fraction of video buffered (optional)
 */
export default function ProgressBar({ currentTime, duration, onSeek, buffered = 0 }) {
  const trackRef = useRef(null);
  const isDragging = useRef(false);

  const pct = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const buffPct = Math.min(buffered, 1);

  const calcTime = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return fraction * duration;
  }, [duration]);

  // ── Mouse events ────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;
    onSeek(calcTime(e.clientX));

    const onMove = (e) => { if (isDragging.current) onSeek(calcTime(e.clientX)); };
    const onUp   = (e) => { isDragging.current = false; onSeek(calcTime(e.clientX)); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Touch events ────────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    isDragging.current = true;
    onSeek(calcTime(e.touches[0].clientX));

    const onMove = (e) => { if (isDragging.current) onSeek(calcTime(e.touches[0].clientX)); };
    const onEnd  = (e) => { isDragging.current = false; window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };

    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
  };

  // ── Keyboard seeking on the track ───────────────────────────────────────────
  const onKeyDown = (e) => {
    if (!duration) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); onSeek(Math.max(0, currentTime - 5)); }
    if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(duration, currentTime + 5)); }
    if (e.key === 'Home')       { e.preventDefault(); onSeek(0); }
    if (e.key === 'End')        { e.preventDefault(); onSeek(duration); }
  };

  return (
    <div
      ref={trackRef}
      className="vp-track"
      role="slider"
      aria-label="Video progress"
      aria-valuenow={Math.round(currentTime)}
      aria-valuemin={0}
      aria-valuemax={Math.round(duration || 0)}
      tabIndex={0}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onKeyDown={onKeyDown}
    >
      {/* Buffer fill */}
      <div className="vp-track-buffer" style={{ width: `${buffPct * 100}%` }} />
      {/* Played fill */}
      <div className="vp-track-played" style={{ width: `${pct * 100}%` }}>
        {/* Thumb */}
        <div className="vp-thumb" />
      </div>
    </div>
  );
}
