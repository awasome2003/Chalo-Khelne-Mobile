import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";
import { colors } from "../../theme";

export default function TrainerProfile() {
  const { user, logout } = useAuth();
  const id = user?.id || user?._id;
  const isSubstitute = String(user?.role || "") === "Substitute";

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // A substitute isn't a Manager — skip the manager-profile fetch (it'd 404);
      // just load the (coach's) attendance history.
      if (isSubstitute) {
        setName(user?.name || "");
        const hist = await axios.get(`${API.BASE_URL}/attendance/history`);
        setHistory(hist.data?.sessions || []);
      } else {
        const [prof, hist] = await Promise.all([
          axios.get(`${API.BASE_URL}/manager/managers/${id}/profile`),
          axios.get(`${API.BASE_URL}/attendance/history`),
        ]);
        const m = prof.data?.manager;
        if (m) { setProfile(m); setName(m.name || ""); setEmail(m.email || ""); }
        setHistory(hist.data?.sessions || []);
      }
    } catch (e) {
      console.warn("Profile load failed:", e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, isSubstitute]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (id) load(); else setLoading(false); }, [id, load]);

  const roleLabel = isSubstitute ? "Substitute" : profile?.staffRole === "coach" ? "Coach" : "Trainer";
  const initial = (name || user?.name || "T").charAt(0).toUpperCase();

  const saveProfile = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Please enter your name."); return; }
    setSavingProfile(true);
    try {
      await axios.put(`${API.BASE_URL}/manager/managers/${id}/profile`, { name: name.trim(), email: email.trim() });
      Alert.alert("Saved", "Profile updated.");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not update profile.");
    } finally { setSavingProfile(false); }
  };

  const changePassword = async () => {
    if (!curPw || !newPw) { Alert.alert("Required", "Enter both passwords."); return; }
    if (newPw.length < 6) { Alert.alert("Too short", "New password must be at least 6 characters."); return; }
    setSavingPw(true);
    try {
      await axios.put(`${API.BASE_URL}/manager/managers/${id}/change-password`, { currentPassword: curPw, newPassword: newPw });
      setCurPw(""); setNewPw("");
      Alert.alert("Done", "Password updated.");
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Could not change password.");
    } finally { setSavingPw(false); }
  };

  const confirmLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout?.() },
    ]);
  };

  const fmtDate = (ymd) => {
    const [y, m, d] = String(ymd).split("-").map(Number);
    if (!y) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center" }]} edges={["top"]}>
        <ActivityIndicator color={"#15A765"} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={"#15A765"} />}
        >
          {/* Identity */}
          <View style={styles.identity}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{name || "Trainer"}</Text>
              <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{roleLabel}</Text></View>
            </View>
            <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>

          {isSubstitute ? (
            <View style={styles.card}>
              <Text style={styles.subNote}>You're standing in for <Text style={{ fontWeight: "800", color: colors.text }}>{user?.coachName || "a coach"}</Text>. You can see their sports, schedule and mark attendance until your access ends.</Text>
            </View>
          ) : (
            <>
              {/* Edit profile */}
              <Text style={styles.sectionTitle}>Profile</Text>
              <View style={styles.card}>
                <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                <TouchableOpacity onPress={saveProfile} disabled={savingProfile} style={styles.primaryBtn}>
                  {savingProfile ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Save profile</Text>}
                </TouchableOpacity>
              </View>

              {/* Change password */}
              <Text style={styles.sectionTitle}>Change password</Text>
              <View style={styles.card}>
                <Field label="Current password" value={curPw} onChangeText={setCurPw} placeholder="Current password" secureTextEntry />
                <Field label="New password" value={newPw} onChangeText={setNewPw} placeholder="At least 6 characters" secureTextEntry />
                <TouchableOpacity onPress={changePassword} disabled={savingPw} style={styles.primaryBtn}>
                  {savingPw ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>Update password</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Attendance history */}
          <Text style={styles.sectionTitle}>Attendance history</Text>
          {history.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={28} color={colors.borderDark} />
              <Text style={styles.emptyDesc}>No sessions recorded yet.</Text>
            </View>
          ) : (
            history.map((s, i) => (
              <View key={`${s.date}-${s.sport}-${s.standard}-${i}`} style={styles.histRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.histTitle} numberOfLines={1}>
                    {s.sport}{s.standard ? ` · Std ${s.standard}` : ""}
                  </Text>
                  <Text style={styles.histSub}>{fmtDate(s.date)}{s.time ? ` · ${s.time}` : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.histCount}>{s.present}/{s.total}</Text>
                  {s.self ? (
                    <Text style={[styles.histSelf, { color: s.self === "present" ? "#15A765" : colors.error }]}>
                      you: {s.self}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.textSub} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#15A765", justifyContent: "center", alignItems: "center" },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: "800", fontFamily: "Montserrat_600SemiBold" },
  name: { fontSize: 18, fontWeight: "800", fontFamily: "Montserrat_600SemiBold", color: colors.text },
  roleBadge: { alignSelf: "flex-start", backgroundColor: "rgba(21,167,101,0.12)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: "700", fontFamily: "Montserrat_600SemiBold", color: "#15A765" },
  logoutBtn: { padding: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "800", fontFamily: "Montserrat_600SemiBold", color: colors.text, marginTop: 22, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  subNote: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: colors.textSub, lineHeight: 19 },
  fieldLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Montserrat_600SemiBold", color: colors.textSub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input: { height: 44, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, fontSize: 14, fontFamily: "Montserrat_400Regular", color: colors.text },
  primaryBtn: { marginTop: 4, height: 46, borderRadius: 10, backgroundColor: "#15A765", justifyContent: "center", alignItems: "center" },
  primaryBtnText: { fontSize: 14, fontWeight: "800", fontFamily: "Montserrat_600SemiBold", color: colors.white },
  emptyBox: { padding: 22, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 6 },
  histRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
  histTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Montserrat_600SemiBold", color: colors.text },
  histSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },
  histCount: { fontSize: 14, fontWeight: "800", fontFamily: "Montserrat_600SemiBold", color: colors.text },
  histSelf: { fontSize: 11, fontFamily: "Montserrat_500Medium", marginTop: 2 },
});
