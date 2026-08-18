import { getMediaById, deleteLocalMedia } from '../storage/storage.js';
import { uploadToServer } from '../background/upload.js';
import { notify } from '../background/notify.js';
import { getConfig } from '../popup/state.js';
import { readOPFSFile, deleteOPFSFile } from '../storage/opfsStorage.js';
import { AntCapturePlayer } from '../shared/player/AntCapturePlayer.js';

const urlParams = new URLSearchParams(window.location.search);
const rawId  = urlParams.get('id');
const opfsParam = urlParams.get('opfs'); // set when IndexedDB save failed but OPFS file exists
const itemId = rawId && rawId.startsWith('fallback_') ? rawId : (parseInt(rawId, 10) || null);

const mediaContainer = document.getElementById('mediaContainer');
const fileNameInput = document.getElementById('fileNameInput');
let currentItem = null;
let activePlayer = null;    // AntCapturePlayer instance — destroyed on each new load
let pendingSaveMode = null; // Stores 'cloud' or 'drive-only' if auth is pending
let isSaved = false;
let autoSaveTimer = null;
let autoSaveCountdown = 5;

// Listen for successful login from background.js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.user) {
    const newUser = changes.user.newValue;
    updateAuthPanel(newUser);
    // If sign-in just completed and we have a pending save — execute it now
    if (newUser && newUser.jwt) {
      if (pendingSaveMode) {
        processSave(pendingSaveMode);
        pendingSaveMode = null;
      }
    }
  }
});

/**
 * Show/hide and populate the inline auth panel in the sidebar.
 * Calling with no user (or a localhost mock) shows the signed-out state.
 * @param {object|null} user  – the stored user object (or null)
 * @param {string} [hintText] – optional message to show when signed out
 */
function updateAuthPanel(user, hintText) {
  const panel          = document.getElementById('authPanel');
  const signInSection  = document.getElementById('authSignInSection');
  const signedInSection= document.getElementById('authSignedInSection');
  const emailText      = document.getElementById('userEmailText');
  const profilePic     = document.getElementById('userProfilePic');
  const hintEl         = document.getElementById('authSignInHintText');

  if (!panel) return;

  const isRealUser = user && user.jwt && user.email && !user.email.includes('localhost');

  if (isRealUser) {
    // ── Signed-in state ────────────────────────────────────────────
    panel.classList.add('visible');
    signInSection.style.display  = 'none';
    signedInSection.style.display = 'flex';
    emailText.textContent  = user.email;
    profilePic.src         = user.picture || '';
  } else if (hintText) {
    // ── Needs sign-in (triggered by a save attempt) ────────────────
    panel.classList.add('visible');
    signInSection.style.display   = 'flex';
    signedInSection.style.display = 'none';
    if (hintEl) hintEl.textContent = hintText;
  } else {
    // ── No session & no prompt needed — keep panel hidden ──────────
    panel.classList.remove('visible');
    signInSection.style.display   = 'none';
    signedInSection.style.display = 'none';
  }
}

