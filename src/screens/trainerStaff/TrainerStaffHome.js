import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert, Modal, TextInput, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";
import { colors } from "../../theme";

const GREEN = "#15A765";

// Trainer / coach (or a substitute standing in for one) home. Shows assigned
// sports, plus a substitute-request flow for coaches who'll be absent.
export default function TrainerStaffHome() {
  const { user, token, logout } = useAuth();
  const isSubstitute = String(user?.role || "") === "Substitute";

  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Substitute request (coach side)
  const [sub, setSub] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [fName, setFName] = useState("");
  const [fContact, setFContact] = useState("");
  const [fPhoto, setFPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const roleLabel =
    isSubstitute ? "Substitute"
    : user?.staffRole === "coach" ? "Coach"
    : user?.staffRole === "trainer" ? "Trainer" : "Staff";

  const bearer = token ? `Bearer ${token}` : axios.defaults.headers?.common?.Authorization;

  const fetchMySports = useCallback(async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/club-sports/mine`);
      setSports(res.data?.sports || []);
    } catch (e) {
      setSports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchSub = useCallback(async () => {
    if (isSubstitute) return; // substitutes don't request substitutes
    try {
      const res = await axios.get(`${API.BASE_URL}/substitutes/mine`);
      setSub(res.data?.substitute || null);
    } catch { /* ignore */ }
  }, [isSubstitute]);

  useEffect(() => { fetchMySports(); fetchSub(); }, [fetchMySports, fetchSub]);

  const onRefresh = () => { setRefreshing(true); fetchMySports(); fetchSub(); };

  const confirmLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => logout?.() },
    ]);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to add a photo."); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!res.canceled && res.assets?.[0]) setFPhoto(res.assets[0]);
  };

  const submitSubstitute = async () => {
    if (!fName.trim()) { Alert.alert("Name required", "Enter the substitute's name."); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", fName.trim());
      fd.append("contactNumber", fContact.trim());
      if (fPhoto) fd.append("photo", { uri: fPhoto.uri, name: fPhoto.fileName || "photo.jpg", type: fPhoto.mimeType || "image/jpeg" });
      const resp = await fetch(`${API.BASE_URL}/substitutes`, { method: "POST", headers: { Authorization: bearer }, body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to submit");
      setShowForm(false); setFName(""); setFContact(""); setFPhoto(null);
      fetchSub();
      Alert.alert("Sent", "Your substitute request was sent to the admin.");
    } catch (e) {
      Alert.alert("Error", e.message || "Could not submit.");
    } finally { setSubmitting(false); }
  };

  const endSubstitute = async () => {
    if (!sub?._id) return;
    Alert.alert("End substitution?", "Do this when you're back.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End", style: "destructive",
        onPress: async () => {
          try { await axios.post(`${API.BASE_URL}/substitutes/${sub._id}/end`); fetchSub(); }
          catch { Alert.alert("Error", "Could not end."); }
        },
      },
    ]);
  };

  const initial = (user?.name || "T").charAt(0).toUpperCase();

  // ── Coach's substitute status card ──
  const renderSubCard = () => {
    if (isSubstitute) {
      return (
        <View style={[styles.subBanner]}>
          <Ionicons name="people" size={16} color={GREEN} />
          <Text style={styles.subBannerText}>You're substituting for <Text style={{ fontWeight: "800" }}>{user?.coachName || "a coach"}</Text></Text>
        </View>
      );
    }
    // No substitute yet → allow the one (and only) request.
    if (!sub) {
      return (
        <View style={styles.subCard}>
          <Text style={styles.subCardTitle}>Going to be absent?</Text>
          <Text style={styles.subCardDesc}>You can request one substitute to cover your sessions. (Only one is allowed.)</Text>
          <TouchableOpacity onPress={() => setShowForm(true)} style={styles.requestBtn}>
            <Ionicons name="person-add-outline" size={15} color={colors.white} />
            <Text style={styles.requestBtnText}>Request a substitute</Text>
          </TouchableOpacity>
        </View>
      );
    }
    const status = sub.status;
    if (status === "pending") {
      return (
        <View style={styles.subCard}>
          <Text style={styles.subCardTitle}>Substitute request pending</Text>
          <Text style={styles.subCardDesc}>{sub.name} — waiting for admin approval.</Text>
        </View>
      );
    }
    if (status === "accepted" && sub.active) {
      return (
        <View style={styles.subCard}>
          <Text style={[styles.subCardTitle, { color: GREEN }]}>Substitute active</Text>
          <Text style={styles.subCardDesc}>{sub.name} is covering for you.</Text>
          <TouchableOpacity onPress={endSubstitute} style={styles.endBtn}>
            <Text style={styles.endBtnText}>End substitution (I'm back)</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (status === "rejected") {
      return (
        <View style={styles.subCard}>
          <Text style={styles.subCardTitle}>Substitute rejected</Text>
          <Text style={[styles.subCardDesc, { color: colors.error }]}>
            {sub.rejectionReason || "Your substitute request was rejected by the admin."}
          </Text>
          <Text style={[styles.subCardDesc, { marginTop: 4 }]}>You've used your one substitute request — contact your admin if you need help.</Text>
        </View>
      );
    }
    // accepted but ended (coach returned)
    return (
      <View style={styles.subCard}>
        <Text style={styles.subCardTitle}>Substitution ended</Text>
        <Text style={styles.subCardDesc}>{sub.name} covered for you. Only one substitute is allowed per coach.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greeting}>Hi, {user?.name || "Trainer"}</Text>
            <View style={styles.roleRow}><View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{roleLabel}</Text></View></View>
          </View>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>

        {renderSubCard()}

        {/* My Sports */}
        <Text style={styles.sectionTitle}>My Sports</Text>
        <Text style={styles.sectionSub}>Sports you've been assigned to train.</Text>

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>
        ) : sports.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="basketball-outline" size={34} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No sports assigned yet</Text>
            <Text style={styles.emptyDesc}>Your club admin hasn't assigned a sport yet. Pull to refresh once they do.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {sports.map((s) => (
              <View key={s._id} style={styles.sportCard}>
                <View style={styles.sportIcon}><Ionicons name="trophy-outline" size={18} color={GREEN} /></View>
                <Text style={styles.sportName}>{s.name}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Request substitute modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Request a substitute</Text>
            <Text style={styles.modalSub}>The admin will review and approve.</Text>

            <TouchableOpacity onPress={pickPhoto} style={styles.photoPick}>
              {fPhoto ? <Image source={{ uri: fPhoto.uri }} style={styles.photoPreview} /> : (
                <View style={styles.photoPlaceholder}><Ionicons name="camera-outline" size={22} color={colors.textSub} /><Text style={styles.photoHint}>Add photo</Text></View>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput value={fName} onChangeText={setFName} placeholder="Substitute's full name" placeholderTextColor={colors.textSub} style={styles.input} />
            <Text style={styles.fieldLabel}>Contact number</Text>
            <TextInput value={fContact} onChangeText={setFContact} placeholder="Phone number" placeholderTextColor={colors.textSub} keyboardType="phone-pad" style={styles.input} />

            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowForm(false)} style={[styles.modalBtn, styles.cancelBtn]}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={submitSubstitute} disabled={submitting} style={[styles.modalBtn, styles.submitBtn]}>
                {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>Send request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  avatarText: { color: colors.white, fontSize: 20, fontFamily: "Montserrat_600SemiBold", fontWeight: "800" },
  greeting: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  roleRow: { flexDirection: "row", marginTop: 4 },
  roleBadge: { backgroundColor: "rgba(21,167,101,0.12)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: GREEN },
  logoutBtn: { padding: 4 },

  subBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(21,167,101,0.10)", borderRadius: 12, padding: 12, marginBottom: 18 },
  subBannerText: { flex: 1, fontSize: 13, fontFamily: "Montserrat_400Regular", color: colors.text },
  subCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
  subCardTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  subCardDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 3 },
  requestBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, height: 42, borderRadius: 10, backgroundColor: GREEN },
  requestBtnText: { color: colors.white, fontSize: 13, fontFamily: "Montserrat_600SemiBold", fontWeight: "800" },
  endBtn: { marginTop: 12, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.error, justifyContent: "center", alignItems: "center" },
  endBtnText: { color: colors.error, fontSize: 13, fontFamily: "Montserrat_600SemiBold", fontWeight: "700" },

  sectionTitle: { fontSize: 16, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  sectionSub: { fontSize: 13, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },
  loadingBox: { paddingVertical: 32, alignItems: "center" },
  emptyBox: { marginTop: 16, padding: 24, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, marginTop: 10 },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, textAlign: "center", marginTop: 4, lineHeight: 18 },
  sportCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  sportIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(21,167,101,0.10)", justifyContent: "center", alignItems: "center" },
  sportName: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 17, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2, marginBottom: 14 },
  photoPick: { alignSelf: "center", marginBottom: 14 },
  photoPreview: { width: 84, height: 84, borderRadius: 42 },
  photoPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
  photoHint: { fontSize: 10, color: colors.textSub, marginTop: 2, fontFamily: "Montserrat_400Regular" },
  fieldLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.textSub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, marginTop: 6 },
  input: { height: 44, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, fontSize: 14, fontFamily: "Montserrat_400Regular", color: colors.text },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, height: 46, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  cancelBtn: { borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.text, fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700" },
  submitBtn: { backgroundColor: GREEN },
  submitBtnText: { color: colors.white, fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "800" },
});
