import { parseResponseError } from '../utils/errorUtils';

export const API_BASE = process.env.REACT_APP_API_URL || '/api';

function buildUrl(path) {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (cleanPath.startsWith('/api/')) return cleanPath;
  return '/api' + cleanPath;
}

export async function apiFetch(path, options = {}, timeoutMs = 25000) {
  const token = localStorage.getItem('token');
  const url = buildUrl(path);
  console.log('[apiFetch]', options.method || 'GET', url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      credentials: 'include',
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(await parseResponseError(res));
    }
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Server may be cold-starting. Please try again.');
    }
    throw err;
  }
}
