import apiClient from './apiClient';
import { API_ENDPOINTS } from '../config/api';

export const authService = {

  login: async (username: string, password: string) => {
    const { data } = await apiClient.post(API_ENDPOINTS.LOGIN, { username, password });

    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => {
    const { data } = await apiClient.post(API_ENDPOINTS.REGISTER, userData);
    return data;
  },

  googleLogin: async (googleToken: string) => {
    const { data } = await apiClient.post(API_ENDPOINTS.GOOGLE_LOGIN, { googleToken });

    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  logout: async () => {
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
      console.log('Logout success');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  deleteAccount: async () => {
    try {
      const { data } = await apiClient.delete(API_ENDPOINTS.DELETE_USER);
      return data;
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getAccessToken: () => localStorage.getItem('accessToken'),

  isAuthenticated: () => !!localStorage.getItem('accessToken'),
};