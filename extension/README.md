# AntCapture Extension — Standalone Usage

The extension works **completely standalone** — no build step, no npm, no codebase required.

## Quick Start (from zip)

1. Download the latest `antcapture-extension.zip` from [GitHub Releases](https://github.com/anttake-syed/anttake-syed-extension-vid/releases)
2. Unzip it anywhere on your computer
3. Open Chrome → go to `chrome://extensions`
4. Enable **Developer Mode** (top-right toggle)
5. Click **"Load unpacked"** → select the unzipped folder
6. The AntCapture icon appears in your toolbar — done ✅

## Storage Modes

Click the extension icon, then choose a Storage Mode from the dropdown:

| Icon | Mode | How it works |
|------|------|--------------|
| `save_alt` | **Save to Computer** | Files download directly to your PC. No server needed. Works offline. |
| `cloud_sync` | **Web + Google Drive** | Requires the cloud dashboard at `antcapture.anttake.com`. Files go to Google Drive. |
| `dns` | **Local Web UI (Self-Hosted)** | Requires the server + web-ui running locally. See below. |

## Self-Hosted Local Mode

1. Clone the full repo and follow `README.md` setup
2. Start the server: `cd server && npm start`
3. Start the dashboard: `cd web-ui && npm run dev:local`
4. In the extension, set mode to **"Local Web UI (Self-Hosted)"**
5. Sign in — captures will sync to your local SQLite dashboard

## Changing Server URLs

If you host the server on a different port or domain, edit `config.js`:

```js
export const DEV_SERVER_URL  = 'http://localhost:3001';   // local mode server
export const PROD_SERVER_URL = 'https://your-api.com';    // cloud mode server
export const DEV_WEB_UI_URL   = 'http://localhost:5173';   // local dashboard
export const PROD_WEB_UI_URL  = 'https://your-ui.com';     // cloud dashboard
```

Then reload the extension in `chrome://extensions`.
