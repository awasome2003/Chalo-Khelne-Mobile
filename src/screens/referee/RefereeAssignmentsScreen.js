import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

/**
 * RefereeAssignmentsScreen — list of match assignments for an umpire.
 * Tabs: Active (pending + accepted) / Completed.
 * Pending rows: Accept / Decline buttons.
 * Accepted rows: Open Scorer button (Phase 3 stub).
 */
export default function RefereeAssignmentsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = user?.id || user?._id;

  const [activeTab, setActiveTab] = useState("active"); // "active" | "completed"
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const endpointFor = (tab) =>
    tab === "completed"
      ? `${API.BASE_URL}/referee/assignments/completed/${userId}`
      : `${API.BASE_URL}/referee/assignments/${userId}`;

  const fetchAssignments = useCallback(
    async (tab = activeTab) => {
      if (!userId) return;
      try {
        const res = await axios.get(endpointFor(tab));
        // Backend may return an array, or an object { assignments: [...] }
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.assignments || res.data?.data || [];
        setAssignments(data);
      } catch (err) {
        console.error("fetchAssignments error:", err?.message);
        setAssignments([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, activeTab]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchAssignments(activeTab);
    }, [activeTab, fetchAssignments])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignments(activeTab);
  };

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
  };

  const respond = async (assignment, action) => {
    const assignmentId = assignment._id || assignment.id;
    if (!assignmentId) return;
    setRespondingId(assignmentId);
    try {
      const url = `${API.BASE_URL}/referee/assignments/${userId}/${assignmentId}/${action}`;
      await axios.put(url);
      await fetchAssignments(activeTab);
    } catch (err) {
      Alert.alert(
        "Action failed",
        err?.response?.data?.message || err?.message || "Please try again."
      );
    } finally {
      setRespondingId(null);
    }
  };

  const openScorer = (assignment) => {
    const matchId =
      assignment?.matchId?._id ||
      assignment?.matchId ||
      assignment?.id;
    if (!matchId) {
      Alert.alert("Cannot open scorer", "This assignment isn't linked to a match yet.");
      return;
    }
    const matchLabel =
      assignment?.title ||
      assignment?.tournamentTitle ||
      "Match";
    navigation.navigate("RefereeMatchScorer", { matchId, matchLabel });
  };

  const renderItem = ({ item }) => {
    const status = (item.status || "").toLowerCase();
    const title = item.title || item.tournamentTitle || "Match Assignment";
    const location = item.location || item.courtNumber || "TBD";
    const date = item.date || item.startTime || item.scheduledAt;
    const dateLabel = date ? new Date(date).toLocaleString() : "TBD";
    const isPending = status === "pending";
    const isAccepted = status === "accepted";
    const isCompleted = status === "completed";
    const busy = respondingId === (item._id || item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardRowTop}>
          <MaterialCommunityIcons name="whistle" size={18} color="#FF6A00" />
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.metaText}>{location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color="#64748B" />
          <Text style={styles.metaText}>{dateLabel}</Text>
        </View>

        <View style={[styles.statusPill, statusPillStyle(status)]}>
          <Text style={[styles.statusText, statusTextStyle(status)]}>
            {status.toUpperCase()}
          </Text>
        </View>

        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.declineBtn]}
              disabled={busy}
              onPress={() => respond(item, "decline")}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#B91C1C" />
                  <Text style={styles.declineText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.acceptBtn]}
              disabled={busy}
              onPress={() => respond(item, "accept")}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.acceptText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {isAccepted && (
          <TouchableOpacity
            style={[styles.btn, styles.scorerBtn]}
            onPress={() => openScorer(item)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="counter" size={16} color="#fff" />
            <Text style={styles.scorerText}>Open Scorer</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedHint}>
            <Ionicons name="checkmark-done" size={14} color="#10B981" />
            <Text style={styles.completedHintText}>Match completed</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#FF6A00", "#FF8A3D"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Match Assignments</Text>
        <View style={{ width: 22 }} />
      </LinearGradient>

      <View style={styles.tabBar}>
        {["active", "completed"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => switchTab(tab)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab === "active" ? "Active" : "Completed"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.loadingText}>Loading assignments…</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item, idx) => String(item._id || item.id || idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF6A00"]}
              tintColor="#FF6A00"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name="whistle-outline"
                size={56}
                color="#CBD5E1"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "active"
                  ? "No active assignments"
                  : "No completed assignments yet"}
              </Text>
              <Text style={styles.emptyHint}>
                {activeTab === "active"
                  ? "Apply to officiate tournaments to receive match assignments."
                  : "Assignments you complete will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const statusPillStyle = (status) => {
  switch (status) {
    case "pending":
      return { backgroundColor: "#FEF3C7" };
    case "accepted":
      return { backgroundColor: "#D1FAE5" };
    case "declined":
      return { backgroundColor: "#FEE2E2" };
    case "completed":
      return { backgroundColor: "#E0F2FE" };
    default:
      return { backgroundColor: "#E5E7EB" };
  }
};
const statusTextStyle = (status) => {
  switch (status) {
    case "pending":
      return { color: "#92400E" };
    case "accepted":
      return { color: "#065F46" };
    case "declined":
      return { color: "#991B1B" };
    case "completed":
      return { color: "#075985" };
    default:
      return { color: "#374151" };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: "#FF6A00" },
  tabText: { color: "#64748B", fontWeight: "600" },
  tabTextActive: { color: "#FF6A00" },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  metaText: { color: "#475569", fontSize: 13 },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 10,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
  },
  declineText: { color: "#B91C1C", fontWeight: "700", fontSize: 13 },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#10B981",
  },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  scorerBtn: {
    marginTop: 12,
    backgroundColor: "#1E293B",
    paddingHorizontal: 14,
  },
  scorerText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  completedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  completedHintText: { color: "#10B981", fontSize: 12, fontWeight: "600" },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: "#64748B" },
  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptyHint: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 6,
    fontSize: 13,
  },
});
