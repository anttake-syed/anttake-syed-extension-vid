const toggle = document.getElementById('devModeToggle');
const status = document.getElementById('status');

chrome.storage.local.get(['devMode'], (result) => {
  toggle.checked = result.devMode || false;
  updateLabels(toggle.checked);
});

toggle.addEventListener('change', () => {
  const devMode = toggle.checked;
  chrome.storage.local.set({ devMode }, () => {
    updateLabels(devMode);
    status.textContent = 'Saved!';
    setTimeout(() => { status.textContent = ''; }, 1500);
  });
});

function updateLabels(devMode) {
  document.getElementById('backendLabel').textContent = devMode
    ? 'http://localhost:3001'
    : 'https://api.antcapture.anttake.com';
  document.getElementById('webUiLabel').textContent = devMode
    ? 'http://localhost:3000'
    : 'https://antcapture.anttake.com';
}
