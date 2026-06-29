import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getAvailableRoles, mergeRoles } from "../utils/roles";

const GREEN = "#15A765";
const TEXT = "#1F2937";
const SUB = "#6B7280";
const BORDER = "#E5E7EB";

const titleCase = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : "";

/**
 * RoleSwitcher — switches the active role WITHIN the same player account
 * (Player / Trainer / Referee / etc. that the user created in "My Services").
 * This is the player-side internal role switching — NOT the player↔coach
 * account switch (that lives in AccountSwitcher).
 *
 * Usage:
 *   <RoleSwitcher
 *     visible={open}
 *     onClose={() => setOpen(false)}
 *     onManageRoles={() => navigation.navigate("RoleHubHome")}
 *   />
 */
export default function RoleSwitcher({ visible, onClose, onManageRoles }) {
  const { user, updateUser } = useAuth();

  // Roles this account can act as (always includes the base Player role).
  const roles = getAvailableRoles(user);
  const activeRole = user?.role;

  const pick = async (r) => {
    if (r !== activeRole) {
      try {
        // Keep every role (incl. the one being left) so none disappear.
        await updateUser({ ...user, role: r, roles: mergeRoles(user, r) });
      } catch (_) {}
    }
    onClose && onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Switch role</Text>
          <Text style={styles.subtitle}>Choose which role you want to use right now.</Text>

          <ScrollView style={{ maxHeight: 340 }}>
            {roles.map((r) => {
              const active = r === activeRole;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => pick(r)}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatar}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{titleCase(r)}</Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={20} color={SUB} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {onManageRoles ? (
            <TouchableOpacity
              style={styles.manageRow}
              onPress={() => {
                onClose && onClose();
                onManageRoles();
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.avatar, styles.manageAvatar]}>
                <Ionicons name="add" size={20} color={GREEN} />
              </View>
              <Text style={styles.manageText}>Manage / add roles</Text>
            </TouchableOpacity>
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
  manageAvatar: { backgroundColor: "rgba(21,167,101,0.12)" },
  name: { fontSize: 15, fontWeight: "700", color: TEXT, fontFamily: "Montserrat_600SemiBold" },
  manageRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 10, marginTop: 2 },
  manageText: { fontSize: 15, fontWeight: "700", color: GREEN, fontFamily: "Montserrat_600SemiBold" },
});
