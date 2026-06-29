import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { authFetch } from "../../api/authFetch";

// 31 days starting today (today + next 30).
const DATE_RANGE_DAYS = 31;

// Parse the hour portion of a free-form time string ("6:00", "06:00", "9:00 AM"...).
const parseHour = (timeStr) => {
  if (!timeStr) return null;
  const s = String(timeStr).trim().toLowerCase();
  const m = s.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = m[3];
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (isNaN(h)) return null;
  return h;
};

// Convert any 24h `HH:MM` segments inside a string to 12h `HH:MM` (zero-padded).
// The AM/PM tab toggle already conveys the period, so we drop the suffix to
// keep the cells visually compact. e.g. "13:00 - 14:00" → "01:00 - 02:00".
const to12h = (raw) => {
  if (!raw || typeof raw !== "string") return raw;
  return raw.replace(/(\d{1,2}):(\d{2})/g, (match, hStr, mStr) => {
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return match;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${String(h).padStart(2, "0")}:${mStr}`;
  });
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toISODate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const COURT_ICON_BY_TYPE = (type) => {
  const t = String(type || "").toLowerCase();
  if (t.includes("grass") || t.includes("natural")) return "soccer-field";
  if (t.includes("indoor") || t.includes("hall")) return "stadium";
  if (t.includes("synthetic") || t.includes("turf")) return "soccer-field";
  return "soccer-field";
};

const VenueBookingScreen = ({ route }) => {
  const params = route.params || {};
  const { turfId } = params;
  const incomingDate = params.date;
  const incomingSport = params.selectedSport;

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (incomingDate) {
      const d = new Date(`${incomingDate}T00:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
    return today;
  });
  const [period, setPeriod] = useState("AM");
  // Multiple slots can be booked at once — keep the selection as a list.
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);

  const [turfDetails, setTurfDetails] = useState(null);
  const [loadingTurf, setLoadingTurf] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTurfDetails();
  }, [turfId]);

  useEffect(() => {
    if (turfId && selectedDate) fetchAvailability();
  }, [turfId, selectedDate, incomingSport]);

  const fetchTurfDetails = async () => {
    setLoadingTurf(true);
    try {
      const res = await authFetch(API.ENDPOINTS.TURFS.BY_ID(turfId));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTurfDetails(data);
      // Auto-pick first court when the turf has any configured.
      if (Array.isArray(data.courts) && data.courts.length > 0) {
        setSelectedCourt(data.courts[0]);
      }
    } catch (err) {
      console.error("Error fetching turf details:", err);
      Alert.alert("Error", "Failed to load venue details.");
    } finally {
      setLoadingTurf(false);
    }
  };

  const fetchAvailability = async () => {
    setLoadingSlots(true);
    setSlotsError(false);
    try {
      const sport = incomingSport;
      const sportParam =
        sport && (sport.name || sport)
          ? `&sportName=${encodeURIComponent(sport.name || sport)}`
          : "";
      const dateStr = toISODate(selectedDate);
      const res = await axios.get(
        `${API.ENDPOINTS.TURF_BOOKINGS.AVAILABILITY(turfId)}?date=${dateStr}${sportParam}`
      );
      if (
        res.data?.success &&
        Array.isArray(res.data.timeSlots) &&
        res.data.timeSlots.length > 0
      ) {
        setAvailableTimeSlots(res.data.timeSlots);
      } else {
        // Genuine "no slots" — show the empty state, not fabricated slots.
        setAvailableTimeSlots([]);
      }
    } catch (err) {
      console.error("Error fetching availability:", err);
      // Don't show fake bookable slots on failure — surface a retryable error.
      setAvailableTimeSlots([]);
      setSlotsError(true);
    } finally {
      setLoadingSlots(false);
      setSelectedSlots([]);
    }
  };

  // Add/remove a slot from the multi-selection.
  const toggleSlot = (slot) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.id === slot.id);
      if (exists) return prev.filter((s) => s.id !== slot.id);
      return [...prev, slot];
    });
  };

  // ─── Derived ─────────────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    const base = new Date(today);
    base.setHours(0, 0, 0, 0);
    const arr = [];
    for (let i = 0; i < DATE_RANGE_DAYS; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  const monthLabel = useMemo(() => {
    return selectedDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  const slotsForPeriod = useMemo(() => {
    return (availableTimeSlots || []).filter((slot) => {
      const h = parseHour(slot.startTime);
      if (h === null) return true; // be lenient with unparseable times
      return period === "AM" ? h < 12 : h >= 12;
    });
  }, [availableTimeSlots, period]);

  const courts = Array.isArray(turfDetails?.courts) ? turfDetails.courts : [];
  const turfName = turfDetails?.name ? `${turfDetails.name} Turf` : "Book Turf";

  const canProceed =
    selectedSlots.length > 0 && (courts.length === 0 || !!selectedCourt);

  // ─── Actions ─────────────────────────────────────────────────────────
  const handleViewCart = () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to continue.");
      return;
    }
    if (!canProceed) return;

    navigation.navigate("TurfBookingPreview", {
      turfId,
      turfName: turfDetails?.name,
      turfAddress: turfDetails?.address
        ? `${turfDetails.address.area || ""}${
            turfDetails.address.city ? ", " + turfDetails.address.city : ""
          }`.trim()
        : "",
      date: toISODate(selectedDate),
      // New multi-slot path; keep selectedSlot (first) for backward compatibility.
      selectedSlots,
      selectedSlot: selectedSlots[0] || null,
      selectedCourt: selectedCourt,
      selectedSport: incomingSport || turfDetails?.sports?.[0] || null,
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────
  if (loadingTurf) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15A765" />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#1A181B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{turfName}</Text>
        </View>
        <View style={styles.slotInfo}>
          <Ionicons name="information-circle-outline" size={14} color="#FF8D28" />
          <Text style={styles.slotInfoText}>Each slot is 60 min.</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Select Slot</Text>

        {/* Month label */}
        <Text style={styles.monthLabel}>{monthLabel}</Text>

        {/* Horizontal date scroller */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
          style={{ marginBottom: 24 }}
        >
          {dateRange.map((d) => {
            const isSelected = sameDay(d, selectedDate);
            const isToday = sameDay(d, today);
            const dayName = d
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase();
            return (
              <View
                key={d.toISOString()}
                style={{ alignItems: "center", marginRight: 10 }}
              >
                <TouchableOpacity
                  style={[
                    styles.dateCard,
                    isSelected && styles.dateCardSelected,
                  ]}
                  onPress={() => setSelectedDate(new Date(d))}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      isSelected && styles.dateDaySelected,
                    ]}
                  >
                    {dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dateNum,
                      isSelected && styles.dateNumSelected,
                    ]}
                  >
                    {String(d.getDate()).padStart(2, "0")}
                  </Text>
                </TouchableOpacity>
                {isToday && <Text style={styles.todayLabel}>Today</Text>}
              </View>
            );
          })}
        </ScrollView>

        {/* Time header + AM/PM toggle */}
        <View style={styles.timeHeaderRow}>
          <Text style={styles.sectionTitle}>Time</Text>
          <View style={styles.periodToggle}>
            <TouchableOpacity
              style={[
                styles.periodBtn,
                period === "AM" && styles.periodBtnActive,
              ]}
              onPress={() => setPeriod("AM")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.periodText,
                  period === "AM" && styles.periodTextActive,
                ]}
              >
                AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodBtn,
                period === "PM" && styles.periodBtnActive,
              ]}
              onPress={() => setPeriod("PM")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.periodText,
                  period === "PM" && styles.periodTextActive,
                ]}
              >
                PM
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time slot grid */}
        {loadingSlots ? (
          <View style={{ padding: 24, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#15A765" />
          </View>
        ) : slotsError ? (
          <View style={styles.errorBox}>
            <Ionicons name="cloud-offline-outline" size={30} color="#C0392B" />
            <Text style={styles.errorText}>
              Couldn't load available slots. Please check your connection and try
              again.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchAvailability}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#15A765" />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : slotsForPeriod.length > 0 ? (
          <>
            <Text style={styles.multiHint}>Tap to select one or more slots.</Text>
            <View style={styles.slotGrid}>
              {slotsForPeriod.map((slot) => {
                const isSelected = selectedSlots.some((s) => s.id === slot.id);
                const isDisabled = slot.available === false;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.slotBtn,
                      isSelected && styles.slotBtnSelected,
                      isDisabled && styles.slotBtnDisabled,
                    ]}
                    disabled={isDisabled}
                    onPress={() => toggleSlot(slot)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        isSelected && styles.slotTextSelected,
                        isDisabled && styles.slotTextDisabled,
                      ]}
                    >
                      {to12h(slot.timeSlot)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.emptySlots}>
            <Text style={styles.emptySlotsText}>
              No slots available for this {period} window.
            </Text>
          </View>
        )}

        {/* Select Court */}
        {courts.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Select Court</Text>
            <View style={styles.courtRow}>
              {courts.map((court, i) => {
                const isSelected = selectedCourt?.name === court.name;
                return (
                  <TouchableOpacity
                    key={`${court.name}-${i}`}
                    style={[
                      styles.courtCard,
                      isSelected && styles.courtCardSelected,
                    ]}
                    onPress={() => setSelectedCourt(court)}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons
                      name={COURT_ICON_BY_TYPE(court.type || court.name)}
                      size={24}
                      color="#15A765"
                    />
                    <Text style={styles.courtLabel}>{court.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom sticky CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[
            styles.cartBtn,
            !canProceed && styles.cartBtnDisabled,
          ]}
          onPress={handleViewCart}
          disabled={!canProceed}
          activeOpacity={0.85}
        >
          <View style={styles.cartLeft}>
            <Ionicons name="cart-outline" size={18} color="#fff" />
            <Text style={styles.cartLeftText}>
              {selectedSlots.length > 0
                ? `${selectedSlots.length} slot${selectedSlots.length > 1 ? "s" : ""} added`
                : "Select slots"}
            </Text>
          </View>
          <View style={styles.cartRight}>
            <Text style={styles.cartRightText}>View Cart</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: { marginTop: 10, color: "#666", fontSize: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    flexShrink: 1,
  },
  slotInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slotInfoText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#FF8D28",
  },

  pageTitle: {
    fontSize: 24,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginTop: 4,
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: "#645E66",
    marginBottom: 10,
  },

  // Date scroller
  dateRow: { paddingRight: 8 },
  dateCard: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 4,
  },
  dateCardSelected: {
    backgroundColor: "#15A765",
    borderColor: "#15A765",
  },
  dateDay: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },
  dateDaySelected: { color: "#FFFFFF" },
  dateNum: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  dateNumSelected: { color: "#FFFFFF" },
  todayLabel: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },

  // Time header
  timeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  periodToggle: {
    flexDirection: "row",
    backgroundColor: "#F4F4F5",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodBtnActive: { backgroundColor: "#15A765" },
  periodText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  periodTextActive: { color: "#FFFFFF" },

  // Slot grid (3-column wrap)
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  slotBtn: {
    width: "31.5%",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  slotBtnSelected: {
    borderColor: "#15A765",
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  slotBtnDisabled: {
    backgroundColor: "#F4F4F5",
    borderColor: "#F4F4F5",
  },
  slotText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "500",
    color: "#1A181B",
  },
  slotTextSelected: { color: "#15A765", fontWeight: "700" },
  slotTextDisabled: { color: "#999" },

  emptySlots: { paddingVertical: 24, alignItems: "center" },
  emptySlotsText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },

  multiHint: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#8D848F",
    marginBottom: 10,
  },

  // Availability error + retry
  errorBox: { paddingVertical: 28, alignItems: "center", gap: 10 },
  errorText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#15A765",
    marginTop: 4,
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#15A765",
  },

  // Courts
  courtRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  courtCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 6,
  },
  courtCardSelected: {
    backgroundColor: "#E8F7F0",
    borderColor: "#15A765",
  },
  courtLabel: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#1A181B",
    textAlign: "center",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  cartBtn: {
    backgroundColor: "#15A765",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  cartBtnDisabled: {
    backgroundColor: "#A4D9BD",
  },
  cartLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cartLeftText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  cartRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  cartRightText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
});

export default VenueBookingScreen;
