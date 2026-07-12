import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  uuid: string;
  username: string;
  expiresAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      register: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/api/auth/register', { username, password });
          const { uuid, username: uname, accessToken, refreshToken, expiresAt } = res.data;
          set({
            user: { uuid, username: uname, expiresAt },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          set({
            error: err.response?.data?.error || 'Registration failed',
            isLoading: false,
          });
          throw err;
        }
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/api/auth/login', { username, password });
          const { uuid, username: uname, accessToken, refreshToken, expiresAt } = res.data;
          set({
            user: { uuid, username: uname, expiresAt },
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err: any) {
          set({
            error: err.response?.data?.error || 'Login failed',
            isLoading: false,
          });
          throw err;
        }
      },

      logout: async () => {
        try {
          const token = get().accessToken;
          if (token) {
            await api.post('/api/auth/logout', {}, {
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch {}
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      deleteAccount: async () => {
        try {
          const token = get().accessToken;
          await api.delete('/api/auth/account', {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {}
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshAccessToken: async () => {
        const refresh = get().refreshToken;
        if (!refresh) return;
        try {
          const res = await api.post('/api/auth/refresh', { refreshToken: refresh });
          set({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          });
        } catch {
          // Refresh failed — force logout
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nullchat-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
