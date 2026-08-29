import React from 'react';
import ProgressBar from './ProgressBar.jsx';

/** Formats seconds as M:SS */
function fmt(s) {
  if (!s || isNaN(s) || !isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * VideoControls — stateless presentation layer.
 *
 * Receives playback data + callbacks from VideoPlayer.
 * Renders: play/pause, progress bar, timestamp, volume, fullscreen.
 *
 * Props:
 *   isPlaying   {boolean}
 *   currentTime {number}
 *   duration    {number}
 *   volume      {number}   0–1
 *   isMuted     {boolean}
 *   isFullscreen{boolean}
 *   buffered    {number}   0–1
 *   onPlayPause {fn}
 *   onSeek      {fn(time)}
 *   onVolume    {fn(vol)}
 *   onMute      {fn}
 *   onFullscreen{fn}
 */
export default function VideoControls({
  isPlaying, currentTime, duration, volume, isMuted, isFullscreen, buffered,
  onPlayPause, onSeek, onVolume, onMute, onFullscreen,
}) {
  const handleVolumeChange = (e) => onVolume(parseFloat(e.target.value));

  return (
    <div className="vp-controls">
      {/* Row 1: Progress bar */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        buffered={buffered}
      />

      {/* Row 2: Buttons + info */}
      <div className="vp-controls-row">
        {/* Left group */}
        <div className="vp-controls-left">
          {/* Play / Pause */}
          <button
            className="vp-btn"
            onClick={onPlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            <span className="material-symbols-rounded">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          {/* Volume */}
          <button
            className="vp-btn"
            onClick={onMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
          >
            <span className="material-symbols-rounded">
              {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
            </span>
          </button>

          <input
            type="range"
            className="vp-volume"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
            title="Volume"
          />

          {/* Timestamp */}
          <span className="vp-timestamp">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>

        {/* Right group */}
        <div className="vp-controls-right">
          <button
            className="vp-btn"
            onClick={onFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
          >
            <span className="material-symbols-rounded">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
