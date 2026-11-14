import axios from 'axios';

export const TOKEN_KEY = 'fw_token';
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const baseURL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
if (import.meta.env.PROD && !baseURL) throw new Error('VITE_API_URL must be set to the deployed backend API URL when building for production.');

const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isAuthCall = err.config?.url?.startsWith('/auth/login') || err.config?.url?.startsWith('/auth/register');
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export const API_URL = baseURL;
export const errMsg = (e) => {
  if (e.response?.data?.message) return e.response.data.message;
  if (e.code === 'ERR_NETWORK') return `Cannot reach the API at ${baseURL}. Is the backend running?`;
  return e.message || 'Something went wrong';
};

export const authApi = {
  login: (identifier, password) => api.post('/auth/login', { identifier, password }).then((r) => r.data),
  register: (body) => api.post('/auth/register', body).then((r) => r.data),
  profile: () => api.get('/auth/profile').then((r) => r.data),
  changePassword: (body) => api.put('/auth/password', body).then((r) => r.data),
};
export const rulesApi = {
  list: (params) => api.get('/rules', { params }).then((r) => r.data),
  get: (id) => api.get(`/rules/${id}`).then((r) => r.data),
  create: (body) => api.post('/rules', body).then((r) => r.data),
  update: (id, body) => api.put(`/rules/${id}`, body).then((r) => r.data),
  toggle: (id, enabled) => api.patch(`/rules/${id}/toggle`, { enabled }).then((r) => r.data),
  remove: (id) => api.delete(`/rules/${id}`).then((r) => r.data),
};
export const validationApi = {
  validate: (body) => api.post('/validate', body).then((r) => r.data),
  history: (params) => api.get('/validation-history', { params }).then((r) => r.data),
  historyOne: (id) => api.get(`/validation-history/${id}`).then((r) => r.data),
  clear: () => api.delete('/validation-history').then((r) => r.data),
  dfa: () => api.get('/dfa/definition').then((r) => r.data),
};
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
  analytics: () => api.get('/dashboard/analytics').then((r) => r.data),
};
export const adminApi = {
  users: (status) => api.get('/admin/users', { params: status ? { status } : {} }).then((r) => r.data),
  pendingCount: () => api.get('/admin/users/pending-count').then((r) => r.data),
  approveUser: (id) => api.patch(`/admin/users/${id}/approve`).then((r) => r.data),
  rejectUser: (id) => api.patch(`/admin/users/${id}/reject`).then((r) => r.data),
};
export default api;
