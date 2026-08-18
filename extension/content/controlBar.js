// content/controlBar.js — AntCapture
// Injects a floating control bar (HUD) into the active tab during recording.
// Includes controls for pause/resume, mic toggle, stopping, and a screen drawing tool.
//
// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE:
//   Layer 1 (z=2147483643): Drawing canvas   — full-screen, pointer passthrough by default
//   Layer 2 (z=2147483645): Webcam bubble    — managed separately by webcamBubble.js
//   Layer 3 (z=2147483646): Control bar      — HUD buttons
// These layers are INDEPENDENT. Opening drawing canvas must never destroy the
// webcam bubble, and vice versa.
// ─────────────────────────────────────────────────────────────────────────────

const Z_CANVAS  = '2147483643'; // below webcam bubble
const Z_CONTROL = '2147483646'; // above webcam bubble

let barContainer = null;
let drawCanvas = null;
let drawCtx = null;
let isDrawingMode = false;
let isDrawing = false;
let currentColor = '#ef4444'; // default red
let timerInterval = null;
let lastX = 0;
let lastY = 0;
let shadowHost = null;
let shadowRoot = null;

// Stored window-level event listener refs for proper cleanup
let _barDragMove = null;
let _barDragUp   = null;
let _canvasResize = null;
let _onStorageChanged = null;

export function initControlBar() {
  // Guard against duplicate listeners if content.js is re-injected into the same tab
  if (window._antControlBarInited) return;
  window._antControlBarInited = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_CONTROL_BAR') {
      buildControlBar();
    } else if (message.action === 'HIDE_CONTROL_BAR' || message.action === 'HIDE_RECORDING_HUD') {
      destroyControlBar();
    } else if (message.action === 'PAUSE_RECORDING') {
      updatePauseState(true);
    } else if (message.action === 'RESUME_RECORDING') {
      updatePauseState(false);
    }
  });
}

