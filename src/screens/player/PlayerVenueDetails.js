import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import API from "../../api/api";
import SportSelectionModal from "./SportSelectionModal";
import { authFetch } from "../../api/authFetch";

const { width } = Dimensions.get("window");

// Curated 6-tile amenity set matching the Figma. Each tile maps to a key in
// the Turf.facilities boolean dictionary; tiles whose facility flag is false
// are hidden so the grid only shows what the turf actually provides.
const AMENITY_DEFINITIONS = [
  { key: "floodLights", label: "Floodlights", icon: "lightbulb-on-outline" },
  { key: "restrooms", label: "Washroom", icon: "shower" },
  { key: "parking", label: "Parking", icon: "car-outline" },
  { key: "drinkingWater", label: "Water", icon: "water-outline" },
  { key: "loungeArea", label: "Seating Area", icon: "chair-school" },
  { key: "firstAidKit", label: "First Aid", icon: "plus-circle-outline" },
];

const getSportIconName = (sportName) => {
  const n = String(sportName || "").toLowerCase();
  if (n.includes("cricket")) return "cricket";
  if (n.includes("tennis")) return "tennis";
  if (n.includes("badminton")) return "badminton";
  if (n.includes("basket")) return "basketball";
  return "soccer";
};

export default function PlayerVenueDetails({ route, navigation }) {
  const { turfId } = route.params;
  const [turfDetails, setTurfDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [error, setError] = useState(null);
  const [rulesExpanded, setRulesExpanded] = useState(true);
  const [slots, setSlots] = useState(null);
  const [selectedSportIndex, setSelectedSportIndex] = useState(null);
  const [sportModalVisible, setSportModalVisible] = useState(false);

  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      fetchTurfDetails();
      fetchAvailability();
    }, [turfId])
  );

  const fetchTurfDetails = async () => {
    try {
      setLoading(true);
      const response = await authFetch(API.ENDPOINTS.TURFS.BY_ID(turfId));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setTurfDetails(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await authFetch(API.ENDPOINTS.TURFS.AVAILABILITY_TODAY);
      const data = await res.json();
      if (data?.success && data.availability) {
        const entry = data.availability[String(turfId)];
        setSlots(entry?.availableSlots ?? null);
      }
    } catch (err) {
      // Non-blocking
    }
  };

  const handleBookingPress = () => {
    if (!user || !(user._id || user.id)) {
      Alert.alert("Login Required", "Please login to make a booking");
      return;
    }
    // Open the sport-selection popup before sending the user to the slot
    // screen. The modal's onSelect handler does the actual navigation.
    setSportModalVisible(true);
  };

  const handleSportSelected = (sport) => {
    setSportModalVisible(false);
    navigation.navigate("TurfBooking", {
      turfId,
      venueName: turfDetails?.name,
      venueAddress: addressStr,
      selectedSport: sport,
    });
  };

  // ─── Loading / Error states ───────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#15A765" />
        <Text style={s.centerText}>Loading venue...</Text>
      </View>
    );
  }

  if (error || !turfDetails) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={56} color="#ccc" />
        <Text style={s.centerText}>{error || "Venue not found"}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={fetchTurfDetails}>
          <Text style={s.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Derive data from model ───────────────────────────────────────────
  const images =
    turfDetails.images?.length > 0
      ? turfDetails.images.map(
          (img) => `${API.UPLOADS_URL}/${img.replace(/\\/g, "/")}`
        )
      : [];

  const lowestPrice =
    turfDetails.sports?.length > 0
      ? Math.min(
          ...turfDetails.sports
            .map((sp) => Number(sp.pricePerHour))
            .filter((n) => !isNaN(n) && n > 0)
        )
      : null;

  const addressStr = turfDetails.address
    ? [turfDetails.address.area, turfDetails.address.city]
        .filter(Boolean)
        .join(", ")
    : "Address not available";

  // Figma shows "Baner, Pune · 1.2 km away". Distance is a deterministic
  // placeholder until we wire geolocation.
  const distanceStr = (() => {
    const id = String(turfId || "");
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
    const km = 0.5 + (h % 50) / 10;
    return `${km.toFixed(1)} km away`;
  })();

  const enabledAmenities = AMENITY_DEFINITIONS.filter(
    (a) => turfDetails.facilities?.[a.key]
  );

  // Rules — Turf model doesn't expose a rules array yet. Show whatever the
  // turf has on `rules` (string or array), else fall back to the defaults
  // shown in the Figma so the section isn't empty.
  const rulesRaw = turfDetails.rules;
  const rules = Array.isArray(rulesRaw)
    ? rulesRaw.map((r) => String(r).trim()).filter(Boolean)
    : typeof rulesRaw === "string"
    ? rulesRaw
        .split(/\r?\n/)
        .map((r) => r.trim())
        .filter(Boolean)
    : [
        "Play responsibly and avoid rough behavior",
        "Any damage to turf/property will be chargeable",
        "Management is not responsible for personal injuries or lost items",
      ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero image */}
        <View style={s.heroContainer}>
          <Image
            source={
              images.length > 0
                ? { uri: images[activeImageIndex] }
                : require("../../../assets/turf.jpg")
            }
            style={s.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "transparent"]}
            style={[StyleSheet.absoluteFill, { height: 100 }]}
          />

          {/* Top bar — back button only */}
          <View style={[s.topBar, { top: insets.top + 8 }]}>
            <TouchableOpacity
              style={s.circleBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#1A181B" />
            </TouchableOpacity>
          </View>

          {/* Image carousel — paginated scroll over hero */}
          {images.length > 1 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={StyleSheet.absoluteFill}
              onScroll={(e) => {
                const newIndex = Math.round(
                  e.nativeEvent.contentOffset.x / width
                );
                setActiveImageIndex(newIndex);
              }}
              scrollEventThrottle={16}
            >
              {images.map((_, i) => (
                <View key={i} style={{ width, height: 300 }} />
              ))}
            </ScrollView>
          )}

          {/* Image dots — placed just above the card overlap */}
          {images.length > 1 && (
            <View style={s.dotsRow}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, activeImageIndex === i && s.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content card — full-width with rounded top, overlaps the image */}
        <View style={s.contentCard}>
          {/* Title section */}
          <View style={s.titleSection}>
            <Text style={s.title}>{turfDetails.name || "Sport Zone"}</Text>

            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={s.locationText} numberOfLines={1}>
                {addressStr} · {distanceStr}
              </Text>
            </View>

            <View style={s.priceRow}>
              <Text style={s.priceText}>
                ₹{lowestPrice != null ? lowestPrice : 0}/-
              </Text>
              <Text style={s.priceUnit}> per hour</Text>
            </View>
            <Text style={s.slotsText}>
              {slots != null
                ? `${slots} slot${slots === 1 ? "" : "s"} available today`
                : "Availability loading…"}
            </Text>
          </View>

          {/* Available Sports */}
          {turfDetails.sports?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Available Sports</Text>
              <View style={s.sportsContainer}>
                {turfDetails.sports.map((sport, i) => {
                  const isSelected = selectedSportIndex === i;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.sportBox, isSelected && s.sportBoxActive]}
                      onPress={() =>
                        setSelectedSportIndex((prev) => (prev === i ? null : i))
                      }
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons
                        name={getSportIconName(sport.name)}
                        size={24}
                        color="#15A765"
                      />
                      <Text style={s.sportLabel}>{sport.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* About Turf */}
          {turfDetails.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>About Turf</Text>
              <Text style={s.descriptionText}>{turfDetails.description}</Text>
            </View>
          )}

          {/* Amenities */}
          {enabledAmenities.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Amenities</Text>
              <View style={s.amenitiesGrid}>
                {enabledAmenities.map((amenity) => (
                  <View key={amenity.key} style={s.amenityBox}>
                    <MaterialCommunityIcons
                      name={amenity.icon}
                      size={28}
                      color="#15A765"
                    />
                    <Text style={s.amenityLabel}>{amenity.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Rules & info — chevron-down when expanded, matching Figma */}
          {rules.length > 0 && (
            <View style={s.section}>
              <TouchableOpacity
                style={s.rulesHeader}
                onPress={() => setRulesExpanded(!rulesExpanded)}
                activeOpacity={0.7}
              >
                <Text style={s.sectionTitle}>Rules & info</Text>
                <Ionicons
                  name={rulesExpanded ? "chevron-down" : "chevron-up"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              {rulesExpanded && (
                <View style={s.rulesContent}>
                  {rules.map((rule, idx) => (
                    <Text key={idx} style={s.ruleText}>
                      {rule}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom sticky button */}
      <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={s.selectSlotButton}
          activeOpacity={0.85}
          onPress={handleBookingPress}
        >
          <Text style={s.selectSlotText}>Select Slot</Text>
        </TouchableOpacity>
      </View>

      {/* Sport-selection popup — opens between the Select Slot button and
          the slot-picker screen. The user's tile selection above (if any)
          is forwarded as a hint to pre-select inside the modal. */}
      <SportSelectionModal
        visible={sportModalVisible}
        onClose={() => setSportModalVisible(false)}
        turf={turfDetails}
        initialSport={
          selectedSportIndex != null
            ? turfDetails?.sports?.[selectedSportIndex]
            : null
        }
        onSelect={handleSportSelected}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  centerText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    fontFamily: "Montserrat_500Medium",
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#15A765",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: "#fff",
    fontFamily: "Montserrat_700Bold",
    fontWeight: "700",
    fontSize: 14,
  },

  // Hero
  heroContainer: {
    width: "100%",
    height: 300,
    position: "relative",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "flex-start",
    zIndex: 10,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dotsRow: {
    position: "absolute",
    bottom: 28,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    zIndex: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#fff",
  },

  // Content card — full-width, rounded top, attached to image
  contentCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },

  // Title
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: "#2E2C2C",
    fontFamily: "Poppins_400Regular",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 14,
  },
  priceText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#258C3F",
  },
  priceUnit: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  slotsText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 12,
  },

  // Available Sports
  sportsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  sportBox: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sportBoxActive: {
    backgroundColor: "#E8F7F0",
    borderColor: "#15A76533",
  },
  sportLabel: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#615763",
    textAlign: "center",
  },

  // About
  descriptionText: {
    fontSize: 13,
    color: "#453E4C",
    fontFamily: "Montserrat_500Medium",
    lineHeight: 20,
  },

  // Amenities
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  amenityBox: {
    width: "31.5%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  amenityLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#615763",
    textAlign: "center",
  },

  // Rules
  rulesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rulesContent: {
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
    color: "#717171",
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },

  // Bottom sticky bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  selectSlotButton: {
    backgroundColor: "#15A765",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  selectSlotText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export { PlayerVenueDetails };
