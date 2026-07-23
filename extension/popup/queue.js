// popup/queue.js — Offline Queue Rendering and Sync logic
import { getPendingUploads, deleteLocalMedia } from '../storage.js';
import { DEV_WEB_UI_URL } from '../config.js';
import { appState, getConfig } from './state.js';
import { showToast } from './toast.js';
import { updateAuthUI } from './auth.js';

// DOM Elements
const cloudQueueContainer  = document.getElementById('cloudQueueContainer');
const cloudCacheSizeText   = document.getElementById('cloudCacheSizeText');
const cloudCacheItemsList  = document.getElementById('cloudCacheItemsList');
const cloudClearCacheBtn   = document.getElementById('cloudClearCacheBtn');
const cloudStorageFill     = document.getElementById('cloudStorageFill');
const cloudRefreshBtn      = document.getElementById('cloudRefreshBtn');

const localQueueContainer  = document.getElementById('localQueueContainer');
const localClearCacheBtn   = document.getElementById('localClearCacheBtn');

const syncCacheBtn = document.getElementById('syncCacheBtn');
const syncStatusPanel  = document.getElementById('syncStatusPanel');
const syncStatusIcon   = document.getElementById('syncStatusIcon');
const syncStatusTitle  = document.getElementById('syncStatusTitle');
const syncStepsList    = document.getElementById('syncStepsList');
const syncErrorBox     = document.getElementById('syncErrorBox');
const syncErrorTitle   = document.getElementById('syncErrorTitle');
const syncErrorDetail  = document.getElementById('syncErrorDetail');
const syncTipBox       = document.getElementById('syncTipBox');
const syncTipText      = document.getElementById('syncTipText');

