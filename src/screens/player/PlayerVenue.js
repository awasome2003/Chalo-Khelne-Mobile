import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import FilterModal from "./FilterModal";
import SportsModal from "./SportsModal";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../api/api";

const PlayerVenue = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [sportsModalVisible, setSportsModalVisible] = useState(false);
  const [selectedSports, setSelectedSports] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredTurfs, setFilteredTurfs] = useState([]);
  const [totalTurfs, setTotalTurfs] = useState(0);

  // Fetch turfs from API
  useEffect(() => {
    fetchTurfs();
  }, []);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [turfs, activeFilter, selectedSports, searchQuery]);

  const fetchTurfs = async () => {
    setLoading(true);
    try {
      const response = await fetch(API.ENDPOINTS.TURFS.BASE);
      const data = await response.json();

      // Extract turfs from the response (handle both formats)
      const turfData = data.turfs || data || [];

      if (Array.isArray(turfData)) {
        setTurfs(turfData);
        setTotalTurfs(turfData.length);
      } else {
        console.warn("Unexpected API response format:", data);
        setTurfs([]);
      }
    } catch (error) {
      console.error("Error fetching turfs:", error);
      Alert.alert("Error", "Failed to load venues. Please try again later.");
      setTurfs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...turfs];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (turf) =>
          (turf.name && turf.name.toLowerCase().includes(query)) ||
          (turf.address &&
            turf.address.area &&
            turf.address.area.toLowerCase().includes(query)) ||
          (turf.address &&
            turf.address.city &&
            turf.address.city.toLowerCase().includes(query)) ||
          (turf.sports &&
            turf.sports.some((sport) =>
              typeof sport === "string"
                ? sport.toLowerCase().includes(query)
                : sport.name && sport.name.toLowerCase().includes(query)
            ))
      );
    }

    // Apply category filter
    if (activeFilter === "offers") {
      filtered = filtered.filter((turf) => turf.discount);
    }

    // Apply sports filter
    if (selectedSports.length > 0) {
      filtered = filtered.filter((turf) => {
        // Check if turf has any of the selected sports
        return selectedSports.some((selectedSport) => {
          return (
            turf.sports &&
            turf.sports.some((sport) => {
              const sportName =
                typeof sport === "string" ? sport : sport.name || "";
              return sportName.toLowerCase() === selectedSport.toLowerCase();
            })
          );
        });
      });
    }

    setFilteredTurfs(filtered);
  };

  const calculateDistance = (turf) => {
    // In a real app, calculate distance based on user's location
    // For now, return a placeholder or the turf's distance if available
    return turf.distance || `${(Math.random() * 5 + 1).toFixed(1)} km`;
  };

  const getFormattedLocation = (turf) => {
    // Case 1: Turf has address directly (old schema)
    if (turf.address) {
      const { area, city, pincode, fullAddress } = turf.address;
      return (
        fullAddress ||
        `${area || ""}, ${city || ""}, ${pincode || ""}`
          .replace(/^,|,$/g, "")
          .trim() ||
        "Location not available"
      );
    }

    // Case 2: Turf has new location object
    if (turf.location) {
      if (typeof turf.location === "string") {
        return turf.location || "Location not available";
      }
      if (typeof turf.location === "object") {
        return (
          turf.location.address ||
          turf.location.city || // fallback if API changes later
          "Location not available"
        );
      }
    }

    return "Location not available";
  };



  const getSportIcon = (sportName) => {
    const sport = sportName.toLowerCase();

    if (sport.includes("cricket")) {
      return require("../../../assets/sports_cricket.png");
    } else if (sport.includes("football") || sport.includes("soccer")) {
      return require("../../../assets/sports_soccer.png");
    } else if (sport.includes("badminton")) {
      return require("../../../assets/shuttlecock.png");
    } else if (sport.includes("tennis")) {
      return require("../../../assets/ping-pong.png");
    }

    // Default icon if no match
    return require("../../../assets/ping-pong.png");
  };

  const renderSportTag = (sport, index) => {
    const sportName =
      typeof sport === "string" ? sport : sport?.name || "Sport";

    return (
      <View key={`${sportName}-${index}`} style={styles.tagWithIcon}>
        <Image source={getSportIcon(sportName)} style={styles.tagIcon} />
        <Text style={styles.tagText}>{sportName}</Text>
      </View>
    );
  };


  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Turf</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <MaterialIcons
          name="search"
          size={24}
          color="#999"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Search venues by name, location, or sport"
          placeholderTextColor="#999"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons name="close" size={24} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.players}>
        {/* Header Section */}
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Available Venues ({totalTurfs})</Text>
          <TouchableOpacity
            style={styles.favHeaderBtn}
            onPress={() => navigation.navigate("FavouriteVenue")}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={18} color="#FF3040" />
            <Text style={styles.favHeaderText}>Favorites</Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {/* Filter Icon - fixed */}
          <TouchableOpacity
            style={styles.filterIcon}
            onPress={() => setModalVisible(true)}
          >
            <MaterialIcons name="filter-list" size={24} color="#000" />
          </TouchableOpacity>
          <FilterModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
          />

          {/* Scrollable filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <TouchableOpacity
              style={[
                styles.inactiveFilter,
                activeFilter === "sports" && styles.activeFilter,
              ]}
              onPress={() => {
                setActiveFilter("sports");
                setSportsModalVisible(true);
              }}
            >
              <Text
                style={[
                  styles.inactiveFilterText,
                  activeFilter === "sports" && styles.activeFilterText,
                ]}
              >
                Sports
              </Text>
              <MaterialIcons
                name="arrow-drop-down"
                size={20}
                color={activeFilter === "sports" ? "#fff" : "#000"}
              />
            </TouchableOpacity>

            <SportsModal
              visible={sportsModalVisible}
              onClose={() => setSportsModalVisible(false)}
              selectedSports={selectedSports}
              setSelectedSports={setSelectedSports}
            />

            <TouchableOpacity
              style={[
                styles.inactiveFilter,
                activeFilter === "events" && styles.activeFilter,
              ]}
              onPress={() => setActiveFilter("events")}
            >
              <Text
                style={[
                  styles.inactiveFilterText,
                  activeFilter === "events" && styles.activeFilterText,
                ]}
              >
                Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.inactiveFilter,
                activeFilter === "offers" && styles.activeFilter,
              ]}
              onPress={() => setActiveFilter("offers")}
            >
              <Text
                style={[
                  styles.inactiveFilterText,
                  activeFilter === "offers" && styles.activeFilterText,
                ]}
              >
                Offers
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Turf List */}
      <View style={{ backgroundColor: "#f2f2f2", paddingBottom: 100 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loadingText}>Loading venues...</Text>
          </View>
        ) : filteredTurfs.length > 0 ? (
          filteredTurfs.map((turf) => {
            const hasImage = Array.isArray(turf.images) && turf.images.length > 0;
            const imageUri = hasImage
              ? { uri: `${API.UPLOADS_URL}/${turf.images[0]}` }
              : require("../../../assets/turf.jpg");
            const rating = typeof turf.ratings?.average === "number"
              ? turf.ratings.average.toFixed(1)
              : "0.0";
            const distance = calculateDistance(turf);

            return (
              <TouchableOpacity
                key={turf._id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("TurfDetails", { turfId: turf._id })}
              >
                {/* Image Section */}
                <View style={styles.imageContainer}>
                  <Image
                    source={imageUri}
                    style={styles.venueImage}
                    resizeMode="cover"
                    defaultSource={require("../../../assets/turf.jpg")}
                  />
                  {/* Gradient overlay */}
                  <View style={styles.imageGradient} />

                  {/* Rating badge top-left */}
                  <View style={styles.ratingBadge}>
                    <MaterialIcons name="star" size={13} color="#FFD700" />
                    <Text style={styles.ratingBadgeText}>{rating}</Text>
                  </View>

                  {/* Discount badge top-right */}
                  {turf.discount && (
                    <View style={styles.offerBadge}>
                      <Text style={styles.offerText}>{turf.discount}% OFF</Text>
                    </View>
                  )}

                  {/* Distance badge bottom-right */}
                  {distance && (
                    <View style={styles.distanceBadge}>
                      <MaterialIcons name="near-me" size={12} color="#FF6A00" />
                      <Text style={styles.distanceBadgeText}>{distance}</Text>
                    </View>
                  )}
                </View>

                {/* Content Section */}
                <View style={styles.cardContent}>
                  <Text style={styles.venueTitle} numberOfLines={1}>{turf.name}</Text>

                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={14} color="#90A4AE" />
                    <Text style={styles.locationText} numberOfLines={2}>
                      {getFormattedLocation(turf)}
                    </Text>
                  </View>

                  {turf.clubName && (
                    <View style={styles.clubRow}>
                      <MaterialIcons name="business" size={13} color="#FF6A00" />
                      <Text style={styles.clubText}>{turf.clubName}</Text>
                    </View>
                  )}

                  {/* Sport Tags */}
                  {turf.sports && turf.sports.length > 0 && (
                    <View style={styles.tagRow}>
                      {turf.sports.map((sport) => renderSportTag(sport))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="sports-soccer" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No venues found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F3F4F6",
  },
  clubText: {
    color: "#666",
    fontSize: 11,
    marginBottom: 4,
    fontStyle: "italic",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F3F4F6",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  headerTitle: {
    fontSize: 18, fontWeight: "700", color: "#333",
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 8,
  },
  players: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
  },
  searchInput: {
    fontSize: 16,
    flex: 1,
    color: "#000",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
  },
  favHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF0F0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  favHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF3040",
  },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    display: "flex",
    gap: 10,
  },
  scrollContainer: {
    flexDirection: "row",
    display: "flex",
    gap: 10,
    paddingRight: 16, // to give space at the end
  },
  filterIcon: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 0.5,
    borderColor: "#ddd",
  },
  activeFilter: {
    backgroundColor: "#0056B3",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    paddingLeft: 24,
    paddingRight: 16,
    paddingVertical: 8,
    marginRight: 10,
    maxWidth: 127,
    maxHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  activeFilterText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "400",
    marginRight: 4,
  },
  inactiveFilter: {
    backgroundColor: "#ECECEC",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 127,
    maxHeight: 44,
    justifyContent: "center",
  },
  inactiveFilterText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "400",
  },
  tabSection: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 4,
  },
  tabText: {
    marginRight: 16,
    fontSize: 16,
    color: "#555",
  },
  activeTab: {
    color: "#FF6B00",
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B00",
  },
  imageContainer: {
    position: "relative",
    height: 180,
    backgroundColor: "#E8EDF2",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  venueImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  ratingBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  offerBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF6A00",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  distanceBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#333",
  },
  cardContent: {
    padding: 14,
    gap: 8,
  },
  venueTitle: {
    color: "#1A1A1A",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
  },
  locationText: {
    color: "#78909C",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    lineHeight: 18,
  },
  clubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  clubText: {
    color: "#FF6A00",
    fontSize: 12,
    fontWeight: "600",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  tagWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  tagIcon: {
    width: 14,
    height: 14,
    resizeMode: "contain",
  },
  tagText: {
    fontSize: 12,
    color: "#546E7A",
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
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

export default PlayerVenue;
