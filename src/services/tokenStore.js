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

// ── Multi-session account registry (account switcher) ───────────────────────
// Lets the app remember more than one signed-in account (e.g. a player account
// AND a school-coach account) and flip between them WITHOUT logging out. The
// ACTIVE session is still mirrored to the canonical auth_token/refresh_token/
// auth_user keys above, so every existing screen keeps working unchanged — this
// only adds the ability to save several and swap which one is "active".
//
// Layout:
//   auth_sessions        (AsyncStorage) → [{ id, user }]  (non-secret metadata)
//   active_session_id    (AsyncStorage) → id of the active account
//   auth_token__<id>     (SecureStore)  → that account's access token
//   refresh_token__<id>  (SecureStore)  → that account's refresh token
const SESSIONS_KEY = "auth_sessions";
const ACTIVE_SESSION_KEY = "active_session_id";
const tkKey = (id) => `auth_token__${id}`;
const rtKey = (id) => `refresh_token__${id}`;

// Per-key secure helpers (mirror the access-token strategy: SecureStore first,
// AsyncStorage fallback, never leave a plaintext copy behind).
async function secureGet(key) {
  if (await secureAvailable()) return (await SecureStore.getItemAsync(key)) || null;
  return AsyncStorage.getItem(key);
}
async function secureSet(key, val) {
  if (!val) return secureDel(key);
  if (await secureAvailable()) {
    await SecureStore.setItemAsync(key, val);
    await AsyncStorage.removeItem(key);
  } else {
    await AsyncStorage.setItem(key, val);
  }
}
async function secureDel(key) {
  try { if (SecureStore) await SecureStore.deleteItemAsync(key); } catch {}
  try { await AsyncStorage.removeItem(key); } catch {}
}

export async function getSessions() {
  try {
    const raw = await AsyncStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveSessionsMeta(list) {
  await AsyncStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify(list.map((s) => ({ id: String(s.id), user: s.user })))
  );
}

export async function getActiveSessionId() {
  return AsyncStorage.getItem(ACTIVE_SESSION_KEY);
}

export async function setActiveSessionId(id) {
  if (id) await AsyncStorage.setItem(ACTIVE_SESSION_KEY, String(id));
  else await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
}

// Add or update a saved account (tokens → SecureStore, metadata → AsyncStorage).
export async function upsertSession({ id, token, refreshToken, user }) {
  id = String(id);
  if (token) await secureSet(tkKey(id), token);
  if (refreshToken) await secureSet(rtKey(id), refreshToken);
  const list = await getSessions();
  const i = list.findIndex((s) => String(s.id) === id);
  // Preserve the existing display user when this is a token-only refresh.
  const keepUser = user !== undefined ? user : i >= 0 ? list[i].user : user;
  const entry = { id, user: keepUser };
  if (i >= 0) list[i] = entry;
  else list.push(entry);
  await saveSessionsMeta(list);
  return list;
}

// Full session (metadata + secret tokens) for one account.
export async function getSession(id) {
  id = String(id);
  const meta = (await getSessions()).find((s) => String(s.id) === id);
  if (!meta) return null;
  return {
    id,
    user: meta.user,
    token: await secureGet(tkKey(id)),
    refreshToken: await secureGet(rtKey(id)),
  };
}

// Forget one account (used when removing it from the switcher or on logout).
export async function removeSession(id) {
  id = String(id);
  await secureDel(tkKey(id));
  await secureDel(rtKey(id));
  const list = (await getSessions()).filter((s) => String(s.id) !== id);
  await saveSessionsMeta(list);
  return list;
}

export default {
  getToken, setToken, clearToken,
  getRefreshToken, setRefreshToken, clearRefreshToken,
  getSessions, getActiveSessionId, setActiveSessionId,
  upsertSession, getSession, removeSession,
};
