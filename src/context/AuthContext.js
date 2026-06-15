import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import AUTH from "../api/auth";
import NotificationService from "../services/NotificationService";
import { setTokenExpiredHandler } from "../services/apiClient";
import tokenStore from "../services/tokenStore";

// ── Global axios auth (Phase 3) ──
// Attaches the token to EVERY bare-axios call app-wide (legacy + new screens)
// and auto-logs-out on 401 — without per-screen changes. The 401 interceptor
// re-rejects the ORIGINAL error so callers' `err.response.data.message` still works.
let _globalLogout = null;
let _globalAxiosAttached = false;
const setAuthHeader = (token) => {
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
};

// ── Refresh-token flow (Phase 8.1) ──
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
const _performRefresh = async () => {
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
  setAuthHeader(data.token);
  return data.token;
};

const attachGlobalAxios = () => {
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
        const newToken = await _performRefresh();
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
};

// ... (Storage object remains same)
const USER_KEY = "auth_user";

// Create the context with default values
const AuthContext = createContext({
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isPlayer: false,
  isTrainer: false,
  isReferee: false,
  register: () => { },
  login: () => { },
  logout: () => { },
  updateProfile: () => { },
  forgotPassword: () => { },
  resetPassword: () => { },
  googleLogin: () => { },
});

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Helper functions for storage operations
const Storage = {
  // Token operations — backed by SecureStore via tokenStore (Phase 3b)
  async storeToken(token) {
    try {
      await tokenStore.setToken(token);
    } catch (error) {
      console.error("Error storing token", error);
    }
  },

  async getToken() {
    try {
      return await tokenStore.getToken();
    } catch (error) {
      console.error("Error getting token", error);
      return null;
    }
  },

  // User operations
  async storeUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error("Error storing user", error);
    }
  },

  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error getting user", error);
      return null;
    }
  },

  // Clear storage
  async clear() {
    try {
      await tokenStore.clearToken();
      await tokenStore.clearRefreshToken();
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error("Error clearing storage", error);
    }
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsInitializing(true);
        setLoading(true);
        let storedToken = await Storage.getToken();
        const storedUser = await Storage.getUser();

        if (storedToken && storedUser) {
          // If the (1h) access token is expired, try to refresh it before
          // giving up — only log out if there's no valid refresh token.
          try {
            const parts = storedToken.split(".");
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
              if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
                try {
                  storedToken = await _performRefresh();
                  console.log("[AUTH] Access token refreshed on startup");
                } catch (refreshErr) {
                  console.log("[AUTH] Access expired and refresh failed, clearing...");
                  await Storage.clear();
                  setUser(null);
                  setToken(null);
                  setIsInitializing(false);
                  setLoading(false);
                  return;
                }
              }
            }
          } catch {}

          // Try to fetch fresh user data from server
          try {
            const response = await fetch(AUTH.ENDPOINTS.CURRENT_USER, {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            });

            if (response.status === 401) {
              // Token rejected by server — clear and logout
              console.log("[AUTH] Token rejected by server (401), logging out...");
              await Storage.clear();
              setUser(null);
              setToken(null);
              setIsInitializing(false);
              setLoading(false);
              return;
            }

            if (response.ok) {
              const freshUser = await response.json();
              await Storage.storeUser(freshUser);
              setUser(freshUser);
              NotificationService.registerPushTokenForNewUser(freshUser.id || freshUser._id);
            } else {
              setUser(storedUser);
              NotificationService.registerPushTokenForNewUser(storedUser.id || storedUser._id);
            }
          } catch (fetchError) {
            console.warn("Could not fetch fresh user data, using stored user:", fetchError);
            setUser(storedUser);
            NotificationService.registerPushTokenForNewUser(storedUser.id || storedUser._id);
          }
          setToken(storedToken);
        } else {
          setUser(null);
          setToken(null);
          await Storage.clear();
        }
      } catch (err) {
        console.error("Error loading user:", err);
        await Storage.clear();
        setUser(null);
        setToken(null);
      } finally {
        setIsInitializing(false);
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // API request helper
  const apiRequest = async (
    endpoint,
    method,
    data = null,
    requiresAuth = false
  ) => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (requiresAuth) {
        const authToken = await Storage.getToken();
        if (!authToken) throw new Error("Authentication required");
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const config = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        // Add timeout to prevent hanging requests
        timeout: 10000,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(endpoint, {
          ...config,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const responseData = await response.json();

        // If the response is not ok, throw the specific error from the server
        if (!response.ok) {
          throw new Error(
            responseData.error ||
            responseData.message ||
            `Server error: ${response.status}`
          );
        }

        return responseData;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection.');
        }
        throw err;
      }
    } catch (err) {
      // Rethrow the error to be handled by the calling function
      throw err;
    }
  };

  // const updateUser = async (updatedUser) => {
  //   if (!updatedUser) return;

  //   try {
  //     await Storage.storeUser(updatedUser);
  //     setUser(updatedUser);
  //   } catch (err) {
  //     console.error("Error updating user in context:", err);
  //   }
  // };

  const updateUser = async (updatedUser, newToken = null) => {
    if (!updatedUser) return;

    try {
      await Storage.storeUser(updatedUser);
      setUser(updatedUser);

      if (newToken) {
        await Storage.storeToken(newToken);
        setToken(newToken);
      }
    } catch (err) {
      console.error("Error updating user in context:", err);
    }
  };

  // Register a new user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(AUTH.ENDPOINTS.REGISTER, "POST", userData);

      // Don't automatically log in after registration
      // Just return the response data for the UI to handle
      if (data) {
        // Still register for push notifications if needed
        try {
          if (data.user && (data.user.id || data.user._id)) {
            await NotificationService.registerPushTokenForNewUser(data.user.id || data.user._id);
          }
        } catch (notifError) {
          console.error("Error registering for notifications:", notifError);
          // Don't fail registration if push notification registration fails
        }
      }

      return data;
    } catch (err) {
      setError(err.message || "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Log in an existing user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(AUTH.ENDPOINTS.LOGIN, "POST", credentials);

      if (data.error || data.message) {
        // Handle server errors that come in a structured format
        throw new Error(data.error || data.message);
      }

      if (!data || !data.token || !data.user) {
        throw new Error("Invalid response from server");
      }

      await Storage.storeToken(data.token);
      if (data.refreshToken) await tokenStore.setRefreshToken(data.refreshToken);
      await Storage.storeUser(data.user);
      setUser(data.user);
      setToken(data.token);

      // Check if logged-in user already has a push token
      // If not, register one for them
      try {
        await NotificationService.registerPushTokenForNewUser(data.user.id || data.user._id);
      } catch (notifError) {
        console.error("Error registering for notifications:", notifError);
        // Don't fail login if push registration fails
      }

      return data;
    } catch (err) {
      // Clear any partial auth state to ensure we stay in the current navigator
      // This ensures failed login attempts don't trigger navigation changes
      setUser(null);
      setToken(null);

      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const responseData = await apiRequest(
        AUTH.ENDPOINTS.GOOGLE_LOGIN,
        "POST",
        data
      );

      if (!responseData?.token || !responseData?.user?._id) {
        throw new Error("Invalid response from server");
      }

      await Storage.storeToken(responseData.token);
      if (responseData.refreshToken) await tokenStore.setRefreshToken(responseData.refreshToken);
      await Storage.storeUser(responseData.user);

      setUser(responseData.user);
      setToken(responseData.token);

      // Optional – never block login
      try {
        await NotificationService.registerPushTokenForNewUser(
          responseData.user._id
        );
      } catch (e) {
        console.warn("Push token registration skipped:", e);
      }

      return responseData;
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err.message ||
        "Google login failed";

      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  // Log out
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Best-effort server-side revoke of the refresh token (kill-switch).
      try {
        const rt = await tokenStore.getRefreshToken();
        if (rt) {
          await fetch(AUTH.ENDPOINTS.LOGOUT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: rt }),
          });
        }
      } catch (revokeErr) {
        // Ignore — the local clear below still logs the user out.
      }
      await Storage.clear();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Register global token expiry handler for apiClient + the global bare-axios interceptor
  useEffect(() => {
    setTokenExpiredHandler(() => {
      console.log("[AUTH] Token expired — auto logout triggered");
      logout();
    });
    _globalLogout = logout;
    attachGlobalAxios();
  }, [logout]);

  // Keep the global axios Authorization header in sync with auth state, so every
  // bare-axios call across the app carries the token (and it clears on logout).
  useEffect(() => {
    setAuthHeader(token);
  }, [token]);

  // Update profile (works for all user types)
  const updateProfile = async (userId, profileData, profileType = "user") => {
    setLoading(true);
    setError(null);
    try {
      let endpoint;

      // Determine endpoint based on profile type
      switch (profileType) {
        case "trainer":
          endpoint = AUTH.ENDPOINTS.TRAINER.PROFILE(userId);
          break;
        case "referee":
          endpoint = AUTH.ENDPOINTS.REFEREE.PROFILE(userId);
          break;
        default:
          endpoint = AUTH.ENDPOINTS.USER.PROFILE(userId);
      }

      const data = await apiRequest(endpoint, "PUT", profileData, true);

      // Update user state if it's the main user profile
      if (profileType === "user" && data && data.user) {
        const updatedUser = { ...user, ...data.user };
        await Storage.storeUser(updatedUser);
        setUser(updatedUser);
      }

      return data;
    } catch (err) {
      setError(err.message || `${profileType} profile update failed`);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Forgot password — send OTP (does NOT use global loading to avoid blocking reset form)
  const forgotPassword = async (email) => {
    setError(null);
    try {
      const response = await apiRequest(`${AUTH.BASE_URL}/email/forgot-password/send-otp`, "POST", {
        email,
      });
      return { success: true, ...response };
    } catch (err) {
      setError(err.message || "Password reset request failed");
      throw err;
    }
  };

  // Reset password with OTP — verify then reset in sequence
  const resetPassword = async (data) => {
    setError(null);
    try {
      // 1. Verify OTP first
      await apiRequest(`${AUTH.BASE_URL}/email/forgot-password/verify-otp`, "POST", {
        email: data.email,
        otp: data.otp,
      });
      // 2. Reset password if OTP matched and verified
      return await apiRequest(`${AUTH.BASE_URL}/email/forgot-password/reset`, "POST", {
        email: data.email,
        newPassword: data.newPassword,
      });
    } catch (err) {
      setError(err.message || "Password reset failed");
      throw err;
    }
  };

  // Role-specific helper methods
  const isPlayer = user && user.role === "Player";
  const isTrainer = user && user.role === "Trainer";
  const isReferee = user && user.role === "Referee";

  const value = {
    user,
    token,
    loading,
    isInitializing,
    error,
    register,
    login,
    logout,
    updateProfile,
    updateUser,
    forgotPassword,
    resetPassword,
    googleLogin,
    isAuthenticated: !!user,
    isPlayer,
    isTrainer,
    isReferee,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
