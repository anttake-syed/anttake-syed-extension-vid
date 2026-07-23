// recording.js — AntCapture standalone recording control window
// This file is loaded by recording.html which opens as a separate popup window
// whenever a recording starts (any mode). It syncs with background.js via
// chrome.storage.local and chrome.runtime.sendMessage.

// ─── State ────────────────────────────────────────────────────────────────────
let timerInterval = null;
let isPaused      = false;
let startTime     = null; // ms epoch when recording started
let pausedAt      = null; // ms when last paused (for offset calc)
let pausedOffset  = 0;    // cumulative ms spent paused

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const timerEl        = document.getElementById('timerDisplay');
const modeBadge      = document.getElementById('modeBadge');
const micBtn         = document.getElementById('micBtn');
const camBtn         = document.getElementById('camBtn');
const micLabel       = document.getElementById('micLabel');
const camLabel       = document.getElementById('camLabel');
const micIcon        = micBtn.querySelector('.material-symbols-rounded');
const camIcon        = camBtn.querySelector('.material-symbols-rounded');
const stopBtn        = document.getElementById('stopBtn');
const pauseBtn       = document.getElementById('pauseBtn');
const pauseIcon      = pauseBtn.querySelector('.material-symbols-rounded');
const discardBtn     = document.getElementById('discardBtn');
const discardConfirm = document.getElementById('discardConfirm');
const discardYes     = document.getElementById('discardYes');
const discardNo      = document.getElementById('discardNo');
const fmtChip        = document.getElementById('fmtChip');
const resChip        = document.getElementById('resChip');
const pausedChip     = document.getElementById('pausedChip');

// ─── Init: read state from storage ───────────────────────────────────────────
chrome.storage.local.get([
  'isRecording', 'currentRecordMode', 'recordingStartTime',
  'recMic', 'recCam', 'recFormat', 'recRes', 'isRecordingPaused',
  'pausedOffset'
], (res) => {
  if (!res.isRecording) {
    // Nothing recording — close this window
    window.close();
    return;
  }

  startTime     = res.recordingStartTime || Date.now();
  isPaused      = res.isRecordingPaused  || false;
  pausedOffset  = res.pausedOffset       || 0;

  // Mode badge
  const modeMap = { screen: 'Screen', tab: 'Tab', camera: 'Camera', overlay: 'Cam + Screen' };
  modeBadge.textContent = modeMap[res.currentRecordMode] || 'Screen';

  // Format / resolution chips
  fmtChip.textContent = (res.recFormat || 'webm').toUpperCase();
  resChip.textContent = `${res.recRes || 720}p`;

  // Device state
  applyMicState(res.recMic === true);
  applyCamState(res.recCam === true);

  // Pause state
  if (isPaused) {
    pausedAt = Date.now();
    applyPausedUI(true);
  } else {
    startTimer();
  }
});

// ─── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(tickTimer, 500);
  tickTimer();
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function tickTimer() {
  if (isPaused || !startTime) return;
  const elapsed = Math.floor((Date.now() - startTime - pausedOffset) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;

  // Keep badge in sync — write elapsed so background alarm can just read it
  chrome.storage.local.set({ recordingElapsedSecs: elapsed });
}

// ─── Device UI helpers ────────────────────────────────────────────────────────
function applyMicState(on) {
  micIcon.textContent = on ? 'mic' : 'mic_off';
  micLabel.textContent = on ? 'Mic On' : 'Mic Off';
  micBtn.classList.toggle('off', !on);
  micBtn.dataset.on = String(on);
}

function applyCamState(on) {
  camIcon.textContent = on ? 'videocam' : 'videocam_off';
  camLabel.textContent = on ? 'Cam On' : 'Cam Off';
  camBtn.classList.toggle('off', !on);
  camBtn.dataset.on = String(on);
}

function applyPausedUI(paused) {
  isPaused = paused;
  timerEl.classList.toggle('paused', paused);
  pausedChip.style.display = paused ? 'flex' : 'none';
  pauseIcon.textContent = paused ? 'play_arrow' : 'pause';
  pauseBtn.querySelector('span + *')
    ? (pauseBtn.childNodes[pauseBtn.childNodes.length - 1].textContent = paused ? ' Resume' : ' Pause')
    : null;
  // Update button text directly
  pauseBtn.innerHTML = paused
    ? '<span class="material-symbols-rounded">play_arrow</span> Resume'
    : '<span class="material-symbols-rounded">pause</span> Pause';
  pauseBtn.classList.toggle('is-paused', paused);
}

// ─── Mic toggle ───────────────────────────────────────────────────────────────
micBtn.addEventListener('click', () => {
  const newOn = micBtn.dataset.on !== 'true';
  applyMicState(newOn);
  chrome.storage.local.set({ recMic: newOn });
  chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_MIC', on: newOn });
});

// ─── Cam toggle ───────────────────────────────────────────────────────────────
camBtn.addEventListener('click', () => {
  const newOn = camBtn.dataset.on !== 'true';
  applyCamState(newOn);
  chrome.storage.local.set({ recCam: newOn });
  chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_CAM', on: newOn });
});

// ─── Pause / Resume ───────────────────────────────────────────────────────────
pauseBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: isPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
});

// ─── Stop & Save ──────────────────────────────────────────────────────────────
stopBtn.addEventListener('click', () => {
  stopTimer();
  chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
  window.close();
});

// ─── Discard flow ─────────────────────────────────────────────────────────────
discardBtn.addEventListener('click', () => {
  discardConfirm.classList.add('visible');
  discardBtn.disabled = true;
  stopBtn.disabled = true;
  pauseBtn.disabled = true;
});
discardNo.addEventListener('click', () => {
  discardConfirm.classList.remove('visible');
  discardBtn.disabled = false;
  stopBtn.disabled = false;
  pauseBtn.disabled = false;
});
discardYes.addEventListener('click', () => {
  stopTimer();
  chrome.runtime.sendMessage({ action: 'DISCARD_RECORDING' });
  window.close();
});

// ─── Listen for external stop (e.g. Chrome's native "Stop sharing" bar) ───────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  // If recording stopped externally, close this window
  if (changes.isRecording?.newValue === false) {
    stopTimer();
    window.close();
    return;
  }

  if (changes.pausedOffset !== undefined) {
    pausedOffset = changes.pausedOffset.newValue || 0;
  }

  // Sync pause state if changed from another surface (e.g. popup)
  if (changes.isRecordingPaused !== undefined) {
    const paused = changes.isRecordingPaused.newValue === true;
    if (paused !== isPaused) {
      if (paused) {
        stopTimer();
      } else {
        startTimer();
      }
      applyPausedUI(paused);
    }
  }

  // Sync mic/cam if changed from popup
  if (changes.recMic !== undefined) applyMicState(changes.recMic.newValue === true);
  if (changes.recCam !== undefined) applyCamState(changes.recCam.newValue === true);
});
