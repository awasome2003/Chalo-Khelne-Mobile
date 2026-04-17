import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useNotifications } from "../../context/NotificationContext";

const TYPE_CONFIG = {
  tournament_new: { icon: "trophy", color: "#F59E0B", bg: "#FFFBEB", label: "New Tournament" },
  tournament_update: { icon: "refresh", color: "#3B82F6", bg: "#EFF6FF", label: "Tournament Update" },
  booking_confirmed: { icon: "checkmark-circle", color: "#10B981", bg: "#ECFDF5", label: "Booking Confirmed" },
  booking_rejected: { icon: "close-circle", color: "#EF4444", bg: "#FEF2F2", label: "Booking Rejected" },
  booking_completed: { icon: "flag", color: "#6366F1", bg: "#EEF2FF", label: "Booking Completed" },
  registration_accepted: { icon: "checkmark-done", color: "#10B981", bg: "#ECFDF5", label: "Registration Accepted" },
  registration_rejected: { icon: "close-circle", color: "#EF4444", bg: "#FEF2F2", label: "Registration Rejected" },
  chat_message: { icon: "chatbubble", color: "#8B5CF6", bg: "#F5F3FF", label: "Message" },
  invitation_received: { icon: "mail", color: "#4F46E5", bg: "#EEF2FF", label: "Invitation" },
  invitation_accepted: { icon: "people", color: "#10B981", bg: "#ECFDF5", label: "Invite Accepted" },
  general: { icon: "megaphone", color: "#6B7280", bg: "#F9FAFB", label: "Announcement" },
};

const getTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handlePress = async (item) => {
    // Mark as read
    if (!item.isRead) {
      await markAsRead(item._id);
    }

    // Navigate within same stack so back button works
    const data = item.data || {};
    switch (item.type) {
      case "tournament_new":
      case "tournament_update":
      case "registration_accepted":
      case "registration_rejected":
        if (data.tournamentId) {
          navigation.push("Tournament Details", { tournamentId: data.tournamentId });
        }
        break;
      case "chat_message":
        if (data.conversationId) {
          navigation.navigate("Chat", {
            screen: "ChatConversation",
            params: { conversationId: data.conversationId },
          });
        }
        break;
      case "invitation_received":
      case "invitation_accepted":
        navigation.navigate("Profile", { screen: "Invitations" });
        break;
      default:
        break;
    }
  };

  const renderNotification = ({ item }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.general;

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        {/* Unread indicator */}
        {!item.isRead && <View style={styles.unreadDot} />}

        <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
            <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
            <Ionicons name="checkmark-done" size={16} color="#4F46E5" />
            <Text style={styles.markAllText}>Read All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Unread count bar */}
      {unreadCount > 0 && (
        <View style={styles.unreadBar}>
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
          <Text style={styles.unreadBarText}>unread notification{unreadCount !== 1 ? "s" : ""}</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotification}
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#4F46E5"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              You'll receive notifications for new tournaments, booking updates, messages, and invitations
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: "700", color: "#1F2937" },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  markAllText: { fontSize: 12, fontWeight: "700", color: "#4F46E5" },
  unreadBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  unreadBadge: {
    backgroundColor: "#EF4444",
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  unreadBarText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFF",
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  unreadCard: {
    backgroundColor: "#FAFBFF",
    borderColor: "#E0E7FF",
  },
  unreadDot: {
    position: "absolute",
    top: 16,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4F46E5",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  label: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { fontSize: 10, color: "#9CA3AF" },
  title: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 2 },
  message: { fontSize: 12, color: "#6B7280", lineHeight: 17 },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#6B7280", marginTop: 16 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 6, lineHeight: 18 },
});
