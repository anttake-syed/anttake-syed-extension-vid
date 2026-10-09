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
    if (data.exp && Date.now() >= data.exp * 1000) {
      return null; // Token is expired
    }
    return data;
  } catch (_err) {
    return null;
  }
}

// Default entitlements for unauthenticated / unresolved state
const FREE_ENTITLEMENTS = {
  cloud:            false,
  plan:             'free',
  status:           null,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  daysUntilExpiry:  null,
  warningLevel:     null,
};

const LOCAL_ENTITLEMENTS = {
  cloud:            true,
  plan:             'local',
  status:           'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  daysUntilExpiry:  null,
  warningLevel:     null,
};

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [entitlements, setEntitlements] = useState(FREE_ENTITLEMENTS);
  // True once we have received a definitive answer from the /subscription endpoint.
  const [subscriptionResolved, setSubscriptionResolved] = useState(false);

  // The JWT is client-controlled and never carries a trustworthy role, so the
  // server is always the source of truth for it — fetch it separately and merge.
  const refreshRole = async (jwt) => {
    try {
      const res = await fetch(`${SERVER_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) { return; }
      const { user: fresh } = await res.json();
      setUser((prev) => {
        if (!prev) { return prev; }
        const updated = { ...prev, role: fresh.role };
        localStorage.setItem('antcapture_user', JSON.stringify(updated));
        return updated;
      });
    } catch (_err) {
      // Network hiccup — admin UI just stays hidden until the next successful check
    }
  };

  // Fetch the user's subscription status from the server.
  // The server computes entitlements — we just store what it tells us.
  const refreshSubscription = useCallback(async (jwt) => {
    if (!jwt || jwt === 'local-mode') {
      setSubscription({ status: 'active' });
      setEntitlements(LOCAL_ENTITLEMENTS);
      setSubscriptionResolved(true);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/subscription`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        setSubscription(null);
        setEntitlements(FREE_ENTITLEMENTS);
        setSubscriptionResolved(true);
        return;
      }
      const data = await res.json();
      setSubscription(data.subscription || null);
      setEntitlements(data.entitlements  || FREE_ENTITLEMENTS);
    } catch (_err) {
      setSubscription(null);
      setEntitlements(FREE_ENTITLEMENTS);
    } finally {
      setSubscriptionResolved(true);
    }
  }, []);

  // Call /subscription/sync (server fetches live from LemonSqueezy), then apply result.
  // Used after ?billing=success — recovers from webhook delivery delays.
  const syncSubscription = useCallback(async (jwt) => {
    if (!jwt || jwt === 'local-mode') return;
    try {
      const res = await fetch(`${SERVER_URL}/subscription/sync`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSubscription(data.subscription || null);
      setEntitlements(data.entitlements  || FREE_ENTITLEMENTS);
      setSubscriptionResolved(true);
      if (data.entitlements?.cloud) {
        window.dispatchEvent(new CustomEvent('antcapture:billing-success'));
      }
    } catch (_err) { /* ignore — caller will fall back to polling */ }
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
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'SYNC_USER', user: userData }).catch(() => {});
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
    setEntitlements(FREE_ENTITLEMENTS);
    setSubscriptionResolved(false);

    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'SYNC_USER', user: null }).catch(() => {});
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
      setEntitlements(LOCAL_ENTITLEMENTS);
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
          refreshSubscription(jwt);
        } else {
          localStorage.removeItem('antcapture_user');
          console.info('Session expired. Please sign in again.');
          setSubscriptionResolved(true);
        }
      } catch (_err) {
        localStorage.removeItem('antcapture_user');
        setSubscriptionResolved(true);
      }
    } else {
      setSubscriptionResolved(true);
    }

    // Handle ?auth_data= from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      let loginPending = false;
      try {
        loginPending = sessionStorage.getItem('antcapture_login_pending') === '1';
        sessionStorage.removeItem('antcapture_login_pending');
      } catch { /* storage blocked */ }
      if (loginPending) {
        login(authData);
      }
      window.history.replaceState({}, document.title,
        window.location.origin + window.location.pathname);
    }

    // Handle popup postMessage (web UI login)
    const handleMessage = (event) => {
      if (event.origin !== SERVER_URL) { return; }
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
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'REGISTER_WEB_UI', url: window.location.origin }).catch(() => {});
    }

    // Handle ?billing=success — user returned from LemonSqueezy checkout.
    // 1. First do a server-side sync (fetches live from LS API, updates DB).
    // 2. If still not active after sync, poll /subscription for up to 30s
    //    (webhook may still be in-flight).
    const billingStatus = params.get('billing');
    if (billingStatus === 'success' && stored) {
      window.history.replaceState({}, document.title,
        window.location.origin + window.location.pathname);

      const pollJwt = (() => { try { return JSON.parse(stored)?.jwt; } catch { return null; } })();
      if (pollJwt) {
        // Step 1: server-side sync
        syncSubscription(pollJwt).then(() => {
          // Step 2: if cloud not active yet, poll /subscription for up to 30s
          let attempts = 0;
          const maxAttempts = 12; // 12 × 2.5s = 30 seconds
          const poll = setInterval(async () => {
            attempts++;
            try {
              const res = await fetch(`${SERVER_URL}/subscription`, {
                headers: { Authorization: `Bearer ${pollJwt}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.entitlements?.cloud) {
                  setSubscription(data.subscription);
                  setEntitlements(data.entitlements);
                  setSubscriptionResolved(true);
                  clearInterval(poll);
                  window.dispatchEvent(new CustomEvent('antcapture:billing-success'));
                }
              }
            } catch (_err) { /* ignore, retry */ }
            if (attempts >= maxAttempts) clearInterval(poll);
          }, 2500);
        });
      }
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // hasCloudAccess: server is the authority — read from entitlements object.
  // The server handles admin bypass configuration automatically.
  const hasCloudAccess = IS_LOCAL_MODE || entitlements.cloud === true;

  // isReady: app has finished both auth init AND subscription fetch.
  const isReady = !isInitializing && subscriptionResolved;

  return {
    user, isAuthenticated, isInitializing, isReady,
    login, logout, updateUser,
    subscription, entitlements, hasCloudAccess,
    refreshSubscription, syncSubscription,
  };
}
