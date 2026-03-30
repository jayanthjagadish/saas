import React, { createContext, useCallback, useEffect, useState } from 'react';
import apiService from '../services/api';

type User = { id: string; email: string; name?: string } | null;

interface AuthContextShape {
  user: User;
  token: string | null;
  isInitialized: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextShape>({
  user: null,
  token: null,
  isInitialized: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  login: async () => {},
  logout: async () => {},
});

let refreshTimer: number | null = null;

function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return null;
    return payload.exp * 1000; // ms
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(apiService.getAccessToken());
  const [user, setUser] = useState<User>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const scheduleRefresh = useCallback((t: string) => {
    const expiry = parseJwtExpiry(t);
    if (!expiry) return;
    const now = Date.now();
    // Refresh 60 seconds before expiry, but at least 5 seconds from now
    const refreshAt = Math.max(5000, expiry - now - 60000);
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
    refreshTimer = window.setTimeout(async () => {
      try {
        const newToken = await apiService.refreshAccessToken();
        apiService.setAccessToken(newToken);
        setToken(newToken);
        // Reschedule based on new token
        scheduleRefresh(newToken);
      } catch (e) {
        // Refresh failed; clear session
        setToken(null);
        setUser(null);
        apiService.clearAuth();
        window.location.href = '/login';
      }
    }, refreshAt);
  }, []);

  useEffect(() => {
    // On mount, if there is a token, fetch user
    const init = async () => {
      const t = apiService.getAccessToken();
      if (t) {
        setToken(t);
        try {
          const res = await apiService.getCurrentUser();
          if (res.success) setUser(res.data ?? null);
        } catch (e) {
          console.warn('Failed to fetch user on init', e);
        }
        scheduleRefresh(t);
      }
      setIsInitialized(true);
    };
    init();
    // cleanup on unmount
    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, [scheduleRefresh]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    try {
      const res = await apiService.login({ email, password, remember_me: rememberMe });
      if (res.success && res.data?.accessToken) {
        const at = res.data.accessToken;
        apiService.setAccessToken(at);
        setToken(at);
        try {
          const userRes = await apiService.getCurrentUser();
          if (userRes.success) setUser(userRes.data ?? null);
        } catch (e) {
          setUser(null);
        }
        scheduleRefresh(at);
      } else {
        throw new Error(res.error?.message || 'Login failed');
      }
    } catch (error) {
      // Re-throw the error to preserve the Axios error structure for LoginPage
      throw error;
    }
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    await apiService.logout();
    setToken(null);
    setUser(null);
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isInitialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
