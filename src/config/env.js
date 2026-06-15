/**
 * Environment Configuration
 *
 * Change the active environment here instead of hardcoding IPs in api.js.
 * In production, use the deployed backend URL.
 *
 * Usage:
 *   import { SERVER_URL } from '../config/env';
 */

const ENVIRONMENTS = {
  development: {
    // Laptop LAN IP, captured 2026-05-21 via `ipconfig`. Re-check whenever
    // you change networks — DHCP can hand you a different address.
    // Both phone and laptop must be on the same Wi-Fi for this to work.
    SERVER_URL: "http://10.88.83.245:3003",
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
