import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import API from "../../api/api";
import colors from "../../config/colors";

const VenueScreen = ({ navigation }) => {
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

  const renderVenueItem = ({ item }) => (
    <TouchableOpacity
      style={styles.venueCard}
      onPress={() => navigation.navigate("VenueDetails", { venueId: item._id })}
    >
      <View style={styles.venueImageContainer}>
        {/* Handle image display from server or fallback */}
        <Image
          source={
            item.images && item.images.length > 0
              ? { uri: `${API.UPLOADS_URL}/${item.images[0]}` }
              : require("../../../assets/turf.jpg") // Fallback image
          }
          style={styles.venueImage}
          resizeMode="cover"
        />
        {item.discount && (
          <View style={styles.discountBadge}>
            <Ionicons name="pricetag" size={14} color="#fff" />
            <Text style={styles.discountText}>{item.discount}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => toggleFavorite(item._id)}
        >
          <Ionicons
            name={item.favorite ? "heart" : "heart-outline"}
            size={24}
            color={item.favorite ? "#ff5722" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.venueDetails}>
        <View style={styles.venueHeader}>
          <Text style={styles.venueName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFC107" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}/5</Text>
          </View>
        </View>

        {/* <Text style={styles.venueLocation}>{item.location}</Text> */}

        <View style={styles.distanceContainer}>
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={14} color="#fff" />
            <Text style={styles.distanceText}>{item.distance}</Text>
          </View>
        </View>

        <View style={styles.sportsContainer}>
          {item.sports &&
            item.sports.map((sport, index) => (
              <View key={index} style={styles.sportItem}>
                <Ionicons
                  name={
                    sport === "Football"
                      ? "football-outline"
                      : sport === "Badminton"
                        ? "tennisball-outline"
                        : sport === "Box Cricket" || sport === "Cricket"
                          ? "baseball-outline"
                          : sport === "Table Tennis"
                            ? "tennisball-outline"
                            : "fitness-outline"
                  }
                  size={14}
                  color="#666"
                />
                <Text style={styles.sportText}>{sport}</Text>
              </View>
            ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No venues found</Text>
      <Text style={styles.emptySubtext}>
        No venues match your search criteria.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search venues by name, location, or sport"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Header with count */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Available Venues ({totalVenues})</Text>
      </View>

      {/* Venue list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff5722" />
          <Text style={styles.loadingText}>Loading venues...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredVenues()}
          renderItem={renderVenueItem}
          keyExtractor={(item) => item._id.toString()}
          contentContainerStyle={styles.venueList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          onRefresh={fetchVenues}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchContainer: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  headerContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  filterButton: {
    marginRight: 10,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8e8e8",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedFilterPill: {
    backgroundColor: "#e8e8e8",
  },
  offersFilterPill: {
    backgroundColor: "#005a9c",
  },
  filterText: {
    fontSize: 14,
    color: "#333",
    marginRight: 5,
  },
  offersFilterText: {
    fontSize: 14,
    color: "#fff",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  tab: {
    paddingVertical: 10,
    marginRight: 20,
    position: "relative",
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    color: "#999",
  },
  activeTabText: {
    color: "#ff5722",
    fontWeight: "500",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#ff5722",
  },
  venueList: {
    padding: 15,
    paddingTop: 5,
    flexGrow: 1,
  },
  venueCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  venueImageContainer: {
    position: "relative",
  },
  venueImage: {
    width: "100%",
    height: 150,
  },
  discountBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#ff5722",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 3,
  },
  favoriteButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 8,
    borderRadius: 20,
  },
  venueDetails: {
    padding: 12,
  },
  venueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  venueName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 3,
    fontWeight: "500",
  },
  venueLocation: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  distanceContainer: {
    marginBottom: 10,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  distanceText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 3,
  },
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sportItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    marginBottom: 5,
  },
  sportText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    height: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 5,
  },
});

export default VenueScreen;
