# Architecture Overview

AntCapture follows an **Open Core** architectural model, separating the public open-source offering from the managed Cloud offering via two distinct repositories.

## 1. Public Repository (Open Source & Self-Hosted)
This repository contains the foundational elements of AntCapture:
- **Chrome Extension**: The client-side recording tool.
- **Web UI**: The React-based dashboard.
- **Base Server**: A lightweight Node.js/Prisma server for local or self-hosted media storage.

**Use Cases:**
- **Local Mode:** Users can just download the extension to capture and save directly to their computer (no backend needed).
- **Self-Hosted Mode:** Users can self-host the Web UI and Server to unlock advanced dashboard functionality for free on their own infrastructure.

## 2. Private Repository (Cloud & Premium Features)
A separate, closed-source repository holds the premium backend services.
- **Billing & Subscriptions**: Payment integration and tier management.
- **Advanced Rate Limiting**: Traffic management for cloud users to prevent abuse.
- **Pro Features**: Premium cloud storage connections, team collaboration, etc.

## The Cloud Pipeline
When a user accesses the officially hosted domain (e.g., `antcapture.anttake.com`), the Public Web UI interacts with the **Private Backend API**. This enables the Open Core model: the UI and Extension remain open-source, but the infrastructure handling paid cloud processing remains securely closed.
