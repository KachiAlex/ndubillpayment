import React, { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function buildUrl(path) {
  // Always ensure path starts with /api
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (cleanPath.startsWith('/api/')) return cleanPath;
  return '/api' + cleanPath;
}

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const apiFetch = async (path, options = {}, timeoutMs = 25000) => {
    const url = buildUrl(path);
    console.log('[apiFetch]', options.method || 'GET', url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. The server may be cold-starting. Please try again.');
      }
      throw new Error(err.message || 'Network error. Please check your connection.');
    }
  };

  async function parseError(res) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      const html = await res.text().catch(() => '');
      console.error('[apiFetch] Received HTML instead of JSON. Status:', res.status, 'URL:', res.url, 'First 200 chars:', html.slice(0, 200));
      if (res.status === 405) {
        return 'API endpoint not found (405). The backend may be misconfigured.';
      }
      return `Server returned HTML page (status ${res.status}) instead of JSON. Check server logs.`;
    }
    const text = await res.text().catch(() => '');
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    const msg = data?.error || text || `Request failed: ${res.status}`;

    if (res.status === 401) return `Authentication failed: ${msg}`;
    if (res.status === 403) return `Access denied: ${msg}`;
    if (res.status === 404) return `API endpoint not found (404). ${msg}`;
    if (res.status === 405) return `Method not allowed (405). URL may be wrong: ${res.url}`;
    if (res.status === 429) return `Too many requests. Please wait and try again.`;
    if (res.status >= 500) return `Server error (${res.status}): ${msg}. Please try again later.`;
    return msg;
  }

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await parseError(res);
      throw new Error(err);
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (userData) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await parseError(res);
      throw new Error(err);
    }
    return await res.json();
  };

  const logout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
