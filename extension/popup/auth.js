// popup/auth.js — Authentication and Dashboard Navigation
import { getConfig } from './state.js';
import { updateCacheUI } from './queue.js';

// DOM Elements
const googleLoginBtn = document.getElementById('googleLoginBtn');
const loginNotice    = document.getElementById('loginNotice');
const logoutBtn      = document.getElementById('logoutBtn');
const profileContainer = document.getElementById('profileContainer');
const userAvatar     = document.getElementById('userAvatar');
const userName       = document.getElementById('userName');
const userEmail      = document.getElementById('userEmail');

const statusDot      = document.getElementById('statusDot');
const statusText     = document.getElementById('statusText');
const storageInfo    = document.getElementById('storageInfo');
const openDashboardBtn = document.getElementById('openDashboardBtn');

export function initAuth() {
  // Load user data on startup
  chrome.storage.local.get(['user', 'storageMode'], (result) => {
    updateAuthUI(result.user || null);
  });

  // Listen for auth changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.user) {
      updateAuthUI(changes.user.newValue);
    }
  });

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      chrome.storage.local.get(['storageMode', 'dynamicWebUiUrl'], async (res) => {
        const mode = res.storageMode || 'computer';
        const { serverUrl, webUiUrl } = await getConfig();
        const actualWebUiUrl = res.dynamicWebUiUrl || webUiUrl;
        
        if (mode === 'localhost') {
          chrome.tabs.create({ url: actualWebUiUrl });
          window.close();
        } else {
          chrome.windows.create({
            url: `${serverUrl}/auth/google?source=extension`,
            type: 'popup',
            width: 500,
            height: 600
          });
        }
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'LOGOUT' }, (response) => {
        if (response?.success) { updateAuthUI(null); }
      });
    });
  }

  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', async () => {
      const { webUiUrl } = await getConfig();
      chrome.storage.local.get(['user', 'storageMode', 'dynamicWebUiUrl'], (result) => {
        const mode = result.storageMode || 'computer';
        const actualWebUiUrl = result.dynamicWebUiUrl || webUiUrl;
        
        const targetUrl = result.user?.jwt
          ? `${actualWebUiUrl}?auth_data=${result.user.jwt}`
          : actualWebUiUrl;

        const queryUrl = mode === 'localhost' ? 'http://localhost:517*/*' : `${actualWebUiUrl}/*`;

        chrome.tabs.query({ url: queryUrl }, (tabs) => {
          if (tabs.length > 0) {
            const dashTab = tabs.find(t => !t.url.includes('auth/success')) || tabs[0];
            chrome.tabs.update(dashTab.id, { active: true, url: targetUrl });
            chrome.windows.update(dashTab.windowId, { focused: true });
          } else {
            chrome.tabs.create({ url: targetUrl });
          }
          window.close();
        });
      });
    });
  }
}

export function updateAuthUI(user) {
  updateCacheUI();
  chrome.storage.local.get(['storageMode'], (res) => {
    const mode = res.storageMode || 'computer';
    const authSection = document.getElementById('authSection');
    
    if (mode === 'computer') {
      if (authSection) {authSection.style.display = 'none';}
      if (statusDot) {statusDot.style.background = '#60a5fa';}
      if (statusText) {statusText.textContent = 'Saving directly to Computer';}
      if (storageInfo) {storageInfo.textContent = 'Direct Download';}
      return;
    }
    
    if (authSection) {authSection.style.display = 'block';}

    const activeUser = mode === 'localhost' ? { name: 'Local Admin', email: 'admin@localhost', picture: '', jwt: 'local-mode' } : user;
    
    if (mode === 'localhost') {
      if (logoutBtn) {logoutBtn.style.display = 'none';}
    } else {
      if (logoutBtn) {logoutBtn.style.display = 'block';}
    }

    if (activeUser) {
      if (googleLoginBtn) { googleLoginBtn.style.display = 'none'; }
      if (loginNotice) {loginNotice.style.display = 'none';}
      
      if (mode === 'localhost') {
        if (profileContainer) profileContainer.style.display = 'none';
      } else {
        if (profileContainer) {
          profileContainer.style.display = 'flex';
          profileContainer.style.padding = '12px';
          profileContainer.style.background = '';
          profileContainer.style.border = '';
        }
        if (userName) userName.textContent = activeUser.name || 'User';
        if (userEmail) userEmail.textContent = activeUser.email || '';
        
        if (activeUser.picture && userAvatar) {
          userAvatar.src = activeUser.picture;
          userAvatar.style.borderRadius = '50%';
        }
      }
      
      getConfig().then(({ serverUrl }) => {
        fetch(`${serverUrl}/`)
          .then(res => {
            if (res.ok) {
              if (statusDot) {statusDot.style.background = '#10b981';}
              if (statusText) {statusText.textContent = mode === 'localhost' ? 'Local Sync Active' : 'Web + Drive Sync Active';}
            } else {
              throw new Error('Server not ok');
            }
          })
          .catch(() => {
            if (statusDot) {statusDot.style.background = '#ef4444';}
            if (statusText) {statusText.textContent = mode === 'localhost' ? 'Local Server Offline' : 'Cloud Server Offline';}
          });
      });
      
      fetchStats(activeUser);
    } else {
      if (googleLoginBtn) { googleLoginBtn.style.display = 'flex'; }
      
      const googleBtnText = googleLoginBtn?.querySelector('span:last-child');
      const googleBtnIcon = googleLoginBtn?.querySelector('svg');
      if (mode === 'localhost') {
        if (googleBtnText) {googleBtnText.textContent = 'Open Dashboard to Sign In';}
        if (googleBtnIcon) {googleBtnIcon.style.display = 'none';}
      } else {
        if (googleBtnText) {googleBtnText.textContent = 'Continue with Google';}
        if (googleBtnIcon) {googleBtnIcon.style.display = 'block';}
      }

      if (loginNotice) {loginNotice.style.display = 'block';}
      if (profileContainer) { profileContainer.style.display = 'none'; }
      
      if (statusDot) {statusDot.style.background = '#64748b';}
      if (statusText) {statusText.textContent = mode === 'localhost' ? 'Sign in via Local UI to sync' : 'Sign in to sync with Web + Drive';}
      if (storageInfo) {storageInfo.textContent = 'Local DB Only';}
    }
  });
}

async function fetchStats(user) {
  try {
    const { serverUrl } = await getConfig();
    const res = await fetch(`${serverUrl}/stats`, { headers: { Authorization: `Bearer ${user.jwt}` } });
    if (res.ok) {
      const data = await res.json();
      if (storageInfo) {storageInfo.textContent = `Metadata: ${data.dbSizeFormatted} | Drive Linked`;}
      if (typeof data.total === 'number') {
        chrome.storage.local.set({ captureCount: data.total });
      }
    }
  } catch (e) {
    console.error('Failed to fetch stats for popup', e);
  }
}
