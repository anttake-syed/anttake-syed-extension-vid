// offscreen.js
// FIX #1: Removed chrome.tabCapture.capture() call entirely from here.
// tabCapture does NOT work in offscreen documents — only in the background
// service worker. The background now calls getMediaStreamId() and passes
// the ID here via message. We use getUserMedia() with chromeMediaSourceId
// to reconstruct the stream from that ID.

// FIX #2: Removed `async` from the message listener.
// Same issue as background.js — async listeners don't keep the channel open.
// We dispatch to async handlers manually instead.

// FIX #10: Added saveMediaLocally import to wire video into the sync pipeline.
// Previously, recorded video was only downloaded locally and never saved to
// IndexedDB, meaning it was completely excluded from the cloud sync pipeline
// that screenshots used. Now video goes through the same path.
import { saveMediaLocally } from "./storage.js";

chrome.runtime.onMessage.addListener((message) => {
  // FIX #3: Guard correctly — ignore messages not targeting offscreen
  if (message.target !== "offscreen") return;

  // FIX #4: Listen for `action` field consistently (was previously checking
  // both `message.action` and `message.type` inconsistently across files).
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
    console.error("No streamId provided to offscreen — cannot start recording");
    return;
  }

  try {
    // FIX #5: Use getUserMedia with chromeMediaSourceId to reconstruct stream.
    // This is the correct way to consume a transferable stream ID from
    // getMediaStreamId(). The old code tried to call tabCapture.capture()
    // here which is not allowed in offscreen documents.
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
    data = []; // Reset data buffer for new recording session

    recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) data.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(data, { type: "video/webm" });

      // FIX #10: Save video to IndexedDB so sync manager picks it up.
      // Previously video was only downloaded — it never entered the upload
      // pipeline. Now it matches the same flow as screenshots.
      try {
        await saveMediaLocally(blob, "video");
        console.log("Video saved locally for sync");
      } catch (err) {
        console.error("Failed to save video locally:", err);
      }

      // Also trigger a direct download as before
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capture-${Date.now()}.webm`;
      a.click();

      // FIX #11: Increment captureCount for video too, not just screenshots.
      // Previously only screenshots updated the badge count in the popup.
      chrome.storage.local.get(["captureCount"], (result) => {
        const count = (result.captureCount || 0) + 1;
        chrome.storage.local.set({ captureCount: count });
      });

      // Clean up
      currentStream.getTracks().forEach((t) => t.stop());
      data = [];
      currentStream = null;

      // FIX #12: Update persisted recording state when recording actually ends.
      // The stop can happen internally (e.g. stream ends), not just via button.
      chrome.storage.local.set({ isRecording: false });
    };

    recorder.start();
    console.log("Recording started");
  } catch (err) {
    console.error("Failed to start recording:", err);
    // Clean up state if startup failed
    chrome.storage.local.set({ isRecording: false });
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