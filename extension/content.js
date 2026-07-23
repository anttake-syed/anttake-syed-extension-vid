// content.js — AntCapture (Content Script Entry Point)
// ─────────────────────────────────────────────────────────────────────────────
// This file is intentionally small. All feature logic lives in content/ modules:
//
//   content/authSync.js        — bi-directional auth sync with the Web UI
//   content/regionSelect.js    — drag-to-select overlay for region screenshots
//   content/webcamBubble.js    — floating webcam preview (overlay recording mode)
//   content/cameraRecorder.js  — camera-only recording (runs in foreground tab)
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: content.js is a plain (non-module) script injected by manifest.json.
// ES "import" statements are NOT available here — we use IIFE guards instead
// and inline the module initializers via importScripts-style dynamic loading
// or by bundling. Because Chrome MV3 content scripts can't use ES modules
// directly via manifest injection, we use a single-guard IIFE and load the
// modules with chrome.runtime.getURL + dynamic <script type=module> injection.
// ─────────────────────────────────────────────────────────────────────────────

(async function antCaptureContent() {
  // Prevent double-injection when chrome.scripting.executeScript is called
  // programmatically on top of the manifest-level injection.
  if (window._antCaptureInjected) return;
  window._antCaptureInjected = true;

  // Dynamically import the content modules as ES modules.
  // This works in MV3: content scripts can import() using the extension URL.
  const base = chrome.runtime.getURL('content/');

  const [
    { initAuthSync },
    { initRegionSelect },
    { initWebcamBubble },
    { initCameraRecorder },
    { initRecordingHUD },
  ] = await Promise.all([
    import(base + 'authSync.js'),
    import(base + 'regionSelect.js'),
    import(base + 'webcamBubble.js'),
    import(base + 'cameraRecorder.js'),
    import(base + 'recordingHUD.js'),
  ]);

  // Boot every feature module
  initAuthSync();
  initRegionSelect();
  initWebcamBubble();
  initCameraRecorder();
  initRecordingHUD();
})();
