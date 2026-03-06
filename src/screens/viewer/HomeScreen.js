import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ImageBackground,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import Swiper from "react-native-swiper";
import colors from "../../config/colors";

// New import for the tournaments config
import tournamentsConfig from "../../api/tournaments";

const HomeScreen = ({ navigation }) => {
  // State for dynamic data
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [sportsCategories, setSportsCategories] = useState([]);
  const [loading, setLoading] = useState(true);
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
            ? `${tournamentsConfig.ENDPOINTS.BASE.replace('/api/tournaments', '')}/uploads/tournaments/${event.tournamentLogo}`
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
    }
  };

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
      onPress={() => handleEventPress(item)}
    >
      <ImageBackground
        source={
          imageErrors[item.id] || !item.image
            ? require("../../../assets/tournament-banner.jpg")
            : { uri: item.image }
        }
        style={styles.cardImage}
        imageStyle={{ borderRadius: 16 }}
        resizeMode="cover"
        onError={() => handleImageError(item.id)}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
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
            <MaterialIcons name="calendar-today" size={14} color="#666" />
            <Text style={styles.metaText}>{item.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={14} color="#666" />
            <Text style={styles.metaText}>{item.time || "TBA"}</Text>
          </View>
        </View>
        <View style={styles.cardOrganizerRow}>
          <MaterialIcons name="business" size={14} color="#004E93" />
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
        <Ionicons name={item.icon} size={28} color="#004E93" />
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
      <FlatList
        data={[]} // Empty data since we use Header and Footer for sections
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={
          <>
            <View style={styles.modernHeader}>
              <LinearGradient
                colors={['#34A4FA', '#3B4DFD']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.headerGradient}
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
                    <MaterialIcons name="person-outline" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchBarWrapper}>
                  <MaterialIcons name="search" size={20} color="#999" />
                  <TextInput
                    placeholder="Search tournaments, sports..."
                    placeholderTextColor="#999"
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
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                        style={styles.slideGradient}
                      >
                        <View style={styles.slideInfoContainer}>
                          <Text style={styles.premiumSlideTitle}>{slide.title}</Text>
                          <Text style={styles.premiumSlideSubtitle}>{slide.subtitle}</Text>
                          <View style={styles.premiumSlideButton}>
                            <Text style={styles.premiumSlideButtonText}>{slide.buttonText}</Text>
                            <MaterialIcons name="chevron-right" size={20} color="#252944" />
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </Swiper>
            </View>
          </>
        }
        ListFooterComponent={
          <>
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
                    <ActivityIndicator size="large" color="#0056d2" />
                    <Text style={styles.loadingText}>Loading events...</Text>
                  </View>
                ) : featuredEvents.length > 0 ? (
                  featuredEvents.map((item) => renderEventCard(item))
                ) : (
                  <View style={styles.noDataContainer}>
                    <MaterialIcons name="event-busy" size={48} color="#ccc" />
                    <Text style={styles.noDataText}>No events currently available</Text>
                  </View>
                )}
              </View>

              <View style={styles.featuresSection}>
                <Text style={styles.heading}>Why Join Us?</Text>

                <View style={styles.featureCard}>
                  <View style={styles.featureIconBox}>
                    <Ionicons name="trophy-outline" size={24} color="#FF6A00" />
                  </View>
                  <View style={styles.featureTextBox}>
                    <Text style={styles.featureTitle}>Find Tournaments</Text>
                    <Text style={styles.featureDesc}>Discover and register for tournaments happening near you.</Text>
                  </View>
                </View>

                <View style={styles.featureCard}>
                  <View style={styles.featureIconBox}>
                    <Ionicons name="fitness-outline" size={24} color="#FF6A00" />
                  </View>
                  <View style={styles.featureTextBox}>
                    <Text style={styles.featureTitle}>Showcase Achievements</Text>
                    <Text style={styles.featureDesc}>Track progress, celebrate wins, and share with friends.</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => navigation.navigate("Account", { screen: "Register" })}
                >
                  <Text style={styles.primaryActionText}>Sign Up Now</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containers: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  modernHeader: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#004E93',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    marginBottom: 5,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginTop: 10,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  carouselWrapper: {
    height: 220,
    marginVertical: 20,
  },
  swiperContainer: {
    height: 200,
  },
  slideItem: {
    width: '100%',
    paddingHorizontal: 20,
  },
  slideInner: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
  },
  slideBackgroundImage: {
    borderRadius: 20,
  },
  slideGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  slideInfoContainer: {
    marginBottom: 10,
  },
  premiumSlideTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  premiumSlideSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  premiumSlideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  premiumSlideButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#252944',
    marginRight: 4,
  },
  customDot: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  customActiveDot: {
    backgroundColor: '#fff',
    width: 16,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  paginationStyle: {
    bottom: -15,
  },
  contentBody: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#252944',
  },
  viewAllText: {
    fontSize: 14,
    color: '#0056d2',
    fontWeight: '600',
  },
  eventsContainer: {
    marginBottom: 30,
  },
  modernEventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    overflow: 'hidden',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#004E93',
    textTransform: 'uppercase',
  },
  priceBadge: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 12,
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
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  cardOrganizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 12,
    color: '#004E93',
    fontWeight: '600',
    marginLeft: 5,
  },
  featuresSection: {
    marginTop: 10,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#252944',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  primaryActionButton: {
    backgroundColor: '#FF6A00',
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 4,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  noDataText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
});

export default HomeScreen;
