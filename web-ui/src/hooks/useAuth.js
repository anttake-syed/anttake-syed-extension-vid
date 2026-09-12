import { useState, useEffect, useCallback } from 'react';
import { SERVER_URL, EXTENSION_ID, IS_LOCAL_MODE } from '../config';

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
  const [subscription, setSubscription] = useState(null);
  // True once we have received a definitive answer from the /subscription endpoint.
  // The paywall gate MUST wait for this before activating — otherwise it fires
  // before the fetch completes and briefly shows the paywall to admins / subscribers.
  const [subscriptionResolved, setSubscriptionResolved] = useState(false);

  // The JWT is client-controlled and never carries a trustworthy role, so the
  // server is always the source of truth for it — fetch it separately and merge.
  const refreshRole = async (jwt) => {
    try {
      const res = await fetch(`${SERVER_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {return;}
      const { user: fresh } = await res.json();
      setUser((prev) => {
        if (!prev) {return prev;}
        const updated = { ...prev, role: fresh.role };
        localStorage.setItem('antcapture_user', JSON.stringify(updated));
        return updated;
      });
    } catch (_err) {
      // Network hiccup — admin UI just stays hidden until the next successful check
    }
  };

  // Fetch the user's subscription status from the server.
  // This is the source of truth for feature gating — never trust the JWT for this.
  const refreshSubscription = useCallback(async (jwt) => {
    if (!jwt || jwt === 'local-mode') {
      setSubscription({ status: 'active' });
      setSubscriptionResolved(true);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/subscription`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) { setSubscription(null); setSubscriptionResolved(true); return; }
      const data = await res.json();
      setSubscription(data.subscription || null);
    } catch (_err) {
      setSubscription(null);
    } finally {
      setSubscriptionResolved(true);
    }
  }, []);

  const login = (authData) => {
    try {
      const userData = parseAndValidateJwt(authData);
      if (!userData) {
        localStorage.removeItem('antcapture_user');
        return null;
      }
      userData.jwt = authData;
      localStorage.setItem('antcapture_user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      // Reset so paywall gate waits for the new subscription fetch
      setSubscriptionResolved(false);
      refreshRole(authData);
      refreshSubscription(authData);

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
    setSubscription(null);
    setSubscriptionResolved(false);

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
    // Local Self-Hosted mode — bypass everything
    if (IS_LOCAL_MODE) {
      setUser({ name: 'Local Admin', email: 'admin@localhost', jwt: 'local-mode', picture: '', role: 'admin' });
      setIsAuthenticated(true);
      setSubscription({ status: 'active' });
      setSubscriptionResolved(true);
      setIsInitializing(false);
      return;
    }

    const stored = localStorage.getItem('antcapture_user');
    let jwt = null;

    if (stored) {
      try {
        const userData = JSON.parse(stored);
        const validated = parseAndValidateJwt(userData.jwt);
        if (validated) {
          setUser(userData);
          setIsAuthenticated(true);
          jwt = userData.jwt;
          refreshRole(jwt);
          // subscriptionResolved will be set to true inside refreshSubscription
          refreshSubscription(jwt);
        } else {
          localStorage.removeItem('antcapture_user');
          console.info('Session expired. Please sign in again.');
          setSubscriptionResolved(true); // No user — nothing to fetch
        }
      } catch (_err) {
        localStorage.removeItem('antcapture_user');
        setSubscriptionResolved(true);
      }
    } else {
      // No stored session — nothing to fetch
      setSubscriptionResolved(true);
    }

    // Handle ?auth_data= from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      login(authData); // login() resets subscriptionResolved and kicks off fetch
      window.history.replaceState({}, document.title,
        window.location.origin + window.location.pathname);
    }

    // Handle popup postMessage (web UI login)
    const handleMessage = (event) => {
      if (event.origin !== SERVER_URL) {return;}
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

    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'REGISTER_WEB_UI', url: window.location.origin }).catch(()=>{});
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // hasCloudAccess: admin OR active subscription.
  // Admin role comes from refreshRole (server-side) — never trust JWT for this.
  const hasCloudAccess = IS_LOCAL_MODE
    || user?.role === 'admin'
    || subscription?.status === 'active';

  // isReady: app has finished both auth init AND subscription fetch.
  // The paywall gate uses this so it never activates prematurely.
  const isReady = !isInitializing && subscriptionResolved;

  return { user, isAuthenticated, isInitializing, isReady, login, logout, updateUser, subscription, hasCloudAccess, refreshSubscription };
}
