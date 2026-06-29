import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import tokenStore from "../services/tokenStore";

const GREEN = "#15A765";
const TEXT = "#1F2937";
const SUB = "#6B7280";
const BORDER = "#E5E7EB";

// Human label for the kind of account (a coach is a Manager with a staffRole).
const roleLabel = (u) => {
  if (!u) return "Account";
  if (u.role === "Manager" && (u.staffRole === "trainer" || u.staffRole === "coach")) return "Coach";
  if (u.role === "Substitute") return "Substitute";
  if (u.role === "Manager") return "Manager";
  return u.role || "Account";
};

const initials = (u) => {
  const n = (u?.name || u?.email || "?").trim();
  return n.slice(0, 1).toUpperCase();
};

/**
 * AccountSwitcher — remembers several signed-in accounts (e.g. a player account
 * and a school-coach account) and flips between them WITHOUT logging out.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   <AccountSwitcher visible={open} onClose={() => setOpen(false)} />
 */
export default function AccountSwitcher({ visible, onClose }) {
  const { sessions, activeSessionId, switchAccount, addAccount, refreshSessions, loading } = useAuth();

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  // Lift the bottom sheet above the keyboard. KeyboardAvoidingView is unreliable
  // inside a Modal on Android, so we track the keyboard height ourselves and push
  // the sheet up by exactly that much.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e) => setKbHeight(e?.endCoordinates?.height || 0);
    const onHide = () => setKbHeight(0);
    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => { s.remove(); h.remove(); };
  }, []);

  const close = () => {
    setAdding(false);
    setEmail("");
    setPassword("");
    onClose && onClose();
  };

  const handleSwitch = async (id) => {
    if (String(id) === String(activeSessionId)) return close();
    try {
      setBusy(true);
      await switchAccount(id);
      close();
    } catch (e) {
      Alert.alert("Could not switch", e.message || "Please sign in to that account again.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = (id, name) => {
    if (String(id) === String(activeSessionId)) {
      Alert.alert("In use", "You can't remove the account you're currently using. Switch first.");
      return;
    }
    Alert.alert("Remove account", `Remove ${name || "this account"} from this device?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await tokenStore.removeSession(id);
            await refreshSessions();
          } catch (_) {}
        },
      },
    ]);
  };

  const handleAdd = async () => {
    const e = email.trim().toLowerCase();
    const p = password.trim();
    if (!e || !p) {
      Alert.alert("Missing details", "Enter the email and password for the account you want to add.");
      return;
    }
    try {
      setBusy(true);
      await addAccount({ email: e, password: p });
      close();
    } catch (err) {
      Alert.alert("Couldn't add account", err.message || "Please check the credentials and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropFill} activeOpacity={1} onPress={close} />
        <View style={[styles.sheet, { marginBottom: kbHeight }]}>
          <View style={styles.handle} />
            <Text style={styles.title}>Switch account</Text>
            <Text style={styles.subtitle}>Switch between your player and school-coach accounts — no logout needed.</Text>

            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {sessions.map((s) => {
                const active = String(s.id) === String(activeSessionId);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => handleSwitch(s.id)}
                    onLongPress={() => handleRemove(s.id, s.user?.name)}
                    activeOpacity={0.8}
                    disabled={busy}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(s.user)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {s.user?.name || s.user?.email || "Account"}
                      </Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{roleLabel(s.user)}</Text>
                      </View>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                    ) : (
                      <Ionicons name="swap-horizontal" size={20} color={SUB} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {adding ? (
              <View style={styles.addBox}>
                <Text style={styles.addLabel}>Add another account</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={SUB}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={SUB}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <View style={styles.addActions}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setAdding(false)} disabled={busy}>
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd} disabled={busy}>
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryText}>Add & switch</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.addRow} onPress={() => setAdding(true)} disabled={busy}>
                <View style={[styles.avatar, styles.addAvatar]}>
                  <Ionicons name="add" size={22} color={GREEN} />
                </View>
                <Text style={styles.addRowText}>Add another account</Text>
              </TouchableOpacity>
            )}

            {(busy || loading) && !adding ? (
              <ActivityIndicator style={{ marginTop: 12 }} color={GREEN} />
            ) : null}
          </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  backdropFill: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800", fontFamily: "Montserrat_600SemiBold", color: TEXT },
  subtitle: { fontSize: 13, color: SUB, marginTop: 2, marginBottom: 12, fontFamily: "Montserrat_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  rowActive: { borderColor: GREEN, backgroundColor: "rgba(21,167,101,0.06)" },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN,
    alignItems: "center", justifyContent: "center",
  },
  addAvatar: { backgroundColor: "rgba(21,167,101,0.12)" },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "800", fontFamily: "Montserrat_600SemiBold" },
  name: { fontSize: 15, fontWeight: "700", color: TEXT, fontFamily: "Montserrat_600SemiBold" },
  badge: {
    alignSelf: "flex-start", marginTop: 3, paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, backgroundColor: "rgba(21,167,101,0.12)",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: GREEN, fontFamily: "Montserrat_600SemiBold" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 10, marginTop: 2 },
  addRowText: { fontSize: 15, fontWeight: "700", color: GREEN, fontFamily: "Montserrat_600SemiBold" },
  addBox: { marginTop: 6, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12 },
  addLabel: { fontSize: 13, fontWeight: "700", color: TEXT, marginBottom: 8, fontFamily: "Montserrat_600SemiBold" },
  input: {
    borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: TEXT, marginBottom: 10, fontFamily: "Montserrat_400Regular",
  },
  addActions: { flexDirection: "row", gap: 10, marginTop: 2 },
  secondaryBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: "center" },
  secondaryText: { fontSize: 14, fontWeight: "700", color: SUB, fontFamily: "Montserrat_600SemiBold" },
  primaryBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: GREEN, alignItems: "center" },
  primaryText: { fontSize: 14, fontWeight: "800", color: "#fff", fontFamily: "Montserrat_600SemiBold" },
});
