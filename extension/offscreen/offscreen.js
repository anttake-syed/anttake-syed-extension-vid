// offscreen.js — AntCapture
import { saveMediaLocally } from '../storage/storage.js';
import { Logger } from '../shared/logger.js';
import { OPFSWriter, isOPFSSupported, deleteOPFSFile } from '../storage/opfsStorage.js';

const log = Logger.getLogger('Offscreen Recorder');

// ─────────────────────────────────────────────────────────────────────────────
// 1. MediaStreamManager (Capture Layer)
// ─────────────────────────────────────────────────────────────────────────────
class MediaStreamManager {
  static async getCaptureStreams(mode, resolution, includeMic, includeSystemAudio = true) {
    const height = resolution === 720 ? 720 : 1080;

    const displayConstraints = {
      video: {
        displaySurface: mode === 'tab' ? 'browser' : 'monitor',
        height: { ideal: height },
        frameRate: { ideal: 30 }
      },
      audio: includeSystemAudio,
    };

    let finalStream;
    try {
      finalStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);
    } catch (primaryErr) {
      if (primaryErr.name === 'NotAllowedError') throw primaryErr;
      log.warn('AntCapture: primary getDisplayMedia failed, retrying minimal:', primaryErr.name);
      try {
        finalStream = await navigator.mediaDevices.getDisplayMedia({
          video: { height: { ideal: height }, frameRate: { ideal: 30 } },
          audio: includeSystemAudio,
        });
      } catch (_) { throw primaryErr; }
    }

    const activeStreams = [finalStream];

