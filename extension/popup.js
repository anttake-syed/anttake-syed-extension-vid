import { startCapture } from '../shared-logic/capture.js';

document.addEventListener('DOMContentLoaded', () => {
  const recordBtn = document.getElementById('recordBtn');
  const screenshotBtn = document.getElementById('screenshotBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const captureCountBadge = document.getElementById('captureCountBadge');

  // Load capture count from local storage
  chrome.storage.local.get(['captureCount'], (result) => {
    captureCountBadge.textContent = `Captures: ${result.captureCount || 0}`;
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


let recorder;
const videoPreview = document.createElement('video'); // optional preview

document.getElementById('recordBtn').addEventListener('click', async () => {
  recorder = await startCapture(videoPreview);

  // Optional: append video preview to popup
  videoPreview.width = 320;
  videoPreview.height = 180;
  videoPreview.autoplay = true;
  document.body.appendChild(videoPreview);

  console.log('Recording started...');
});

document.getElementById('stopBtn')?.addEventListener('click', async () => {
  if (!recorder) return;
  const blob = await recorder.stop();

  // Preview recorded video
  videoPreview.srcObject = null;
  videoPreview.src = URL.createObjectURL(blob);
  videoPreview.controls = true;

  // Optional: upload to backend
  const formData = new FormData();
  formData.append('file', blob, `capture-${Date.now()}.webm`);

  fetch('http://localhost:5000/upload/drive', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => console.log('Uploaded file ID:', data.fileId))
  .catch(err => console.error('Upload failed:', err));
});

document.getElementById('recordBtn').addEventListener('click', async () => {
  recorder = await startCapture(videoPreview);
});