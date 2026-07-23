// content/recordingHUD.js — AntCapture
// A custom floating recording control bar injected into the active page
// when a recording starts. Provides Stop, Mic toggle, and Cam toggle controls.
// Designed to complement (not replace) Chrome's built-in "Stop sharing" bar —
// when Chrome's bar is used, it triggers the track.ended event which our
// offscreen.js already handles, causing a clean stop.

let hudEl = null;
let hudTimerInterval = null;
let hudStartTime = null;

export function initRecordingHUD() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SHOW_RECORDING_HUD') {
      showHUD(message.options || {});
    }
    if (message.action === 'HIDE_RECORDING_HUD') {
      hideHUD();
    }
    if (message.action === 'HUD_UPDATE_MIC') {
      updateMicState(message.on);
    }
    if (message.action === 'HUD_UPDATE_CAM') {
      updateCamState(message.on);
    }
    if (message.action === 'PAUSE_RECORDING') {
      const pauseBtn = document.getElementById('__ant_hud_pause__');
      if (pauseBtn) {
        pauseBtn.dataset.paused = 'true';
        _renderPauseBtn(pauseBtn, true);
      }
    }
    if (message.action === 'RESUME_RECORDING') {
      const pauseBtn = document.getElementById('__ant_hud_pause__');
      if (pauseBtn) {
        pauseBtn.dataset.paused = 'false';
        _renderPauseBtn(pauseBtn, false);
      }
    }
  });
}

