import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API from "../../api/api";
import { colors } from "../../theme";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function TrainerAttendance() {
  const [date, setDate] = useState(new Date());
  const [rows, setRows] = useState([]);               // the trainer's schedule rows
  const [sessionKey, setSessionKey] = useState(null); // `${sport}|${standard}`
  const [students, setStudents] = useState([]);       // school roster for the standard
  const [self, setSelf] = useState(null);             // "present" | "absent" | null
  const [selfReason, setSelfReason] = useState("");   // required when self === "absent"
  const [marks, setMarks] = useState({});             // { studentId: "present"|"absent" }
  const [loadingSched, setLoadingSched] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);

  const weekday = WEEKDAYS[date.getDay()];
  const dateStr = ymd(date);

  // Sessions for the selected weekday (dedup by sport+standard).
  const sessions = [];
  const seen = new Set();
  rows.filter((r) => r.day === weekday).forEach((r) => {
    const sport = (r.mySports && r.mySports[0]) || (r.sports && r.sports[0]) || "";
    const key = `${sport}|${r.standard || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    sessions.push({ key, sport, standard: r.standard || "", time: r.time || "" });
  });
  const session = sessions.find((s) => s.key === sessionKey) || null;

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API.BASE_URL}/training-schedule/mine`);
        setRows(res.data?.rows || []);
      } catch { setRows([]); }
      finally { setLoadingSched(false); }
    })();
  }, []);

  useEffect(() => {
    if (sessions.length && !sessions.find((s) => s.key === sessionKey)) setSessionKey(sessions[0].key);
    else if (!sessions.length) setSessionKey(null);
  }, [weekday, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the standard's students + existing attendance for this session/date.
  const loadSession = useCallback(async () => {
    if (!session) { setStudents([]); setSelf(null); setSelfReason(""); setMarks({}); return; }
    setLoadingSession(true);
    try {
      const [stu, att] = await Promise.all([
        axios.get(`${API.BASE_URL}/attendance/students`, { params: { standard: session.standard } }),
        axios.get(`${API.BASE_URL}/attendance`, { params: { date: dateStr, sport: session.sport, standard: session.standard } }),
      ]);
      setStudents(stu.data?.students || []);
      setSelf(att.data?.self || null);
      setSelfReason(att.data?.selfReason || "");
      setMarks(att.data?.students || {});
    } catch {
      setStudents([]); setSelf(null); setSelfReason(""); setMarks({});
    } finally {
      setLoadingSession(false);
    }
  }, [sessionKey, dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSession(); }, [loadSession]);

  const markAllPresent = () => {
    const m = {};
    students.forEach((s) => { m[s._id] = "present"; });
    setMarks(m);
  };

  const save = async () => {
    if (!session) return;
    if (self === "absent" && !selfReason.trim()) {
      Alert.alert("Reason required", "Please provide a reason for your absence.");
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API.BASE_URL}/attendance`, {
        date: dateStr,
        sport: session.sport,
        standard: session.standard,
        self,
        selfReason: self === "absent" ? selfReason.trim() : "",
        students: students.map((s) => ({ studentId: s._id, status: marks[s._id] })).filter((x) => x.status),
      });
      Alert.alert("Saved", "Attendance saved.");
    } catch { Alert.alert("Error", "Could not save attendance."); }
    finally { setSaving(false); }
  };

  const presentCount = students.filter((s) => marks[s._id] === "present").length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBar}><Text style={styles.headerTitle}>Attendance</Text></View>

      {/* Date navigator */}
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => setDate(addDays(date, -1))} style={styles.dateArrow}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.dateText}>{date.toLocaleDateString(undefined, { weekday: "long" })}</Text>
          <Text style={styles.dateSub}>{date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Text>
        </View>
        <TouchableOpacity onPress={() => setDate(addDays(date, 1))} style={styles.dateArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loadingSched ? (
          <View style={styles.loadingBox}><ActivityIndicator color={"#15A765"} /></View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={32} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No session on {weekday}</Text>
            <Text style={styles.emptyDesc}>Use the arrows to pick a day you train.</Text>
          </View>
        ) : (
          <>
            {/* Session chips */}
            <View style={styles.chipRow}>
              {sessions.map((s) => {
                const active = s.key === sessionKey;
                return (
                  <TouchableOpacity key={s.key} onPress={() => setSessionKey(s.key)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {s.sport}{s.standard ? ` · Std ${s.standard}` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!!session?.time && <Text style={styles.timeText}>{session.time}</Text>}

            {loadingSession ? (
              <View style={styles.loadingBox}><ActivityIndicator color={"#15A765"} /></View>
            ) : (
              <>
                {/* My attendance */}
                <Text style={styles.sectionTitle}>My attendance</Text>
                <View style={styles.selfCard}>
                  <Text style={styles.selfLabel}>Mark yourself</Text>
                  <View style={styles.toggleRow}>
                    <Toggle label="Present" active={self === "present"} tone="present" onPress={() => setSelf("present")} />
                    <Toggle label="Absent" active={self === "absent"} tone="absent" onPress={() => setSelf("absent")} />
                  </View>
                </View>

                {self === "absent" && (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason for your absence *</Text>
                    <TextInput
                      value={selfReason}
                      onChangeText={setSelfReason}
                      placeholder="e.g. on leave, unwell, family emergency…"
                      placeholderTextColor={colors.textSub}
                      style={styles.reasonInput}
                      multiline
                    />
                  </View>
                )}

                {/* Students */}
                <View style={styles.studentsHeader}>
                  <Text style={styles.sectionTitle}>Students {session?.standard ? `· Std ${session.standard}` : ""}</Text>
                  {students.length > 0 && <Text style={styles.countText}>{presentCount}/{students.length} present</Text>}
                </View>

                {students.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="people-outline" size={28} color={colors.borderDark} />
                    <Text style={styles.emptyTitle}>No students for Std {session?.standard || "—"}</Text>
                    <Text style={styles.emptyDesc}>Ask your school admin to upload this standard's student list.</Text>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity onPress={markAllPresent} style={styles.allPresentBtn}>
                      <Ionicons name="checkmark-done" size={15} color={"#15A765"} />
                      <Text style={styles.allPresentText}>Mark all present</Text>
                    </TouchableOpacity>
                    {students.map((s, i) => (
                      <View key={s._id} style={styles.studentRow}>
                        <Text style={styles.studentIdx}>{i + 1}</Text>
                        <Text style={styles.studentName} numberOfLines={1}>{s.name}{s.rollNo ? `  #${s.rollNo}` : ""}</Text>
                        <View style={styles.toggleRow}>
                          <Toggle label="P" active={marks[s._id] === "present"} tone="present" small onPress={() => setMarks((m) => ({ ...m, [s._id]: "present" }))} />
                          <Toggle label="A" active={marks[s._id] === "absent"} tone="absent" small onPress={() => setMarks((m) => ({ ...m, [s._id]: "absent" }))} />
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity onPress={save} disabled={saving} style={styles.saveBtn}>
                      {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save attendance</Text>}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Toggle({ label, active, tone, small, onPress }) {
  const activeBg = tone === "present" ? "#15A765" : colors.error;
  return (
    <TouchableOpacity onPress={onPress}
      style={[small ? styles.toggleSmall : styles.toggle, active && { backgroundColor: activeBg, borderColor: activeBg }]}>
      <Text style={[styles.toggleLabel, active && { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  headerBar: { paddingHorizontal: 16, paddingTop: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  dateArrow: { padding: 8, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  dateText: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  dateSub: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 1 },
  loadingBox: { paddingVertical: 30, alignItems: "center" },
  emptyBox: { marginTop: 16, padding: 22, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, marginTop: 10, textAlign: "center" },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 4, textAlign: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: "#15A765", borderColor: "#15A765" },
  chipText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  chipTextActive: { color: colors.white },
  timeText: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text, marginTop: 18 },
  selfCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  selfLabel: { fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text },
  reasonBox: { marginTop: 10 },
  reasonLabel: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.error, marginBottom: 6 },
  reasonInput: { minHeight: 64, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, fontFamily: "Montserrat_400Regular", color: colors.text, textAlignVertical: "top" },
  studentsHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  countText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#15A765", marginBottom: 2 },
  allPresentBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginTop: 12, marginBottom: 2 },
  allPresentText: { fontSize: 12, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: "#15A765" },
  studentRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, marginTop: 8 },
  studentIdx: { fontSize: 11, fontFamily: "Montserrat_400Regular", color: colors.textSub, width: 22 },
  studentName: { flex: 1, fontSize: 14, fontFamily: "Montserrat_500Medium", fontWeight: "600", color: colors.text, marginRight: 10 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggle: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  toggleSmall: { width: 36, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" },
  toggleLabel: { fontSize: 13, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, textAlign: "center" },
  saveBtn: { marginTop: 22, height: 50, borderRadius: 12, backgroundColor: "#15A765", justifyContent: "center", alignItems: "center" },
  saveText: { fontSize: 15, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.white },
});
