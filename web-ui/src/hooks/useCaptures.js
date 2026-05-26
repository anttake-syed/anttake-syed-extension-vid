import { useState, useEffect, useCallback } from 'react';
import { BACKEND_URL } from '../config';

export function useCaptures(user, isAuthenticated) {
  const [captures, setCaptures] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [storagePreference, setStoragePreference] = useState('local');
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [savingPref, setSavingPref] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchCaptures = useCallback(async (jwt, background = false) => {
    if (!jwt) return;
    if (!background) setLoadingCaptures(true);
    try {
      const res = await fetch(`${BACKEND_URL}/captures`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCaptures((data.captures || []).map((c) => ({ ...c, src: c.fileUrl })));
    } catch (err) {
      console.error('Failed to fetch captures:', err);
    } finally {
      if (!background) setLoadingCaptures(false);
    }
  }, []);

  const fetchStats = useCallback(async (jwt) => {
    if (!jwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/stats`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setDbStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchSettings = useCallback(async (jwt) => {
    if (!jwt) return;
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStoragePreference(data.storagePreference || 'local');
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, []);

  const saveStoragePreference = async (pref) => {
    if (!user?.jwt) return;
    setSavingPref(true);
    try {
      const res = await fetch(`${BACKEND_URL}/settings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storagePreference: pref }),
      });
      if (res.ok) setStoragePreference(pref);
    } catch (err) {
      console.error('Failed to save setting:', err);
    } finally {
      setSavingPref(false);
    }
  };

  const refresh = useCallback(() => {
    if (!user?.jwt) return;
    fetchCaptures(user.jwt, true);
    fetchStats(user.jwt);
  }, [user, fetchCaptures, fetchStats]);

  // Initial load + polling
  useEffect(() => {
    if (!isAuthenticated || !user?.jwt) {
      setCaptures([]);
      setDbStats(null);
      return;
    }
    const jwt = user.jwt;
    fetchCaptures(jwt);
    fetchStats(jwt);
    fetchSettings(jwt);

    const interval = setInterval(() => {
      fetchCaptures(jwt, true);
      fetchStats(jwt);
    }, 5000);

    const handleFocus = () => {
      fetchCaptures(jwt, true);
      fetchStats(jwt);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, user?.jwt, fetchCaptures, fetchStats, fetchSettings]);

  const filteredCaptures = captures.filter((c) => {
    if (filter === 'Videos') return c.type === 'video';
    if (filter === 'Screenshots') return c.type === 'image';
    return true;
  });

  return {
    captures,
    setCaptures,
    filteredCaptures,
    dbStats,
    storagePreference,
    loadingCaptures,
    savingPref,
    filter,
    setFilter,
    fetchCaptures,
    fetchStats,
    saveStoragePreference,
    refresh,
  };
}
