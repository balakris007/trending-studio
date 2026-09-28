import axios from 'axios';

export const getApiBaseUrl = (): string => {
  return localStorage.getItem('ts_api_url') || import.meta.env.VITE_API_URL || '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = localStorage.getItem('ts_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to reject HTML responses from static hosts (SPA rewrite) and handle token refresh
api.interceptors.response.use(
  (response) => {
    // If static host returns index.html for an API endpoint
    if (typeof response.data === 'string' && (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html'))) {
      const err: any = new Error('API route returned HTML instead of JSON');
      err.response = {
        status: 404,
        statusText: 'Not Found',
        data: { error: 'API server route not found on this static host' },
      };
      return Promise.reject(err);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('ts_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          localStorage.setItem('ts_access_token', accessToken);
          localStorage.setItem('ts_refresh_token', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('ts_access_token');
          localStorage.removeItem('ts_refresh_token');
          localStorage.removeItem('ts_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
