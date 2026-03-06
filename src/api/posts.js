// api/posts.js
import API from "./api";

// Base URL inherited from main API config
const { BASE_URL } = API;

// Posts endpoints
const ENDPOINTS = {
  // Post CRUD operations
  GET_ALL: `${BASE_URL}/posts`,
  CREATE: `${BASE_URL}/posts`,
  GET_BY_ID: (postId) => `${BASE_URL}/posts/${postId}`,
  UPDATE: (postId) => `${BASE_URL}/posts/${postId}`,
  DELETE: (postId) => `${BASE_URL}/posts/${postId}`,

  // Post interactions
  LIKE: (postId) => `${BASE_URL}/posts/${postId}/like`,
  SAVE: (postId) => `${BASE_URL}/posts/${postId}/save`,
  
  // Comments
  ADD_COMMENT: (postId) => `${BASE_URL}/posts/${postId}/comments`,
  GET_COMMENTS: (postId) => `${BASE_URL}/posts/${postId}/comments`,

  // Post filtering
  BY_USER: (userId) => `${BASE_URL}/posts/${userId}`,
  BY_TOURNAMENT: (tournamentId) =>
    `${BASE_URL}/posts/tournament/${tournamentId}`,
  SAVED_BY_USER: (userId) => `${BASE_URL}/posts/saved/${userId}`,
};

export default {
  BASE_URL,
  ENDPOINTS,
};
