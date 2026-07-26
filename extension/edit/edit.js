import { getMediaById, deleteLocalMedia } from '../storage/storage.js';
import { uploadToServer } from '../background/upload.js';
import { notify } from '../background/notify.js';
import { getConfig } from '../popup/state.js';
import { showToast } from '../popup/toast.js';

const urlParams = new URLSearchParams(window.location.search);
const itemId = parseInt(urlParams.get('id'), 10) || null;

const mediaContainer = document.getElementById('mediaContainer');
const fileNameInput = document.getElementById('fileNameInput');
let currentItem = null;
let pendingSaveMode = null; // Stores 'cloud' or 'drive-only' if auth is pending

// Listen for successful login from background.js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.user) {
    const newUser = changes.user.newValue;
    updateConnectionStatus(newUser);
    if (newUser && newUser.jwt) {
      document.getElementById('loginModal').style.display = 'none';
      if (pendingSaveMode) {
        processSave(pendingSaveMode);
        pendingSaveMode = null;
      }
    }
  }
});

function updateConnectionStatus(user) {
  const statusDiv = document.getElementById('connectionStatus');
  const emailText = document.getElementById('userEmailText');
  const profilePic  = document.getElementById('userProfilePic');
  if (statusDiv && emailText && profilePic) {
    if (user && user.jwt) {
      statusDiv.style.display = 'flex';
      emailText.textContent = user.email || 'Connected';
      profilePic.src = user.picture || '';
    } else {
      statusDiv.style.display = 'none';
    }
  }
}

async function showSuccessAndClose(message) {
  const overlay = document.getElementById('successOverlay');
  const overlayText = document.getElementById('successOverlayText');
  if (overlay && overlayText) {
    overlayText.textContent = message;
    overlay.style.display = 'flex';
    document.body.style.opacity = '1';
    await new Promise(r => setTimeout(r, 1800));
  }
  window.close();
}

async function init() {
  const errorParam = urlParams.get('error');
  if (errorParam) {
    let msg = 'An unknown error occurred while saving.';
    if (errorParam === 'empty_blob') msg = 'Recording was too short or failed to capture any frames. No video was saved.';
    if (errorParam === 'save_failed') msg = 'Failed to process and save the recording data. (Storage may be full or format unsupported).';
    if (errorParam === 'routing_failed') msg = 'Failed to route the video to the preview studio. (Storage issue).';
    if (errorParam === 'camera_failed') msg = 'Camera recording failed to capture or process.';
    if (errorParam === 'storage_full') msg = 'Failed to save to local IndexedDB. Your browser storage might be full.';
    
    mediaContainer.innerHTML = `<div style="color:#f87171; padding:20px; font-size:15px; display:flex; flex-direction:column; gap:12px; align-items:center;">
      <span class="material-symbols-rounded" style="font-size:48px;">error</span>
      <div style="font-weight:600;">Capture Failed</div>
      <div style="color:#cbd5e1; text-align:center;">${msg}</div>
    </div>`;
    return;
  }

  if (!itemId) {
    mediaContainer.innerHTML = '<div style="color:#f87171; padding:20px;">Error: No item ID provided in URL.</div>';
    return;
  }

  try {
    currentItem = await getMediaById(itemId);
  } catch (err) {
    console.error('Failed to get media from IndexedDB:', err);
    mediaContainer.innerHTML = `<div style="color:#f87171; padding:20px;">Database Error: ${err.message}</div>`;
    return;
  }

  if (!currentItem || !currentItem.blob) {
    mediaContainer.innerHTML = '<div style="color:#f87171; padding:20px;">Error: Capture not found or already deleted from local storage.</div>';
    return;
  }

  // Pre-fill a default filename based on capture type
  const prefix = currentItem.type === 'video' ? 'Recording' : 'Screenshot';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  if (fileNameInput) {
    fileNameInput.value = `${prefix}_${timestamp}`;
  }

  // Populate info panel
  const sizeMB = (currentItem.blob.size / (1024 * 1024)).toFixed(2);
  let audioText = 'None';
  let resText = currentItem.resolution ? `${currentItem.resolution}p` : 'Native';
  let fmtText = (currentItem.format || currentItem.blob.type.split('/')[1] || '').split(';')[0].toUpperCase();

  if (currentItem.type === 'video') {
    if (currentItem.blob.type.includes('opus') || currentItem.blob.type.includes('mp4a') || currentItem.blob.type.includes('audio')) {
      audioText = 'Included (System/Mic)';
    } else {
      audioText = 'No Audio';
    }
  } else {
    audioText = 'N/A';
    fmtText = 'PNG';
  }

  document.getElementById('infoFormat').textContent = fmtText;
  document.getElementById('infoResolution').textContent = resText;
  document.getElementById('infoAudio').textContent = audioText;
  document.getElementById('infoSize').textContent = `${sizeMB} MB`;
  document.getElementById('mediaInfoPanel').style.display = 'flex';

  const url = URL.createObjectURL(currentItem.blob);

  // Use createElement — setting blob: URLs via innerHTML can be blocked by extension CSP.
  mediaContainer.innerHTML = '';
  if (currentItem.type === 'video') {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.style.maxWidth = '100%';
    video.style.maxHeight = '100%';
    video.style.borderRadius = '8px';
    video.src = url;
    mediaContainer.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.alt = 'Screenshot';
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.borderRadius = '8px';
    img.src = url;
    mediaContainer.appendChild(img);
  }

  // Check initial connection status
  chrome.storage.local.get(['user'], (res) => {
    updateConnectionStatus(res.user);
  });
}

