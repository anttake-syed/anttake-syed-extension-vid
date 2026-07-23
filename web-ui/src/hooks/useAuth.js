import { useState, useEffect } from 'react';
import { BACKEND_URL, EXTENSION_ID, IS_LOCAL_MODE } from '../config';

// Decode a JWT without a library and check if it is still valid
function parseAndValidateJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map((c) =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
    const data = JSON.parse(jsonPayload);
    // Check expiry — exp is in seconds, Date.now() is in ms
    if (data.exp && Date.now() >= data.exp * 1000) {
      return null; // Token is expired
    }
    return data;
  } catch (_err) {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const login = (authData) => {
    try {
      const userData = parseAndValidateJwt(authData);
      if (!userData) {
        // Token is invalid or expired — clear it
        localStorage.removeItem('antcapture_user');
        return null;
      }
      userData.jwt = authData;
      localStorage.setItem('antcapture_user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      
      // Sync login to extension immediately
      if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'SYNC_USER', user: userData }).catch(()=>{});
      }

      return userData;
    } catch (e) {
      console.error('Auth parse error:', e);
      return null;
    }
  };

  const logout = () => {
    localStorage.removeItem('antcapture_user');
    setUser(null);
    setIsAuthenticated(false);

    // Sync logout to extension immediately
    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'SYNC_USER', user: null }).catch(()=>{});
    }
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('antcapture_user', JSON.stringify(updated));
    return updated;
  };

  useEffect(() => {
    // Completely bypass authentication for Local Self-Hosted mode
    if (IS_LOCAL_MODE) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser({ name: 'Local Admin', email: 'admin@localhost', jwt: 'local-mode', picture: '' });
      setIsAuthenticated(true);
      setIsInitializing(false);
      return;
    }

    // Load from localStorage — validate expiry before trusting it
    const stored = localStorage.getItem('antcapture_user');
    let jwt = null;

    if (stored) {
      try {
        const userData = JSON.parse(stored);
        const validated = parseAndValidateJwt(userData.jwt);
        if (validated) {
          // Token is still valid
          setUser(userData);
          setIsAuthenticated(true);
          jwt = userData.jwt;
        } else {
          // Token expired — clear it so the login screen shows
          localStorage.removeItem('antcapture_user');
          console.info('Session expired. Please sign in again.');
        }
      } catch (_err) {
        localStorage.removeItem('antcapture_user');
      }
    }

    // Handle ?auth_data= from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      const userData = login(authData);
      if (userData) {
        jwt = authData;
        void jwt; // Tell ESLint it is intentionally unused here if we don't need it later
      }
      window.history.replaceState({}, document.title,
        window.location.origin + window.location.pathname);
    }

    // Handle popup postMessage (web UI login)
    const handleMessage = (event) => {
      if (event.origin !== BACKEND_URL) {return;}
      if (event.data?.type === 'AUTH_SUCCESS' && event.data.auth_data) {
        login(event.data.auth_data);
      }
    };
    window.addEventListener('message', handleMessage);

    // Auto-login from extension if not already authenticated
    if (!stored && !authData && EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'GET_USER' }, (response) => {
        void chrome.runtime.lastError;
        if (response?.user?.jwt) {
          login(response.user.jwt);
        }
        setIsInitializing(false);
      });
    } else {
      setTimeout(() => setIsInitializing(false), 300);
    }

    // Let the extension know our dynamic URL in case Vite changed ports
    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'REGISTER_WEB_UI', url: window.location.origin }).catch(()=>{});
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { user, isAuthenticated, isInitializing, login, logout, updateUser };
}
