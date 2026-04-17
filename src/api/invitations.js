import API from "./api";

const BASE_URL = API.BASE_URL;

const INVITATIONS = {
  SEND: `${BASE_URL}/invitations/send`,
  RESPOND: `${BASE_URL}/invitations/respond`,
  RECEIVED: (playerId) => `${BASE_URL}/invitations/received/${playerId}`,
  SENT: (playerId) => `${BASE_URL}/invitations/sent/${playerId}`,
  PENDING_COUNT: (playerId) => `${BASE_URL}/invitations/pending-count/${playerId}`,
  BY_TOURNAMENT: (tournamentId) => `${BASE_URL}/invitations/tournament/${tournamentId}`,
  SEARCH_PLAYERS: `${BASE_URL}/chat/search-players`,
};

export default INVITATIONS;
