// offscreen.js — AntCapture
import { saveMediaLocally } from '../storage/storage.js';

// Handles all recording modes: Screen, Tab, Camera-only, and Cam+Screen Overlay (like Loom)
// Uses canvas compositing to render the webcam bubble on top of screen recording.

chrome.runtime.onMessage.addListener(async (message) => {
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
    if (recorder) {
      isDiscarding = true;
      stopRecording();
    }
  }
});

let recorder = null;
let data = [];
let activeStreams = []; // track all streams so we can stop them cleanly
let animFrameId = null; // for canvas overlay animation loop
let isStopping = false; // guard against double-stop (ended event + explicit stop)
let isDiscarding = false;

async function startRecording(options = {}) {
  if (recorder?.state === 'recording') return;

  const {
    mode       = 'screen',   // 'screen' | 'tab' | 'camera' | 'overlay'
    resolution = 720,        // 720 | 1080
    includeMic = true,
    format     = 'webm',     // 'webm' | 'mp4'
  } = options;

  // ── Camera-only: Chrome blocks getUserMedia in offscreen docs ───────────
  // Route back to background.js which will inject into the active tab instead.
  if (mode === 'camera') {
    chrome.runtime.sendMessage({ action: 'START_CAMERA_IN_TAB', options });
    return;
  }

  data = [];
  activeStreams = [];

  try {
    let finalStream;

    // ── DISPLAY SURFACE constraints ──────────────────────────────────────────
    const height = resolution === 720 ? 720 : 1080;
    const displayConstraints = {
      video: {
        displaySurface: mode === 'tab' ? 'browser' : 'monitor',
        height: { ideal: height },
        frameRate: { ideal: 30 }
      },
      audio: includeMic,     // system/tab audio
    };

    // ── Camera logic handled in content script (foreground) ──────────────────
    // Because Chrome blocks video getUserMedia in offscreen documents, 
    // the 'overlay' mode injects a draggable webcam bubble into the active tab.
    // Here, we just need to record the screen normally, and the bubble will be captured!
    
    finalStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
    activeStreams.push(finalStream);
    // 'ended' fires when user clicks the OS-level "Stop sharing" button.
    // Guard with isStopping to prevent a second save when we stopped it ourselves.
    finalStream.getVideoTracks()[0].addEventListener('ended', () => stopRecording());

    // ── Explicitly request Microphone (since getDisplayMedia only gets system audio)
    if (includeMic) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreams.push(micStream);
        
        // Check if finalStream already has an audio track (system audio)
        const sysAudioTracks = finalStream.getAudioTracks();
        if (sysAudioTracks.length > 0) {
          // If we have both system audio and mic, we need an AudioContext to mix them
          const ctx = new AudioContext();
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(e => console.warn('Could not resume AudioContext:', e));
          }
          const dest = ctx.createMediaStreamDestination();
          ctx.createMediaStreamSource(new MediaStream([sysAudioTracks[0]])).connect(dest);
          ctx.createMediaStreamSource(micStream).connect(dest);
          
          // Remove the old system audio track and add the mixed one
          finalStream.removeTrack(sysAudioTracks[0]);
          finalStream.addTrack(dest.stream.getAudioTracks()[0]);
        } else {
          // Just add the mic track directly
          finalStream.addTrack(micStream.getAudioTracks()[0]);
        }
      } catch (err) {
        console.warn('Microphone permission denied or not available:', err);
      }
    }
    // ── Pick the best supported MIME type ──────────────────────────────────
    const { mimeType, resolvedFormat } = pickMimeType(format);

    // Notify background if we had to fall back from requested format
    if (resolvedFormat !== format) {
      chrome.runtime.sendMessage({
        action: 'FORMAT_FALLBACK',
        requested: format,
        actual: resolvedFormat,
      });
    }

    recorder = new MediaRecorder(finalStream, { mimeType });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) data.push(event.data);
    };

    recorder.onstop = async () => {
      // Cancel canvas animation loop if running
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }

      const blob = new Blob(data, { type: mimeType });
      data = [];
      isStopping = false; // reset guard

      if (isDiscarding) {
        console.log('Recording discarded.');
        isDiscarding = false;
        activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
        return;
      }

      if (blob.size === 0) {
        console.warn('AntCapture: empty blob, skipping save.');
        activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
        chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'empty_blob' });
        return;
      }

      try {
        // Save to IndexedDB directly as 'preview' to avoid background transfer overhead
        const itemId = await saveMediaLocally(blob, 'video', 'preview', resolution, resolvedFormat);

        chrome.runtime.sendMessage({
          action: 'OPEN_EDIT_PAGE_FOR_VIDEO',
          itemId
        });
      } catch (err) {
        console.error('Failed to process video blob:', err);
        chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'save_failed' });
      } finally {
        activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
      }
      // NOTE: Do NOT send EXTERNAL_STOP_RECORDING here.
      // background.js already sets isRecording: false in handleStopRecording.
      // Sending it again from onstop creates a race and resets state prematurely.
    };

    recorder.start(250); // 250ms timeslice for efficient chunking
    console.log(`🎬 AntCapture recording started — mode:${mode} res:${resolution}p format:${format}`);
    chrome.runtime.sendMessage({ action: 'OFFSCREEN_RECORDING_STARTED', options });

  } catch (err) {
    console.error('Recording start failed:', err);
    // Clean up any partial streams
    activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
  }
}

function stopRecording() {
  // Guard: prevent duplicate saves if the 'ended' event fires after we already stopped
  if (isStopping) { return; }
  if (recorder && recorder.state !== 'inactive') {
    isStopping = true;
    
    // Instantly kill the streams to hide the browser's "Stop sharing" OS banner immediately
    if (typeof activeStreams !== 'undefined') {
      activeStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    }
    
    recorder.stop();
    chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Returns { mimeType, resolvedFormat } — resolvedFormat dictates the saved file extension
function pickMimeType(preferredFormat) {
  const mp4Candidates  = ['video/mp4;codecs=h264,aac', 'video/mp4;codecs=avc1', 'video/mp4'];
  // Prioritize vp8 over vp9 to avoid blank/black screen issues on certain hardware encoders
  const webmCandidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];

  if (preferredFormat === 'mp4') {
    for (const type of mp4Candidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type, resolvedFormat: 'mp4' };
      }
    }
    // MP4 not natively supported by this browser — fall back to WebM encoding
    // BUT we keep resolvedFormat as 'mp4' so the file gets saved with a .mp4 extension.
    // Modern players (VLC, Chrome) will sniff the WebM container and play it perfectly anyway.
    console.warn('MP4 recording not supported natively, falling back to WebM container but keeping .mp4 extension.');
    for (const type of webmCandidates) {
      if (MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type, resolvedFormat: 'mp4' };
      }
    }
  }

  for (const type of webmCandidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return { mimeType: type, resolvedFormat: 'webm' };
    }
  }

  return { mimeType: 'video/webm', resolvedFormat: 'webm' }; // ultimate fallback
}


