import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Platform,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PLANNER from "../../api/planner";
import { authFetch } from "../../api/authFetch";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatDateTitle = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T00:00:00`);
  if (isNaN(d.getTime())) return isoDate;
  const today = new Date();
  const showYear = d.getFullYear() !== today.getFullYear();
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return showYear
    ? `${dayName}, ${day} ${month} ${d.getFullYear()}`
    : `${dayName}, ${day} ${month}`;
};

const formatParticipants = (list) => {
  if (!Array.isArray(list) || list.length === 0) return "";
  if (list.length === 1) return `${list[0]}.`;
  if (list.length === 2) return `${list[0]}, ${list[1]}.`;
  return `${list[0]}, ${list[1]}, +${list.length - 2} more.`;
};

// Parse a free-form time string into [startMinutes, endMinutes] from midnight.
// Handles: "3:30 PM", "3:30 – 5:00 PM", "06:00 – 07:30 AM", "All Day".
// Returns null when nothing usable is found.
const parseTimeRange = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const s = timeStr.trim().toLowerCase();
  if (!s) return null;
  if (s.includes("all day")) return { startMin: 0, endMin: 24 * 60 };

  const periodMatches = s.match(/(am|pm)/g) || [];
  const timeTokens = s.match(/\d{1,2}:?\d{0,2}/g) || [];
  if (timeTokens.length === 0) return null;

  const parseOne = (raw, period) => {
    const m = raw.match(/(\d{1,2}):?(\d{0,2})/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2] || "0", 10) || 0;
    if (period === "pm" && h < 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    if (isNaN(h) || h < 0 || h > 23) return null;
    return h * 60 + min;
  };

  let startPeriod, endPeriod;
  if (periodMatches.length === 2) {
    startPeriod = periodMatches[0];
    endPeriod = periodMatches[1];
  } else if (periodMatches.length === 1) {
    startPeriod = endPeriod = periodMatches[0];
  }

  const startMin = parseOne(timeTokens[0], startPeriod);
  if (startMin === null) return null;
  let endMin =
    timeTokens.length > 1 ? parseOne(timeTokens[1], endPeriod) : null;
  if (endMin === null) endMin = startMin + 60; // default 1h block when no end time
  if (endMin <= startMin) endMin += 24 * 60; // midnight wrap

  return { startMin, endMin };
};

const findFirstConflict = (activities) => {
  const ranges = activities
    .map((a) => ({ a, r: parseTimeRange(a.time) }))
    .filter((x) => x.r);
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const ri = ranges[i].r;
      const rj = ranges[j].r;
      if (ri.startMin < rj.endMin && rj.startMin < ri.endMin) {
        return { first: ranges[i].a, second: ranges[j].a };
      }
    }
  }
  return null;
};

// ─── Screen ─────────────────────────────────────────────────────────────────

const DaySchedule = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const route = useRoute();

  const selectedDate =
    route.params?.selectedDate || new Date().toISOString().split("T")[0];
  const [activities, setActivities] = useState(
    Array.isArray(route.params?.activities) ? route.params.activities : []
  );

  // When AddNote returns here in edit/add mode, it passes updatedActivities.
  useEffect(() => {
    if (Array.isArray(route.params?.updatedActivities)) {
      setActivities(route.params.updatedActivities);
      navigation.setParams({ updatedActivities: undefined });
    }
  }, [route.params?.updatedActivities]);

  const handleEdit = (activity) => {
    navigation.navigate("AddNote", {
      activity,
      returnToDaySchedule: true,
      currentActivities: activities,
    });
  };

  const handleShare = async (activity) => {
    try {
      const parts = [activity.title || "Activity"];
      const dateTitle = formatDateTitle(activity.date || selectedDate);
      if (dateTitle) parts.push(`on ${dateTitle}`);
      if (activity.time) parts.push(`at ${activity.time}`);
      if (activity.location) parts.push(activity.location);
      await Share.share({ message: parts.join(", ") });
    } catch (err) {
      console.error("[DaySchedule] share failed:", err);
    }
  };

  const handleDelete = (activity) => {
    Alert.alert(
      "Delete activity",
      `Remove "${activity.title || "this activity"}" from your planner?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("auth_token");
              const res = await authFetch(PLANNER.ENDPOINTS.DELETE(activity.id), {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data?.success) {
                throw new Error(data?.message || `Delete failed (${res.status})`);
              }
              setActivities((prev) => prev.filter((a) => a.id !== activity.id));
            } catch (err) {
              console.error("[DaySchedule] delete failed:", err);
              Alert.alert(
                "Delete failed",
                err.message || "Could not delete this activity"
              );
            }
          },
        },
      ]
    );
  };

  const handleAdd = () => {
    navigation.navigate("AddNote", {
      selectedDate,
      returnToDaySchedule: true,
      currentActivities: activities,
    });
  };

  const conflict = findFirstConflict(activities);
  const dateTitle = formatDateTitle(selectedDate);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialIcons name="chevron-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{dateTitle}</Text>
        <Text style={styles.headerSubtitle}>
          {activities.length} {activities.length === 1 ? "Activity" : "Activities"} Schedule
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {activities.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>No activities for this day yet</Text>
            <Text style={styles.emptySub}>
              Tap "Add Another Activity" below to create one.
            </Text>
          </View>
        ) : (
          activities.map((activity) => {
            const isNote = activity.source === "note";
            const hasDescription =
              typeof activity.description === "string" &&
              activity.description.trim().length > 0;
            const hasParticipants =
              Array.isArray(activity.participants) &&
              activity.participants.length > 0;

            return (
              <View key={activity.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardSport}>{activity.sport}</Text>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {activity.title}
                    </Text>
                  </View>
                  {!!activity.tag && (
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagText}>{activity.tag}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#8D848F" />
                  <Text style={styles.detailText}>
                    {activity.time || "All Day"}
                  </Text>
                </View>

                {!!activity.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color="#8D848F" />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {activity.location}
                    </Text>
                  </View>
                )}

                {hasParticipants && (
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={16} color="#8D848F" />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {formatParticipants(activity.participants)}
                    </Text>
                  </View>
                )}

                {hasDescription && (
                  <Text style={styles.description}>{activity.description}</Text>
                )}

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      styles.editBtn,
                      !isNote && styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleEdit(activity)}
                    disabled={!isNote}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="edit"
                      size={16}
                      color={isNote ? "#666" : "#BBB"}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        { color: isNote ? "#666" : "#BBB" },
                      ]}
                    >
                      Edit
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.shareBtn]}
                    onPress={() => handleShare(activity)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="share" size={16} color="#0088FF" />
                    <Text style={[styles.actionText, { color: "#0088FF" }]}>
                      Share
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deleteBtn,
                      !isNote && styles.actionBtnDisabled,
                    ]}
                    onPress={() => handleDelete(activity)}
                    disabled={!isNote}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={22}
                      color={isNote ? "#D32F2F" : "#DDD"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {conflict && (
          <View style={styles.conflictBanner}>
            <View style={styles.conflictLeftBar} />
            <View style={styles.conflictBody}>
              <View style={styles.conflictHeaderRow}>
                <MaterialIcons name="error-outline" size={18} color="#D32F2F" />
                <Text style={styles.conflictTitle}>Time Conflict Detected</Text>
              </View>
              <Text style={styles.conflictText}>
                Your{" "}
                <Text style={styles.conflictBold}>
                  {(conflict.first.type || "activity").toLowerCase()} (
                  {conflict.first.time})
                </Text>{" "}
                overlaps with a{" "}
                <Text style={styles.conflictBold}>
                  {(conflict.second.type || "activity").toLowerCase()} (
                  {conflict.second.time})
                </Text>
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer — Add Another Activity */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAdd}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#666" />
          <Text style={styles.addButtonText}>Add Another Activity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: {
    backgroundColor: "#15A765",
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  backBtn: {
    width: 28,
    height: 28,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.92)",
    marginTop: 4,
  },

  // Body
  body: {
    padding: 16,
    paddingBottom: 32,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    padding: 14,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardSport: {
    fontSize: 10,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#15A765",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  tagBadge: {
    backgroundColor: "#E7F7DD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 60,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },

  // Detail rows
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#645E66",
    flexShrink: 1,
  },
  description: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#3E3840",
    marginTop: 8,
    lineHeight: 18,
  },

  // Actions
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  editBtn: {
    backgroundColor: "#F2F2F2",
  },
  shareBtn: {
    backgroundColor: "#E6F2FF",
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FDECEC",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  actionBtnDisabled: {
    opacity: 0.55,
  },

  // Conflict banner
  conflictBanner: {
    flexDirection: "row",
    backgroundColor: "#FFF1F1",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  conflictLeftBar: {
    width: 4,
    backgroundColor: "#D32F2F",
  },
  conflictBody: {
    flex: 1,
    padding: 12,
  },
  conflictHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  conflictTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#D32F2F",
  },
  conflictText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#D32F2F",
    lineHeight: 17,
  },
  conflictBold: {
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },

  // Footer — Add Another Activity
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "#fff",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "#fff",
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#666",
  },
});

export default DaySchedule;
