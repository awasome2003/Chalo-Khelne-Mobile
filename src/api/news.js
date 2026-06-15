import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  ACTIVE: `${BASE_URL}/news/active`,
  BY_SPORT: (sport) => `${BASE_URL}/news/sport/${encodeURIComponent(sport)}`,
  BY_ID: (id) => `${BASE_URL}/news/${id}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
