// config/api.js — Central API configuration

// ── Server Configuration ──
// Auto-selects by build: production bundles (__DEV__ === false) use the live
// HTTPS server; Metro/dev builds use the LAN IP. No manual toggle before APK build.
const Wbsite_SERVER_URL = __DEV__
  ? "http://192.168.1.55:3003" // local development
  : "https://chalokhelne.com"; // production

const SERVER_URL = Wbsite_SERVER_URL;
const BASE_URL = `${SERVER_URL}/api`;
const UPLOADS_URL = `${SERVER_URL}/uploads`;

// API endpoints based on your existing routes
const ENDPOINTS = {
  TURFS: {
    BASE: `${BASE_URL}/turfs`,
    BY_ID: (id) => `${BASE_URL}/turfs/${id}`,
    OWNER: `${BASE_URL}/turfs/owner`,
    REVIEWS: (id) => `${BASE_URL}/turfs/${id}/reviews`,
    TOGGLE_STATUS: (id) => `${BASE_URL}/turfs/${id}/toggle-status`,
    AVAILABILITY_TODAY: `${BASE_URL}/turfs/availability/today`,

    // Get certified trainers for a specific turf
    CERTIFIED_TRAINERS: (turfId) =>
      `${BASE_URL}/trainer/certified-trainers/${turfId}`,
  },

  USER: {
    BASE: `${BASE_URL}/users`,
    FAVORITES: `${BASE_URL}/users/favorites`,
    TOGGLE_FAVORITE: `${BASE_URL}/users/favorites/toggle`,
    CHECK_FAVORITE: `${BASE_URL}/users/favorites/check`,
    USER_FAVORITES: (userId) => `${BASE_URL}/users/user-favorites/${userId}`,
    SEARCH: (query) => `${BASE_URL}/users/search?q=${query}`, // Add search endpoint
    VALIDATE_PLAYERS: `${BASE_URL}/players/users/validate-players`,
  },

  // Add turf booking endpoints
  TURF_BOOKINGS: {
    CREATE: `${BASE_URL}/players/turf-bookings/create`,
    USER_BOOKINGS: (userId) =>
      `${BASE_URL}/players/turf-bookings/user/${userId}`,
    TURF_BOOKINGS: (turfId) =>
      `${BASE_URL}/players/turf-bookings/turf/${turfId}`,
    BY_ID: (bookingId) => `${BASE_URL}/players/turf-booking/${bookingId}`,
    CANCEL: `${BASE_URL}/players/turf-bookings/cancel`,
    AVAILABILITY: (turfId) => `${BASE_URL}/players/turf-availability/${turfId}`,
  },

  // Tournament endpoints
  TOURNAMENTS: {
    BASE: `${BASE_URL}/tournaments`,
    BY_ID: (id) => `${BASE_URL}/tournaments/${id}`,
  },

  // Booking endpoints
  BOOKINGS: {
    CREATE: `${BASE_URL}/players/bookings/create`,
    BY_USER: (userId) => `${BASE_URL}/players/bookings/user/${userId}`,
    BY_ID: (id) => `${BASE_URL}/players/booking/${id}`,
    STATUS: `${BASE_URL}/players/bookings/status`,
    CANCEL: `${BASE_URL}/players/bookings/cancel`,
  },

  // Authentication endpoints
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
    VERIFY: `${BASE_URL}/auth/verify`,
    FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
    REFRESH_TOKEN: `${BASE_URL}/auth/refresh-token`,
  },

  // Profile endpoints
  PROFILE: {
    GET: `${BASE_URL}/users/profile`,
    UPDATE: `${BASE_URL}/users/profile`,
    UPLOAD_PHOTO: `${BASE_URL}/users/profile/photo`,
  },
};

export default {
  SERVER_URL,
  BASE_URL,
  UPLOADS_URL,
  ENDPOINTS,
  Wbsite_SERVER_URL
};