function buildControlBar() {
  if (shadowHost) return; // already built

  // ── Shadow host (pointer pass-through wrapper for the whole overlay) ──────
  shadowHost = document.createElement('div');
  shadowHost.id = 'antcapture-control-bar-host';
  shadowHost.style.cssText = 'all: initial; position: fixed; z-index: ' + Z_CONTROL + '; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none;';
  
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // ── 1. Drawing Canvas ─────────────────────────────────────────────────────
  // Placed BELOW the webcam bubble (z-index Z_CANVAS).
  // Appended directly to document.body so real pointer coordinates work.
  drawCanvas = document.createElement('canvas');
  drawCanvas.id = 'antcapture-drawing-canvas';
  drawCanvas.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100vw',
    'height: 100vh',
    'z-index: ' + Z_CANVAS,
    'pointer-events: none', // click-through by default; enabled when drawing mode is on
    'cursor: crosshair',
  ].join('; ');
  
  // High-DPI support
  const dpr = window.devicePixelRatio || 1;
  drawCanvas.width  = window.innerWidth  * dpr;
  drawCanvas.height = window.innerHeight * dpr;
  
  drawCtx = drawCanvas.getContext('2d');
  drawCtx.scale(dpr, dpr);
  drawCtx.lineCap   = 'round';
  drawCtx.lineJoin  = 'round';
  drawCtx.lineWidth = 4;
  
  document.body.appendChild(drawCanvas);
  bindCanvasEvents();

  // ── 2. Control Bar ────────────────────────────────────────────────────────
  barContainer = document.createElement('div');
  barContainer.id = 'antcapture-control-bar';
  barContainer.style.cssText = [
    'position: fixed',
    'bottom: 30px',
    'left: 30px',
    'z-index: ' + Z_CONTROL,
    'background-color: #1e293b',
    'border-radius: 12px',
    'padding: 8px 12px',
    'display: flex',
    'align-items: center',
    'gap: 8px',
    'box-shadow: 0 10px 40px rgba(0,0,0,0.5)',
    'border: 1px solid rgba(255,255,255,0.1)',
    'font-family: "Inter", sans-serif',
    'color: #fff',
    'cursor: move',
    'user-select: none',
    'pointer-events: auto',
  ].join('; ');

  const getIcon = (d, color='#fff') => `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}"><path d="${d}"/></svg>`;
  
  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'antcapture-hud-timer';
  timerDisplay.style.cssText = 'font-weight: 600; font-size: 14px; margin-right: 8px; min-width: 42px;';
  timerDisplay.textContent = '0:00';
  barContainer.appendChild(timerDisplay);

  const btnStyle = 'background:transparent; border:none; color:#fff; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:background 0.2s;';
  const hoverEffect = (btn) => {
    btn.onmouseenter = () => btn.style.backgroundColor = 'rgba(255,255,255,0.1)';
    btn.onmouseleave = () => { if (!btn.dataset.active) btn.style.backgroundColor = 'transparent'; };
  };

  // ── Pause Button ────────────────────────────────────────────────────────
  const pauseBtn = document.createElement('button');
  pauseBtn.style.cssText = btnStyle;
  pauseBtn.innerHTML = getIcon('M6 19h4V5H6v14zm8-14v14h4V5h-4z');
  pauseBtn.title = 'Pause / Resume';
  pauseBtn.onclick = () => {
    chrome.storage.local.get(['isRecordingPaused'], (res) => {
      chrome.runtime.sendMessage({ action: res.isRecordingPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
    });
  };
  hoverEffect(pauseBtn);
  barContainer.appendChild(pauseBtn);

  // ── Mic Button ─────────────────────────────────────────────────────────
  const micBtn = document.createElement('button');
  micBtn.style.cssText = btnStyle;
  micBtn.title = 'Toggle microphone';
  const getMicIcon = (on) => on
      ? getIcon('M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z', '#34d399')
      : getIcon('M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6 6V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z', '#ef4444');

  chrome.storage.local.get(['recMic'], res => {
    micBtn.innerHTML = getMicIcon(res.recMic);
  });
  micBtn.onclick = () => {
    chrome.storage.local.get(['recMic'], (res) => {
      const newState = !res.recMic;
      // Note: We don't update the DOM here. We send the command and wait for the state to sync back.
      chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_MIC', on: newState });
    });
  };
  hoverEffect(micBtn);
  barContainer.appendChild(micBtn);

  // ── Draw Button ─────────────────────────────────────────────────────────
  const drawBtn = document.createElement('button');
  drawBtn.style.cssText = btnStyle;
  drawBtn.innerHTML = getIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', '#cbd5e1');
  drawBtn.title = 'Drawing tool';
  drawBtn.onclick = () => {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) {
      // Enable drawing: let the canvas receive pointer events
      drawCanvas.style.pointerEvents = 'auto';
      drawBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
      drawBtn.dataset.active = 'true';
      toolsPanel.style.display = 'flex';
    } else {
      // Disable drawing: pass clicks through the canvas again
      drawCanvas.style.pointerEvents = 'none';
      drawBtn.style.backgroundColor = 'transparent';
      delete drawBtn.dataset.active;
      toolsPanel.style.display = 'none';
    }
    // ── KEY: toggling drawing mode must NEVER touch the webcam bubble ──
  };
  hoverEffect(drawBtn);
  barContainer.appendChild(drawBtn);

  // ── Stop Button ─────────────────────────────────────────────────────────
  const stopBtn = document.createElement('button');
  stopBtn.style.cssText = btnStyle + ' background-color: #ef4444;';
  stopBtn.innerHTML = getIcon('M6 6h12v12H6z');
  stopBtn.title = 'Stop recording';
  stopBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
  };
  barContainer.appendChild(stopBtn);

  // ── 3. Drawing Tools Panel ────────────────────────────────────────────────
  const toolsPanel = document.createElement('div');
  toolsPanel.style.cssText = 'display: none; align-items: center; gap: 6px; margin-left: 8px; padding-left: 8px; border-left: 1px solid rgba(255,255,255,0.1);';
  
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'];
  colors.forEach(c => {
    const cb = document.createElement('div');
    cb.style.cssText = `width:16px; height:16px; border-radius:50%; background-color:${c}; cursor:pointer; border:${c === currentColor ? '2px solid #fff' : '2px solid transparent'};`;
    cb.onclick = () => {
      currentColor = c;
      Array.from(toolsPanel.children).forEach(child => {
        if (child.style.width === '16px') child.style.border = '2px solid transparent';
      });
      cb.style.border = '2px solid #fff';
    };
    toolsPanel.appendChild(cb);
  });

  // Stroke width options
  [2, 4, 8].forEach(width => {
    const wb = document.createElement('div');
    wb.title = `Stroke: ${width}px`;
    wb.style.cssText = `width:${Math.max(8, width + 4)}px; height:${Math.max(8, width + 4)}px; border-radius:50%; background-color:#fff; cursor:pointer; opacity:${drawCtx.lineWidth === width ? '1' : '0.4'}; transition:opacity 0.15s;`;
    wb.onclick = () => {
      drawCtx.lineWidth = width;
      Array.from(toolsPanel.querySelectorAll('[data-stroke]')).forEach(b => b.style.opacity = '0.4');
      wb.style.opacity = '1';
    };
    wb.dataset.stroke = width;
    toolsPanel.appendChild(wb);
  });

  const clearBtn = document.createElement('button');
  clearBtn.style.cssText = btnStyle;
  clearBtn.innerHTML = getIcon('M15 4V3H9v1H4v2h1v13c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6h1V4h-5zm2 15H7V6h10v13z', '#94a3b8');
  clearBtn.title = 'Clear drawings';
  clearBtn.onclick = () => {
    const dpr = window.devicePixelRatio || 1;
    drawCtx.clearRect(0, 0, drawCanvas.width / dpr, drawCanvas.height / dpr);
  };
  hoverEffect(clearBtn);
  toolsPanel.appendChild(clearBtn);

  const closeDrawBtn = document.createElement('button');
  closeDrawBtn.style.cssText = btnStyle;
  closeDrawBtn.innerHTML = getIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', '#94a3b8');
  closeDrawBtn.title = 'Close drawing tool';
  closeDrawBtn.onclick = () => {
    isDrawingMode = false;
    drawCanvas.style.pointerEvents = 'none';
    drawBtn.style.backgroundColor = 'transparent';
    delete drawBtn.dataset.active;
    toolsPanel.style.display = 'none';
  };
  hoverEffect(closeDrawBtn);
  toolsPanel.appendChild(closeDrawBtn);

  barContainer.appendChild(toolsPanel);
  shadowRoot.appendChild(barContainer);
  document.body.appendChild(shadowHost);

  // ── Control Bar Drag (within shadow root) ─────────────────────────────────
  let dragging = false, sx, sy, il, it;

  barContainer.addEventListener('mousedown', e => {
    // Don't drag when clicking buttons or color swatches
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    if (e.target.tagName === 'DIV' && e.target.style.borderRadius === '50%') return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = barContainer.getBoundingClientRect(); il = r.left; it = r.top;
    e.preventDefault();
  });

  _barDragMove = e => {
    if (!dragging) return;
    const newLeft = il + e.clientX - sx;
    const newTop  = it  + e.clientY - sy;
    // Clamp to keep bar on-screen
    const barW = barContainer.offsetWidth  || 220;
    const barH = barContainer.offsetHeight || 50;
    const clampedLeft = Math.max(0, Math.min(window.innerWidth  - barW, newLeft));
    const clampedTop  = Math.max(0, Math.min(window.innerHeight - barH, newTop));
    barContainer.style.left   = clampedLeft + 'px';
    barContainer.style.top    = clampedTop  + 'px';
    barContainer.style.bottom = 'auto';
    barContainer.style.right  = 'auto';
  };
  _barDragUp = () => { dragging = false; };

  window.addEventListener('mousemove', _barDragMove);
  window.addEventListener('mouseup',   _barDragUp);

  // ── Recording Timer ───────────────────────────────────────────────────────
  timerInterval = setInterval(() => {
    chrome.storage.local.get(['recordingStartTime', 'isRecordingPaused', 'pausedOffset', 'pausedAt'], (res) => {
      if (!res.recordingStartTime) return;
      let elapsedMs;
      if (res.isRecordingPaused) {
        elapsedMs = (res.pausedAt || Date.now()) - res.recordingStartTime - (res.pausedOffset || 0);
      } else {
        elapsedMs = Date.now() - res.recordingStartTime - (res.pausedOffset || 0);
      }
      const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
      const mins = Math.floor(elapsed / 60);
      const secs = String(elapsed % 60).padStart(2, '0');
      timerDisplay.textContent = `${mins}:${secs}`;
    });
  }, 1000);

  // ── State Synchronization (Single Source of Truth) ────────────────────────
  _onStorageChanged = (changes, namespace) => {
    if (namespace !== 'local') return;
    if (changes.recMic !== undefined) {
      micBtn.innerHTML = getMicIcon(changes.recMic.newValue);
    }
    // (Other states like isRecordingPaused are handled via messaging currently,
    // but this gives us a hook for the future)
  };
  chrome.storage.onChanged.addListener(_onStorageChanged);
}

