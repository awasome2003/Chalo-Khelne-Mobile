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
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const REQUEST_TYPES = [
  { key: "postpone", label: "Postpone", icon: "time-outline" },
  { key: "cancel", label: "Cancel", icon: "close-circle-outline" },
  { key: "reschedule", label: "Reschedule", icon: "swap-horizontal-outline" },
];
const REASONS = [
  { key: "coach_leave", label: "On leave" },
  { key: "ground_unavailable", label: "Ground unavailable" },
  { key: "weather", label: "Weather" },
  { key: "tournament", label: "Tournament" },
  { key: "exam", label: "Exams" },
];
const fmt = (s) => {
  const [y, m, d] = String(s || "").split("-").map(Number);
  if (!y) return s || "—";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
};
const slotLabel = (r) => {
  const sport = r.sport || (r.sports || []).join(", ") || "Session";
  const std = r.standard ? ` · Std ${r.standard}${r.section ? `-${r.section}` : ""}` : "";
  return `${sport}${std}`;
};

/**
 * Coach "Request a session change" screen (school flow). The coach picks one of
 * their scheduled slots + the date it affects, a change type (postpone / cancel
 * / reschedule) and a reason → POST /api/session-requests. The admin actions it
 * in the Session Adjustment tab (applies a SessionOverride / reassign).
 */
