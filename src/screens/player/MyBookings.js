import React, { useState, useEffect } from "react";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Bookingcoach from "./Bookingcoach";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import API from "../../api/api";
import TournamentConfig from "../../api/tournaments";

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

  // Fetch bookings on component mount and tab change
  useEffect(() => {
    if (isAuthenticated && user) {
      if (activeTab === "Turf") {
        fetchTurfBookings();
      } else if (activeTab === "Tournament") {
        fetchTournamentBookings();
      }
    }
  }, [user, isAuthenticated, activeTab]);

  // Fetch turf bookings
  const fetchTurfBookings = async () => {
    if (!user || (!user.id && !user._id)) {
      setTurfBookings([]);
      setTurfBookingsHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user ID
      const userId = user.id || user._id;

      // Fetch turf bookings from API
      const response = await axios.get(
        API.ENDPOINTS.TURF_BOOKINGS.USER_BOOKINGS(userId)
      );

      if (response.data.success && response.data.bookings) {
        const allBookings = response.data.bookings;

        // Process and enhance bookings with turf details
        const processedBookings = await Promise.all(
          allBookings.map(async (booking) => {
            try {
              // Make sure we have a valid turfId
              if (booking.turfId) {
                // Extract string ID if turfId is an object
                const turfIdStr =
                  typeof booking.turfId === "object"
                    ? booking.turfId._id || booking.turfId.id || ""
                    : booking.turfId;

                if (turfIdStr) {
                  // Fetch turf details with proper string ID
                  const turfResponse = await axios.get(
                    API.ENDPOINTS.TURFS.BY_ID(turfIdStr)
                  );

                  if (turfResponse.data) {
                    return {
                      ...booking,
                      turfDetails: turfResponse.data,
                      turfId: turfIdStr, // Use the string ID
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

              // Fallback if turf details not available
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
            } catch (error) {
              console.error("Error processing turf booking:", error);

              // Fallback for error
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

        // Split into upcoming and history based on date
        const now = new Date();
        const upcoming = processedBookings.filter(
          (booking) => booking.isUpcoming && booking.status !== "cancelled"
        );

        const history = processedBookings.filter(
          (booking) => !booking.isUpcoming || booking.status === "cancelled"
        );

        setTurfBookings(upcoming);
        setTurfBookingsHistory(history);
      } else {
        setTurfBookings([]);
        setTurfBookingsHistory([]);
      }
    } catch (error) {
      console.error("Error fetching turf bookings:", error);
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch tournament bookings using TournamentConfig
  const fetchTournamentBookings = async () => {
    if (!user || (!user.id && !user._id)) {
      setTournamentBookings([]);
      setTournamentBookingsHistory([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user ID
      const userId = user.id || user._id;

      // Fetch tournament bookings using TournamentConfig
      const bookingsEndpoint =
        TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId);
      const response = await axios.get(bookingsEndpoint);

      if (response.data && response.data.length > 0) {
        // Process each booking to create tournament cards
        const processedBookings = await Promise.all(
          response.data.map(async (booking) => {
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

                // Format tournament data with full API response
                return formatTournamentData(tournamentResponse.data, booking);
              } catch (tournamentError) {
                // Fallback to booking data if tournament details can't be fetched
                return createFallbackTournamentObject(booking);
              }
            } catch (error) {
              // Handle any other unexpected errors
              console.error(
                `Error processing tournament ${booking.tournamentId}:`,
                error
              );
              return createFallbackTournamentObject(booking);
            }
          })
        );

        // Filter out null entries
        const validTournaments = processedBookings.filter(
          (item) => item !== null
        );

        // Split into upcoming and history based on date
        const now = new Date();
        const upcoming = validTournaments.filter(
          (tournament) =>
            tournament.tournamentDate >= now &&
            tournament.status !== "cancelled"
        );

        const history = validTournaments.filter(
          (tournament) =>
            tournament.tournamentDate < now || tournament.status === "cancelled"
        );

        setTournamentBookings(upcoming);
        setTournamentBookingsHistory(history);
      } else {
        setTournamentBookings([]);
        setTournamentBookingsHistory([]);
      }
    } catch (error) {
      console.error("Error fetching tournament bookings:", error);
      setError("Failed to load tournament bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create fallback tournament object
  const createFallbackTournamentObject = (booking) => {
    // Format date
    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";

      try {
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleString("default", { month: "short" });

        const getSuffix = (d) => {
          if (d > 3 && d < 21) return "th";
          switch (d % 10) {
            case 1:
              return "st";
            case 2:
              return "nd";
            case 3:
              return "rd";
            default:
              return "th";
          }
        };

        return `${month} ${day}${getSuffix(day)}`;
      } catch {
        return "N/A";
      }
    };

    const tournamentDate = booking.tournamentDate || booking.date || new Date();

    return {
      id: booking.tournamentId || "unknown",
      name: booking.tournamentName || "Tournament",
      type: booking.tournamentType || "Tournament",
      date: formatDate(tournamentDate),
      startTime: booking.startTime || booking.tournamentStartTime || "10:00 AM",
      bookingClose: formatDate(booking.bookingCloseDate),
      price: booking.tournamentFee || booking.price || "N/A",
      club: booking.venue || booking.clubName || "N/A",
      address: booking.location || booking.address || "N/A",
      image: require("../../../assets/tournament-banner.jpg"),
      booking: booking,
      status: booking.status || "confirmed",
      tournamentDate: new Date(tournamentDate),
    };
  };

  // Format tournament data to match the expected structure in the UI
  const formatTournamentData = (tournament, booking) => {
    if (!tournament) {
      return createFallbackTournamentObject(booking);
    }

    // Calculate date range for display
    let dateDisplay = "NA";
    let startTime = "NA";
    let tournamentDate = new Date();

    try {
      tournamentDate = new Date(
        tournament.selectedDate || booking.date || Date.now()
      );
      const endDate = new Date(tournamentDate);
      endDate.setDate(endDate.getDate() + 1); // Assuming 2-day tournaments

      const formatDate = (date) => {
        const day = date.getDate();
        const month = date.toLocaleString("default", { month: "short" });
        const suffix = getSuffix(day);
        return `${month} ${day}${suffix}`;
      };

      const getSuffix = (day) => {
        if (day > 3 && day < 21) return "th";
        switch (day % 10) {
          case 1:
            return "st";
          case 2:
            return "nd";
          case 3:
            return "rd";
          default:
            return "th";
        }
      };

      const startDateFormatted = formatDate(tournamentDate);
      const endDateFormatted = formatDate(endDate);
      dateDisplay = `${startDateFormatted} - ${endDateFormatted}`;

      // Get time from the selectedTime object or default to a preset
      startTime = "10:00am";
      if (tournament.selectedTime && tournament.selectedTime.startTime) {
        startTime = tournament.selectedTime.startTime;
      }
    } catch (error) {
      console.error("Error formatting tournament dates:", error);
    }

    // Create image URI from tournament data or use a default
    let imageUri;
    try {
      if (tournament.imageUrl) {
        imageUri = { uri: `${API.UPLOADS_URL}/${tournament.imageUrl}` };
      } else {
        // Default image path
        imageUri = require("../../../assets/tournament-banner.jpg");
      }
    } catch (error) {
      console.error("Error setting tournament image:", error);
      imageUri = require("../../../assets/tournament-banner.jpg");
    }

    return {
      id: tournament._id || booking.tournamentId || "NA",
      name: tournament.title || booking.tournamentName || "NA",
      type:
        tournament.type ||
        tournament.sportsType ||
        booking.tournamentType ||
        "Tournament",
      date: dateDisplay,
      startTime: startTime,
      price: tournament.tournamentFee
        ? `₹ ${tournament.tournamentFee}`
        : booking.price
          ? `₹ ${booking.price}`
          : "₹ 0",
      club: tournament.eventLocation || booking.venue || "NA",
      address: tournament.address || booking.location || "NA",
      image: imageUri,
      booking: booking,
      status: booking.status || "confirmed",
      tournamentDate: tournamentDate,
      rawData: tournament,
    };
  };

  // Function to format date string
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Render turf booking card
  const renderTurfBookingCard = (booking) => (
    <View key={booking.id} style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={booking.image} style={styles.venueImage} />
        <View style={styles.titleOverlay}>
          <Text style={styles.venueTitle}>{booking.name}</Text>
          {booking.status === "cancelled" && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledText}>Cancelled</Text>
            </View>
          )}
          {booking.status === "confirmed" && (
            <View style={[styles.cancelledBadge, { backgroundColor: "#059669" }]}>
              <Text style={styles.cancelledText}>Confirmed</Text>
            </View>
          )}
          {booking.status === "pending" && (
            <View style={[styles.cancelledBadge, { backgroundColor: "#D97706" }]}>
              <Text style={styles.cancelledText}>Pending</Text>
            </View>
          )}
          {booking.status === "completed" && (
            <View style={[styles.cancelledBadge, { backgroundColor: "#2563EB" }]}>
              <Text style={styles.cancelledText}>Completed</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.locations}>
          <View style={styles.locationTextWrapper}>
            <Text style={styles.locationText}>{booking.location}</Text>
          </View>
        </View>

        <View style={styles.tagRow}>
          <View style={styles.tagWithIcon}>
            <Image
              source={getSportIcon(booking.sport)}
              style={styles.tagIcon}
            />
            <Text style={styles.tagText}>{booking.sport}</Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={16} color="#FF6A00" />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>
              {formatDate(booking.bookingDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="access-time" size={16} color="#FF6A00" />
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{booking.timeSlot}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={16} color="#FF6A00" />
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>₹{booking.amount}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="payment" size={16} color="#FF6A00" />
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>
              {booking.paymentStatus === "paid" ? "Paid" : "Pay at venue"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
          <TouchableOpacity
            style={[styles.viewDetailsButton, { flex: 1 }]}
            onPress={() =>
              navigation.navigate("TurfConfirmation", {
                bookingId: booking.id,
                userId: user?.id || user?._id,
                turfId:
                  typeof booking.turfId === "object"
                    ? booking.turfId._id || booking.turfId.id || ""
                    : booking.turfId,
                turfName: booking.name,
                date: formatDate(booking.bookingDate),
                time: booking.timeSlot,
                venue: booking.location,
                amount: booking.amount,
                status: booking.status,
                paymentMethod: booking.paymentMethod || "cash",
              })
            }
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#0047AB" />
          </TouchableOpacity>

          {booking.isUpcoming && booking.status !== "cancelled" && (
            <TouchableOpacity
              style={[styles.viewDetailsButton, { flex: 1, backgroundColor: "#FFF0F0" }]}
              onPress={() => {
                Alert.alert(
                  "Cancel Booking",
                  `Are you sure you want to cancel your booking at ${booking.name} on ${formatDate(booking.bookingDate)} (${booking.timeSlot})?`,
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const res = await axios.post(API.ENDPOINTS.TURF_BOOKINGS.CANCEL, {
                            bookingId: booking.id || booking._id,
                            userId: user?.id || user?._id,
                            reason: "Cancelled by user",
                          });
                          if (res.data.success) {
                            Alert.alert("Success", "Booking cancelled successfully");
                            fetchTurfBookings();
                          } else {
                            Alert.alert("Error", res.data.message || "Failed to cancel");
                          }
                        } catch (err) {
                          Alert.alert(
                            "Error",
                            err.response?.data?.message || "Failed to cancel booking"
                          );
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <MaterialIcons name="cancel" size={16} color="#DC2626" />
              <Text style={[styles.viewDetailsText, { color: "#DC2626" }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  // Render tournament booking card
  // const renderTournamentCard = (item) => (
  //   <View key={item.id} style={styles.tournamentCard}>
  //     <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
  //     <View style={styles.cardContent}>
  //       <View style={styles.cardHeader}>
  //         <Text style={styles.tournamentName}>{item.name || "NA"}</Text>
  //         <Text style={styles.tournamentType}>{item.type || "NA"}</Text>
  //       </View>

  //       <View style={styles.datePriceRow}>
  //         <Text style={styles.tournamentDate}>{item.date || "NA"}</Text>
  //         <Text style={styles.tournamentPrice}>{item.price || "NA"}</Text>
  //       </View>

  //       <Text style={styles.startTimeText}>
  //         Start Time: {item.startTime || "NA"}
  //       </Text>

  //       {item.status === "cancelled" && (
  //         <View style={styles.statusBadge}>
  //           <Text style={styles.statusText}>Cancelled</Text>
  //         </View>
  //       )}

  //       <Text style={styles.clubNameTitle}>Club Name</Text>
  //       <Text style={styles.clubNameText}>{item.club || "NA"}</Text>

  //       <TouchableOpacity
  //         style={styles.viewDetailsButton}
  //         onPress={() => {
  //           navigation.navigate("BookingConfirmation", {
  //             bookingId: item.booking._id,
  //             userId: user?.id || user?._id,
  //             tournamentId: item.id,
  //             tournamentName: item.name,
  //             date: item.date,
  //             time: item.startTime,
  //             venue: item.club,
  //             amount: item.price ? item.price.replace("₹ ", "") : "0",
  //             status: item.status,
  //             name: user?.name || "",
  //             email: user?.email || "",
  //             phone:
  //               item.booking.userPhone ||
  //               user?.phone ||
  //               user?.phoneNumber ||
  //               user?.mobile ||
  //               "",
  //           });
  //         }}
  //       >
  //         <Text style={styles.viewDetailsText}>View Details</Text>
  //         <MaterialIcons name="arrow-forward" size={16} color="#0047AB" />
  //       </TouchableOpacity>
  //     </View>
  //   </View>
  // );

  // Render tournament booking card
  const renderTournamentCard = (item) => (
    <View key={item.id} style={styles.tournamentCard}>
      <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.tournamentName}>{item.name || "NA"}</Text>
          <Text style={styles.tournamentType}>{item.type || "NA"}</Text>
        </View>

        <View style={styles.datePriceRow}>
          <Text style={styles.tournamentDate}>{item.date || "NA"}</Text>
          <Text style={styles.tournamentPrice}>{item.price || "NA"}</Text>
        </View>

        <Text style={styles.startTimeText}>
          Start Time: {item.startTime || "NA"}
        </Text>

        {item.status === "cancelled" && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Cancelled</Text>
          </View>
        )}

        <Text style={styles.clubNameTitle}>Club Name</Text>
        <Text style={styles.clubNameText}>{item.club || "NA"}</Text>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => {
            // Try to extract phone from all possible sources
            let phoneNumber = "";

            // Try booking object first (most direct source)
            if (item.booking) {
              phoneNumber =
                item.booking.userPhone ||
                item.booking.phone ||
                item.booking.phoneNumber ||
                item.booking.userContact ||
                "";

              // If booking has userId/user object, check there too
              if (!phoneNumber && item.booking.userId) {
                const bookingUser = item.booking.userId;
                if (typeof bookingUser === "object") {
                  phoneNumber =
                    bookingUser.phone ||
                    bookingUser.phoneNumber ||
                    bookingUser.mobile ||
                    bookingUser.contact ||
                    "";
                }
              }

              // If booking has user property, check there
              if (!phoneNumber && item.booking.user) {
                const bookingUser = item.booking.user;
                phoneNumber =
                  bookingUser.phone ||
                  bookingUser.phoneNumber ||
                  bookingUser.mobile ||
                  bookingUser.contact ||
                  "";
              }
            }

            // If still empty, try user object
            if (!phoneNumber && user) {
              phoneNumber =
                user.phone ||
                user.phoneNumber ||
                user.mobile ||
                user.contact ||
                "";
            }

            // Final fallback - Use a placeholder or prompt user
            if (!phoneNumber) {
              phoneNumber = "Not available";

              // Optional: Alert user that phone is missing
              // Alert.alert("Missing Information", "Phone number is not available. Please update your profile.");
            }

            // Navigate with all relevant information
            navigation.navigate("BookingConfirmation", {
              bookingId: item.booking?._id,
              userId: user?.id || user?._id,
              tournamentId: item.id,
              tournamentName: item.name,
              date: item.date,
              time: item.startTime,
              venue: item.club,
              amount: item.price ? item.price.replace("₹ ", "") : "0",
              status: item.status,
              // Complete participant information
              name:
                item.booking?.userName || user?.name || user?.fullName || "",
              email: item.booking?.userEmail || user?.email || "",
              phone: phoneNumber,
              // Team information if available
              team: item.booking?.team,
              tournamentType: item.type,
            });
          }}
        >
          <Text style={styles.viewDetailsText}>View Details</Text>
          <MaterialIcons name="arrow-forward" size={16} color="#0047AB" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Get sport icon
  const getSportIcon = (sportName) => {
    if (!sportName) return require("../../../assets/ping-pong.png");

    const sport = (sportName || "").toLowerCase().trim();
    const iconMap = {
      cricket: require("../../../assets/sports_cricket.png"),
      football: require("../../../assets/sports_soccer.png"),
      soccer: require("../../../assets/sports_soccer.png"),
      badminton: require("../../../assets/shuttlecock.png"),
      "table tennis": require("../../../assets/ping-pong.png"),
      tennis: require("../../../assets/ping-pong.png"),
    };
    return iconMap[sport] || require("../../../assets/ping-pong.png");
  };

  // Render empty state
  const renderEmptyState = (message) => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="event-busy" size={64} color="#ddd" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f2f4f6" }}>
    <ScrollView style={styles.containers} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[styles.BookingContainer, { marginTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.Bookingtext}>My Booking</Text>
      </View>

      {/* Top Tabs */}
      <View style={styles.tabContainer}>
        {["Turf", "Tournament", "Coaching"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Turf Content */}
      {activeTab === "Turf" && (
        <View style={styles.contentContainer}>
          {/* Inner Tabs */}
          <View style={styles.innerTabContainer}>
            <TouchableOpacity
              style={
                innerActiveTab === "Upcoming"
                  ? styles.innerTabActive
                  : styles.innerTab
              }
              onPress={() => setInnerActiveTab("Upcoming")}
            >
              <Text
                style={
                  innerActiveTab === "Upcoming"
                    ? styles.innerTabTextActive
                    : styles.innerTabText
                }
              >
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                innerActiveTab === "History"
                  ? styles.innerTabActive
                  : styles.innerTab
              }
              onPress={() => setInnerActiveTab("History")}
            >
              <Text
                style={
                  innerActiveTab === "History"
                    ? styles.innerTabTextActive
                    : styles.innerTabText
                }
              >
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6A00" />
              <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#f44336" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchTurfBookings}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Turf List on Upcoming Tab */}
          {!loading && !error && innerActiveTab === "Upcoming" && (
            <View>
              {turfBookings.length > 0
                ? turfBookings.map((booking) => renderTurfBookingCard(booking))
                : renderEmptyState("No upcoming turf bookings")}
            </View>
          )}

          {/* Turf History Tab */}
          {!loading && !error && innerActiveTab === "History" && (
            <View>
              {turfBookingsHistory.length > 0
                ? turfBookingsHistory.map((booking) =>
                  renderTurfBookingCard(booking)
                )
                : renderEmptyState("No booking history found")}
            </View>
          )}
        </View>
      )}

      {/* Tournament Content */}
      {activeTab === "Tournament" && (
        <View style={styles.contentContainer}>
          {/* Inner Tabs */}
          <View style={styles.innerTabContainer}>
            <TouchableOpacity
              style={
                innerActiveTab === "Upcoming"
                  ? styles.innerTabActive
                  : styles.innerTab
              }
              onPress={() => setInnerActiveTab("Upcoming")}
            >
              <Text
                style={
                  innerActiveTab === "Upcoming"
                    ? styles.innerTabTextActive
                    : styles.innerTabText
                }
              >
                Upcoming
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                innerActiveTab === "History"
                  ? styles.innerTabActive
                  : styles.innerTab
              }
              onPress={() => setInnerActiveTab("History")}
            >
              <Text
                style={
                  innerActiveTab === "History"
                    ? styles.innerTabTextActive
                    : styles.innerTabText
                }
              >
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6A00" />
              <Text style={styles.loadingText}>Loading tournaments...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#f44336" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchTournamentBookings}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tournament List on Upcoming Tab */}
          {!loading && !error && innerActiveTab === "Upcoming" && (
            <View style={styles.tournamentList}>
              {tournamentBookings.length > 0
                ? tournamentBookings.map((item) => renderTournamentCard(item))
                : renderEmptyState("No upcoming tournament bookings")}
            </View>
          )}

          {/* Tournament History Tab */}
          {!loading && !error && innerActiveTab === "History" && (
            <View style={styles.tournamentList}>
              {tournamentBookingsHistory.length > 0
                ? tournamentBookingsHistory.map((item) =>
                  renderTournamentCard(item)
                )
                : renderEmptyState("No tournament history found")}
            </View>
          )}
        </View>
      )}

      {activeTab === "Coaching" && <Bookingcoach />}
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  containers: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#f2f4f6",
  },
  BookingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  Bookingtext: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  tabButton: {
    borderWidth: 1,
    borderColor: "#DEDEDE",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  activeTab: {
    borderWidth: 1.5,
    borderColor: "#004E93",
  },
  tabText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  activeTabText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "400",
  },
  contentContainer: {
    width: "100%",
  },
  contentText: {
    fontSize: 22,
    color: "#333",
  },
  innerTabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
    marginHorizontal: 20,
  },
  innerTab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 10,
  },
  innerTabActive: {
    flex: 1,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#ff6a00",
    paddingBottom: 11,
  },
  innerTabText: {
    fontSize: 16,
    color: "#333",
  },
  innerTabTextActive: {
    fontSize: 16,
    color: "#ff6a00",
    fontWeight: "bold",
  },
  // Loading and error states
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginTop: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#f44336",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#0047AB",
    borderRadius: 5,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  // Turf Booking Card Styles
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: "relative",
  },
  venueImage: {
    width: "100%",
    height: 200,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    padding: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  cancelledBadge: {
    backgroundColor: "#f44336",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginLeft: 10,
  },
  cancelledText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  cardContent: {
    padding: 15,
  },
  venueTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  ratingText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "400",
  },
  locations: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationText: {
    color: "#333",
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "400",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 15,
  },
  tagWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
    resizeMode: "contain",
  },
  tagText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
  },
  bookingDetails: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginLeft: 8,
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f7ff",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginTop: 5,
  },
  viewDetailsText: {
    color: "#0047AB",
    fontWeight: "500",
    marginRight: 5,
  },
  // Tournament Card Styles
  tournamentList: {
    paddingHorizontal: 16,
  },
  tournamentCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    overflow: "hidden",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  tournamentType: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  datePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tournamentDate: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  tournamentPrice: {
    fontSize: 14,
    color: "#FF6A00",
    fontWeight: "bold",
  },
  startTimeText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
  },
  statusBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f44336",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    marginBottom: 10,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  clubNameTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  clubNameText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginBottom: 15,
  },
});

export default MyBooking;
