import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import notificationService from "../../services/NotificationService";

const { width } = Dimensions.get("window");
const SLIDER_WIDTH = width * 0.8;

const PlayerNotifications = ({ visible, onClose, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const slideAnim = useState(new Animated.Value(SLIDER_WIDTH))[0];

  useEffect(() => {
    if (visible) {
      // Fetch notifications and animate
      fetchNotifications();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate out
      Animated.timing(slideAnim, {
        toValue: SLIDER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (!userId) {
        setNotifications([]);
        return;
      }

      // Call your backend API for player notifications
      const response = await fetch(`${API.BASE_URL}/player/${userId}/notifications`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to fetch notifications:", data.message);
        setNotifications([]);
        return;
      }

      // Normalize data if needed
      const notifications = (data.notifications || []).map((notif) => ({
        id: notif._id,
        message: notif.message,
        status: notif.transactionStatus, // pending, accepted, rejected
        tournamentId: notif.tournamentId,
        createdAt: notif.createdAt,
      }));

      setNotifications(notifications);

    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // Call the API to mark as read
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(
        notifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) return;

    try {
      await notificationService.markAllAsRead(userId);

      // Update all notifications in local state to read
      setNotifications(
        notifications.map((notification) => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  //Helper function to format the time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const notificationDate = new Date(timestamp);
    const diffTime = Math.abs(now - notificationDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return "Just now";
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => markAsRead(item._id)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.titleContainer}>
            {!item.read && <View style={styles.unreadDot} />}
            <Text style={styles.notificationTitle}>{item.title}</Text>
          </View>
          <Text style={styles.notificationTime}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.notificationMessage}>{item.message}</Text>
      </View>

      <View
        style={[
          styles.notificationTypeIndicator,
          item.type === "event"
            ? styles.eventIndicator
            : styles.bookingIndicator,
        ]}
      />
    </TouchableOpacity>
  );

  const renderEmptyNotifications = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No notifications yet</Text>
    </View>
  );

  const handleClose = () => {
    // First animate out
    Animated.timing(slideAnim, {
      toValue: SLIDER_WIDTH, // This will animate from current position to off-screen right
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // After animation completes, then call the parent's onClose function

      onClose();
    });
  };

  return (
    visible && (
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.sliderContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator
              style={styles.loader}
              size="large"
              color="#f4511e"
            />
          ) : (
            <>
              <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.notificationsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmptyNotifications}
              />

              {notifications.length > 0 && (
                <TouchableOpacity
                  style={styles.markAllReadButton}
                  onPress={handleMarkAllAsRead}
                >
                  <Text style={styles.markAllReadText}>Mark all as read</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </View>
    )
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sliderContainer: {
    position: "absolute",
    top: 50,
    right: 0,
    width: SLIDER_WIDTH,
    height: "90%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    paddingTop: 5,
    paddingBottom: 20,
    marginBottom: 70,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  notificationsList: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationItem: {
    flexDirection: "row",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  unreadNotification: {
    backgroundColor: "rgba(244, 81, 30, 0.05)",
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f4511e",
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  notificationTime: {
    fontSize: 12,
    color: "#999",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  notificationTypeIndicator: {
    width: 4,
    position: "absolute",
    left: 0,
    top: 15,
    bottom: 15,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  eventIndicator: {
    backgroundColor: "#f4511e",
  },
  bookingIndicator: {
    backgroundColor: "#4CAF50",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 10,
    textAlign: "center",
  },
  markAllReadButton: {
    padding: 15,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  markAllReadText: {
    fontSize: 16,
    color: "#f4511e",
    fontWeight: "500",
  },
});

export default PlayerNotifications;
