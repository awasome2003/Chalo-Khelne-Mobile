import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import TournamentConfig from "../../api/tournaments";

const BookingConfirmation = ({ route, navigation }) => {
  const {
    bookingId: rawBookingId = null,
    userId: rawUserId = null,
    tournamentId: rawTournamentId = null,
    managerId = null,
    tournament = null,
    tournamentName = null,
    date = null,
    time = null,
    venue = null,
    amount = null,
    status = null,
    name = null,
    email = null,
    phone = null,
    team = null,
    selectedCategories = [],
    // STEP 12c — Multi-sport: forward-looking shape from BookingScreen.
    // sportSelections is the authoritative per-sport breakdown; totalFee
    // is the backend-computed authoritative total. Both fall back to the
    // fetched bookingData when route.params doesn't carry them.
    sportSelections = [],
    totalFee = null,
    paymentMethod = "cash",
  } = route.params || {};

  const bookingId = (rawBookingId && typeof rawBookingId === "object") ? (rawBookingId._id || rawBookingId.id || rawBookingId).toString() : rawBookingId;
  const userId = (rawUserId && typeof rawUserId === "object") ? (rawUserId._id || rawUserId.id || rawUserId).toString() : rawUserId;
  const tournamentId = (rawTournamentId && typeof rawTournamentId === "object") ? (rawTournamentId._id || rawTournamentId.id || rawTournamentId).toString() : rawTournamentId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const receiptRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      const fetchBookingDetails = async () => {
        try {

          // Validate input parameters
          if (!bookingId && (!userId || !tournamentId) && !tournament) {
            throw new Error(
              "Insufficient information to fetch booking details"
            );
          }

          let response;
          let bookingResponse = null;

          // 1. Try fetching by booking ID first if available
          if (bookingId) {
            try {
              bookingResponse = await axios.get(
                `${TournamentConfig.ENDPOINTS.BOOKINGS.BY_ID(bookingId)}`
              );


              if (bookingResponse?.data?.success) {
                response = bookingResponse;
              }
            } catch (idError) {
              console.warn("Fetching by booking ID failed:", idError.message);
            }
          }

          // 2. Fallback to user and tournament ID
          if (
            (!response || !response.data?.success) &&
            userId &&
            tournamentId
          ) {
            try {

              const statusResponse = await axios.get(
                TournamentConfig.ENDPOINTS.BOOKINGS.STATUS,
                {
                  params: {
                    userId,
                    tournamentId,
                  },
                }
              );
              if (
                statusResponse?.data?.success &&
                statusResponse?.data?.booking
              ) {
                response = {
                  data: {
                    success: true,
                    booking: statusResponse.data.booking,
                  },
                };
              } else if (statusResponse?.data?.isBooked) {
                response = {
                  data: {
                    success: true,
                    booking: statusResponse.data,
                  },
                };
              }
            } catch (statusError) {
              console.warn(
                "Fetching by status check failed:",
                statusError.message
              );
            }
          }

          // Validate response
          if (!response || !response.data?.success) {
            // If direct API calls failed, use the route params data if it contains enough information
            if (tournament || tournamentName) {
              // Construct booking details from route params
              setBookingDetails({
                id: bookingId || `TEMP-${Date.now()}`,
                userId: userId,
                tournamentId: tournamentId,
                managerId: managerId,
                tournament: tournament || tournamentName,
                type: route.params.tournamentType,
                date: date,
                time: time || "TBA",
                venue: venue,
                name: name,
                email: email,
                phone: phone,
                team: typeof team === "string" ? team : team?.name,
                captain: team?.captain,
                players: team?.players,
                substitutes: team?.substitutes,
                amount: amount || 0,
                paymentMethod: paymentMethod || "cash",
                status: status || "Confirmed",
                selectedCategories: selectedCategories,
                paymentDate: new Date().toLocaleDateString(),
                paymentTime: new Date().toLocaleTimeString(),
              });
              setLoading(false);
              return;
            } else {
              throw new Error("No booking details found");
            }
          }

          // Process and set booking details
          const bookingData = response.data.booking || response.data;

          // Transform API response into the format expected by the component
          const processedBooking = {
            id: bookingData._id || bookingId,
            userId: bookingData.userId || userId,
            tournamentId: bookingData.tournamentId || tournamentId,
            managerId: bookingData.managerId || managerId,
            tournament:
              bookingData.tournamentName || tournament || tournamentName,
            type: bookingData.tournamentType || route.params.tournamentType,
            date: bookingData.date || date,
            time: bookingData.time || time || "TBA",
            venue: bookingData.venue || venue,
            name: bookingData.userName || name,
            email: bookingData.userEmail || email,
            phone: bookingData.userPhone || phone,
            team:
              bookingData.team?.name ||
              (typeof team === "string" ? team : team?.name),
            captain: bookingData.team?.captain?.name || team?.captain,
            players: bookingData.team?.players || team?.players,
            substitutes: bookingData.team?.substitutes || team?.substitutes,
            amount: bookingData.paymentAmount || amount || 0,
            paymentMethod: bookingData.paymentMethod || paymentMethod || "cash",
            status: bookingData.status || status || "Confirmed",
            selectedCategories: bookingData.selectedCategories || selectedCategories || [],
            // STEP 12c — Multi-sport additions. sportSelections falls back to
            // route.params and then to []; totalFee falls back to paymentAmount
            // for legacy bookings that don't carry totalFee.
            sportSelections: bookingData.sportSelections || sportSelections || [],
            totalFee: (bookingData.totalFee != null ? bookingData.totalFee : (totalFee != null ? totalFee : bookingData.paymentAmount || 0)),
            paymentDate: new Date().toLocaleDateString(),
            paymentTime: new Date().toLocaleTimeString(),
            venuePaymentStatus: bookingData.paymentStatus || "pending",
          };

          setBookingDetails(processedBooking);
        } catch (error) {
          console.error("Booking details fetch error:", {
            message: error.message,
            bookingId,
            userId,
            tournamentId,
          });

          // Set user-friendly error message
          setError(
            error.message === "No booking details found"
              ? "We couldn't find your booking details. Please contact support."
              : "An unexpected error occurred while fetching booking details."
          );
        } finally {
          setLoading(false);
        }
      };

      fetchBookingDetails();
    }, [bookingId, userId, tournamentId])
  );

  const shareReceipt = async () => {
    try {
      if (!receiptRef.current) {
        Alert.alert(
          "Error",
          "Cannot generate receipt at this time. Please try again."
        );
        return;
      }

      // Capture the receipt view as an image
      const uri = await receiptRef.current.capture();

      // Generate a filename
      const filename = `chalokhelne-receipt-${bookingDetails?.id?.substring(0, 6) || "booking"
        }.png`;
      const fileUri = FileSystem.documentDirectory + filename;

      // Copy the captured image to a shareable location
      await FileSystem.copyAsync({
        from: uri,
        to: fileUri,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }

      // Share the receipt
      await Sharing.shareAsync(fileUri, {
        mimeType: "image/png",
        dialogTitle: "Share Booking Receipt",
        UTI: "public.png",
      });
    } catch (error) {
      console.error("Error sharing receipt:", error);
      Alert.alert(
        "Sharing Failed",
        "Unable to share receipt. Please try again."
      );
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f6f6" />
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f6f6f6" />
        <View style={styles.errorIconContainer}>
          <MaterialIcons name="error-outline" size={64} color="#fff" />
        </View>
        <Text style={styles.errorTitle}>Unable to Load Booking</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() =>
              navigation.replace("BookingConfirmation", {
                userId,
                tournamentId,
              })
            }
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Events")}
          >
            <MaterialIcons name="home" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back to Events</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render receipt
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f6f6" />

      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate("Events")}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmation</Text>
        <View style={{ width: 24 }} />
      </View> */}

      <ScrollView style={styles.scrollContainer}>
        {/* Receipt Content - Captured for sharing */}
        <ViewShot
          ref={receiptRef}
          options={{ format: "png", quality: 0.9 }}
          style={styles.receiptContainer}
        >
          <View style={styles.receiptHeader}>
            <Image
              source={require("../../../assets/logo.jpg")} // Replace with your app logo
              style={styles.receiptLogo}
              resizeMode="contain"
            />
            <Text style={styles.receiptTitle}>Booking Confirmation</Text>

            <View style={styles.receiptStatusContainer}>
              <Text
                style={[
                  styles.receiptStatus,
                  bookingDetails?.status === "Confirmed"
                    ? styles.statusConfirmed
                    : bookingDetails?.status === "Pending"
                      ? styles.statusPending
                      : styles.statusOther,
                ]}
              >
                {bookingDetails?.status || "Processing"}
              </Text>
            </View>

            <Text style={styles.receiptId}>
              Booking ID: {bookingDetails?.id?.substring(0, 8)}
            </Text>
          </View>

          <View style={styles.receiptDivider} />

          {/* Tournament Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tournament Details</Text>

            <View style={styles.detailRow}>
              <MaterialIcons name="event" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Tournament: </Text>
              <Text style={styles.detailValue}>
                {bookingDetails?.tournament}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="today" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.date}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.time}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="location-on" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Venue:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.venue}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="event-note" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Tournament ID:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.tournamentId}</Text>
            </View>
          </View>

          <View style={styles.receiptDivider} />

          {/* Participant Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participant Information</Text>

            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.name}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="email" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.email}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.phone}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="person-pin" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>User ID:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.userId}</Text>
            </View>
          </View>

          {/* Sports & Categories Section — STEP 17b.iii: sportSelections is
              the only shape after STEP 16. Legacy selectedCategories
              fallback removed. */}
          {(() => {
            const ss = bookingDetails?.sportSelections || [];
            if (ss.length === 0) return null;

            // Group by sportName. Preserve insertion order via Map.
            const groups = new Map();
            for (const entry of ss) {
              const key = entry.sportName || "Sport";
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key).push(entry);
            }
            // Authoritative total — from backend (per STEP 12c approval
            // note). Falls back to paymentAmount for older bookings.
            const total = bookingDetails.totalFee != null
              ? bookingDetails.totalFee
              : (bookingDetails.amount || 0);
            return (
                <>
                  <View style={styles.receiptDivider} />
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Sports & Categories</Text>
                    {[...groups.entries()].map(([sportName, entries], gi) => (
                      <View key={`sport-${gi}`} style={{ marginBottom: 12 }}>
                        <View style={[styles.detailRow, { marginBottom: 4 }]}>
                          <MaterialIcons name="sports" size={20} color="#FF6A00" />
                          <Text style={[styles.detailLabel, { fontWeight: '700', color: '#263238' }]}>
                            {sportName}
                          </Text>
                          <Text style={[styles.detailValue, { color: '#90A4AE', fontSize: 12 }]}>
                            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                          </Text>
                        </View>
                        {entries.map((entry, ei) => {
                          const fee = Number(entry.fee || 0);
                          return (
                            <View
                              key={`sport-${gi}-cat-${ei}`}
                              style={[styles.detailRow, { paddingLeft: 28 }]}
                            >
                              <Text style={[styles.detailLabel, { flex: 1 }]}>
                                • {entry.categoryName || 'Category'}
                              </Text>
                              <Text style={[styles.detailValue, fee === 0 && { color: '#90A4AE' }]}>
                                {fee === 0 ? 'Free' : `₹${fee}`}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                    <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: '#ECEFF1', paddingTop: 8, marginTop: 4 }]}>
                      <Text style={[styles.detailLabel, { fontWeight: '700' }]}>Total</Text>
                      <Text style={[styles.detailValue, { fontWeight: '700', color: '#FF6A00' }]}>
                        ₹{total} · {ss.length} {ss.length === 1 ? 'entry' : 'entries'}
                      </Text>
                    </View>
                  </View>
                </>
              );
          })()}

          {/* Team Section - Only show if team exists */}
          {bookingDetails?.team && (
            <>
              <View style={styles.receiptDivider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Team Information</Text>

                <View style={styles.detailRow}>
                  <MaterialIcons name="group" size={20} color="#FF6A00" />
                  <Text style={styles.detailLabel}>Team:</Text>
                  <Text style={styles.detailValue}>{bookingDetails?.team}</Text>
                </View>

                {/* Captain */}
                {bookingDetails?.captain && (
                  <View style={styles.detailRow}>
                    <MaterialIcons name="star" size={20} color="#FFD700" />
                    <Text style={styles.detailLabel}>Captain:</Text>
                    <Text style={styles.detailValue}>
                      {typeof bookingDetails.captain === "string"
                        ? bookingDetails.captain
                        : bookingDetails.captain.name || "Captain"}
                    </Text>
                  </View>
                )}

                {/* Players */}
                {bookingDetails?.players &&
                  bookingDetails.players.length > 0 && (
                    <>
                      <Text style={styles.subsectionTitle}>Players:</Text>
                      {bookingDetails.players.map((player, index) => (
                        <View key={`player-${index}`} style={styles.detailRow}>
                          <MaterialIcons
                            name="person"
                            size={20}
                            color="#FF6A00"
                          />
                          <Text style={styles.detailLabel}>
                            Player {index + 1}:
                          </Text>
                          <Text style={styles.detailValue}>
                            {typeof player === "string"
                              ? player
                              : player.name || `Player ${index + 1}`}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}

                {/* Substitutes */}
                {bookingDetails?.substitutes &&
                  bookingDetails.substitutes.length > 0 && (
                    <>
                      <Text style={styles.subsectionTitle}>Substitutes:</Text>
                      {bookingDetails.substitutes.map((sub, index) => (
                        <View key={`sub-${index}`} style={styles.detailRow}>
                          <MaterialIcons
                            name="person-outline"
                            size={20}
                            color="#777"
                          />
                          <Text style={styles.detailLabel}>
                            Sub {index + 1}:
                          </Text>
                          <Text style={styles.detailValue}>
                            {typeof sub === "string"
                              ? sub
                              : sub.name || `Substitute ${index + 1}`}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
              </View>
            </>
          )}

          <View style={styles.receiptDivider} />

          {/* Payment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            <View style={styles.detailRow}>
              <FontAwesome5 name="money-bill-wave" size={18} color="#4CAF50" />
              <Text style={styles.detailLabel}>Payment:</Text>
              <Text style={styles.detailValue}>Pay at Venue</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="payment" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Method:</Text>
              <Text style={styles.detailValue}>Cash</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="attach-money" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.detailValue}>
                ₹{bookingDetails?.amount || 0}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Manager ID:</Text>
              <Text style={styles.detailValue}>{bookingDetails?.managerId}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialIcons name="event-available" size={20} color="#FF6A00" />
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={styles.statusTag}>
                <Text style={styles.statusTagText}>To be paid at venue</Text>
              </View>
            </View>

            <View style={styles.paymentInstructions}>
              <MaterialIcons name="info" size={20} color="#0047AB" />
              <Text style={styles.paymentInstructionsText}>
                Please bring the exact amount in cash on the day of the
                tournament. Show this receipt to the organizer for verification.
              </Text>
            </View>
          </View>
        </ViewShot>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f6f6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  scrollContainer: {
    flex: 1,
  },
  // Receipt Container
  receiptContainer: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 20,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  receiptLogo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  receiptTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 6,
  },
  receiptStatusContainer: {
    marginVertical: 10,
  },
  receiptStatus: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: "bold",
    overflow: "hidden",
  },
  statusConfirmed: {
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  statusPending: {
    backgroundColor: "#fff8e1",
    color: "#f57c00",
  },
  statusOther: {
    backgroundColor: "#f5f5f5",
    color: "#616161",
  },
  receiptId: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 15,
  },
  // Content Sections
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#444",
    marginTop: 10,
    marginBottom: 8,
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    width: 80,
    fontSize: 12,
    color: "#555",
    marginLeft: 8,
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  textConfirmed: {
    color: "#2e7d32",
    fontWeight: "bold",
  },
  // Status tag for cash payment
  statusTag: {
    backgroundColor: "#fff8e1",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffecb3",
  },
  statusTagText: {
    color: "#f57c00",
    fontSize: 12,
    fontWeight: "600",
  },
  // Payment instructions
  paymentInstructions: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "flex-start",
  },
  paymentInstructionsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#0062cc",
    lineHeight: 18,
  },
  // Footer
  receiptFooter: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 5,
  },
  footerContact: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginBottom: 15,
  },
  qrCodePlaceholder: {
    marginTop: 10,
    alignItems: "center",
    padding: 10,
  },
  qrText: {
    marginTop: 5,
    fontSize: 12,
    color: "#999",
  },
  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flex: 0.48,
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  doneButton: {
    flexDirection: "row",
    backgroundColor: "#0047AB",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    flex: 0.48,
    shadowColor: "#0047AB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Additional options
  additionalOptions: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  supportText: {
    color: "#555",
    marginLeft: 8,
    fontSize: 14,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6f6f6",
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#666",
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f6f6f6",
    padding: 20,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f44336",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#f44336",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  errorButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  retryButton: {
    flexDirection: "row",
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    minWidth: 150,
  },
  backButton: {
    flexDirection: "row",
    backgroundColor: "#757575",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#757575",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    minWidth: 150,
  },
});

export default BookingConfirmation;
