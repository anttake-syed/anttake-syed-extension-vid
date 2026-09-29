# Self-Hosting

You can run the full AntCapture stack yourself. In `local` mode the server uses SQLite and stores files on disk, and there is no paywall.

## 1. Run the server

```bash
cd server
npm install
cp .env.example .env     # keep SERVER_MODE=local; add your own Google OAuth client and JWT_SECRET
npm run setup            # creates the SQLite database
npm start                # http://localhost:3001
```

> Local mode trusts the machine it runs on. Don't expose it to the public internet without putting authentication in front of it.

## 2. Run the dashboard

```bash
cd web-ui
npm install
npm run dev              # http://localhost:5173
```

## 3. Point the extension at your server

- **Same machine:** in the extension's Options, choose **Local Web UI (Self-Hosted)**. It uses `http://localhost:3001` and `http://localhost:5173`.
- **Your own domain:** set `PROD_SERVER_URL` and `PROD_WEB_UI_URL` in `extension/shared/config.js`, then load the extension unpacked from `chrome://extensions`.

## Storage

Files are stored under `server/uploads/` by default. Other providers (Google Drive, UploadThing, Cloudflare R2) are available in `server/src/providers/` and are configured through environment variables — see `server/.env.example`.
