# Deployment Strategy

Our deployment strategy is designed to support both free local users and premium cloud users seamlessly.

## 1. Managed Cloud (Official Hosted Version)
This is the "plug-and-play" version for users who want advanced features without managing servers.
- **Web UI:** Deployed to Vercel (or a similar edge network) under our official domain. The source code comes from the Public Repository.
- **Backend API:** Deployed to a secure server environment from the **Private Repository**. This backend enforces rate limits, manages subscriptions, and connects to premium cloud storage.

## 2. Local Extension-Only (Free)
Users can install the extension directly from the Chrome Web Store. Without ever logging into a backend, the extension operates purely in local mode, processing and saving video files directly to their personal computer.

## 3. Self-Hosted Deployment (Free Advanced)
Advanced users can clone the Public Repository and deploy both the Web UI and the Base Server to their own VPS (e.g., DigitalOcean, Hetzner). The extension can be configured to point to their custom IP/domain, giving them cloud-like features utilizing their own hardware.