export function initQueue() {
  if (cloudClearCacheBtn) {
    cloudClearCacheBtn.addEventListener('click', () => {
      cloudClearCacheBtn.textContent = 'Clearing...';
      cloudClearCacheBtn.style.display = 'none'; // Optimistic hide
      
      if (cloudCacheSizeText) { cloudCacheSizeText.textContent = '0.00 MB (0 items)'; }
      if (cloudStorageFill) {
        cloudStorageFill.style.width = '0%';
        cloudStorageFill.className = 'storage-bar-fill';
      }
      if (cloudCacheItemsList) { renderQueueItems(cloudCacheItemsList, [], 'cloud'); }

      chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, (res) => {
        void chrome.runtime.lastError;
        if (res && res.success) {
          cloudClearCacheBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px;">delete</span> Clear';
        }
      });
    });
  }

  if (cloudRefreshBtn) {
    cloudRefreshBtn.addEventListener('click', () => {
      cloudRefreshBtn.style.transform = 'rotate(360deg)';
      if (cloudCacheSizeText) { cloudCacheSizeText.textContent = 'Refreshing...'; }
      updateCacheUI();
      setTimeout(() => { cloudRefreshBtn.style.transform = 'rotate(0deg)'; }, 300);
    });
  }

  if (localClearCacheBtn) {
    localClearCacheBtn.addEventListener('click', () => {
      localClearCacheBtn.textContent = 'Clearing...';
      chrome.runtime.sendMessage({ action: 'CLEAR_CACHE' }, (res) => {
        if (res && res.success) {
          updateCacheUI();
          localClearCacheBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px;">delete</span> Clear';
        }
      });
    });
  }

  if (syncCacheBtn) {
    syncCacheBtn.addEventListener('click', async () => {
      syncCacheBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px; animation:spin 0.8s linear infinite; display:inline-block;">sync</span> Syncing…';
      syncCacheBtn.disabled = true;

      cancelSyncHide();
      showSyncPanel('Sync Progress', 'sync', '#818cf8');
      addSyncStep('wifi_tethering', 'Checking connection…', '#94a3b8', false);

      chrome.runtime.sendMessage({ action: 'SYNC_PENDING' }, (res) => {
        syncCacheBtn.disabled = false;
        syncCacheBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px;">sync</span> Sync';
        syncStepsList.innerHTML = '';

        if (res?.offline) {
          showSyncPanel('Sync Failed', 'wifi_off', '#f87171');
          addSyncStep('wifi_off', 'No internet connection', '#f87171');
          showSyncError('Device is offline', 'The extension cannot reach the server when your device has no network.', 'Connect to the internet and try syncing again.');
          return;
        }

        if (res?.noUser) {
          showSyncPanel('Sign In Required', 'account_circle', '#f59e0b');
          addSyncStep('lock', 'Not signed in to extension', '#f87171');
          showSyncError('Authentication missing', 'You must sign in to the AntCapture extension before syncing.', 'Click "Sign in with Google" above, then try syncing again.');
          return;
        }

        if (chrome.runtime.lastError || !res) {
          const errMsg = chrome.runtime.lastError?.message || 'No response from background script.';
          showSyncPanel('Sync Error', 'error', '#f87171');
          addSyncStep('error', 'Extension error', '#f87171');
          showSyncError('Extension communication failed', errMsg, 'Try reloading the extension at chrome://extensions, then try again.');
          return;
        }

        const { synced = 0, failed = 0, total = 0, errors = [] } = res;

        if (total === 0) {
          showSyncPanel('Queue Empty', 'check_circle', '#34d399');
          addSyncStep('check_circle', 'No items to sync — queue is empty', '#34d399');
          hideSyncPanel(3000);
          updateCacheUI();
          return;
        }

        if (synced > 0 && failed === 0) {
          showSyncPanel('Sync Complete', 'cloud_done', '#34d399');
          addSyncStep('check_circle', `${synced} item${synced > 1 ? 's' : ''} uploaded to dashboard`, '#34d399');
          addSyncStep('storage', 'Saved to SQLite on local server', '#94a3b8');
          addSyncStep('open_in_browser', 'Open Dashboard to view them', '#818cf8');
          hideSyncPanel(5000);
          updateCacheUI();
          return;
        }

        showSyncPanel('Sync Failed', 'error_outline', '#f87171');
        if (synced > 0) { addSyncStep('check_circle', `${synced} item${synced > 1 ? 's' : ''} uploaded OK`, '#34d399'); }
        addSyncStep('error', `${failed} item${failed > 1 ? 's' : ''} failed to upload`, '#f87171');

        const errMsg = errors[0] || 'Upload request rejected by server.';
        const tip = 'Make sure the server is running: cd server && npm start';

        if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ECONNREFUSED')) {
          showSyncError('Server not reachable', 'Could not connect to http://localhost:3001. The server may not be running.', 'Run: cd server && npm start — then try syncing again.');
        } else if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('Unauthorized')) {
          showSyncError('Session expired', 'Your JWT token was rejected by the server.', 'Sign out and sign in again to refresh your session, then retry.');
        } else if (errMsg.includes('Local upload failed')) {
          showSyncError('Server rejected the upload', errMsg, 'Check the server terminal for the full error log.');
        } else {
          showSyncError('Upload error', errMsg, tip);
        }
        updateCacheUI();
      });
    });
  }
}

export async function updateCacheUI() {
  chrome.storage.local.get(['storageMode'], async (modeRes) => {
    const mode = modeRes.storageMode || 'computer';

    if (mode === 'computer' || mode === 'localhost') {
      if (cloudQueueContainer) { cloudQueueContainer.style.display = 'none'; }
      if (localQueueContainer) { localQueueContainer.style.display = 'none'; }
      return;
    }

    if (mode === 'cloud') {
      if (localQueueContainer) { localQueueContainer.style.display = 'none'; }
      if (cloudQueueContainer) { cloudQueueContainer.style.display = 'flex'; }
      
      try {
        const pending = await getPendingUploads('cloud');
        const sizeBytes = pending.reduce((acc, item) => acc + (item.blob?.size || 0), 0);
        
        appState.bytes = sizeBytes;
        appState.count = pending.length;
        appState.items = pending;
        appState.mode = 'cloud';
        
        const mb = (appState.bytes / (1024 * 1024)).toFixed(2);
        
        if (cloudCacheSizeText) { cloudCacheSizeText.textContent = `${mb} MB (${appState.count} item${appState.count === 1 ? '' : 's'})`; }
        if (cloudClearCacheBtn) { cloudClearCacheBtn.style.display = appState.count > 0 ? 'flex' : 'none'; }
        if (cloudCacheItemsList) { renderQueueItems(cloudCacheItemsList, appState.items, 'cloud'); }

        const cloudStorageBar = document.getElementById('cloudStorageBar');
        if (cloudStorageBar && cloudStorageFill) {
          cloudStorageBar.style.display = 'block';
          const bytePct = Math.min((appState.bytes / (200 * 1024 * 1024)) * 100, 100);
          const countPct = Math.min((appState.count / 50) * 100, 100);
          const fillPct = Math.max(bytePct, countPct);
          cloudStorageFill.style.width = `${fillPct}%`;
          cloudStorageFill.className = 'storage-bar-fill';
          if (fillPct > 90) { cloudStorageFill.classList.add('danger'); }
          else if (fillPct > 70) { cloudStorageFill.classList.add('warning'); }
        }
      } catch (err) {
        console.error("Popup failed to read IndexedDB:", err);
        if (cloudCacheSizeText) { cloudCacheSizeText.textContent = `Database Error - Click Refresh ->`; }
      }
    }
  });
}

