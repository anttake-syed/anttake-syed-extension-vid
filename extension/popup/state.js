// popup/state.js — Shared State and Config
import { DEV_SERVER_URL, PROD_SERVER_URL, DEV_WEB_UI_URL, PROD_WEB_UI_URL } from '../config.js';

export async function getConfig() {
  const { storageMode } = await chrome.storage.local.get(['storageMode']);
  const mode = storageMode || 'computer';
  return {
    mode,
    serverUrl: mode === 'localhost' ? DEV_SERVER_URL : PROD_SERVER_URL,
    webUiUrl:   mode === 'localhost' ? DEV_WEB_UI_URL  : PROD_WEB_UI_URL,
  };
}

// ── REACT-STYLE STATE MANAGEMENT ──
// We maintain a local state to allow for instant, optimistic UI updates
export const appState = { items: [], count: 0, bytes: 0, mode: 'computer' };