function showHUD(options = {}) {
  if (hudEl) hideHUD(); // clean up any stale HUD

  const { includeMic = false, includeCam = false, recordMode = 'screen', recordingStartTime = Date.now() } = options;

  hudStartTime = recordingStartTime;

  hudEl = document.createElement('div');
  hudEl.id = '__antcapture_hud__';

  // ── Styles ────────────────────────────────────────────────────────────────
  Object.assign(hudEl.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483646',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    background: 'rgba(10, 12, 22, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '40px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(239,68,68,0.2)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: '12px',
    color: '#f1f5f9',
    userSelect: 'none',
    pointerEvents: 'all',
    cursor: 'move', // Indicate it's draggable
    animation: '__antHudIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
  });

  // ── Inject keyframe animation ──────────────────────────────────────────
  if (!document.getElementById('__antcapture_hud_style__')) {
    const style = document.createElement('style');
    style.id = '__antcapture_hud_style__';
    style.textContent = `
      @keyframes __antHudIn {
        from { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.96); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }
      @keyframes __antHudOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        to   { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.96); }
      }
      @keyframes __antRecPulse {
        0%,100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      #__antcapture_hud__ button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.15s, transform 0.15s;
        outline: none;
        border-radius: 50%;
      }
      #__antcapture_hud__ button:hover {
        opacity: 0.8;
        transform: scale(1.1);
      }
      #__antcapture_hud__ button:active {
        transform: scale(0.95);
      }
    `;
    document.head.appendChild(style);
  }

  // ── Drag Handle ────────────────────────────────────────────────────────
  const dragHandle = document.createElement('div');
  dragHandle.title = 'Drag to move';
  Object.assign(dragHandle.style, {
    cursor: 'move',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 4px',
    opacity: '0.4',
  });
  for (let i = 0; i < 3; i++) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '2px';
    for (let j = 0; j < 2; j++) {
      const d = document.createElement('div');
      Object.assign(d.style, { width: '3px', height: '3px', background: '#fff', borderRadius: '50%' });
      row.appendChild(d);
    }
    dragHandle.appendChild(row);
  }

  // ── Recording indicator dot ────────────────────────────────────────────
  const dot = document.createElement('div');
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ef4444',
    flexShrink: '0',
    animation: '__antRecPulse 1.5s ease-in-out infinite',
  });

  // ── Timer ──────────────────────────────────────────────────────────────
  const timer = document.createElement('span');
  timer.id = '__ant_hud_timer__';
  Object.assign(timer.style, {
    fontSize: '12px',
    fontWeight: '600',
    color: '#f8fafc',
    minWidth: '38px',
    letterSpacing: '0.02em',
    fontVariantNumeric: 'tabular-nums',
  });
  timer.textContent = '0:00';

  // ── Divider ────────────────────────────────────────────────────────────
  function makeDivider() {
    const d = document.createElement('div');
    Object.assign(d.style, {
      width: '1px',
      height: '16px',
      background: 'rgba(255,255,255,0.12)',
      flexShrink: '0',
    });
    return d;
  }

  // ── Mic toggle button ──────────────────────────────────────────────────
  const micBtn = document.createElement('button');
  micBtn.id = '__ant_hud_mic__';
  micBtn.title = 'Toggle Microphone';
  micBtn.dataset.on = String(includeMic);
  // Prevent drag from triggering on buttons
  micBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  _renderMicBtn(micBtn, includeMic);
  micBtn.addEventListener('click', () => {
    const isOn = micBtn.dataset.on === 'true';
    const newState = !isOn;
    micBtn.dataset.on = String(newState);
    _renderMicBtn(micBtn, newState);
    // Tell background to update mic state
    chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_MIC', on: newState });
  });

  const camBtn = document.createElement('button');
  camBtn.id = '__ant_hud_cam__';
  camBtn.title = 'Toggle Camera';
  camBtn.dataset.on = String(includeCam);
  // Prevent drag from triggering on buttons
  camBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  _renderCamBtn(camBtn, includeCam);
  camBtn.addEventListener('click', () => {
    const isOn = camBtn.dataset.on === 'true';
    const newState = !isOn;
    camBtn.dataset.on = String(newState);
    _renderCamBtn(camBtn, newState);
    chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_CAM', on: newState });
  });

  // ── Pause button ───────────────────────────────────────────────────────
  const pauseBtn = document.createElement('button');
  pauseBtn.id = '__ant_hud_pause__';
  pauseBtn.title = 'Pause / Resume Recording';
  pauseBtn.dataset.paused = 'false';
  Object.assign(pauseBtn.style, {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '20px',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#e2e8f0',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: 'pointer',
  });
  _renderPauseBtn(pauseBtn, false);
  pauseBtn.addEventListener('click', () => {
    const isPaused = pauseBtn.dataset.paused === 'true';
    chrome.runtime.sendMessage({ action: isPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
  });
  pauseBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  // ── Stop button ────────────────────────────────────────────────────────
  const stopBtn = document.createElement('button');
  stopBtn.title = 'Stop and Save Recording';
  Object.assign(stopBtn.style, {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: '20px',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: '#f87171',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'inherit',
    cursor: 'pointer',
    transition: 'background 0.15s, transform 0.15s',
  });

  // Material-icon-style square stop icon via SVG
  const stopIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  stopIcon.setAttribute('width', '12');
  stopIcon.setAttribute('height', '12');
  stopIcon.setAttribute('viewBox', '0 0 24 24');
  stopIcon.setAttribute('fill', '#f87171');
  const stopRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  stopRect.setAttribute('x', '4');
  stopRect.setAttribute('y', '4');
  stopRect.setAttribute('width', '16');
  stopRect.setAttribute('height', '16');
  stopRect.setAttribute('rx', '2');
  stopIcon.appendChild(stopRect);
  const stopLabel = document.createElement('span');
  stopLabel.textContent = 'Stop & Save';

  stopBtn.appendChild(stopIcon);
  stopBtn.appendChild(stopLabel);

  stopBtn.addEventListener('mouseenter', () => {
    stopBtn.style.background = 'rgba(239,68,68,0.28)';
  });
  stopBtn.addEventListener('mouseleave', () => {
    stopBtn.style.background = 'rgba(239,68,68,0.15)';
  });
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
    hideHUD();
  });
  stopBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  // ── Close button ───────────────────────────────────────────────────────
  const closeBtn = document.createElement('button');
  closeBtn.title = 'Hide Recording Bar';
  Object.assign(closeBtn.style, {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '2px',
  });
  const closeIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  closeIcon.setAttribute('width', '16'); closeIcon.setAttribute('height', '16');
  closeIcon.setAttribute('viewBox', '0 0 24 24'); closeIcon.setAttribute('fill', 'none');
  closeIcon.setAttribute('stroke', 'currentColor'); closeIcon.setAttribute('stroke-width', '2');
  closeIcon.setAttribute('stroke-linecap', 'round'); closeIcon.setAttribute('stroke-linejoin', 'round');
  closeIcon.innerHTML = '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
  closeBtn.appendChild(closeIcon);
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = 'rgba(255,255,255,0.8)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = 'rgba(255,255,255,0.4)'; });
  closeBtn.addEventListener('click', () => {
    hideHUD();
  });
  closeBtn.addEventListener('mousedown', (e) => e.stopPropagation());

  // ── Assemble HUD ───────────────────────────────────────────────────────
  hudEl.appendChild(dragHandle);
  hudEl.appendChild(dot);
  hudEl.appendChild(timer);
  hudEl.appendChild(makeDivider());
  hudEl.appendChild(micBtn);
  hudEl.appendChild(camBtn);
  hudEl.appendChild(makeDivider());
  hudEl.appendChild(pauseBtn);
  hudEl.appendChild(stopBtn);
  hudEl.appendChild(closeBtn);

  document.body.appendChild(hudEl);

  // ── Make HUD Draggable ──────────────────────────────────────────────────
  let isDragging = false, startX, startY, initLeft, initTop;
  hudEl.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return; // Don't drag if clicking a button
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = hudEl.getBoundingClientRect();
    initLeft = rect.left;
    initTop = rect.top;
    
    // Disable transition during drag for smoothness
    hudEl.style.transition = 'none';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    hudEl.style.left = (initLeft + e.clientX - startX) + 'px';
    hudEl.style.top = (initTop + e.clientY - startY) + 'px';
    hudEl.style.bottom = 'auto'; // Remove bottom constraint
    hudEl.style.transform = 'none'; // Remove translateX(-50%)
  });
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      hudEl.style.transition = '';
    }
  });

  // ── Start timer ────────────────────────────────────────────────────────
  hudTimerInterval = setInterval(() => {
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
      const secs = elapsed % 60;
      const timerEl = document.getElementById('__ant_hud_timer__');
      if (timerEl) timerEl.textContent = `${mins}:${String(secs).padStart(2, '0')}`;
    });
  }, 500);
}

