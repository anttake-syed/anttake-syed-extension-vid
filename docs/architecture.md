# Architecture Overview

AntCapture is a single open-source repository with three parts. The same code runs the hosted service and self-hosted installs; behaviour is chosen by environment variables, and all secrets live only in the deployment environment.

## Components

| Component | Path | Role |
|---|---|---|
| Chrome extension | `extension/` | Captures screenshots and recordings, stores them locally (OPFS/IndexedDB), and uploads them to the server |
| Web dashboard | `web-ui/` | React app for the library, whiteboards, settings and billing |
| API server | `server/` | Express API: auth, captures, boards, storage, subscriptions |

## Server modes

`SERVER_MODE` selects the database and storage:

- **`local`** — SQLite via Prisma, files on local disk. Intended for development and single-user self-hosting.
- **`cloud`** — Cloudflare D1 (over HTTP) for data, UploadThing / Cloudflare R2 for files. Used by the hosted service.

Storage backends are pluggable (`server/src/providers/`): local disk, self-hosted, Google Drive, UploadThing and Cloudflare R2.

## Auth

Users sign in with Google OAuth. The server issues a signed JWT used by both the extension and the dashboard. Admin rights are read from the database on every request.

## Billing

The hosted service uses Lemon Squeezy. Checkout is created by the server, subscription changes arrive via a signed webhook, and paid features are enforced server-side. Self-hosted installs in `local` mode have no paywall.

## Data flow

1. The extension captures media and keeps a local copy.
2. On save, it uploads to the server (or directly to cloud storage with a server-issued upload).
3. The server records metadata in the database and the file location in storage.
4. The dashboard reads the same API to show the library.
