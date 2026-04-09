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

# Extension

## 1. Logic
- **Screenshot Logic & Implementation** – Saleh
- **Video Recording & Audio Capture Logic** – Brother  

## 2. UI
*(Note: To prevent AI merge conflicts, maintain separate components/files for your respective UI sections).*
- Design and implement the primary extension popup/toolbar framework – Saleh
- Integrate buttons for **Screenshot, Start/Stop Recording, Audio toggle** – Brother
- Build the Feedback / Toast notifications system – Saleh
  - Example: Notify user via email if drive is full

## 3. Backend Integration
- Connect frontend to backend **via API**:
  - `/auth/google` → Trigger Google OAuth flow – Saleh
  - `/upload/drive` → Upload captured content – Brother
    - Google Console Setup: Saleh
    - Drive API Implementation: Brother
  - `/videos` → Optional: store/sync metadata – Saleh

## 4. Authentication / Token Storage

### Frontend (Extension)
- Handle the frontend OAuth login sequence – Saleh 
- Receive and process access code (`/auth/callback`) – Saleh 
- Securely transmit the code to the backend – Brother
- Manage and store **short-lived tokens** in memory/sessionStorage – Brother

### Backend
- Exchange OAuth code for **access + refresh tokens** – Saleh
- Securely store tokens in the **database / encrypted config** – Brother 
- Develop **automatic token refresh** middleware – Brother
- Respond to frontend requests securely without exposing secret keys – Shared Architecture

## 5. Optional / Nice-to-have
- History of uploaded content state management – Saleh
- Pre-upload media preview component – Brother
- Global error handling & alerts – Saleh


# Web UI

## 1. Logic
- Develop logic to display the grid of uploaded videos/screenshots – Saleh
- Develop preview and media playback logic – Brother
- Fetch and display precise metadata (date, size, type) – Saleh

## 2. UI
*(Note: Build modular React/UI components to avoid git merge conflicts).*
- Design and implement the **core Dashboard / web page layout** – Saleh
- Build buttons and controls for Playback, Download, and Delete – Brother
- Implement user feedback alerts (e.g., upload failures, storage limits) – Saleh

## 3. Backend Integration
- Connect Web UI to backend **via API**:
  - `/auth/google` → Web OAuth session management – Saleh  
  - `/upload/drive` → Fetch uploaded content / manage cloud files – Brother  
  - `/videos` → Retrieve video metadata and user history – Saleh  

## 4. Authentication / Token Storage
- Handle the Web UI OAuth login/logout transitions – Saleh  
- Securely receive and store access tokens in sessionStorage or localStorage – Brother  
- Automatically intercept expired tokens and trigger refresh – Brother  

## 5. Optional / Nice-to-have
- Build history timeline of all uploaded content – Saleh
- Filter and search uploaded content – Brother
- Display real-time video upload progress bars – Brother
- Dashboard Analytics (number of uploads, storage usage) – Saleh
- Complete responsive design for mobile / different screens – Saleh
- Automated email notifications for errors or full storage – Brother
