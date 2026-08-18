// content/webcamBubble.js — AntCapture
// Renders a draggable floating webcam preview bubble during "Cam + Screen" (overlay) recordings.
// Listens for START_WEBCAM_BUBBLE / STOP_WEBCAM_BUBBLE messages from background.js.

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE NOTE:
// The webcam bubble is purely a UI component. It MUST NOT own a MediaStream that
// is shared with the recording pipeline. Its stream is display-only (muted video).
// Stopping this bubble must never affect the recording session.
// ─────────────────────────────────────────────────────────────────────────────

let webcamBubble = null;
let webcamStream = null;
let shadowHost = null;

// Stored drag handlers so they can be removed on cleanup
let _onDragMove = null;
let _onDragUp   = null;

export function initWebcamBubble() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_WEBCAM_BUBBLE') {
      startWebcamBubble();
      sendResponse({ success: true });
      return true;
    }
    if (message.action === 'STOP_WEBCAM_BUBBLE') {
      stopWebcamBubble();
      sendResponse({ success: true });
      return true;
    }
  });
}

async function startWebcamBubble() {
  if (webcamBubble) return; // already running

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' },
      audio: false, // display only — audio captured separately by the recording pipeline
    });
  } catch (e) {
    console.error('[AntCapture] Failed to get webcam stream for bubble:', e);
    return;
  }

  const size = 180;

  shadowHost = document.createElement('div');
  shadowHost.id = 'antcapture-webcam-host';
  shadowHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0; overflow: visible;';
  const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  webcamBubble = document.createElement('div');
  Object.assign(webcamBubble.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    width: size+'px', height: size+'px',
    borderRadius: '50%', overflow: 'hidden',
    zIndex: '2147483647',
    boxShadow: '0 0 0 3px #ef4444, 0 8px 32px rgba(0,0,0,0.3)',
    border: '3px solid rgba(255,255,255,0.2)',
    cursor: 'move', backgroundColor: '#000',
    transition: 'box-shadow 0.2s ease',
  });

  const video = document.createElement('video');
  video.srcObject = webcamStream;
  video.autoplay = true;
  video.muted = true;
  Object.assign(video.style, {
    width: '100%', height: '100%', objectFit: 'cover',
    transform: 'scaleX(-1)', // mirror camera
    pointerEvents: 'none',
  });
  webcamBubble.appendChild(video);
  shadowRoot.appendChild(webcamBubble);
  document.body.appendChild(shadowHost);

  // ── Drag support with bounds clamping ──────────────────────────────────────
  let isDragging = false, startX, startY, initLeft, initTop;

  webcamBubble.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = webcamBubble.getBoundingClientRect();
    initLeft = rect.left; initTop = rect.top;
    e.preventDefault();
  });

  _onDragMove = (e) => {
    if (!isDragging) return;
    const newLeft = initLeft + e.clientX - startX;
    const newTop  = initTop  + e.clientY - startY;
    // Clamp — keep at least half the bubble visible on screen
    const half = size / 2;
    const clampedLeft = Math.max(-half, Math.min(window.innerWidth  - half, newLeft));
    const clampedTop  = Math.max(-half, Math.min(window.innerHeight - half, newTop));
    webcamBubble.style.left   = clampedLeft + 'px';
    webcamBubble.style.top    = clampedTop  + 'px';
    webcamBubble.style.right  = 'auto';
    webcamBubble.style.bottom = 'auto';
  };

  _onDragUp = () => { isDragging = false; };

  window.addEventListener('mousemove', _onDragMove);
  window.addEventListener('mouseup',   _onDragUp);
}

function stopWebcamBubble() {
  // 1. Remove drag event listeners — prevents accumulation across sessions
  if (_onDragMove) { window.removeEventListener('mousemove', _onDragMove); _onDragMove = null; }
  if (_onDragUp)   { window.removeEventListener('mouseup',   _onDragUp);   _onDragUp   = null; }

  // 2. Stop the DISPLAY-ONLY webcam stream (safe — this is NOT the recording stream)
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }

  // 3. Remove the DOM element
  if (shadowHost && shadowHost.parentNode) {
    shadowHost.parentNode.removeChild(shadowHost);
    shadowHost = null;
    webcamBubble = null;
  }
}
