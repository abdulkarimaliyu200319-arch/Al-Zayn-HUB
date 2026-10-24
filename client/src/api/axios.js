import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('alzayn_admin_token');
  const userToken = localStorage.getItem('alzayn_token');

  if (config.url?.startsWith('/admin') && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      if (isAdminRoute) {
        localStorage.removeItem('alzayn_admin_token');
      } else {
        localStorage.removeItem('alzayn_token');
        localStorage.removeItem('alzayn_user');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
