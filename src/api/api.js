// config/api.js
// Central configuration file for API endpoints

// Change this to your actual API server IP or domain
// const IP_ADDRESS = "192.168.2.247";
// const PORT = "3006";

// // Base URL for all API requests
// const BASE_URL = `http://${IP_ADDRESS}:${PORT}/api`;
// // Base URL for uploaded files
// const UPLOADS_URL = `http://${IP_ADDRESS}:${PORT}/api/uploads`;

// // API endpoints based on your existing routes
// const ENDPOINTS = {
//   TURFS: {
//     BASE: `${BASE_URL}/turfs`,
//     BY_ID: (id) => `${BASE_URL}/turfs/${id}`,
//     OWNER: `${BASE_URL}/turfs/owner`,
//     REVIEWS: (id) => `${BASE_URL}/turfs/${id}/reviews`,
//     TOGGLE_STATUS: (id) => `${BASE_URL}/turfs/${id}/toggle-status`,
//   },

//   USER: {
//     BASE: `${BASE_URL}/users`,
//     FAVORITES: `${BASE_URL}/users/favorites`,
//     TOGGLE_FAVORITE: `${BASE_URL}/users/favorites/toggle`,
//     CHECK_FAVORITE: `${BASE_URL}/users/favorites/check`,
//     USER_FAVORITES: (userId) => `${BASE_URL}/users/user-favorites/${userId}`,
//   },

//   // Add turf booking endpoints
//   TURF_BOOKINGS: {
//     CREATE: `${BASE_URL}/players/turf-bookings/create`,
//     USER_BOOKINGS: (userId) =>
//       `${BASE_URL}/players/turf-bookings/user/${userId}`,
//     TURF_BOOKINGS: (turfId) =>
//       `${BASE_URL}/players/turf-bookings/turf/${turfId}`,
//     BY_ID: (bookingId) => `${BASE_URL}/players/turf-booking/${bookingId}`,
//     CANCEL: `${BASE_URL}/players/turf-bookings/cancel`,
//     AVAILABILITY: (turfId) => `${BASE_URL}/players/turf-availability/${turfId}`,
//   },

//   // Tournament endpoints
//   TOURNAMENTS: {
//     BASE: `${BASE_URL}/tournaments`,
//     BY_ID: (id) => `${BASE_URL}/tournaments/${id}`,
//   },

//   // Payment and booking endpoints
//   PAYMENTS: {
//     CREATE_ORDER: `${BASE_URL}/players/create-order`,
//     VERIFY_PAYMENT: `${BASE_URL}/players/verify-payment`,
//     PAYMENT_STATUS: (orderId) =>
//       `${BASE_URL}/players/payment-status/${orderId}`,
//   },

//   BOOKINGS: {
//     CREATE: `${BASE_URL}/players/bookings/create`,
//     BY_USER: (userId) => `${BASE_URL}/players/bookings/user/${userId}`,
//     BY_ID: (id) => `${BASE_URL}/players/booking/${id}`,
//     STATUS: `${BASE_URL}/players/bookings/status`,
//     CANCEL: `${BASE_URL}/players/bookings/cancel`,
//   },

//   // Authentication endpoints
//   AUTH: {
//     LOGIN: `${BASE_URL}/auth/login`,
//     REGISTER: `${BASE_URL}/auth/register`,
//     VERIFY: `${BASE_URL}/auth/verify`,
//     FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password`,
//     RESET_PASSWORD: `${BASE_URL}/auth/reset-password`,
//     REFRESH_TOKEN: `${BASE_URL}/auth/refresh-token`,
//   },

//   // Profile endpoints
//   PROFILE: {
//     GET: `${BASE_URL}/users/profile`,
//     UPDATE: `${BASE_URL}/users/profile`,
//     UPLOAD_PHOTO: `${BASE_URL}/users/profile/photo`,
//   },
// };

// export default {
//   IP_ADDRESS,
//   PORT,
//   BASE_URL,
//   UPLOADS_URL,
//   ENDPOINTS,
// };

// For production deployment, uncomment the following code and comment out the above

// config/api.js
// Central configuration file for API endpoints

// Use the deployed server URL instead of local IP
// const SERVER_URL = "https://dev.bestowalsystems.in:3006";

// const SERVER_URL = "https://mobile.chalokhelne.com";
// const Wbsite_SERVER_URL = "https://chalokhelne.com";
const SERVER_URL = "http://10.173.27.245:3006";
const Wbsite_SERVER_URL = "http://10.173.27.245:3003";

// Base URL for all API requests
const BASE_URL = `${SERVER_URL}/api`;

// Base URL for uploaded filess
const UPLOADS_URL = `${SERVER_URL}/uploads`;

// API endpoints based on your existing routes
const ENDPOINTS = {
  TURFS: {
    BASE: `${BASE_URL}/turfs`,
    BY_ID: (id) => `${BASE_URL}/turfs/${id}`,
    OWNER: `${BASE_URL}/turfs/owner`,
    REVIEWS: (id) => `${BASE_URL}/turfs/${id}/reviews`,
    TOGGLE_STATUS: (id) => `${BASE_URL}/turfs/${id}/toggle-status`,

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

  // Payment and booking endpoints
  PAYMENTS: {
    CREATE_ORDER: `${BASE_URL}/players/create-order`,
    VERIFY_PAYMENT: `${BASE_URL}/players/verify-payment`,
    PAYMENT_STATUS: (orderId) =>
      `${BASE_URL}/players/payment-status/${orderId}`,
  },

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
