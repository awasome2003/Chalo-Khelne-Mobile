import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";
import { colors } from "../../theme";

// Trainer / coach (club staff) home for the mobile app. Shows the sports they
// are assigned to (from the club's Sports & Trainers setup) + sign out.
export default function TrainerStaffHome() {
  const { user, logout } = useAuth();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const roleLabel =
    user?.staffRole === "coach" ? "Coach" : user?.staffRole === "trainer" ? "Trainer" : "Staff";

  const fetchMySports = useCallback(async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/club-sports/mine`);
      setSports(res.data?.sports || []);
    } catch (e) {
      console.warn("Failed to load assigned sports:", e?.message);
      setSports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMySports();
  }, [fetchMySports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMySports();
  };

  const confirmLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout?.() },
    ]);
  };

  const initial = (user?.name || "T").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={"#15A765"} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greeting}>Hi, {user?.name || "Trainer"}</Text>
            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{roleLabel}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>

        {/* My Sports */}
        <Text style={styles.sectionTitle}>My Sports</Text>
        <Text style={styles.sectionSub}>Sports you've been assigned to train.</Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={"#15A765"} />
          </View>
        ) : sports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="basketball-outline" size={34} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No sports assigned yet</Text>
            <Text style={styles.emptyDesc}>
              Your club admin hasn't assigned you to a sport yet. Pull to refresh once they do.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {sports.map((s) => (
              <View key={s._id} style={styles.sportCard}>
                <View style={styles.sportIcon}>
                  <Ionicons name="trophy-outline" size={18} color={"#15A765"} />
                </View>
                <Text style={styles.sportName}>{s.name}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: colors.white, fontSize: 20, fontFamily: "Montserrat_600SemiBold", fontWeight: "800" },
  greeting: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  roleRow: { flexDirection: "row", marginTop: 4 },
  roleBadge: { backgroundColor: "rgba(21,167,101,0.12)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#15A765" },
  logoutBtn: { padding: 4 },
  sectionTitle: { fontSize: 16, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  sectionSub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  emptyBox: {
    marginTop: 16,
    padding: 24,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, marginTop: 10 },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, textAlign: "center", marginTop: 4, lineHeight: 18 },
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(21,167,101,0.10)",
    justifyContent: "center",
    alignItems: "center",
  },
  sportName: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
});
