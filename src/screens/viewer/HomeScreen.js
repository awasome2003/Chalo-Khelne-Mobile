import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Swiper from "react-native-swiper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// New import for the tournaments config
import tournamentsConfig from "../../api/tournaments";
import { assetUrl } from "../../utils/assetUrl";

// ─── Green design system tokens ─────────────────────────────────────
const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const GREEN_TINT = "#E8F7F0";
const AMBER = "#F59E0B";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEEEFF";
const FIELD_BG = "#F4F4F5";
const SCREEN_BG = "#FFFFFF";

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  // State for dynamic data
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [sportsCategories, setSportsCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  // State for tracking image loading errors
  const [imageErrors, setImageErrors] = useState({});

  // Map sports categories to appropriate icons
  const sportIconMap = {
    "Table Tennis": "tennisball-outline",
    Cricket: "baseball-outline",
    Football: "football-outline",
    Basketball: "basketball-outline",
    Volleyball: "american-football-outline",
    Tennis: "tennisball-outline",
    Badminton: "tennisball-outline",
    // Add more mappings as needed
  };

  // Helper function to get an icon for a sport
  const getSportIcon = (sportName) => {
    return sportIconMap[sportName] || "fitness-outline"; // Default icon
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch featured tournaments/events
      const eventsResponse = await fetch(tournamentsConfig.ENDPOINTS.BASE);
      if (!eventsResponse.ok) throw new Error("Failed to fetch events");

      const eventsData = await eventsResponse.json();

      // Sort events by date (newest first) before taking the first 3
      const sortedEventsData = eventsData.sort((a, b) => {
        // Get dates for comparison - prioritize selectedDate, then startDate, then endDate
        const dateA = new Date(a.selectedDate || a.startDate || a.endDate || a.createdAt || a._id);
        const dateB = new Date(b.selectedDate || b.startDate || b.endDate || b.createdAt || b._id);

        // Sort in descending order (newest first)
        return dateB - dateA;
      });

      // Process the first 3 most recent events
      const processedEvents = sortedEventsData.slice(0, 3).map((event) => {
        // Pick a display date: selectedDate > startDate > endDate
        const rawDate = event.selectedDate || event.startDate || event.endDate;

        const formattedDate = rawDate
          ? new Date(rawDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
          : "Coming Soon";

        return {
          id: event._id,
          title: event.title,
          date: formattedDate,
          time:
            event.selectedTime?.startTime && event.selectedTime?.endTime
              ? `${event.selectedTime.startTime} - ${event.selectedTime.endTime}`
              : null,
          location:
            event.eventLocation ||
            (Array.isArray(event.turfs) && event.turfs.length > 0
              ? `Turf: ${event.turfs[0]}`
              : event.selectedCourt || "TBA"),
          fee:
            typeof event.tournamentFee === "number"
              ? event.tournamentFee
              : event.tournamentFee || "Free",
          type: event.type || "Tournament",
          sportsType: event.sportsType || "Sports",
          organizer: event.organizerName || "Unknown Organizer",
          image: event.tournamentLogo
            ? assetUrl("tournaments/" + event.tournamentLogo)
            : "https://placehold.co/600x400", // Use actual tournament logo if available
        };
      });

      setFeaturedEvents(processedEvents);

      // Fetch sports categories
      // Extract from tournaments
      const uniqueSports = [
        ...new Set(eventsData.map((event) => event.sportsType)),
      ];
      const categoriesData = uniqueSports
        .filter((sport) => sport) // Remove null/undefined entries
        .map((sport, index) => ({
          id: String(index + 1),
          name: sport,
          icon: getSportIcon(sport),
        }));

      setSportsCategories(
        categoriesData.length > 0
          ? categoriesData
          : [
            { id: "1", name: "Table Tennis", icon: "tennisball-outline" },
            { id: "2", name: "Cricket", icon: "baseball-outline" },
            { id: "3", name: "Football", icon: "football-outline" },
            { id: "4", name: "Basketball", icon: "basketball-outline" },
          ]
      );
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Please try again later.");
      // Use fallback data if fetch fails
      setFeaturedEvents([
        {
          id: "2",
          title: "Regional Cricket Tournament",
          date: "April 20-25, 2025",
          time: "10:00 AM - 5:00 PM",
          location: "Central Sports Club",
          fee: 500,
          type: "Tournament",
          sportsType: "Cricket",
          organizer: "Regional Sports Club",
          image: "https://placehold.co/600x400",
        },
        {
          id: "1",
          title: "City Table Tennis Championship",
          date: "April 15-16, 2025",
          time: "9:00 AM - 6:00 PM",
          location: "Sports Complex, Downtown",
          fee: 300,
          type: "Tournament",
          sportsType: "Table Tennis",
          organizer: "City Sports Association",
          image: "https://placehold.co/600x400",
        },
      ]);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  // const handleCategoryPress = (category) => {
  //   // Navigate to events filtered by this category
  //   navigation.navigate("Events", { sportType: category.name });
  // };

  const handleCategoryPress = (category) => {
    // Navigate to events filtered by this category
    navigation.navigate("Event", {
      screen: "ViewerEvents",
      params: { sportType: category.name },
    });
  };

  const { width } = Dimensions.get("window");

  const slides = [
    {
      image: require("../../../assets/Home1.jpg"),
      title: "Explore Upcoming Events",
      subtitle: "Join the latest tournaments near you",
      buttonText: "Find Events",
      route: "Events"
    },
    {
      image: require("../../../assets/Home2.jpg"),
      title: "Stay Connected",
      subtitle: "Share your sports journey with everyone",
      buttonText: "Go Social",
      route: "Social"
    },
  ];

  const handleEventPress = (event) => {
    navigation.navigate("Event", {
      screen: "EventDetails",
      params: { tournamentId: event.id },
      initial: false,
    });
  };

  const renderEventCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.modernEventCard}
      activeOpacity={0.9}
      onPress={() => handleEventPress(item)}
    >
      <ImageBackground
        source={
          imageErrors[item.id] || !item.image
            ? require("../../../assets/tournament-banner.jpg")
            : { uri: item.image }
        }
        style={styles.cardImage}
        imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        resizeMode="cover"
        onError={() => handleImageError(item.id)}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeaderInfo}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{item.sportsType}</Text>
            </View>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>₹{item.fee}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.cardBottomInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={14} color={TEXT_MUTED} />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={14} color={TEXT_MUTED} />
            <Text style={styles.metaText}>{item.time || "TBA"}</Text>
          </View>
        </View>
        <View style={styles.cardOrganizerRow}>
          <MaterialIcons name="business" size={14} color={GREEN_DARK} />
          <Text style={styles.organizerText}>{item.organizer}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSportCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={styles.categoryIcon}>
        <Ionicons name={item.icon} size={28} color={GREEN} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  // Handle image loading error
  const handleImageError = (id) => {
    setImageErrors((prev) => ({
      ...prev,
      [id]: true,
    }));
  };

  return (
    <View style={styles.containers}>
      {/* Main Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        <View style={styles.modernHeader}>
          <LinearGradient
            colors={["#22B873", "#0F8A55"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
          >
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greetingText}>Welcome to,</Text>
                <Text style={styles.userNameText}>Chalo Khelne</Text>
              </View>
              <TouchableOpacity
                style={styles.notificationBtn}
                onPress={() => navigation.navigate("Account")}
              >
                <MaterialIcons name="person-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBarWrapper}>
              <MaterialIcons name="search" size={20} color={TEXT_MUTED} />
              <TextInput
                placeholder="Search tournaments, sports..."
                placeholderTextColor={TEXT_MUTED}
                style={styles.searchBarInput}
                onSubmitEditing={(event) => {
                  navigation.navigate("Event", {
                    screen: "ViewerEvents",
                    params: { query: event.nativeEvent.text },
                  });
                }}
              />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.carouselWrapper}>
          <Swiper
            showsPagination
            dotStyle={styles.customDot}
            activeDotStyle={styles.customActiveDot}
            autoplay
            autoplayTimeout={6}
            containerStyle={styles.swiperContainer}
            paginationStyle={styles.paginationStyle}
          >
            {slides.map((slide, index) => (
              <TouchableOpacity
                key={index}
                style={styles.slideItem}
                activeOpacity={0.9}
                onPress={() => {
                  navigation.navigate("Event");
                }}
              >
                <ImageBackground
                  source={slide.image}
                  imageStyle={styles.slideBackgroundImage}
                  style={styles.slideInner}
                >
                  <LinearGradient
                    colors={["rgba(0,0,0,0.05)", "rgba(15,138,85,0.85)"]}
                    style={styles.slideGradient}
                  >
                    <View style={styles.slideInfoContainer}>
                      <Text style={styles.premiumSlideTitle}>{slide.title}</Text>
                      <Text style={styles.premiumSlideSubtitle}>{slide.subtitle}</Text>
                      <View style={styles.premiumSlideButton}>
                        <Text style={styles.premiumSlideButtonText}>{slide.buttonText}</Text>
                        <MaterialIcons name="chevron-right" size={20} color={GREEN_DARK} />
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </Swiper>
        </View>

        <View style={styles.contentBody}>
          <View style={styles.sectionHeader}>
            <Text style={styles.heading}>Featured Events</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Event")}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.eventsContainer}>
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={GREEN} />
                <Text style={styles.loadingText}>Loading events...</Text>
              </View>
            ) : featuredEvents.length > 0 ? (
              featuredEvents.map((item) => renderEventCard(item))
            ) : (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="event-busy" size={48} color="#D1D5DB" />
                <Text style={styles.noDataText}>No events currently available</Text>
              </View>
            )}
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.heading}>Why Join Us?</Text>

            <View style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Ionicons name="trophy-outline" size={24} color={GREEN} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Find Tournaments</Text>
                <Text style={styles.featureDesc}>Discover and register for tournaments happening near you.</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Ionicons name="fitness-outline" size={24} color={GREEN} />
              </View>
              <View style={styles.featureTextBox}>
                <Text style={styles.featureTitle}>Showcase Achievements</Text>
                <Text style={styles.featureDesc}>Track progress, celebrate wins, and share with friends.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              activeOpacity={0.9}
              onPress={() => navigation.navigate("Account", { screen: "Register" })}
            >
              <Text style={styles.primaryActionText}>Sign Up Now</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  containers: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  modernHeader: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    elevation: 10,
    shadowColor: GREEN_DARK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    marginBottom: 5,
  },
  headerGradient: {
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  userNameText: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    color: "#fff",
    fontWeight: "800",
  },
  notificationBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginTop: 10,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },
  carouselWrapper: {
    height: 220,
    marginVertical: 20,
  },
  swiperContainer: {
    height: 200,
  },
  slideItem: {
    width: "100%",
    paddingHorizontal: 16,
  },
  slideInner: {
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
  },
  slideBackgroundImage: {
    borderRadius: 20,
  },
  slideGradient: {
    flex: 1,
    padding: 20,
    justifyContent: "flex-end",
  },
  slideInfoContainer: {
    marginBottom: 10,
  },
  premiumSlideTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: "#fff",
  },
  premiumSlideSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  premiumSlideButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  premiumSlideButtonText: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: GREEN_DARK,
    marginRight: 4,
  },
  customDot: {
    backgroundColor: "rgba(255,255,255,0.4)",
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  customActiveDot: {
    backgroundColor: "#fff",
    width: 16,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  paginationStyle: {
    bottom: -15,
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  heading: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    color: GREEN,
    fontWeight: "700",
  },
  eventsContainer: {
    marginBottom: 30,
  },
  modernEventCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: "hidden",
  },
  cardImage: {
    height: 150,
    width: "100%",
  },
  cardGradient: {
    flex: 1,
    padding: 14,
    justifyContent: "flex-start",
  },
  cardHeaderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sportBadge: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: GREEN_DARK,
    textTransform: "uppercase",
  },
  priceBadge: {
    backgroundColor: GREEN,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#fff",
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
    marginRight: 15,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginLeft: 5,
  },
  cardOrganizerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  organizerText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: GREEN_DARK,
    fontWeight: "600",
    marginLeft: 5,
  },
  featuresSection: {
    marginTop: 10,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    lineHeight: 18,
  },
  primaryActionButton: {
    backgroundColor: GREEN,
    flexDirection: "row",
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryActionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    marginRight: 10,
  },
  // Sport category (preserved render helper styles)
  categoryCard: {
    alignItems: "center",
    marginRight: 16,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },
  loaderContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  noDataContainer: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  noDataText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
});

export default HomeScreen;
