import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API from "../../api/api";
import INVITATIONS from "../../api/invitations";

export default function InvitationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [tab, setTab] = useState("received"); // received | sent
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchInvitations();
    }, [tab])
  );

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const url = tab === "received"
        ? INVITATIONS.RECEIVED(user._id || user.id)
        : INVITATIONS.SENT(user._id || user.id);

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setInvitations(res.data.invitations || []);
      }
    } catch (err) {
      console.error("Fetch invitations error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRespond = async (invitationId, status) => {
    setResponding(invitationId);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        INVITATIONS.RESPOND,
        { invitation_id: invitationId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // Update local state
        setInvitations((prev) =>
          prev.map((inv) =>
            inv._id === invitationId ? { ...inv, status, respondedAt: new Date() } : inv
          )
        );

        if (status === "accepted") {
          Alert.alert(
            "Invitation Accepted!",
            "Would you like to view the tournament?",
            [
              { text: "Later", style: "cancel" },
              {
                text: "View Tournament",
                onPress: () => {
                  const inv = invitations.find((i) => i._id === invitationId);
                  if (inv?.tournamentId?._id) {
                    navigation.navigate("Tournament Details", {
                      tournamentId: inv.tournamentId._id,
                    });
                  }
                },
              },
            ]
          );
        }
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    } finally {
      setResponding(null);
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "pending": return { bg: "#FEF3C7", text: "#D97706", icon: "time-outline" };
      case "accepted": return { bg: "#D1FAE5", text: "#059669", icon: "checkmark-circle" };
      case "rejected": return { bg: "#FEE2E2", text: "#DC2626", icon: "close-circle" };
      default: return { bg: "#F3F4F6", text: "#6B7280", icon: "help-circle" };
    }
  };

  const getProfileImage = (userData) => {
    if (!userData?.profileImage) return null;
    const img = userData.profileImage.replace(/^uploads[\\/]/, "");
    return `${API.SERVER_URL}/uploads/${img}`;
  };

  const renderInvitation = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const isReceived = tab === "received";
    const otherPerson = isReceived ? item.senderId : item.receiverId;
    const tournament = item.tournamentId;

    return (
      <View style={styles.card}>
        {/* Top row: person + time */}
        <View style={styles.cardTop}>
          <View style={styles.personRow}>
            {getProfileImage(otherPerson) ? (
              <Image source={{ uri: getProfileImage(otherPerson) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={18} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>
                {isReceived ? otherPerson?.name || item.senderName : otherPerson?.name || item.receiverName}
              </Text>
              <Text style={styles.timeText}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
        </View>

        {/* Tournament info */}
        <TouchableOpacity
          style={styles.tournamentBox}
          onPress={() => {
            if (tournament?._id) {
              navigation.navigate("Tournament Details", { tournamentId: tournament._id });
            }
          }}
        >
          <Ionicons name="trophy" size={16} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={styles.tournamentName} numberOfLines={1}>
              {tournament?.title || item.tournamentName}
            </Text>
            {tournament?.sportsType && (
              <Text style={styles.sportType}>{tournament.sportsType}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </TouchableOpacity>

        {/* Message */}
        {item.message ? (
          <View style={styles.messageBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#9CA3AF" />
            <Text style={styles.messageText}>"{item.message}"</Text>
          </View>
        ) : null}

        {/* Actions (only for received + pending) */}
        {isReceived && item.status === "pending" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRespond(item._id, "rejected")}
              disabled={responding === item._id}
            >
              {responding === item._id ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#DC2626" />
                  <Text style={styles.rejectText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleRespond(item._id, "accepted")}
              disabled={responding === item._id}
            >
              {responding === item._id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={styles.acceptText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
        <Text style={styles.headerTitle}>Invitations</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "received" && styles.activeTab]}
          onPress={() => setTab("received")}
        >
          <Ionicons name="mail-open" size={16} color={tab === "received" ? "#4F46E5" : "#9CA3AF"} />
          <Text style={[styles.tabText, tab === "received" && styles.activeTabText]}>Received</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "sent" && styles.activeTab]}
          onPress={() => setTab("sent")}
        >
          <Ionicons name="paper-plane" size={16} color={tab === "sent" ? "#4F46E5" : "#9CA3AF"} />
          <Text style={[styles.tabText, tab === "sent" && styles.activeTabText]}>Sent</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : invitations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="mail-unread-outline" size={56} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No {tab} invitations</Text>
          <Text style={styles.emptySub}>
            {tab === "received"
              ? "When other players invite you to tournaments, they'll appear here"
              : "Invitations you send to other players will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item._id}
          renderItem={renderInvitation}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInvitations(); }} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
  tabs: {
    flexDirection: "row", backgroundColor: "#FFF", paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 8,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", gap: 6,
  },
  activeTab: { backgroundColor: "#EEF2FF" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#9CA3AF" },
  activeTabText: { color: "#4F46E5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#6B7280", marginTop: 16 },
  emptySub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 6, lineHeight: 18 },
  card: {
    backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  personRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6" },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  personName: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  timeText: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  tournamentBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFFBEB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8,
  },
  tournamentName: { fontSize: 13, fontWeight: "700", color: "#92400E" },
  sportType: { fontSize: 10, color: "#B45309", marginTop: 2 },
  messageBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6",
  },
  messageText: { fontSize: 12, color: "#6B7280", fontStyle: "italic", flex: 1 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  rejectBtn: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  rejectText: { color: "#DC2626", fontSize: 13, fontWeight: "700" },
  acceptBtn: { backgroundColor: "#4F46E5" },
  acceptText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
});