// ── Custom Toast for Edit Page (won't break flex layout) ───────────────────
let editToastTimer = null;
function showToast(msg, type = 'success', durationMs = 2500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  if (editToastTimer) clearTimeout(editToastTimer);
  container.innerHTML = ''; // clear previous toasts to prevent stacking spam

  const toast = document.createElement('div');
  const isErr = type === 'error';
  toast.style.cssText = `
    background: ${isErr ? 'rgba(239,68,68,0.9)' : 'rgba(16,185,129,0.9)'};
    color: white; padding: 10px 16px; border-radius: 8px;
    font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5); backdrop-filter: blur(4px);
    transition: opacity 0.3s ease;
  `;
  toast.innerHTML = `<span class="material-symbols-rounded" style="font-size:16px;">${isErr ? 'error' : 'check_circle'}</span> ${msg}`;
  
  container.appendChild(toast);
  
  editToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

let successCloseTimer = null;
let successCountdown = 3;

async function showSuccessAndClose(message) {
  const overlay = document.getElementById('successOverlay');
  const overlayText = document.getElementById('successOverlayText');
  const subText = document.getElementById('successOverlaySubtext');
  const cancelBtn = document.getElementById('successCancelBtn');
  
  if (overlay && overlayText) {
    overlayText.textContent = message;
    overlay.style.display = 'flex';
    document.body.style.pointerEvents = 'none'; // Prevent other clicks
    
    // Enable clicks just for the cancel button
    if (cancelBtn) {
      cancelBtn.style.pointerEvents = 'auto';
      cancelBtn.onclick = () => {
        clearInterval(successCloseTimer);
        subText.textContent = 'Tab kept open.';
        cancelBtn.style.display = 'none';
        
        // Hide the success overlay after a moment so they can view the file
        setTimeout(() => {
          overlay.style.display = 'none';
          document.body.style.pointerEvents = 'auto';
        }, 1500);
      };
    }

    successCountdown = 3;
    if (subText) subText.textContent = `Closing window in ${successCountdown}s...`;

    await new Promise(resolve => {
      successCloseTimer = setInterval(() => {
        successCountdown--;
        if (subText) subText.textContent = `Closing window in ${successCountdown}s...`;
        if (successCountdown <= 0) {
          clearInterval(successCloseTimer);
          resolve();
        }
      }, 1000);
    });
    
    // Only close if the countdown wasn't cancelled
    if (successCountdown <= 0) {
      window.close();
    }
  } else {
    window.close();
  }
}

// Memory Leak fix: when we delete a fallback item, we MUST revoke its object URL
// in the offscreen document where it was created, otherwise it stays in RAM forever.
async function cleanupFallback(id, url) {
  try { chrome.storage.local.remove(id); } catch (_) {}
  if (url) {
    try { chrome.runtime.sendMessage({ action: 'REVOKE_FALLBACK_BLOB', url }); } catch (_) {}
  }
}

async function init() {
  const errorParam = urlParams.get('error');
  if (errorParam) {
    // Auto-clean any partially-saved item from the error URL so it doesn't accumulate
    const errorItemId = urlParams.get('id');
    if (errorItemId) {
      try {
        if (errorItemId.startsWith('fallback_')) {
          chrome.storage.local.get([errorItemId], (res) => {
            const url = res[errorItemId]?.blobUrl;
            cleanupFallback(errorItemId, url);
          });
        } else {
          const numId = parseInt(errorItemId, 10);
          if (numId) { const { deleteLocalMedia: del } = await import('../storage/storage.js'); del(numId).catch(() => {}); }
        }
      } catch (_) {/* non-fatal */}
    }

    let msg = 'An unknown error occurred while saving.';
    let hint = '';
    if (errorParam === 'empty_blob') {
      msg = 'Recording was too short or captured no frames.';
      hint = 'Try recording for at least 2 seconds before stopping.';
    }
    if (errorParam === 'save_failed') {
      msg = 'Failed to save the recording to local storage.';
      hint = 'Your browser storage may be full. Try clearing old captures from the AntCapture dashboard, then record again.';
    }
    if (errorParam === 'routing_failed') {
      msg = 'Failed to open the preview studio after recording.';
      hint = 'Try reloading the extension (chrome://extensions) and recording again.';
    }
    if (errorParam === 'camera_failed') {
      msg = 'Camera recording failed to capture or process.';
      hint = 'Check that your camera is not in use by another app, then try again.';
    }
    if (errorParam === 'storage_full') {
      msg = 'Browser storage is full — recording could not be saved.';
      hint = 'Delete old captures from your AntCapture dashboard to free space, then try again.';
    }

    mediaContainer.innerHTML = `<div style="color:#f87171; padding:28px; font-size:15px; display:flex; flex-direction:column; gap:14px; align-items:center; max-width:480px; margin:0 auto;">
      <span class="material-symbols-rounded" style="font-size:52px;">error</span>
      <div style="font-weight:700; font-size:17px;">Capture Failed</div>
      <div style="color:#cbd5e1; text-align:center; line-height:1.6;">${msg}</div>
      ${hint ? `<div style="background:rgba(99,102,241,0.12); border:1px solid rgba(99,102,241,0.3); border-radius:8px; padding:12px 16px; color:#a5b4fc; font-size:13px; text-align:center; line-height:1.5;">
        <span class="material-symbols-rounded" style="font-size:15px; vertical-align:middle; margin-right:4px;">lightbulb</span>${hint}</div>` : ''}
      <button id="errorCloseBtn" style="margin-top:8px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; padding:10px 24px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">Close Window</button>
    </div>`;
    
    // Add event listener here instead of inline onclick to satisfy extension CSP
    document.getElementById('errorCloseBtn')?.addEventListener('click', () => window.close());
    return;
  }

  if (!itemId && !opfsParam) {
    mediaContainer.innerHTML = '<div style="color:#f87171; padding:20px;">Error: No item ID provided in URL.</div>';
    return;
  }

  const isFallback = typeof itemId === 'string' && itemId.startsWith('fallback_');

  try {
    if (opfsParam) {
      // ── OPFS-direct path: IndexedDB save failed but OPFS file is intact ──
      // This is the "safety net" path. The video is on disk but not in IndexedDB.
      const file = await readOPFSFile(opfsParam);
      if (!file) throw new Error('OPFS file not found: ' + opfsParam);
      // Restore codec info from URL param (set by offscreen.js fallback path)
      const rawMime = urlParams.get('mimeType') || file.type || 'video/webm;codecs=vp8,opus';
      currentItem = {
        id:          null, // no IndexedDB record
        opfsFileName: opfsParam,
        blob:        new Blob([file], { type: rawMime }), // re-wrap to restore codec info
        type:        urlParams.get('type') || 'video',
        resolution:  parseInt(urlParams.get('resolution'), 10) || 1080,
        format:      urlParams.get('format') || 'webm',
        hasAudio:    urlParams.get('hasAudio') !== 'false',
        tabTitle:    urlParams.get('tabTitle') || '',
        mimeType:    rawMime
      };
    } else if (isFallback) {
      const data = await chrome.storage.local.get([itemId]);
      if (data[itemId]) {
        const res = await fetch(data[itemId].blobUrl);
        const fetchedBlob = await res.blob();
        currentItem = {
          id:           itemId,
          blob:         fetchedBlob,
          blobUrl:      data[itemId].blobUrl,
          type:         data[itemId].type,
          resolution:   data[itemId].resolution,
          format:       data[itemId].format,
          hasAudio:     data[itemId].hasAudio,
          tabTitle:     data[itemId].tabTitle,
          mimeType:     data[itemId].mimeType
        };
      }
    } else {
      // Normal IndexedDB path
      const dbItem = await getMediaById(itemId);
      if (dbItem && dbItem.opfsFileName && !dbItem.blob) {
        // New OPFS-backed recording: load the File from disk
        const file = await readOPFSFile(dbItem.opfsFileName);
        if (!file) throw new Error('OPFS file not found: ' + dbItem.opfsFileName);
        // The OPFS File.type is derived from the file extension ('video/webm') and
        // loses codec information. Re-wrap with the stored full mimeType so Chrome
        // knows the exact codec and can decode without guessing.
        const resolvedMime = dbItem.mimeType || file.type || 'video/webm;codecs=vp8,opus';
        currentItem = {
          ...dbItem,
          blob: new Blob([file], { type: resolvedMime })
        };
      } else {
        currentItem = dbItem;
      }
    }
  } catch (err) {
    console.error('Failed to get media:', err);
    mediaContainer.innerHTML = `<div style="color:#f87171; padding:20px;">Database Error: ${err.message}</div>`;
    return;
  }

  if (!currentItem || !currentItem.blob) {
    mediaContainer.innerHTML = '<div style="color:#f87171; padding:20px;">Error: Capture not found or already deleted from local storage.</div>';
    return;
  }

  // ── Smart File Naming ──────────────────────────────────────────────────────
  // tabTitle is now stored directly inside the IndexedDB record at capture time.
  // This is reliable for both videos and screenshots — no race conditions,
  // no URL params, no chrome.storage.local timing issues.
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(':', '-').replace(' ', '');
  const resTag  = currentItem.resolution ? `${currentItem.resolution}p` : '';
  const rawFmt  = (currentItem.format || currentItem.blob.type.split('/')[1] || 'webm').split(';')[0].toUpperCase();
  const fmtTag  = currentItem.type === 'video' ? rawFmt : 'PNG';

  // ── Audio: use ONLY the stored flag — authoritative, set from actual stream ──
  // hasAudio is written by offscreen.js / cameraRecorder.js at recording stop time.
  // Treat undefined (old recordings) as 'unknown' rather than defaulting to true.
  const hasAudio = currentItem.hasAudio === true;
  const hasAudioUnknown = currentItem.hasAudio === undefined || currentItem.hasAudio === null;

  /**
   * Cleans a raw browser tab title into a safe, readable filename segment.
   * Strips browser name suffixes (" - Google Chrome"), unread counts ("(3) Inbox"),
   * emoji, and other noise. Returns empty string if nothing useful remains.
   */
  function cleanTabTitle(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .replace(/\s[\-–|]\s*(Google Chrome|Chromium|Firefox|Edge|Safari|Brave|Opera)\s*$/i, '') // browser suffix
      .replace(/^\(\d+\)\s+/, '')          // unread count prefix e.g. "(3) Inbox"
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // strip emoji blocks
      .replace(/[<>:"\/\\|?*\x00-\x1f]/g, '') // strip filesystem-unsafe chars
      .trim()
      .slice(0, 60); // cap at 60 chars — keeps filenames reasonable
  }

  /**
   * Build the full smart filename.
   * Format: "<Type> – <Tab Title> – <Date> – <Time> [– <Res>]"
   * e.g.  "Screen Recording – YouTube – Aug 4, 2026 – 05-30PM – 1080p"
   *       "Screenshot – GitHub – Aug 4, 2026 – 05-31PM"
   */
  function buildSmartName(rawTitle) {
    const titlePart = cleanTabTitle(rawTitle);
    const typeLabel = currentItem.type === 'video' ? 'Screen Recording' : 'Screenshot';
    const parts = [typeLabel];
    if (titlePart) parts.push(titlePart);
    parts.push(dateStr, timeStr);
    if (resTag) parts.push(resTag);
    return parts.join(' \u2013 '); // en-dash separator — professional look, filesystem-safe
  }

  // Read from IndexedDB record — single reliable source for both videos & images
  const rawTabTitle = currentItem.tabTitle || '';
  if (fileNameInput) fileNameInput.value = buildSmartName(rawTabTitle);

  // Show the "From: <tab>" source line if we have a title
  if (rawTabTitle) {
    const tabLine = document.getElementById('tabSourceLine');
    const tabText = document.getElementById('tabSourceText');
    if (tabLine && tabText) {
      tabText.textContent = `From: ${cleanTabTitle(rawTabTitle) || rawTabTitle}`;
      tabLine.style.display = 'flex';
    }
  }



  // ── Info Panel ─────────────────────────────────────────────────────────────
  const sizeMB = (currentItem.blob.size / (1024 * 1024)).toFixed(2);
  const resText = currentItem.resolution ? `${currentItem.resolution}p` : 'Native';
  const fmtText = fmtTag;

  // hasAudio / hasAudioUnknown are set above in the naming block.
  // Do NOT use blob MIME type as fallback — it is unreliable for audio detection.
  const audioText = currentItem.type === 'video'
    ? (hasAudioUnknown ? '❓ Unknown (old recording)' : hasAudio ? '🔊 Audio Included' : '🔇 No Audio (Silent)')
    : 'N/A';

  document.getElementById('infoFormat').textContent = fmtText;
  document.getElementById('infoResolution').textContent = resText;
  document.getElementById('infoAudio').textContent = audioText;
  document.getElementById('infoSize').textContent = `${sizeMB} MB`;
  document.getElementById('mediaInfoPanel').style.display = 'flex';

  // ── Media Preview ─────────────────────────────────────────────────────────
  // AntCapturePlayer owns all video/image rendering, state, controls, and
  // keyboard shortcuts. No browser native controls are shown.
  if (activePlayer) { activePlayer.destroy(); activePlayer = null; }

  activePlayer = new AntCapturePlayer(mediaContainer, currentItem.blob, {
    type:     currentItem.type === 'video' ? 'video' : 'image',
    hasAudio: hasAudio,
    loop:     true,
    autoplay: true,
    mimeType: currentItem.mimeType || currentItem.blob?.type || '',
    format:   currentItem.format   || '',
  });

  // Check initial connection status & render auth panel accordingly
  chrome.storage.local.get(['user', 'autoSavePref'], (res) => {
    updateAuthPanel(res.user);

    // Setup auto-save toggles
    const toggles = document.querySelectorAll('.auto-save-toggle');
    const currentPref = res.autoSavePref || 'none';
    
    toggles.forEach(toggle => {
      if (toggle.dataset.mode === currentPref) {
        toggle.classList.add('active');
        toggle.title = "Current Auto-Save Default (Click to disable)";
      }
      
      toggle.addEventListener('click', () => {
        const mode = toggle.dataset.mode;
        if (toggle.classList.contains('active')) {
          // Disable auto-save
          chrome.storage.local.set({ autoSavePref: 'none' });
          toggle.classList.remove('active');
          toggle.title = "Set as Auto-Save Default";
          showToast("Auto-save disabled");
          if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
            const badge = document.getElementById('autoSaveBadge');
            if (badge) badge.remove();
          }
        } else {
          // Enable for this mode
          chrome.storage.local.set({ autoSavePref: mode });
          toggles.forEach(t => {
            t.classList.remove('active');
            t.title = "Set as Auto-Save Default";
          });
          toggle.classList.add('active');
          toggle.title = "Current Auto-Save Default (Click to disable)";
          showToast(`Auto-save enabled!`);
          // Immediately start countdown for THIS session too
          startAutoSaveCountdown(mode);
        }
      });
    });

    // Auto-Save Execution Logic
    if (res.autoSavePref && res.autoSavePref !== 'none') {
      startAutoSaveCountdown(res.autoSavePref);
    }
  });
}

let activeCountdownToast = null;

function startAutoSaveCountdown(mode) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  // Clear any existing countdown if user switches modes quickly
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    if (activeCountdownToast) {
      activeCountdownToast.remove();
      activeCountdownToast = null;
    }
  }
  
  autoSaveCountdown = 5; // Reset to 5 seconds
  
  const toast = document.createElement('div');
  activeCountdownToast = toast;
  toast.style.cssText = 'background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.4); padding:12px 16px; border-radius:8px; color:white; font-size:13px; font-weight:600; display:flex; align-items:center; gap:12px; pointer-events:auto; box-shadow:0 10px 25px rgba(0,0,0,0.5); backdrop-filter:blur(4px);';
  
  const msgSpan = document.createElement('span');
  msgSpan.textContent = `Auto-saving in ${autoSaveCountdown}s...`;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:white; padding:4px 10px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:600;';
  
  cancelBtn.onclick = () => {
    clearInterval(autoSaveTimer);
    toast.remove();
    activeCountdownToast = null;
    // Turn off the active lightning bolt UI
    document.querySelectorAll('.auto-save-toggle').forEach(t => t.classList.remove('active'));
    chrome.storage.local.set({ autoSavePref: 'none' });
    showToast("Auto-save cancelled & disabled");
  };
  
  toast.appendChild(msgSpan);
  toast.appendChild(cancelBtn);
  container.appendChild(toast);
  
  autoSaveTimer = setInterval(() => {
    autoSaveCountdown--;
    msgSpan.textContent = `Auto-saving in ${autoSaveCountdown}s...`;
    
    if (autoSaveCountdown <= 0) {
      clearInterval(autoSaveTimer);
      toast.remove();
      activeCountdownToast = null;
      processSave(mode);
    }
  }, 1000);
}