function updatePauseState(isPaused) {
  if (!barContainer) return;
  const pauseBtn = barContainer.children[1]; // second child after timer display
  if (!pauseBtn) return;
  const getIcon = (d, color='#fff') => `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}"><path d="${d}"/></svg>`;
  if (isPaused) {
    pauseBtn.innerHTML = getIcon('M8 5v14l11-7z'); // play icon
    pauseBtn.style.color = '#f59e0b';
  } else {
    pauseBtn.innerHTML = getIcon('M6 19h4V5H6v14zm8-14v14h4V5h-4z'); // pause icon
    pauseBtn.style.color = '#fff';
  }
}

function destroyControlBar() {
  // 1. Stop the timer
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  // 2. Remove window-level drag listeners — prevents accumulation across sessions
  if (_barDragMove) { window.removeEventListener('mousemove', _barDragMove); _barDragMove = null; }
  if (_barDragUp)   { window.removeEventListener('mouseup',   _barDragUp);   _barDragUp   = null; }

  // 3. Remove canvas resize listener
  if (_canvasResize) { window.removeEventListener('resize', _canvasResize); _canvasResize = null; }

  // 4. Remove storage listener
  if (_onStorageChanged) { chrome.storage.onChanged.removeListener(_onStorageChanged); _onStorageChanged = null; }

  // 5. Remove drawing canvas (added directly to body, NOT inside shadowHost)
  if (drawCanvas?.parentNode) drawCanvas.parentNode.removeChild(drawCanvas);

  // 6. Remove control bar shadow host
  if (shadowHost?.parentNode) shadowHost.parentNode.removeChild(shadowHost);

  // 7. Reset all state
  barContainer  = null;
  drawCanvas    = null;
  shadowHost    = null;
  shadowRoot    = null;
  drawCtx       = null;
  isDrawingMode = false;
  isDrawing     = false;
}

