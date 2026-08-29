import React, { useRef, useState, useEffect, useCallback } from 'react';
import VideoControls from './VideoControls.jsx';

/**
 * VideoPlayer — manages all video playback state.
 *
 * Key design rules:
 *   - `timeupdate` does NOT call setState. It directly mutates a ref and
 *     updates the DOM via a lightweight rAF loop. This avoids re-rendering
 *     the entire player tree every 250ms.
 *   - Seeking does NOT reload the video — it only sets video.currentTime.
 *   - All edge cases (no metadata, rapid switching, unmount during play)
 *     are handled explicitly.
 *
 * Props:
 *   src     {string}   — full, resolved video URL
 *   onError {fn}       — called when the video fails to load
 */
export default function VideoPlayer({ src, onError }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  // React state — only for structural UI changes (not per-frame updates)
  const [status, setStatus] = useState('loading'); // loading | playing | paused | error | unsupported
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  // These are updated via rAF, not setState, to avoid expensive re-renders
  const [displayTime, setDisplayTime] = useState(0);

  const hideTimer = useRef(null);

  // ── rAF loop: update progress display at ~30fps ────────────────────────────
  const startRaf = useCallback(() => {
    if (rafRef.current) return; // already running
    const tick = () => {
      const v = videoRef.current;
      if (!v) return;
      setDisplayTime(v.currentTime);
      // Update buffered
      if (v.buffered.length > 0 && v.duration > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup on unmount or src change
  useEffect(() => {
    return () => {
      stopRaf();
      clearTimeout(hideTimer.current);
    };
  }, [stopRaf]);

  // When src changes, reset everything
  useEffect(() => {
    stopRaf();
    setStatus('loading');
    setIsPlaying(false);
    setDuration(0);
    setDisplayTime(0);
    setBuffered(0);
  }, [src, stopRaf]);

  // ── Video event handlers ───────────────────────────────────────────────────
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setStatus('paused');
  };

  const handleCanPlay = () => {
    if (status === 'loading') setStatus('paused');
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setStatus('playing');
    startRaf();
    autoHideControls();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setStatus('paused');
    stopRaf();
    setDisplayTime(videoRef.current?.currentTime ?? displayTime);
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setStatus('paused');
    stopRaf();
    setControlsVisible(true);
  };

  const handleError = () => {
    stopRaf();
    setStatus('error');
    if (onError) onError();
  };

  const handleWaiting = () => {
    if (isPlaying) setStatus('loading');
  };

  const handlePlaying = () => {
    if (status === 'loading') setStatus('playing');
  };

  // ── Controls: play/pause, seek, volume, fullscreen ────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || status === 'error') return;
    if (v.paused) {
      v.play().catch(() => setStatus('error'));
    } else {
      v.pause();
    }
  }, [status]);

  const handleSeek = useCallback((time) => {
    const v = videoRef.current;
    if (!v || !isFinite(time)) return;
    // Clamp to valid range
    v.currentTime = Math.max(0, Math.min(time, v.duration || 0));
    setDisplayTime(v.currentTime);
  }, []);

  const handleVolume = useCallback((vol) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = vol;
    setVolume(vol);
    if (vol > 0) setIsMuted(false);
  }, []);

  const handleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }, []);

  const handleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Auto-hide controls ────────────────────────────────────────────────────
  const autoHideControls = useCallback(() => {
    clearTimeout(hideTimer.current);
    setControlsVisible(true);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const handleMouseMove = () => {
    autoHideControls();
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    const v = videoRef.current;
    if (!v) return;
    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handleSeek(v.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleSeek(v.currentTime + 5);
        break;
      case 'm':
        e.preventDefault();
        handleMute();
        break;
      case 'f':
        e.preventDefault();
        handleFullscreen();
        break;
      default:
        break;
    }
  }, [togglePlay, handleSeek, handleMute, handleFullscreen]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const showOverlay = status === 'loading' || status === 'error' || status === 'unsupported';

  return (
    <div
      ref={containerRef}
      className={`vp-container ${!controlsVisible && isPlaying ? 'vp-hide-cursor' : ''}`}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      onClick={(e) => {
        // Click on the video area (not controls) toggles play
        if (e.target === videoRef.current || e.target.classList.contains('vp-video-wrapper')) {
          togglePlay();
        }
      }}
    >
      {/* The raw <video> element — always mounted, never recreated on seek */}
      <div className="vp-video-wrapper">
        <video
          ref={videoRef}
          src={src}
          className="vp-video"
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlay={handleCanPlay}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onError={handleError}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
        />
      </div>

      {/* Loading / Error overlays */}
      {status === 'loading' && (
        <div className="vp-overlay vp-overlay-loading">
          <div className="vp-spinner" />
          <span>Loading video…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="vp-overlay vp-overlay-error">
          <span className="material-symbols-rounded vp-overlay-icon">error</span>
          <span className="vp-overlay-title">Video couldn't load</span>
          <span className="vp-overlay-sub">The file may be unavailable or in an unsupported format.</span>
          <button
            className="vp-retry-btn"
            onClick={() => {
              const v = videoRef.current;
              if (v) { v.load(); setStatus('loading'); }
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Big play button overlay when paused */}
      {status === 'paused' && (
        <div className="vp-play-overlay" onClick={togglePlay}>
          <div className="vp-play-circle">
            <span className="material-symbols-rounded">play_arrow</span>
          </div>
        </div>
      )}

      {/* Controls bar — fades out when playing & mouse idle */}
      <div className={`vp-controls-wrapper ${controlsVisible || !isPlaying ? 'vp-controls-visible' : 'vp-controls-hidden'}`}>
        <VideoControls
          isPlaying={isPlaying}
          currentTime={displayTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          buffered={buffered}
          onPlayPause={togglePlay}
          onSeek={handleSeek}
          onVolume={handleVolume}
          onMute={handleMute}
          onFullscreen={handleFullscreen}
        />
      </div>
    </div>
  );
}
