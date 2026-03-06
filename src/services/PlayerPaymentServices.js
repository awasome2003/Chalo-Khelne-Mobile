import axios from "axios";
import PlayerPaymentAPI from "../api/PlayerPayment"; // config file we made for routes

// Create axios instance (recommended)
const axiosInstance = axios.create({
    baseURL: PlayerPaymentAPI.BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// ✅ Upload payment proof (Player uploads screenshot)
export const uploadPaymentProof = async (formData) => {
    return await axiosInstance.post(PlayerPaymentAPI.ENDPOINTS.UPLOAD, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// ✅ Manager: get pending payments for a tournament
export const getPendingPayments = async (tournamentId) => {
    return await axiosInstance.get(PlayerPaymentAPI.ENDPOINTS.PENDING(tournamentId));
};

// ✅ Manager: verify a payment (approve/reject)
export const verifyPayment = async (paymentId, status, managerId) => {
    return await axiosInstance.patch(PlayerPaymentAPI.ENDPOINTS.VERIFY(paymentId), {
        status,
        managerId,
    });
};

// ✅ Player: get their payment history (with optional pagination)
export const getPlayerPaymentHistory = async (playerId, page = 1, limit = 20) => {
    return await axiosInstance.get(
        PlayerPaymentAPI.ENDPOINTS.HISTORY.PLAYER(playerId, page, limit)
    );
};

// ✅ Manager: get full tournament payment history (with optional pagination)
export const getTournamentPaymentHistory = async (tournamentId, page = 1, limit = 20) => {
    return await axiosInstance.get(
        PlayerPaymentAPI.ENDPOINTS.HISTORY.TOURNAMENT(tournamentId, page, limit)
    );
};
