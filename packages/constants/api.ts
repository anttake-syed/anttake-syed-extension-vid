export const DEV_SERVER_URL  = 'http://localhost:3001';
export const PROD_SERVER_URL = 'https://api.antcapture.anttake.com';

export const DEV_WEB_UI_URL  = 'http://localhost:5173';
export const PROD_WEB_UI_URL = 'https://antcapture.anttake.com';

/**
 * Helper to determine the active Server URL based on the environment.
 */
export const getServerUrl = (isLocal = false) => {
  return isLocal ? DEV_SERVER_URL : PROD_SERVER_URL;
};

/**
 * Helper to determine the active Web UI URL based on the environment.
 */
export const getWebUiUrl = (isLocal = false) => {
  return isLocal ? DEV_WEB_UI_URL : PROD_WEB_UI_URL;
};
