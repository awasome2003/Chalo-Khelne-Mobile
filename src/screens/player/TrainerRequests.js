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
import TRAINER from "../../api/trainerConsole";
import ErrorBanner from "../../components/ErrorBanner";

const GREEN = "#15A765";

const initials = (name) =>
  (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const TrainerRequests = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [tab, setTab] = useState("player");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [counts, setCounts] = useState({ player: 0, club: 0, event: 0 });
  const [requests, setRequests] = useState([]);

  const authHeaders = async () => ({ Authorization: `Bearer ${await AsyncStorage.getItem("auth_token")}` });

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await axios.get(`${TRAINER.REQUESTS(userId)}?type=${tab}`, { headers: await authHeaders() });
      if (res.data?.success) {
        setCounts(res.data.counts || { player: 0, club: 0, event: 0 });
        setRequests(res.data.requests || []);
      }
    } catch (e) {
      setRequests([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const respond = async (item, status) => {
    try {
      const url = item.kind === "club" ? TRAINER.RESPOND_CLUB(item.id) : TRAINER.RESPOND_PLAYER(item.id);
      await axios.patch(url, { status }, { headers: await authHeaders() });
      load();
    } catch (err) {
      Alert.alert("Could not update", err?.response?.data?.message || err.message);
    }
  };

  const TABS = [
    { key: "player", label: "Player Requests", count: counts.player },
    { key: "club", label: "Club Requests", count: counts.club },
    { key: "event", label: "Event Requests", count: counts.event },
  ];
  const totalCount = counts.player + counts.club + counts.event;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requests</Text>
        {totalCount > 0 && (
          <View style={styles.headerCount}>
            <Text style={styles.headerCountText}>{totalCount}</Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)} activeOpacity={0.85}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, active && { color: GREEN }]}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ErrorBanner visible={loadError} onRetry={load} />
      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : requests.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mail-outline" size={40} color="#CCC" />
          <Text style={styles.emptyText}>No {tab} requests</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14 }} showsVerticalScrollIndicator={false}>
          {requests.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(r.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={{ fontSize: 13 }}>{r.icon}</Text>
                    <Text style={styles.sport}>{r.sport || r.type}</Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {r.status === "pending" ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  ) : (
                    <Text style={[styles.resolved, { color: r.status === "accepted" ? GREEN : "#D7263D" }]}>{r.status}</Text>
                  )}
                  <Text style={styles.typeText}>{r.type}</Text>
                </View>
              </View>

              {(r.date || r.location) && (
                <View style={styles.detailRow}>
                  {r.date ? (
                    <View style={styles.detailItem}>
                      <Ionicons name="calendar-outline" size={14} color="#888" />
                      <Text style={styles.detailText}>{r.date}</Text>
                    </View>
                  ) : null}
                  {r.time ? (
                    <View style={styles.detailItem}>
                      <Ionicons name="time-outline" size={14} color="#888" />
                      <Text style={styles.detailText}>{r.time}</Text>
                    </View>
                  ) : null}
                </View>
              )}
              {r.location ? (
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={styles.detailText}>{r.location}</Text>
                </View>
              ) : null}
              {r.notes ? <Text style={styles.notes}>{r.notes}</Text> : null}

              {r.status === "pending" && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(r, "accepted")}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => respond(r, "rejected")}>
                    <Ionicons name="close" size={16} color="#D7263D" />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.msgBtn} onPress={() => Alert.alert("Message", "Coming soon")}>
                    <Ionicons name="chatbubble-outline" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FFFFFF" },
  backBtn: { position: "absolute", left: 12, width: 32, height: 32, justifyContent: "center", alignItems: "center", zIndex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },
  headerCount: { marginLeft: 8, backgroundColor: GREEN, minWidth: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
  headerCountText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Montserrat_700Bold" },
  tabsRow: { maxHeight: 56, marginTop: 8, marginBottom: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#ECEEF1" },
  tabActive: { backgroundColor: GREEN, borderColor: GREEN },
  tabText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#666666" },
  tabTextActive: { color: "#FFFFFF" },
  tabBadge: { backgroundColor: "#EEE", minWidth: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center", paddingHorizontal: 5 },
  tabBadgeActive: { backgroundColor: "#FFFFFF" },
  tabBadgeText: { fontSize: 11, fontFamily: "Montserrat_700Bold", color: "#888" },
  empty: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { color: "#9A9A9A", fontFamily: "Montserrat_500Medium", fontSize: 14, textTransform: "capitalize" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EEF1FA" },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E6F7EC", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: GREEN, fontSize: 14, fontFamily: "Montserrat_700Bold" },
  name: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#1A181B" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  sport: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#666" },
  pendingBadge: { backgroundColor: "#FFF4D1", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pendingText: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#C68B00" },
  resolved: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", textTransform: "capitalize" },
  typeText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#2563EB" },
  detailRow: { flexDirection: "row", gap: 18, marginTop: 12 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  detailText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#555" },
  notes: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#777", marginTop: 10, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  acceptBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: GREEN, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  acceptText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Montserrat_600SemiBold" },
  rejectBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: "#FFCDD2", backgroundColor: "#FFFFFF", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  rejectText: { color: "#D7263D", fontSize: 14, fontFamily: "Montserrat_600SemiBold" },
  msgBtn: { width: 52, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "#DADDE2", backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" },
});

export default TrainerRequests;