// ── Icon renderers ─────────────────────────────────────────────────────────
function _renderPauseBtn(btn, isPaused) {
  btn.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12'); svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', '#e2e8f0');
  if (isPaused) {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '5 3 19 12 5 21 5 3');
    svg.appendChild(poly);
  } else {
    const r1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r1.setAttribute('x','6'); r1.setAttribute('y','4'); r1.setAttribute('width','4'); r1.setAttribute('height','16'); r1.setAttribute('rx','1');
    const r2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r2.setAttribute('x','14'); r2.setAttribute('y','4'); r2.setAttribute('width','4'); r2.setAttribute('height','16'); r2.setAttribute('rx','1');
    svg.appendChild(r1); svg.appendChild(r2);
  }
  const lbl = document.createElement('span');
  lbl.textContent = isPaused ? 'Resume' : 'Pause';
  btn.appendChild(svg); btn.appendChild(lbl);
  btn.style.color = isPaused ? '#fbbf24' : '#e2e8f0';
  btn.style.borderColor = isPaused ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.15)';
  btn.style.background = isPaused ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.08)';
}

function _renderMicBtn(btn, isOn) {
  btn.innerHTML = '';
  // Use simple SVG icons since Material Symbols font is not available on all pages
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', isOn ? '#34d399' : '#f87171');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (isOn) {
    // Mic on icon
    svg.innerHTML = `
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    `;
  } else {
    // Mic off icon
    svg.innerHTML = `
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    `;
  }
  btn.appendChild(svg);
  btn.style.opacity = isOn ? '1' : '0.55';
}

function _renderCamBtn(btn, isOn) {
  btn.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', isOn ? '#34d399' : '#f87171');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (isOn) {
    svg.innerHTML = `
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    `;
  } else {
    svg.innerHTML = `
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
    `;
  }
  btn.appendChild(svg);
  btn.style.opacity = isOn ? '1' : '0.55';
}

// ── Public updaters (called from runtime messages) ─────────────────────────
function updateMicState(isOn) {
  const btn = document.getElementById('__ant_hud_mic__');
  if (!btn) return;
  btn.dataset.on = String(isOn);
  _renderMicBtn(btn, isOn);
}

function updateCamState(isOn) {
  const btn = document.getElementById('__ant_hud_cam__');
  if (!btn) return;
  btn.dataset.on = String(isOn);
  _renderCamBtn(btn, isOn);
}

// ── Hide / cleanup ─────────────────────────────────────────────────────────
function hideHUD() {
  if (hudTimerInterval) { clearInterval(hudTimerInterval); hudTimerInterval = null; }
  if (!hudEl) return;

  hudEl.style.animation = '__antHudOut 0.25s ease forwards';
  setTimeout(() => {
    if (hudEl && hudEl.parentNode) {
      hudEl.parentNode.removeChild(hudEl);
    }
    hudEl = null;
  }, 260);
}
