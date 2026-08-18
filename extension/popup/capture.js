// popup/capture.js — Capture Action and UI bindings
import { showToast } from './toast.js';
import { appState, getConfig } from './state.js';

let shotMode  = 'tab';
let recMode   = 'screen';
let recRes    = 720;
let recFormat = 'webm';
let recMic    = false;
let recCam    = false;
let popupAudioCtx = null;
let popupAnimFrame = null;
let popupMicStream = null;
export function initCapture() {
  const recordBtn = document.getElementById('recordBtn');
  const recordBtnText = recordBtn?.querySelector('.btn-text');
  const recordBtnIcon = recordBtn?.querySelector('.btn-icon');
  const captureCountBadge = document.getElementById('captureCountBadge');
  const micBtn = document.getElementById('micToggleBtn');
  const camBtn = document.getElementById('camToggleBtn');
  const shotCaptureBtn = document.getElementById('shotCaptureBtn');
  const storageModeSelect = document.getElementById('storageModeSelect');

  function bindModeGroup(selector, onSelect) {
    const container = document.querySelector(selector);
    if (!container) return;
    container.querySelectorAll('.cap-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.cap-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(btn.dataset.mode);
      });
    });
  }

  bindModeGroup('#screenshotModes', mode => { shotMode = mode; });
  bindModeGroup('#recordModes', mode => { recMode = mode; });

  const resSelect = document.getElementById('resolutionSelect');
  if (resSelect) {
    resSelect.addEventListener('change', (e) => {
      recRes = parseInt(e.target.value);
      chrome.storage.local.set({ recRes });
    });
  }

  const fmtSelect = document.getElementById('formatSelect');
  if (fmtSelect) {
    fmtSelect.addEventListener('change', (e) => {
      recFormat = e.target.value;
      chrome.storage.local.set({ recFormat });
    });
  }

  function applyMicState(on) {
    recMic = on;
    if (micBtn) {
      micBtn.dataset.on = String(on);
      const icon = micBtn.querySelector('.dit-icon');
      const canvas = document.getElementById('popupMicCanvas');
      if (on) {
        micBtn.classList.remove('off'); micBtn.classList.add('active');
        if (icon) icon.textContent = 'mic';
        if (canvas) canvas.style.display = 'block';
        startPopupVisualizer();
      } else {
        micBtn.classList.add('off'); micBtn.classList.remove('active');
        if (icon) icon.textContent = 'mic_off';
        if (canvas) canvas.style.display = 'none';
        stopPopupVisualizer();
      }
    }
  }

  function applyCamState(on) {
    recCam = on;
    if (camBtn) {
      camBtn.dataset.on = String(on);
      const icon = camBtn.querySelector('.dit-icon');
      if (on) {
        camBtn.classList.remove('off'); camBtn.classList.add('active');
        if (icon) icon.textContent = 'videocam';
      } else {
        camBtn.classList.add('off'); camBtn.classList.remove('active');
        if (icon) icon.textContent = 'videocam_off';
      }
    }
  }

  async function startPopupVisualizer() {
    if (popupAudioCtx) return;
    try {
      const { selectedMicId } = await chrome.storage.local.get(['selectedMicId']);
      const constraints = selectedMicId ? { audio: { deviceId: { exact: selectedMicId } } } : { audio: true };
      popupMicStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      popupAudioCtx = new AudioContext();
      if (popupAudioCtx.state === 'suspended') popupAudioCtx.resume();
      
      const src = popupAudioCtx.createMediaStreamSource(popupMicStream);
      const an = popupAudioCtx.createAnalyser();
      an.fftSize = 128;
      src.connect(an);
      
      const buf = new Uint8Array(an.frequencyBinCount);
      const canvas = document.getElementById('popupMicCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      
      function draw() {
        popupAnimFrame = requestAnimationFrame(draw);
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const pct = Math.min(rms * 4, 1);
        
        ctx.clearRect(0, 0, W, H);
        
        // Draw little bars based on volume
        const bars = 5;
        const gap = 1;
        const barW = (W - gap * (bars - 1)) / bars;
        
        for (let i = 0; i < bars; i++) {
          // Add some fake jitter for the trailing bars based on main volume
          const jitter = Math.random() * 0.3 * pct;
          const targetPct = (i === 0) ? pct : Math.max(0, pct - (i * 0.15)) + jitter;
          const barH = Math.max(2, targetPct * H);
          ctx.fillStyle = targetPct > 0.8 ? '#f87171' : targetPct > 0.6 ? '#fbbf24' : '#10b981';
          ctx.fillRect(i * (barW + gap), H - barH, barW, barH);
        }
      }
      draw();
    } catch (err) {
      console.warn("Could not start popup mic visualizer:", err);
      // Silently fail if they revoked permission while popup closed
      applyMicState(false);
      chrome.storage.local.set({ recMic: false });
    }
  }

  function stopPopupVisualizer() {
    if (popupAnimFrame) cancelAnimationFrame(popupAnimFrame);
    if (popupMicStream) popupMicStream.getTracks().forEach(t => t.stop());
    if (popupAudioCtx) { popupAudioCtx.close(); popupAudioCtx = null; }
    popupAnimFrame = null;
    popupMicStream = null;
  }

  if (micBtn) {
    micBtn.addEventListener('click', async () => {
      // Check actual permission state before toggling
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        // Permission OK — update central state
        chrome.storage.local.set({ recMic: !recMic });
      } catch (e) {
        // No permission — open access page
        chrome.tabs.create({ url: chrome.runtime.getURL('permissions/get-access.html?target=both') });
        window.close();
      }
    });
  }

  if (camBtn) {
    camBtn.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        chrome.storage.local.set({ recCam: !recCam });
      } catch (e) {
        chrome.tabs.create({ url: chrome.runtime.getURL('permissions/get-access.html?target=both') });
        window.close();
      }
    });
  }

  // Sync state if the get-access.html page granted permission
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.micPermissionGranted?.newValue === true) {
      applyMicState(true);
      chrome.storage.local.set({ recMic: true });
      chrome.storage.local.remove('micPermissionGranted');
    }
    if (changes.camPermissionGranted?.newValue === true) {
      applyCamState(true);
      chrome.storage.local.set({ recCam: true });
      chrome.storage.local.remove('camPermissionGranted');
    }
  });

  let popupTimerInterval = null;

  function updateRecordButton(isRecording) {
    const activePanel = document.getElementById('activeRecordingPanel');
    const sectionsToHide = [
      ...document.querySelectorAll('.capture-section-label'),
      document.getElementById('screenshotModes'),
      document.getElementById('shotCaptureBtn'),
      document.getElementById('recordModes'),
      document.getElementById('recSettingsRow'),
      document.getElementById('recordBtn')
    ];

    if (isRecording) {
      sectionsToHide.forEach(el => { if(el) el.style.display = 'none'; });
      if (activePanel) activePanel.style.display = 'flex';
      
      // Timer: re-read start time and pause offsets every tick
      if (popupTimerInterval) clearInterval(popupTimerInterval);
      popupTimerInterval = setInterval(() => {
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
          const timerEl = document.getElementById('popupTimer');
          if (timerEl) timerEl.textContent = `${mins}:${secs}`;

          const activePauseBtn = document.getElementById('activePauseBtn');
          if (activePauseBtn) {
            activePauseBtn.innerHTML = res.isRecordingPaused
              ? '<span class="material-symbols-rounded btn-icon" style="font-size:16px;">play_arrow</span> Resume'
              : '<span class="material-symbols-rounded btn-icon" style="font-size:16px;">pause</span> Pause';
          }
        });
      }, 500);
      
      // Set initial mic/cam status
      chrome.storage.local.get(['recordingStartTime', 'recMic', 'recCam', 'isRecordingPaused'], (res) => {
        _updatePopupMicCamUI(res.recMic, res.recCam);
        
        const activePauseBtn = document.getElementById('activePauseBtn');
        if (activePauseBtn) {
            activePauseBtn.innerHTML = res.isRecordingPaused 
                ? '<span class="material-symbols-rounded btn-icon" style="font-size:16px;">play_arrow</span> Resume'
                : '<span class="material-symbols-rounded btn-icon" style="font-size:16px;">pause</span> Pause';
        }
      });
    } else {
      if (popupTimerInterval) clearInterval(popupTimerInterval);
      if (activePanel) activePanel.style.display = 'none';
      sectionsToHide.forEach(el => { if(el) el.style.display = ''; });
    }
  }

  function _updatePopupMicCamUI(micOn, camOn) {
    const micStat = document.getElementById('activeMicStatus');
    const micLbl  = document.getElementById('activeMicLabel');
    const micBtn  = document.getElementById('activeRecMicBtn');
    const camStat = document.getElementById('activeCamStatus');
    const camLbl  = document.getElementById('activeCamLabel');
    const camBtn  = document.getElementById('activeRecCamBtn');

    if (micStat) micStat.textContent = micOn ? 'mic' : 'mic_off';
    if (micStat) micStat.style.color = micOn ? '#34d399' : '#ef4444';
    if (micLbl)  { micLbl.textContent = micOn ? 'Mic On' : 'Mic Off'; micLbl.style.color = micOn ? '#34d399' : '#ef4444'; }
    if (micBtn)  {
      micBtn.style.background = micOn ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)';
      micBtn.style.borderColor = micOn ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)';
    }

    if (camStat) camStat.textContent = camOn ? 'videocam' : 'videocam_off';
    if (camStat) camStat.style.color = camOn ? '#34d399' : '#ef4444';
    if (camLbl)  { camLbl.textContent = camOn ? 'Cam On' : 'Cam Off'; camLbl.style.color = camOn ? '#34d399' : '#ef4444'; }
    if (camBtn)  {
      camBtn.style.background = camOn ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.12)';
      camBtn.style.borderColor = camOn ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)';
    }
  }

  // Wire up interactive mic/cam buttons in the active recording panel
  document.getElementById('activeRecMicBtn')?.addEventListener('click', () => {
    chrome.storage.local.get(['recMic'], (res) => {
      const newState = !(res.recMic === true);
      // We do not update the DOM manually here; the chrome.storage.onChanged listener will handle it.
      chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_MIC', on: newState });
    });
  });

  document.getElementById('activeRecCamBtn')?.addEventListener('click', () => {
    chrome.storage.local.get(['recCam'], (res) => {
      const newState = !(res.recCam === true);
      chrome.runtime.sendMessage({ action: 'HUD_TOGGLE_CAM', on: newState });
    });
  });

  // Bind active recording buttons
  document.getElementById('activeStopBtn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'STOP_RECORDING' });
      window.close();
  });

  document.getElementById('activePauseBtn')?.addEventListener('click', () => {
      chrome.storage.local.get(['isRecordingPaused'], (res) => {
          const isPaused = res.isRecordingPaused === true;
          chrome.runtime.sendMessage({ action: isPaused ? 'RESUME_RECORDING' : 'PAUSE_RECORDING' });
      });
  });

  const discardConfirmBox = document.getElementById('discardConfirmBox');
  const activeStopBtn = document.getElementById('activeStopBtn');
  const activePauseBtn = document.getElementById('activePauseBtn');
  const activeDiscardBtn = document.getElementById('activeDiscardBtn');

  document.getElementById('activeDiscardBtn')?.addEventListener('click', () => {
      if (discardConfirmBox) discardConfirmBox.style.display = 'flex';
      if (activeStopBtn) activeStopBtn.disabled = true;
      if (activePauseBtn) activePauseBtn.disabled = true;
      if (activeDiscardBtn) activeDiscardBtn.disabled = true;
  });

  document.getElementById('discardNoBtn')?.addEventListener('click', () => {
      if (discardConfirmBox) discardConfirmBox.style.display = 'none';
      if (activeStopBtn) activeStopBtn.disabled = false;
      if (activePauseBtn) activePauseBtn.disabled = false;
      if (activeDiscardBtn) activeDiscardBtn.disabled = false;
  });

  document.getElementById('discardYesBtn')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'DISCARD_RECORDING' });
      window.close();
  });

  chrome.storage.local.get(['isRecording', 'recMic', 'recCam', 'recFormat', 'recRes', 'formatFallback'], (result) => {
    updateRecordButton(result.isRecording || false);
    
    applyMicState(result.recMic === true);
    applyCamState(result.recCam === true);

    // Actively verify permissions if they are marked as ON
    async function verifyPermissions() {
      if (result.recMic) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (err) {
          applyMicState(false);
          chrome.storage.local.set({ recMic: false });
        }
      }
      if (result.recCam) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(t => t.stop());
        } catch (err) {
          applyCamState(false);
          chrome.storage.local.set({ recCam: false });
        }
      }
    }
    verifyPermissions();
    
    recFormat = result.recFormat || 'webm';
    const fmtSelect = document.getElementById('formatSelect');
    if (fmtSelect) fmtSelect.value = recFormat;

    recRes = result.recRes || 720;
    const resSelect = document.getElementById('resolutionSelect');
    if (resSelect) resSelect.value = String(recRes);

    if (result.formatFallback?.ts && (Date.now() - result.formatFallback.ts) < 5 * 60 * 1000) {
      showToast(`${result.formatFallback.requested?.toUpperCase()} not supported — saved as ${result.formatFallback.actual?.toUpperCase()}`, 'error', 4000);
      chrome.storage.local.remove('formatFallback');
    }
  });



  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "local") return;
    if (changes.isRecording !== undefined) updateRecordButton(changes.isRecording.newValue);
    if (changes.recMic !== undefined || changes.recCam !== undefined) {
      chrome.storage.local.get(['recMic', 'recCam'], (res) => {
        _updatePopupMicCamUI(res.recMic === true, res.recCam === true);
        if (changes.recMic !== undefined) applyMicState(res.recMic === true);
        if (changes.recCam !== undefined) applyCamState(res.recCam === true);
      });
    }
  });

  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      recordBtn.disabled = true;
      const currentlyRecording = await new Promise(resolve =>
        chrome.storage.local.get(['isRecording'], r => resolve(r.isRecording || false))
      );
        
      if (!currentlyRecording && (recMode === 'camera' || recMode === 'overlay') && !recCam) {
        showToast('Please enable the Camera toggle first.', 'error');
        recordBtn.disabled = false;
        return;
      }

      // ── Resolve the active tab title HERE in the popup context ────────────────
      // From the popup, chrome.tabs.query({ active: true, currentWindow: true })
      // reliably returns the tab the user was on before opening the popup.
      // The background service worker's lastFocusedWindow query is unreliable
      // when the popup is open because the popup itself can be the "last focused window".
      let tabTitle = '';
      let tabUrl   = '';
      if (!currentlyRecording) {
        try {
          const tabs = await new Promise(resolve =>
            chrome.tabs.query({ active: true, currentWindow: true }, resolve)
          );
          const tab = tabs?.[0];
          if (tab && tab.title) {
            tabTitle = tab.title;
            tabUrl   = tab.url || '';
          }
        } catch (_) {
          // Not a critical error — filename will fall back to generic name
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      chrome.runtime.sendMessage({
        action: currentlyRecording ? 'STOP_RECORDING' : 'START_RECORDING',
        recordMode: recMode, resolution: recRes, format: recFormat, includeMic: recMic, includeCam: recCam,
        tabTitle,  // pass the resolved title directly — no background-side tab query needed
        tabUrl,
      }, (response) => {
        recordBtn.disabled = false;
        if (chrome.runtime.lastError) return;
        if (!response?.success) {
          if (recordBtnText) recordBtnText.textContent = 'Error — try again';
          setTimeout(() => updateRecordButton(currentlyRecording), 2000);
        }
      });
    });
  }

  if (shotCaptureBtn) {
    const shotBtnText = shotCaptureBtn.querySelector('.btn-text');
    shotCaptureBtn.addEventListener('click', async () => {
      shotCaptureBtn.disabled = true;
      const origText = shotBtnText ? shotBtnText.textContent : 'Take Screenshot';
      if (shotBtnText) {shotBtnText.textContent = 'Capturing...';}

      const action = { tab: 'TAKE_SCREENSHOT', region: 'REGION_SCREENSHOT', screen: 'SCREEN_SCREENSHOT' }[shotMode] || 'TAKE_SCREENSHOT';

      // ── Resolve the active tab title HERE in the popup context ────────────────
      let tabTitle = '';
      try {
        const tabs = await new Promise(resolve =>
          chrome.tabs.query({ active: true, currentWindow: true }, resolve)
        );
        const tab = tabs?.[0];
        if (tab && tab.title) {
          tabTitle = tab.title;
        }
      } catch (_) {
        // Fallback to empty string
      }
      // ─────────────────────────────────────────────────────────────────────────

      // (Optimistic queue update removed. User now decides in edit.html)
      if (action === 'REGION_SCREENSHOT') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
            shotCaptureBtn.disabled = false;
            if (shotBtnText) shotBtnText.textContent = origText;
            showToast('Cannot select regions on Chrome settings pages. Try a normal website.', 'error');
            return;
          }
          chrome.runtime.sendMessage({ action, tabTitle });
          window.close();
        });
        return;
      }

      chrome.runtime.sendMessage({ action, tabTitle }, (response) => {
        void chrome.runtime.lastError;
        shotCaptureBtn.disabled = false;

        if (!response || response.cancelled) {
          if (shotBtnText) shotBtnText.textContent = origText;
          return;
        }
        
        if (response.success === false) {
          if (shotBtnText) shotBtnText.textContent = 'Failed!';
          showToast(response.error || 'Could not capture this page.', 'error');
        } else if (response.computer) {
          if (shotBtnText) shotBtnText.textContent = 'Saved ✓';
        } else if (response.queued) {
          if (shotBtnText) shotBtnText.textContent = 'Queued ✓';
        } else {
          if (shotBtnText) shotBtnText.textContent = 'Done ✓';
        }

        setTimeout(() => { if (shotBtnText) shotBtnText.textContent = origText; }, 2000);
      });
    });
  }
}
