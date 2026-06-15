import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API from "../../api/api";
import { colors } from "../../theme";

// Trainer's training schedule — the slots (Day · Standard · Time) where the
// sport(s) they're assigned to run, as set by the school/organization admin.
export default function TrainerSchedule() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/training-schedule/mine`);
      setRows(res.data?.rows || []);
    } catch (e) {
      console.warn("Failed to load schedule:", e?.message);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  const onRefresh = () => { setRefreshing(true); fetchSchedule(); };

  // Group rows by day, preserving order.
  const byDay = [];
  const dayIndex = {};
  rows.forEach((r) => {
    const d = r.day || "Other";
    if (dayIndex[d] === undefined) { dayIndex[d] = byDay.length; byDay.push({ day: d, items: [] }); }
    byDay[dayIndex[d]].items.push(r);
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Schedule</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={"#15A765"} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={"#15A765"} /></View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={34} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No sessions yet</Text>
            <Text style={styles.emptyDesc}>
              Your training sessions will appear here once your admin adds them for your sport.
            </Text>
          </View>
        ) : (
          byDay.map((group) => (
            <View key={group.day} style={{ marginBottom: 18 }}>
              <Text style={styles.dayHeader}>{group.day}</Text>
              {group.items.map((r) => (
                <View key={r._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    {!!r.standard && (
                      <View style={styles.stdBadge}>
                        <Text style={styles.stdBadgeText}>Std {r.standard}</Text>
                      </View>
                    )}
                    {!!r.time && (
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={13} color={colors.textSub} />
                        <Text style={styles.timeText}>{r.time}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.sportsRow}>
                    {(r.mySports && r.mySports.length ? r.mySports : r.sports || []).map((s, i) => (
                      <View key={i} style={styles.sportChip}>
                        <Text style={styles.sportChipText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  headerBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  emptyBox: {
    marginTop: 24, padding: 24, borderRadius: 14, backgroundColor: colors.white,
    alignItems: "center", borderWidth: 1, borderColor: colors.border,
  },
  emptyTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, marginTop: 10 },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, textAlign: "center", marginTop: 4, lineHeight: 18 },
  dayHeader: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: "#15A765", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  stdBadge: { backgroundColor: "rgba(21,167,101,0.12)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  stdBadgeText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#15A765" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.textSub },
  sportsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sportChip: { backgroundColor: "rgba(21,167,101,0.12)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  sportChipText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#15A765" },
});
