// background/notify.js — AntCapture
// Creates a Chrome notification and aggressively auto-clears it.
// Uses both a short timeout AND the onClicked event to ensure it never sticks.

export function notify(id, title, message) {
  // Clear any existing notification with the same ID first (prevents stuck toasts)
  chrome.notifications.clear(id, () => {
    chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title,
      message,
      priority: 0,           // low priority — less sticky
      requireInteraction: false,
      silent: true,          // no sound — less intrusive
    });

    // Auto-dismiss after 3.5 seconds (clear twice to handle Linux Chrome quirk)
    setTimeout(() => chrome.notifications.clear(id), 3500);
    setTimeout(() => chrome.notifications.clear(id), 5000); // safety net
  });
}

// Auto-dismiss any notification when the user clicks it
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.notifications.clear(notificationId);
});
