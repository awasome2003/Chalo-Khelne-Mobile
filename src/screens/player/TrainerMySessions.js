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
const TABS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "live", label: "Live" },
  { key: "completed", label: "Completed" },
];
const TYPE_BADGE = {
  Personal: { bg: "#F3E8FF", text: "#8200DB" },
  Group: { bg: "#DBEAFE", text: "#2563EB" },
  Academy: { bg: "#D7F4E1", text: "#15A765" },
};
const STATUS_BADGE = {
  Upcoming: { bg: "#FFF4D1", text: "#C68B00" },
  Live: { bg: "#D7F4E1", text: "#15A765" },
  Done: { bg: "#F1F1F1", text: "#6F6F6F" },
  Cancelled: { bg: "#FFE2E2", text: "#D7263D" },
};

const TrainerMySessions = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sessions, setSessions] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(`${TRAINER.SESSIONS(userId)}?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) setSessions(res.data.sessions || []);
    } catch (e) {
      setSessions([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, tab]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F8" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Sessions</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("TrainerCreateSession")}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(t.key)} activeOpacity={0.85}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ErrorBanner visible={loadError} onRetry={load} />
      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={40} color="#CCC" />
          <Text style={styles.emptyText}>No sessions here</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 12 }} showsVerticalScrollIndicator={false}>
          {sessions.map((s) => {
            const typeB = TYPE_BADGE[s.type] || TYPE_BADGE.Personal;
            const statusB = STATUS_BADGE[s.status] || STATUS_BADGE.Upcoming;
            return (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{s.icon}</Text>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: typeB.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: typeB.text }]}>{s.type}</Text>
                  </View>
                </View>
                <Row icon="calendar-outline" text={s.date} />
                <Row icon="time-outline" text={s.time} />
                <Row icon="location-outline" text={s.venue} />
                <Row icon="people-outline" text={`${s.current}${s.max ? "/" + s.max : ""} Players`} />
                <View style={styles.cardBottom}>
                  <View style={[styles.statusBadge, { backgroundColor: statusB.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusB.text }]}>{s.status}</Text>
                  </View>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => Alert.alert("Session details", "Coming soon")}>
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const Row = ({ icon, text }) => (
  <View style={styles.metaRow}>
    <Ionicons name={icon} size={15} color="#8A8A8A" />
    <Text style={styles.metaText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  tabsRow: { maxHeight: 50, marginBottom: 4 },
  tab: { paddingHorizontal: 18, height: 36, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", borderWidth: 1, borderColor: "#ECEEF1" },
  tabActive: { backgroundColor: GREEN, borderColor: GREEN },
  tabText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#666666" },
  tabTextActive: { color: "#FFFFFF" },
  empty: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { color: "#9A9A9A", fontFamily: "Montserrat_500Medium", fontSize: 14 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EEF1FA" },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#1A181B" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  metaText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#555555" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  viewBtn: { backgroundColor: GREEN, paddingHorizontal: 22, paddingVertical: 9, borderRadius: 10 },
  viewBtnText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Montserrat_600SemiBold" },
});

export default TrainerMySessions;
