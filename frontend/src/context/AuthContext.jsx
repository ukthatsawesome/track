import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// --- Configuration ---
const API_URL = import.meta.env.VITE_API_URL;

// Create Context
const AuthContext = createContext();

// AuthProvider component
export const AuthProvider = ({ children }) => {
  // --- State ---
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remember, setRemember] = useState(false);

  // --- Load from storage once on mount ---
  useEffect(() => {
    const rememberStored = localStorage.getItem('rememberMe') === 'true';
    setRemember(rememberStored);
    const storage = rememberStored ? localStorage : sessionStorage;

    const storedAccessToken = storage.getItem('accessToken');
    const storedRefreshToken = storage.getItem('refreshToken');
    const storedUser = storage.getItem('user');

    const hydrate = async () => {
      if (storedAccessToken && storedRefreshToken) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          try {
            await fetchUser(storedAccessToken, storage);
          } catch (err) {
            console.error('Auto-fetch user failed', err);
          }
        }
      }
      setLoading(false);
    };

    hydrate();
  }, []); // <-- remove fetchUser from deps to avoid TDZ

  // --- Helper: Auth headers ---
  const getAuthHeaders = useCallback(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  // --- Fetch logged-in user info ---
  const fetchUser = useCallback(
    async (token, storage) => {
      try {
        const response = await axiosInstance.get('/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        storage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        console.error('Fetching user failed', err);
        setUser(null);
        storage.removeItem('user');
      }
    },
    []
  );

  // --- Login ---
  const login = useCallback(
    async (username, password, rememberParam = false) => {
      try {
        const response = await axiosInstance.post('/token/', { username, password });
        const { access, refresh } = response.data;

        setAccessToken(access);
        setRefreshToken(refresh);
        setRemember(rememberParam);

        const storage = rememberParam ? localStorage : sessionStorage;
        storage.setItem('accessToken', access);
        storage.setItem('refreshToken', refresh);

        // Ensure the other storage is clean
        const otherStorage = rememberParam ? sessionStorage : localStorage;
        otherStorage.removeItem('accessToken');
        otherStorage.removeItem('refreshToken');
        otherStorage.removeItem('user');

        // Persist the remember preference
        localStorage.setItem('rememberMe', rememberParam ? 'true' : 'false');

        await fetchUser(access, storage);
        return true;
      } catch (err) {
        console.error('Login failed', err);
        return false;
      }
    },
    [fetchUser]
  );

  // --- Logout ---
  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    // Clear both storages to avoid stale data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  }, []);

  // --- Refresh access token ---
  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await axiosInstance.post('/token/refresh/', {
        refresh: refreshToken,
      });
      const { access } = response.data;
      setAccessToken(access);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('accessToken', access);
      return access;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        console.error('Token refresh failed (invalid/expired)', err);
        logout();
      } else {
        console.warn('Token refresh failed (network/server). Session preserved.', err);
      }
      throw err;
    }
  }, [refreshToken, logout, remember]);

  // --- Setup Axios Instance (only once) ---
  const axiosInstance = axios.create({ baseURL: API_URL });

  useEffect(() => {
    // Attach interceptor once
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newAccessToken = await refreshAccessToken();
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    // Cleanup on unmount
    return () => axiosInstance.interceptors.response.eject(interceptor);
  }, [refreshAccessToken]);

  // --- Context Value ---
  const contextValue = {
    user,
    accessToken,
    refreshToken,
    login,
    logout,
    getAuthHeaders,
    loading,
    refreshAccessToken, // <-- expose refreshAccessToken to consumers
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook to use Auth
export const useAuth = () => useContext(AuthContext);
