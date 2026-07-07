import React, { useState } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";

// Turf images come from external servers and can fail to load; fall back to a
// bundled placeholder on error (or when there's no image) so cards never show a
// blank white box. Defined at module scope so it never remounts mid-render.
const TURF_FALLBACK = require("../../../assets/TurnImageNew.jpg");
const TurfImage = ({ uri, style }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : TURF_FALLBACK}
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

// Cheapest per-hour price across a turf's sports (mirrors PlayerVenue so the
// favorites card shows the same price line as the turf-list card).
const computeMinPrice = (turf) => {
  if (!Array.isArray(turf?.sports) || turf.sports.length === 0) return null;
  const prices = turf.sports
    .map((s) => (typeof s === "object" ? Number(s.pricePerHour) : NaN))
    .filter((n) => !isNaN(n) && n > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
};

const formatLocation = (address) => {
  if (address) {
    const { area, city } = address;
    if (area && city) return `${area}, ${city}`;
    if (area) return area;
    if (city) return city;
    if (address.fullAddress) return address.fullAddress;
  }
  return "NA";
};

const FavoriteVenue = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch favorites when the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        fetchFavorites();
      } else {
        setLoading(false);
      }
    }, [user])
  );

  const fetchFavorites = async () => {
    try {
      setLoading(true);

      const userId = user?.id || user?._id;
      if (!userId) {
        setLoading(false);
        return;
      }

      // axios carries the app-wide Authorization header (set in AuthContext),
      // so this hits the protected route authenticated — no more 401.
      const { data } = await axios.get(API.ENDPOINTS.USER.FAVORITES, {
        params: { userId },
      });
      setFavorites(Array.isArray(data) ? data : data?.favorites || []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      Alert.alert("Error", "Failed to load favorites. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (turfId) => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) return;

      await axios.post(API.ENDPOINTS.USER.TOGGLE_FAVORITE, {
        userId,
        turfId,
        action: "remove",
      });

      // axios throws on non-2xx, so reaching here means it succeeded.
      setFavorites(favorites.filter((item) => item.turfId !== turfId));
      Alert.alert("Success", "Venue removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      Alert.alert(
        "Error",
        "Could not remove from favorites. Please try again."
      );
    }
  };

  const getTagIcon = (tag) => {
    if (!tag) return null;

    switch (typeof tag === "string" ? tag.toLowerCase() : "") {
      case "box cricket":
      case "cricket":
        return (
          <Image
            source={require("../../../assets/sports_cricket.png")}
            style={styles.tagIcon}
          />
        );
      case "football":
      case "soccer":
        return (
          <Image
            source={require("../../../assets/sports_soccer.png")}
            style={styles.tagIcon}
          />
        );
      case "badminton":
        return (
          <Image
            source={require("../../../assets/shuttlecock.png")}
            style={styles.tagIcon}
          />
        );
      case "table tennis":
      case "tennis":
        return (
          <Image
            source={require("../../../assets/ping-pong.png")}
            style={styles.tagIcon}
          />
        );
      default:
        return (
          <Image
            source={require("../../../assets/ping-pong.png")}
            style={styles.tagIcon}
          />
        );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="favorite-border" size={60} color="#ccc" />
      <Text style={styles.emptyText}>No favorite venues yet</Text>
      <TouchableOpacity
        style={styles.exploreButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.exploreButtonText}>Explore Venues</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.containers}>
      <View style={styles.BookingContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.Bookingtext}>Favorite Venue</Text>
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#15A765" />
            <Text style={styles.loadingText}>Loading favorites...</Text>
          </View>
        ) : favorites.length === 0 ? (
          renderEmptyState()
        ) : (
          favorites.map((item) => {
            const imageUri = item.image ? `${API.UPLOADS_URL}/${item.image}` : null;
            const minPrice = computeMinPrice(item);
            const location = formatLocation(item.address);
            const distance =
              item.distance && item.distance !== "NA" ? `${item.distance} away` : null;
            return (
              <View key={item.turfId} style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("TurfDetails", { turfId: item.turfId })
                  }
                >
                  <TurfImage uri={imageUri} style={styles.cardImage} />
                </TouchableOpacity>

                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name || "Unnamed Venue"}
                    </Text>
                    {/* All items here are favorites → filled heart; tap to remove */}
                    <TouchableOpacity
                      onPress={() => removeFavorite(item.turfId)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="favorite" size={20} color="#FF3040" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardLocation} numberOfLines={1}>
                    {location}
                    {distance ? ` · ${distance}` : ""}
                  </Text>

                  {minPrice != null && (
                    <View style={styles.cardPriceRow}>
                      <Text style={styles.cardPrice}>
                        ₹{minPrice}/-{" "}
                        <Text style={styles.cardPriceUnit}>per hour</Text>
                      </Text>
                    </View>
                  )}

                  <View style={styles.cardFooterRow}>
                    <Text style={styles.cardSlots}>Check availability</Text>
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() =>
                        navigation.navigate("TurfDetails", { turfId: item.turfId })
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.bookBtnText}>Book now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  containers: {
    marginHorizontal: 16,
    marginTop: 40,
    backgroundColor: "#f2f4f6",
  },
  BookingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  Bookingtext: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  loadingText: {
    marginTop: 10,
    color: "#15A765",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: "#15A765",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: "white",
    fontWeight: "600",
  },
  contentContainer: {
    marginTop: 20,
    paddingBottom: 20,
  },
  // ── Turf-list card design (ported from PlayerVenue so both pages match) ──
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    overflow: "hidden",
    marginBottom: 14,
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#eee",
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginRight: 10,
  },
  cardLocation: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },
  cardPriceRow: {
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#15A765",
  },
  cardPriceUnit: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    color: "#645E66",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardSlots: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginRight: 12,
  },
  bookBtn: {
    backgroundColor: "#15A765",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },
  cardTouchable: {
    width: "100%",
  },
  imageContainer: {
    position: "relative",
  },
  venueImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  cardContent: {
    padding: 10,
  },
  venueTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  ratingText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "400",
  },
  locations: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 24,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationText: {
    color: "#333",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "400",
  },
  distanceRow: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 10,
  },
  distanceText: {
    marginLeft: 6,
    color: "#666",
    fontSize: 10,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  tagIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    resizeMode: "contain",
  },
  tagText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
  },
  removeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#15A765",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default FavoriteVenue;
