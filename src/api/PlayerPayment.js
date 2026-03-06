// config/playerPayment.js
import API from "./api";

const { BASE_URL } = API;

const ENDPOINTS = {
    // 🔹 Player uploads payment proof (multipart/form-data)
    UPLOAD: `${BASE_URL}/player-payment/upload`,

    // 🔹 Manager views pending payments for a tournament
    PENDING: (tournamentId) =>
        `${BASE_URL}/player-payment/pending/${tournamentId}`,

    // 🔹 Manager verifies (approve/reject) a payment
    VERIFY: (paymentId) => `${BASE_URL}/player-payment/verify/${paymentId}`,

    // 🔹 Payment history
    HISTORY: {
        PLAYER: (playerId, page = 1, limit = 20) =>
            `${BASE_URL}/player-payment/history/player/${playerId}?page=${page}&limit=${limit}`,
        TOURNAMENT: (tournamentId, page = 1, limit = 20) =>
            `${BASE_URL}/player-payment/history/tournament/${tournamentId}?page=${page}&limit=${limit}`,
    },
};

export default {
    BASE_URL,
    ENDPOINTS,
};
