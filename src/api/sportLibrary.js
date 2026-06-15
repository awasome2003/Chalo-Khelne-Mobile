import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  LIST: `${BASE_URL}/sport-library`,
  BY_ID: (idOrSlug) => `${BASE_URL}/sport-library/${idOrSlug}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
