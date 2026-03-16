# AntCapture - Premium Media Recording & Cloud Sync

AntCapture is a high-performance browser extension and web platform designed for seamless screen/video capture and instant cloud synchronization. It features a premium glassmorphic UI, robust offline support, and automated uploads to Google Drive, YouTube, and Facebook.

## 🚀 Key Features
- **Premium Capture**: High-quality video (720p/1080p/4K) and screenshot capture via MediaRecorder API.
- **Instant Cloud Sync**: Automatic background upload to Google Drive.
- **Offline Reliability**: Automated local caching in `IndexedDB` with background resync once the network is restored.
- **Management Dashboard**: A centralized Web UI to browse, manage, and share your cloud-stored media.
- **Social Integration**: One-click sharing to YouTube and Facebook.

## 🛠 Tech Stack
- **Extension**: Vite + React + Vanilla CSS (Custom Glassmorphic System) + Lucide Icons.
- **Web UI**: Vite + React + Vanilla CSS (Modern Design Tokens).
- **Backend**: Node.js + Express + Multer + Googleapis.
- **Database/Storage**: IndexedDB (Local) + Google Drive (Cloud).

---

## 👥 Balanced Work Division (Resume & Portfolio Strategy)
To ensure both developers (You & Your Brother) can showcase deep technical "core" knowledge and "UX" design skills in future interviews, the work is divided strategically:

### **Developer 1: Extension Engine & Offline Architecture (User)**
*Focus: Client-side systems engineering and Premium UI.*
- **[CORE] Media Engine**: Implementing the MediaRecorder API and tab/desktop capture orchestration.
- **[CORE] Sync Architecture**: Designing the IndexedDB storage layer and the background "Wait-for-Online" sync manager.
- **[UX/UI] Extension Interface**: Building the premium, glassmorphic popup and overlay experience.

### **Developer 2: Cloud Cloud Bridge & Security (Brother)**
*Focus: Server-side infrastructure, Global APIs, and Dashboard Experience.*
- **[CORE] Cloud Identity**: Implementing OAuth 2.0 flows and secure token management for Google/Social Media.
- **[CORE] Media Bridge**: Building the Express backend that streams chunks directly to Google Drive/YouTube.
- **[UX/UI] Web Dashboard**: Designing the React-based library management system and media grid.

---

## 🌿 Git Workflow & Best Practices

### **Is a new branch good?**
**Yes!** Creating a new branch for every feature or significant change is the standard industry practice. It allows you to:
1.  **Work Safely**: Changes don't break the `main` code until they are tested.
2.  **Code Review**: Your brother can review your code (and vice-versa) before merging, improving project quality for both portfolios.
3.  **Organization**: Keeps the history clear and easy to follow.

### **Collaboration Commands**
1.  **Start a new feature:**
    ```bash
    git checkout -b feature/your-feature-name
    ```
2.  **Save your work:**
    ```bash
    git add .
    git commit -m "feat: [brief description of what you did]"
    ```
3.  **Push to Share:**
    ```bash
    git push origin feature/your-feature-name
    ```
4.  **Merge Request**: On GitHub/GitLab, click "Compare & pull request" to ask your brother to merge your code.

---

## 📦 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file based on .env.example
npm start
```

### 2. Extension Setup
```bash
cd extension
# Load the 'extension' folder as an Unpacked Extension in Chrome
```

### 3. Web UI Setup
```bash
cd web-ui
npm install
npm run dev
```