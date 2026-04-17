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
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";

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

      const response = await fetch(
        `${API.ENDPOINTS.USER.FAVORITES}?userId=${userId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setFavorites(data);
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

      const response = await fetch(API.ENDPOINTS.USER.TOGGLE_FAVORITE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          turfId,
          action: "remove",
        }),
      });

      if (response.ok) {
        // Remove from local state to update UI immediately
        setFavorites(favorites.filter((item) => item.turfId !== turfId));
        Alert.alert("Success", "Venue removed from favorites");
      } else {
        throw new Error("Failed to remove from favorites");
      }
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
            <ActivityIndicator size="large" color="#FF6A00" />
            <Text style={styles.loadingText}>Loading favorites...</Text>
          </View>
        ) : favorites.length === 0 ? (
          renderEmptyState()
        ) : (
          favorites.map((item) => (
            <View key={item.turfId} style={styles.card}>
              <TouchableOpacity
                style={styles.cardTouchable}
                onPress={() =>
                  navigation.navigate("TurfDetails", { turfId: item.turfId })
                }
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={
                      item.image
                        ? { uri: `${API.UPLOADS_URL}/${item.image}` }
                        : require("../../../assets/turf.jpg")
                    }
                    style={styles.venueImage}
                  />
                  <View style={styles.titleOverlay}>
                    <Text style={styles.venueTitle}>
                      {item.name || "Unnamed Venue"}
                    </Text>
                    <MaterialIcons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {item.rating ? item.rating.toFixed(1) : "0.0"} / 5
                    </Text>
                  </View>
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.locations}>
                    <View style={styles.locationTextWrapper}>
                      <Text style={styles.locationText}>
                        {item.address
                          ? `${item.address.area || ""}, ${
                              item.address.city || ""
                            }`
                          : "NA"}
                      </Text>
                      <Text style={styles.locationText}>
                        {item.address && item.address.pincode
                          ? item.address.pincode
                          : ""}
                      </Text>
                    </View>
                    <View style={styles.distanceRow}>
                      <MaterialIcons
                        name="directions"
                        size={24}
                        color="#007BFF"
                      />
                      <Text style={styles.distanceText}>
                        {item.distance || "NA"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tagRow}>
                    {(item.sports || []).map((sport, index) => {
                      const sportName =
                        typeof sport === "string"
                          ? sport
                          : sport && sport.name
                          ? sport.name
                          : "Sport";
                      return (
                        <View key={index} style={styles.tagWithIcon}>
                          {getTagIcon(sportName)}
                          <Text style={styles.tagText}>{sportName}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Remove Button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFavorite(item.turfId)}
              >
                <MaterialIcons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))
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
    color: "#FF6A00",
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
    backgroundColor: "#FF6A00",
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    position: "relative",
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
    backgroundColor: "#FF6A00",
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
