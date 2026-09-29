# Deployment

## Hosted service

- **Web dashboard** (`web-ui/`) — deployed to Vercel as a static SPA.
- **API server** (`server/`) — deployed to Vercel as a Node.js function. Each build runs `server/scripts/migrate-d1.js`, which applies pending migrations to Cloudflare D1.
- **Secrets** — configured only as Vercel environment variables (see `server/.env.example` for the list). They are never committed to the repository; a secret-scanning check runs on every pull request.

## Extension only

The extension works without an account: captures are saved on the user's computer.

## Self-hosted

Run the server and dashboard on your own machine or VPS and point the extension at your server. See [self-host.md](self-host.md).
