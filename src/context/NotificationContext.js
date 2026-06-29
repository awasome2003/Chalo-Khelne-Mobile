import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { io } from "socket.io-client";
import { Platform, Alert } from "react-native";
import API from "../api/api";
import NOTIFICATIONS from "../api/notifications";
import { getToken } from "../services/tokenStore";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const socketRef = useRef(null);

  const userId = user?._id || user?.id;
  // Club-staff (Manager / trainer / coach) accounts aren't in the User
  // collection and have no player notifications — skip the whole flow for them
  // (the User-scoped endpoints would 401).
  const isStaff = String(user?.role || "") === "Manager";

  // ── Connect socket + listen for real-time notifications ──
  useEffect(() => {
    if (!userId || isStaff) return;

    // Get token from AsyncStorage (more reliable than context state on app start)
    const connectSocket = async () => {
      // Token lives in SecureStore now; AsyncStorage("auth_token") is null. Read
      // the real token so the socket authenticates instead of connecting null.
      const authToken =
        token || (await getToken()) || (await AsyncStorage.getItem("auth_token"));
      if (!authToken) return;

      const socket = io(API.SERVER_URL, {
        auth: { token: authToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      console.log("[NOTIF_SOCKET] Connected");
    });

    // Listen for new notifications (from playerNotify utility)
    socket.on("notification:new", (data) => {
      setNotifications((prev) => [{ ...data, isRead: false }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on("connect_error", (err) => {
      console.log("[NOTIF_SOCKET] Error:", err.message);
    });

      socketRef.current = socket;
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId, token, isStaff]);

  // ── Fetch notifications from API ──
  // Use bare axios so it carries the global Authorization header set on login;
  // AsyncStorage("auth_token") is null (the token lives in SecureStore).
  const fetchNotifications = useCallback(async () => {
    if (!userId || isStaff) return;
    try {
      const res = await axios.get(NOTIFICATIONS.GET_ALL(userId));
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("[NOTIF] Fetch error:", err.message);
    }
  }, [userId, isStaff]);

  // ── Fetch unread count ──
  const fetchUnreadCount = useCallback(async () => {
    if (!userId || isStaff) return;
    try {
      const res = await axios.get(NOTIFICATIONS.UNREAD_COUNT(userId));
      if (res.data.success) {
        setUnreadCount(res.data.count);
      }
    } catch {}
  }, [userId, isStaff]);

  // ── Initial fetch + polling ──
  useEffect(() => {
    if (userId) {
      fetchNotifications();

      // Poll every 60 seconds as backup to socket
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [userId, fetchNotifications, fetchUnreadCount]);

  // ── Toggle notification panel ──
  const toggleNotifications = () => {
    if (!isNotificationsOpen) fetchNotifications();
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const closeNotifications = () => setIsNotificationsOpen(false);

  // ── Mark single as read ──
  const markAsRead = async (notificationId) => {
    try {
      // Bare axios carries the global Authorization header (set in AuthContext).
      await axios.put(NOTIFICATIONS.MARK_READ(notificationId), {});
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("[NOTIF] Mark read error:", err.message);
    }
  };

  // ── Mark all as read ──
  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      await axios.put(NOTIFICATIONS.MARK_ALL_READ(userId), {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("[NOTIF] Mark all read error:", err.message);
    }
  };

  // ── Handle push notification received in foreground ──
  const handleReceivedNotification = (notification) => {
    setUnreadCount((prev) => prev + 1);
    if (isNotificationsOpen) fetchNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isNotificationsOpen,
        toggleNotifications,
        closeNotifications,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        handleReceivedNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
