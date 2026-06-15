import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import TRAINER from "../../api/trainerConsole";

const GREEN = "#15A765";
const SPORTS = ["Cricket", "Football", "Badminton", "Tennis", "Table Tennis", "Swimming", "Basketball", "Volleyball"];
const TYPES = [
  { id: "personal", label: "Personal" },
  { id: "group", label: "Group" },
  { id: "academy", label: "Academy" },
];

const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (d) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
};

const TrainerCreateSession = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [sportOpen, setSportOpen] = useState(false);
  const [type, setType] = useState("personal");
  const [date, setDate] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [venue, setVenue] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [picker, setPicker] = useState(null); // 'date' | 'start' | 'end'
  const [submitting, setSubmitting] = useState(false);

  const onPick = (event, value) => {
    const which = picker;
    setPicker(null);
    if (event.type !== "set" || !value) return;
    if (which === "date") setDate(value);
    else if (which === "start") setStart(value);
    else if (which === "end") setEnd(value);
  };

  const submit = async () => {
    if (submitting) return;
    if (!name.trim()) return Alert.alert("Missing", "Session name is required.");
    if (!sport) return Alert.alert("Missing", "Please select a sport.");
    if (!date) return Alert.alert("Missing", "Please select a date.");
    const userIdOk = userId;
    if (!userIdOk) return Alert.alert("Not signed in", "Please sign in again.");

    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const payload = {
      userId: userIdOk,
      title: name.trim(),
      sport,
      type,
      date: `${yyyy}-${mm}-${dd}`,
      startTime: start ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : "",
      endTime: end ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : "",
      venue,
      maxPlayers: type === "personal" ? "" : maxPlayers,
      price,
      notes,
    };
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(TRAINER.CREATE_SESSION, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        Alert.alert("Session created", "", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert("Could not create", res.data?.message || "Please try again.");
      }
    } catch (err) {
      Alert.alert("Could not create", err?.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const Label = ({ children, required }) => (
    <Text style={styles.label}>
      {children}
      {required ? <Text style={{ color: "#E53935" }}> *</Text> : null}
    </Text>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Session</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Label required>Session Name</Label>
        <TextInput style={styles.input} placeholder="e.g. Saturday Morning Drills" placeholderTextColor="#9A9A9A" value={name} onChangeText={setName} />

        <Label required>Sport</Label>
        <TouchableOpacity style={[styles.input, styles.rowBetween]} activeOpacity={0.8} onPress={() => setSportOpen(true)}>
          <Text style={{ color: sport ? "#1F1F1F" : "#9A9A9A", fontFamily: "Poppins_400Regular" }}>
            {sport || "Select a sport"}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#666" />
        </TouchableOpacity>

        <Label>Session Type</Label>
        <View style={styles.segment}>
          {TYPES.map((t) => {
            const active = type === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.segItem, active && styles.segItemActive]} onPress={() => setType(t.id)} activeOpacity={0.85}>
                <Text style={[styles.segText, active && styles.segTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Label required>Date</Label>
        <TouchableOpacity style={[styles.input, styles.rowBetween]} activeOpacity={0.8} onPress={() => setPicker("date")}>
          <Text style={{ color: date ? "#1F1F1F" : "#9A9A9A", fontFamily: "Poppins_400Regular" }}>
            {date ? date.toLocaleDateString() : "mm/dd/yyyy"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color="#666" />
        </TouchableOpacity>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Label>Start Time</Label>
            <TouchableOpacity style={[styles.input, styles.rowBetween]} activeOpacity={0.8} onPress={() => setPicker("start")}>
              <Text style={{ color: start ? "#1F1F1F" : "#9A9A9A", fontFamily: "Poppins_400Regular" }}>{start ? fmtTime(start) : "--:-- --"}</Text>
              <Ionicons name="time-outline" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Label>End Time</Label>
            <TouchableOpacity style={[styles.input, styles.rowBetween]} activeOpacity={0.8} onPress={() => setPicker("end")}>
              <Text style={{ color: end ? "#1F1F1F" : "#9A9A9A", fontFamily: "Poppins_400Regular" }}>{end ? fmtTime(end) : "--:-- --"}</Text>
              <Ionicons name="time-outline" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        <Label>Venue</Label>
        <TextInput style={styles.input} placeholder="Enter venue or address" placeholderTextColor="#9A9A9A" value={venue} onChangeText={setVenue} />

        <Label>
          Max Players <Text style={styles.muted}>(N/A for Personal)</Text>
        </Label>
        <TextInput
          style={[styles.input, type === "personal" && styles.inputDisabled]}
          placeholder="e.g. 20"
          placeholderTextColor="#9A9A9A"
          keyboardType="numeric"
          editable={type !== "personal"}
          value={type === "personal" ? "" : maxPlayers}
          onChangeText={setMaxPlayers}
        />

        <Label>Price per Session (₹)</Label>
        <TextInput style={styles.input} placeholder="₹ 0" placeholderTextColor="#9A9A9A" keyboardType="numeric" value={price} onChangeText={setPrice} />

        <Label>Description / Notes</Label>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="What will players learn? Any requirements or instructions..."
          placeholderTextColor="#9A9A9A"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <TouchableOpacity style={[styles.submit, submitting && { opacity: 0.6 }]} activeOpacity={0.9} onPress={submit} disabled={submitting}>
          <Text style={styles.submitText}>{submitting ? "Creating..." : "Create Session"}</Text>
        </TouchableOpacity>
      </View>

      {picker && (
        <DateTimePicker
          value={picker === "date" ? date || new Date() : picker === "start" ? start || new Date() : end || new Date()}
          mode={picker === "date" ? "date" : "time"}
          display="default"
          minimumDate={picker === "date" ? new Date() : undefined}
          onChange={onPick}
        />
      )}

      {/* Sport picker */}
      <Modal visible={sportOpen} transparent animationType="fade" onRequestClose={() => setSportOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSportOpen(false)}>
          <Pressable style={styles.sportSheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Select a sport</Text>
            <ScrollView>
              {SPORTS.map((s) => (
                <TouchableOpacity key={s} style={styles.sportRow} onPress={() => { setSport(s); setSportOpen(false); }}>
                  <Text style={styles.sportRowText}>{s}</Text>
                  {sport === s && <Ionicons name="checkmark" size={18} color={GREEN} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_700Bold", color: "#0A0A0A", marginLeft: 4 },
  label: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#333333", marginTop: 16, marginBottom: 8 },
  muted: { fontFamily: "Poppins_400Regular", color: "#9A9A9A", fontSize: 12 },
  input: { backgroundColor: "#F7F8FA", borderRadius: 12, borderWidth: 1, borderColor: "#ECEEF1", paddingHorizontal: 14, height: 50, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#1F1F1F" },
  inputDisabled: { backgroundColor: "#EFEFEF", color: "#9A9A9A" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row2: { flexDirection: "row", gap: 12 },
  textarea: { height: 110, paddingTop: 14 },
  segment: { flexDirection: "row", backgroundColor: "#F7F8FA", borderRadius: 30, padding: 4, borderWidth: 1, borderColor: "#ECEEF1" },
  segItem: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 30 },
  segItemActive: { backgroundColor: GREEN },
  segText: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", color: "#666666" },
  segTextActive: { color: "#FFFFFF" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#EFEFEF", paddingHorizontal: 16, paddingTop: 12 },
  submit: { height: 52, borderRadius: 12, backgroundColor: GREEN, justifyContent: "center", alignItems: "center" },
  submitText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Montserrat_600SemiBold" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", paddingHorizontal: 28 },
  sportSheet: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, maxHeight: "70%" },
  sheetTitle: { fontSize: 16, fontFamily: "Montserrat_700Bold", color: "#0A0A0A", marginBottom: 8 },
  sportRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F2F2F2" },
  sportRowText: { fontSize: 15, fontFamily: "Montserrat_500Medium", color: "#1F1F1F" },
});

export default TrainerCreateSession;
