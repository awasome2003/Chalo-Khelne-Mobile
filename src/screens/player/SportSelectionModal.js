import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Deterministic distance placeholder so the modal subtitle matches the same
// "X.X km away" the details / list screens compute for this turf.
const computeDistanceLabel = (turfId) => {
  const id = String(turfId || "");
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  const km = 0.5 + (h % 50) / 10;
  return `${km.toFixed(1)} km away`;
};

const getCategory = (sport) =>
  String(sport?.category || "outdoor").toLowerCase() === "indoor"
    ? "indoor"
    : "outdoor";

const SportSelectionModal = ({ visible, onClose, turf, initialSport, onSelect }) => {
  const insets = useSafeAreaInsets();

  const sports = Array.isArray(turf?.sports) ? turf.sports : [];

  const indoorSports = useMemo(
    () => sports.filter((s) => getCategory(s) === "indoor"),
    [sports]
  );
  const outdoorSports = useMemo(
    () => sports.filter((s) => getCategory(s) === "outdoor"),
    [sports]
  );

  // Initial tab + selection — if the caller passed an initialSport, open the
  // tab it belongs to and pre-select it. Otherwise default to whichever tab
  // has sports, preferring Indoor when both have entries.
  const initialTab = useMemo(() => {
    if (initialSport) return getCategory(initialSport);
    if (indoorSports.length > 0) return "indoor";
    if (outdoorSports.length > 0) return "outdoor";
    return "indoor";
  }, [initialSport, indoorSports.length, outdoorSports.length]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedName, setSelectedName] = useState(initialSport?.name || null);

  // Whenever the modal becomes visible (or the initial inputs change),
  // re-sync the tab + selection so reopening starts fresh / from the hint.
  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setSelectedName(initialSport?.name || null);
    }
  }, [visible, initialTab, initialSport?.name]);

  const addressStr = turf?.address
    ? [turf.address.area, turf.address.city].filter(Boolean).join(", ")
    : "";
  const distanceStr = computeDistanceLabel(turf?._id);

  const visibleSports = activeTab === "indoor" ? indoorSports : outdoorSports;

  const handleNext = () => {
    const chosen = sports.find((s) => s.name === selectedName);
    if (!chosen) return;
    onSelect?.(chosen);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <View style={styles.overlay}>
        {/* Dismiss-on-backdrop tap */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        {/* Close button sits above the sheet, top-right of the dim overlay */}
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 14 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <Text style={styles.label}>Select Sport</Text>
          <Text style={styles.title}>{turf?.name || "Sport Zone"}</Text>
          <View style={styles.subRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.subtitle} numberOfLines={1}>
              {addressStr ? `${addressStr} · ${distanceStr}` : distanceStr}
            </Text>
          </View>

          {/* Indoor / Outdoor tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "indoor" && styles.tabActive]}
              onPress={() => setActiveTab("indoor")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "indoor" && styles.tabTextActive,
                ]}
              >
                Indoor
              </Text>
              <View
                style={[
                  styles.badge,
                  activeTab === "indoor" && styles.badgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    activeTab === "indoor" && styles.badgeTextActive,
                  ]}
                >
                  {indoorSports.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "outdoor" && styles.tabActive]}
              onPress={() => setActiveTab("outdoor")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "outdoor" && styles.tabTextActive,
                ]}
              >
                Outdoor
              </Text>
              <View
                style={[
                  styles.badge,
                  activeTab === "outdoor" && styles.badgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    activeTab === "outdoor" && styles.badgeTextActive,
                  ]}
                >
                  {outdoorSports.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Sport list */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {visibleSports.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  No {activeTab} sports at this venue.
                </Text>
              </View>
            ) : (
              visibleSports.map((sport, i) => {
                const isSelected = selectedName === sport.name;
                return (
                  <TouchableOpacity
                    key={`${sport.name}-${i}`}
                    style={[
                      styles.sportRow,
                      isSelected && styles.sportRowSelected,
                    ]}
                    onPress={() => setSelectedName(sport.name)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.radio,
                        isSelected && styles.radioSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={styles.sportName}>{sport.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.nextBtn,
              !selectedName && styles.nextBtnDisabled,
            ]}
            disabled={!selectedName}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    flexShrink: 1,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1FA",
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#15A765",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#15A765",
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#C8CACC",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    backgroundColor: "#15A765",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  badgeTextActive: {
    color: "#FFFFFF",
  },

  // List
  list: {
    maxHeight: 320,
    marginBottom: 16,
  },
  sportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  sportRowSelected: {
    backgroundColor: "#E8F7F0",
    borderColor: "#15A765",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    backgroundColor: "#15A765",
    borderColor: "#15A765",
  },
  sportName: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  emptyRow: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },

  // Next button
  nextBtn: {
    backgroundColor: "#15A765",
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnDisabled: {
    backgroundColor: "#A4D9BD",
  },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default SportSelectionModal;
