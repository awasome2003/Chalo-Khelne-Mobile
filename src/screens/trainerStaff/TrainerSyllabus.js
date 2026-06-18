import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API from "../../api/api";
import { colors } from "../../theme";

const GREEN = "#15A765";

// Column widths for the horizontally-scrollable session table.
const COL = { week: 48, topic: 150, obj: 150, drills: 150, equip: 130 };
const TABLE_W = COL.week + COL.topic + COL.obj + COL.drills + COL.equip;

// Coach/substitute syllabus view — READ-ONLY, table layout. The admin authors
// the syllabus; the coach reads their week-by-week plan per sport · standard.
export default function TrainerSyllabus() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/syllabus/mine`);
      const list = res.data?.combos || [];
      list.sort((a, b) => (b.isToday ? 1 : 0) - (a.isToday ? 1 : 0));
      setCombos(list);
    } catch {
      setCombos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerBar}><Text style={styles.headerTitle}>Syllabus</Text></View>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={GREEN} /></View>
        ) : combos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="book-outline" size={34} color={colors.borderDark} />
            <Text style={styles.emptyTitle}>No syllabus yet</Text>
            <Text style={styles.emptyDesc}>Once your admin adds a syllabus for your sport, it'll show here.</Text>
          </View>
        ) : (
          combos.map((c) => (
            <View key={`${c.sport}|${c.standard}`} style={[styles.comboCard, c.isToday && styles.comboCardToday]}>
              {/* Section header */}
              <View style={styles.comboHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.comboTitle}>{c.sport}{c.standard ? ` · Std ${c.standard}` : ""}</Text>
                    {c.isToday ? <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>TODAY</Text></View> : null}
                  </View>
                  <Text style={styles.comboMeta}>
                    {(c.entries ? c.entries.length : 0)} session(s){c.isToday && c.time ? ` · ${c.time}` : ""}
                  </Text>
                </View>
              </View>

              {/* Table */}
              {(c.entries || []).length === 0 ? (
                <Text style={styles.noEntries}>No sessions added yet.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ width: TABLE_W }}>
                    {/* head */}
                    <View style={[styles.tr, styles.trHead]}>
                      <Text style={[styles.th, { width: COL.week }]}>Week</Text>
                      <Text style={[styles.th, { width: COL.topic }]}>Topic</Text>
                      <Text style={[styles.th, { width: COL.obj }]}>Objective</Text>
                      <Text style={[styles.th, { width: COL.drills }]}>Drills</Text>
                      <Text style={[styles.th, { width: COL.equip }]}>Equipment</Text>
                    </View>
                    {/* rows */}
                    {c.entries.map((e, i) => (
                      <View key={e._id} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                        <View style={{ width: COL.week, justifyContent: "center" }}>
                          <Text style={styles.weekTag}>W{e.weekNumber}</Text>
                        </View>
                        <Text style={[styles.td, styles.tdTopic, { width: COL.topic }]}>{e.topic || "—"}</Text>
                        <Text style={[styles.td, { width: COL.obj }]}>{e.objectives || "—"}</Text>
                        <Text style={[styles.td, { width: COL.drills }]}>{e.activities || "—"}</Text>
                        <Text style={[styles.td, { width: COL.equip }]}>{e.equipment || "—"}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background || "#FAFAFA" },
  headerBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: colors.text },
  loadingBox: { paddingVertical: 40, alignItems: "center" },
  emptyBox: { marginTop: 24, padding: 24, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  emptyTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text, marginTop: 10 },
  emptyDesc: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, textAlign: "center", marginTop: 4, lineHeight: 18 },

  comboCard: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: "hidden" },
  comboCardToday: { borderColor: "rgba(21,167,101,0.4)", borderWidth: 1.5 },
  comboHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  comboTitle: { fontSize: 14, fontFamily: "Montserrat_600SemiBold", fontWeight: "700", color: colors.text },
  todayBadge: { backgroundColor: "rgba(21,167,101,0.15)", borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1.5 },
  todayBadgeText: { fontSize: 9, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: GREEN, letterSpacing: 0.5 },
  comboMeta: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, marginTop: 2 },
  noEntries: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, padding: 14 },

  // table
  tr: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: 1, borderBottomColor: colors.borderLight || "#F0F0F0" },
  trHead: { backgroundColor: "rgba(21,167,101,0.06)" },
  trAlt: { backgroundColor: "rgba(0,0,0,0.015)" },
  th: { fontSize: 10, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: GREEN, letterSpacing: 0.4, textTransform: "uppercase", paddingHorizontal: 8, paddingVertical: 8 },
  td: { fontSize: 12, fontFamily: "Montserrat_400Regular", color: colors.textSub, paddingHorizontal: 8, paddingVertical: 10, lineHeight: 16 },
  tdTopic: { color: colors.text, fontFamily: "Montserrat_500Medium", fontWeight: "600" },
  weekTag: { fontSize: 11, fontFamily: "Montserrat_600SemiBold", fontWeight: "800", color: GREEN, backgroundColor: "rgba(21,167,101,0.10)", borderRadius: 6, paddingVertical: 3, marginHorizontal: 6, textAlign: "center", overflow: "hidden" },
});
