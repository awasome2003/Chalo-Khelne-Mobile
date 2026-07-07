/**
 * services/http — the single, canonical HTTP layer for the app.
 *
 * Phase 1 of the stack migration collapsed the old 4+ token-attachment
 * mechanisms into THIS module. It owns:
 *   - the shared axios client (the global axios default — the same instance
 *     every screen's bare `import axios` already uses, so nothing had to be
 *     rewritten),
 *   - the request interceptor that attaches the live access token,
 *   - the response interceptor that transparently refreshes on 401 and retries
 *     (single in-flight refresh; concurrent 401s queue behind it),
 *   - `setAuthHeader` / `performRefresh` used by AuthContext.
 *
 * AuthContext wires the logout callback (`setGlobalLogout`) and calls
 * `attachAuthInterceptors()` once at startup. Persistent tokens live in
 * `tokenStore` (SecureStore); this module only touches the in-memory axios
 * default header + refresh exchange.
 *
 * Note: `src/api/authFetch.js` remains the sanctioned shim for the ~26 screens
 * that use `fetch()` directly — it reads the SAME token source (the axios
 * default header, falling back to tokenStore), so there is one source of truth.
 */
import axios from "axios";
import AUTH from "../api/auth";
import tokenStore from "./tokenStore";

// The shared client. Exported so new code can `import { http } from
// "../services/http"` explicitly; it is the global axios default, so it is the
// same instance as legacy `import axios from "axios"` calls.
export const http = axios;

let _globalLogout = null;
let _globalAxiosAttached = false;

/** AuthContext registers its logout() here so the 401 flow can fall back to it. */
export function setGlobalLogout(fn) {
  _globalLogout = fn;
}

/** Mirror the access token onto the axios default header (or clear it). */
export function setAuthHeader(token) {
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
}

// ── Refresh-token flow ──
// On a 401, transparently exchange the refresh token for a new access token and
// retry the original request. Concurrent 401s queue behind a SINGLE in-flight
// refresh; only when the refresh itself fails do we log out.
let _isRefreshing = false;
let _refreshQueue = [];
const _flushQueue = (err, token) => {
  _refreshQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
  _refreshQueue = [];
};

// Uses fetch (NOT axios) so it never re-enters the axios interceptor → no loop.
export async function performRefresh() {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error("no_refresh_token");
  const res = await fetch(AUTH.ENDPOINTS.REFRESH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error("refresh_failed");
  const data = await res.json();
  if (!data.token) throw new Error("refresh_failed");
  await tokenStore.setToken(data.token);
  if (data.refreshToken) await tokenStore.setRefreshToken(data.refreshToken);
  // Keep the active account's saved copy fresh too, so token rotation doesn't
  // strand it when the user switches away and back.
  try {
    const activeId = await tokenStore.getActiveSessionId();
    if (activeId) {
      await tokenStore.upsertSession({
        id: activeId,
        token: data.token,
        refreshToken: data.refreshToken,
      });
    }
  } catch (_) {}
  setAuthHeader(data.token);
  return data.token;
}

/**
 * Attach the request + response interceptors to the shared axios client.
 * Idempotent — safe to call more than once. Call once at app startup.
 */
export function attachAuthInterceptors() {
  if (_globalAxiosAttached) return;
  _globalAxiosAttached = true;

  // Request: enforce the live in-memory token on every bare-axios call. This
  // overrides any stale per-call header a screen may set (e.g. a screen still
  // reading the old AsyncStorage key now returns null → "Bearer null"); the
  // real token (kept in SecureStore, mirrored to the axios default) wins.
  axios.interceptors.request.use((config) => {
    const def = axios.defaults.headers.common.Authorization;
    if (def) {
      config.headers = config.headers || {};
      config.headers.Authorization = def;
    }
    return config;
  });

  // Response: on 401, refresh-then-retry; logout only if the refresh fails.
  axios.interceptors.response.use(
    (r) => r,
    async (error) => {
      const original = error.config;
      const status = error?.response?.status;
      if (status !== 401 || !original || original._retry) {
        return Promise.reject(error);
      }
      // Never attempt to refresh the auth endpoints themselves (avoid loops).
      const url = original.url || "";
      if (url.includes("/auth/refresh") || url.includes("/login") || url.includes("/google-login")) {
        if (_globalLogout) _globalLogout();
        return Promise.reject(error);
      }
      if (_isRefreshing) {
        // Queue behind the in-flight refresh, then retry with the new token.
        return new Promise((resolve, reject) => _refreshQueue.push({ resolve, reject })).then(
          (token) => {
            original._retry = true;
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${token}`;
            return axios(original);
          }
        );
      }
      original._retry = true;
      _isRefreshing = true;
      try {
        const newToken = await performRefresh();
        _flushQueue(null, newToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return axios(original);
      } catch (refreshErr) {
        _flushQueue(refreshErr, null);
        if (_globalLogout) _globalLogout();
        return Promise.reject(error);
      } finally {
        _isRefreshing = false;
      }
    }
  );
}
