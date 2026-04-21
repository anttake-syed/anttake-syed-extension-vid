import { saveMediaLocally } from "./storage.js";

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-recording') {
    startRecording(message.streamId);
  } else if (message.type === 'stop-recording') {
    stopRecording();
  }
});

let recorder;
let data = [];
let currentStream;

async function startRecording(streamId) {
  if (recorder?.state === 'recording') return;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });

  recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) data.push(event.data);
  };

  recorder.onstop = async () => {
    const blob = new Blob(data, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    // Save locally for cloud sync
    try {
      await saveMediaLocally(blob, 'video');
      console.log('Video saved locally for sync');
    } catch (err) {
      console.error('Failed to save video locally:', err);
    }

    // Also download for immediate verification
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture-${Date.now()}.webm`;
    a.click();
    
    data = [];
    stream.getTracks().forEach(t => t.stop());
  };

  recorder.start();
}

function stopRecording() {
  recorder?.stop();
}