// Warn the user before they accidentally reload or close the tab
window.addEventListener('beforeunload', (e) => {
  if (!isSaved) {
    e.preventDefault();
    e.returnValue = 'You have an unsaved recording. If you leave, it will be permanently deleted.';
  }
});

// Discard media ONLY when the tab is actually closed or navigating away.
window.addEventListener('pagehide', () => {
  if (!isSaved) {
    if (opfsParam && !itemId) {
      try { deleteOPFSFile(opfsParam); } catch (_) {}
    } else if (itemId) {
      if (typeof itemId === 'string' && itemId.startsWith('fallback_')) {
        try {
          chrome.storage.local.remove(itemId);
          if (currentItem?.blobUrl) chrome.runtime.sendMessage({ action: 'REVOKE_FALLBACK_BLOB', url: currentItem.blobUrl });
        } catch (_) {}
      } else {
        try { chrome.runtime.sendMessage({ action: 'DISCARD_TAB_CLOSED', id: itemId }); } catch (_) {}
      }
    }
  }
});

/**
 * Unified cleanup — deletes the video from whichever storage it lives in.
 * Awaited before window.close() so no dangling files remain on disk.
 */
async function deleteCurrentItem() {
  if (opfsParam && !itemId) {
    await deleteOPFSFile(opfsParam);
  } else if (typeof itemId === 'string' && itemId.startsWith('fallback_')) {
    await cleanupFallback(itemId, currentItem ? currentItem.blobUrl : null);
  } else if (itemId) {
    if (currentItem?.opfsFileName) await deleteOPFSFile(currentItem.opfsFileName);
    await deleteLocalMedia(itemId);
  }
}

