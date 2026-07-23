// popup.js — Entry point for AntCapture Extension Popup
// Modularized for maintainability and to avoid massive monoliths.

import { initQueue } from './popup/queue.js';
import { initAuth } from './popup/auth.js';
import { initCapture } from './popup/capture.js';
import { getConfig } from './popup/state.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Capture UI bindings (screenshot modes, recording options, mic toggle)
  initCapture();

  // 2. Initialize Queue/Sync handlers (cloud/local sync logic, UI updates, caching)
  initQueue();

  // 3. Initialize Authentication and Profile UI bindings
  initAuth();

  // 4. Bind the settings button
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', async () => {
      const { webUiUrl } = await getConfig();
      chrome.storage.local.get(['user', 'storageMode', 'dynamicWebUiUrl'], (result) => {
        const actualWebUiUrl = result.dynamicWebUiUrl || webUiUrl;
        const settingsUrl = result.user?.jwt
          ? `${actualWebUiUrl}?nav=Settings&auth_data=${result.user.jwt}`
          : `${actualWebUiUrl}?nav=Settings`;

        const mode = result.storageMode || 'computer';
        const queryUrl = mode === 'localhost' ? 'http://localhost:517*/*' : `${actualWebUiUrl}/*`;

        chrome.tabs.query({ url: queryUrl }, (tabs) => {
          if (tabs.length > 0) {
            const dashTab = tabs.find(t => !t.url.includes('auth/success')) || tabs[0];
            chrome.tabs.update(dashTab.id, { active: true, url: settingsUrl });
            chrome.windows.update(dashTab.windowId, { focused: true });
          } else {
            chrome.tabs.create({ url: settingsUrl });
          }
          window.close();
        });
      });
    });
  }
});