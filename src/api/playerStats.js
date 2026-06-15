import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  CAREER: (userId) => `${BASE_URL}/player-stats/${userId}`,
  RANKING: (sport) =>
    `${BASE_URL}/player-stats/ranking${sport ? `/${encodeURIComponent(sport)}` : ""}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
