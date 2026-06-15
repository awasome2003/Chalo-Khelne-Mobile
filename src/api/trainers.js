import API from "./api";

// Trainer discovery / booking endpoints.
// Maps to the server's public+authenticated routes mounted at /api/trainer
// (see server/routes/trainerRoutes.js).
const BASE_URL = API.SERVER_URL; // used for resolving relative profile-image paths
const TRAINER_API = `${API.BASE_URL}/trainer`;

const TRAINERS = {
  SERVER_URL: API.SERVER_URL,
  BASE_URL, // legacy callers prefix relative image paths with this
  UPLOADS_URL: API.UPLOADS_URL,

  ENDPOINTS: {
    // Trainer discovery (public)
    GET_ALL: `${TRAINER_API}/trainers`,
    GET_BY_ID: (id) => `${TRAINER_API}/trainer/${id}`,
    PROFILE: (id) => `${TRAINER_API}/profile/${id}`,

    // Featured / rating filters — the public trainer list with query hints.
    // The screen guards these with try/catch and falls back gracefully.
    FILTERS: {
      FEATURED: `${TRAINER_API}/trainers?featured=true`,
      BY_RATING: (rating) => `${TRAINER_API}/trainers?minRating=${rating}`,
    },

    // Session types (public)
    SESSION_TYPES: {
      GET: `${TRAINER_API}/session-types`,
      GET_BY_TRAINER: (id) => `${TRAINER_API}/session-types/${id}`,
    },

    // Session booking request (authenticated)
    REQUEST_SESSION: `${TRAINER_API}/request-session`,
  },
};

export default TRAINERS;
