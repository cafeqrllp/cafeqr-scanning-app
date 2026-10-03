import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

/**
 * apiClient.ts
 * Centralized Axios instance for all calls to CafeQR Backend API.
 * Follows the test-delivery architecture.
 */
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    // 1. Localhost development on developer's machine
    if (isLocal) {
      return envUrl || 'http://localhost:8080/api';
    }

    // 2. Local network IP testing (e.g. 192.168.x.x, 10.x.x.x)
    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
      return `http://${hostname}:8080/api`;
    }

    // 3. Remote deployments: If explicit remote VITE_API_BASE_URL is set, use it
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }

    // 4. Auto-detect environment based on hostname
    const isTestEnv = hostname.includes('test-api') || hostname.startsWith('test-') || hostname.startsWith('staging-');
    if (isTestEnv) {
      return 'https://test-api.cafeqr.in/api';
    }

    // 5. Production default backend API
    return 'https://app.cafeqr.in/api';
  }

  return envUrl || 'https://app.cafeqr.in/api';
};

const api: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor: Attach auth token from localStorage if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cafeqr_customer_token');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Normalize errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unexpected error occurred';

    if (status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cafeqr_customer_token');
      }
    }

    return Promise.reject({
      message,
      status,
      data: error.response?.data,
      raw: error,
    });
  }
);

export default api;