export function renderQueueItems(listEl, items, mode) {
  if (!items || items.length === 0) {
    if (!listEl.querySelector('.queue-empty-anim')) {
      listEl.innerHTML = '';
      const emptyEl = document.createElement('div');
      emptyEl.className = 'queue-empty-anim';
      emptyEl.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:6px; background: rgba(16,185,129,0.05); padding:10px 8px; border-radius:4px; border: 1px dashed rgba(16,185,129,0.2); opacity:0;';
      emptyEl.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:15px; color:#10b981;">check_circle</span>
        <span style="font-size:11px; color:#34d399; font-weight:500;">All captures synced — queue is empty</span>
      `;
      listEl.appendChild(emptyEl);
    }
    return;
  }

  const emptyState = listEl.querySelector('.queue-empty-anim');
  if (emptyState) { emptyState.remove(); }

  const existingNodes = Array.from(listEl.children);
  const existingIds = existingNodes.map(n => String(n.dataset.id));
  const newIds = items.map(i => String(i.id));

  existingNodes.forEach(node => {
    if (!newIds.includes(String(node.dataset.id))) { node.remove(); }
  });

  let newItemsRendered = 0;
  items.forEach((item) => {
    if (!existingIds.includes(String(item.id))) {
      const el = document.createElement('div');
      el.dataset.id = item.id;
      el.className = 'queue-item-anim';
      el.style.animationDelay = `${newItemsRendered * 0.04}s`;
      newItemsRendered++;
      el.style.cssText += 'display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding:6px 8px; border-radius:4px; gap:6px; opacity:0;';

      const leftWrap = document.createElement('div');
      leftWrap.style = 'display:flex; align-items:center; gap:6px; overflow:hidden;';

      const iconEl = document.createElement('span');
      iconEl.className = 'material-symbols-rounded';
      iconEl.style = `font-size:14px; color:${item.type === 'video' ? '#60a5fa' : '#c084fc'}; flex-shrink:0;`;
      iconEl.textContent = item.type === 'video' ? 'videocam' : 'image';

      const nameSpan = document.createElement('span');
      nameSpan.style = 'font-size:11px; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;';
      const absTime = new Date(item.timestamp);
      const diffMs = Date.now() - absTime.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const relTime = diffMin < 1 ? 'just now' : diffMin < 60 ? `${diffMin}m ago` : diffHr < 24 ? `${diffHr}h ago` : absTime.toLocaleDateString();
      nameSpan.textContent = item.type === 'video' ? 'Video' : 'Screenshot';
      nameSpan.title = absTime.toLocaleString();

      const timeSpan = document.createElement('span');
      timeSpan.style = 'font-size:10px; color:#64748b; white-space:nowrap; flex-shrink:0;';
      timeSpan.textContent = relTime;

      const tagSpan = document.createElement('span');
      tagSpan.style = 'font-size:9px; padding:2px 4px; border-radius:3px; font-weight:600; text-transform:uppercase; white-space:nowrap; flex-shrink:0;';
      if (item.mode === 'localhost') {
         tagSpan.style.background = 'rgba(167,139,250,0.15)';
         tagSpan.style.color = '#a78bfa';
         tagSpan.textContent = 'Local Sync';
      } else {
         tagSpan.style.background = 'rgba(52,211,153,0.15)';
         tagSpan.style.color = '#34d399';
         tagSpan.textContent = 'Cloud Sync';
      }

      leftWrap.appendChild(iconEl);
      leftWrap.appendChild(nameSpan);
      leftWrap.appendChild(tagSpan);
      leftWrap.appendChild(timeSpan);

      const rightWrap = document.createElement('div');
      rightWrap.style = 'display:flex; align-items:center; gap:4px; flex-shrink:0;';

      const actionBtn = document.createElement('a');
      actionBtn.href = mode === 'localhost' ? `${DEV_WEB_UI_URL}?highlight=${item.id}` : `download.html?id=${item.id}`;
      actionBtn.target = '_blank';
      actionBtn.style = 'font-size:11px; color:#6366f1; text-decoration:none; background: rgba(99,102,241,0.1); padding:2px 6px; border-radius:4px; white-space:nowrap;';
      actionBtn.textContent = mode === 'localhost' ? 'View' : 'Save';

      const delBtn = document.createElement('button');
      delBtn.className = 'item-del-btn';
      delBtn.title = 'Delete from queue';
      delBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:13px;">delete</span>';
      delBtn.addEventListener('click', () => {
        rightWrap.innerHTML = '';
        const confirmRow = document.createElement('div');
        confirmRow.className = 'item-confirm-row';
        confirmRow.innerHTML = `<span>Delete?</span><button class="btn-yes">Yes</button><button class="btn-no">No</button>`;
        confirmRow.querySelector('.btn-yes').addEventListener('click', async () => {
          el.style.opacity = '0.4'; el.style.transition = 'opacity 0.2s';
          try {
            await deleteLocalMedia(item.id);
            showToast('Removed from queue', 'success');
          } catch {
            el.style.opacity = '1';
            showToast('Could not delete item', 'error');
          }
        });
        confirmRow.querySelector('.btn-no').addEventListener('click', () => {
          rightWrap.innerHTML = ''; rightWrap.appendChild(actionBtn); rightWrap.appendChild(delBtn);
        });
        rightWrap.appendChild(confirmRow);
      });

      rightWrap.appendChild(actionBtn);
      rightWrap.appendChild(delBtn);
      el.appendChild(leftWrap);
      el.appendChild(rightWrap);
      listEl.appendChild(el);
    }
  });
}

function addSyncStep(icon, text, color = '#94a3b8', spin = false) {
  if (!syncStepsList) {return;}
  const row = document.createElement('div');
  row.style = 'display:flex; align-items:center; gap:6px;';
  const ic = document.createElement('span');
  ic.className = 'material-symbols-rounded';
  ic.style = `font-size:13px; color:${color}; flex-shrink:0;${spin ? ' animation: spin 0.8s linear infinite; display:inline-block;' : ''}`;
  ic.textContent = icon;
  const tx = document.createElement('span');
  tx.style = `font-size:11px; color:${color};`;
  tx.textContent = text;
  row.appendChild(ic);
  row.appendChild(tx);
  syncStepsList.appendChild(row);
  return row;
}

function showSyncPanel(titleText, iconName, iconColor) {
  if (!syncStatusPanel) {return;}
  syncStepsList.innerHTML = '';
  if (syncErrorBox) {syncErrorBox.style.display = 'none';}
  if (syncTipBox)   {syncTipBox.style.display   = 'none';}
  syncStatusIcon.textContent = iconName;
  syncStatusIcon.style.color = iconColor;
  syncStatusTitle.textContent = titleText;
  syncStatusPanel.style.display = 'flex';
}

function showSyncError(title, detail, tip) {
  if (syncErrorBox)   { syncErrorBox.style.display = 'block'; }
  if (syncErrorTitle) {syncErrorTitle.textContent = title;}
  if (syncErrorDetail) {syncErrorDetail.textContent = detail;}
  if (tip && syncTipBox && syncTipText) {
    syncTipBox.style.display = 'block';
    syncTipText.textContent = tip;
  }
}

function hideSyncPanel(delayMs) {
  clearTimeout(window._syncHideTimer);
  window._syncHideTimer = setTimeout(() => {
    if (syncStatusPanel) {syncStatusPanel.style.display = 'none';}
  }, delayMs);
}

export function cancelSyncHide() {
  clearTimeout(window._syncHideTimer);
}
