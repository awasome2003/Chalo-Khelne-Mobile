/**
 * Centralized auth-token storage (Phase 3, item 3b).
 *
 * Source of truth = expo-secure-store (Keychain / Keystore), NOT plaintext
 * AsyncStorage. Falls back to AsyncStorage if the native module isn't present
 * (so dev/builds without it keep working), and performs a one-time migration
 * of any existing AsyncStorage token into SecureStore.
 *
 * Key stays "auth_token" so existing readers keep the same key.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

let SecureStore = null;
try {
  // Optional native module — degrade gracefully if absent.
  SecureStore = require("expo-secure-store");
} catch (_e) {
  SecureStore = null;
}

const KEY = "auth_token";
const REFRESH_KEY = "refresh_token";

async function secureAvailable() {
  try {
    return !!SecureStore && (await SecureStore.isAvailableAsync());
  } catch {
    return false;
  }
}

export async function getToken() {
  if (await secureAvailable()) {
    let token = await SecureStore.getItemAsync(KEY);
    if (!token) {
      // One-time migration: lift a legacy plaintext token into SecureStore.
      const legacy = await AsyncStorage.getItem(KEY);
      if (legacy) {
        await SecureStore.setItemAsync(KEY, legacy);
        await AsyncStorage.removeItem(KEY);
        token = legacy;
      }
    }
    return token || null;
  }
  return AsyncStorage.getItem(KEY);
}

export async function setToken(token) {
  if (!token) return clearToken();
  if (await secureAvailable()) {
    await SecureStore.setItemAsync(KEY, token);
    await AsyncStorage.removeItem(KEY); // ensure no plaintext copy lingers
  } else {
    await AsyncStorage.setItem(KEY, token);
  }
}

export async function clearToken() {
  try {
    if (SecureStore) await SecureStore.deleteItemAsync(KEY);
  } catch {}
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

// ── Refresh token (Phase 8.1) — stored in SecureStore alongside the access token ──
export async function getRefreshToken() {
  if (await secureAvailable()) return (await SecureStore.getItemAsync(REFRESH_KEY)) || null;
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function setRefreshToken(token) {
  if (!token) return clearRefreshToken();
  if (await secureAvailable()) {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
    await AsyncStorage.removeItem(REFRESH_KEY);
  } else {
    await AsyncStorage.setItem(REFRESH_KEY, token);
  }
}

export async function clearRefreshToken() {
  try {
    if (SecureStore) await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {}
  try {
    await AsyncStorage.removeItem(REFRESH_KEY);
  } catch {}
}

export default { getToken, setToken, clearToken, getRefreshToken, setRefreshToken, clearRefreshToken };
