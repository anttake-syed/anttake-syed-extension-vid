// content/authSync.js — AntCapture
// Bi-directional auth sync between the Web UI (localStorage) and the extension (chrome.storage).
// Runs every time the content script is injected into a page.

export function initAuthSync() {
  // Only run auth sync on the actual Web UI domains
  const allowedOrigins = ['http://localhost:5173', 'https://antcapture.anttake.com'];
  if (!allowedOrigins.includes(window.location.origin)) return;

  // Push the locally-stored user to the extension, or pull from it if missing
  function syncAuthToExtension() {
    const userDataStr = localStorage.getItem('antcapture_user');
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        chrome.runtime.sendMessage({ action: 'SYNC_USER', user, origin: window.location.origin });
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    } else {
      chrome.runtime.sendMessage({ action: 'GET_USER', origin: window.location.origin }, (res) => {
        if (res && res.user) {
          localStorage.setItem('antcapture_user', JSON.stringify(res.user));
          window.dispatchEvent(new Event('storage'));
        } else {
          chrome.runtime.sendMessage({ action: 'SYNC_USER', user: null, origin: window.location.origin });
        }
      });
    }
  }

  syncAuthToExtension();

  window.addEventListener('storage', (event) => {
    if (event.key === 'antcapture_user' || !event.key) syncAuthToExtension();
  });

  // Listen for logout broadcast from background.js
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'LOGOUT_WEB_UI') {
      localStorage.removeItem('antcapture_user');
      window.location.reload();
    }
  });
}
