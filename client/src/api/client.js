import axios from 'axios';

// Note: we deliberately do NOT set a default Content-Type here. axios
// automatically picks the right one based on the request body:
//   - plain JS object  -> application/json
//   - FormData         -> multipart/form-data; boundary=... (via the browser)
// Setting a static default breaks file uploads in Chromium because it prevents
// the browser from adding the multipart boundary parameter.

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 120000, // 120s — large 20 MB uploads on slow connections
});

/**
 * Strip any Content-Type header for FormData so Chromium sets the boundary.
 * Axios 1.x AxiosHeaders objects need .delete(); plain objects use delete.
 */
function stripMultipartContentType(config) {
  if (!(config.data instanceof FormData)) return config;

  const headers = config.headers;
  if (!headers) return config;

  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type');
    headers.delete('content-type');
  } else if (typeof headers.set === 'function') {
    headers.set('Content-Type', undefined);
  } else {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  return config;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kalro_token');
  if (token) {
    if (config.headers?.set) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return stripMultipartContentType(config);
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
