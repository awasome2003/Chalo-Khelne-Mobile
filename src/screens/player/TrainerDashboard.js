import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import TRAINER from "../../api/trainerConsole";

const GREEN = "#15A765";

const STATUS_BADGE = {
  Upcoming: { bg: "#DBEAFE", text: "#2563EB", icon: "time-outline" },
  Live: { bg: "#D7F4E1", text: "#15A765", icon: "radio-outline" },
  Done: { bg: "#F1F1F1", text: "#6F6F6F", icon: "checkmark-circle-outline" },
  Cancelled: { bg: "#FFE2E2", text: "#D7263D", icon: "close-circle-outline" },
};

const fmtMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return `₹${(v / 1000) % 1 === 0 ? v / 1000 : (v / 1000).toFixed(1)}k`;
  return `₹${v}`;
};

const initials = (name) =>
  (name || "P")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const TrainerDashboard = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const userId = user?._id || user?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [stats, setStats] = useState({ upcomingSessions: 0, activePlayers: 0, pendingRequests: 0, monthlyEarnings: 0 });
  const [today, setToday] = useState([]);
  const [recent, setRecent] = useState([]);

  const authHeaders = async () => ({ Authorization: `Bearer ${await AsyncStorage.getItem("auth_token")}` });

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await axios.get(TRAINER.DASHBOARD(userId), { headers: await authHeaders() });
      if (res.data?.success) {
        setStats(res.data.stats);
        setToday(res.data.todaySessions || []);
        setRecent(res.data.recentRequests || []);
      }
    } catch (e) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = async (id, status) => {
    try {
      await axios.patch(TRAINER.RESPOND_PLAYER(id), { status }, { headers: await authHeaders() });
      load();
    } catch (err) {
      Alert.alert("Could not update", err?.response?.data?.message || err.message);
    }
  };

  const soon = (label) => Alert.alert(label, "Coming soon");

  const statCards = [
    { label: "Upcoming Sessions", value: stats.upcomingSessions, icon: "calendar-outline", color: "#2563EB", bg: "#EAF1FF" },
    { label: "Active Players", value: stats.activePlayers, icon: "people-outline", color: "#15A765", bg: "#E6F7EC" },
    { label: "Pending Requests", value: stats.pendingRequests, icon: "time-outline", color: "#F59E0B", bg: "#FFF4E5" },
    { label: "Monthly Earnings", value: fmtMoney(stats.monthlyEarnings), icon: "cash-outline", color: "#8200DB", bg: "#F6ECFF" },
  ];

  const quick = [
    // { label: "Session", icon: "add", solid: true, onPress: () => navigation.navigate("TrainerMySessions") },
    { label: "Batches", icon: "people", bg: "#EAF1FF", color: "#2563EB", onPress: () => navigation.navigate("TrainerBatches") },
    { label: "Calendar", icon: "calendar", bg: "#FFF4E5", color: "#F59E0B", onPress: () => navigation.navigate("Planner") },
    { label: "Earnings", icon: "cash", bg: "#F6ECFF", color: "#8200DB", onPress: () => navigation.navigate("TrainerEarnings") },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F8" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.85} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.title}>Trainer 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          activeOpacity={0.85}
          onPress={() => {
            try {
              navigation.navigate("Notifications");
            } catch {
              navigation.getParent()?.navigate("Home", { screen: "Notifications" });
            }
          }}
        >
          <Ionicons name="notifications-outline" size={20} color="#1F1F1F" />
          {unreadCount > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      {loadError && (
        <TouchableOpacity
          onPress={load}
          activeOpacity={0.85}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FFE2E2", paddingVertical: 10, marginHorizontal: 16, borderRadius: 10, marginBottom: 8 }}
        >
          <Ionicons name="cloud-offline-outline" size={16} color="#D7263D" />
          <Text style={{ color: "#D7263D", fontFamily: "Montserrat_600SemiBold", fontSize: 13 }}>
            Couldn't load dashboard. Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {statCards.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          {quick.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={[styles.quickItem, q.solid ? { backgroundColor: GREEN } : { backgroundColor: q.bg }]}
              activeOpacity={0.85}
              onPress={q.onPress}
            >
              <Ionicons name={q.icon} size={22} color={q.solid ? "#FFFFFF" : q.color} />
              <Text style={[styles.quickText, { color: q.solid ? "#FFFFFF" : q.color }]}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Primary buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.ctaSolid} activeOpacity={0.9} onPress={() => navigation.navigate("TrainerCreateSession")}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.ctaSolidText}>New Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaOutline} activeOpacity={0.9} onPress={() => navigation.navigate("TrainerFindClubs")}>
            <Ionicons name="search" size={18} color={GREEN} />
            <Text style={styles.ctaOutlineText}>Find Club</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 30 }} />
        ) : (
          <>
            {/* Today's Sessions */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Sessions</Text>
              <TouchableOpacity onPress={() => navigation.navigate("TrainerMySessions")}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {today.length === 0 ? (
              <Text style={styles.empty}>No sessions today</Text>
            ) : (
              today.map((s) => {
                const badge = STATUS_BADGE[s.status] || STATUS_BADGE.Upcoming;
                return (
                  <View key={s.id} style={styles.sessionCard}>
                    <View style={styles.sessionIcon}>
                      <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionTitle}>{s.title}</Text>
                      <Text style={styles.sessionMeta}>
                        {s.startLabel} · {s.current} players
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Ionicons name={badge.icon} size={12} color={badge.text} />
                      <Text style={[styles.badgeText, { color: badge.text }]}>{s.status}</Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Recent Requests */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Requests</Text>
              <TouchableOpacity onPress={() => navigation.navigate("TrainerRequests")}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {recent.length === 0 ? (
              <Text style={styles.empty}>No requests yet</Text>
            ) : (
              recent.map((r) => (
                <View key={r.id} style={styles.reqCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(r.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>{r.name}</Text>
                    <Text style={styles.reqMeta}>
                      {r.sport} · {r.type} Training
                    </Text>
                  </View>
                  {r.status === "pending" ? (
                    <View style={styles.reqActions}>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(r.id, "accepted")}>
                        <Text style={styles.acceptText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => respond(r.id, "rejected")}>
                        <Text style={styles.rejectText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.reqStatus}>{r.status}</Text>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center", marginLeft: -6 },
  greeting: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#6F6F6F" },
  title: { fontSize: 22, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },
  switchBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: GREEN, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  switchText: { color: GREEN, fontSize: 13, fontFamily: "Montserrat_600SemiBold" },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#EEE" },
  bellDot: { position: "absolute", top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF4D4D" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginTop: 4 },
  statCard: { width: "47.5%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#EEF1FA" },
  statIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statValue: { fontSize: 24, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },
  statLabel: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6F6F6F", marginTop: 2 },

  quickRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginTop: 16 },
  quickItem: { flex: 1, height: 64, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 4 },
  quickText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold" },

  ctaRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginTop: 16 },
  ctaSolid: { flex: 1, height: 50, borderRadius: 12, backgroundColor: GREEN, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaSolidText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Montserrat_600SemiBold" },
  ctaOutline: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: GREEN, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  ctaOutlineText: { color: GREEN, fontSize: 15, fontFamily: "Montserrat_600SemiBold" },

  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },
  viewAll: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: GREEN },
  empty: { paddingHorizontal: 16, color: "#9A9A9A", fontFamily: "Poppins_400Regular", fontSize: 13 },

  sessionCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#EEF1FA" },
  sessionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F4F6F8", justifyContent: "center", alignItems: "center", marginRight: 12 },
  sessionTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: "#1A181B" },
  sessionMeta: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#6F6F6F", marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontFamily: "Poppins_500Medium" },

  reqCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 10, borderWidth: 1, borderColor: "#EEF1FA" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Montserrat_700Bold" },
  reqName: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", color: "#1A181B" },
  reqMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6F6F6F", marginTop: 2 },
  reqActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  acceptBtn: { backgroundColor: GREEN, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  acceptText: { color: "#FFFFFF", fontSize: 13, fontFamily: "Montserrat_600SemiBold" },
  rejectBtn: { backgroundColor: "#F1F1F1", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  rejectText: { color: "#6F6F6F", fontSize: 13, fontFamily: "Montserrat_600SemiBold" },
  reqStatus: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", color: "#15A765", textTransform: "capitalize" },
});

export default TrainerDashboard;
