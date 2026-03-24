document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordBtn');
  const screenshotBtn = document.getElementById('screenshotBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const captureCountBadge = document.getElementById('captureCountBadge');

  // Load capture count from local storage
  chrome.storage.local.get(['captureCount'], (result) => {
    captureCountBadge.textContent = `Captures: ${result.captureCount || 0}`;
  });

  // Listen for storage changes to update UI automatically
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.captureCount) {
      captureCountBadge.textContent = `Captures: ${changes.captureCount.newValue}`;
    }
  });

  recordBtn.addEventListener('click', () => {
    console.log('Record started');
    // We will implement chrome.desktopCapture here
    chrome.runtime.sendMessage({ action: 'START_RECORDING' });
  });

  screenshotBtn.addEventListener('click', () => {
    console.log('Screenshot taken');
    chrome.runtime.sendMessage({ action: 'TAKE_SCREENSHOT' });
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
