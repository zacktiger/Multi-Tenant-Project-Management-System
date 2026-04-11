import { create } from 'zustand';
import * as authApi from '../api/auth.api';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenUtils';
import { getApiErrorMessage } from '../utils/apiError';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: 'admin' | 'member' | 'viewer';
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  organizations: Organization[];
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, organization: Organization, accessToken: string, refreshToken: string) => void;
  loginAction: (credentials: { email: string; password: string }) => Promise<string | null>;
  signupAction: (data: { name: string; email: string; password: string; orgName: string }) => Promise<string | null>;
  acceptInviteAction: (token: string, data: { name?: string; password?: string }) => Promise<string | null>;
  switchOrgAction: (orgId: string) => Promise<string | null>;
  logoutAction: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  organizations: [],
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, organization, accessToken, refreshToken) => {
    setTokens(accessToken, refreshToken);
    set({ 
      user, 
      organization, 
      organizations: [organization],
      isAuthenticated: true 
    });
  },

  loginAction: async (credentials) => {
    try {
      const { data } = await authApi.login(credentials);
      const { user, organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ user, organization, organizations: [organization], isAuthenticated: true });
      return null;
    } catch (error) {
      return getApiErrorMessage(error, 'Login failed');
    }
  },

  signupAction: async (signupData) => {
    try {
      const { data } = await authApi.signup(signupData);
      const { user, organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ user, organization, organizations: [organization], isAuthenticated: true });
      return null;
    } catch (error) {
      return getApiErrorMessage(error, 'Signup failed');
    }
  },

  acceptInviteAction: async (token, inviteData) => {
    try {
      const { data } = await authApi.acceptInvitation(token, inviteData);
      const { user, organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ user, organization, organizations: [organization], isAuthenticated: true });
      return null;
    } catch (error) {
      return getApiErrorMessage(error, 'Failed to join organization');
    }
  },

  switchOrgAction: async (orgId) => {
    try {
      const { data } = await authApi.switchOrganization(orgId);
      const { organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ organization });
      return null;
    } catch (error) {
      return getApiErrorMessage(error, 'Failed to switch organization');
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
      set({ user: null, organization: null, organizations: [], isAuthenticated: false });
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
      
      const currentToken = getAccessToken();
      let activeOrg = null;
      if (currentToken) {
        try {
          const payload = JSON.parse(atob(currentToken.split('.')[1]));
          activeOrg = organizations.find((o: Organization) => o.id === payload.orgId) || organizations[0];
        } catch {
          activeOrg = organizations[0];
        }
      } else {
        activeOrg = organizations[0];
      }

      set({ user, organization: activeOrg, organizations, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, organization: null, organizations: [], isAuthenticated: false, isLoading: false });
    }
  },
}));
