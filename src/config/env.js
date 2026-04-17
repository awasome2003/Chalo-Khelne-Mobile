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
    SERVER_URL: "http://192.168.1.35:3003",
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
const ACTIVE_ENV = "production"; // change to "development" for local testing
// ──────────────────────────────────────────

const config = ENVIRONMENTS[ACTIVE_ENV] || ENVIRONMENTS.development;

export const SERVER_URL = config.SERVER_URL;
export const BASE_URL = `${config.SERVER_URL}/api`;
export const UPLOADS_URL = `${config.SERVER_URL}/uploads`;

export default config;
