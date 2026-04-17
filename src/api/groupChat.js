import API from "./api";

const BASE = `${API.BASE_URL}/group-chat`;

export const groupChatApi = {
  BASE,
  CHATS: BASE,
  CHAT: (id) => `${BASE}/${id}`,
  RENAME: (id) => `${BASE}/${id}/rename`,
  ADD_MEMBER: (id) => `${BASE}/${id}/add`,
  REMOVE_MEMBER: (id) => `${BASE}/${id}/remove`,
  MESSAGES: (id) => `${BASE}/${id}/messages`,
  SEND_MESSAGE: (id) => `${BASE}/${id}/message`,
  SEARCH_USERS: `${BASE}/search-users`,
};

export default groupChatApi;
