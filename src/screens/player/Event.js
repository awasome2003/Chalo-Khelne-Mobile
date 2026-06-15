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
  Share,
} from "react-native";
import React, { useState, useEffect, useRef } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import TournamentConfig from "../../api/tournaments";
import { getSportName, getTournamentType } from "../../utils/sportTrack";
import { useAuth } from "../../context/AuthContext";
import LeaderboardScreen from "./LeaderboardScreen";
import Website_SERVER_URL from "../../api/api";

const { width } = Dimensions.get("window");

// Pill switcher geometry — kept top-level so the animation knows the pixel target.
const TAB_MARGIN = 16;
const TAB_PAD = 4;
const TAB_INNER_WIDTH = width - TAB_MARGIN * 2 - TAB_PAD * 2;
const TAB_PILL_WIDTH = TAB_INNER_WIDTH / 2;

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
      duration: 250,
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
    if (isNaN(startDate.getTime())) return "Unknown";

    const endDateTime = endDate && !isNaN(endDate.getTime()) ? endDate : startDate;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);

    const endDay = new Date(endDateTime);
    endDay.setHours(0, 0, 0, 0);

    if (endDay < today) return "Past";
    if (startDay <= today && endDay >= today) return "Live";
    if (startDay > today) return "Upcoming";
    return "Unknown";
  };

  // Fetch tournaments from API
  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (tournaments.length > 0) {
      fetchRegisteredTournaments();
    }
  }, [tournaments]);

  useEffect(() => {
    if (registeredTournaments.length >= 0) {
      setFilteredTournaments((prev) => [...prev]); // Trigger re-render
    }
  }, [registeredTournaments]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = tournaments.filter(
        (tournament) =>
          (tournament.title || tournament.name || "NA")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (getTournamentType(tournament) || "NA")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (getSportName(tournament) || "NA")
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

  const fetchTournaments = async (searchQuery = "", isRefreshing = false) => {
    try {
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
            past.push(tournament);
        }
      });

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        liveTournaments = liveTournaments.filter(
          (t) =>
            (t.title || t.name || "").toLowerCase().includes(q) ||
            (getTournamentType(t) || getSportName(t) || "").toLowerCase().includes(q)
        );
        upcoming = upcoming.filter(
          (t) =>
            (t.title || t.name || "").toLowerCase().includes(q) ||
            (getTournamentType(t) || getSportName(t) || "").toLowerCase().includes(q)
        );
        past = past.filter(
          (t) =>
            (t.title || t.name || "").toLowerCase().includes(q) ||
            (getTournamentType(t) || getSportName(t) || "").toLowerCase().includes(q)
        );
      }

      liveTournaments.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.startDate || a.selectedDate || 0);
        const dateB = new Date(b.createdAt || b.startDate || b.selectedDate || 0);
        return dateB - dateA;
      });

      upcoming.sort((a, b) => {
        const dateA = parseDate(a.startDate) || parseDate(a.selectedDate);
        const dateB = parseDate(b.startDate) || parseDate(b.selectedDate);
        return dateA - dateB;
      });

      past.sort((a, b) => {
        const dateA = parseDate(a.endDate) || parseDate(a.startDate) || parseDate(a.selectedDate);
        const dateB = parseDate(b.endDate) || parseDate(b.startDate) || parseDate(b.selectedDate);
        return dateB - dateA;
      });

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
    if (!isAuthenticated || !user || (!user.id && !user._id)) {
      setRegisteredTournaments([]);
      return;
    }

    const userId = user.id || user._id;

    try {
      const bookingsEndpoint = TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId);
      const response = await axios.get(bookingsEndpoint);

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

      const registeredTourneys = await Promise.all(
        bookings.map(async (booking) => {
          if (!booking.tournamentId) return null;

          try {
            const tId = booking.tournamentId?._id || booking.tournamentId;
            if (!tId || tId === "NA") return null;

            const tournamentEndpoint = TournamentConfig.ENDPOINTS.BY_ID(tId);

            try {
              const tournamentResponse = await axios.get(tournamentEndpoint);
              const tournamentData =
                tournamentResponse.data.tournament ||
                tournamentResponse.data.data ||
                tournamentResponse.data;
              return formatTournamentData(tournamentData, true, booking);
            } catch (tournamentError) {
              return null;
            }
          } catch (error) {
            console.error(`Error processing tournament ${booking.tournamentId}:`, error);
            return null;
          }
        })
      );

      const validTournaments = (registeredTourneys || []).filter((item) => !!item);
      setRegisteredTournaments(validTournaments);
    } catch (error) {
      console.error("Error fetching registered tournaments:", error);
      setRegisteredTournaments([]);
    }
  };

  const normalizeLocation = (eventLocation) => {
    if (!eventLocation) return "Location Not Specified";

    if (typeof eventLocation === "string") {
      if (eventLocation.startsWith("[") && eventLocation.endsWith("]")) {
        try {
          const parsed = JSON.parse(eventLocation);
          if (Array.isArray(parsed)) return normalizeLocation(parsed);
        } catch (e) {
          return eventLocation.trim();
        }
      }
      return eventLocation.trim();
    }

    if (typeof eventLocation === "object") {
      if (Array.isArray(eventLocation)) {
        const locationNames = [];
        eventLocation.forEach((item) => {
          if (typeof item === "string") {
            if (item.startsWith("[") && item.endsWith("]")) {
              try {
                const parsed = JSON.parse(item);
                if (Array.isArray(parsed)) {
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
            const name =
              item.name || item.title || item.address || item._id || JSON.stringify(item);
            if (name && typeof name === "string") {
              locationNames.push(name.trim());
            } else if (typeof name === "object") {
              locationNames.push(normalizeLocation(name));
            } else {
              locationNames.push(String(name));
            }
          }
        });
        const result = locationNames
          .filter((name) => name && name !== "" && name !== "Location Not Specified")
          .join(", ");
        return result || "Location Not Specified";
      } else {
        const name =
          eventLocation.name ||
          eventLocation.title ||
          eventLocation.address ||
          eventLocation._id ||
          JSON.stringify(eventLocation);
        if (typeof name === "string") return name.trim();
        if (typeof name === "object") return normalizeLocation(name);
        return String(name).trim();
      }
    }

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

    let dateRange = "NA";
    let startTime = "NA";
    let closingDateFormatted = "NA";

    const formatDate = (date) => {
      if (!date || isNaN(date.getTime())) return null;
      const day = date.getDate();
      const month = date.toLocaleString("default", { month: "short" });
      return `${month} ${day}`;
    };

    try {
      const start = parseDate(tournament.startDate || tournament.selectedDate);
      const end = parseDate(tournament.endDate);
      if (start && end) dateRange = `${formatDate(start)} - ${formatDate(end)}`;
      else if (start) dateRange = formatDate(start);
      else dateRange = "Date not available";

      const startT =
        tournament.selectedTime?.startTime || tournament.startTime || "10:00 AM";
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
    const price = tournament.tournamentFee
      ? `₹${tournament.tournamentFee}/- Onward`
      : "₹0/- Onward";

    const status = getTournamentStatus(tournament);

    let imageUri;
    try {
      if (
        tournament.tournamentLogo &&
        typeof tournament.tournamentLogo === "string" &&
        tournament.tournamentLogo.trim().length > 0
      ) {
        imageUri = {
          uri: assetUrl('tournaments/' + tournament.tournamentLogo),
        };
      } else if (
        tournament.imageUrl &&
        typeof tournament.imageUrl === "string" &&
        tournament.imageUrl.trim().length > 0
      ) {
        imageUri = { uri: assetUrl(tournament.imageUrl) };
      } else {
        imageUri = require("../../../assets/tournament-banner.jpg");
      }
    } catch (error) {
      console.error("Error processing tournament image:", error);
      imageUri = require("../../../assets/tournament-banner.jpg");
    }

    return {
      id: tournament._id || "NA",
      name: tournament.title || tournament.name || booking?.tournamentName || "Untitled Tournament",
      type: getTournamentType(tournament) || getSportName(tournament) || "Tournament",
      date: dateRange,
      startTime,
      closingDate: `Booking closes on: ${closingDateFormatted}`,
      price,
      club: clubName,
      address: location,
      image: imageUri,
      status,
      isRegistered,
      booking,
      rawData: tournament,
    };
  };

  // ─── New design helpers ─────────────────────────────────────────────────

  const getStatusDotColor = (status) => {
    switch (status) {
      case "Live":
        return "#F44336";
      case "Upcoming":
        return "#FF9800";
      case "Past":
        return "#9E9E9E";
      default:
        return "#2196F3";
    }
  };

  const formatClosesLabel = (item) => {
    if (!item?.closingDate) return null;
    const m = item.closingDate.match(/:\s*(.+)$/);
    const dateStr = m ? m[1].trim() : item.closingDate.trim();
    if (!dateStr || dateStr === "NA") return null;
    // Time isn't tracked separately for registration close; default to 11.00 AM
    // until backend exposes a registrationEndTime field.
    const timeStr = "11.00 AM";
    return `Closes on ${dateStr} at ${timeStr}`;
  };

  const handleShare = async (item) => {
    try {
      const datePart = item.date && item.date !== "NA" ? ` on ${item.date}` : "";
      const message = `${item.name}${datePart} — register at chalokhelne.com`;
      await Share.share({ message });
    } catch (err) {
      console.error("[Event] share failed:", err);
    }
  };

  const resolveImageSource = (item) => {
    if (typeof item?.tournamentLogo === "string" && item.tournamentLogo.trim()) {
      return { uri: assetUrl(item.tournamentLogo.startsWith("http") ? item.tournamentLogo : "tournaments/" + item.tournamentLogo) };
    }
    if (item?.image?.uri) return item.image;
    if (item?.image) return item.image;
    return require("../../../assets/tournament-banner.jpg");
  };

  // ─── Card renderers ──────────────────────────────────────────────────────

  const renderTournamentCard = (item) => {
    const closesLabel = item.status !== "Past" ? formatClosesLabel(item) : null;
    const dotColor = getStatusDotColor(item.status);
    const imageSource = resolveImageSource(item);

    const goToDetails = () =>
      navigation.navigate("Tournament Details", {
        item: item,
        tournamentId: item.id,
        isPastTournament: item.status === "Past",
      });

    return (
      <View key={item.id} style={styles.tournamentCard}>
        <View style={styles.cardImageWrap}>
          <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
            <Text style={styles.statusPillText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.sportTag}>{item.type}</Text>

          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => handleShare(item)}
              style={styles.shareBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="share" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.clubName} numberOfLines={1}>
            {item.club}
          </Text>

          <View style={styles.metaRow}>
            <Text style={styles.dateText}>{item.date}</Text>
            <Text style={styles.priceText}>{item.price}</Text>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.closesText} numberOfLines={1}>
              {closesLabel || " "}
            </Text>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={goToDetails}
              activeOpacity={0.85}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Kept from the previous implementation — user said registration-card
  // redesign is coming in a later turn.
  const renderRegistrationCard = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.registrationModernCard}
        onPress={() => {
          const tId =
            item.booking?.tournamentId?._id || item.booking?.tournamentId || item.id;
          if (tId && tId !== "NA" && tId !== "unknown") {
            const tournamentEndpoint = TournamentConfig.ENDPOINTS.BY_ID(tId);
            axios
              .get(tournamentEndpoint)
              .then((response) => {
                const tournamentData =
                  response.data.tournament || response.data.data || response.data;
                const enhancedTournament = {
                  ...item,
                  id: tournamentData._id || tId,
                  fullDetails: tournamentData,
                  name:
                    tournamentData.title ||
                    tournamentData.name ||
                    item.booking?.tournamentName ||
                    item.name ||
                    "Untitled Tournament",
                  type:
                    getTournamentType(tournamentData) ||
                    getSportName(tournamentData) ||
                    item.booking?.tournamentType ||
                    item.type ||
                    "Tournament",
                  description: tournamentData.description || "No description available",
                  price: tournamentData.tournamentFee
                    ? `₹ ${tournamentData.tournamentFee}`
                    : item.price || "₹ 0",
                  club:
                    tournamentData.organizerName ||
                    tournamentData.clubName ||
                    item.club ||
                    "Organizer Not Specified",
                  address:
                    normalizeLocation(
                      tournamentData.eventLocation ||
                        tournamentData.address ||
                        tournamentData.location ||
                        item.address
                    ) || "Location Not Specified",
                  organizerName: tournamentData.organizerName || "Unknown organizer",
                  date: item.date !== "Date not available" ? item.date : "Date TBA",
                };
                navigation.navigate("RegistrationDetails", {
                  tournament: enhancedTournament,
                  tournamentId: enhancedTournament.id,
                  isPastTournament: enhancedTournament.status === "Past",
                });
              })
              .catch(() => {
                navigation.navigate("RegistrationDetails", {
                  tournament: item,
                  tournamentId: item.id,
                  isPastTournament: item.status === "Past",
                });
              });
          } else {
            navigation.navigate("RegistrationDetails", {
              tournament: item,
              tournamentId: item.id,
              isPastTournament: item.status === "Past",
            });
          }
        }}
      >
        <Image source={item.image} style={styles.registrationModernImage} />
        <View style={styles.registrationModernContent}>
          <View style={styles.regHeaderRow}>
            <Text style={styles.regTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.regStatusBadge}>
              <Text style={styles.regStatusText}>
                {item.booking?.status || "Confirmed"}
              </Text>
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
              <Text style={styles.regInfoText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollContainer}
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
            colors={["#15A765"]}
            tintColor="#15A765"
            progressViewOffset={insets.top + 20}
          />
        }
      >
        {/* Child 0 — page header + tab switcher */}
        <View style={[styles.headerSection, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.pageTitle}>Events</Text>

          <View style={styles.tabSwitcher}>
            <Animated.View
              style={[
                styles.activeTabPill,
                {
                  width: TAB_PILL_WIDTH,
                  left: tabValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [TAB_PAD, TAB_PAD + TAB_PILL_WIDTH],
                  }),
                },
              ]}
            />
            <TouchableOpacity
              style={styles.tabSlot}
              onPress={() => setActiveTab("Events")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Events" && styles.activeTabText,
                ]}
              >
                Events
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tabSlot}
              onPress={() => setActiveTab("Score")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "Score" && styles.activeTabText,
                ]}
              >
                Leaderboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Child 1 — sticky subtabs + search (only on Events tab) */}
        <View style={styles.stickyBlock}>
          {activeTab === "Events" && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subTabRow}
              >
                {["Live", "Upcoming", "Past", "My Registration"].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveSubTab(tab)}
                    style={[
                      styles.subTabChip,
                      activeSubTab === tab && styles.activeSubTabChip,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.subTabText,
                        activeSubTab === tab && styles.activeSubTabText,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.searchBarContainer}>
                <MaterialIcons name="search" size={24} color="#666666" />
                <TextInput
                  placeholder="Search sports, turfs or players"
                  placeholderTextColor="#666666"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <View style={styles.searchDivider} />
                <TouchableOpacity>
                  <MaterialIcons name="mic-none" size={24} color="#666666" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Child 2 — content list */}
        <View style={styles.contentBody}>
          {activeTab === "Events" ? (
            loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#15A765" />
                <Text style={styles.loadingText}>Loading tournaments...</Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {activeSubTab === "Live" &&
                  (filteredTournaments.filter(
                    (t) => !registeredTournaments.some((r) => r.id === t.id)
                  ).length > 0 ? (
                    filteredTournaments
                      .filter((t) => !registeredTournaments.some((r) => r.id === t.id))
                      .map(renderTournamentCard)
                  ) : (
                    <View style={styles.emptyView}>
                      <MaterialIcons name="event-busy" size={60} color="#ddd" />
                      <Text style={styles.emptyHeading}>No Live Tournaments</Text>
                      <Text style={styles.emptySubheading}>
                        Check out upcoming events or your registrations.
                      </Text>
                    </View>
                  ))}

                {activeSubTab === "Upcoming" &&
                  (upcomingTournaments.length > 0 ? (
                    upcomingTournaments.map(renderTournamentCard)
                  ) : (
                    <View style={styles.emptyView}>
                      <MaterialIcons name="event" size={60} color="#ddd" />
                      <Text style={styles.emptyHeading}>No Upcoming Events</Text>
                      <Text style={styles.emptySubheading}>
                        Stay tuned for new tournaments!
                      </Text>
                    </View>
                  ))}

                {activeSubTab === "Past" &&
                  (pastTournaments.length > 0 ? (
                    pastTournaments.map(renderTournamentCard)
                  ) : (
                    <View style={styles.emptyView}>
                      <MaterialIcons name="history" size={60} color="#ddd" />
                      <Text style={styles.emptyHeading}>No Past Data</Text>
                    </View>
                  ))}

                {activeSubTab === "My Registration" &&
                  (isAuthenticated ? (
                    registeredTournaments.length > 0 ? (
                      registeredTournaments.map(renderRegistrationCard)
                    ) : (
                      <View style={styles.emptyView}>
                        <MaterialIcons name="assignment-ind" size={60} color="#ddd" />
                        <Text style={styles.emptyHeading}>Not Registered Yet</Text>
                        <TouchableOpacity
                          style={styles.modernActionButton}
                          onPress={() => setActiveSubTab("Upcoming")}
                        >
                          <Text style={styles.modernActionText}>Browse Tournaments</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  ) : (
                    <View style={styles.emptyView}>
                      <MaterialIcons name="assignment-ind" size={60} color="#ddd" />
                      <Text style={styles.emptyHeading}>No Registrations</Text>
                    </View>
                  ))}
              </View>
            )
          ) : (
            <LeaderboardScreen />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flex: 1,
  },

  // Page header + tab switcher
  headerSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: TAB_MARGIN,
    paddingBottom: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 16,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F4F4F5",
    borderRadius: 30,
    padding: TAB_PAD,
    position: "relative",
    height: 46,
  },
  activeTabPill: {
    position: "absolute",
    top: TAB_PAD,
    bottom: TAB_PAD,
    backgroundColor: "#15A765",
    borderRadius: 30,
    zIndex: 1,
  },
  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#666",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },

  // Sticky block (subtabs + search)
  stickyBlock: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 8,
  },
  subTabRow: {
    paddingHorizontal: TAB_MARGIN,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  subTabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#F4F4F5",
    marginRight: 8,
  },
  activeSubTabChip: {
    backgroundColor: "#E8F7F0",
  },
  subTabText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#8D848F",
  },
  activeSubTabText: {
    color: "#15A765",
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: TAB_MARGIN,
    paddingHorizontal: 16,
    borderWidth: 1,
    height: 50,
    borderColor: "#EEEEFF",
    borderRadius: 53,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 6,
  },

  // Content list
  contentBody: {
    paddingHorizontal: TAB_MARGIN,
    paddingTop: 16,
    paddingBottom: 100,
  },
  listContainer: {
    gap: 14,
  },

  // Tournament card
  tournamentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    overflow: "hidden",
  },
  cardImageWrap: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: "#eee",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  statusPill: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 30,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },

  cardBody: {
    padding: 14,
    gap: 4,
  },
  sportTag: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#15A765",
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginRight: 10,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  clubName: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    color: "#645E66",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  dateText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#645E66",
  },
  priceText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  closesText: {
    flex: 1,
    marginRight: 12,
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#D32F2F",
  },
  registerButton: {
    backgroundColor: "#15A765",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },

  // Registration card (kept from previous design — separate redesign coming later)
  registrationModernCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  regTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1D1E",
    flex: 1,
    marginRight: 8,
  },
  regStatusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regStatusText: {
    color: "#2E7D32",
    fontSize: 10,
    fontWeight: "800",
  },
  regType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
    marginBottom: 10,
  },
  regInfoGrid: {
    gap: 4,
  },
  regInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  regInfoText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
  },

  // Empty + loading
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#495057",
    marginTop: 15,
  },
  emptySubheading: {
    fontSize: 14,
    color: "#ADB5BD",
    marginTop: 5,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  modernActionButton: {
    marginTop: 20,
    backgroundColor: "#15A765",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modernActionText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
});

export default Event;
