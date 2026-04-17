import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../api/api";
import TournamentConfig from "../../api/tournaments";
import { useAuth } from "../../context/AuthContext";
import LeaderboardScreen from './LeaderboardScreen';
import Website_SERVER_URL from "../../api/api";

const { width } = Dimensions.get("window");
const { height: screenHeight } = Dimensions.get("window");

const Event = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("Events");
  const [activeSubTab, setActiveSubTab] = useState("Live");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tournaments, setTournaments] = useState([]);
  const [upcomingTournaments, setUpcomingTournaments] = useState([]);
  const [pastTournaments, setPastTournaments] = useState([]);
  const [registeredTournaments, setRegisteredTournaments] = useState([]);
  const [filteredTournaments, setFilteredTournaments] = useState([]);
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  // Tab animation
  const tabValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(tabValue, {
      toValue: activeTab === "Events" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeTab]);

  // Helper: parse date safely from various formats
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/").map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateStr); // ISO YYYY-MM-DD fallback
  };

  // Helper function to determine tournament status
  const getTournamentStatus = (tournament) => {
    const now = new Date();
    const startDate = parseDate(tournament.startDate) || parseDate(tournament.selectedDate);
    const endDate = parseDate(tournament.endDate) || startDate;

    if (!startDate) return "Unknown";

    // Ensure we have valid date objects
    if (isNaN(startDate.getTime())) return "Unknown";

    // For endDate, if not provided, we consider it as single-day event
    const endDateTime = endDate && !isNaN(endDate.getTime()) ? endDate : startDate;

    // Set time to start of day for date comparison only
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create date objects without time for proper date comparison
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(endDateTime);
    endDay.setHours(0, 0, 0, 0);

    if (endDay < today) {
      // Tournament has ended
      return "Past";
    } else if (startDay <= today && endDay >= today) {
      // Currently ongoing (including today as start day or end day)
      return "Live";
    } else if (startDay > today) {
      // Starts in the future
      return "Upcoming";
    }

    return "Unknown";
  };

  // Fetch tournaments from API
  useEffect(() => {
    fetchTournaments();
  }, []);
  // Fetch registered tournaments after we have tournament data
  useEffect(() => {
    if (tournaments.length > 0) {
      fetchRegisteredTournaments();
    }
  }, [tournaments]);

  // Re-fetch tournaments when registered tournaments change to update live tab
  useEffect(() => {
    if (registeredTournaments.length >= 0) {
      // Update the live tournaments display by filtering out registered ones
      // We don't need to re-fetch from the server, just update the display
      setFilteredTournaments(prev => [...prev]); // Trigger re-render
    }
  }, [registeredTournaments]);

  // Filter tournaments when search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = tournaments.filter(
        (tournament) =>
          (tournament.title || tournament.name || "NA")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (tournament.type || "NA")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (tournament.sportsType || "NA")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (tournament.eventLocation || "NA")
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
      setFilteredTournaments(filtered);
    } else {
      setFilteredTournaments(tournaments);
    }
  }, [searchQuery, tournaments]);

  // Fetch tournaments and separate upcoming tournaments
  const fetchTournaments = async (searchQuery = "", isRefreshing = false) => {
    try {
      // Set loading state based on whether this is a refresh or initial load
      if (!isRefreshing) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await axios.get(TournamentConfig.ENDPOINTS.BASE);
      const tournaments = response.data || [];

      if (!tournaments.length) {
        setTournaments([]);
        setUpcomingTournaments([]);
        setFilteredTournaments([]);
        return;
      }

      const now = new Date();

      // Categorize tournaments based on their status
      let liveTournaments = [];
      let upcoming = [];
      let past = [];

      tournaments.forEach((tournament) => {
        const status = getTournamentStatus(tournament);

        switch (status) {
          case "Live":
            liveTournaments.push(tournament);
            break;
          case "Upcoming":
            upcoming.push(tournament);
            break;
          case "Past":
            past.push(tournament);
            break;
          default:
            // Handle unknown status - default to past to be safe
            past.push(tournament);
        }
      });

      // Optional search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        liveTournaments = liveTournaments.filter((t) =>
          (t.title || t.name || "").toLowerCase().includes(q) ||
          (t.type || t.sportsType || "").toLowerCase().includes(q)
        );
        upcoming = upcoming.filter((t) =>
          (t.title || t.name || "").toLowerCase().includes(q) ||
          (t.type || t.sportsType || "").toLowerCase().includes(q)
        );
        past = past.filter((t) =>
          (t.title || t.name || "").toLowerCase().includes(q) ||
          (t.type || t.sportsType || "").toLowerCase().includes(q)
        );
      }

      // Sort live tournaments by createdAt (newest first)
      liveTournaments.sort((a, b) => {
        // Try to sort by createdAt if available, otherwise by startDate
        const dateA = new Date(a.createdAt || a.startDate || a.selectedDate || 0);
        const dateB = new Date(b.createdAt || b.startDate || b.selectedDate || 0);
        return dateB - dateA; // Descending order (newest first)
      });

      // Sort upcoming by nearest date
      upcoming.sort((a, b) => {
        const dateA = parseDate(a.startDate) || parseDate(a.selectedDate);
        const dateB = parseDate(b.startDate) || parseDate(b.selectedDate);
        return dateA - dateB;
      });

      // Sort past by most recent first (newest first)
      past.sort((a, b) => {
        const dateA = parseDate(a.endDate) || parseDate(a.startDate) || parseDate(a.selectedDate);
        const dateB = parseDate(b.endDate) || parseDate(b.startDate) || parseDate(b.selectedDate);
        return dateB - dateA; // Descending order
      });

      // Format all tournaments for UI with status information
      const formattedTournaments = liveTournaments.map((t) => formatTournamentData(t));
      const formattedUpcoming = upcoming.map((t) => formatTournamentData(t));
      const formattedPast = past.map((t) => formatTournamentData(t));

      setTournaments(formattedTournaments);
      setUpcomingTournaments(formattedUpcoming);
      setPastTournaments(formattedPast);
      setFilteredTournaments(formattedTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      Alert.alert("Error", "Failed to load tournaments. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRegisteredTournaments = async () => {
    // Check if user exists and authenticated
    if (!isAuthenticated || !user || (!user.id && !user._id)) {
      setRegisteredTournaments([]);
      return;
    }

    // Get the user ID
    const userId = user.id || user._id;

    try {
      // Fetch user's tournament bookings
      const bookingsEndpoint =
        TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId);
      const response = await axios.get(bookingsEndpoint);

      // Normalize response into an array
      const bookings = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data?.bookings)
            ? response.data.bookings
            : [];

      if (bookings.length === 0) {
        setRegisteredTournaments([]);
        return;
      }

      // Process each booking to create tournament cards
      const registeredTourneys = await Promise.all(
        bookings.map(async (booking) => {
          // Validate booking has tournamentId
          if (!booking.tournamentId) {
            return null;
          }

          try {
            // Try to get full tournament details
            const tId = booking.tournamentId?._id || booking.tournamentId;
            if (!tId || tId === "NA") return null;

            const tournamentEndpoint = TournamentConfig.ENDPOINTS.BY_ID(tId);

            try {
              const tournamentResponse = await axios.get(tournamentEndpoint);

              // Handle response formats: {success: true, tournament: {...}} or direct data
              const tournamentData = tournamentResponse.data.tournament || tournamentResponse.data.data || tournamentResponse.data;

              // Format tournament data with full API response
              return formatTournamentData(
                tournamentData,
                true,
                booking
              );
            } catch (tournamentError) {
              // If tournament doesn't exist (404) or is deleted, skip it
              return null; // Don't show deleted tournaments
            }
          } catch (error) {
            // Handle any other unexpected errors
            console.error(
              `Error processing tournament ${booking.tournamentId}:`,
              error
            );
            return null; // Don't show tournaments that error out
          }
        })
      );

      // Filter out null/undefined entries and set registered tournaments
      const validTournaments = (registeredTourneys || []).filter(
        (item) => !!item
      );
      setRegisteredTournaments(validTournaments);
    } catch (error) {
      console.error("Error fetching registered tournaments:", error);
      setRegisteredTournaments([]);
    }
  };

  // // Helper function to create fallback tournament object
  // const createFallbackTournamentObject = (booking) => {
  //   // Format date range
  //   const formatDate = (dateStr) => {
  //     if (!dateStr) return "N/A";

  //     try {
  //       const date = new Date(dateStr);
  //       const day = date.getDate();
  //       const month = date.toLocaleString("default", { month: "short" });

  //       const getSuffix = (d) => {
  //         if (d > 3 && d < 21) return "th";
  //         switch (d % 10) {
  //           case 1:
  //             return "st";
  //           case 2:
  //             return "nd";
  //           case 3:
  //             return "rd";
  //           default:
  //             return "th";
  //         }
  //       };

  //       return `${month} ${day}${getSuffix(day)}`;
  //     } catch {
  //       return "N/A";
  //     }
  //   };

  //   return {
  //     id: booking.tournamentId || "unknown",
  //     name: booking.tournamentName || "Tournament",
  //     type: booking.tournamentType || "Tournament",
  //     date: formatDate(booking.tournamentDate || booking.date),
  //     startTime: booking.startTime || booking.tournamentStartTime || "10:00 AM",
  //     bookingClose: formatDate(booking.bookingCloseDate),
  //     price: booking.tournamentFee || booking.price || "N/A",
  //     club: booking.venue || booking.clubName || "N/A",
  //     address: booking.location || booking.address || "N/A",
  //     image: require("../../../assets/tournament-banner.jpg"),
  //     booking: booking,
  //   };
  // };

  const normalizeLocation = (eventLocation) => {
    if (!eventLocation) return "Location Not Specified";

    // If it's a string that might be a JSON representation of an array
    if (typeof eventLocation === "string") {
      // Check if it looks like a JSON array
      if (eventLocation.startsWith("[") && eventLocation.endsWith("]")) {
        try {
          // Parse the JSON string
          const parsed = JSON.parse(eventLocation);
          if (Array.isArray(parsed)) {
            // Recursively normalize the parsed array
            return normalizeLocation(parsed);
          }
        } catch (e) {
          // If parsing fails, treat as regular string
          return eventLocation.trim();
        }
      }
      return eventLocation.trim();
    }

    // If it's an object with properties (like {name, fee, _id})
    if (typeof eventLocation === "object") {
      // If it's an array of objects/strings, try to extract meaningful values
      if (Array.isArray(eventLocation)) {
        const locationNames = [];

        eventLocation.forEach(item => {
          if (typeof item === "string") {
            // Check if string is a JSON array representation
            if (item.startsWith("[") && item.endsWith("]")) {
              try {
                const parsed = JSON.parse(item);
                if (Array.isArray(parsed)) {
                  // Recursively process the parsed array
                  locationNames.push(normalizeLocation(parsed));
                } else {
                  locationNames.push(String(parsed).trim());
                }
              } catch (e) {
                locationNames.push(item.trim());
              }
            } else {
              locationNames.push(item.trim());
            }
          } else if (typeof item === "object" && item !== null) {
            // Try to get name, title, or address property
            const name = item.name || item.title || item.address || item._id || JSON.stringify(item);
            if (name && typeof name === "string") {
              locationNames.push(name.trim());
            } else if (typeof name === "object") {
              // If name is still an object, recursively normalize it
              locationNames.push(normalizeLocation(name));
            } else {
              locationNames.push(String(name));
            }
          }
        });

        // Join all collected location names
        const result = locationNames.filter(name => name && name !== "" && name !== "Location Not Specified").join(", ");
        return result || "Location Not Specified";
      } else {
        // Single object - try to extract meaningful string
        const name = eventLocation.name || eventLocation.title || eventLocation.address || eventLocation._id || JSON.stringify(eventLocation);
        if (typeof name === "string") {
          return name.trim();
        } else if (typeof name === "object") {
          // If name is an object, recursively normalize it
          return normalizeLocation(name);
        }
        return String(name).trim();
      }
    }

    // For any other type, convert to string
    return String(eventLocation).trim() || "Location Not Specified";
  };

  // Format tournament data for UI
  const formatTournamentData = (tournament, isRegistered = false, booking = null) => {
    if (!tournament || typeof tournament !== "object") {
      return {
        id: "NA",
        name: "NA",
        type: "NA",
        date: "NA",
        startTime: "NA",
        closingDate: "NA",
        price: "NA",
        club: "NA",
        image: require("../../../assets/tournament-banner.jpg"),
        status: "Unknown",
        rawData: {},
      };
    }

    // Date Handling
    let dateRange = "NA";
    let startTime = "NA";
    let closingDateFormatted = "NA";

    const formatDate = (date) => {
      if (!date || isNaN(date.getTime())) return null;
      const day = date.getDate();
      const month = date.toLocaleString("default", { month: "short" });
      const suffix = ["th", "st", "nd", "rd"][(day % 10 > 3 || [11, 12, 13].includes(day)) ? 0 : day % 10] || "th";
      return `${month} ${day}${suffix}`;
    };

    try {
      const start = parseDate(tournament.startDate || tournament.selectedDate);
      const end = parseDate(tournament.endDate);
      if (start && end) dateRange = `${formatDate(start)} - ${formatDate(end)}`;
      else if (start) dateRange = formatDate(start);
      else dateRange = "Date not available";

      const startT = tournament.selectedTime?.startTime || tournament.startTime || "10:00 AM";
      const endT = tournament.selectedTime?.endTime || tournament.endTime || "";
      startTime = endT ? `${startT} - ${endT}` : startT;

      if (start) {
        const closeDate = new Date(start);
        closeDate.setDate(closeDate.getDate() - 1);
        closingDateFormatted = formatDate(closeDate);
      }
    } catch (error) {
      console.error("Error formatting tournament dates:", error);
    }

    const clubName = tournament.organizerName || tournament.clubName || "Organizer Not Specified";
    const location = normalizeLocation(
      tournament.eventLocation || tournament.address || tournament.location
    );
    const price = `₹ ${tournament.tournamentFee ?? 0}`;

    // Determine tournament status
    const status = getTournamentStatus(tournament);

    // Image handling with proper fallback
    let imageUri;
    try {
      if (tournament.tournamentLogo && typeof tournament.tournamentLogo === "string" && tournament.tournamentLogo.trim().length > 0) {
        imageUri = { uri: `${Website_SERVER_URL.Wbsite_SERVER_URL}/uploads/tournaments/${tournament.tournamentLogo}` };
      } else if (tournament.imageUrl && typeof tournament.imageUrl === "string" && tournament.imageUrl.trim().length > 0) {
        imageUri = { uri: `${API.UPLOADS_URL}/${tournament.imageUrl}` };
      } else {
        imageUri = require("../../../assets/tournament-banner.jpg");
      }
    } catch (error) {
      console.error("Error processing tournament image:", error);
      imageUri = require("../../../assets/tournament-banner.jpg");
    }

    return {
      id: tournament._id || "NA",
      name: tournament.title || tournament.name || (booking?.tournamentName) || "Untitled Tournament",
      type: tournament.type || tournament.sportsType || "Tournament",
      date: dateRange,
      startTime,
      closingDate: `Booking closes on: ${closingDateFormatted}`,
      price,
      club: clubName,
      address: location, // Use the location field
      image: imageUri,
      status, // Add the status to the tournament object
      isRegistered,
      booking,
      rawData: tournament,
    };
  };

  // Render tournament card
  const renderTournamentCard = (item) => {
    const handleNavigation = () => {
      navigation.navigate("Tournament Details", { item: item, tournamentId: item.id, isPastTournament: item.status === "Past" });
    };

    const imageSource = (() => {
      if (typeof item?.tournamentLogo === "string" && item.tournamentLogo.trim()) {
        if (item.tournamentLogo.startsWith("http")) return { uri: item.tournamentLogo };
        return { uri: `${Website_SERVER_URL.Wbsite_SERVER_URL}/uploads/tournaments/${item.tournamentLogo}` };
      }
      if (item?.image?.uri) return item.image;
      return require("../../../assets/tournament-banner.jpg");
    })();

    const getStatusColor = (status) => {
      switch (status) {
        case "Live": return "#4CAF50";
        case "Upcoming": return "#FF9800";
        case "Past": return "#757575";
        default: return "#2196F3";
      }
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.modernCard}
        onPress={handleNavigation}
        activeOpacity={0.9}
      >
        <View style={styles.cardImageContainer}>
          <Image source={imageSource} style={styles.modernCardImage} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.cardOverlay}
          />
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusBadgeText}>{item.status}</Text>
            </View>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{item.price}</Text>
          </View>
        </View>

        <View style={styles.modernCardContent}>
          <View style={styles.modernCardHeader}>
            <Text style={styles.modernTournamentName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{item.type}</Text>
            </View>
          </View>

          <View style={styles.modernInfoRow}>
            <View style={styles.modernInfoItem}>
              <MaterialIcons name="calendar-today" size={14} color="#666" />
              <Text style={styles.modernInfoText}>{item.date}</Text>
            </View>
            <View style={styles.modernInfoItem}>
              <MaterialIcons name="access-time" size={14} color="#666" />
              <Text style={styles.modernInfoText}>{item.startTime}</Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={16} color="#004E93" />
            <Text style={styles.locationText} numberOfLines={1}>{item.address}</Text>
          </View>

          {item.status !== "Past" && (
            <Text style={styles.modernClosingDate}>{item.closingDate}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRegistrationCard = (item) => {
    const tournamentId = item.booking?.tournamentId || item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.registrationModernCard}
        onPress={() => {
          const tId = item.booking?.tournamentId?._id || item.booking?.tournamentId || item.id;
          if (tId && tId !== "NA" && tId !== "unknown") {
            const tournamentEndpoint = TournamentConfig.ENDPOINTS.BY_ID(tId);
            axios.get(tournamentEndpoint)
              .then((response) => {
                const tournamentData = response.data.tournament || response.data.data || response.data;
                const enhancedTournament = {
                  ...item,
                  id: tournamentData._id || tournamentId,
                  fullDetails: tournamentData,
                  name: tournamentData.title || tournamentData.name || item.booking?.tournamentName || item.name || "Untitled Tournament",
                  type: tournamentData.type || tournamentData.sportsType || item.booking?.tournamentType || item.type || "Tournament",
                  description: tournamentData.description || "No description available",
                  price: tournamentData.tournamentFee ? `₹ ${tournamentData.tournamentFee}` : item.price || "₹ 0",
                  club: tournamentData.organizerName || tournamentData.clubName || item.club || "Organizer Not Specified",
                  address: normalizeLocation(tournamentData.eventLocation || tournamentData.address || tournamentData.location || item.address) || "Location Not Specified",
                  organizerName: tournamentData.organizerName || "Unknown organizer",
                  date: item.date !== "Date not available" ? item.date : "Date TBA",
                };
                navigation.navigate("RegistrationDetails", {
                  tournament: enhancedTournament,
                  tournamentId: enhancedTournament.id,
                  isPastTournament: enhancedTournament.status === "Past"
                });
              })
              .catch(() => {
                navigation.navigate("RegistrationDetails", {
                  tournament: item,
                  tournamentId: item.id,
                  isPastTournament: item.status === "Past"
                });
              });
          } else {
            navigation.navigate("RegistrationDetails", {
              tournament: item,
              tournamentId: item.id,
              isPastTournament: item.status === "Past"
            });
          }
        }}
      >
        <Image source={item.image} style={styles.registrationModernImage} />
        <View style={styles.registrationModernContent}>
          <View style={styles.regHeaderRow}>
            <Text style={styles.regTitle} numberOfLines={1}>{item.name}</Text>
            <View style={styles.regStatusBadge}>
              <Text style={styles.regStatusText}>{item.booking?.status || "Confirmed"}</Text>
            </View>
          </View>
          <Text style={styles.regType}>{item.type}</Text>

          <View style={styles.regInfoGrid}>
            <View style={styles.regInfoItem}>
              <MaterialIcons name="event" size={14} color="#666" />
              <Text style={styles.regInfoText}>{item.date}</Text>
            </View>
            <View style={styles.regInfoItem}>
              <MaterialIcons name="location-on" size={14} color="#666" />
              <Text style={styles.regInfoText} numberOfLines={1}>{item.address}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollcontainer}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchTournaments(searchQuery, true);
              fetchRegisteredTournaments();
            }}
            colors={["#FF6A00"]}
            tintColor="#FF6A00"
            progressViewOffset={insets.top + 20}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={['#004E93', '#007AFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.premiumHeader, { paddingTop: insets.top + 30, paddingBottom: 60 }]}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Tournament Arena</Text>
              <Text style={styles.headerSubtitle}>Discover and Participate in Global Events</Text>
            </View>
          </LinearGradient>

          <View style={styles.tabSectionWrapper}>
            <View style={styles.modernTabContainer}>
              <TouchableOpacity
                style={styles.modernTabItem}
                onPress={() => setActiveTab("Events")}
              >
                <Text style={[styles.modernTabText, activeTab === "Events" && styles.activeModernTabText]}>Events</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modernTabItem}
                onPress={() => setActiveTab("Score")}
              >
                <Text style={[styles.modernTabText, activeTab === "Score" && styles.activeModernTabText]}>Leaderboard</Text>
              </TouchableOpacity>

              <Animated.View
                style={[
                  styles.tabUnderline,
                  {
                    left: tabValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, width / 2 - 20]
                    })
                  }
                ]}
              />
            </View>
          </View>

        </View>

        <View style={styles.searchBarWrapper}>
          {activeTab === "Events" && (
            <View style={styles.modernSearchContainer}>
              <MaterialIcons name="search" size={22} color="#999" />
              <TextInput
                placeholder="Search tournaments, sports..."
                placeholderTextColor="#AAA"
                style={styles.modernSearchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          )}
        </View>

        <View style={styles.contentBody}>
          {activeTab === "Events" ? (
            <>
              <View style={styles.subTabSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabContent}>
                  {["Live", "Upcoming", "Past", "My Registration"].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setActiveSubTab(tab)}
                      style={[
                        styles.modernSubTab,
                        activeSubTab === tab && styles.activeModernSubTab,
                      ]}
                    >
                      <Text style={[styles.modernSubTabText, activeSubTab === tab && styles.activeModernSubTabText]}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.listSectionHeader}>
                {activeSubTab} Tournaments
              </Text>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0056d2" />
                  <Text style={styles.loadingText}>Loading tournaments...</Text>
                </View>
              ) : (
                <View style={styles.listContainer}>
                  {activeSubTab === "Live" && (
                    filteredTournaments.filter(t => !registeredTournaments.some(r => r.id === t.id)).length > 0 ? (
                      filteredTournaments.filter(t => !registeredTournaments.some(r => r.id === t.id)).map(renderTournamentCard)
                    ) : (
                      <View style={styles.emptyView}>
                        <MaterialIcons name="event-busy" size={60} color="#ddd" />
                        <Text style={styles.emptyHeading}>No Live Tournaments</Text>
                        <Text style={styles.emptySubheading}>Check out upcoming events or your registrations.</Text>
                      </View>
                    )
                  )}

                  {activeSubTab === "Upcoming" && (
                    upcomingTournaments.length > 0 ? upcomingTournaments.map(renderTournamentCard) : (
                      <View style={styles.emptyView}>
                        <MaterialIcons name="event" size={60} color="#ddd" />
                        <Text style={styles.emptyHeading}>No Upcoming Events</Text>
                        <Text style={styles.emptySubheading}>Stay tuned for new tournaments!</Text>
                      </View>
                    )
                  )}

                  {activeSubTab === "Past" && (
                    pastTournaments.length > 0 ? pastTournaments.map(renderTournamentCard) : (
                      <View style={styles.emptyView}>
                        <MaterialIcons name="history" size={60} color="#ddd" />
                        <Text style={styles.emptyHeading}>No Past Data</Text>
                      </View>
                    )
                  )}

                  {activeSubTab === "My Registration" && (
                    isAuthenticated ? (
                      registeredTournaments.length > 0 ? registeredTournaments.map(renderRegistrationCard) : (
                        <View style={styles.emptyView}>
                          <MaterialIcons name="assignment-ind" size={60} color="#ddd" />
                          <Text style={styles.emptyHeading}>Not Registered Yet</Text>
                          <TouchableOpacity style={styles.modernActionButton} onPress={() => setActiveSubTab("Upcoming")}>
                            <Text style={styles.modernActionText}>Browse Tournaments</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      <View style={styles.emptyView}>
                        <MaterialIcons name="assignment-ind" size={60} color="#ddd" />
                        <Text style={styles.emptyHeading}>No Registrations</Text>
                      </View>
                    )
                  )}
                </View>
              )}
            </>
          ) : (
            <LeaderboardScreen />
          )}
        </View>
      </ScrollView >
    </View >
  );
};


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerSection: {
    backgroundColor: '#F8F9FA',
  },
  premiumHeader: {
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    fontWeight: '600',
  },
  scrollcontainer: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 20,
    marginTop: 10,
    zIndex: 100,
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 10,
  },
  modernSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  tabSectionWrapper: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    marginTop: -35,
    zIndex: 50,
  },
  modernTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modernTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    zIndex: 2,
  },
  modernTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#777',
  },
  activeModernTabText: {
    color: '#FFF',
  },
  tabUnderline: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    width: (width - 40) / 2 - 6,
    backgroundColor: '#FF6A00',
    borderRadius: 8,
    zIndex: 1,
  },
  contentBody: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  subTabSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  subTabContent: {
    paddingRight: 20,
  },
  modernSubTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E9ECEF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeModernSubTab: {
    backgroundColor: '#FFF',
    borderColor: '#FF6A00',
    borderWidth: 1,
  },
  modernSubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeModernSubTabText: {
    color: '#FF6A00',
  },
  listSectionHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#212529',
    marginBottom: 15,
    letterSpacing: -0.3,
  },
  listContainer: {
    gap: 15,
  },
  modernCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 5,
  },
  cardImageContainer: {
    height: 200,
    position: 'relative',
  },
  modernCardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: '#FF6A00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  modernCardContent: {
    padding: 18,
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modernTournamentName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
    flex: 1,
    marginRight: 10,
  },
  typeBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#004E93',
    fontSize: 11,
    fontWeight: '700',
  },
  modernInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 12,
  },
  modernInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modernInfoText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
    flex: 1,
  },
  modernClosingDate: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '700',
    textAlign: 'right',
  },
  registrationModernCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  registrationModernImage: {
    width: 90,
    height: 90,
    borderRadius: 15,
  },
  registrationModernContent: {
    flex: 1,
    marginLeft: 15,
  },
  regHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  regTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D1E',
    flex: 1,
  },
  regStatusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regStatusText: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '800',
  },
  regType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginBottom: 10,
  },
  regInfoGrid: {
    gap: 4,
  },
  regInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regInfoText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  emptyView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#495057',
    marginTop: 15,
  },
  emptySubheading: {
    fontSize: 14,
    color: '#ADB5BD',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modernActionButton: {
    marginTop: 20,
    backgroundColor: '#004E93',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modernActionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default Event;
