import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getSportName, getTournamentType } from "../../utils/sportTrack";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import API from "../../api/api";
import TournamentConfig from "../../api/tournaments";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

// ─── helpers ─────────────────────────────────────────────────────────
const formatDateShort = (d) => {
  try {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const to12h = (t) => {
  if (!t) return "";
  return String(t).replace(/(\d{1,2}):(\d{2})/g, (_, hh, mm) => {
    const h = parseInt(hh, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mm} ${ampm}`;
  });
};

const formatTimeRange = (slot) => {
  if (!slot) return "—";
  return to12h(slot).replace(/\s*-\s*/, " - ");
};

// ─── status pill ─────────────────────────────────────────────────────
const STATUS_STYLES = {
  confirmed: { bg: "#E8F7F0", fg: "#0F8A55", label: "Confirmed" },
  completed: { bg: "#E8F7F0", fg: "#0F8A55", label: "Confirmed" },
  pending:   { bg: "#FFF3E0", fg: "#B25E00", label: "Pending" },
  cancelled: { bg: "#FDECEC", fg: "#C8322A", label: "Canceled" },
};
const statusStyle = (s) =>
  STATUS_STYLES[(s || "confirmed").toLowerCase()] || STATUS_STYLES.confirmed;

const MyBooking = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("Turf");
  const [innerActiveTab, setInnerActiveTab] = useState("Upcoming");
  const [loading, setLoading] = useState(false);
  const [turfBookings, setTurfBookings] = useState([]);
  const [turfBookingsHistory, setTurfBookingsHistory] = useState([]);
  const [tournamentBookings, setTournamentBookings] = useState([]);
  const [tournamentBookingsHistory, setTournamentBookingsHistory] = useState(
    []
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (activeTab === "Turf") fetchTurfBookings();
      else if (activeTab === "Tournament") fetchTournamentBookings();
    }
  }, [user, isAuthenticated, activeTab]);

  // ─── Turf bookings ─────────────────────────────────────────────────
  const fetchTurfBookings = async () => {
    if (!user || (!user.id && !user._id)) {
      setTurfBookings([]);
      setTurfBookingsHistory([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const userId = user.id || user._id;
      const response = await axios.get(
        API.ENDPOINTS.TURF_BOOKINGS.USER_BOOKINGS(userId)
      );

      if (response.data.success && response.data.bookings) {
        const allBookings = response.data.bookings;
        const processed = await Promise.all(
          allBookings.map(async (booking) => {
            try {
              if (booking.turfId) {
                const turfIdStr =
                  typeof booking.turfId === "object"
                    ? booking.turfId._id || booking.turfId.id || ""
                    : booking.turfId;
                if (turfIdStr) {
                  const turfResponse = await axios.get(
                    API.ENDPOINTS.TURFS.BY_ID(turfIdStr)
                  );
                  if (turfResponse.data) {
                    return {
                      ...booking,
                      turfDetails: turfResponse.data,
                      turfId: turfIdStr,
                      id: booking._id,
                      name: booking.turfName || turfResponse.data.name,
                      location: turfResponse.data.address
                        ? `${turfResponse.data.address.area}, ${turfResponse.data.address.city}`
                        : "Address not available",
                      image:
                        turfResponse.data.images &&
                        turfResponse.data.images.length > 0
                          ? {
                              uri: `${API.UPLOADS_URL}/${turfResponse.data.images[0].replace(/\\/g, "/")}`,
                            }
                          : require("../../../assets/turf.jpg"),
                      sport: booking.sport?.name || "Sport",
                      bookingDate: new Date(booking.date),
                      timeSlot: booking.timeSlot,
                      amount: booking.amount,
                      isUpcoming: new Date(booking.date) >= new Date(),
                    };
                  }
                }
              }
              return {
                ...booking,
                id: booking._id,
                name: booking.turfName || "Turf",
                location: "Location not available",
                image: require("../../../assets/turf.jpg"),
                sport: booking.sport?.name || "Sport",
                bookingDate: new Date(booking.date),
                timeSlot: booking.timeSlot,
                amount: booking.amount,
                isUpcoming: new Date(booking.date) >= new Date(),
              };
            } catch (e) {
              console.error("Error processing turf booking:", e);
              return {
                ...booking,
                id: booking._id,
                name: booking.turfName || "Turf",
                location: "Location not available",
                image: require("../../../assets/turf.jpg"),
                sport: booking.sport?.name || "Sport",
                bookingDate: new Date(booking.date),
                timeSlot: booking.timeSlot,
                amount: booking.amount,
                isUpcoming: new Date(booking.date) >= new Date(),
              };
            }
          })
        );

        const upcoming = processed.filter(
          (b) => b.isUpcoming && b.status !== "cancelled"
        );
        const history = processed.filter(
          (b) => !b.isUpcoming || b.status === "cancelled"
        );
        setTurfBookings(upcoming);
        setTurfBookingsHistory(history);
      } else {
        setTurfBookings([]);
        setTurfBookingsHistory([]);
      }
    } catch (e) {
      console.error("Error fetching turf bookings:", e);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Tournament bookings ───────────────────────────────────────────
  const fetchTournamentBookings = async () => {
    if (!user || (!user.id && !user._id)) {
      setTournamentBookings([]);
      setTournamentBookingsHistory([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const userId = user.id || user._id;
      const bookingsEndpoint =
        TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId);
      const response = await axios.get(bookingsEndpoint);

      if (response.data && response.data.length > 0) {
        const processed = await Promise.all(
          response.data.map(async (booking) => {
            if (!booking.tournamentId) return null;
            try {
              const tId = booking.tournamentId?._id || booking.tournamentId;
              if (!tId || tId === "NA") return null;
              const endpoint = TournamentConfig.ENDPOINTS.BY_ID(tId);
              try {
                const tResp = await axios.get(endpoint);
                return formatTournamentData(tResp.data, booking);
              } catch {
                return createFallbackTournamentObject(booking);
              }
            } catch (e) {
              console.error(
                `Error processing tournament ${booking.tournamentId}:`,
                e
              );
              return createFallbackTournamentObject(booking);
            }
          })
        );

        const valid = processed.filter((x) => x !== null);
        const now = new Date();
        const upcoming = valid.filter(
          (t) => t.tournamentDate >= now && t.status !== "cancelled"
        );
        const history = valid.filter(
          (t) => t.tournamentDate < now || t.status === "cancelled"
        );
        setTournamentBookings(upcoming);
        setTournamentBookingsHistory(history);
      } else {
        setTournamentBookings([]);
        setTournamentBookingsHistory([]);
      }
    } catch (e) {
      console.error("Error fetching tournament bookings:", e);
      setError("Failed to load tournament bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createFallbackTournamentObject = (booking) => {
    const tournamentDate = booking.tournamentDate || booking.date || new Date();
    return {
      id: booking.tournamentId || "unknown",
      name: booking.tournamentName || "Tournament",
      type: booking.tournamentType || "Tournament",
      bookingDate: new Date(tournamentDate),
      startTime: booking.startTime || booking.tournamentStartTime || "10:00 AM",
      price: booking.tournamentFee || booking.price || "N/A",
      location: booking.venue || booking.clubName || booking.location || "N/A",
      image: require("../../../assets/tournament-banner.jpg"),
      booking,
      status: booking.status || "confirmed",
      tournamentDate: new Date(tournamentDate),
    };
  };

  const formatTournamentData = (tournament, booking) => {
    if (!tournament) return createFallbackTournamentObject(booking);
    let tournamentDate = new Date();
    try {
      tournamentDate = new Date(
        tournament.selectedDate || booking.date || Date.now()
      );
    } catch (e) {
      console.error("Error formatting tournament dates:", e);
    }
    let startTime = "10:00 AM";
    if (tournament.selectedTime && tournament.selectedTime.startTime) {
      startTime = tournament.selectedTime.startTime;
    }
    let imageUri;
    try {
      imageUri = tournament.imageUrl
        ? { uri: `${API.UPLOADS_URL}/${tournament.imageUrl}` }
        : require("../../../assets/tournament-banner.jpg");
    } catch {
      imageUri = require("../../../assets/tournament-banner.jpg");
    }
    return {
      id: tournament._id || booking.tournamentId || "NA",
      name: tournament.title || booking.tournamentName || "NA",
      type:
        getTournamentType(tournament) ||
        getSportName(tournament) ||
        booking.tournamentType ||
        "Tournament",
      bookingDate: tournamentDate,
      startTime,
      price: tournament.tournamentFee
        ? `₹ ${tournament.tournamentFee}`
        : booking.price
        ? `₹ ${booking.price}`
        : "₹ 0",
      location:
        tournament.eventLocation ||
        tournament.address ||
        booking.venue ||
        booking.location ||
        "NA",
      image: imageUri,
      booking,
      status: booking.status || "confirmed",
      tournamentDate,
      rawData: tournament,
    };
  };

  // ─── Navigation helpers ────────────────────────────────────────────
  const goToTurfDetails = (booking) => {
    navigation.navigate("TurfConfirmation", {
      bookingId: booking.id,
      userId: user?.id || user?._id,
      turfId:
        typeof booking.turfId === "object"
          ? booking.turfId._id || booking.turfId.id || ""
          : booking.turfId,
      turfName: booking.name,
      date: booking.bookingDate,
      time: booking.timeSlot,
      venue: booking.location,
      amount: booking.amount,
      status: booking.status,
      paymentMethod: booking.paymentMethod || "cash",
    });
  };

  const goToTournamentDetails = (item) => {
    let phoneNumber = "";
    if (item.booking) {
      phoneNumber =
        item.booking.userPhone ||
        item.booking.phone ||
        item.booking.phoneNumber ||
        item.booking.userContact ||
        "";
      if (!phoneNumber && item.booking.userId) {
        const bu = item.booking.userId;
        if (typeof bu === "object") {
          phoneNumber =
            bu.phone || bu.phoneNumber || bu.mobile || bu.contact || "";
        }
      }
      if (!phoneNumber && item.booking.user) {
        const bu = item.booking.user;
        phoneNumber =
          bu.phone || bu.phoneNumber || bu.mobile || bu.contact || "";
      }
    }
    if (!phoneNumber && user) {
      phoneNumber =
        user.phone || user.phoneNumber || user.mobile || user.contact || "";
    }
    if (!phoneNumber) phoneNumber = "Not available";

    navigation.navigate("BookingConfirmation", {
      bookingId: item.booking?._id,
      userId: user?.id || user?._id,
      tournamentId: item.id,
      tournamentName: item.name,
      date: formatDateShort(item.bookingDate),
      time: item.startTime,
      venue: item.location,
      amount:
        typeof item.price === "string"
          ? item.price.replace("₹ ", "")
          : item.price || "0",
      status: item.status,
      name: item.booking?.userName || user?.name || user?.fullName || "",
      email: item.booking?.userEmail || user?.email || "",
      phone: phoneNumber,
      team: item.booking?.team,
      tournamentType: item.type,
    });
  };

  // ─── Cards ─────────────────────────────────────────────────────────
  const Card = ({ image, title, date, time, location, status, onPress }) => {
    const st = statusStyle(status);
    return (
      <View style={styles.card}>
        <Image source={image} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusPillText, { color: st.fg }]}>
                {st.label}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={TEXT_MUTED} />
            <Text style={styles.metaText}>{date}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={TEXT_MUTED} />
            <Text style={styles.metaText}>{time}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={TEXT_MUTED} />
            <Text style={styles.metaText} numberOfLines={1}>
              {location}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.detailsLinkWrap}
          >
            <Text style={styles.detailsLink}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={GREEN} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTurfCard = (b) => (
    <Card
      key={b.id}
      image={b.image}
      title={b.name}
      date={formatDateShort(b.bookingDate)}
      time={formatTimeRange(b.timeSlot)}
      location={b.location}
      status={b.status}
      onPress={() => goToTurfDetails(b)}
    />
  );

  const renderTournamentCard = (t) => (
    <Card
      key={t.id}
      image={t.image}
      title={t.name}
      date={formatDateShort(t.bookingDate)}
      time={to12h(t.startTime)}
      location={t.location}
      status={t.status}
      onPress={() => goToTournamentDetails(t)}
    />
  );

  // ─── Counts ────────────────────────────────────────────────────────
  const counts =
    activeTab === "Turf"
      ? {
          Upcoming: turfBookings.length,
          History: turfBookingsHistory.length,
        }
      : {
          Upcoming: tournamentBookings.length,
          History: tournamentBookingsHistory.length,
        };

  const padCount = (n) => String(n).padStart(2, "0");

  // ─── Empty / loading / error ───────────────────────────────────────
  const renderEmpty = (msg) => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-clear-outline" size={56} color="#D1D5DB" />
      <Text style={styles.emptyText}>{msg}</Text>
    </View>
  );

  const renderLoading = (msg) => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={GREEN} />
      <Text style={styles.loadingText}>{msg}</Text>
    </View>
  );

  const renderError = (onRetry) => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────
  const isTurf = activeTab === "Turf";
  const upcomingList = isTurf ? turfBookings : tournamentBookings;
  const historyList = isTurf ? turfBookingsHistory : tournamentBookingsHistory;
  const renderCard = isTurf ? renderTurfCard : renderTournamentCard;
  const refetch = isTurf ? fetchTurfBookings : fetchTournamentBookings;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Top pill tabs */}
      <View style={styles.topTabRow}>
        {["Turf", "Tournament"].map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.topTab, active && styles.topTabActive]}
              onPress={() => {
                setActiveTab(tab);
                setInnerActiveTab("Upcoming");
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.topTabText,
                  active && styles.topTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Inner underline tabs */}
      <View style={styles.innerTabRow}>
        {["Upcoming", "History"].map((tab) => {
          const active = innerActiveTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.innerTab}
              onPress={() => setInnerActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.innerTabText,
                  active && styles.innerTabTextActive,
                ]}
              >
                {tab} ({padCount(counts[tab] || 0)})
              </Text>
              <View
                style={[
                  styles.innerTabUnderline,
                  active && styles.innerTabUnderlineActive,
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading
          ? renderLoading(
              isTurf ? "Loading bookings..." : "Loading tournaments..."
            )
          : error
          ? renderError(refetch)
          : innerActiveTab === "Upcoming"
          ? upcomingList.length > 0
            ? upcomingList.map(renderCard)
            : renderEmpty(
                isTurf
                  ? "No upcoming turf bookings"
                  : "No upcoming tournament bookings"
              )
          : historyList.length > 0
          ? historyList.map(renderCard)
          : renderEmpty(
              isTurf ? "No booking history found" : "No tournament history found"
            )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },

  topTabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  topTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F4F4F5",
  },
  topTabActive: { backgroundColor: GREEN },
  topTabText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },
  topTabTextActive: { color: "#FFFFFF" },

  innerTabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  innerTab: {
    flex: 1,
    alignItems: "center",
    paddingTop: 8,
  },
  innerTabText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_MUTED,
    paddingBottom: 10,
  },
  innerTabTextActive: { color: GREEN, fontWeight: "700" },
  innerTabUnderline: {
    height: 2,
    width: "60%",
    backgroundColor: "transparent",
  },
  innerTabUnderlineActive: { backgroundColor: GREEN },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
    padding: 10,
    gap: 12,
  },
  cardImage: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
  },
  cardBody: { flex: 1, justifyContent: "space-between" },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  detailsLinkWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  detailsLink: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN,
    textDecorationLine: "underline",
  },

  // States
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: "#DC2626",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: GREEN,
    borderRadius: 10,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: "Montserrat_500Medium",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
});

export default MyBooking;
