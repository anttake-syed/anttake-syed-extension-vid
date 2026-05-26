import { useState, useEffect } from 'react';
import { BACKEND_URL } from '../config';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const login = (authData) => {
    try {
      const base64Url = authData.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64).split('').map((c) =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );
      const userData = JSON.parse(jsonPayload);
      userData.jwt = authData;
      localStorage.setItem('antcapture_user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
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
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('antcapture_user', JSON.stringify(updated));
    return updated;
  };

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('antcapture_user');
    let jwt = null;
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      setIsAuthenticated(true);
      jwt = userData.jwt;
    }

    // Handle ?auth_data= from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const authData = params.get('auth_data');
    if (authData) {
      const userData = login(authData);
      if (userData) jwt = authData;
      window.history.replaceState({}, document.title,
        window.location.origin + window.location.pathname);
    }

    // Handle popup postMessage (web UI login)
    const handleMessage = (event) => {
      if (event.origin !== BACKEND_URL) return;
      if (event.data?.type === 'AUTH_SUCCESS' && event.data.auth_data) {
        login(event.data.auth_data);
      }
    };
    window.addEventListener('message', handleMessage);

    setTimeout(() => setIsInitializing(false), 300);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { user, isAuthenticated, isInitializing, login, logout, updateUser };
}
