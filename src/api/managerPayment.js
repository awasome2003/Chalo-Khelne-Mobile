import API from "./api";

const { BASE_URL, UPLOADS_URL, Wbsite_SERVER_URL } = API;

const ENDPOINTS = {
    QR_CODES: (managerId, tournamentId) =>
        `${BASE_URL}/payments/${managerId}/${tournamentId}/qr-codes`,
    UPI_IDS: (managerId, tournamentId) =>
        `${BASE_URL}/payments/${managerId}/${tournamentId}/upi-ids`,
    OFFLINE_PAYMENTS: (managerId, tournamentId) =>
        `${BASE_URL}/payments/${managerId}/${tournamentId}/offline`,
    NOTIFY: (managerId, tournamentId) =>
        `${BASE_URL}/payments/${managerId}/${tournamentId}/notify`,
    NOTIFICATIONS: (managerId) =>
        `${BASE_URL}/payments/${managerId}/notifications`,
};

const managerPaymentAPI = {
    getQrCodes: async (managerId, tournamentId) => {
        try {
            const response = await fetch(ENDPOINTS.QR_CODES(managerId, tournamentId));
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "Failed to fetch QR codes");

            // Normalize imageUrl so it always starts with UPLOADS_URL
            const qrCodes = (data.qrCodes || []).map((qr) => {
                const img = (qr?.imageUrl || "").replace(/\\/g, "/"); // fix backslashes
                const relativeAfterUploads = img.replace(/^\/?uploads\//i, ""); // remove leading uploads/
                const normalized = `${Wbsite_SERVER_URL}/uploads/${relativeAfterUploads}`; // prepend UPLOADS_URL
                return { ...qr, imageUrl: normalized };
            });

            return { manager: data.manager || null, qrCodes };

        } catch (error) {
            console.error("Error fetching QR codes:", error);
            throw error;
        }
    },

    getUpiIds: async (managerId, tournamentId) => {
        try {
            const response = await fetch(ENDPOINTS.UPI_IDS(managerId, tournamentId));
            const data = await response.json();

            // If response is not OK but the server indicates no UPI IDs, handle it gracefully
            if (!response.ok) {
                if (data.message && data.message.toLowerCase().includes("no upi ids")) {
                    // Return empty array instead of throwing
                    return { manager: data.manager || null, upiIds: [] };
                }
                throw new Error(data.message || "Failed to fetch UPI IDs");
            }

            // Normal successful case
            return { manager: data.manager || null, upiIds: data.upiIds || [] };

        } catch (error) {
            console.warn("No UPI IDs found or fetch failed:", error);
            // Soft fallback: return empty array so frontend can handle it
            return { manager: null, upiIds: [] };
        }
    },

    getOfflinePayments: async (managerId, tournamentId) => {
        try {
            const response = await fetch(ENDPOINTS.OFFLINE_PAYMENTS(managerId, tournamentId));
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to fetch offline payments");
            return { manager: data.manager || null, offlinePayments: data.offlinePayments || [] };
        } catch (error) {
            console.error("Error fetching offline payments:", error);
            throw error;
        }
    },

    notifyManager: async (managerId, tournamentId, payload) => {
        try {
            const response = await fetch(ENDPOINTS.NOTIFY(managerId, tournamentId), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to notify manager");
            return data;
        } catch (error) {
            console.error("Error notifying manager:", error);
            throw error;
        }
    },

    getNotifications: async (managerId) => {
        try {
            const response = await fetch(ENDPOINTS.NOTIFICATIONS(managerId));
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Failed to fetch notifications");
            return data.notifications || [];
        } catch (error) {
            console.error("Error fetching notifications:", error);
            throw error;
        }
    },

    getAllPaymentMethods: async (managerId, tournamentId) => {
        const [qrRes, upiRes, offlineRes] = await Promise.all([
            managerPaymentAPI.getQrCodes(managerId, tournamentId).catch(() => ({ manager: null, qrCodes: [] })),
            managerPaymentAPI.getUpiIds(managerId, tournamentId).catch(() => ({ manager: null, upiIds: [] })),
            managerPaymentAPI.getOfflinePayments(managerId, tournamentId).catch(() => ({ manager: null, offlinePayments: [] })),
        ]);

        return {
            manager: qrRes.manager || upiRes.manager || offlineRes.manager || null,
            qrCodes: qrRes.qrCodes,
            upiIds: upiRes.upiIds,
            offlinePayments: offlineRes.offlinePayments,
            hasAnyMethod: qrRes.qrCodes.length > 0 || upiRes.upiIds.length > 0 || offlineRes.offlinePayments.length > 0,
        };
    },
};

export default {
    BASE_URL,
    ENDPOINTS,
    ...managerPaymentAPI,
};