    // ── Always create an AudioContext mixer ─────────────────────────────────────
    // We ALWAYS route audio through Web Audio API, even when mic starts OFF.
    // This way the MediaRecorder always has a live audio destination, so we can
    // connect or disconnect a mic source at any time mid-recording.
    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      log.warn('AudioContext is suspended, attempting to resume...');
      await audioCtx.resume();
    }
    const dest = audioCtx.createMediaStreamDestination();

    // ── Chrome Bug Workaround: Force Audio Processing ──
    // If an AudioContext destination has no active inputs, Chrome optimizes it by
    // stalling the track. This causes the MediaRecorder to stall waiting for audio
    // chunks, resulting in a 0-byte video file. We attach a completely silent
    // oscillator to force the audio graph to continuously output audio data.
    const silentOsc = audioCtx.createOscillator();
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0; // absolute silence
    silentOsc.connect(silentGain);
    silentGain.connect(dest);
    silentOsc.start();

    let micNode = null;
    let micStream = null;

    // Connect system audio into the mix (if captured)
    const sysAudioTracks = finalStream.getAudioTracks();
    if (sysAudioTracks.length > 0) {
      const sysSource = audioCtx.createMediaStreamSource(new MediaStream([sysAudioTracks[0]]));
      sysSource.connect(dest);
      sysAudioTracks.forEach(t => finalStream.removeTrack(t));
    }

    // Connect mic into the mix (if enabled at start)
    if (includeMic) {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        activeStreams.push(micStream);
        micNode = audioCtx.createMediaStreamSource(micStream);
        micNode.connect(dest);
      } catch (err) {
        log.warn('Microphone not available (continuing without mic)', err.name, err.message);
      }
    }

    // Always add the mixed audio track so MediaRecorder has an audio channel
    // (even if currently silent — sources can be connected later mid-recording)
    finalStream.addTrack(dest.stream.getAudioTracks()[0]);

    return { finalStream, activeStreams, audioCtx, dest, micNode, micStream };
  }

  static stopStreams(streams) {
    if (!streams) return;
    streams.forEach(s => s.getTracks().forEach(t => t.stop()));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ChunkBuffer — in-memory fallback for browsers without OPFS support
//    Used only when navigator.storage.getDirectory() is unavailable.
//    For all modern Chrome / Chromium / Brave builds, OPFSWriter is used instead.
// ─────────────────────────────────────────────────────────────────────────────
class ChunkBuffer {
  constructor() { this.chunks = []; }
  add(chunk) { if (chunk && chunk.size > 0) this.chunks.push(chunk); }
  getAll() { return this.chunks; }
  clear() { this.chunks = []; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VideoBuilder
// ─────────────────────────────────────────────────────────────────────────────
class VideoBuilder {
  static build(chunks, mimeType) {
    if (!chunks || chunks.length === 0) return new Blob([], { type: mimeType });
    return new Blob(chunks, { type: mimeType });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. StorageLayer
// ─────────────────────────────────────────────────────────────────────────────
class StorageLayer {
  /**
   * Save a completed recording.
   *
   * @param {string|null} opfsFileName  - OPFS file name (preferred, no RAM needed)
   * @param {Blob|null}   fallbackBlob  - In-memory blob (only used if OPFS unavailable)
   * @param {number}      resolution
   * @param {string}      format        - Short format: 'webm' or 'mp4'
   * @param {string}      mimeType      - Full MIME type with codecs e.g. 'video/webm;codecs=vp8,opus'
   * @param {boolean}     hasAudio
   * @param {string}      tabTitle
   */
  static async save(opfsFileName, fallbackBlob, resolution, format, mimeType, hasAudio, tabTitle) {
    // Determine the effective size for logging
    const size = opfsFileName ? 'OPFS file' : `${((fallbackBlob?.size || 0) / 1024 / 1024).toFixed(1)} MB blob`;
    log.info('StorageLayer.save called', `opfs=${opfsFileName} size=${size}`);

    // Validate we have something to save
    if (!opfsFileName && (!fallbackBlob || fallbackBlob.size === 0)) {
      log.warn('AntCapture: nothing to save — recording was empty or too short');
      chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'empty_blob' });
      return;
    }

    try {
      // Save METADATA to IndexedDB. If opfsFileName is set, NO blob is stored here.
      // This avoids IndexedDB quota errors entirely for normal recordings.
      const itemId = await saveMediaLocally(
        fallbackBlob || null,  // blob — null for OPFS recordings (stored on disk)
        'video',
        'preview',
        resolution,
        format,
        hasAudio,
        tabTitle || 'Screen Recording',
        opfsFileName || null,  // tells storage layer where the video data is
        mimeType || null       // full codec MIME type for faithful playback
      );
      log.info('AntCapture: metadata saved to IndexedDB', `id=${itemId} opfs=${opfsFileName}`);
      chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE_FOR_VIDEO', itemId: String(itemId) });

    } catch (err) {
      log.error('AntCapture: IndexedDB metadata save failed.', err);

      // Even if IndexedDB fails, the OPFS file still exists on disk.
      // Open edit.html directly with the OPFS filename so data is NOT lost.
      if (opfsFileName) {
        const params = new URLSearchParams({
          opfs:       opfsFileName,
          format:     format || 'webm',
          mimeType:   mimeType || '',
          resolution: String(resolution || 1080),
          hasAudio:   String(hasAudio),
          tabTitle:   tabTitle || ''
        });
        chrome.runtime.sendMessage({
          action: 'OPEN_EDIT_PAGE_OPFS',
          queryString: params.toString()
        });
      } else if (fallbackBlob) {
        // Absolute last resort: in-memory blob URL via background worker
        const fallbackId = 'fallback_' + Date.now();
        const blobUrl    = URL.createObjectURL(fallbackBlob);
        chrome.runtime.sendMessage({
          action: 'SAVE_FALLBACK_BLOB',
          id:     fallbackId,
          item:   { blobUrl, type: 'video', resolution, format, hasAudio, tabTitle, mimeType: fallbackBlob.type }
        }, () => {
          chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE_FOR_VIDEO', itemId: fallbackId });
        });
      } else {
        chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'save_failed' });
      }
    }
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
    // Wrap async onstop in a catch so silent promise rejections never hide bugs
    this.recorder.onstop = () => Promise.resolve(onStop()).catch(err => {
      log.error('AntCapture: onstop handler threw', err);
      chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'save_failed' });
    });
    this.recorder.start(timeslice);
  }

  stop() {
    if (this.recorder.state !== 'inactive') {
      try { this.recorder.requestData(); } catch (e) {}
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
  static isDiscarding   = false;
  static isStopping     = false;
  static activeStreams  = [];
  static recorderWrapper = null;
  static opfsWriter     = null;
  static chunkBuffer    = null;
  static mimeType       = '';
  static resolvedFormat = '';
  // ── Live mic toggle refs ────────────────────────────────────────────────────
  static audioCtx       = null;  // shared AudioContext for this session
  static audioDest      = null;  // MediaStreamDestination node mixed into recorder
  static micStream      = null;  // raw mic MediaStream (null if not yet acquired)
  static micNode        = null;  // AudioContext source node for the mic

  static async start(options = {}) {
    if (this.recorderWrapper?.getState() === 'recording') return;

    this.isStopping = false;
    this.isDiscarding = false;

    const { mode = 'screen', resolution = 720, includeMic = true, includeSystemAudio = true, format = 'webm', tabTitle = '' } = options;

    if (mode === 'camera') {
      chrome.runtime.sendMessage({ action: 'START_CAMERA_IN_TAB', options });
      return;
    }

    try {
      // 1. Capture Media Streams
      const { finalStream, activeStreams, audioCtx, dest, micNode, micStream } =
        await MediaStreamManager.getCaptureStreams(mode, resolution, includeMic, includeSystemAudio);
      this.activeStreams = activeStreams;
      this.audioCtx     = audioCtx;
      this.audioDest    = dest;
      this.micNode      = micNode;
      this.micStream    = micStream;

      const hasAudio = finalStream.getAudioTracks().length > 0;

      finalStream.getVideoTracks()[0].addEventListener('ended', () => {
        if (!this.isStopping) this.stop();
      });

      // 2. Resolve Mime Type
      const { mimeType, resolvedFormat } = this.pickMimeType(format);
      this.mimeType        = mimeType;
      this.resolvedFormat  = resolvedFormat;
      if (resolvedFormat !== format) {
        chrome.runtime.sendMessage({ action: 'FORMAT_FALLBACK', requested: format, actual: resolvedFormat });
      }

      // 3. Initialise storage for chunks
      //    PREFERRED: OPFSWriter — streams each 250ms chunk straight to disk.
      //               No RAM accumulation. No quota errors. Handles any duration.
      //    FALLBACK:  ChunkBuffer — in-memory array for old/unsupported builds.
      const useOPFS = isOPFSSupported();
      if (useOPFS) {
        this.opfsWriter  = new OPFSWriter();
        this.chunkBuffer = null;
        try {
          await this.opfsWriter.init();
          log.info('AntCapture: OPFS writer ready — chunks will stream to disk');
        } catch (opfsErr) {
          log.warn('AntCapture: OPFS init failed, falling back to in-memory buffer', opfsErr);
          this.opfsWriter  = null;
          this.chunkBuffer = new ChunkBuffer();
        }
      } else {
        log.warn('AntCapture: OPFS not available, using in-memory buffer');
        this.opfsWriter  = null;
        this.chunkBuffer = new ChunkBuffer();
      }

      // 4. Create recorder
      this.recorderWrapper = new RecorderWrapper(finalStream, this.mimeType);

      // 5. Start recording pipeline
      this.recorderWrapper.start(
        250, // timeslice in ms — each chunk goes straight to disk via OPFSWriter
        (chunk) => {
          if (this.opfsWriter) {
            this.opfsWriter.writeChunk(chunk);  // disk, no RAM accumulation
          } else {
            this.chunkBuffer.add(chunk);        // memory fallback
          }
        },
        async () => {
          // ── onstop handler ──
          let opfsFileName = null;
          let fallbackBlob = null;
          let bytesWritten = 0;

          if (this.opfsWriter) {
            try {
              const result = await this.opfsWriter.finalize();
              opfsFileName = result.fileName;
              bytesWritten = result.totalBytes;
              log.info(`Recording finalised: ${(bytesWritten / 1024 / 1024).toFixed(1)} MB written to OPFS`);
            } catch (e) {
              log.error('OPFS finalize failed — falling back to memory blob', e);
              this.opfsWriter = null;
            }
          }

          if (!opfsFileName && this.chunkBuffer) {
            // Memory fallback path
            fallbackBlob = VideoBuilder.build(this.chunkBuffer.getAll(), this.mimeType);
            bytesWritten = fallbackBlob.size;
            this.chunkBuffer.clear();
          }

          // Release hardware streams AFTER finalising the file
          MediaStreamManager.stopStreams(this.activeStreams);
          this.activeStreams = [];
          // Close the AudioContext so the OS releases the mic hardware
          if (this.audioCtx) { this.audioCtx.close().catch(() => {}); }
          this.audioCtx = null; this.audioDest = null;
          this.micNode  = null; this.micStream = null;
          this.isStopping = false;

          if (this.isDiscarding) {
            this.isDiscarding = false;
            // Clean up OPFS file — we don't want it lingering on disk
            if (opfsFileName) await deleteOPFSFile(opfsFileName);
            return;
          }

          // ── P0: Validation ──
          // Never allow a 0-byte capture to reach Edit.html or IndexedDB
          if (bytesWritten === 0) {
            log.error('Recording finalization produced 0 bytes of video data (pipeline stall).');
            if (opfsFileName) await deleteOPFSFile(opfsFileName);
            chrome.runtime.sendMessage({ action: 'OPEN_EDIT_PAGE', error: 'empty_blob' });
            return;
          }

          StorageLayer.save(opfsFileName, fallbackBlob, resolution, this.resolvedFormat, this.mimeType, hasAudio, tabTitle);
        }
      );

      log.info(`AntCapture recording started — mode:${mode} res:${resolution}p format:${format}`);
      chrome.runtime.sendMessage({ action: 'OFFSCREEN_RECORDING_STARTED', options });

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        // User pressed Cancel on the screen-share picker — not a bug, just noise.
        log.warn('Recording cancelled by user (screen share dialog dismissed)');
      } else {
        log.error('Recording start failed', err.name, err.message, err);
      }
      MediaStreamManager.stopStreams(this.activeStreams);
      chrome.runtime.sendMessage({ action: 'EXTERNAL_STOP_RECORDING' });
    }
  }

  static stop() {
    if (this.isStopping) return;
    if (this.recorderWrapper && this.recorderWrapper.getState() !== 'inactive') {
      this.isStopping = true;
      // Do NOT send EXTERNAL_STOP_RECORDING here.
      // That action tells background the recording crashed unexpectedly.
      // Normal stop is handled by the pendingEditId storage signal.
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

  static pickMimeType(preferredFormat) {
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

  // ── Live mic toggle ─────────────────────────────────────────────────────────
  // Called mid-recording when the user clicks the mic button in the HUD.
  static async toggleMicLive(on) {
    if (!this.audioCtx || !this.audioDest) {
      log.warn('toggleMicLive: no active AudioContext');
      return { success: false, reason: 'no_audio_context' };
    }
    if (on) {
      if (this.micNode) return { success: true, alreadyOn: true };
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const node = this.audioCtx.createMediaStreamSource(ms);
        node.connect(this.audioDest);
        this.micStream = ms;
        this.micNode   = node;
        this.activeStreams.push(ms);
        log.info('Live mic connected mid-recording');
        return { success: true };
      } catch (err) {
        log.error('Failed to acquire mic mid-recording', err.name, err.message);
        return { success: false, reason: err.name };
      }
    } else {
      if (this.micNode) { try { this.micNode.disconnect(); } catch (_) {} this.micNode = null; }
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.activeStreams = this.activeStreams.filter(s => s !== this.micStream);
        this.micStream = null;
      }
      log.info('Live mic disconnected mid-recording');
      return { success: true };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Message Listener (UI bindings)
// ─────────────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'offscreen') return;

  switch (message.type) {
    case 'start-recording':
      RecordingManager.start(message.options || {});
      break;
    case 'stop-recording':
      RecordingManager.stop();
      break;
    case 'toggle-mic-live':
      RecordingManager.toggleMicLive(message.on === true).then(result => {
        log.info('toggleMicLive result', JSON.stringify(result));
      });
      break;
    case 'pause-recording':
      RecordingManager.pause();
      break;
    case 'resume-recording':
      RecordingManager.resume();
      break;
    case 'discard-recording':
      RecordingManager.discard();
      break;
    case 'revoke-blob-url':
      if (message.url) {
        URL.revokeObjectURL(message.url);
        log.info('Revoked fallback blob URL to free memory', message.url);
      }
      break;
  }
});
