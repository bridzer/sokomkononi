import axios from 'axios';

// Note: we deliberately do NOT set a default Content-Type here. axios
// automatically picks the right one based on the request body:
//   - plain JS object  -> application/json
//   - FormData         -> multipart/form-data; boundary=... (via the browser)
// Setting a static default breaks file uploads because it prevents the browser
// from adding the multipart boundary parameter.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kalro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('kalro_token');
      localStorage.removeItem('kalro_user');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
