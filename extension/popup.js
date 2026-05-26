// ── Configuration ─────────────────────────────────────────────────────────────
// Change this to your deployed domain when going to production.
const WEB_UI_URL = 'http://localhost:5173';
// ──────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordBtn');
  const screenshotBtn = document.getElementById('screenshotBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const captureCountBadge = document.getElementById('captureCountBadge');
  const recordBtnText = recordBtn.querySelector('.btn-text');
  const recordBtnIcon = recordBtn.querySelector('.btn-icon');

  // Helper to update record button appearance based on recording state
  function updateRecordButton(isRecording) {
    if (recordBtnText) recordBtnText.textContent = isRecording ? "Stop Recording" : "Record Screen";
    if (recordBtnIcon) recordBtnIcon.textContent = isRecording ? "⏹" : "⏺";
    recordBtn.classList.toggle("recording", isRecording);
  }

  // Load capture count and recording state from local storage
  chrome.storage.local.get(['captureCount', 'isRecording'], (result) => {
    if (captureCountBadge) captureCountBadge.textContent = `Captures: ${result.captureCount || 0}`;
    updateRecordButton(result.isRecording || false);
  });

  // Listen for storage changes to update UI automatically
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "local") return;

    if (changes.captureCount && captureCountBadge) {
      captureCountBadge.textContent = `Captures: ${changes.captureCount.newValue}`;
    }

    if (changes.isRecording !== undefined) {
      updateRecordButton(changes.isRecording.newValue);
    }
  });

  recordBtn.addEventListener('click', () => {
    recordBtn.disabled = true;

    chrome.storage.local.get(['isRecording'], (result) => {
      const currentlyRecording = result.isRecording || false;
      const action = currentlyRecording ? 'STOP_RECORDING' : 'START_RECORDING';

      chrome.runtime.sendMessage({ action }, (response) => {
        recordBtn.disabled = false;
        
        if (chrome.runtime.lastError) {
          console.error("Message failed:", chrome.runtime.lastError.message);
          return;
        }

        if (!response?.success) {
          console.error("Recording action failed:", response?.error);
          if (recordBtnText) recordBtnText.textContent = "Error — try again";
          setTimeout(() => updateRecordButton(currentlyRecording), 2000);
        }
      });
    });
  });

  screenshotBtn.addEventListener('click', () => {
    screenshotBtn.disabled = true;
    const originalText = screenshotBtn.querySelector(".btn-text").textContent;

    chrome.runtime.sendMessage({ action: 'TAKE_SCREENSHOT' }, (response) => {
      screenshotBtn.disabled = false;
      if (chrome.runtime.lastError || !response?.success) {
        const errMsg = response?.error || chrome.runtime.lastError?.message || 'Unknown error';
        screenshotBtn.querySelector(".btn-text").textContent = "Failed!";
        screenshotBtn.title = errMsg;
      } else if (response.queued) {
        if (response.warning) {
          screenshotBtn.querySelector(".btn-text").textContent = "Drive Error!";
          screenshotBtn.title = response.warning;
          // Show alert so user doesn't miss the Google Drive API error
          alert("Could not save to Drive. Saved locally instead.\n\nError: " + response.warning);
        } else {
          screenshotBtn.querySelector(".btn-text").textContent = "Saved locally!";
        }
      } else {
        screenshotBtn.querySelector(".btn-text").textContent = "Saved to cloud!";
      }
      setTimeout(() => {
        screenshotBtn.querySelector(".btn-text").textContent = originalText;
        screenshotBtn.title = "";
      }, 2000);
    });
  });

  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const profileContainer = document.getElementById('profileContainer');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  const BACKEND_URL = 'http://localhost:3001';

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const storageInfo = document.getElementById('storageInfo');

  async function fetchStats(user) {
    try {
      const res = await fetch(`${BACKEND_URL}/stats`, {
        headers: { Authorization: `Bearer ${user.jwt}` }
      });
      if (res.ok) {
        const data = await res.json();
        // e.g. Local: 2MB | Drive: 1GB
        if (storageInfo) storageInfo.textContent = `Local: ${data.dbSizeFormatted} | Drive: ${data.appDriveFormatted}`;
      }
    } catch (e) {
      console.error('Failed to fetch stats for popup', e);
    }
  }

  function updateAuthUI(user) {
    if (user) {
      googleLoginBtn.style.display = 'none';
      profileContainer.style.display = 'flex';
      userName.textContent = user.name || 'User';
      userEmail.textContent = user.email || '';
      userAvatar.src = user.picture || '';
      
      if (statusDot) statusDot.style.background = '#10b981'; // Green
      if (statusText) statusText.textContent = 'Cloud Sync Active';
      
      fetchStats(user);
    } else {
      googleLoginBtn.style.display = 'flex';
      profileContainer.style.display = 'none';
      
      if (statusDot) statusDot.style.background = '#64748b'; // Gray/Offline
      if (statusText) statusText.textContent = 'Offline (Pending Sync)';
      if (storageInfo) storageInfo.textContent = 'Local Sync Only';
    }
  }

  // Load user data on startup
  chrome.runtime.sendMessage({ action: 'GET_USER' }, (response) => {
    updateAuthUI(response?.user || null);
  });

  // Listen for storage changes to sync UI
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.user) {
      updateAuthUI(changes.user.newValue);
    }
  });

  googleLoginBtn.addEventListener('click', () => {
    chrome.windows.create({
      url: `${BACKEND_URL}/auth/google?source=extension`,
      type: 'popup',
      width: 500,
      height: 600
    });
  });

  logoutBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'LOGOUT' }, (response) => {
      if (response?.success) {
        updateAuthUI(null);
      }
    });
  });

  // Open Dashboard — smart: focus existing tab or open new one
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.storage.local.get(['user'], (result) => {
        const targetUrl = result.user?.jwt
          ? `${WEB_UI_URL}?auth_data=${result.user.jwt}`
          : WEB_UI_URL;

        chrome.tabs.query({ url: `${WEB_UI_URL}/*` }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true, url: targetUrl });
            chrome.windows.update(tabs[0].windowId, { focused: true });
          } else {
            chrome.tabs.create({ url: targetUrl });
          }
          window.close();
        });
      });
    });
  }

  settingsBtn.addEventListener('click', () => {
    chrome.storage.local.get(['user'], (result) => {
      const settingsUrl = result.user?.jwt
        ? `${WEB_UI_URL}?nav=Settings&auth_data=${result.user.jwt}`
        : `${WEB_UI_URL}?nav=Settings`;

      // Focus existing Dashboard tab if open, otherwise open new one
      chrome.tabs.query({ url: `${WEB_UI_URL}/*` }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true, url: settingsUrl });
          chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
          chrome.tabs.create({ url: settingsUrl });
        }
        window.close();
      });
    });
  });
});