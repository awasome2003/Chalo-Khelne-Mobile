import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";

const STAGE_COLORS = {
  Champion: { bg: "#FEF3C7", text: "#D97706", icon: "trophy" },
  Final: { bg: "#DBEAFE", text: "#2563EB", icon: "medal" },
  Knockout: { bg: "#E0E7FF", text: "#4F46E5", icon: "sword-cross" },
  "Group Stage": { bg: "#D1FAE5", text: "#059669", icon: "account-group" },
  Registered: { bg: "#F3F4F6", text: "#6B7280", icon: "ticket-confirmation" },
};

const TournamentHistory = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = user?.id || user?._id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/player-stats/${userId}`);
      if (res.data?.success) setData(res.data);
    } catch (err) {
      console.error("Error fetching stats:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchStats(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  const career = data?.career || {};
  const sportStats = data?.sportStats || [];
  const history = data?.tournamentHistory || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#1E3A5F", "#0F2439"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Career</Text>
          <Text style={styles.headerSubtitle}>Tournament history & rankings</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6A00"]} />}
      >
        {/* Career Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#EFF6FF" }]}>
            <Text style={[styles.statValue, { color: "#2563EB" }]}>{career.totalTournaments || 0}</Text>
            <Text style={styles.statLabel}>Tournaments</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.statValue, { color: "#059669" }]}>{career.totalWins || 0}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEE2E2" }]}>
            <Text style={[styles.statValue, { color: "#DC2626" }]}>{career.totalLosses || 0}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.statValue, { color: "#D97706" }]}>{career.winRate || 0}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Achievements Row */}
        <View style={styles.achievementsRow}>
          <View style={styles.achievementItem}>
            <MaterialCommunityIcons name="trophy" size={24} color="#D97706" />
            <Text style={styles.achievementValue}>{career.championships || 0}</Text>
            <Text style={styles.achievementLabel}>Championships</Text>
          </View>
          <View style={styles.achievementDivider} />
          <View style={styles.achievementItem}>
            <MaterialCommunityIcons name="medal" size={24} color="#2563EB" />
            <Text style={styles.achievementValue}>{career.finals || 0}</Text>
            <Text style={styles.achievementLabel}>Finals</Text>
          </View>
          <View style={styles.achievementDivider} />
          <View style={styles.achievementItem}>
            <MaterialCommunityIcons name="cricket" size={24} color="#059669" />
            <Text style={styles.achievementValue}>{career.totalMatches || 0}</Text>
            <Text style={styles.achievementLabel}>Matches</Text>
          </View>
        </View>

        {/* Sport-wise Breakdown */}
        {sportStats.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Performance by Sport</Text>
            {sportStats.map((s) => (
              <View key={s.sport} style={styles.sportRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sportName}>{s.sport}</Text>
                  <Text style={styles.sportMeta}>
                    {s.matches} matches · {s.wins}W {s.losses}L {s.draws > 0 ? `${s.draws}D` : ""}
                  </Text>
                </View>
                <View style={styles.winRateBadge}>
                  <Text style={styles.winRateText}>{s.winRate}%</Text>
                </View>
                {/* Win rate bar */}
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${s.winRate}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Tournament History List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tournament History</Text>
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="trophy-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No tournaments yet</Text>
            </View>
          ) : (
            history.map((t, idx) => {
              const stage = STAGE_COLORS[t.stageReached] || STAGE_COLORS.Registered;
              return (
                <View key={t.tournamentId || idx} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitle}>{t.title}</Text>
                      <View style={styles.historyMeta}>
                        <Text style={styles.historyMetaText}>{t.sport}</Text>
                        <Text style={styles.historyDot}>·</Text>
                        <Text style={styles.historyMetaText}>{t.startDate || "TBD"}</Text>
                      </View>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: stage.bg }]}>
                      <MaterialCommunityIcons name={stage.icon} size={12} color={stage.text} />
                      <Text style={[styles.stageText, { color: stage.text }]}>{t.stageReached}</Text>
                    </View>
                  </View>

                  {t.matches > 0 && (
                    <View style={styles.historyStats}>
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#1F2937" }}>{t.matches}</Text> played
                      </Text>
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#059669" }}>{t.wins}</Text> W
                      </Text>
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#DC2626" }}>{t.losses}</Text> L
                      </Text>
                      {t.draws > 0 && (
                        <Text style={styles.historyStatItem}>
                          <Text style={{ fontWeight: "800", color: "#6B7280" }}>{t.draws}</Text> D
                        </Text>
                      )}
                      <Text style={styles.historyStatItem}>
                        <Text style={{ fontWeight: "800", color: "#2563EB" }}>{t.winRate}%</Text> WR
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 18, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 10 },
  statCard: { width: "47%", borderRadius: 16, padding: 16, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  achievementsRow: { flexDirection: "row", backgroundColor: "#FFF", marginHorizontal: 16, borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 16 },
  achievementItem: { flex: 1, alignItems: "center" },
  achievementValue: { fontSize: 20, fontWeight: "900", color: "#1F2937", marginTop: 4 },
  achievementLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginTop: 2 },
  achievementDivider: { width: 1, height: 40, backgroundColor: "#F0F0F0" },
  sectionContainer: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#1F2937", marginBottom: 12 },
  sportRow: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8 },
  sportName: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  sportMeta: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  winRateBadge: { position: "absolute", right: 14, top: 14, backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  winRateText: { fontSize: 12, fontWeight: "800", color: "#2563EB" },
  barBg: { height: 4, backgroundColor: "#F3F4F6", borderRadius: 2, marginTop: 8 },
  barFill: { height: 4, backgroundColor: "#3B82F6", borderRadius: 2 },
  historyCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 8 },
  historyTop: { flexDirection: "row", alignItems: "flex-start" },
  historyTitle: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  historyMeta: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  historyMetaText: { fontSize: 11, color: "#9CA3AF" },
  historyDot: { fontSize: 11, color: "#DDD", marginHorizontal: 6 },
  stageBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  stageText: { fontSize: 10, fontWeight: "800" },
  historyStats: { flexDirection: "row", gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F5F5F5" },
  historyStatItem: { fontSize: 12, color: "#9CA3AF" },
  emptyState: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, color: "#AAA", marginTop: 12 },
});

export default TournamentHistory;
