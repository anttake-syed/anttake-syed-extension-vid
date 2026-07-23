import { openDB, deleteLocalMedia } from './storage.js';

const iconEl = document.getElementById('icon');
const titleEl = document.getElementById('title');
const msgEl = document.getElementById('msg');
const manualBtn = document.getElementById('manual-btn');

function setState(state, extraMsg = '') {
  if (state === 'ready') {
    iconEl.innerHTML = '⬇️';
    titleEl.textContent = 'Choose where to save';
    msgEl.textContent = extraMsg || 'The "Save As" dialogue should be open. If it is hidden, click the button below.';
    manualBtn.style.display = 'inline-block';
  } else if (state === 'done') {
    iconEl.innerHTML = '✅';
    titleEl.textContent = 'Saved to your computer!';
    msgEl.textContent = 'Your file has been saved. This tab will close shortly.';
    manualBtn.style.display = 'none';
  } else if (state === 'error') {
    iconEl.innerHTML = '❌';
    titleEl.textContent = 'Something went wrong';
    msgEl.textContent = extraMsg || 'Could not find the media. Please try again.';
    manualBtn.style.display = 'none';
  }
}

async function downloadMedia() {
  const urlParams = new URLSearchParams(window.location.search);
  const idStr = urlParams.get('id');
  const autoDelete = urlParams.get('autoDelete') === 'true';

  if (!idStr) { setState('error', 'No recording ID provided.'); return; }
  const id = parseInt(idStr, 10);

  const db = await openDB();
  const tx = db.transaction('pending_uploads', 'readonly');
  const store = tx.objectStore('pending_uploads');

  const request = store.get(id);
  request.onsuccess = () => {
    const item = request.result;
    if (!item?.blob) { setState('error'); return; }

    const objectUrl = URL.createObjectURL(item.blob);
    // Derive the correct file extension from the stored format/mimeType
    // Priority: item.format (mimeType) → item.blob.type → type field fallback
    const mimeStr = item.format || item.blob?.type || '';
    let ext = item.type === 'video' ? 'webm' : 'png';
    if (mimeStr.includes('mp4'))  {ext = 'mp4';}
    else if (mimeStr.includes('webm')) {ext = 'webm';}
    else if (mimeStr.includes('png'))  {ext = 'png';}
    else if (mimeStr.includes('jpeg') || mimeStr.includes('jpg')) {ext = 'jpg';}
    const filename = `capture-[AntCapture]-${Date.now()}.${ext}`;

    // Wire up the manual fallback button
    manualBtn.href = objectUrl;
    manualBtn.download = filename;

    setState('ready');

    chrome.downloads.download({ url: objectUrl, filename, saveAs: true }, (downloadId) => {
      if (!downloadId) {
        setState('error', 'Download could not start. Use the button below.');
        manualBtn.style.display = 'inline-block';
        return;
      }

      chrome.downloads.onChanged.addListener(function monitor(delta) {
        if (delta.id !== downloadId || !delta.state) {return;}
        if (delta.state.current === 'complete') {
          chrome.downloads.onChanged.removeListener(monitor);
          URL.revokeObjectURL(objectUrl);
          // Clean up from IndexedDB if this was a computer-mode temporary save
          if (autoDelete) {deleteLocalMedia(id).catch(() => {});}
          setState('done');
          setTimeout(() => {
            chrome.tabs.getCurrent(tab => { if (tab) {chrome.tabs.remove(tab.id);} });
          }, 2500);
        } else if (delta.state.current === 'interrupted') {
          chrome.downloads.onChanged.removeListener(monitor);
          setState('error', 'Download was interrupted. Click the button below to try again.');
          manualBtn.style.display = 'inline-block';
        }
      });
    });
  };
  request.onerror = () => setState('error', 'Database error reading your media.');
}

document.addEventListener('DOMContentLoaded', downloadMedia);
