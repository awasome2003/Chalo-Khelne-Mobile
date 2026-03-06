import React, { createContext, useState, useContext, useEffect } from "react";
import notificationService from "../services/NotificationService";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Fetch initial notifications and set up polling
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchUnreadCount();

      // Set up polling for new notifications (every 30 seconds)
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch notifications from the server
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const fetchedNotifications =
        await notificationService.fetchUserNotifications(user.id);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  // Toggle notification panel
  const toggleNotifications = () => {
    if (!isNotificationsOpen) {
      // Fetch the latest notifications when opening the panel
      fetchNotifications();
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  // Close notification panel
  const closeNotifications = () => {
    setIsNotificationsOpen(false);
  };

  // Mark a notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);

      // Update local state
      setNotifications(
        notifications.map((notification) => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Handle notifications in foreground
  const handleReceivedNotification = (notification) => {
    // Update notification count immediately
    setUnreadCount((prevCount) => prevCount + 1);

    // Refresh notifications list if panel is open
    if (isNotificationsOpen) {
      fetchNotifications();
    }
  };

  const value = {
    notifications,
    unreadCount,
    isNotificationsOpen,
    toggleNotifications,
    closeNotifications,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    handleReceivedNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
