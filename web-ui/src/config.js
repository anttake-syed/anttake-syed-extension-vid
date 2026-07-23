export const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.antcapture.anttake.com';

export const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID || '';

// 'local'  → self-hosted build (SQLite only, no Google Drive, no OAuth)
// 'cloud'  → production build (Google Drive + OAuth)
export const APP_MODE = import.meta.env.VITE_APP_MODE || 'cloud';
export const IS_LOCAL_MODE = APP_MODE === 'local';

