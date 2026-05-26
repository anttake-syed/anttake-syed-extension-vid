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

  function updateAuthUI(user) {
    if (user) {
      googleLoginBtn.style.display = 'none';
      profileContainer.style.display = 'flex';
      userName.textContent = user.name || 'User';
      userEmail.textContent = user.email || '';
      userAvatar.src = user.picture || '';
    } else {
      googleLoginBtn.style.display = 'flex';
      profileContainer.style.display = 'none';
    }
  }

  // Load user data on startup
  chrome.runtime.sendMessage({ action: 'GET_USER' }, (response) => {
    if (response?.user) {
      updateAuthUI(response.user);
    }
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

  // Open Dashboard — auto-login to Web UI using stored JWT
  const openDashboardBtn = document.getElementById('openDashboardBtn');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', () => {
      chrome.storage.local.get(['user'], (result) => {
        const WEB_UI_URL = 'http://localhost:5173';
        if (result.user?.jwt) {
          // Pass JWT so Web UI logs in automatically
          chrome.tabs.create({ url: `${WEB_UI_URL}?auth_data=${result.user.jwt}` });
        } else {
          chrome.tabs.create({ url: WEB_UI_URL });
        }
        window.close();
      });
    });
  }

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});