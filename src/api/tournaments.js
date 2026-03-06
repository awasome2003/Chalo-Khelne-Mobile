// config/tournaments.js
// Central configuration file for tournament-related endpoints

import API from "./api";

// Base URL inherited from main API config
const { BASE_URL } = API;

// Tournament endpoints
const ENDPOINTS = {
  BASE: `${BASE_URL}/tournaments`,
  BY_ID: (id) => `${BASE_URL}/tournaments/${id}`,
  BY_MANAGER: (managerId) => `${BASE_URL}/tournaments/manager/${managerId}`,
  LOGO: (id) => `${BASE_URL}/tournaments/${id}/logo`,

  // Groups
  GROUPS: {
    CREATE: (tournamentId) => `${BASE_URL}/tournaments/${tournamentId}/groups`,
    GET: (tournamentId) => `${BASE_URL}/tournaments/${tournamentId}/groups`,
    DELETE: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}`,
  },

  // Teams
  TEAMS: {
    CREATE: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams`,
    GET: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams`,
    DELETE: (tournamentId, groupId, teamId) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams/${teamId}`,
    DETAILS: (tournamentId, teamId) =>
      `${BASE_URL}/tournaments/team-details/${tournamentId}/${teamId}`,
  },

  // Players
  PLAYERS: {
    ADD: (tournamentId, groupId, teamId) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams/${teamId}/players`,
    GET: (tournamentId, groupId, teamId) =>
      `${BASE_URL}/tournaments/${tournamentId}/groups/${groupId}/teams/${teamId}/players`,
  },

  // Matches
  MATCHES: {
    ALL: `${BASE_URL}/tournaments/matches`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/${tournamentId}/matches`,
    CREATE: (tournamentId) => `${BASE_URL}/tournaments/${tournamentId}/matches`,
    BY_GROUP: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/matches/${tournamentId}/${groupId}`,
    GET_BY_ID: (matchId) => `${BASE_URL}/tournaments/match/${matchId}`,
    UPDATE: (matchId) => `${BASE_URL}/tournaments/matches/${matchId}`,
    STATUS: (matchId) => `${BASE_URL}/tournaments/match-status/${matchId}`,
    SUBSTITUTE: (matchId) =>
      `${BASE_URL}/tournaments/matches/${matchId}/substitute`,
    UPDATE_DETAILS: (matchId) =>
      `${BASE_URL}/tournaments/matches/${matchId}/update-details`,
    BY_POSITION: `${BASE_URL}/tournaments/matches-by-position`,
    BY_ROUND: `${BASE_URL}/tournaments/matches-by-round`,
  },

  // Scores
  SCORES: {
    CREATE: (matchId) => `${BASE_URL}/tournaments/matches/${matchId}/scores`,
    GET: (matchId) => `${BASE_URL}/tournaments/matches/${matchId}/scores`,
  },

  // Bookings
  BOOKINGS: {
    CREATE: `${BASE_URL}/tournaments/bookings/create`,
    CHECK: `${BASE_URL}/tournaments/bookings/check`,
    BY_USER: (userId) => `${BASE_URL}/tournaments/bookings/user/${userId}`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/bookings/tournament/${tournamentId}`,
    TOURNAMENT_TEAMS: (tournamentId) =>
      `${BASE_URL}/players/bookings/tournament-teams/${tournamentId}`,
  },

  // TOURNAMENT LEADERBOARD ENDPOINTS
  LEADERBOARD: {
    // All tournaments with leaderboard metadata
    ALL_TOURNAMENTS: `${BASE_URL}/tournaments/leaderboard/all`,

    // Group stage players leaderboard (complete player journey)
    GROUP_STAGE_PLAYERS: (tournamentId) => `${BASE_URL}/tournaments/leaderboard/${tournamentId}/players`,

    // Knockout teams leaderboard
    KNOCKOUT_TEAMS: (tournamentId) => `${BASE_URL}/tournaments/leaderboard/${tournamentId}/teams`,
  },

  // Booking Groups
  BOOKING_GROUPS: {
    CREATE: `${BASE_URL}/tournaments/bookinggroups/create`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/bookinggroups/tournament/${tournamentId}`,
    UPDATE: (groupId) => `${BASE_URL}/tournaments/bookinggroups/${groupId}`,
  },

  // Top Players
  TOP_PLAYERS: {
    SAVE: `${BASE_URL}/tournaments/topplayers/save`,
    BY_GROUP: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}/${groupId}`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}`,
  },

  // Super Matches
  SUPER_MATCHES: {
    CREATE: `${BASE_URL}/tournaments/super-matches`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/super-matches/${tournamentId}`,
    UPDATE: (matchId) => `${BASE_URL}/tournaments/super-matches/${matchId}`,
    UPDATE_WINNER: (matchId) =>
      `${BASE_URL}/tournaments/super-matches/${matchId}`,
  },

  // Knockout Matches
  KNOCKOUT: {
    CREATE: `${BASE_URL}/tournaments/knockout-matches`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/knockout-matches/${tournamentId}`,
  },

  // Team Knockout Matches
  TEAM_KNOCKOUT: {
    CREATE: `${BASE_URL}/tournaments/matches`,
    NEXT_ROUND: `${BASE_URL}/tournaments/generate-next-round`,
    BYE_MATCHES: `${BASE_URL}/tournaments/generate-bye-matches`,
    BY_TOURNAMENT: (tournamentId) =>
      `${BASE_URL}/tournaments/${tournamentId}/matches-by-tournament`,
    BY_ROUND: `${BASE_URL}/tournaments/matches-by-round`,
    GET_BY_ID: (matchId) => `${BASE_URL}/tournaments/match/${matchId}`,
    UPDATE: (matchId) => `${BASE_URL}/tournaments/matches/${matchId}`,
    BY_POSITION: `${BASE_URL}/tournaments/matches-by-position`,
    STATUS: (matchId) => `${BASE_URL}/tournaments/match-status/${matchId}`,
    SUBSTITUTE: (matchId) =>
      `${BASE_URL}/tournaments/matches/${matchId}/substitute`,
    UPDATE_DETAILS: (matchId) =>
      `${BASE_URL}/tournaments/matches/${matchId}/update-details`,
    TEAM_DETAILS: (tournamentId, teamId) =>
      `${BASE_URL}/tournaments/team-details/${tournamentId}/${teamId}`,
  },

  NOTIFICATIONS: {
    USER: (userId) => `${BASE_URL}/notifications/user/${userId}`,
    COUNT: (userId) => `${BASE_URL}/notifications/user/${userId}/count`,
    MARK_READ: (notificationId) =>
      `${BASE_URL}/notifications/${notificationId}/read`,
    MARK_ALL_READ: (userId) =>
      `${BASE_URL}/notifications/user/${userId}/read-all`,
    UPDATE_TOKEN: (userId) =>
      `${BASE_URL}/notifications/user/${userId}/expo-token`,
  },

  MOBILE: {
    // 🚀 Dashboard Overview
    DASHBOARD: (tournamentId) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/dashboard`,

    // ⚡ Live Groups with Real-time Data
    LIVE_GROUPS: (tournamentId) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/groups/live`,

    // 🎯 Live Match Stream
    LIVE_STREAM: (matchId) =>
      `${BASE_URL}/mobile/tournaments/matches/${matchId}/live-stream`,

    // 📊 Enhanced Standings
    STANDINGS: (tournamentId, groupId) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/groups/${groupId}/standings`,

    // 🎮 Player Performance Stats
    PLAYER_STATS: (tournamentId, playerId) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/players/${playerId}/stats`,

    // 🔄 Refresh Data
    REFRESH: (tournamentId) =>
      `${BASE_URL}/mobile/tournaments/${tournamentId}/refresh`,

    // 🔥 Enhanced versions of existing endpoints
    GROUPS_ENHANCED: (tournamentId) =>
      `${BASE_URL}/tournaments/bookinggroups/tournament/${tournamentId}?mobile=true`,

    MATCHES_ENHANCED: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/matches/${tournamentId}/${groupId}?mobile=true`,

    TOP_PLAYERS_ENHANCED: (tournamentId) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}/enhanced?mobile=true`
  },

  // 🚀 TOURNAMENT PROGRESSION ENDPOINTS
  PROGRESSION: {
    // Round 2 Status & Groups
    ROUND2_STATUS: (tournamentId) => `${BASE_URL}/tournaments/round2/status/${tournamentId}`,
    ROUND2_GROUPS: (tournamentId) => `${BASE_URL}/tournaments/round2/groups/${tournamentId}`,

    // Super Players
    SUPER_PLAYERS: (tournamentId) => `${BASE_URL}/tournaments/superplayers/${tournamentId}`,

    // Direct Knockout System
    DIRECT_KNOCKOUT_MATCHES: (tournamentId) => `${BASE_URL}/tournaments/direct-knockout/${tournamentId}/matches`,

    // Enhanced Top Players
    TOP_PLAYERS_ENHANCED: (tournamentId) => `${BASE_URL}/tournaments/topplayers/${tournamentId}/enhanced`
  },

  // 🔥 GROUP STAGE CHAMPION ROUTES - FOR CONQUERED COMPONENTS! 🔥
  GROUP_STAGE: {
    // Core routes that TournamentViewer and PlayersManager need
    TOP_PLAYERS_BY_GROUP: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/topplayers/${tournamentId}/${groupId}`,
    MATCHES_BY_GROUP: (tournamentId, groupId) =>
      `${BASE_URL}/tournaments/matches/${tournamentId}/${groupId}`,
    KNOCKOUT_MATCHES: (tournamentId) =>
      `${BASE_URL}/tournaments/knockout/matches/${tournamentId}`,
    TOURNAMENT_BOOKINGS: (tournamentId) =>
      `${BASE_URL}/tournaments/bookings/tournament/${tournamentId}`,
  },

  // 🎯 LIVE SCORING ENDPOINTS
  LIVE_SCORING: {
    // Match Scores
    MATCH_SCORES: (matchId) => `${BASE_URL}/tournaments/matches/${matchId}/scores`,
    LIVE_STATE: (matchId) => `${BASE_URL}/tournaments/matches/${matchId}/live-state`,

    // Bulk Score Sync
    BULK_SYNC: (tournamentId) => `${BASE_URL}/tournaments/${tournamentId}/bulk-sync-scores`
  },
};

export default {
  BASE_URL,
  ENDPOINTS,
};
