// background/screenshot.js — AntCapture
// Handles all three screenshot modes:
//   1. Tab screenshot        (active tab visible area)
//   2. Region screenshot     (user draws a selection box)
//   3. Full-screen snapshot  (same as tab, but framed as "entire screen")

import { saveCapture, dataURItoBlob } from './save.js';

// ─────────────────────────────────────────────────────────────────────────────
// handleTakeScreenshot — captures the visible area of the active tab
// ─────────────────────────────────────────────────────────────────────────────
export async function handleTakeScreenshot(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];

    if (!tab || !tab.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url === 'about:blank' ||
        tab.url === 'about:newtab') {
      sendResponse({ success: false, error: 'Cannot screenshot this page. Navigate to a real website first.' });
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const blob = dataURItoBlob(dataUrl);
    const result = await saveCapture(blob, 'image');
    sendResponse(result);
  } catch (error) {
    console.error('Screenshot failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleRegionScreenshot — injects the selection overlay into the active tab,
// waits for the user to draw a rectangle, then crops and saves.
// ─────────────────────────────────────────────────────────────────────────────
export async function handleRegionScreenshot(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      sendResponse({ success: false, error: 'Cannot capture this page.' });
      return;
    }

    // Ensure content.js is injected (handles cases where the tab opened before the extension reloaded)
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch (injectErr) {
      console.log('Script injection note:', injectErr.message);
    }

    // Ask content.js to show the drag-select overlay; it resolves when the user saves/cancels
    const region = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { action: 'START_REGION_SELECT' }, resolve);
    });

    if (!region || region.cancelled) {
      sendResponse({ success: false, cancelled: true });
      return;
    }

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

    const dpr = region.devicePixelRatio || 1;
    const croppedBlob = await cropDataUrl(dataUrl, {
      x:      region.x      * dpr,
      y:      region.y      * dpr,
      width:  region.width  * dpr,
      height: region.height * dpr,
    });

    const result = await saveCapture(croppedBlob, 'image');
    sendResponse(result);
  } catch (err) {
    console.error('Region screenshot failed:', err);
    sendResponse({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handleScreenScreenshot — captures the full visible tab as "Entire Screen"
// ─────────────────────────────────────────────────────────────────────────────
export async function handleScreenScreenshot(message, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs[0];
    if (!tab) throw new Error('No active tab found.');

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const blob = await fetch(dataUrl).then(r => r.blob());
    const result = await saveCapture(blob, 'image');
    sendResponse(result);
  } catch (err) {
    console.error('Screen screenshot failed:', err);
    sendResponse({ success: false, error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// cropDataUrl — crops a data URL image to a pixel rectangle using OffscreenCanvas
// ─────────────────────────────────────────────────────────────────────────────
async function cropDataUrl(dataUrl, rect) {
  const blob = await fetch(dataUrl).then(r => r.blob());
  const bmp  = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(rect.width, rect.height);
  const ctx    = canvas.getContext('2d');
  ctx.drawImage(bmp, -rect.x, -rect.y);
  return canvas.convertToBlob({ type: 'image/png' });
}