async function processSave(mode) {
  if (!currentItem) return;
  const { blob, type, resolution, format } = currentItem;
  const label = type === 'image' ? 'Screenshot' : 'Recording';
  
  const customName = fileNameInput ? (fileNameInput.value.trim() || `AntCapture_${Date.now()}`) : `AntCapture_${Date.now()}`;

  try {
    if (mode === 'computer') {
      const downloadUrl = chrome.runtime.getURL(`download.html?id=${itemId}&autoDelete=true&filename=${encodeURIComponent(customName)}`);
      chrome.tabs.create({ url: downloadUrl });
      notify('capture-computer', `${label} ready`, 'Choose a save location in the download dialog.');
      await showSuccessAndClose('Download Started!');
      return;
    }

    if (mode === 'localhost') {
      document.body.style.opacity = '0.5';
      await uploadToServer(blob, type, 'localhost', 'local-mode', resolution, format, customName);
      chrome.storage.local.get(['captureCount'], (r) =>
        chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
      );
      notify('capture-local', `${label} saved`, 'Stored in your self-hosted library.');
      await deleteLocalMedia(itemId);
      await showSuccessAndClose('Saved to Self-Hosted!');
      return;
    }

    if (mode === 'cloud' || mode === 'drive-only') {
      const { user } = await chrome.storage.local.get(['user']);
      if (user && user.jwt && navigator.onLine) {
        document.body.style.opacity = '0.5';
        await uploadToServer(blob, type, mode, user.jwt, resolution, format, customName);
        
        chrome.storage.local.get(['captureCount'], (r) =>
          chrome.storage.local.set({ captureCount: (r.captureCount || 0) + 1 })
        );

        const msgTitle = mode === 'cloud' ? `${label} synced` : `${label} saved to Drive`;
        const msgText = mode === 'cloud' 
          ? 'Saved to AntCapture web app and Google Drive.' 
          : 'Uploaded directly to Google Drive.';

        notify(mode === 'cloud' ? 'capture-cloud' : 'capture-drive', msgTitle, msgText);
        await deleteLocalMedia(itemId);
        
        const successMessage = mode === 'cloud' ? 'Saved to Cloud & Drive!' : 'Uploaded to Google Drive!';
        await showSuccessAndClose(successMessage);
      } else {
        if (!user || !user.jwt) {
          pendingSaveMode = mode;
          document.getElementById('loginModal').style.display = 'flex';
          return;
        }
        if (!navigator.onLine) {
          showToast("No internet connection. Please check your network.", "error");
          return;
        }
      }
    }
  } catch (err) {
    console.error(err);
    document.body.style.opacity = '1';
    showToast(err.message, "error", 6000);
  }
}

document.getElementById('btnComputer')?.addEventListener('click', () => processSave('computer'));
document.getElementById('btnCloud')?.addEventListener('click', () => processSave('cloud'));
document.getElementById('btnDrive')?.addEventListener('click', () => processSave('drive-only'));
document.getElementById('btnLocal')?.addEventListener('click', () => processSave('localhost'));

document.getElementById('btnDiscard')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to discard this capture?')) {
    await deleteLocalMedia(itemId);
    window.close();
  }
});

document.getElementById('closeLoginModal')?.addEventListener('click', () => {
  document.getElementById('loginModal').style.display = 'none';
  pendingSaveMode = null;
});

document.getElementById('modalGoogleLoginBtn')?.addEventListener('click', async () => {
  const { serverUrl } = await getConfig();
  const authUrl = `${serverUrl}/auth/google?source=extension`;
  chrome.tabs.create({ url: authUrl });
});

document.getElementById('btnLogout')?.addEventListener('click', () => {
  chrome.storage.local.remove('user', () => {
    updateConnectionStatus(null);
    showToast("Signed out successfully.", "success");
  });
});

// Run directly
init();