function bindCanvasEvents() {
  drawCanvas.addEventListener('mousedown', e => {
    if (!isDrawingMode) return;
    isDrawing = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  drawCanvas.addEventListener('mousemove', e => {
    if (!isDrawing || !isDrawingMode) return;
    drawCtx.beginPath();
    drawCtx.moveTo(lastX, lastY);
    drawCtx.lineTo(e.clientX, e.clientY);
    drawCtx.strokeStyle = currentColor;
    drawCtx.stroke();
    lastX = e.clientX;
    lastY = e.clientY;
  });

  drawCanvas.addEventListener('mouseup',    () => { isDrawing = false; });
  drawCanvas.addEventListener('mouseleave', () => { isDrawing = false; });
  
  // Handle window resize — preserve existing drawing content
  _canvasResize = () => {
    if (!drawCanvas || !drawCtx) return;
    const dpr = window.devicePixelRatio || 1;
    
    // Snapshot the current drawing before resize wipes the canvas
    const snapshot = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    
    drawCanvas.width  = window.innerWidth  * dpr;
    drawCanvas.height = window.innerHeight * dpr;
    
    // Restore drawing and re-apply context settings (getImageData/putImageData resets the transform)
    drawCtx.putImageData(snapshot, 0, 0);
    drawCtx.scale(dpr, dpr);
    drawCtx.lineCap   = 'round';
    drawCtx.lineJoin  = 'round';
    drawCtx.lineWidth = 4;
  };
  window.addEventListener('resize', _canvasResize);
}
