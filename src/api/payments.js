// config/payments.js
// Central configuration file for payment-related endpoints

import API from "./api";

// Base URL inherited from main API config
const { BASE_URL } = API;

// Payment endpoints
const ENDPOINTS = {
  // Orders
  ORDERS: {
    CREATE: `${BASE_URL}/players/create-order`,
  },

  // Payment Verification
  VERIFY_PAYMENT: `${BASE_URL}/players/verify-payment`,

  // Payment Status
  POLL_PAYMENT_STATUS: (orderId) =>
    `${BASE_URL}/players/poll-payment-status/${orderId}`,
  PAYMENT_STATUS: (orderId) => `${BASE_URL}/players/payment-status/${orderId}`,

  // Check existing booking or payment
  CHECK: `${BASE_URL}/players/bookings/status`,
  CHECK_PAYMENT: `${BASE_URL}/players/payments/check`,

  // Booking details by ID (add this if not already present)
  BOOKING_BY_ID: (bookingId) => `${BASE_URL}/players/booking/${bookingId}`,

  // Payment history
  PAYMENT_HISTORY: `${BASE_URL}/players/payment-history`,
  USER_PAYMENT_HISTORY: (userId) =>
    `${BASE_URL}/players/payment-history/${userId}`,

  // Cancel payment
  CANCEL_PAYMENT: `${BASE_URL}/players/cancel-payment`,

  // Team details
  TEAM_DETAILS: (bookingId) => `${BASE_URL}/players/team-details/${bookingId}`,
  TOURNAMENT_TEAMS: (tournamentId) =>
    `${BASE_URL}/players/bookings/tournament-teams/${tournamentId}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