async function processSave(mode) {
  if (!currentItem) return;
  const { blob, type, resolution, format, hasAudio } = currentItem;
  const label = type === 'image' ? 'Screenshot' : 'Recording';
  const customName = fileNameInput ? (fileNameInput.value.trim() || `AntCapture_${Date.now()}`) : `AntCapture_${Date.now()}`;

  try {
    if (mode === 'computer') {
      // OPFS recordings have no blob in IndexedDB — must download directly from the File object
      const needsDirect = opfsParam || (typeof itemId === 'string' && itemId.startsWith('fallback_')) || currentItem?.opfsFileName;
      if (needsDirect) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = customName + '.' + (format || 'webm');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        isSaved = true;
        await deleteCurrentItem();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL(`download.html?id=${itemId}&autoDelete=true&filename=${encodeURIComponent(customName)}`) });
        isSaved = true;
      }
      notify('capture-computer', `${label} ready`, 'Choose a save location in the download dialog.');
      await showSuccessAndClose('Download Started!');
      return;
    }

    if (mode === 'localhost') {
      document.body.style.pointerEvents = 'none';
      await uploadToServer(blob, type, 'localhost', 'local-mode', resolution, format, customName, hasAudio);
      chrome.storage.local.get(['captureCount'], (r) =>
        chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
      );
      notify('capture-local', `${label} saved`, 'Stored in your self-hosted library.');
      isSaved = true;
      await deleteCurrentItem();
      await showSuccessAndClose('Saved to Self-Hosted!');
      return;
    }

    if (mode === 'cloud' || mode === 'drive-only') {
      const { user } = await chrome.storage.local.get(['user']);
      if (user && user.jwt && navigator.onLine) {
        document.body.style.pointerEvents = 'none';
        await uploadToServer(blob, type, mode, user.jwt, resolution, format, customName, hasAudio);
        chrome.storage.local.get(['captureCount'], (r) =>
          chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
        );
        const msgTitle = mode === 'cloud' ? `${label} synced` : `${label} saved to Drive`;
        const msgText  = mode === 'cloud' ? 'Saved to AntCapture web app and Google Drive.' : 'Uploaded directly to Google Drive.';
        notify(mode === 'cloud' ? 'capture-cloud' : 'capture-drive', msgTitle, msgText);
        isSaved = true;
        await deleteCurrentItem();
        await showSuccessAndClose(mode === 'cloud' ? 'Saved to Cloud & Drive!' : 'Uploaded to Google Drive!');
      } else {
        if (!user || !user.jwt) {
          pendingSaveMode = mode;
          updateAuthPanel(null, `Sign in with Google to save to ${mode === 'cloud' ? 'AntCapture Web & Drive' : 'Google Drive'}.`);
          return;
        }
        if (!navigator.onLine) { showToast('No internet connection. Please check your network.', 'error'); return; }
      }
    }
  } catch (err) {
    console.error(err);
    document.body.style.pointerEvents = 'auto';
    showToast(err.message, 'error', 6000);
  }
}

