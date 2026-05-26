function normalizeBaseUrl(url) {
  return url ? url.replace(/\/+$/, '') : '';
}

function defaultApiBase() {
  if (typeof window === 'undefined') return 'http://localhost:8000/api';
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000/api`;
}

const API_BASE = normalizeBaseUrl(process.env.REACT_APP_API_URL) || defaultApiBase();

export const API_ROOT = API_BASE.replace(/\/api$/, '');

export function apiUrl(path = '') {
  if (!path) return API_BASE;
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiRootUrl(path = '') {
  if (!path) return API_ROOT;
  return `${API_ROOT}${path.startsWith('/') ? path : `/${path}`}`;
}

export default API_BASE;
