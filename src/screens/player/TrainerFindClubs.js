import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import TRAINER from "../../api/trainerConsole";
import ErrorBanner from "../../components/ErrorBanner";

const GREEN = "#15A765";
const SPORTS = ["All", "Cricket", "Football", "Tennis", "Swimming", "Badminton", "Athletics"];
const AMENITY_ICON = { gym: "dumbbell", pool: "pool", parking: "car", wifi: "wifi" };
const AMENITY_LABEL = { gym: "Gym", pool: "Pool", parking: "Parking", wifi: "Wi-Fi" };

const TrainerFindClubs = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("All");
  const [hiring, setHiring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [applying, setApplying] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const params = new URLSearchParams({ userId });
      if (sport !== "All") params.append("sport", sport);
      if (hiring) params.append("hiring", "true");
      if (search.trim()) params.append("q", search.trim());
      const res = await axios.get(`${TRAINER.CLUBS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) setClubs(res.data.clubs || []);
    } catch (e) {
      setClubs([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId, sport, hiring, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const apply = async (club) => {
    if (applying) return;
    try {
      setApplying(club.id);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        TRAINER.APPLY_CLUB,
        { userId, clubId: club.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setClubs((prev) => prev.map((c) => (c.id === club.id ? { ...c, applied: true } : c)));
        Alert.alert("Application sent", `Your application to ${club.name} was sent.`);
      } else {
        Alert.alert("Could not apply", res.data?.message || "Please try again.");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      if (err?.response?.status === 409) {
        setClubs((prev) => prev.map((c) => (c.id === club.id ? { ...c, applied: true } : c)));
      }
      Alert.alert("Apply", msg);
    } finally {
      setApplying(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Clubs</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs or location..."
          placeholderTextColor="#9A9A9A"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={load}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {SPORTS.map((s) => {
          const active = sport === s;
          return (
            <TouchableOpacity key={s} style={[styles.chip, active && styles.chipActive]} onPress={() => setSport(s)} activeOpacity={0.85}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={[styles.chip, hiring && styles.chipActive]} onPress={() => setHiring((v) => !v)} activeOpacity={0.85}>
          <Ionicons name="trophy-outline" size={13} color={hiring ? "#FFFFFF" : "#666"} />
          <Text style={[styles.chipText, hiring && styles.chipTextActive, { marginLeft: 4 }]}>Hiring</Text>
        </TouchableOpacity>
      </ScrollView>

      <ErrorBanner visible={loadError} onRetry={load} />
      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.count}>{clubs.length} clubs found</Text>
          {clubs.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.logo, { backgroundColor: c.logoColor || GREEN }]}>
                  <Text style={styles.logoText}>{c.shortCode}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clubName}>{c.name}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color="#888" />
                    <Text style={styles.metaText}>{c.location}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="people-outline" size={13} color="#888" />
                    <Text style={styles.metaText}>{c.members} members</Text>
                  </View>
                </View>
                {c.isHiring && (
                  <View style={styles.hiringBadge}>
                    <Text style={styles.hiringText}>Hiring</Text>
                  </View>
                )}
              </View>

              <View style={styles.tagRow}>
                {c.sports.map((sp) => (
                  <View key={sp} style={styles.sportTag}>
                    <Text style={styles.sportTagText}>{sp}</Text>
                  </View>
                ))}
              </View>

              {c.amenities?.length > 0 && (
                <View style={styles.amenityRow}>
                  {c.amenities.map((a) => (
                    <View key={a} style={styles.amenity}>
                      <MaterialCommunityIcons name={AMENITY_ICON[a] || "checkbox-blank-circle-outline"} size={14} color="#666" />
                      <Text style={styles.amenityText}>{AMENITY_LABEL[a] || a}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.detailsBtn} onPress={() => Alert.alert("Club details", "Coming soon")}>
                  <Text style={styles.detailsText}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyBtn, c.applied && styles.appliedBtn]}
                  onPress={() => !c.applied && apply(c)}
                  disabled={c.applied || applying === c.id}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.applyText, c.applied && styles.appliedText]}>
                    {c.applied ? "Applied" : applying === c.id ? "..." : "Apply"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#FFFFFF" },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A", marginLeft: 4 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F1F2F4", marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, height: 46, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#1F1F1F" },
  chipsRow: { maxHeight: 52, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 34, borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", borderWidth: 1, borderColor: "#ECEEF1" },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", color: "#666666" },
  chipTextActive: { color: "#FFFFFF" },
  count: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#888", marginBottom: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "#EEF1FA" },
  cardTop: { flexDirection: "row", alignItems: "flex-start" },
  logo: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  logoText: { color: "#FFFFFF", fontSize: 15, fontFamily: "Montserrat_700Bold" },
  clubName: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#1A181B" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  metaText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#888" },
  hiringBadge: { backgroundColor: "#D7F4E1", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  hiringText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#15A765" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  sportTag: { backgroundColor: "#F1F2F4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sportTagText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#555" },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12 },
  amenity: { flexDirection: "row", alignItems: "center", gap: 4 },
  amenityText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#666" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  detailsBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: "#DADDE2", justifyContent: "center", alignItems: "center" },
  detailsText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#444" },
  applyBtn: { flex: 1, height: 46, borderRadius: 10, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  appliedBtn: { backgroundColor: "#E6F7EC" },
  applyText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#FFFFFF" },
  appliedText: { color: GREEN },
});

export default TrainerFindClubs;
