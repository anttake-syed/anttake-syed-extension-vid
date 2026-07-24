// content/controlBar.js — AntCapture
// Injects a floating control bar (HUD) into the active tab during recording.
// Includes controls for pause/resume, mic toggle, stopping, and a screen drawing tool.

let barContainer = null;
let drawCanvas = null;
let drawCtx = null;
let isDrawingMode = false;
let isDrawing = false;
let currentColor = '#ef4444'; // default red
let timerInterval = null;
let lastX = 0;
let lastY = 0;

export function initControlBar() {
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
  if (barContainer) return;

  // 1. Build Drawing Canvas (invisible at first, covers full screen)
  drawCanvas = document.createElement('canvas');
  drawCanvas.id = 'antcapture-drawing-canvas';
  drawCanvas.style.position = 'fixed';
  drawCanvas.style.top = '0';
  drawCanvas.style.left = '0';
  drawCanvas.style.width = '100vw';
  drawCanvas.style.height = '100vh';
  drawCanvas.style.zIndex = '2147483645'; // Just below control bar
  drawCanvas.style.pointerEvents = 'none'; // click-through by default
  drawCanvas.style.cursor = 'crosshair';
  
  // High-DPI support
  const dpr = window.devicePixelRatio || 1;
  drawCanvas.width = window.innerWidth * dpr;
  drawCanvas.height = window.innerHeight * dpr;
  
  drawCtx = drawCanvas.getContext('2d');
  drawCtx.scale(dpr, dpr);
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
  drawCtx.lineWidth = 4;
  
  document.body.appendChild(drawCanvas);
  bindCanvasEvents();

  // 2. Build Control Bar
  barContainer = document.createElement('div');
  barContainer.id = 'antcapture-control-bar';
  barContainer.style.position = 'fixed';
  barContainer.style.bottom = '30px';
  barContainer.style.left = '30px';
  barContainer.style.zIndex = '2147483646';
  barContainer.style.backgroundColor = '#1e293b';
  barContainer.style.borderRadius = '12px';
  barContainer.style.padding = '8px 12px';
  barContainer.style.display = 'flex';
  barContainer.style.alignItems = 'center';
  barContainer.style.gap = '8px';
  barContainer.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
  barContainer.style.border = '1px solid rgba(255,255,255,0.1)';
  barContainer.style.fontFamily = '"Inter", sans-serif';
  barContainer.style.color = '#fff';
  barContainer.style.cursor = 'move';
  barContainer.style.userSelect = 'none';

  // Import material icons internally if needed (using svg for reliability in content scripts)
  const getIcon = (d, color='#fff') => `<svg width="24" height="24" viewBox="0 0 24 24" fill="${color}"><path d="${d}"/></svg>`;
  
  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'antcapture-hud-timer';
  timerDisplay.style.fontWeight = '600';
  timerDisplay.style.fontSize = '14px';
  timerDisplay.style.marginRight = '8px';
  timerDisplay.style.minWidth = '42px';
  timerDisplay.textContent = '0:00';
  barContainer.appendChild(timerDisplay);

  const btnStyle = 'background:transparent; border:none; color:#fff; cursor:pointer; padding:6px; border-radius:6px; display:flex; align-items:center; justify-content:center; transition:0.2s;';
  const hoverEffect = (btn) => {
    btn.onmouseenter = () => btn.style.backgroundColor = 'rgba(255,255,255,0.1)';
    btn.onmouseleave = () => { if (!btn.dataset.active) btn.style.backgroundColor = 'transparent'; };
  };

  // Pause Button
  const pauseBtn = document.createElement('button');
  pauseBtn.style.cssText = btnStyle;
  pauseBtn.innerHTML = getIcon('M6 19h4V5H6v14zm8-14v14h4V5h-4z'); // pause icon
  pauseBtn.onclick = () => {
    chrome.storage.local.get(['isRecordingPaused'], (res) => {
      chrome.runtime.sendMessage({ action: res.isRecordingPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
    });
  };
  hoverEffect(pauseBtn);
  barContainer.appendChild(pauseBtn);

  // Mic Button
  const micBtn = document.createElement('button');
  micBtn.style.cssText = btnStyle;
  chrome.storage.local.get(['recMic'], res => {
    micBtn.innerHTML = res.recMic ? getIcon('M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z', '#34d399') : getIcon('M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6 6V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z', '#ef4444');
  });
  micBtn.onclick = () => {
    chrome.storage.local.get(['recMic'], (res) => {
      const newState = !res.recMic;
      chrome.storage.local.set({ recMic: newState });
      chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_MIC', on: newState });
      micBtn.innerHTML = newState ? getIcon('M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z', '#34d399') : getIcon('M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6 6V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z', '#ef4444');
    });
  };
  hoverEffect(micBtn);
  barContainer.appendChild(micBtn);

  // Draw Button
  const drawBtn = document.createElement('button');
  drawBtn.style.cssText = btnStyle;
  drawBtn.innerHTML = getIcon('M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', '#cbd5e1'); // edit icon
  drawBtn.onclick = () => {
    isDrawingMode = !isDrawingMode;
    if (isDrawingMode) {
      drawCanvas.style.pointerEvents = 'auto';
      drawBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.4)';
      drawBtn.dataset.active = "true";
      toolsPanel.style.display = 'flex';
    } else {
      drawCanvas.style.pointerEvents = 'none';
      drawBtn.style.backgroundColor = 'transparent';
      delete drawBtn.dataset.active;
      toolsPanel.style.display = 'none';
    }
  };
  hoverEffect(drawBtn);
  barContainer.appendChild(drawBtn);

  // Stop Button
  const stopBtn = document.createElement('button');
  stopBtn.style.cssText = btnStyle;
  stopBtn.style.backgroundColor = '#ef4444';
  stopBtn.innerHTML = getIcon('M6 6h12v12H6z'); // stop icon
  stopBtn.onclick = () => {
    chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
  };
  barContainer.appendChild(stopBtn);

  // 3. Drawing Tools Panel (Colors / Clear)
  const toolsPanel = document.createElement('div');
  toolsPanel.style.display = 'none';
  toolsPanel.style.alignItems = 'center';
  toolsPanel.style.gap = '6px';
  toolsPanel.style.marginLeft = '8px';
  toolsPanel.style.paddingLeft = '8px';
  toolsPanel.style.borderLeft = '1px solid rgba(255,255,255,0.1)';
  
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff'];
  colors.forEach(c => {
    const cb = document.createElement('div');
    cb.style.width = '16px';
    cb.style.height = '16px';
    cb.style.borderRadius = '50%';
    cb.style.backgroundColor = c;
    cb.style.cursor = 'pointer';
    cb.style.border = c === currentColor ? '2px solid #fff' : '2px solid transparent';
    cb.onclick = () => {
      currentColor = c;
      Array.from(toolsPanel.children).forEach(child => { if (child.style.width === '16px') child.style.border = '2px solid transparent'; });
      cb.style.border = '2px solid #fff';
    };
    toolsPanel.appendChild(cb);
  });

  const clearBtn = document.createElement('button');
  clearBtn.style.cssText = btnStyle;
  clearBtn.innerHTML = getIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', '#94a3b8'); // clear (X) icon
  clearBtn.title = "Clear drawings";
  clearBtn.onclick = () => {
    const dpr = window.devicePixelRatio || 1;
    drawCtx.clearRect(0, 0, drawCanvas.width / dpr, drawCanvas.height / dpr);
  };
  hoverEffect(clearBtn);
  toolsPanel.appendChild(clearBtn);

  barContainer.appendChild(toolsPanel);

  document.body.appendChild(barContainer);

  // Dragging logic for Control Bar
  let dragging = false, sx, sy, il, it;
  barContainer.addEventListener('mousedown', e => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'DIV' && e.target.style.borderRadius === '50%') return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    const r = barContainer.getBoundingClientRect(); il = r.left; it = r.top;
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    barContainer.style.left = (il + e.clientX - sx) + 'px';
    barContainer.style.top = (it + e.clientY - sy) + 'px';
    barContainer.style.bottom = 'auto';
    barContainer.style.right = 'auto';
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  // Update timer every second
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
}

function updatePauseState(isPaused) {
  if (!barContainer) return;
  const pauseBtn = barContainer.children[1]; // assuming it's the second child
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
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (barContainer?.parentNode) barContainer.parentNode.removeChild(barContainer);
  if (drawCanvas?.parentNode) drawCanvas.parentNode.removeChild(drawCanvas);
  barContainer = null;
  drawCanvas = null;
  drawCtx = null;
  isDrawingMode = false;
  isDrawing = false;
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

  drawCanvas.addEventListener('mouseup', () => { isDrawing = false; });
  drawCanvas.addEventListener('mouseleave', () => { isDrawing = false; });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (!drawCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    
    // Save current drawing
    const currentImg = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    
    drawCanvas.width = window.innerWidth * dpr;
    drawCanvas.height = window.innerHeight * dpr;
    
    drawCtx.putImageData(currentImg, 0, 0);
    drawCtx.scale(dpr, dpr);
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.lineWidth = 4;
  });
}
