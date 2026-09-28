import axios from 'axios';

export const isStaticHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('web.app') || host.includes('firebaseapp.com') || host.includes('github.io');
};

export const hasCustomApiServer = (): boolean => {
  if (typeof window === 'undefined') return false;
  const custom = localStorage.getItem('ts_api_url') || import.meta.env.VITE_API_URL;
  return Boolean(custom && !custom.startsWith('/') && !custom.includes(window.location.hostname));
};

export const getApiBaseUrl = (): string => {
  return localStorage.getItem('ts_api_url') || import.meta.env.VITE_API_URL || '/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
});

// Request interceptor to attach JWT token and short-circuit static host endpoints
api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  
  // If running on static host with no backend server configured, short-circuit relative calls
  if (isStaticHost() && !hasCustomApiServer() && config.baseURL?.startsWith('/')) {
    const err: any = new Error('Direct Cloud Mode: Using Cloud Firestore directly without a dedicated backend server.');
    err.response = {
      status: 404,
      statusText: 'Direct Cloud Mode',
      data: { error: 'Cloud Firestore Direct Mode Active', isStaticHost: true },
    };
    return Promise.reject(err);
  }

  if (config.headers) {
    config.headers['Bypass-Tunnel-Reminder'] = 'true';
    const token = localStorage.getItem('ts_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to reject HTML responses from static hosts (SPA rewrite) and handle token refresh
api.interceptors.response.use(
  (response) => {
    // If static host returns index.html for an API endpoint
    if (typeof response.data === 'string' && (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html'))) {
      const err: any = new Error('Static host returned HTML instead of JSON API response');
      err.response = {
        status: 404,
        statusText: 'Not Found',
        data: { error: 'Cloud Firestore Direct Mode Active', isStaticHost: true },
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
