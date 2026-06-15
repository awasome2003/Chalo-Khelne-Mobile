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
const LEVEL_BADGE = {
  beginner: { bg: "#DBEAFE", text: "#2563EB", label: "Beginner" },
  intermediate: { bg: "#E6F7EC", text: "#15A765", label: "Intermediate" },
  advanced: { bg: "#FFF4E5", text: "#C2410C", label: "Advanced" },
  kids: { bg: "#FCE7F3", text: "#DB2777", label: "Kids" },
  professional: { bg: "#FFE2E2", text: "#D7263D", label: "Professional" },
};

const TrainerBatches = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [batches, setBatches] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(TRAINER.BATCHES(userId), { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) setBatches(res.data.batches || []);
    } catch (e) {
      setBatches([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Batches</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("TrainerCreateBatch")}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ErrorBanner visible={loadError} onRetry={load} />
      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : batches.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color="#CCC" />
          <Text style={styles.emptyText}>No batches yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14 }} showsVerticalScrollIndicator={false}>
          {batches.map((b) => {
            const lvl = LEVEL_BADGE[b.level] || LEVEL_BADGE.beginner;
            const full = b.percent >= 75;
            return (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{b.icon}</Text>
                  <Text style={styles.name}>{b.name}</Text>
                  <View style={[styles.levelBadge, { backgroundColor: lvl.bg }]}>
                    <Text style={[styles.levelText, { color: lvl.text }]}>{lvl.label}</Text>
                  </View>
                </View>

                <View style={styles.enrollRow}>
                  <View style={styles.enrollLeft}>
                    <Ionicons name="people-outline" size={15} color="#888" />
                    <Text style={styles.enrollText}>{b.enrolled}/{b.capacity} Enrolled</Text>
                  </View>
                  <Text style={styles.percent}>{b.percent}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(b.percent, 100)}%`, backgroundColor: full ? "#F5B400" : GREEN }]} />
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.metaText}>
                    {b.scheduleDays?.join(", ")}{b.time ? ` • ${b.time}` : ""}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={styles.metaText}>{b.location}</Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity style={styles.manageBtn} onPress={() => Alert.alert("Manage batch", "Coming soon")}>
                    <Text style={styles.manageText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attendBtn} onPress={() => Alert.alert("Attendance", "Coming soon")}>
                    <Text style={styles.attendText}>Attendance</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FFFFFF" },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A" },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyText: { color: "#9A9A9A", fontFamily: "Montserrat_500Medium", fontSize: 14 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#EEF1FA" },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  name: { flex: 1, fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#1A181B" },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  enrollRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  enrollLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  enrollText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#666" },
  percent: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#666" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#EEF1F4", overflow: "hidden", marginBottom: 12 },
  progressFill: { height: "100%", borderRadius: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  metaText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#555" },
  actions: { flexDirection: "row", gap: 12, marginTop: 10 },
  manageBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  manageText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Montserrat_600SemiBold" },
  attendBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: "#F1F2F4", justifyContent: "center", alignItems: "center" },
  attendText: { color: "#444", fontSize: 14, fontFamily: "Montserrat_600SemiBold" },
});

export default TrainerBatches;
