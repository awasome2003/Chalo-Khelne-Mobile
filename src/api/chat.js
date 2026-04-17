import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
  CONVERSATIONS: `${BASE_URL}/chat/conversations`,
  MESSAGES: (conversationId) => `${BASE_URL}/chat/conversations/${conversationId}/messages`,
  SEND: `${BASE_URL}/chat/messages/send`,
  MARK_READ: (conversationId) => `${BASE_URL}/chat/messages/read/${conversationId}`,
  SEARCH_PLAYERS: `${BASE_URL}/chat/search-players`,
  UNREAD_TOTAL: `${BASE_URL}/chat/unread-total`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
