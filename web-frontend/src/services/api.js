import axios from 'axios';

const base = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
const api = axios.create({
  baseURL: `${base}/`,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('pharmago_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('pharmago_admin_token');
      window.location.href = '/pharmago-admin';
    }
    return Promise.reject(error);
  }
);

export default api;
