import { saveMediaLocally } from "./storage.js";

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
      video: {
        displaySurface: 'monitor'
      },
      audio: true
    });

    // Listen for the stream ending unexpectedly (e.g. user clicks Chrome's floating "Stop sharing" button)
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      stopRecording();
    });

    recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) data.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(data, { type: 'video/webm' });
      
      try {
        const id = await saveMediaLocally(blob, 'video');
        console.log('Video saved locally for sync. ID:', id);
        
        chrome.runtime.sendMessage({
          target: 'background',
          action: 'OPEN_DOWNLOAD_TAB',
          id: id
        });
      } catch (err) {
        console.error('Failed to save video locally:', err);
      }
      
      data = [];
      stream.getTracks().forEach(t => t.stop());
      
      // Tell background we stopped, so it updates the UI state
      chrome.runtime.sendMessage({
        target: 'background',
        action: 'EXTERNAL_STOP_RECORDING'
      });
    };

    recorder.start();
  } catch (err) {
    console.error('Capture cancelled or failed:', err);
    chrome.storage.local.set({ isRecording: false });
  }
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') {
    recorder.stop();
  }
}
