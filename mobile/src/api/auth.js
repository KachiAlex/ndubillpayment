import api from './config';

export const login = async (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const signup = async (userData) => {
  return api.post('/auth/signup', userData);
};

export const logout = async () => {
  return api.post('/auth/logout');
};

export const forgotPassword = async (email) => {
  return api.post('/auth/forgot-password', { email });
};

export const resetPassword = async (token, password) => {
  return api.post('/auth/reset-password', { token, password });
};

export const verifyEmail = async (token) => {
  return api.post('/auth/verify-email', { token });
};
