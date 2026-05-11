import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'LockIn_token';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

const token = localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('focusmate_token');
if (token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.removeItem('focusmate_token');
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('focusmate_token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
