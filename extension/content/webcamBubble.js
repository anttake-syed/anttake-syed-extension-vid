// content/webcamBubble.js — AntCapture
// Renders a draggable floating webcam preview bubble during "Cam + Screen" (overlay) recordings.
// Listens for START_WEBCAM_BUBBLE / STOP_WEBCAM_BUBBLE messages from background.js.

let webcamBubble = null;
let webcamStream = null;

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
  if (webcamBubble) return;

  try {
    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: 'user' },
      audio: false,
    });
  } catch (e) {
    console.error('Failed to get webcam:', e);
    return;
  }

  const size = 180;
  webcamBubble = document.createElement('div');
  Object.assign(webcamBubble.style, {
    position: 'fixed', bottom: '20px', left: '20px',
    width: size+'px', height: size+'px',
    borderRadius: '50%', overflow: 'hidden',
    zIndex: '2147483647',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    border: '3px solid rgba(255,255,255,0.2)',
    cursor: 'move', backgroundColor: '#000',
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
  document.body.appendChild(webcamBubble);

  // Drag support
  let isDragging = false, startX, startY, initLeft, initTop;
  webcamBubble.addEventListener('mousedown', (e) => {
    isDragging = true; startX = e.clientX; startY = e.clientY;
    const rect = webcamBubble.getBoundingClientRect();
    initLeft = rect.left; initTop = rect.top;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    webcamBubble.style.left   = (initLeft + e.clientX - startX) + 'px';
    webcamBubble.style.top    = (initTop  + e.clientY - startY) + 'px';
    webcamBubble.style.right  = 'auto';
    webcamBubble.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
}

function stopWebcamBubble() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(t => t.stop());
    webcamStream = null;
  }
  if (webcamBubble && webcamBubble.parentNode) {
    webcamBubble.parentNode.removeChild(webcamBubble);
    webcamBubble = null;
  }
}
