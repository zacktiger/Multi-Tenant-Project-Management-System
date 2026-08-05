import axios from 'axios';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenUtils';

/**
 * The single configured HTTP client the whole app uses.
 *
 * Two interceptors do all the auth work, so no component or store ever has to
 * think about tokens:
 *   1. request  — attach the current access token to every outgoing call
 *   2. response — on a 401, refresh the tokens once and replay the request
 */

// Defined once and reused: the refresh call below deliberately bypasses this
// client (see why further down), so it needs the same URL independently.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── REQUEST: attach the access token ────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── RESPONSE: refresh once, replay everything ───────────────────────────────

/*
 * The problem this solves.
 *
 * A dashboard typically fires several requests at once. When the 15-minute
 * access token expires, they all come back 401 at the same moment. The naive
 * fix — "on 401, refresh" — would fire one refresh per failed request.
 *
 * That breaks badly here, because refresh tokens are rotated and single-use on
 * the server. The first refresh succeeds and invalidates the token; the rest
 * present that now-revoked token, which the backend correctly reads as a stolen
 * token being replayed. It revokes every session and the user is logged out —
 * caused entirely by their own parallel requests.
 *
 * So: exactly one refresh runs at a time. Everything else waits in a queue and
 * is replayed with the new token once it arrives.
 */

let isRefreshing = false;

/** Requests parked while a refresh is in flight. */
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/** Wakes every parked request — with a new token, or with the failure. */
function resolvePendingRequests(error: unknown, token: string | null) {
  pendingRequests.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  pendingRequests = [];
}

api.interceptors.response.use(
  // Anything that succeeded passes straight through untouched.
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Only 401s are our business, and only the first time for a given request.
    // `_retry` is the guard that stops a request bouncing between here and the
    // server forever if the refreshed token is also rejected.
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // A 401 from login or refresh itself means the credentials or the refresh
    // token are genuinely bad. Retrying those would loop.
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login')
    ) {
      return Promise.reject(error);
    }

    // A refresh is already running — park this request rather than starting
    // a second one, and replay it when the new token lands.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          },
          reject,
        });
      });
    }

    // This request is the one that will perform the refresh.
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');

      /*
       * Note this uses bare `axios`, not our `api` instance. Going through
       * `api` would re-enter this same interceptor if the refresh itself
       * returned 401, and the request interceptor would attach the expired
       * access token we're trying to replace.
       */
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

      const newAccessToken = data.data.accessToken;
      const newRefreshToken = data.data.refreshToken;

      // Store both: the server rotated the refresh token too, so the old one
      // is already dead.
      setTokens(newAccessToken, newRefreshToken);
      resolvePendingRequests(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // The session is unrecoverable: fail everything waiting, clear the dead
      // tokens, and send the user to log in again.
      resolvePendingRequests(refreshError, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      // Must reset on every path, or a single failed refresh would leave the
      // queue permanently closed and every later 401 would hang forever.
      isRefreshing = false;
    }
  }
);

export default api;
