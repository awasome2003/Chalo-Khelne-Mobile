import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";

// ─── Green design system tokens ─────────────────────────────────────────
const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const GREEN_TINT = "#E8F7F0";
const AMBER = "#F59E0B";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEEEFF";
const FIELD_BG = "#F4F4F5";
const SCREEN_BG = "#FFFFFF";

const VenueScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("Favourite");
  const [selectedFilter, setSelectedFilter] = useState("Sports");
  const [venues, setVenues] = useState([]);
  const [favoriteVenues, setFavoriteVenues] = useState([]);
  const [historyVenues, setHistoryVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalVenues, setTotalVenues] = useState(0);

  // Fetch turfs on component mount
  useEffect(() => {
    fetchVenues();
  }, []);

  // Fetch venues from API
  const fetchVenues = async () => {
    setLoading(true);
    try {
      const response = await fetch(API.ENDPOINTS.TURFS.BASE);
      const data = await response.json();
      console.log(response)

      // Check for different response formats
      const turfs = data.turfs || data; // Support both {turfs: [...]} and direct array format

      if (turfs && Array.isArray(turfs)) {
        // Adapt server response to client structure
        const adaptedVenues = turfs.map((turf) => ({
          _id: turf._id,
          name: turf.name,
          // location: turf.address
          //   ? `${turf.address.area || ""}, ${turf.address.city || ""}, ${turf.address.pincode || ""}`
          //   : (typeof turf.location === "string"
          //     ? turf.location
          //     : turf.location?.address?.fullAddress ||
          //     turf.location?.address?.city ||
          //     "Location not available"),
          distance: calculateDistance(turf), // You'll need to implement this based on user location
          rating: turf.ratings?.average || 0,
          images: turf.images || [],
          discount: turf.discount || null,
          sports: Array.isArray(turf.sports)
            ? turf.sports.map((sport) =>
              typeof sport === "object" ? sport.name : sport
            )
            : [],
          favorite: false, // This needs to be fetched separately or calculated from user data
          owner: turf.owner,
          description: turf.description,
          facilities: turf.facilities,
        }));

        setVenues(adaptedVenues);
        setTotalVenues(adaptedVenues.length);

        // For demo, let's mark some as favorites
        // In a real app, you'd get this from user data in a separate API call
        const favorites = adaptedVenues.filter((_, index) => index % 3 === 0); // Just for demo
        setFavoriteVenues(favorites);

        // For history, we'll use all venues for now
        // In a real app, you'd fetch user's history from API
        setHistoryVenues(adaptedVenues);
      } else {
        console.warn("Unexpected API response format:", data);
        Alert.alert(
          "Error",
          "Failed to load venues. Unexpected data format from server."
        );
      }
    } catch (error) {
      console.error("Error fetching venues:", error);
      Alert.alert(
        "Error",
        "Failed to connect to the server. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // Replace this function
  const getFilteredVenues = () => {
    let filteredList = venues;

    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredList = filteredList.filter(
        (venue) =>
          venue.name.toLowerCase().includes(query) ||
          // venue.location.toLowerCase().includes(query) ||
          venue.sports.some((sport) => sport.toLowerCase().includes(query))
      );
    }

    return filteredList;
  };

  // Calculate distance from user to venue (placeholder function)
  const calculateDistance = (venue) => {
    // In a real app, you would calculate this based on user's location
    // For now, just return a random distance
    return `${(Math.random() * 10).toFixed(1)} km`;
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
  };

  const toggleFavorite = async (venueId) => {
    try {
      // In a real app, you'd call an API endpoint to toggle favorite status
      // For now, we'll just update the local state
      const updatedVenues = venues.map((venue) =>
        venue._id === venueId ? { ...venue, favorite: !venue.favorite } : venue
      );

      setVenues(updatedVenues);
      const newFavorites = updatedVenues.filter((venue) => venue.favorite);
      setFavoriteVenues(newFavorites);

      // Update history list as well if it's affected
      setHistoryVenues(updatedVenues);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert("Error", "Failed to update favorite status");
    }
  };

  const getSportIcon = (sport) =>
    sport === "Football"
      ? "football-outline"
      : sport === "Badminton"
        ? "tennisball-outline"
        : sport === "Box Cricket" || sport === "Cricket"
          ? "baseball-outline"
          : sport === "Table Tennis"
            ? "tennisball-outline"
            : "fitness-outline";

  const renderVenueItem = ({ item }) => {
    const hasImage = item.images && item.images.length > 0;
    const imageSrc = hasImage
      ? { uri: assetUrl(item.images[0]) }
      : require("../../../assets/turf.jpg"); // Fallback image

    return (
      <TouchableOpacity
        style={styles.venueCard}
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("VenueDetails", { venueId: item._id })
        }
      >
        <View style={styles.venueImageContainer}>
          {/* Handle image display from server or fallback */}
          <Image source={imageSrc} style={styles.venueImage} resizeMode="cover" />

          {item.discount && (
            <View style={styles.discountBadge}>
              <Ionicons name="pricetag" size={13} color="#fff" />
              <Text style={styles.discountText}>{item.discount}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item._id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={item.favorite ? "heart" : "heart-outline"}
              size={20}
              color={item.favorite ? "#FF3040" : "#fff"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.venueDetails}>
          <View style={styles.venueHeader}>
            <Text style={styles.venueName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={AMBER} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>

          {/* <Text style={styles.venueLocation}>{item.location}</Text> */}

          <View style={styles.distanceContainer}>
            <View style={styles.distanceBadge}>
              <Ionicons name="location-outline" size={13} color={GREEN_DARK} />
              <Text style={styles.distanceText}>{item.distance} away</Text>
            </View>
          </View>

          <View style={styles.sportsContainer}>
            {item.sports &&
              item.sports.map((sport, index) => (
                <View key={index} style={styles.sportItem}>
                  <Ionicons
                    name={getSportIcon(sport)}
                    size={13}
                    color={GREEN_DARK}
                  />
                  <Text style={styles.sportText}>{sport}</Text>
                </View>
              ))}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={52} color="#D1D5DB" />
      <Text style={styles.emptyText}>No venues found</Text>
      <Text style={styles.emptySubtext}>
        No venues match your search criteria.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Venues</Text>
        <Text style={styles.headerCount}>{totalVenues} available</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={TEXT_MUTED}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venues by name, location, or sport"
          placeholderTextColor={TEXT_MUTED}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Venue list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Loading venues...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredVenues()}
          renderItem={renderVenueItem}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={[
            styles.venueList,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchVenues}
              colors={[GREEN]}
              tintColor={GREEN}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  headerCount: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
    color: GREEN_DARK,
    backgroundColor: GREEN_TINT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },

  // Search
  searchContainer: {
    backgroundColor: FIELD_BG,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 50,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  // List
  venueList: {
    paddingHorizontal: 16,
    paddingTop: 2,
    flexGrow: 1,
  },
  venueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  venueImageContainer: {
    position: "relative",
  },
  venueImage: {
    width: "100%",
    height: 150,
    backgroundColor: FIELD_BG,
  },
  discountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "700",
    marginLeft: 4,
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 8,
    borderRadius: 999,
  },
  venueDetails: {
    padding: 14,
  },
  venueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  venueName: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginRight: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
    color: TEXT_DARK,
  },
  venueLocation: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  distanceContainer: {
    marginBottom: 10,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GREEN_TINT,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  distanceText: {
    color: GREEN_DARK,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: FIELD_BG,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  sportText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "500",
    color: TEXT_DARK,
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    height: 300,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 4,
  },
});

export default VenueScreen;
