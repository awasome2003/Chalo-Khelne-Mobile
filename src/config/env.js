/**
 * Environment Configuration
 *
 * Change the active environment here instead of hardcoding IPs in api.js.
 * In production, use the deployed backend URL.
 *
 * Usage:
 *   import { SERVER_URL } from '../config/env';
 */

import { NativeModules } from "react-native";

// Auto-detect the dev machine's LAN IP from the Metro bundle URL, so the dev
// SERVER_URL always tracks whatever machine is running `expo start` — no manual
// IP edits when DHCP changes your address. Falls back to the last-known IP.
const DEV_FALLBACK_IP = "192.168.1.65";
function detectDevHost() {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL || "";
    const m = scriptURL.match(/https?:\/\/([^:/]+)/);
    const host = m && m[1];
    if (host && host !== "localhost" && host !== "127.0.0.1") return host;
  } catch {
    /* not available in this context — use fallback */
  }
  return DEV_FALLBACK_IP;
}

const ENVIRONMENTS = {
  development: {
    // LAN IP auto-detected from the Metro host (the machine running expo start).
    // Both phone and laptop must be on the same Wi-Fi for this to work.
    // Keep this in sync with src/api/api.js (the primary API config).
    SERVER_URL: `http://${detectDevHost()}:3003`,
  },
  staging: {
    SERVER_URL: "https://chalo-khelne-backend-hp3z.onrender.com",
  },
  production: {
    SERVER_URL: "https://chalokhelne.com",
  },
};

// ──────────────────────────────────────────
// SET ACTIVE ENVIRONMENT HERE
// ──────────────────────────────────────────
const ACTIVE_ENV = "development"; // change to "production" before shipping
// ──────────────────────────────────────────

const config = ENVIRONMENTS[ACTIVE_ENV] || ENVIRONMENTS.development;

export const SERVER_URL = config.SERVER_URL;
export const BASE_URL = `${config.SERVER_URL}/api`;
export const UPLOADS_URL = `${config.SERVER_URL}/uploads`;

export default config;
