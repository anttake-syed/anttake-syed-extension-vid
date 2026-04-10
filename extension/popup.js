// popup.js
// FIX #1: Removed chrome.tabCapture.capture() entirely from popup.
// tabCapture only works in the background service worker. The popup now
// simply sends messages to background and lets it handle everything.

// FIX #2: Recording state is now loaded from chrome.storage on popup open.
// Previously isRecording was a local variable that reset to false every time
// the popup closed and reopened, causing the button to show the wrong state
// if recording was still active in the background.

document.addEventListener("DOMContentLoaded", () => {
  const recordBtn = document.getElementById("recordBtn");
  const screenshotBtn = document.getElementById("screenshotBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const captureCountBadge = document.getElementById("captureCountBadge");
  const recordBtnText = recordBtn.querySelector(".btn-text");

  // Load initial state from storage
  // FIX #2: Sync both captureCount AND isRecording from storage on load.
  // Previously only captureCount was loaded; isRecording always started false.
  chrome.storage.local.get(["captureCount", "isRecording"], (result) => {
    captureCountBadge.textContent = `Captures: ${result.captureCount || 0}`;
    updateRecordButton(result.isRecording || false);
  });

  // Listen for storage changes to update UI automatically (was already correct)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "local") return;

    if (changes.captureCount) {
      captureCountBadge.textContent = `Captures: ${changes.captureCount.newValue}`;
    }

    // FIX #2 (continued): Also react to isRecording changes from storage,
    // so the button stays in sync even if state changes externally.
    if (changes.isRecording !== undefined) {
      updateRecordButton(changes.isRecording.newValue);
    }
  });

  // FIX #3: Button state is driven entirely by storage, not local variable.
  // We still track it locally for immediate feedback but always confirm
  // via the response from background.
  recordBtn.addEventListener("click", () => {
    // Disable button immediately to prevent double-clicks
    recordBtn.disabled = true;

    chrome.storage.local.get(["isRecording"], (result) => {
      const currentlyRecording = result.isRecording || false;
      const action = currentlyRecording ? "STOP_RECORDING" : "START_RECORDING";

      // FIX #4: Added response callback to handle errors from background.
      // Previously sendMessage had no callback, so failures were silent.
      chrome.runtime.sendMessage({ action }, (response) => {
        recordBtn.disabled = false;

        if (chrome.runtime.lastError) {
          console.error("Message failed:", chrome.runtime.lastError.message);
          return;
        }

        if (!response?.success) {
          console.error("Recording action failed:", response?.error);
          // FIX #5: Show user-visible feedback on failure
          recordBtnText.textContent = "Error — try again";
          setTimeout(() => updateRecordButton(currentlyRecording), 2000);
          return;
        }

        // Storage update from background will trigger onChanged above
        // which will update the button state automatically
      });
    });
  });

  screenshotBtn.addEventListener("click", () => {
    // FIX #6: Added response handler for screenshot feedback.
    // Previously sendMessage had no callback, so success/failure was invisible.
    screenshotBtn.disabled = true;
    const originalText = screenshotBtn.querySelector(".btn-text").textContent;

    chrome.runtime.sendMessage({ action: "TAKE_SCREENSHOT" }, (response) => {
      screenshotBtn.disabled = false;

      if (chrome.runtime.lastError || !response?.success) {
        screenshotBtn.querySelector(".btn-text").textContent = "Failed!";
      } else {
        screenshotBtn.querySelector(".btn-text").textContent = "Saved!";
      }

      // Reset button text after 1.5s
      setTimeout(() => {
        screenshotBtn.querySelector(".btn-text").textContent = originalText;
      }, 1500);
    });
  });

  settingsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  // Helper to update record button appearance based on recording state
  function updateRecordButton(isRecording) {
    recordBtnText.textContent = isRecording ? "Stop Recording" : "Record Screen";
    recordBtn.querySelector(".btn-icon").textContent = isRecording ? "⏹" : "⏺";
    recordBtn.classList.toggle("recording", isRecording);
  }
});