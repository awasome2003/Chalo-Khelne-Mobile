import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSportName } from "../../utils/sportTrack";
import TOURNAMENTS from "../../api/tournaments";
import { assetUrl } from "../../utils/assetUrl";

// ─── Green design system ───────────────────────────────────────────────
const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const GREEN_TINT = "#E8F7F0";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEEEFF";
const FIELD_BG = "#F4F4F5";
const SCREEN_BG = "#FFFFFF";

const EventsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(TOURNAMENTS.ENDPOINTS.BASE);
      const data = await response.json();

      // Sort tournaments by date (newest first)
      const sortedTournaments = data.sort((a, b) => {
        // Try to sort by selectedDate, then startDate, then endDate, then createdAt, then _id
        const dateA = new Date(a.selectedDate || a.startDate || a.endDate || a.createdAt || a._id);
        const dateB = new Date(b.selectedDate || b.startDate || b.endDate || b.createdAt || b._id);

        // Sort in descending order (newest first)
        return dateB - dateA;
      });

      setTournaments(sortedTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      setError("Failed to load events. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  // Helper function to normalize location data for searching
  const normalizeLocation = (location) => {
    if (!location) return "";

    if (typeof location === "string") {
      return location;
    } else if (Array.isArray(location)) {
      // If it's an array, join all elements into a string
      return location.map(item => {
        if (typeof item === "string") {
          return item;
        } else if (typeof item === "object" && item !== null) {
          // If it's an object, try to get name, title, or address properties
          return item.name || item.title || item.address || item._id || JSON.stringify(item);
        }
        return String(item);
      }).join(" ");
    } else if (typeof location === "object") {
      // If it's an object, try to get name, title, or address properties
      return location.name || location.title || location.address || location._id || JSON.stringify(location);
    }

    return String(location);
  };

  // Categories for filter
  // const categories = [
  //   { id: "all", name: "All Sports" },
  //   { id: "cricket", name: "Cricket" },
  //   { id: "football", name: "Football" },
  //   { id: "tennis", name: "Tennis" },
  //   { id: "badminton", name: "Badminton" },
  //   { id: "table-tennis", name: "Table Tennis" },
  //   { id: "basketball", name: "Basketball" },
  //   { id: "volleyball", name: "Volleyball" },
  // ];

  // Filter events based on search query and selected category
  const filteredTournaments = tournaments.filter((tournament) => {
    const tournamentTitle = tournament.title && typeof tournament.title === "string"
      ? tournament.title
      : "";

    const tournamentLocation = normalizeLocation(tournament.eventLocation || tournament.location || tournament.address);

    const matchesSearch =
      tournamentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tournamentLocation.toLowerCase().includes(searchQuery.toLowerCase());

    // Check if tournament matches selected category
    // Try different possible fields that might contain the sport type
    const tournamentSport = getSportName(tournament) || tournament.sport || "";
    const matchesCategory = selectedCategory === "all" ||
      tournamentSport.toLowerCase().includes(selectedCategory.toLowerCase());

    return matchesSearch && matchesCategory;
  });

  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (id) => {
    setImageErrors((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  const renderEventItem = ({ item }) => (
    <TouchableOpacity
      style={styles.eventCard}
      activeOpacity={0.9}
      onPress={() =>
        navigation.navigate("EventDetails", { tournamentId: item._id })
      }
    >
      <ImageBackground
        source={
          imageErrors[item._id] || !item.logo
            ? require("../../../assets/tournament-banner.jpg")
            : { uri: assetUrl(item.logo) }
        }
        style={styles.cardImage}
        imageStyle={styles.cardImageRadius}
        resizeMode="cover"
        onError={() => handleImageError(item._id)}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.45)"]}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeaderInfo}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>
                {item.sportsType || item.type || "Sport"}
              </Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>
                {item.tournamentFee ? `₹${item.tournamentFee}` : "Free"}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.cardBottomInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={14} color={TEXT_MUTED} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.selectedDate
                ? new Date(item.selectedDate).toLocaleDateString()
                : "TBD"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="location-pin" size={14} color={TEXT_MUTED} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.eventLocation || "Venue TBD"}
            </Text>
          </View>
        </View>
        <View style={styles.cardOrganizerRow}>
          <MaterialIcons name="business" size={14} color={GREEN} />
          <Text style={styles.organizerText} numberOfLines={1}>
            {item.organizerName || "Official Event"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={TEXT_DARK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Events</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor={TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.loadingText}>Loading tournaments...</Text>
          </View>
        ) : error ? (
          <View style={styles.noEventsContainer}>
            <MaterialIcons name="error-outline" size={56} color="#D1D5DB" />
            <Text style={styles.noEventsText}>Something went wrong</Text>
            <Text style={styles.noEventsSubtext}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchTournaments}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredTournaments.length > 0 ? (
          <FlatList
            data={filteredTournaments}
            renderItem={renderEventItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={[
              styles.eventsList,
              { paddingBottom: insets.bottom + 110 },
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[GREEN]}
                tintColor={GREEN}
              />
            }
          />
        ) : (
          <View style={styles.noEventsContainer}>
            <MaterialIcons name="event-busy" size={56} color="#D1D5DB" />
            <Text style={styles.noEventsText}>No Events Found</Text>
            <Text style={styles.noEventsSubtext}>
              We couldn't find any events matching your current search.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: SCREEN_BG,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  // Content
  contentSection: {
    flex: 1,
  },
  eventsList: {
    paddingHorizontal: 16,
    paddingTop: 6,
  },

  // Event card
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    height: 160,
    width: "100%",
    backgroundColor: FIELD_BG,
  },
  cardImageRadius: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "flex-start",
  },
  cardHeaderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sportBadge: {
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sportBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    textTransform: "uppercase",
  },
  priceBadge: {
    backgroundColor: GREEN_TINT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priceBadgeText: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: GREEN_DARK,
  },
  cardBottomInfo: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    flex: 1,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    flexShrink: 1,
  },
  cardOrganizerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 4,
    gap: 4,
  },
  organizerText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN,
    flex: 1,
  },

  // States
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noEventsText: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 16,
  },
  noEventsSubtext: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 18,
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
});

export default EventsScreen;
