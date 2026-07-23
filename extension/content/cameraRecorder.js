// content/cameraRecorder.js — AntCapture
// Camera-only recording that runs in the foreground tab.
// Chrome blocks getUserMedia (video) inside offscreen documents, so the recorder
// lives here and sends the finished blob back to background.js as a data URL.

let cameraRecorder = null;
let cameraStream   = null;
let cameraData     = [];
let cameraPreviewBubble = null;
let cameraIsStopping    = false; // guard against double-stop
let isDiscarding        = false; // guard against saving if discarded

export function initCameraRecorder() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'START_CAMERA_RECORDING') {
      startCameraRecording(message.options || {});
      sendResponse({ success: true });
      return true;
    }
    if (message.action === 'STOP_CAMERA_RECORDING') {
      stopCameraRecording();
      sendResponse({ success: true });
      return true;
    }
    if (message.action === 'PAUSE_CAMERA_RECORDING') {
      if (cameraRecorder?.state === 'recording') cameraRecorder.pause();
      sendResponse({ success: true });
      return true;
    }
    if (message.action === 'RESUME_CAMERA_RECORDING') {
      if (cameraRecorder?.state === 'paused') cameraRecorder.resume();
      sendResponse({ success: true });
      return true;
    }
    if (message.action === 'DISCARD_CAMERA_RECORDING') {
      isDiscarding = true;
      stopCameraRecording();
      sendResponse({ success: true });
      return true;
    }
  });
}

async function startCameraRecording(options = {}) {
  if (cameraRecorder?.state === 'recording') return;
  cameraIsStopping = false;

  const { format = 'webm', includeMic = true, resolution = 720 } = options;

  // ── 1. Get camera + optional mic stream ───────────────────────────────────
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: includeMic,
    });
  } catch (err) {
    console.error('Camera access denied:', err);
    chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
    return;
  }

  // ── 2. Show a live preview bubble (red ring = recording indicator) ─────────
  cameraPreviewBubble = buildPreviewBubble(cameraStream);
  document.body.appendChild(cameraPreviewBubble);

  // ── 3. Pick the best supported MIME type ──────────────────────────────────
  const webmCandidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const candidates = format === 'mp4'
    ? ['video/mp4;codecs=h264,aac', 'video/mp4', ...webmCandidates]
    : webmCandidates;
  let mimeType = 'video/webm';
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
  }

  // ── 4. Record ─────────────────────────────────────────────────────────────
  cameraData     = [];
  cameraRecorder = new MediaRecorder(cameraStream, { mimeType });
  cameraRecorder.ondataavailable = e => { if (e.data.size > 0) cameraData.push(e.data); };

  cameraRecorder.onstop = async () => {
    // Tear down preview bubble
    if (cameraPreviewBubble?.parentNode) cameraPreviewBubble.parentNode.removeChild(cameraPreviewBubble);
    cameraPreviewBubble = null;
    cameraStream?.getTracks().forEach(t => t.stop());
    cameraIsStopping = false;

    const blob = new Blob(cameraData, { type: mimeType });
    cameraData = [];

    if (isDiscarding) {
      console.log('📷 Camera recording discarded.');
      isDiscarding = false;
      return;
    }

    if (blob.size === 0) {
      console.warn('AntCapture: empty camera blob, skipping save.');
      chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
      return;
    }

    // Send as data URL — background.js will decode and route to saveCapture()
    const reader = new FileReader();
    reader.onloadend = () => {
      chrome.runtime.sendMessage({
        action: 'CAMERA_BLOB_READY',
        blobDataUrl: reader.result,
        mimeType,
        resolution,
        format,
      });
    };
    reader.readAsDataURL(blob);
  };

  // Guard: if the OS-level camera stream ends unexpectedly, stop cleanly
  cameraStream.getVideoTracks()[0]?.addEventListener('ended', () => {
    if (!cameraIsStopping && cameraRecorder?.state !== 'inactive') {
      cameraIsStopping = true;
      cameraRecorder.stop();
      cameraRecorder = null;
    }
  });

  cameraRecorder.start(250);
  console.log('📷 Camera-only recording started');
  chrome.runtime.sendMessage({ action: 'CAMERA_RECORDING_STARTED', options });
}

function stopCameraRecording() {
  if (cameraRecorder && cameraRecorder.state !== 'inactive') {
    cameraIsStopping = true;
    cameraRecorder.stop();
    cameraRecorder = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// buildPreviewBubble — creates the circular live preview with drag support
// ─────────────────────────────────────────────────────────────────────────────
function buildPreviewBubble(stream) {
  const size = 200;
  const bubble = document.createElement('div');
  Object.assign(bubble.style, {
    position: 'fixed', bottom: '20px', right: '20px',
    width: size+'px', height: size+'px',
    borderRadius: '50%', overflow: 'hidden',
    zIndex: '2147483647',
    boxShadow: '0 0 0 3px #ef4444, 0 8px 32px rgba(0,0,0,0.4)',
    border: '3px solid rgba(255,255,255,0.15)',
    cursor: 'move', backgroundColor: '#000',
  });

  const vid = document.createElement('video');
  vid.srcObject = stream;
  vid.autoplay = true;
  vid.muted = true;
  Object.assign(vid.style, {
    width: '100%', height: '100%', objectFit: 'cover',
    transform: 'scaleX(-1)', pointerEvents: 'none',
  });
  bubble.appendChild(vid);

  // Drag support
  let dragging = false, sx, sy, il, it;
  bubble.addEventListener('mousedown', e => {
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = bubble.getBoundingClientRect(); il = r.left; it = r.top;
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    bubble.style.left   = (il + e.clientX - sx) + 'px';
    bubble.style.top    = (it + e.clientY - sy) + 'px';
    bubble.style.right  = 'auto';
    bubble.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  return bubble;
}
