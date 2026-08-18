// content/cameraRecorder.js — AntCapture
// Camera-only recording that runs in the foreground tab.
// Chrome blocks getUserMedia (video) inside offscreen documents, so the recorder
// lives here and sends the finished blob back to background.js as a data URL.

// ─────────────────────────────────────────────────────────────────────────────
// 1. MediaStreamManager (Capture Layer)
// ─────────────────────────────────────────────────────────────────────────────
class MediaStreamManager {
  static async getCaptureStreams(resolution, includeMic) {
    // Primary: ideal constraints including facingMode
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: includeMic,
      });
    } catch (primaryErr) {
      // Brave sometimes rejects facingMode — retry without it
      log?.warn('Camera primary constraints failed, retrying', primaryErr.name);
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: includeMic,
      });
    }
    return stream;
  }

  static stopStreams(stream) {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  }

  static buildPreviewBubble(stream) {
    const size = 200;
    const bubble = document.createElement('div');
    Object.assign(bubble.style, {
      position: 'fixed', bottom: '20px', right: '20px',
      width: size+'px', height: size+'px',
      borderRadius: '50%', overflow: 'hidden',
      zIndex: '2147483647',
      boxShadow: '0 0 0 3px #ef4444, 0 8px 32px rgba(0,0,0,0.4)',
      border: '3px solid rgba(255,255,255,0.15)',
      cursor: 'move', backgroundColor: '#000',
    });

    const vid = document.createElement('video');
    vid.srcObject = stream;
    vid.autoplay = true;
    vid.muted = true;
    Object.assign(vid.style, {
      width: '100%', height: '100%', objectFit: 'cover',
      transform: 'scaleX(-1)', pointerEvents: 'none',
    });
    bubble.appendChild(vid);

    // ── Drag support with bounds clamping ────────────────────────────────────
    let dragging = false, sx, sy, il, it;

    bubble.addEventListener('mousedown', e => {
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = bubble.getBoundingClientRect(); il = r.left; it = r.top;
      e.preventDefault();
    });

    // Store handlers so we can remove them later
    const onMove = e => {
      if (!dragging) return;
      const newLeft = il + e.clientX - sx;
      const newTop  = it  + e.clientY - sy;
      // Clamp so at least half the bubble stays on-screen
      const half = size / 2;
      const clampedLeft = Math.max(-half, Math.min(window.innerWidth  - half, newLeft));
      const clampedTop  = Math.max(-half, Math.min(window.innerHeight - half, newTop));
      bubble.style.left   = clampedLeft + 'px';
      bubble.style.top    = clampedTop  + 'px';
      bubble.style.right  = 'auto';
      bubble.style.bottom = 'auto';
    };
    const onUp = () => { dragging = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);

    // Attach cleanup refs to the bubble element for teardown
    bubble._dragCleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    return bubble;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ChunkBuffer
// ─────────────────────────────────────────────────────────────────────────────
class ChunkBuffer {
  constructor() {
    this.chunks = [];
  }
  add(chunk) {
    if (chunk && chunk.size > 0) {
      this.chunks.push(chunk);
    }
  }
  getAll() {
    return this.chunks;
  }
  clear() {
    this.chunks = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VideoBuilder
// ─────────────────────────────────────────────────────────────────────────────
class VideoBuilder {
  static build(chunks, mimeType) {
    if (!chunks || chunks.length === 0) {
      return new Blob([], { type: mimeType });
    }
    return new Blob(chunks, { type: mimeType });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Architecture layers: Capture, Buffer, Builder, Transfer, Recorder, Manager
// ─────────────────────────────────────────────────────────────────────────────

// Since this is injected dynamically via chrome.runtime.getURL, we import logger similarly
let log;
import(chrome.runtime.getURL('shared/logger.js')).then(m => log = m.Logger.getLogger('Camera Recorder'));

class MessageTransferLayer {
  static transfer(blob, resolution, format, mimeType, hasAudio) {
    if (blob.size === 0) {
      log?.warn('AntCapture: empty camera blob, skipping save.');
      chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'empty_blob' });
      return;
    }
    
    // Content scripts cannot directly access extension IndexedDB. 
    // They must serialize the Blob and send it to the background page.
    const reader = new FileReader();
    reader.onloadend = () => {
      chrome.runtime.sendMessage({
        action: 'CAMERA_BLOB_READY',
        blobDataUrl: reader.result,
        mimeType,
        resolution,
        format,
        hasAudio
      });
    };
    reader.readAsDataURL(blob);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. RecorderWrapper
// ─────────────────────────────────────────────────────────────────────────────
class RecorderWrapper {
  constructor(stream, mimeType) {
    this.recorder = new MediaRecorder(stream, { mimeType });
  }

  start(timeslice, onChunk, onStop) {
    this.recorder.ondataavailable = e => onChunk(e.data);
    // Wrap async onstop so silent promise rejections don't hide bugs
    this.recorder.onstop = () => Promise.resolve(onStop()).catch(err => {
      log?.error('AntCapture camera: onstop handler threw', err);
      chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'save_failed' });
    });
    this.recorder.start(timeslice);
  }

  stop() {
    if (this.recorder.state !== 'inactive') {
      // Request the last buffered chunk before stopping — this is critical
      // to prevent the final 0-250ms segment from being silently dropped.
      try { this.recorder.requestData(); } catch (_) {}
      this.recorder.stop();
    }
  }

  pause() {
    if (this.recorder.state === 'recording') {
      this.recorder.pause();
    }
  }

  resume() {
    if (this.recorder.state === 'paused') {
      this.recorder.resume();
    }
  }

  getState() {
    return this.recorder ? this.recorder.state : 'inactive';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. RecordingManager (Coordinator)
// ─────────────────────────────────────────────────────────────────────────────
class RecordingManager {
  static isDiscarding = false;
  static isStopping = false;
  static cameraStream = null;
  static recorderWrapper = null;
  static chunkBuffer = null;
  static shadowHost = null;
  static cameraPreviewBubble = null;
  static mimeType = '';

  static async start(options = {}) {
    if (this.recorderWrapper?.getState() === 'recording') return;

    this.isStopping = false;
    this.isDiscarding = false;

    const { format = 'webm', includeMic = true, resolution = 720 } = options;

    try {
      // 1. Capture Media Stream
      this.cameraStream = await MediaStreamManager.getCaptureStreams(resolution, includeMic);

      // 2. Setup UI Bubble (independent of recording lifecycle)
      this.shadowHost = document.createElement('div');
      this.shadowHost.id = 'antcapture-camera-host';
      this.shadowHost.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0; overflow: visible;';
      const shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
      
      this.cameraPreviewBubble = MediaStreamManager.buildPreviewBubble(this.cameraStream);
      shadowRoot.appendChild(this.cameraPreviewBubble);
      document.body.appendChild(this.shadowHost);

      // Guard: if OS-level stream ends unexpectedly (e.g. webcam disconnected)
      // Only auto-stop if WE didn't initiate it. isStopping guard prevents double-stop.
      this.cameraStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (!this.isStopping) this.stop();
      });

      // 3. Resolve Mime Type
      this.mimeType = this.pickMimeType(format);

      // 4. Initialize Buffer and Recorder
      this.chunkBuffer = new ChunkBuffer();
      this.recorderWrapper = new RecorderWrapper(this.cameraStream, this.mimeType);

      // 5. Start Recording Pipeline
      this.recorderWrapper.start(
        250,
        (chunk) => this.chunkBuffer.add(chunk),
        () => {
          // ── onstop handler ──
          // IMPORTANT: Build the blob FIRST, before stopping any streams.
          // The final chunk arrives here from requestData(). Stopping streams
          // before this fires would cause an empty final chunk on some browsers.
          const blob = VideoBuilder.build(this.chunkBuffer.getAll(), this.mimeType);
          this.chunkBuffer.clear();

          const hasAudio = this.cameraStream && this.cameraStream.getAudioTracks().length > 0;

          // NOW it is safe to stop the stream and clean up UI
          MediaStreamManager.stopStreams(this.cameraStream);
          this.cameraStream = null;
          this.teardownUI();
          this.isStopping = false;

          if (this.isDiscarding) {
            log?.info('Camera recording discarded.');
            this.isDiscarding = false;
            return;
          }

          MessageTransferLayer.transfer(blob, resolution, format, this.mimeType, hasAudio);
        }
      );

      log?.info('Camera-only recording started');
      chrome.runtime.sendMessage({ action: 'CAMERA_RECORDING_STARTED', options });

    } catch (err) {
      log?.error('Camera access denied or failed', err);
      chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
    }
  }

  static stop() {
    if (this.isStopping) return;
    if (this.recorderWrapper && this.recorderWrapper.getState() !== 'inactive') {
      this.isStopping = true;
      // ── FIX: Do NOT stop the stream here. ──
      // Stream must remain alive until onstop fires and the blob is assembled.
      // requestData() + stop() is called inside RecorderWrapper.stop() above.
      // Streams are stopped inside the onstop handler instead.
      this.recorderWrapper.stop();
    }
  }

  static pause() {
    this.recorderWrapper?.pause();
  }

  static resume() {
    this.recorderWrapper?.resume();
  }

  static discard() {
    if (this.recorderWrapper) {
      this.isDiscarding = true;
      this.stop();
    }
  }
  
  static teardownUI() {
    // Clean up drag event listeners before removing the element
    if (this.cameraPreviewBubble?._dragCleanup) {
      this.cameraPreviewBubble._dragCleanup();
    }
    if (this.shadowHost && this.shadowHost.parentNode) {
      this.shadowHost.parentNode.removeChild(this.shadowHost);
      this.shadowHost = null;
    }
    this.cameraPreviewBubble = null;
  }

  static pickMimeType(format) {
    const webmCandidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'];
    const candidates = format === 'mp4'
      ? ['video/mp4;codecs=h264,aac', 'video/mp4', ...webmCandidates]
      : webmCandidates;
    let mimeType = 'video/webm';
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) { mimeType = t; break; }
    }
    return mimeType;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export & Message Listener (UI bindings)
// ─────────────────────────────────────────────────────────────────────────────
export function initCameraRecorder() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
      case 'START_CAMERA_RECORDING':
        RecordingManager.start(message.options || {});
        sendResponse({ success: true });
        return true;
      case 'STOP_CAMERA_RECORDING':
        RecordingManager.stop();
        sendResponse({ success: true });
        return true;
      case 'PAUSE_CAMERA_RECORDING':
        RecordingManager.pause();
        sendResponse({ success: true });
        return true;
      case 'RESUME_CAMERA_RECORDING':
        RecordingManager.resume();
        sendResponse({ success: true });
        return true;
      case 'DISCARD_CAMERA_RECORDING':
        RecordingManager.discard();
        sendResponse({ success: true });
        return true;
    }
  });
}
