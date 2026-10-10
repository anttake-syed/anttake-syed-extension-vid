# AntCapture

Screen recording and screenshot capture for Chrome, with a web dashboard for your library and whiteboards.

**Website:** [antcapture.anttake.com](https://antcapture.anttake.com)

**Extension:** [Download from Chrome Web Store](https://chromewebstore.google.com/detail/antcapture-record-sync-to/banjoihieniknhabacbbjnmlmlmcphcg)
## Features

- **Capture** — full-page, region and screen screenshots; screen and camera recording with audio
- **Review & save** — preview and name each capture, then save it locally, to Google Drive, or to AntCapture Cloud
- **Offline first** — captures are stored locally and synced when you're back online
- **Library** — browse, preview, download and delete captures from the web dashboard
- **Whiteboards** — collect and arrange captures on boards
- **Self-hostable** — run the server on your own infrastructure and keep all data yourself

## Repository layout

| Path | What it is |
|---|---|
| `extension/` | Chrome extension (Manifest V3, vanilla JS) |
| `web-ui/` | Web dashboard (React + Vite) |
| `server/` | API server (Node.js + Express) |
| `docs/` | Architecture, deployment and self-hosting guides |

## How it works

```
Chrome extension ──▶ API server ──▶ Database  (SQLite locally / Cloudflare D1 in cloud mode)
Web dashboard   ──▶      │     └──▶ Storage   (local disk, Google Drive, UploadThing / Cloudflare R2)
                         └──────▶ Auth (Google OAuth) · Billing (Lemon Squeezy)
```

See [docs/architecture.md](docs/architecture.md) for details.

## Getting started (local development)

Requirements: Node.js 20+, Chrome.

### 1. Server

```bash
cd server
npm install
cp .env.example .env     # fill in your own values — never commit .env
npm run setup            # creates the local SQLite database
npm run dev              # http://localhost:3001
```

For Google sign-in, create an OAuth client in Google Cloud Console and set
`GOOGLE_REDIRECT_URI=http://localhost:3001/auth/callback`.

### 2. Web dashboard

```bash
cd web-ui
npm install
npm run dev              # http://localhost:5173
```

### 3. Extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder

## Self-hosting

See [docs/self-host.md](docs/self-host.md).

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AntCapture is dual-licensed:

1. **Open source** — [GNU AGPL v3.0](LICENSE). You may use, modify and self-host it; if you offer a modified version as a network service, you must publish your changes under the same license.
2. **Commercial** — for embedding AntCapture in closed-source products or using it without the AGPL obligations. See [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md).

## Trademarks

"AntCapture" and "AntTake" are trademarks of their owner. The AGPL license does not grant rights to these names; distributed forks must use a different name.
