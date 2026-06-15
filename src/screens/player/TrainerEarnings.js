import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
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

const PERIODS = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "all_time", label: "All Time" },
];

const SOURCE_META = [
  { key: "players", label: "Players", color: "#15A765" },
  { key: "clubs", label: "Clubs", color: "#2563EB" },
  { key: "events", label: "Events", color: "#F59E0B" },
  { key: "academy", label: "Academy", color: "#A855F7" },
];

const TXN_ICON = {
  players: { icon: "person", bg: "#E6F7EC", color: "#15A765" },
  clubs: { icon: "business", bg: "#EAF1FF", color: "#2563EB" },
  events: { icon: "trophy", bg: "#FFF4E5", color: "#F59E0B" },
  academy: { icon: "school", bg: "#F6ECFF", color: "#A855F7" },
};

// ₹70,300 (full) and compact ₹35k / ₹4.8L
const inrFull = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const inrCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 100000) return `₹${(v / 100000) % 1 === 0 ? v / 100000 : (v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000) % 1 === 0 ? v / 1000 : (v / 1000).toFixed(1)}k`;
  return `₹${v}`;
};

const TrainerEarnings = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [period, setPeriod] = useState("this_month");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(`${TRAINER.EARNINGS(userId)}?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) setData(res.data);
    } catch (e) {
      setData(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, period]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || "This Month";
  const sources = data?.sources || { players: 0, clubs: 0, events: 0, academy: 0 };
  const txns = data?.transactions || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ErrorBanner visible={loadError} onRetry={load} />
      {loading && !data ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>{periodLabel}</Text>
              <Text style={styles.heroAmount}>{inrFull(data?.earned)}</Text>
            </View>
            {data?.pct != null && (
              <View style={styles.pctPill}>
                <Ionicons name={Number(data.pct) >= 0 ? "trending-up" : "trending-down"} size={14} color="#FFFFFF" />
                <Text style={styles.pctText}>
                  {Number(data.pct) >= 0 ? "+" : ""}
                  {data.pct}% vs last month
                </Text>
              </View>
            )}
          </View>

          {/* Period tabs */}
          <View style={styles.periodRow}>
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <TouchableOpacity key={p.key} style={[styles.periodTab, active && styles.periodTabActive]} onPress={() => setPeriod(p.key)} activeOpacity={0.85}>
                  <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stat cards */}
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color={GREEN} />
              <Text style={styles.statValue}>{data?.sessionsDone ?? 0}</Text>
              <Text style={styles.statLabel}>Sessions Done</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={styles.statValue}>{inrCompact(data?.pending)}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={20} color="#2563EB" />
              <Text style={styles.statValue}>{inrCompact(data?.totalEarned)}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
          </View>

          {/* Payment sources */}
          <View style={styles.sourcesCard}>
            <Text style={styles.sourcesTitle}>Payment Sources</Text>
            <View style={styles.bar}>
              {SOURCE_META.map((s) =>
                sources[s.key] > 0 ? (
                  <View key={s.key} style={{ width: `${sources[s.key]}%`, backgroundColor: s.color, height: "100%" }} />
                ) : null
              )}
              {SOURCE_META.every((s) => !sources[s.key]) && <View style={{ flex: 1, backgroundColor: "#EEF1F4" }} />}
            </View>
            <View style={styles.legendRow}>
              {SOURCE_META.map((s) => (
                <View key={s.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <Text style={styles.legendText}>
                    {s.label} {sources[s.key] || 0}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent transactions */}
          <View style={styles.txnHeader}>
            <Text style={styles.txnTitle}>Recent Transactions</Text>
          </View>
          {txns.length === 0 ? (
            <Text style={styles.empty}>No transactions in this period</Text>
          ) : (
            <View style={styles.txnCard}>
              {txns.map((t, i) => {
                const m = TXN_ICON[t.source] || TXN_ICON.players;
                return (
                  <View key={t.id} style={[styles.txnRow, i < txns.length - 1 && styles.txnDivider]}>
                    <View style={[styles.txnIcon, { backgroundColor: m.bg }]}>
                      <Ionicons name={m.icon} size={18} color={m.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnName}>{t.title}</Text>
                      <Text style={styles.txnDate}>{t.date}</Text>
                    </View>
                    <Text style={styles.txnAmount}>↗ {inrFull(t.amount)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FFFFFF" },
  backBtn: { position: "absolute", left: 12, width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },

  hero: { backgroundColor: GREEN, borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center" },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontFamily: "Montserrat_600SemiBold" },
  heroAmount: { color: "#FFFFFF", fontSize: 30, fontFamily: "Montserrat_700Bold", marginTop: 4 },
  pctPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pctText: { color: "#FFFFFF", fontSize: 12, fontFamily: "Poppins_500Medium" },

  periodRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  periodTab: { flex: 1, height: 44, borderRadius: 22, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#ECEEF1" },
  periodTabActive: { backgroundColor: GREEN, borderColor: GREEN },
  periodText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#666" },
  periodTextActive: { color: "#FFFFFF" },

  statRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "#EEF1FA" },
  statValue: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A", marginTop: 6 },
  statLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#6F6F6F", marginTop: 2 },

  sourcesCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, marginTop: 14, borderWidth: 1, borderColor: "#EEF1FA" },
  sourcesTitle: { fontSize: 15, fontFamily: "Montserrat_700Bold", color: "#1A181B", marginBottom: 12 },
  bar: { flexDirection: "row", height: 10, borderRadius: 6, overflow: "hidden", backgroundColor: "#EEF1F4" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#555" },

  txnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 },
  txnTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#1A181B" },
  empty: { color: "#9A9A9A", fontFamily: "Poppins_400Regular", fontSize: 13, paddingVertical: 10 },
  txnCard: { backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: "#EEF1FA" },
  txnRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  txnDivider: { borderBottomWidth: 1, borderBottomColor: "#F2F4F6" },
  txnIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", marginRight: 12 },
  txnName: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#1A181B" },
  txnDate: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#9A9A9A", marginTop: 2 },
  txnAmount: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: GREEN },
});

export default TrainerEarnings;
