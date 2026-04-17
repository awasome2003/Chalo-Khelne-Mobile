import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import CouponInput from "../../components/CouponInput";

const VenueBookingScreen = ({ route }) => {
  const { turfId } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [turfDetails, setTurfDetails] = useState(null);
  const [loadingTurf, setLoadingTurf] = useState(true);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [availableSports, setAvailableSports] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { coupon_id, code, discount_amount, final_amount }

  // Initialize form with user data and fetch turf details
  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.fullName || user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || user.phoneNumber || "");
    }
    fetchTurfDetails();
  }, [user, isAuthenticated, turfId]);

  // Effect to fetch available time slots when date or turf changes
  useEffect(() => {
    if (turfId && date) {
      fetchAvailability();
    }
  }, [turfId, date]);

  // Fetch turf details
  const fetchTurfDetails = async () => {
    try {
      setLoadingTurf(true);
      const response = await fetch(API.ENDPOINTS.TURFS.BY_ID(turfId));

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setTurfDetails(data);

      // Set initial selected sport if available
      if (data.sports && data.sports.length > 0) {
        setSelectedSport(data.sports[0]);
        setAvailableSports(data.sports);
      }
    } catch (error) {
      console.error("Error fetching turf details:", error);
      Alert.alert("Error", "Failed to load venue details. Please try again.");
    } finally {
      setLoadingTurf(false);
    }
  };

  // Fetch availability for selected date
  const fetchAvailability = async () => {
    try {
      const sportParam = selectedSport
        ? `&sportName=${selectedSport.name}`
        : "";
      const response = await axios.get(
        `${API.ENDPOINTS.TURF_BOOKINGS.AVAILABILITY(
          turfId
        )}?date=${date}${sportParam}`
      );

      if (
        response.data.success &&
        response.data.timeSlots &&
        response.data.timeSlots.length > 0
      ) {
        setAvailableTimeSlots(response.data.timeSlots);
      } else {
        setAvailableTimeSlots(predefinedTimeSlots);
      }

      // Still update sports from API if available
      if (
        response.data.success &&
        response.data.sports &&
        response.data.sports.length > 0
      ) {
        setAvailableSports(response.data.sports);

        // If no sport is selected yet, select the first one
        if (!selectedSport) {
          setSelectedSport(response.data.sports[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching availability:", error);

      setAvailableTimeSlots(predefinedTimeSlots);

      if (
        !selectedSport &&
        turfDetails?.sports &&
        turfDetails.sports.length > 0
      ) {
        setSelectedSport(turfDetails.sports[0]);
      }
    }
  };

  // Fallback time slots in case the API call fails
  const predefinedTimeSlots = [
    {
      id: "slot-6",
      startTime: "6:00",
      endTime: "7:00",
      timeSlot: "6:00 - 7:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-7",
      startTime: "7:00",
      endTime: "8:00",
      timeSlot: "7:00 - 8:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-8",
      startTime: "8:00",
      endTime: "9:00",
      timeSlot: "8:00 - 9:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-9",
      startTime: "9:00",
      endTime: "10:00",
      timeSlot: "9:00 - 10:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-10",
      startTime: "10:00",
      endTime: "11:00",
      timeSlot: "10:00 - 11:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-11",
      startTime: "11:00",
      endTime: "12:00",
      timeSlot: "11:00 - 12:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-12",
      startTime: "12:00",
      endTime: "13:00",
      timeSlot: "12:00 - 13:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-13",
      startTime: "13:00",
      endTime: "14:00",
      timeSlot: "13:00 - 14:00",
      available: false,
      price: 500,
    },
    {
      id: "slot-14",
      startTime: "14:00",
      endTime: "15:00",
      timeSlot: "14:00 - 15:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-15",
      startTime: "15:00",
      endTime: "16:00",
      timeSlot: "15:00 - 16:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-16",
      startTime: "16:00",
      endTime: "17:00",
      timeSlot: "16:00 - 17:00",
      available: true,
      price: 500,
    },
    {
      id: "slot-17",
      startTime: "17:00",
      endTime: "18:00",
      timeSlot: "17:00 - 18:00",
      available: false,
      price: 500,
    },
    {
      id: "slot-18",
      startTime: "18:00",
      endTime: "19:00",
      timeSlot: "18:00 - 19:00",
      available: true,
      price: 600,
    },
    {
      id: "slot-19",
      startTime: "19:00",
      endTime: "20:00",
      timeSlot: "19:00 - 20:00",
      available: true,
      price: 600,
    },
    {
      id: "slot-20",
      startTime: "20:00",
      endTime: "21:00",
      timeSlot: "20:00 - 21:00",
      available: true,
      price: 600,
    },
    {
      id: "slot-21",
      startTime: "21:00",
      endTime: "22:00",
      timeSlot: "21:00 - 22:00",
      available: true,
      price: 600,
    },
  ];

  // Handle date selection
  const handleDateChange = (newDate) => {
    setDate(newDate);
    setSelectedTimeSlot(null); // Reset time slot selection when date changes
  };

  // Handle sport selection
  const handleSportChange = (sport) => {
    setSelectedSport(sport);
    fetchAvailability(); // Refresh availability for the new sport
  };

  // Form validation
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) errors.name = "Name is required";
    if (!email.trim()) errors.email = "Email is required";
    if (!phone.trim()) errors.phone = "Phone number is required";
    if (!/^\d{10}$/.test(phone.trim())) {
      errors.phone = "Phone number must be exactly 10 digits";
    }

    if (!date) errors.date = "Date is required";
    if (!selectedTimeSlot) errors.timeSlot = "Please select a time slot";
    if (!selectedSport) errors.sport = "Please select a sport";

    if (!termsAccepted) {
      errors.terms = "You must accept the terms and conditions";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle booking submission
  const handleBooking = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Create booking data
      const bookingData = {
        userId: user?.id || user?._id,
        userName: name,
        userEmail: email,
        userPhone: phone,
        turfId: turfId,
        turfName: turfDetails?.name,
        sportName: selectedSport.name,
        date: date,
        timeSlot: selectedTimeSlot.timeSlot,
        amount: selectedSport.pricePerHour || selectedTimeSlot.price,
        paymentMethod: "cash",
      };

      // Call API to create booking
      const response = await axios.post(
        API.ENDPOINTS.TURF_BOOKINGS.CREATE,
        bookingData
      );

      // Check if booking was successful
      if (response.data && response.data.success) {
        // Extract booking details from response
        const bookingId = response.data.booking?._id;

        // Navigate to confirmation screen
        navigation.navigate("TurfConfirmation", {
          bookingId,
          userId: user?.id || user?._id,
          turfId: turfId,
          turfName: turfDetails?.name || "Turf",
          type: selectedSport.name,
          date: date,
          time: selectedTimeSlot.timeSlot,
          venue: turfDetails?.address
            ? `${turfDetails.address.area}, ${turfDetails.address.city}`
            : "Venue address not available",
          amount: selectedSport.pricePerHour || selectedTimeSlot.price,
          status: "Confirmed",
          name,
          email,
          phone,
          paymentMethod: "cash",
        });
      } else {
        throw new Error(
          response.data?.message || "Booking failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Booking error:", error);
      Alert.alert(
        "Booking Failed",
        error.response?.data?.message ||
          error.message ||
          "Failed to complete booking. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loadingTurf) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Turf</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Turf Info */}
        <View style={styles.turfInfoCard}>
          <Text style={styles.turfName}>{turfDetails?.name}</Text>
          <Text style={styles.turfAddress}>
            {turfDetails?.address
              ? `${turfDetails.address.area}, ${turfDetails.address.city}`
              : "Address not available"}
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.name ? styles.inputError : null,
              ]}
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#aaa"
            />
            {validationErrors.name && (
              <Text style={styles.errorText}>{validationErrors.name}</Text>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.email ? styles.inputError : null,
              ]}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#aaa"
            />
            {validationErrors.email && (
              <Text style={styles.errorText}>{validationErrors.email}</Text>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.phone ? styles.inputError : null,
              ]}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor="#aaa"
            />
            {validationErrors.phone && (
              <Text style={styles.errorText}>{validationErrors.phone}</Text>
            )}
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          {/* Date Selection */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Date</Text>
            {/* Simple date input - you can enhance this with a date picker */}
            <TextInput
              style={[
                styles.input,
                validationErrors.date ? styles.inputError : null,
              ]}
              placeholder="YYYY-MM-DD"
              value={date}
              onChangeText={handleDateChange}
              placeholderTextColor="#aaa"
            />
            {validationErrors.date && (
              <Text style={styles.errorText}>{validationErrors.date}</Text>
            )}
          </View>

          {/* Sport Selection */}
          {availableSports.length > 0 && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Select Sport</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.sportOptionsContainer}>
                  {availableSports.map((sport, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.sportOption,
                        selectedSport?.name === sport.name &&
                          styles.selectedSportOption,
                      ]}
                      onPress={() => handleSportChange(sport)}
                    >
                      <Text
                        style={[
                          styles.sportOptionText,
                          selectedSport?.name === sport.name &&
                            styles.selectedSportOptionText,
                        ]}
                      >
                        {sport.name}
                      </Text>
                      <Text
                        style={[
                          styles.sportPriceText,
                          selectedSport?.name === sport.name &&
                            styles.selectedSportOptionText,
                        ]}
                      >
                        ₹{sport.pricePerHour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              {validationErrors.sport && (
                <Text style={styles.errorText}>{validationErrors.sport}</Text>
              )}
            </View>
          )}

          {/* Time Slot Selection */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Select Time Slot</Text>
            {availableTimeSlots.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.timeSlotContainer}
              >
                <View style={styles.timeSlotWrap}>
                  {availableTimeSlots.map((slot, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        selectedTimeSlot?.id === slot.id &&
                          styles.selectedTimeSlot,
                        !slot.available && styles.disabledTimeSlot,
                      ]}
                      onPress={() =>
                        slot.available && setSelectedTimeSlot(slot)
                      }
                      disabled={!slot.available}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTimeSlot?.id === slot.id &&
                            styles.selectedTimeSlotText,
                          !slot.available && styles.disabledTimeSlotText,
                        ]}
                      >
                        {slot.timeSlot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.noSlotsText}>
                No time slots available for this date
              </Text>
            )}
            {validationErrors.timeSlot && (
              <Text style={styles.errorText}>{validationErrors.timeSlot}</Text>
            )}
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Hourly Rate:</Text>
              <Text style={styles.paymentValue}>
                ₹{selectedSport ? selectedSport.pricePerHour : "N/A"}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Payment Method:</Text>
              <Text style={styles.paymentValue}>Cash (Pay at Venue)</Text>
            </View>
            <View style={styles.paymentInfoBox}>
              <MaterialIcons name="info" size={20} color="#0047AB" />
              <Text style={styles.paymentInfoText}>
                Please bring the exact amount in cash when you arrive at the
                venue.
              </Text>
            </View>
          </View>
        </View>

        {/* Coupon Code */}
        {selectedSport && (
          <View style={styles.formSection}>
            <CouponInput
              totalAmount={selectedSport.pricePerHour || 0}
              applicableType="facility"
              applicableId={turfId}
              userId={user?._id || user?.id}
              onApply={(couponData) => setAppliedCoupon(couponData)}
              onRemove={() => setAppliedCoupon(null)}
            />
            {appliedCoupon && (
              <View style={{ backgroundColor: "#ECFDF5", borderRadius: 10, padding: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: "#065F46", fontWeight: "600" }}>
                  Final Amount: ₹{appliedCoupon.final_amount} (saved ₹{appliedCoupon.discount_amount})
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Terms and Conditions */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAccepted(!termsAccepted)}
        >
          <MaterialIcons
            name={termsAccepted ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={termsAccepted ? "#FF6A00" : "#666"}
          />
          <Text style={styles.termsText}>
            I agree to the venue's terms and conditions
          </Text>
        </TouchableOpacity>

        {validationErrors.terms && (
          <Text style={[styles.errorText, { textAlign: "center" }]}>
            {validationErrors.terms}
          </Text>
        )}

        {/* Book Now Button */}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={handleBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>Book Now</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  formContainer: {
    flex: 1,
  },
  turfInfoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  turfName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  turfAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  formSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  inputError: {
    borderColor: "#f44336",
  },
  errorText: {
    color: "#f44336",
    fontSize: 12,
    marginTop: 4,
  },
  sportOptionsContainer: {
    flexDirection: "row",
    marginVertical: 8,
  },
  sportOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f5f5f5",
    marginRight: 10,
    minWidth: 80,
    alignItems: "center",
  },
  selectedSportOption: {
    backgroundColor: "#FF6A00",
    borderColor: "#FF6A00",
  },
  sportOptionText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  sportPriceText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  selectedSportOptionText: {
    color: "#fff",
  },
  timeSlotContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  timeSlotWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  timeSlotButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  selectedTimeSlot: {
    backgroundColor: "#FF6A00",
    borderColor: "#FF6A00",
  },
  disabledTimeSlot: {
    backgroundColor: "#f0f0f0",
    borderColor: "#e0e0e0",
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 13,
    color: "#444",
  },
  selectedTimeSlotText: {
    color: "#fff",
  },
  disabledTimeSlotText: {
    color: "#999",
  },
  noSlotsText: {
    color: "#f57c00",
    fontStyle: "italic",
    marginTop: 8,
    fontSize: 13,
  },
  paymentCard: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#555",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  paymentInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
  },
  paymentInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#0047AB",
    marginLeft: 10,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 16,
  },
  termsText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
    flex: 1,
  },
  bookButton: {
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VenueBookingScreen;
