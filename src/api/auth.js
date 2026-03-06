// config/auth.js
// Central configuration file for authentication endpoints

import API from "./api";

// Base URL inherited from main API config
const { BASE_URL } = API;

// Authentication endpoints
const ENDPOINTS = {
  // User authentication
  REGISTER: `${BASE_URL}/register`,
  LOGIN: `${BASE_URL}/login`,
  CURRENT_USER: `${BASE_URL}/user/me`,
  FORGOT_PASSWORD: `${BASE_URL}/forgot-password`,
  RESET_PASSWORD: `${BASE_URL}/reset-password`,
  GOOGLE_LOGIN: `${BASE_URL}/google-login`,
  REGISTER_DEVICE: `${BASE_URL}/register-device`,

  // User profile management
  USER: {
    PROFILE: (userId) => `${BASE_URL}/user/profile/${userId}`,
    UPLOAD_IMAGE: (userId) => `${BASE_URL}/user/profile/upload-image/${userId}`,
    SWITCH_ROLE: (userId) => `${BASE_URL}/user/switch-role/${userId}`,
    CAN_SWITCH_ROLE: (userId) => `${BASE_URL}/user/can-switch-role/${userId}`,
  },

  // Role-specific endpoints
  TRAINER: {
    PROFILE: (trainerId) => `${BASE_URL}/trainer/profile/${trainerId}`,
    CERTIFICATE: (trainerId) => `${BASE_URL}/trainer/certificate/${trainerId}`,
  },

  REFEREE: {
    PROFILE: (refereeId) => `${BASE_URL}/referee/profile/${refereeId}`,
    CERTIFICATE: (refereeId) => `${BASE_URL}/referee/certificate/${refereeId}`,
    ASSIGNMENTS: (refereeId) => `${BASE_URL}/referee/assignments/${refereeId}`,
    STATS: (refereeId) => `${BASE_URL}/referee/stats/${refereeId}`,
  },
};

export default {
  BASE_URL,
  ENDPOINTS,
};
