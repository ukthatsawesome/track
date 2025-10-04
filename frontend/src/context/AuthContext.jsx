import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// --- Configuration ---
const API_URL = import.meta.env.VITE_API_URL;

// Create Context
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // --- State ---
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Load from localStorage once on mount ---
  useEffect(() => {
    const loadUserFromStorage = () => {
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedAccessToken && storedRefreshToken && storedUser) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    loadUserFromStorage();
  }, []);

  // --- Helper: Auth headers ---
  const getAuthHeaders = useCallback(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  // --- Fetch logged-in user info ---
  const fetchUser = useCallback(
    async (token) => {
      try {
        const response = await axiosInstance.get('/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        console.error('Fetching user failed', err);
        setUser(null);
        localStorage.removeItem('user');
      }
    },
    []
  );

  // --- Login ---
  const login = useCallback(
    async (username, password) => {
      try {
        const response = await axiosInstance.post('/token/', { username, password });
        const { access, refresh } = response.data;

        setAccessToken(access);
        setRefreshToken(refresh);
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);

        await fetchUser(access);
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }, []);

  // --- Refresh access token ---
  const refreshAccessToken = useCallback(async () => {
    try {
      const response = await axiosInstance.post('/token/refresh/', {
        refresh: refreshToken,
      });
      const { access } = response.data;
      setAccessToken(access);
      localStorage.setItem('accessToken', access);
      return access;
    } catch (err) {
      console.error('Token refresh failed', err);
      logout();
      throw err;
    }
  }, [refreshToken, logout]);

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
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook to use Auth
export const useAuth = () => useContext(AuthContext);
