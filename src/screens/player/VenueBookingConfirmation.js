import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";

const VenueBookingConfirmation = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    bookingId = null,
    turfName = null,
    type = "Turf Booking",
    date = null,
    time = null,
    venue = null,
    amount = null,
    status = "Confirmed",
    name = null,
    email = null,
    phone = null,
    paymentMethod = "cash",
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);

  // Check if booking is in the future
  const isBookingFuture = () => {
    if (!booking) return false;

    // Parse booking date and time
    const bookingDateStr = booking.date;
    const bookingTimeStr = booking.timeSlot;

    if (!bookingDateStr || !bookingTimeStr) return false;

    // Create a date object for the booking date and time
    let bookingDateTime;
    try {
      // Extract time part from the time slot (handles "7:00 PM - 8:00 PM" or "18:00 - 19:00")
      let hours, minutes;
      const ampmMatch = bookingTimeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      const h24Match = bookingTimeStr.match(/(\d+):(\d+)/);

      if (ampmMatch) {
        hours = parseInt(ampmMatch[1]);
        minutes = parseInt(ampmMatch[2]);
        const period = ampmMatch[3];
        if (period.toUpperCase() === "PM" && hours < 12) hours += 12;
        else if (period.toUpperCase() === "AM" && hours === 12) hours = 0;
      } else if (h24Match) {
        hours = parseInt(h24Match[1]);
        minutes = parseInt(h24Match[2]);
      } else {
        return false;
      }

      // Parse the date
      const bookingDate = new Date(bookingDateStr);

      // Set the time
      bookingDate.setHours(hours, minutes, 0, 0);
      bookingDateTime = bookingDate;
    } catch (error) {
      console.error("Error parsing booking date/time:", error);
      return false;
    }

    // Compare with current date and time
    const now = new Date();
    return bookingDateTime > now;
  };

  // Generate a booking reference number
  const bookingRef = bookingId && typeof bookingId === "string" && bookingId.length >= 8
    ? bookingId.substring(0, 8).toUpperCase()
    : `TRF-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`;

  useFocusEffect(
    React.useCallback(() => {
      // If we have a bookingId, fetch the booking details
      if (bookingId) {
        fetchBookingDetails();
      } else {
        // Otherwise use the params passed in the route
        const bookingData = {
          id: bookingRef,
          turfName: turfName,
          sportName: type,
          date: date,
          timeSlot: time,
          venue: venue,
          amount: amount,
          status: status,
          name: name,
          email: email,
          phone: phone,
          paymentMethod: paymentMethod,
        };
        setBooking(bookingData);
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
        const bookingData = response.data.booking;

        // Format the booking data for display
        setBooking({
          id: bookingData._id,
          turfName: bookingData.turfName,
          sportName: bookingData.sport?.name || "Not specified",
          date: new Date(bookingData.date).toLocaleDateString(),
          timeSlot: bookingData.timeSlot,
          venue: bookingData.turfId?.address
            ? `${bookingData.turfId.address.area}, ${bookingData.turfId.address.city}`
            : venue || "Venue not specified",
          amount: bookingData.amount,
          status: bookingData.status,
          name: bookingData.userName,
          email: bookingData.userEmail,
          phone: bookingData.userPhone,
          paymentMethod: bookingData.paymentMethod,
          paymentStatus: bookingData.paymentStatus,
        });
      } else {
        // If API request was successful but booking wasn't found
        throw new Error("Booking not found");
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);

      setError(
        "Failed to load booking details. Using provided information instead."
      );

      // Fall back to route params
      const bookingData = {
        id: bookingRef,
        turfName: turfName,
        sportName: type,
        date: date,
        timeSlot: time,
        venue: venue,
        amount: amount,
        status: status,
        name: name,
        email: email,
        phone: phone,
        paymentMethod: paymentMethod,
      };
      setBooking(bookingData);
    } finally {
      setLoading(false);
    }
  };

  // Handle booking cancellation
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
              const response = await axios.post(
                API.ENDPOINTS.TURF_BOOKINGS.CANCEL,
                {
                  bookingId: bookingId,
                  reason: "Cancelled by user",
                }
              );

              if (response.data && response.data.success) {
                Alert.alert(
                  "Booking Cancelled",
                  "Your booking has been successfully cancelled.",
                  [{ text: "OK", onPress: () => navigation.navigate("Events") }]
                );
              } else {
                throw new Error(
                  response.data?.message || "Failed to cancel booking"
                );
              }
            } catch (error) {
              console.error("Error cancelling booking:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message ||
                  error.message ||
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmation</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: 100 }}>
        {error && (
          <View style={styles.errorBanner}>
            <MaterialIcons name="info" size={20} color="#fff" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="check" size={60} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successMessage}>
            Your turf booking has been successfully confirmed.
          </Text>
          <Text style={styles.bookingRef}>Booking Reference: {bookingRef}</Text>
        </View>

        {/* Venue Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Venue Details</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="sports-tennis" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Venue:</Text>
            <Text style={styles.detailValue}>{booking?.turfName || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="place" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Address:</Text>
            <Text style={styles.detailValue}>{booking?.venue || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="category" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Sport:</Text>
            <Text style={styles.detailValue}>
              {booking?.sportName || "N/A"}
            </Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{booking?.date || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="access-time" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{booking?.timeSlot || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="event-available" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Status:</Text>
            <Text
              style={[
                styles.statusText,
                booking?.status === "confirmed" ||
                booking?.status === "Confirmed"
                  ? styles.statusConfirmed
                  : booking?.status === "cancelled" ||
                    booking?.status === "Cancelled"
                  ? styles.statusCancelled
                  : styles.statusPending,
              ]}
            >
              {booking?.status || "Pending"}
            </Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>

          <View style={styles.detailRow}>
            <FontAwesome5 name="money-bill-wave" size={18} color="#4CAF50" />
            <Text style={styles.detailLabel}>Payment:</Text>
            <Text style={styles.detailValue}>Pay at Venue</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>₹{booking?.amount || "0"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="payment" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Status:</Text>
            <Text
              style={[
                styles.paymentStatusText,
                booking?.paymentStatus === "paid"
                  ? styles.statusConfirmed
                  : styles.statusPending,
              ]}
            >
              {booking?.paymentStatus === "paid"
                ? "Paid"
                : "Pending (Pay at venue)"}
            </Text>
          </View>

          <View style={styles.paymentNotice}>
            <MaterialIcons name="info" size={18} color="#0047AB" />
            <Text style={styles.paymentNoticeText}>
              Please bring the exact amount to the venue. Show this booking
              confirmation to the staff.
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>

          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{booking?.name || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="email" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{booking?.email || "N/A"}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={20} color="#FF6A00" />
            <Text style={styles.detailLabel}>Phone:</Text>
            <Text style={styles.detailValue}>{booking?.phone || "N/A"}</Text>
          </View>
        </View>

        {/* Cancel Booking Button - Only show if booking is not cancelled */}
        {(booking?.status === "confirmed" ||
          booking?.status === "Confirmed" ||
          booking?.status === "pending") && (
          <>
            {isBookingFuture() ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelBooking}
              >
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cancel Booking</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.disabledCancelButton}>
                <MaterialIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cannot Cancel (Too Late)</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  backBtn: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f44336",
    padding: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    color: "#fff",
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  successContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  bookingRef: {
    fontSize: 15,
    color: "#0047AB",
    fontWeight: "600",
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    width: 75,
    fontSize: 14,
    color: "#555",
    marginLeft: 8,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusConfirmed: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  statusPending: {
    backgroundColor: "#fff8e1",
    color: "#f57c00",
  },
  statusCancelled: {
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
  paymentNotice: {
    flexDirection: "row",
    marginTop: 8,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    alignItems: "flex-start",
  },
  paymentNoticeText: {
    flex: 1,
    fontSize: 13,
    color: "#0047AB",
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  homeButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#0047AB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: "row",
    backgroundColor: "#f44336",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  disabledCancelButton: {
    flexDirection: "row",
    backgroundColor: "#aaa",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
});

export default VenueBookingConfirmation;
