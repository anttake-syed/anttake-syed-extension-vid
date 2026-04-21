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
        screenshotBtn.querySelector(".btn-text").textContent = "Failed!";
      } else {
        screenshotBtn.querySelector(".btn-text").textContent = "Saved!";
      }
      setTimeout(() => {
        screenshotBtn.querySelector(".btn-text").textContent = originalText;
      }, 1500);
    });
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});