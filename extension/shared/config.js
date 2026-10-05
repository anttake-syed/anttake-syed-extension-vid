// Server and dashboard URLs. Self-hosters: change the PROD_* values to your own domains.

export const DEV_SERVER_URL  = 'http://localhost:3001';
export const PROD_SERVER_URL = 'https://api.antcapture.anttake.com';
export const DEV_WEB_UI_URL   = 'http://localhost:5173';
export const PROD_WEB_UI_URL  = 'https://antcapture.anttake.com';

// Chrome Web Store installs have an update_url; unpacked (developer) installs don't.
// Self-hosted / localhost mode is only offered to unpacked installs.
export function isUnpackedInstall() {
  return !('update_url' in chrome.runtime.getManifest());
}
