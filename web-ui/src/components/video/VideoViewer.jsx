import React from 'react';
import VideoPlayer from './VideoPlayer.jsx';

/**
 * VideoViewerErrorBoundary — catches any exception inside the player tree.
 * If the player crashes, the rest of the application stays alive.
 * Shows a clean "Video couldn't load" card with Retry + Close.
 */
class VideoViewerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[VideoViewer] Player crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="vv-error-boundary">
          <span className="material-symbols-rounded vv-eb-icon">videocam_off</span>
          <h3 className="vv-eb-title">Video Player Error</h3>
          <p className="vv-eb-sub">
            An unexpected error occurred. The rest of your library is still working.
          </p>
          <div className="vv-eb-actions">
            <button
              className="vv-eb-btn vv-eb-btn-retry"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <span className="material-symbols-rounded">refresh</span>
              Retry
            </button>
            <button
              className="vv-eb-btn vv-eb-btn-close"
              onClick={this.props.onClose}
            >
              <span className="material-symbols-rounded">close</span>
              Close
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="vv-eb-trace">{this.state.error.toString()}</pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * VideoViewer — the public, reusable entry point.
 *
 * Architecture:
 *   VideoViewer
 *   └── VideoViewerErrorBoundary
 *       └── VideoPlayer
 *           ├── <video> element
 *           ├── VideoControls
 *           │   └── ProgressBar
 *           └── status overlays
 *
 * Props:
 *   src      {string}   — fully resolved, authenticated video URL
 *   onClose  {fn}       — called when the viewer wants to be dismissed
 */
export default function VideoViewer({ src, onClose }) {
  if (!src) {
    return (
      <div className="vv-error-boundary">
        <span className="material-symbols-rounded vv-eb-icon">link_off</span>
        <h3 className="vv-eb-title">No video source</h3>
        <p className="vv-eb-sub">The video URL could not be resolved.</p>
        <button className="vv-eb-btn vv-eb-btn-close" onClick={onClose}>
          <span className="material-symbols-rounded">close</span>
          Close
        </button>
      </div>
    );
  }

  return (
    <VideoViewerErrorBoundary onClose={onClose}>
      <VideoPlayer src={src} onError={onClose} />
    </VideoViewerErrorBoundary>
  );
}
