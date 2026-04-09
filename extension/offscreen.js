// offscreen.js
// Handles recording logic inside offscreen document
// Receives streamId from background and records video
// Sends final dataUrl to background for saving and cleanup

import { saveMediaLocally } from "./storage.js";

chrome.runtime.onMessage.addListener((message) => {
  // Only handle messages targeting offscreen
  if (message.target !== "offscreen") return;

  // Dispatch to appropriate handler
  if (message.action === "START_RECORDING") {
    startRecording(message.streamId);
  } else if (message.action === "STOP_RECORDING") {
    stopRecording();
  }
});

let recorder;
let data = [];
let currentStream;

async function startRecording(streamId) {
  if (recorder?.state === "recording") {
    console.warn("Already recording, ignoring START_RECORDING");
    return;
  }

  if (!streamId) {
    console.error("No streamId provided — cannot start recording");
    chrome.runtime.sendMessage({ action: "RECORDING_FAILED" });
    return;
  }

  try {
    // Use getUserMedia with chromeMediaSourceId to reconstruct stream.
    // This is the correct way to consume a transferable stream ID from
    // getMediaStreamId(). Offscreen cannot call tabCapture.capture().
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    currentStream = stream;
    data = [];

    recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) data.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(data, { type: "video/webm" });

      // Save to IndexedDB for sync
      try {
        await saveMediaLocally(blob, "video");
        console.log("Video saved locally for sync");
      } catch (err) {
        console.error("Failed to save video locally:", err);
      }

      // Convert blob to base64 for background to handle Save As dialog
      const dataUrl = await blobToDataUrl(blob);

      // Stop tracks & cleanup before messaging background
      currentStream.getTracks().forEach((t) => t.stop());
      data = [];
      currentStream = null;
      recorder = null;

      // Send completed recording to background
      chrome.runtime.sendMessage({
        action: "RECORDING_COMPLETE",
        dataUrl,
        filename: `recording-${Date.now()}.webm`,
      });
    };

    recorder.start();
    console.log("Recording started");
  } catch (err) {
    console.error("Failed to start recording:", err);
    chrome.runtime.sendMessage({ action: "RECORDING_FAILED" });
  }
}

function stopRecording() {
  if (!recorder || recorder.state !== "recording") {
    console.warn("No active recording to stop");
    return;
  }

  try {
    recorder.stop();
    console.log("Recording stopped");
  } catch (err) {
    console.error("Failed to stop recording:", err);
  }
}

// Helper: convert Blob to base64 data URL via Promise
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}