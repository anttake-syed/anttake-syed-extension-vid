import { DEV_BACKEND_URL, PROD_BACKEND_URL, DEV_WEB_UI_URL, PROD_WEB_UI_URL } from './config.js';

const select = document.getElementById('storageModeSelect');
const status = document.getElementById('status');

chrome.storage.local.get(['storageMode'], (result) => {
  select.value = result.storageMode || 'computer';
  updateLabels(select.value);
});

select.addEventListener('change', () => {
  const storageMode = select.value;
  chrome.storage.local.set({ storageMode }, () => {
    updateLabels(storageMode);
    status.textContent = 'Saved!';
    setTimeout(() => { status.textContent = ''; }, 1500);
  });
});

function updateLabels(mode) {
  document.getElementById('backendLabel').textContent = mode === 'localhost'
    ? DEV_BACKEND_URL
    : (mode === 'cloud' ? PROD_BACKEND_URL : 'N/A (Direct Download)');
  document.getElementById('webUiLabel').textContent = mode === 'localhost'
    ? DEV_WEB_UI_URL
    : (mode === 'cloud' ? PROD_WEB_UI_URL : 'N/A (Direct Download)');
}
