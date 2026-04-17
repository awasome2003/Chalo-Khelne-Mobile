import API from "./api";

const BASE_URL = API.BASE_URL;

const NOTIFICATIONS = {
  GET_ALL: (userId) => `${BASE_URL}/notifications/player/${userId}`,
  UNREAD_COUNT: (userId) => `${BASE_URL}/notifications/player/${userId}/unread-count`,
  MARK_READ: (notifId) => `${BASE_URL}/notifications/player/${notifId}/read`,
  MARK_ALL_READ: (userId) => `${BASE_URL}/notifications/player/${userId}/read-all`,
};

export default NOTIFICATIONS;
