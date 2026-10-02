import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

/**
 * apiClient.ts
 * Centralized Axios instance for all calls to CafeQR Backend API.
 * Follows the test-delivery architecture.
 */
const getApiBase = (): string => {
  let url = import.meta.env.VITE_API_BASE_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
        // Local network IP (e.g. 192.168.x.x, 10.x.x.x)
        if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
          return `http://${hostname}:8080/api`;
        }
        return 'https://pos.cafeqr.in/api';
      }
    }
    url = 'http://localhost:8080/api';
  }
  return url;
};

const api: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  timeout: 15000,
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
