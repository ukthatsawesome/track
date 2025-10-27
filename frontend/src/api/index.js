
import { useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const axiosInstance = axios.create({
  baseURL: API_URL,
});

export const useAxios = () => {
  const { getAuthHeaders, refreshAccessToken, logout } = useAuth();

  const request = useCallback(
    async (config) => {
      try {
       
        const headers = {
          ...getAuthHeaders(),
          ...config.headers,
        };

       
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
