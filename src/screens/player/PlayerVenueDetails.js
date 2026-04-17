import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import API from "../../api/api";

const { width } = Dimensions.get("window");

export default function PlayerVenueDetails({ route, navigation }) {
  const { turfId } = route.params;
  const [turfDetails, setTurfDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [error, setError] = useState(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      fetchTurfDetails();
      if (user && (user._id || user.id)) {
        checkFavorite();
      }
    }, [turfId, user])
  );

  const checkFavorite = async () => {
    try {
      const userId = user._id || user.id;
      const response = await fetch(
        `${API.ENDPOINTS.USER.CHECK_FAVORITE}?userId=${userId}&turfId=${turfId}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsFavorite(data.isFavorite);
      }
    } catch (err) {
      // Silent fail
    }
  };

  const fetchTurfDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(API.ENDPOINTS.TURFS.BY_ID(turfId));
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

  const toggleFavorite = async () => {
    if (!user || !(user._id || user.id)) {
      Alert.alert("Login Required", "Please login to save favorites");
      return;
    }
    const newState = !isFavorite;
    setIsFavorite(newState);
    try {
      const response = await fetch(API.ENDPOINTS.USER.TOGGLE_FAVORITE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id || user.id,
          turfId,
          action: newState ? "add" : "remove",
        }),
      });
      if (!response.ok) {
        setIsFavorite(!newState);
        Alert.alert("Error", "Could not update favorites");
      }
    } catch {
      setIsFavorite(!newState);
    }
  };

  // --- Loading / Error states ---
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3B4DFD" />
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

  // --- Derive data from model ---
  const images =
    turfDetails.images?.length > 0
      ? turfDetails.images.map((img) => `${API.UPLOADS_URL}/${img.replace(/\\/g, "/")}`)
      : [];

  const lowestPrice = turfDetails.sports?.length > 0
    ? Math.min(...turfDetails.sports.map((s) => s.pricePerHour))
    : null;

  const addressStr = turfDetails.address
    ? [turfDetails.address.area, turfDetails.address.city, turfDetails.address.pincode].filter(Boolean).join(", ")
    : "Address not available";

  // Convert facilities object to array of active amenities
  const amenityLabels = {
    artificialTurf: "Artificial Turf", multipleFields: "Multiple Fields", floodLights: "Flood Lights",
    ledLights: "LED Lights", lockerRooms: "Locker Rooms", shower: "Shower", restrooms: "Restrooms",
    grandstands: "Grandstands", coveredAreas: "Covered Areas", parking: "Parking", foodCourt: "Food Court",
    coldDrinks: "Cold Drinks", drinkingWater: "Drinking Water", wifi: "Wi-Fi", loungeArea: "Lounge",
    surveillanceCameras: "CCTV", securityPersonnel: "Security", firstAidKit: "First Aid",
  };
  const amenityIcons = {
    artificialTurf: "leaf", multipleFields: "grid", floodLights: "flashlight", ledLights: "bulb",
    lockerRooms: "lock-closed", shower: "water", restrooms: "man", grandstands: "people",
    coveredAreas: "umbrella", parking: "car", foodCourt: "restaurant", coldDrinks: "cafe",
    drinkingWater: "water-outline", wifi: "wifi", loungeArea: "bed", surveillanceCameras: "videocam",
    securityPersonnel: "shield-checkmark", firstAidKit: "medkit",
  };
  const activeAmenities = turfDetails.facilities
    ? Object.entries(turfDetails.facilities).filter(([_, v]) => v === true).map(([k]) => k)
    : [];

  const getSportIcon = (name) => {
    const n = (name || "").toLowerCase();
    const map = {
      cricket: require("../../../assets/sports_cricket.png"),
      football: require("../../../assets/sports_soccer.png"),
      badminton: require("../../../assets/shuttlecock.png"),
      "table tennis": require("../../../assets/ping-pong.png"),
      tennis: require("../../../assets/ping-pong.png"),
    };
    return map[n] || require("../../../assets/ping-pong.png");
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Image */}
        <View style={s.heroContainer}>
          <Image
            source={images.length > 0 ? { uri: images[activeImageIndex] || images[0] } : require("../../../assets/turf.jpg")}
            style={s.heroImage}
            resizeMode="cover"
          />
          <LinearGradient colors={["rgba(0,0,0,0.5)", "transparent", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFill} />

          {/* Top Buttons */}
          <View style={[s.topBar, { top: insets.top + 8 }]}>
            <TouchableOpacity style={s.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.circleBtn} onPress={toggleFavorite}>
              <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? "#FF3040" : "#fff"} />
            </TouchableOpacity>
          </View>

          {/* Image dots */}
          {images.length > 1 && (
            <View style={s.dotsRow}>
              {images.map((_, i) => (
                <View key={i} style={[s.dot, activeImageIndex === i && s.dotActive]} />
              ))}
            </View>
          )}

          {/* Image scroll */}
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            style={StyleSheet.absoluteFill}
            onScroll={(e) => setActiveImageIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            scrollEventThrottle={16}
          >
            {(images.length > 0 ? images : [null]).map((uri, i) => (
              <View key={i} style={{ width, height: 300 }} />
            ))}
          </ScrollView>

          {/* Bottom info overlay */}
          <View style={s.heroBottom}>
            <Text style={s.heroTitle}>{turfDetails.name}</Text>
            <View style={s.heroMeta}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={s.heroAddress}>{addressStr}</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statValue}>
              {turfDetails.ratings?.average ? turfDetails.ratings.average.toFixed(1) : "New"}
            </Text>
            <Text style={s.statLabel}>
              {turfDetails.ratings?.count ? `${turfDetails.ratings.count} reviews` : "No reviews"}
            </Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>
              {lowestPrice ? `₹${lowestPrice}` : "N/A"}
            </Text>
            <Text style={s.statLabel}>per hour</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{turfDetails.sports?.length || 0}</Text>
            <Text style={s.statLabel}>Sports</Text>
          </View>
        </View>

        {/* Sports & Pricing */}
        {turfDetails.sports?.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Sports & Pricing</Text>
            <View style={s.sportsGrid}>
              {turfDetails.sports.map((sport, i) => (
                <View key={i} style={s.sportChip}>
                  <Image source={getSportIcon(sport.name)} style={s.sportChipIcon} resizeMode="contain" />
                  <View>
                    <Text style={s.sportChipName}>{sport.name}</Text>
                    <Text style={s.sportChipPrice}>₹{sport.pricePerHour}/hr</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* About */}
        {turfDetails.description && (
          <View style={s.card}>
            <Text style={s.cardTitle}>About</Text>
            <Text style={s.descText}>
              {showFullDesc
                ? turfDetails.description
                : turfDetails.description.length > 150
                ? turfDetails.description.slice(0, 150) + "..."
                : turfDetails.description}
            </Text>
            {turfDetails.description.length > 150 && (
              <TouchableOpacity onPress={() => setShowFullDesc(!showFullDesc)}>
                <Text style={s.readMore}>{showFullDesc ? "Show Less" : "Read More"}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Amenities */}
        {activeAmenities.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Amenities</Text>
            <View style={s.amenitiesGrid}>
              {activeAmenities.map((key) => (
                <View key={key} style={s.amenityChip}>
                  <Ionicons name={amenityIcons[key] || "checkmark-circle"} size={16} color="#3B4DFD" />
                  <Text style={s.amenityText}>{amenityLabels[key] || key}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Club Info */}
        {turfDetails.clubName && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Club</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#333" }}>{turfDetails.clubName}</Text>
            </View>
          </View>
        )}

        {/* Ratings */}
        {turfDetails.ratings?.count > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Ratings</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < Math.floor(turfDetails.ratings.average) ? "star" : "star-outline"}
                  size={22}
                  color="#FFD700"
                />
              ))}
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#333", marginLeft: 4 }}>
                {turfDetails.ratings.average.toFixed(1)}
              </Text>
              <Text style={{ fontSize: 13, color: "#999" }}>({turfDetails.ratings.count} reviews)</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Book Button */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={s.bottomPrice}>
            {lowestPrice ? `₹${lowestPrice}` : "N/A"}
            <Text style={s.bottomPriceUnit}> /hour</Text>
          </Text>
          <Text style={s.bottomPriceSub}>onwards</Text>
        </View>
        <TouchableOpacity
          style={s.bookBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("TurfBooking", { turfId })}
        >
          <Text style={s.bookBtnText}>Book Now</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  centerText: { fontSize: 16, color: "#999", marginTop: 12 },
  retryBtn: { marginTop: 16, backgroundColor: "#3B4DFD", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryBtnText: { color: "#fff", fontWeight: "700" },

  // Hero
  heroContainer: { width, height: 300, position: "relative" },
  heroImage: { width: "100%", height: "100%", position: "absolute" },
  topBar: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  circleBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center",
  },
  dotsRow: {
    position: "absolute", bottom: 70, alignSelf: "center",
    flexDirection: "row", gap: 6, zIndex: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 20, backgroundColor: "#fff" },
  heroBottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  heroAddress: { fontSize: 13, color: "rgba(255,255,255,0.85)", flex: 1 },

  // Stats Row
  statsRow: {
    flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, marginTop: -20,
    borderRadius: 16, padding: 16, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1a1a2e" },
  statLabel: { fontSize: 11, color: "#999", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#ECEFF1" },

  // Cards
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, padding: 18, borderRadius: 16 },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a2e", marginBottom: 14 },

  // Sports
  sportsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  sportChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F5F7FF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E8EDFF",
  },
  sportChipIcon: { width: 28, height: 28 },
  sportChipName: { fontSize: 14, fontWeight: "700", color: "#333" },
  sportChipPrice: { fontSize: 12, color: "#3B4DFD", fontWeight: "600", marginTop: 1 },

  // Description
  descText: { fontSize: 14, lineHeight: 22, color: "#666" },
  readMore: { fontSize: 14, color: "#3B4DFD", fontWeight: "600", marginTop: 6 },

  // Amenities
  amenitiesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F5F7FF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  amenityText: { fontSize: 12, fontWeight: "600", color: "#555" },

  // Bottom Bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: "#F0F0F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 10,
  },
  bottomPrice: { fontSize: 22, fontWeight: "800", color: "#1a1a2e" },
  bottomPriceUnit: { fontSize: 13, fontWeight: "500", color: "#999" },
  bottomPriceSub: { fontSize: 11, color: "#999", marginTop: 1 },
  bookBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#3B4DFD", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16,
  },
  bookBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});

export { PlayerVenueDetails };
