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
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../../config/colors";
import TOURNAMENTS from "../../api/tournaments";
import API from "../../api/api";

const EventsScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
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
    const tournamentSport = tournament.sportsType || tournament.sport || tournament.type || "";
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
      style={styles.modernEventCard}
      onPress={() =>
        navigation.navigate("EventDetails", { tournamentId: item._id })
      }
    >
      <ImageBackground
        source={
          imageErrors[item._id] || !item.logo
            ? require("../../../assets/tournament-banner.jpg")
            : { uri: `${API.UPLOADS_URL}/${item.logo}` }
        }
        style={styles.cardImage}
        imageStyle={{ borderRadius: 16 }}
        resizeMode="cover"
        onError={() => handleImageError(item._id)}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeaderInfo}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{item.sportsType || item.type || "Sport"}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>₹{item.tournamentFee || "Free"}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.cardBottomInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={14} color="#666" />
            <Text style={styles.metaText}>
              {item.selectedDate
                ? new Date(item.selectedDate).toLocaleDateString()
                : "TBD"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="location-pin" size={14} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.eventLocation || "Venue TBD"}
            </Text>
          </View>
        </View>
        <View style={styles.cardOrganizerRow}>
          <MaterialIcons name="business" size={14} color="#004E93" />
          <Text style={styles.organizerText}>{item.organizerName || "Official Event"}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.modernHeader}>
        <LinearGradient
          colors={['#34A4FA', '#3B4DFD']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Events</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.searchBarWrapper}>
            <MaterialIcons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search by name or location..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons name="close" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#0056d2" />
            <Text style={styles.loadingText}>Loading tournaments...</Text>
          </View>
        ) : filteredTournaments.length > 0 ? (
          <FlatList
            data={filteredTournaments}
            renderItem={renderEventItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.eventsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.noEventsContainer}>
            <MaterialIcons name="event-busy" size={64} color="#ccc" />
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
    backgroundColor: "#F8F9FB",
  },
  modernHeader: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#004E93',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 10,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  contentSection: {
    flex: 1,
  },
  eventsList: {
    padding: 20,
    paddingTop: 20,
  },
  modernEventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardImage: {
    height: 160,
    width: '100%',
  },
  cardGradient: {
    flex: 1,
    padding: 15,
    justifyContent: 'flex-start',
  },
  cardHeaderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#004E93',
    textTransform: 'uppercase',
  },
  priceBadge: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBottomInfo: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  cardOrganizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 5,
  },
  organizerText: {
    fontSize: 13,
    color: '#004E93',
    fontWeight: '600',
    marginLeft: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 15,
    color: '#666',
  },
  noEventsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noEventsText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#252944',
    marginTop: 20,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
});

export default EventsScreen;
