import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Share,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";

const SUPPORT_PHONE = "+91 98765 43210";

// ─── Helpers ────────────────────────────────────────────────────────────

const formatDateFull = (raw) => {
  if (!raw) return "";
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// "07:00 - 08:00" / "7:00 - 8:00" → "7:00 AM - 8:00 AM" (or PM)
const formatTimeRange = (timeSlot) => {
  if (!timeSlot) return "";
  // Multiple booked slots arrive comma-separated — format each part.
  if (String(timeSlot).includes(",")) {
    return String(timeSlot)
      .split(",")
      .map((p) => formatTimeRange(p.trim()))
      .join(", ");
  }
  const matches = timeSlot.match(/(\d{1,2}):(\d{2})/g);
  if (!matches || matches.length === 0) return timeSlot;
  const fmt = (t) => {
    const [hStr, mStr] = t.split(":");
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return t;
    const ap = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ap}`;
  };
  if (matches.length === 1) return fmt(matches[0]);
  return `${fmt(matches[0])} - ${fmt(matches[1])}`;
};

const paymentMethodLabel = (method, provider) => {
  const m = String(method || "").toLowerCase();
  const p = String(provider || "").toLowerCase();
  if (m === "cash") return "Cash on Delivery";
  if (m === "online") {
    if (p === "upi") return "UPI";
    if (p === "card") return "Card";
    if (p === "wallet") return "Wallet";
    return "Online";
  }
  if (m === "free") return "Free";
  if (m === "waived") return "Waived";
  if (!method) return "—";
  return method.charAt(0).toUpperCase() + method.slice(1);
};

const statusColors = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("confirm")) return { bg: "#E8F7F0", text: "#15A765" };
  if (s.includes("cancel")) return { bg: "#FFEBEE", text: "#C62828" };
  if (s.includes("pending")) return { bg: "#FFF8E1", text: "#F57C00" };
  return { bg: "#F4F4F5", text: "#666666" };
};

const VenueBookingConfirmation = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const {
    bookingId = null,
    turfName = null,
    type = "Turf Booking",
    date = null,
    time = null,
    slotCount = 1,
    venue = null,
    amount = null,
    status = "Confirmed",
    name = null,
    email = null,
    phone = null,
    paymentMethod = "cash",
    paymentProvider = "",
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  // Short uppercased booking reference (first 8 chars of the id).
  const bookingRef =
    bookingId && typeof bookingId === "string" && bookingId.length >= 8
      ? bookingId.substring(0, 8).toUpperCase()
      : `TRF-${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}`;

  useFocusEffect(
    useCallback(() => {
      if (bookingId) {
        fetchBookingDetails();
      } else {
        setBooking({
          id: bookingRef,
          turfName,
          sportName: type,
          date,
          timeSlot: time,
          venue,
          amount,
          status,
          name,
          email,
          phone,
          paymentMethod,
          paymentProvider,
        });
        setLoading(false);
      }
    }, [bookingId])
  );

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        API.ENDPOINTS.TURF_BOOKINGS.BY_ID(bookingId)
      );
      if (response.data && response.data.success) {
        const b = response.data.booking;
        setBooking({
          id: b._id,
          turfName: b.turfName,
          sportName: b.sport?.name || type || "Not specified",
          date: b.date,
          // For a multi-slot order the fetched record is only the first slot —
          // show all booked slot times and the full order total instead.
          timeSlot: slotCount > 1 ? time : b.timeSlot,
          venue: b.turfId?.address
            ? `${b.turfId.address.area}, ${b.turfId.address.city}`
            : venue || "Venue not specified",
          amount: slotCount > 1 ? amount : b.amount,
          status: b.status,
          name: b.userName,
          email: b.userEmail,
          phone: b.userPhone,
          paymentMethod: b.paymentMethod,
          paymentProvider: b.paymentProvider,
          paymentStatus: b.paymentStatus,
        });
      } else {
        throw new Error("Booking not found");
      }
    } catch (err) {
      console.error("Error fetching booking details:", err);
      setError("Failed to load booking details. Using provided information.");
      setBooking({
        id: bookingRef,
        turfName,
        sportName: type,
        date,
        timeSlot: time,
        venue,
        amount,
        status,
        name,
        email,
        phone,
        paymentMethod,
        paymentProvider,
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Actions ─────────────────────────────────────────────────────────
  const handleBack = () => {
    // Back lands the user on the turf listing (PlayerVenue). It's registered
    // under "TurfList" in HomeStack and "Play" in PlayStack — pick whichever
    // exists in the current navigator's state.
    const state = navigation.getState();
    const inHomeStack = state?.routes?.some((r) => r.name === "TurfList");
    navigation.navigate(inHomeStack ? "TurfList" : "Play");
  };

  const handleShare = async () => {
    try {
      const message = `Booking confirmed at ${booking?.turfName || "the venue"} on ${formatDateFull(
        booking?.date
      )}, ${formatTimeRange(booking?.timeSlot)}. Ref: ${bookingRef}`;
      await Share.share({ message });
    } catch (e) {
      console.error("Share failed:", e);
    }
  };

  const handleCallSupport = () => {
    const tel = SUPPORT_PHONE.replace(/[\s-]/g, "");
    Linking.openURL(`tel:${tel}`).catch((e) =>
      console.error("Open dialer failed:", e)
    );
  };

  const handleChatSupport = () => {
    navigation.navigate("Chat", { screen: "ChatList" });
  };

  const handleViewBookingList = () => {
    navigation.navigate("MyBookings");
  };

  const handleCancelBooking = () => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const res = await axios.post(
                API.ENDPOINTS.TURF_BOOKINGS.CANCEL,
                { bookingId, reason: "Cancelled by user" }
              );
              if (res.data && res.data.success) {
                Alert.alert(
                  "Booking Cancelled",
                  "Your booking has been successfully cancelled.",
                  [{ text: "OK", onPress: handleBack }]
                );
              } else {
                throw new Error(
                  res.data?.message || "Failed to cancel booking"
                );
              }
            } catch (err) {
              console.error("Error cancelling booking:", err);
              Alert.alert(
                "Error",
                err.response?.data?.message ||
                  err.message ||
                  "Failed to cancel booking"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#15A765" />
        <Text style={s.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  const pillColors = statusColors(booking?.status);
  const canCancel =
    String(booking?.status || "").toLowerCase() !== "cancelled" && bookingId;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerBack}
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#1A181B" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Booking Confirmation</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={s.errorBanner}>
            <Ionicons name="information-circle" size={16} color="#fff" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {/* Success hero */}
        <View style={s.successWrap}>
          <View style={s.checkCircle}>
            <Ionicons name="checkmark" size={42} color="#FFFFFF" />
          </View>
          <Text style={s.successTitle}>Booking Confirmed</Text>
          <Text style={s.successSubtitle}>
            Your turf booking has been successfully confirmed enjoy!
          </Text>
        </View>

        {/* Ticket card */}
        <View style={s.ticketCard}>
          {/* Top stub */}
          <View style={s.ticketTop}>
            <Text style={s.ticketTurfName}>{booking?.turfName || "Turf"}</Text>
            <Text style={s.ticketAddress} numberOfLines={2}>
              {booking?.venue || "Address not available"}
            </Text>
          </View>

          {/* Perforation */}
          <View style={s.perforationRow}>
            <View style={s.notchLeft} />
            <View style={s.perforationLine} />
            <View style={s.notchRight} />
          </View>

          {/* Bottom stub */}
          <View style={s.ticketBottom}>
            <TouchableOpacity
              onPress={handleShare}
              style={s.shareBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-social-outline" size={20} color="#666" />
            </TouchableOpacity>

            <Text style={s.dateText}>{formatDateFull(booking?.date)}</Text>
            <Text style={s.timeText}>
              ({formatTimeRange(booking?.timeSlot)})
            </Text>

            <View style={s.kvRow}>
              <Text style={s.kvLabel}>Sport:</Text>
              <Text style={s.kvValue}>{booking?.sportName || "—"}</Text>
            </View>

            <View style={s.kvRow}>
              <Text style={s.kvLabel}>Booking Refrence</Text>
              <Text style={s.refValue}>{bookingRef}</Text>
            </View>

            <View style={s.kvRow}>
              <Text style={s.kvLabel}>Payment method:</Text>
              <Text style={s.kvValue}>
                {paymentMethodLabel(
                  booking?.paymentMethod,
                  booking?.paymentProvider
                )}
              </Text>
            </View>

            <View style={s.kvRow}>
              <Text style={s.kvLabel}>Status:</Text>
              <View style={[s.statusPill, { backgroundColor: pillColors.bg }]}>
                <Text style={[s.statusPillText, { color: pillColors.text }]}>
                  {booking?.status || "Confirmed"}
                </Text>
              </View>
            </View>

            <Image
              source={require("../../../assets/fallback.jpg")}
              style={s.sportsImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* View Booking List */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={handleViewBookingList}
          activeOpacity={0.85}
        >
          <Text style={s.primaryBtnText}>View Booking List</Text>
        </TouchableOpacity>

        {/* Help card */}
        <View style={s.helpCard}>
          <Text style={s.helpTitle}>Need help?</Text>
          <Text style={s.helpSubtitle}>
            Your item is safe. Reach out for updates
          </Text>

          <View style={s.helpRow}>
            <TouchableOpacity
              style={s.helpBtn}
              onPress={handleCallSupport}
              activeOpacity={0.85}
            >
              <Ionicons name="call-outline" size={18} color="#0088FF" />
              <Text style={s.helpBtnText}>{SUPPORT_PHONE}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.helpBtn}
              onPress={handleChatSupport}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="message-text-outline"
                size={18}
                color="#0088FF"
              />
              <Text style={s.helpBtnText}>Chat with us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Secondary: Cancel Booking */}
        {canCancel && (
          <TouchableOpacity
            style={s.cancelLink}
            onPress={handleCancelBooking}
            activeOpacity={0.7}
          >
            <Text style={s.cancelLinkText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerBack: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F44336",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  errorText: { color: "#fff", fontSize: 12, flex: 1 },

  // Success hero
  successWrap: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#15A765",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 18,
  },

  // Ticket card
  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    overflow: "hidden",
    marginBottom: 18,
  },
  ticketTop: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignItems: "center",
  },
  ticketTurfName: {
    fontSize: 17,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 4,
  },
  ticketAddress: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    textAlign: "center",
  },

  // Perforation
  perforationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: -8,
  },
  notchLeft: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1FA",
    marginLeft: -1,
  },
  notchRight: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1FA",
    marginRight: -1,
  },
  perforationLine: {
    flex: 1,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderTopColor: "#D1D5DB",
    marginHorizontal: 6,
  },

  ticketBottom: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    alignItems: "center",
    position: "relative",
  },
  shareBtn: {
    position: "absolute",
    top: 14,
    right: 16,
    padding: 4,
    zIndex: 2,
  },
  dateText: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  timeText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginTop: 2,
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  kvLabel: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },
  kvValue: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  refValue: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#0088FF",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
  sportsImage: {
    width: "100%",
    height: 80,
    marginTop: 16,
    borderRadius: 8,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: "#15A765",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },

  // Help card
  helpCard: {
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EEF1FA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  helpTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  helpSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    marginTop: 2,
    marginBottom: 12,
  },
  helpRow: {
    flexDirection: "row",
    gap: 10,
  },
  helpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1FA",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  helpBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#0088FF",
  },

  // Cancel link
  cancelLink: {
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelLinkText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#C62828",
    textDecorationLine: "underline",
  },
});

export default VenueBookingConfirmation;
