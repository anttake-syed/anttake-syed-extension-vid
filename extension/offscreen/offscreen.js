// offscreen.js — AntCapture
import { saveMediaLocally } from '../storage/storage.js';

// Handles screen/tab recording modes.

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'start-recording') {
    startRecording(message.options || {});
  } else if (message.type === 'stop-recording') {
    stopRecording();
  } else if (message.type === 'pause-recording') {
    if (recorder && recorder.state === 'recording') recorder.pause();
  } else if (message.type === 'resume-recording') {
    if (recorder && recorder.state === 'paused') recorder.resume();
  } else if (message.type === 'discard-recording') {
    if (recorder) { isDiscarding = true; stopRecording(); }
  }
});

let recorder = null;
let data = [];
let activeStreams = [];
let animFrameId = null;
let isStopping = false;
let isDiscarding = false;

async function startRecording(options = {}) {
  if (recorder?.state === 'recording') return;

  const {
    mode       = 'screen',
    resolution = 720,
    includeMic = true,
    format     = 'webm',
  } = options;

  if (mode === 'camera') {
    chrome.runtime.sendMessage({ action: 'START_CAMERA_IN_TAB', options });
    return;
  }

  data = [];
  activeStreams = [];

  try {
    const height = resolution === 720 ? 720 : 1080;
    const displayConstraints = {
      video: {
        displaySurface: mode === 'tab' ? 'browser' : 'monitor',
        height: { ideal: height },
        frameRate: { ideal: 30 }
      },
      // Always false here — Linux does not support system audio via getDisplayMedia.
      // Microphone is merged in separately below via getUserMedia.
      audio: false,
    };

    const finalStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
    activeStreams.push(finalStream);

    // 'ended' fires when the user clicks the OS-level "Stop sharing" button
    finalStream.getVideoTracks()[0].addEventListener('ended', () => stopRecording());

    if (includeMic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        activeStreams.push(micStream);
        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) finalStream.addTrack(micTrack);
      } catch (err) {
        console.warn('Microphone not available (continuing without mic):', err.name, err.message);
      }
    }

    const { mimeType, resolvedFormat } = pickMimeType(format);

    if (resolvedFormat !== format) {
      chrome.runtime.sendMessage({ action: 'FORMAT_FALLBACK', requested: format, actual: resolvedFormat });
    }

    recorder = new MediaRecorder(finalStream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) data.push(event.data);
    };

    recorder.onstop = async () => {
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

      const blob = new Blob(data, { type: mimeType });
      data = [];
      isStopping = false;

      // Stop streams HERE — after collecting the blob — so the OS banner dismisses
      // and the camera light turns off at the right moment (not before we have the data).
      activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
      activeStreams = [];

      if (isDiscarding) {
        isDiscarding = false;
        return;
      }

      if (blob.size === 0) {
        console.warn('AntCapture: empty blob — recording too short?');
        chrome.storage.local.set({ pendingEditId: 'error:empty_blob', pendingEditTs: Date.now() });
        return;
      }

      try {
        // Save blob to IndexedDB. Use storage signal to tell background.js to redirect.
        // NOTE: chrome.tabs is NOT available in offscreen documents — do NOT call
        // chrome.tabs.create() here. It throws TypeError which corrupts the signal.
        const itemId = await saveMediaLocally(blob, 'video', 'preview', resolution, resolvedFormat);
        console.log('AntCapture: saved to IndexedDB, id=' + itemId + ' — signalling background...');
        // background.js listens via chrome.storage.onChanged and opens edit.html
        chrome.storage.local.set({ pendingEditId: String(itemId), pendingEditTs: Date.now() });
      } catch (err) {
        console.error('AntCapture: IndexedDB save failed:', err);
        // Signal background to show error page
        chrome.storage.local.set({ pendingEditId: 'error:save_failed', pendingEditTs: Date.now() });
      }
    };

    recorder.start(250);
    console.log(`AntCapture recording started — mode:${mode} res:${resolution}p format:${format}`);
    chrome.runtime.sendMessage({ action: 'OFFSCREEN_RECORDING_STARTED', options });

  } catch (err) {
    // Log name + message so the real DOMException is visible in DevTools
    console.error('Recording start failed:', err.name, '—', err.message, err);
    activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
  }
}

function stopRecording() {
  if (isStopping) return;
  if (recorder && recorder.state !== 'inactive') {
    isStopping = true;
    // Call recorder.stop() FIRST — onstop fires and stops the streams there.
    // Stopping streams before recorder.stop() triggers an 'ended' event which
    // auto-stops the MediaRecorder, causing a double-stop race condition.
    recorder.stop();
    chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
  }
}

function pickMimeType(preferredFormat) {
  const mp4Candidates  = ['video/mp4;codecs=h264,aac', 'video/mp4;codecs=avc1', 'video/mp4'];
  const webmCandidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];

  if (preferredFormat === 'mp4') {
    for (const type of mp4Candidates) {
      if (MediaRecorder.isTypeSupported(type)) return { mimeType: type, resolvedFormat: 'mp4' };
    }
    for (const type of webmCandidates) {
      if (MediaRecorder.isTypeSupported(type)) return { mimeType: type, resolvedFormat: 'mp4' };
    }
  }

  for (const type of webmCandidates) {
    if (MediaRecorder.isTypeSupported(type)) return { mimeType: type, resolvedFormat: 'webm' };
  }

  return { mimeType: 'video/webm', resolvedFormat: 'webm' };
}
