import { create } from 'zustand';
import * as authApi from '../api/auth.api';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenUtils';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  loginAction: (credentials: { email: string; password: string }) => Promise<string | null>;
  signupAction: (data: { name: string; email: string; password: string; orgName: string }) => Promise<string | null>;
  logoutAction: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,

  loginAction: async (credentials) => {
    try {
      const { data } = await authApi.login(credentials);
      const { user, organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ user, organization, isAuthenticated: true });
      return null;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed';
      return message;
    }
  },

  signupAction: async (signupData) => {
    try {
      const { data } = await authApi.signup(signupData);
      const { user, organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ user, organization, isAuthenticated: true });
      return null;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Signup failed';
      return message;
    }
  },

  logoutAction: async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await authApi.logout({ refreshToken });
      }
    } catch {
      // Logout should always succeed client-side
    } finally {
      clearTokens();
      set({ user: null, organization: null, isAuthenticated: false });
    }
  },

  initAuth: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const { data } = await authApi.getMe();
      const { user, organizations } = data.data;
      const org = organizations?.[0] || null;

      set({ user, organization: org, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, organization: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
