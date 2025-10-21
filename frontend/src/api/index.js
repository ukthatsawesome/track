// src/api/index.js
import { useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

// Create a single reusable axios instance (no new one each render)
const axiosInstance = axios.create({
  baseURL: API_URL,
});

export const useAxios = () => {
  const { getAuthHeaders, refreshAccessToken, logout } = useAuth(); // ensure it's destructured

  const request = useCallback(
    async (config) => {
      try {
        // 1️⃣ Merge headers (auth + custom)
        const headers = {
          ...getAuthHeaders(),
          ...config.headers,
        };

        // 2️⃣ Perform request
        const response = await axiosInstance({ ...config, headers });
        return response.data;
      } catch (error) {
        if (error.response?.status === 401 && !config._retry) {
          config._retry = true;
          try {
            const newAccessToken = await refreshAccessToken();
            const newHeaders = {
              ...config.headers,
              Authorization: `Bearer ${newAccessToken}`,
            };
            const retryResponse = await axiosInstance({ ...config, headers: newHeaders });
            return retryResponse.data;
          } catch (refreshError) {
            console.error('Token refresh failed during request retry:', refreshError);
            const status = refreshError.response?.status;
            if (status === 401 || status === 403) {
              logout();
            }
            throw refreshError;
          }
        }
        throw error;
      }
    },
    [getAuthHeaders, refreshAccessToken, logout]
  );

  return request;
};
