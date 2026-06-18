import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import TRAINER from "../../api/trainerConsole";
import { useAuth } from "../../context/AuthContext";

const GREEN = "#15A765";
const SOURCE_COLOR = {
  session: "#15A765",
  batch: "#2563EB",
  "training-schedule": "#F59E0B",
  note: "#8E8E93",
};

const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthRange = (d) => {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: toISO(start), to: toISO(end) };
};

/**
 * Trainer / Coach / Substitute "Schedule" tab — calendar view backed by
 * /api/trainer-console/calendar. The server merges the caller's own
 * Sessions + Batches (expanded) + School TrainingSchedule rows + personal
 * PlannerNotes. Substitute tokens are remapped server-side to the coach's data.
 */
export default function TrainerSchedule() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  const [selectedDate, setSelectedDate] = useState(toISO(new Date()));
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState("calendar"); // "calendar" | "list"

  const fetchFeed = useCallback(
    async (showSpinner = true) => {
      if (!userId) {
        setActivities([]);
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      const { from, to } = monthRange(monthCursor);
      try {
        const res = await axios.get(TRAINER.CALENDAR(userId), { params: { from, to } });
        if (res.data?.success && Array.isArray(res.data.activities)) {
          setActivities(res.data.activities);
        } else {
          setActivities([]);
        }
      } catch (e) {
        console.warn("[Schedule] feed fetch failed:", e?.response?.data?.message || e.message);
        setActivities([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, monthCursor]
  );

  useFocusEffect(useCallback(() => { fetchFeed(); }, [fetchFeed]));

  const onRefresh = () => { setRefreshing(true); fetchFeed(false); };

  // ── derived ──
  const markedDates = useMemo(() => {
    const map = {};
    for (const a of activities) {
      if (!a.date) continue;
      if (!map[a.date]) map[a.date] = { marked: true, dots: [] };
      if (map[a.date].dots.length < 3) {
        map[a.date].dots.push({
          key: a.source + "-" + a.id,
          color: a.color || SOURCE_COLOR[a.source] || GREEN,
        });
      }
    }
    map[selectedDate] = {
      ...(map[selectedDate] || {}),
      selected: true,
      selectedColor: GREEN,
    };
    return map;
  }, [activities, selectedDate]);

  const dayItems = useMemo(
    () => activities.filter((a) => a.date === selectedDate),
    [activities, selectedDate]
  );

  const byWeekday = useMemo(() => {
    const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const byDay = Object.fromEntries(order.map((d) => [d, []]));
    activities.forEach((a) => {
      const d = new Date(`${a.date}T00:00:00`);
      if (isNaN(d)) return;
      const day = order[(d.getDay() + 6) % 7]; // Mon=0 … Sun=6
      byDay[day].push(a);
    });
    Object.values(byDay).forEach((arr) =>
      arr.sort((x, y) => String(x.time).localeCompare(String(y.time)))
    );
    return order.map((d) => ({ day: d, items: byDay[d] }));
  }, [activities]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <View style={styles.viewToggle}>
          {[
            { key: "calendar", icon: "calendar" },
            { key: "list", icon: "list" },
          ].map((v) => {
            const active = view === v.key;
            return (
              <TouchableOpacity
                key={v.key}
                onPress={() => setView(v.key)}
                style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              >
                <Ionicons name={v.icon} size={16} color={active ? "#FFFFFF" : "#6F6F6F"} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
      ) : view === "calendar" ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        >
          <Calendar
            current={selectedDate}
            onDayPress={(d) => setSelectedDate(d.dateString)}
            onMonthChange={(m) => setMonthCursor(new Date(m.year, m.month - 1, 1))}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: "#FFFFFF",
              calendarBackground: "#FFFFFF",
              selectedDayBackgroundColor: GREEN,
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: GREEN,
              arrowColor: GREEN,
              monthTextColor: "#1F1F1F",
              textMonthFontWeight: "700",
              textDayFontWeight: "500",
              dayTextColor: "#1F1F1F",
              textDisabledColor: "#C9CDD3",
            }}
            style={styles.calendar}
          />

          <View style={styles.dayHeaderRow}>
            <Text style={styles.dayHeaderText}>
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </Text>
            <Text style={styles.dayCount}>
              {dayItems.length} {dayItems.length === 1 ? "item" : "items"}
            </Text>
          </View>

          {dayItems.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={36} color="#CFD2D6" />
              <Text style={styles.emptyText}>Nothing scheduled for this day</Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {dayItems.map((a) => <ActivityCard key={a.id} a={a} />)}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN} />}
        >
          {byWeekday.map((g) =>
            g.items.length > 0 ? (
              <View key={g.day}>
                <Text style={styles.weekdayHeader}>{g.day.toUpperCase()}</Text>
                <View style={{ gap: 10 }}>
                  {g.items.map((a) => <ActivityCard key={a.id} a={a} />)}
                </View>
              </View>
            ) : null
          )}
          {activities.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={36} color="#CFD2D6" />
              <Text style={styles.emptyText}>Nothing scheduled this month</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ActivityCard({ a }) {
  const color = a.color || SOURCE_COLOR[a.source] || GREEN;
  return (
    <View style={styles.card}>
      <View style={[styles.cardBar, { backgroundColor: color }]} />
      <View style={{ flex: 1, padding: 12 }}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{a.title}</Text>
          {a.tag ? (
            <View style={[styles.tag, { backgroundColor: color + "26" }]}>
              <Text style={[styles.tagText, { color }]}>{a.tag}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {a.sport ? (
            <View style={[styles.sportPill, { backgroundColor: color + "1A" }]}>
              <Text style={[styles.sportText, { color }]}>{a.sport}</Text>
            </View>
          ) : null}
          {a.time ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#6F6F6F" />
              <Text style={styles.metaText}>{a.time}</Text>
            </View>
          ) : null}
          {a.location ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={13} color="#6F6F6F" />
              <Text style={styles.metaText}>{a.location}</Text>
            </View>
          ) : null}
        </View>
        {a.description ? <Text style={styles.descText} numberOfLines={2}>{a.description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#1A181B" },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#F1F2F4",
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  toggleBtn: { width: 32, height: 28, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  toggleBtnActive: { backgroundColor: GREEN },
  calendar: {
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    paddingBottom: 6,
    marginTop: 4,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  dayHeaderText: { fontSize: 15, fontWeight: "700", color: "#1A181B" },
  dayCount: { fontSize: 12, color: "#6F6F6F" },
  weekdayHeader: { fontSize: 13, fontWeight: "800", color: GREEN, letterSpacing: 0.6, marginBottom: 8 },
  empty: { alignItems: "center", marginTop: 40, gap: 8, paddingHorizontal: 16 },
  emptyText: { color: "#9A9A9A", fontSize: 13 },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    overflow: "hidden",
  },
  cardBar: { width: 4 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1A181B" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6, alignItems: "center" },
  sportPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sportText: { fontSize: 11, fontWeight: "600" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#6F6F6F" },
  descText: { fontSize: 13, color: "#555", marginTop: 6, lineHeight: 18 },
});
