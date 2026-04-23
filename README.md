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

### 1. Environment Configuration (Standard Practice)
Each component (Backend, Web UI) requires environment variables to function. For security, **do not push .env files to GitHub.**

*   **Sharing with Collaborators:** Share the actual `.env` values privately via secure messaging.
*   **Local Setup:** Copy the `.env.example` in each directory to a new file named `.env` and fill in the values.

### 2. Backend Setup
```bash
cd backend
npm install
# 1. Create .env from .env.example
# 2. Fill in Google OAuth credentials
npm start
```

### 3. Web UI Setup
```bash
cd web-ui
npm install
# 1. Create .env from .env.example
# 2. VITE_API_BASE_URL should point to your backend (default: http://localhost:3001)
npm run dev
```

### 4. Extension Setup
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **"Developer mode"** (top right).
3. Click **"Load unpacked"** and select the `extension` folder from this repository.

---

## 🔒 Security & Collaboration
- **.gitignore**: The `skills/` folder and all `.env` files are ignored by Git to keep your development history and secrets private.
- **Google Cloud Console**: Ensure your `GOOGLE_REDIRECT_URI` is set to `http://localhost:3001/auth/callback` for local development.

# Extension

## 1. Logic
- **Screenshot** – Saleh  
- **Video Recording / Audio Capture** – Brother  

## 2. UI
- Design and implement the extension popup / toolbar - Saleh

- Buttons for **Screensho
￼
￼
0:55 / 2:32
￼
￼
￼
￼
t**, **Start/Stop Recording**, 

**Audio toggle** - Brother

- Feedback / notifications to the user - Saleh 
  - Example: if storage drive is full, user will be notified via email

## 3. Backend Integration
- Connect frontend to backend **via API**  
- Endpoints:
  - `/auth/google` → Google OAuth  
  - `/upload/drive` → Upload captured content  
    - Google Console setup: Saleh  
    - Implementation: Brother  
  - `/videos` → Optional: store metadata  

## 4. Authentication / Token Storage

### Frontend (Extension)
- Handle OAuth login flow - Saleh 
- Receive access code after login (`/auth/callback`) - Saleh 
- Send code securely to backend  - Brother

- Optionally store **short-lived tokens in memory/sessionStorage** for current session  

### Backend
- Exchange OAuth code for **access + refresh tokens** - Saleh
- Store tokens securely in **database or encrypted file** - Brother 
- Handle **automatic token refresh**  
- Respond to frontend requests without exposing secret keys  

## 5. Optional / Nice-to-have
- History of uploaded content  
- Preview before uploading  
- Error handling & user notifications  
  - Example: notify user if upload fails or token expires


# Web UI

## 1. Logic
- Display uploaded content (videos/screenshots)  
- Preview/playback functionality  
- Show metadata: date, size, type  

## 2. UI
- Design and implement **dashboard / web page**  
- Buttons / controls for:
  - Playback  
  - Download  
  - Delete content  
- Feedback / notifications to the user  
  - Example: if upload fails or storage limit is reached  

## 3. Backend Integration
- Connect Web UI to backend **via API**  
- Endpoints:
  - `/auth/google` → Google OAuth  
  - `/upload/drive` → Fetch uploaded content / manage uploads  
  - `/videos` → Retrieve video metadata/history  

## 4. Authentication / Token Storage
- Handle OAuth login flow  
- Receive and store access tokens securely (sessionStorage or localStorage)  
- Refresh tokens automatically when expired  
- Manage login/logout flow properly  

## 5. Optional / Nice-to-have
- Show history of all uploaded content  
- Filter and search uploaded content  
- Display real-time upload progress  
- Analytics (number of uploads, storage usage)  
- Responsive design for mobile / different screen sizes  
- Email notifications for errors or full storage

Like that thing will automatically delete in WordViewi the video will automatically delete from local if we select that in settings then that will store in cloud then that don't consume both sides of the space