// ── Configuration ─────────────────────────────────────────────────────────────
const PROD_BACKEND_URL = 'https://api.antcapture.anttake.com';
const PROD_WEB_UI_URL  = 'https://antcapture.anttake.com';
const DEV_BACKEND_URL  = 'http://localhost:3001';
const DEV_WEB_UI_URL   = 'http://localhost:3000';

async function getConfig() {
  const { devMode } = await chrome.storage.local.get(['devMode']);
  return {
    backendUrl: devMode ? DEV_BACKEND_URL : PROD_BACKEND_URL,
    webUiUrl:   devMode ? DEV_WEB_UI_URL  : PROD_WEB_UI_URL,
  };
}
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
      void chrome.runtime.lastError; // consume to prevent unchecked-error warning
      screenshotBtn.disabled = false;
      if (!response?.success) {
        const errMsg = response?.error || 'Could not capture this page.';
        screenshotBtn.querySelector(".btn-text").textContent = "Failed!";
        screenshotBtn.title = errMsg;
      } else if (response.queued) {
        screenshotBtn.querySelector(".btn-text").textContent = "Saved locally!";
      } else {
        screenshotBtn.querySelector(".btn-text").textContent = "Saved!";
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

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const storageInfo = document.getElementById('storageInfo');

  async function fetchStats(user) {
    try {
      const { backendUrl } = await getConfig();
      const res = await fetch(`${backendUrl}/stats`, {
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
      if (statusText) statusText.textContent = 'Please sign in to sync with Web Dashboard';
      if (storageInfo) storageInfo.textContent = 'Local DB Only';
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

  googleLoginBtn.addEventListener('click', async () => {
    const { backendUrl } = await getConfig();
    chrome.windows.create({
      url: `${backendUrl}/auth/google?source=extension`,
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
    openDashboardBtn.addEventListener('click', async () => {
      const { webUiUrl } = await getConfig();
      chrome.storage.local.get(['user'], (result) => {
        const targetUrl = result.user?.jwt
          ? `${webUiUrl}?auth_data=${result.user.jwt}`
          : webUiUrl;

        chrome.tabs.query({ url: `${webUiUrl}/*` }, (tabs) => {
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

  settingsBtn.addEventListener('click', async () => {
    const { webUiUrl } = await getConfig();
    chrome.storage.local.get(['user'], (result) => {
      const settingsUrl = result.user?.jwt
        ? `${webUiUrl}?nav=Settings&auth_data=${result.user.jwt}`
        : `${webUiUrl}?nav=Settings`;

      // Focus existing Dashboard tab if open, otherwise open new one
      chrome.tabs.query({ url: `${webUiUrl}/*` }, (tabs) => {
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