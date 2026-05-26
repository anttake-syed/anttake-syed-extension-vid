// offscreen.js — AntCapture
// Records the screen. When done, sends the video blob to background.js
// for direct upload to the backend. No local download, no IndexedDB middleman.

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-recording') {
    startRecording();
  } else if (message.type === 'stop-recording') {
    stopRecording();
  }
});

let recorder;
let data = [];

async function startRecording() {
  if (recorder?.state === 'recording') return;

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: 'monitor' },
      audio: true
    });

    // When user clicks Chrome's "Stop sharing" button
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      stopRecording();
    });

    recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) data.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(data, { type: 'video/webm' });
      data = [];
      stream.getTracks().forEach(t => t.stop());

      try {
        // Convert blob to data URL so we can send it over chrome.runtime.sendMessage
        const blobDataUrl = await blobToDataUrl(blob);

        // Send to background script for direct upload to backend
        chrome.runtime.sendMessage({
          action: 'VIDEO_BLOB_READY',
          blobDataUrl,
          mimeType: 'video/webm'
        });

        console.log('✅ Video sent to background for upload');
      } catch (err) {
        console.error('Failed to process video blob:', err);
      }

      // Tell background recording has stopped so it can update UI state
      chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
    };

    recorder.start();
    console.log('🎬 Recording started');
  } catch (err) {
    console.error('Capture cancelled or failed:', err);
    chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
  }
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