export default function TrainerSessionChange({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);

  const [slotId, setSlotId] = useState(null);
  const [date, setDate] = useState("");
  const [picking, setPicking] = useState(false);
  const [requestType, setRequestType] = useState("postpone");
  const [reason, setReason] = useState("");
  const [newDay, setNewDay] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState([]);
  const [loadingReq, setLoadingReq] = useState(true);

  const fetchRows = useCallback(async () => {
    setLoadingRows(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/training-schedule/mine`);
      setRows(res.data?.rows || []);
    } catch { setRows([]); }
    finally { setLoadingRows(false); }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingReq(true);
    try {
      const res = await axios.get(`${API.BASE_URL}/session-requests`);
      setRequests(res.data?.requests || []);
    } catch { setRequests([]); }
    finally { setLoadingReq(false); }
  }, []);

  useEffect(() => { fetchRows(); fetchRequests(); }, [fetchRows, fetchRequests]);

  const slot = rows.find((r) => r._id === slotId) || null;

  const submit = async () => {
    if (!slotId) { Alert.alert("Pick a session", "Select which session you want to change."); return; }
    if (!date) { Alert.alert("Pick a date", "Select the date this change applies to."); return; }
    if (requestType === "reschedule" && !newDay && !newStart && !newEnd) {
      Alert.alert("New timing needed", "For a reschedule, suggest a new day and/or time.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API.BASE_URL}/session-requests`, {
        scheduleId: slotId,
        date,
        requestType,
        reason,
        proposedNewDay: requestType === "reschedule" ? newDay : "",
        proposedNewStartTime: requestType === "reschedule" ? newStart.trim() : "",
        proposedNewEndTime: requestType === "reschedule" ? newEnd.trim() : "",
      });
      setReason(""); setNewDay(""); setNewStart(""); setNewEnd(""); setDate(""); setSlotId(null);
      Alert.alert("Sent", "Your request was sent to the admin.");
      fetchRequests();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.error || "Could not submit your request.");
    } finally { setSubmitting(false); }
  };

  const badge = (status) => ({
    pending: { bg: "rgba(245,158,11,0.14)", fg: "#B45309" },
    approved: { bg: "rgba(21,167,101,0.14)", fg: GREEN },
    rejected: { bg: "rgba(220,38,38,0.12)", fg: colors.error },
  }[status] || { bg: "rgba(245,158,11,0.14)", fg: "#B45309" });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Session Change</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.card}>
          {/* Session picker */}
          <Text style={styles.fieldLabel}>Session</Text>
          {loadingRows ? (
            <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>
          ) : rows.length === 0 ? (
            <Text style={styles.hintText}>You have no scheduled sessions yet.</Text>
          ) : (
            <View style={styles.slotWrap}>
              {rows.map((r) => {
                const active = r._id === slotId;
                return (
                  <TouchableOpacity key={r._id} onPress={() => setSlotId(r._id)}
                    style={[styles.slotChip, active && styles.slotChipActive]}>
                    <Text style={[styles.slotChipText, active && styles.slotChipTextActive]} numberOfLines={1}>
                      {r.day?.slice(0, 3)} · {slotLabel(r)}{r.time ? ` · ${r.time}` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Date */}
          <Text style={styles.fieldLabel}>Which date?</Text>
          <TouchableOpacity onPress={() => setPicking(true)} style={styles.dateBtn}>
            <Ionicons name="calendar-outline" size={16} color={GREEN} />
            <Text style={[styles.dateBtnText, !date && { color: colors.textSub }]}>{date ? fmt(date) : "Select date"}</Text>
          </TouchableOpacity>
          {slot?.day && date ? (
            <Text style={styles.hintText}>This session normally runs on {slot.day}.</Text>
          ) : null}

          {/* Request type */}
          <Text style={styles.fieldLabel}>What change?</Text>
          <View style={styles.typeRow}>
            {REQUEST_TYPES.map((t) => {
              const active = requestType === t.key;
              return (
                <TouchableOpacity key={t.key} onPress={() => setRequestType(t.key)}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}>
                  <Ionicons name={t.icon} size={15} color={active ? colors.white : colors.text} />
                  <Text style={[styles.typeText, active && { color: colors.white }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reason */}
          <Text style={styles.fieldLabel}>Reason</Text>
          <View style={styles.reasonWrap}>
            {REASONS.map((r) => {
              const active = reason === r.key;
              return (
                <TouchableOpacity key={r.key} onPress={() => setReason(active ? "" : r.key)}
                  style={[styles.reasonChip, active && styles.reasonChipActive]}>
                  <Text style={[styles.reasonChipText, active && { color: GREEN }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Reschedule details */}
          {requestType === "reschedule" && (
            <View style={styles.reschedBox}>
              <Text style={styles.fieldLabel}>Suggest a new day</Text>
              <View style={styles.reasonWrap}>
                {WEEKDAYS.map((d) => {
                  const active = newDay === d;
                  return (
                    <TouchableOpacity key={d} onPress={() => setNewDay(active ? "" : d)}
                      style={[styles.reasonChip, active && styles.reasonChipActive]}>
                      <Text style={[styles.reasonChipText, active && { color: GREEN }]}>{d.slice(0, 3)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>New start</Text>
                  <TextInput value={newStart} onChangeText={setNewStart} placeholder="e.g. 16:00" placeholderTextColor={colors.textSub} style={styles.timeInput} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>New end</Text>
                  <TextInput value={newEnd} onChangeText={setNewEnd} placeholder="e.g. 17:00" placeholderTextColor={colors.textSub} style={styles.timeInput} />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={submit} disabled={submitting} style={styles.submitBtn}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Send request</Text>}
          </TouchableOpacity>
        </View>

        {/* My requests */}
        <Text style={styles.sectionTitle}>My requests</Text>
        {loadingReq ? (
          <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="swap-horizontal-outline" size={30} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
          </View>
        ) : (
          requests.map((r) => {
            const b = badge(r.status);
            return (
              <View key={r._id} style={styles.reqRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reqTitle}>
                    <Text style={{ textTransform: "capitalize" }}>{r.requestType}</Text> · {r.sport || "Session"}{r.standard ? ` · Std ${r.standard}` : ""}
                  </Text>
                  <Text style={styles.reqMeta}>{fmt(r.date)}{r.reason ? ` · ${REASONS.find((x) => x.key === r.reason)?.label || r.reason}` : ""}</Text>
                  {r.status === "rejected" && r.adminNote ? <Text style={styles.adminNote}>Admin: {r.adminNote}</Text> : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: b.bg }]}>
                  <Text style={[styles.statusText, { color: b.fg }]}>{r.status}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Date picker modal */}
      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPicking(false)} style={styles.modalBackdrop}>
          <TouchableOpacity activeOpacity={1} style={styles.calendarSheet}>
            <Text style={styles.modalTitle}>Pick the date</Text>
            <Calendar
              current={date || undefined}
              onDayPress={(d) => { setDate(d.dateString); setPicking(false); }}
              markedDates={date ? { [date]: { selected: true, selectedColor: GREEN } } : {}}
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
  fieldLabel: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.textSub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8, marginTop: 12 },
  loadingBox: { paddingVertical: 20, alignItems: "center" },
  hintText: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 6 },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { maxWidth: "100%", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  slotChipActive: { backgroundColor: "rgba(21,167,101,0.12)", borderColor: GREEN },
  slotChipText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  slotChipTextActive: { color: GREEN, fontWeight: "800" },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 12 },
  dateBtnText: { fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  typeBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  typeText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  reasonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  reasonChipActive: { backgroundColor: "rgba(21,167,101,0.12)", borderColor: GREEN },
  reasonChipText: { fontSize: 12, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  reschedBox: { marginTop: 4 },
  timeRow: { flexDirection: "row", gap: 12 },
  timeInput: { height: 44, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, fontSize: 14, fontFamily: "Montserrat_400Regular", color: colors.text },
  submitBtn: { marginTop: 18, height: 48, borderRadius: 12, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  submitText: { color: colors.white, fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800" },
  sectionTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginTop: 22, marginBottom: 10 },
  emptyBox: { padding: 24, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 13, fontFamily: "Montserrat_500Medium", fontWeight: "700", color: colors.textSub, marginTop: 10 },
  reqRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  reqTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  reqMeta: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 3 },
  adminNote: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.error, marginTop: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", textTransform: "capitalize" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  calendarSheet: { backgroundColor: colors.white, borderRadius: 16, padding: 14 },
  modalTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginBottom: 8, marginLeft: 4 },
});
