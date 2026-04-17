/**
 * Production-grade API Client with:
 * - Auto token attachment
 * - 401 detection → auto-logout
 * - Token expiry check before requests
 * - Centralized error handling
 */

import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API from "../api/api";

// Global logout callback — set by AuthContext
let _onTokenExpired = null;
export function setTokenExpiredHandler(handler) {
  _onTokenExpired = handler;
}

/**
 * Decode JWT payload without library (base64 only, no verification).
 * Returns null if invalid.
 */
function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired (with 60s buffer).
 */
function isTokenExpired(token) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return false; // No exp = don't block
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now + 60; // 60s buffer before actual expiry
}

/**
 * Handle token expiry — clear storage + trigger logout.
 */
async function handleExpiry() {
  try {
    await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
  } catch {}
  if (_onTokenExpired) _onTokenExpired();
}

// ════════════════════════════════════
// AXIOS INSTANCE
// ════════════════════════════════════

const apiClient = axios.create({
  baseURL: API.BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Request Interceptor ──
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        // Check expiry before sending
        if (isTokenExpired(token)) {
          await handleExpiry();
          return Promise.reject(new Error("Session expired. Please login again."));
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 = token expired/invalid on server side
      if (status === 401) {
        await handleExpiry();
        return Promise.reject(new Error("Session expired. Please login again."));
      }

      if (status === 403) {
        return Promise.reject(new Error(data?.message || "Access denied."));
      }

      if (status === 400 || status === 422) {
        return Promise.reject(new Error(data?.message || "Validation error."));
      }

      if (status >= 500) {
        return Promise.reject(new Error("Server error. Please try again later."));
      }

      return Promise.reject(new Error(data?.message || `Request failed (${status})`));
    }

    if (error.code === "ECONNABORTED") {
      return Promise.reject(new Error("Request timed out. Check your connection."));
    }

    return Promise.reject(new Error(error.message || "Network error."));
  }
);

export default apiClient;
