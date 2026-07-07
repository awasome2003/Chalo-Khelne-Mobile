import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import axios from "axios";
import API from "../../api/api";
import { colors } from "../../theme";

const GREEN = "#15A765";
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (s) => {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y) return s || "—";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

/**
 * Coach "Apply for Leave" screen (school flow). The coach picks a date range +
 * reason → POST /api/leave-requests; the school admin approves/rejects it in the
 * Leave Requests tab. Below, the coach sees their own requests + statuses.
 */
export default function TrainerLeave({ navigation }) {
  const today = ymd(new Date());
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reason, setReason] = useState("");
  const [picking, setPicking] = useState(null); // "from" | "to" | null
  const [submitting, setSubmitting] = useState(false);

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/leave-requests`);
      setLeaves(res.data?.leaves || []);
    } catch { setLeaves([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const submit = async () => {
    if (!fromDate || !toDate) { Alert.alert("Dates required", "Pick a from and to date."); return; }
    if (toDate < fromDate) { Alert.alert("Invalid range", "The end date can't be before the start date."); return; }
    if (!reason.trim()) { Alert.alert("Reason required", "Please add a short reason for your leave."); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API.BASE_URL}/leave-requests`, {
        fromDate, toDate, reason: reason.trim(),
      });
      setReason("");
      Alert.alert("Sent", "Your leave request was sent to the admin.");
      fetchLeaves();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Could not submit your request.");
    } finally { setSubmitting(false); }
  };

  const badge = (status) => {
    const map = {
      pending: { bg: "rgba(245,158,11,0.14)", fg: "#B45309" },
      approved: { bg: "rgba(21,167,101,0.14)", fg: GREEN },
      rejected: { bg: "rgba(220,38,38,0.12)", fg: colors.error },
    };
    return map[status] || map.pending;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Leave</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Apply form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New leave request</Text>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>From</Text>
              <TouchableOpacity onPress={() => setPicking("from")} style={styles.dateBtn}>
                <Ionicons name="calendar-outline" size={16} color={GREEN} />
                <Text style={styles.dateBtnText}>{fmt(fromDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>To</Text>
              <TouchableOpacity onPress={() => setPicking("to")} style={styles.dateBtn}>
                <Ionicons name="calendar-outline" size={16} color={GREEN} />
                <Text style={styles.dateBtnText}>{fmt(toDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Reason *</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. medical, personal, family function…"
            placeholderTextColor={colors.textSub}
            style={styles.reasonInput}
            multiline
          />

          <TouchableOpacity onPress={submit} disabled={submitting} style={styles.submitBtn}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Send request</Text>}
          </TouchableOpacity>
        </View>

        {/* My requests */}
        <Text style={styles.sectionTitle}>My leave requests</Text>
        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>
        ) : leaves.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-text-outline" size={30} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No leave requests yet</Text>
          </View>
        ) : (
          leaves.map((l) => {
            const b = badge(l.status);
            return (
              <View key={l._id} style={styles.leaveRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaveDates}>{fmt(l.fromDate)} → {fmt(l.toDate)}</Text>
                  {l.reason ? <Text style={styles.leaveReason}>{l.reason}</Text> : null}
                  {l.status === "rejected" && l.adminNote ? (
                    <Text style={styles.adminNote}>Admin: {l.adminNote}</Text>
                  ) : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: b.bg }]}>
                  <Text style={[styles.statusText, { color: b.fg }]}>{l.status}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Date picker modal */}
      <Modal visible={!!picking} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPicking(null)} style={styles.modalBackdrop}>
          <TouchableOpacity activeOpacity={1} style={styles.calendarSheet}>
            <Text style={styles.modalTitle}>Pick {picking === "from" ? "start" : "end"} date</Text>
            <Calendar
              current={picking === "from" ? fromDate : toDate}
              minDate={picking === "to" ? fromDate : undefined}
              onDayPress={(d) => {
                if (picking === "from") {
                  setFromDate(d.dateString);
                  if (toDate < d.dateString) setToDate(d.dateString);
                } else {
                  setToDate(d.dateString);
                }
                setPicking(null);
              }}
              markedDates={{ [picking === "from" ? fromDate : toDate]: { selected: true, selectedColor: GREEN } }}
              theme={{ selectedDayBackgroundColor: GREEN, todayTextColor: GREEN, arrowColor: GREEN }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginBottom: 12 },
  dateRow: { flexDirection: "row", gap: 12, marginBottom: 6 },
  fieldLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.textSub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6, marginTop: 8 },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 12 },
  dateBtnText: { fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  reasonInput: { minHeight: 70, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, fontFamily: "Montserrat_400Regular", color: colors.text, textAlignVertical: "top" },
  submitBtn: { marginTop: 16, height: 48, borderRadius: 12, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  submitText: { color: colors.white, fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800" },
  sectionTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginTop: 22, marginBottom: 10 },
  loadingBox: { paddingVertical: 26, alignItems: "center" },
  emptyBox: { padding: 24, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "700", color: colors.textSub, marginTop: 10 },
  leaveRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  leaveDates: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  leaveReason: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 3 },
  adminNote: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.error, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", textTransform: "capitalize" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  calendarSheet: { backgroundColor: colors.white, borderRadius: 16, padding: 14 },
  modalTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginBottom: 8, marginLeft: 4 },
});