document.getElementById('btnComputer')?.addEventListener('click', () => processSave('computer'));
document.getElementById('btnCloud')?.addEventListener('click', () => processSave('cloud'));
document.getElementById('btnDrive')?.addEventListener('click', () => processSave('drive-only'));
document.getElementById('btnLocal')?.addEventListener('click', () => processSave('localhost'));

// ── Discard Modal (custom UI instead of window.confirm) ────────────────────
function showDiscardModal() {
  const modal = document.getElementById('discardModal');
  if (modal) modal.style.display = 'flex';
}

function hideDiscardModal() {
  const modal = document.getElementById('discardModal');
  if (modal) modal.style.display = 'none';
}

document.getElementById('btnDiscard')?.addEventListener('click', () => showDiscardModal());

document.getElementById('discardCancelBtn')?.addEventListener('click', () => hideDiscardModal());

document.getElementById('discardConfirmBtn')?.addEventListener('click', async () => {
  hideDiscardModal();
  isSaved = true;
  await deleteCurrentItem();
  window.close();
});

// ── Inline auth panel button handlers ─────────────────────────────────────
document.getElementById('btnGoogleSignIn')?.addEventListener('click', async () => {
  const { serverUrl } = await getConfig();
  const authUrl = `${serverUrl}/auth/google?source=extension`;
  chrome.tabs.create({ url: authUrl });
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
  chrome.storage.local.remove('user', () => {
    pendingSaveMode = null;
    updateAuthPanel(null);
    showToast("Signed out successfully.", "success");
  });
});

// Run directly
init();
