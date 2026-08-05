import { create } from 'zustand';
import * as authApi from '../api/auth.api';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenUtils';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Who the signed-in user is.
 *
 * Kept separate from `useStore` (workspaces, projects, tasks) on purpose: this
 * state lives for the whole session, while the data in the other store is
 * scoped to whatever the user is currently looking at and is wiped whenever
 * they switch organization.
 */

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

/** What the API returns from any endpoint that hands back a new session. */
interface SessionPayload {
  user: User;
  organization: Organization;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  organizations: Organization[];
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, organization: Organization, accessToken: string, refreshToken: string) => void;
  /* The *Action methods resolve to an error message, or null on success, so the
   * calling component can render the failure inline instead of throwing. */
  loginAction: (credentials: { email: string; password: string }) => Promise<string | null>;
  signupAction: (data: { name: string; email: string; password: string; orgName: string }) => Promise<string | null>;
  acceptInviteAction: (token: string, data: { name?: string; password?: string }) => Promise<string | null>;
  switchOrgAction: (orgId: string) => Promise<string | null>;
  logoutAction: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => {
  /**
   * Runs an API call that returns a new session, and commits the result.
   *
   * Login, signup, and accepting an invitation are three different endpoints
   * that all end the same way: store the tokens, mark the user authenticated.
   * That tail was written out three times; this is it written once.
   */
  const startSession = async (
    request: () => Promise<{ data: { data: SessionPayload } }>,
    fallbackMessage: string
  ): Promise<string | null> => {
    try {
      const { data } = await request();
      const { user, organization, accessToken, refreshToken } = data.data;

      setTokens(accessToken, refreshToken);
      set({ user, organization, organizations: [organization], isAuthenticated: true });
      return null;
    } catch (error) {
      return getApiErrorMessage(error, fallbackMessage);
    }
  };

  return {
    user: null,
    organization: null,
    organizations: [],
    isAuthenticated: false,
    // Starts true so the app shows a spinner instead of flashing the login
    // screen at users who already have a valid session. initAuth clears it.
    isLoading: true,

    setAuth: (user, organization, accessToken, refreshToken) => {
      setTokens(accessToken, refreshToken);
      set({
        user,
        organization,
        organizations: [organization],
        isAuthenticated: true,
      });
    },

    loginAction: (credentials) =>
      startSession(() => authApi.login(credentials), 'Login failed'),

    signupAction: (signupData) =>
      startSession(() => authApi.signup(signupData), 'Signup failed'),

    acceptInviteAction: (token, inviteData) =>
      startSession(() => authApi.acceptInvitation(token, inviteData), 'Failed to join organization'),

    switchOrgAction: async (orgId) => {
      /*
       * Clear the other store first. Its contents belong to the organization
       * we're leaving, and leaving them in place would briefly render one
       * org's projects under another org's name — a tenant leak the user can
       * actually see.
       *
       * The dynamic import avoids a circular dependency: useStore does not
       * import this module, and this keeps it that way at load time.
       */
      const { useStore } = await import('./useStore');
      useStore.setState({ workspaces: [], projects: [], tasks: [], members: [] });

      try {
        const { data } = await authApi.switchOrganization(orgId);
        const { organization, accessToken, refreshToken } = data.data;

        // New tokens are required, not optional: the active organization is
        // encoded inside the signed JWT, so the server has to reissue it.
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
        // Deliberately ignored. Revoking server-side is best-effort; if the
        // network is down the user must still be able to log out locally.
      } finally {
        clearTokens();
        set({ user: null, organization: null, organizations: [], isAuthenticated: false });
      }
    },

    /**
     * Restores the session on page load from whatever is in localStorage.
     *
     * Runs once from App.tsx. If the stored token is missing or rejected, the
     * user is simply treated as logged out.
     */
    initAuth: async () => {
      const token = getAccessToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }

      try {
        const { data } = await authApi.getMe();
        const { user, organizations } = data.data;

        set({
          user,
          organization: findActiveOrg(organizations),
          organizations,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token was expired or invalid and the refresh interceptor couldn't
        // save it — drop it and start clean.
        clearTokens();
        set({
          user: null,
          organization: null,
          organizations: [],
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },
  };
});

/**
 * Picks which organization the restored session should be looking at.
 *
 * The active org is recorded inside the JWT, so we read the payload to find it
 * and fall back to the first org if anything is off.
 *
 * Reading a JWT client-side is safe *here* specifically because the value is
 * only used to choose which org tab to highlight. A JWT payload is base64, not
 * encrypted — anyone can read it and anyone could forge one. Its security comes
 * from the signature, which only the server can verify. Using this value for an
 * authorisation decision would be a real vulnerability; using it to pick a
 * highlighted tab is not.
 */
function findActiveOrg(organizations: Organization[]): Organization | null {
  const token = getAccessToken();
  if (!token) return organizations[0] ?? null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return organizations.find((o) => o.id === payload.orgId) || organizations[0] || null;
  } catch {
    // Malformed token — not worth failing the whole session restore over.
    return organizations[0] ?? null;
  }
}
