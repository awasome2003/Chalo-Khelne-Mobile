import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Dimensions
} from "react-native";
import axios from "axios";
import Toast from "react-native-toast-message";
import TournamentConfig from "../../api/tournaments";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker"; // ✅ keep if you use it for profile/tournament images
import * as FileSystem from "expo-file-system/legacy"; // ✅ use legacy API to avoid deprecation error
import * as Sharing from "expo-sharing"; // ✅ for system share sheet
import * as Clipboard from "expo-clipboard"; // ✅ for copying links/text
import { showMessage } from "react-native-flash-message";
import managerPaymentAPI from "../../api/managerPayment";
import CouponInput from "../../components/CouponInput";

const QRPaymentScreen = ({ navigation, route }) => {
  const {
    bookingData = {},
    tournament = {},
    userId = null,
    tournamentId = null,
    managerId = null,
    bookingId = null,
    paymentMethod = "Online",
    amount = bookingData?.paymentAmount || "45",
    tournamentName = tournament?.name || "City Championship 2024",
  } = route.params || {};

  // Extract booking details
  const userName = bookingData?.userName || "Player";
  const userEmail = bookingData?.userEmail || "player@example.com";
  const userPhone = bookingData?.userPhone || "N/A";
  const status = bookingData?.status || "Pending";
  const team = bookingData?.team || {};

  // Extract tournament details
  const tournamentType = tournament?.type || "N/A";
  const startDate = tournament?.startDate || "TBA";
  const endDate = tournament?.endDate || "TBA";
  const venue = tournament?.venue || "Venue not decided";

  const [transactionId, setTransactionId] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [manager, setManager] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [upiIds, setUpiIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingQr, setDownloadingQr] = useState(false);
  const [sharingQr, setSharingQr] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get('window').height);

  // ✅ Fetch payment details using only tournamentId
  useEffect(() => {
    // ✅ Ensure both IDs are present and valid before fetching
    if (!managerId || !tournamentId || managerId === 'undefined') return;

    const loadPaymentData = async () => {
      try {
        setLoading(true);

        // Fetch QR codes
        const methods = await managerPaymentAPI.getQrCodes(managerId, tournamentId);
        setManager(methods.manager || null);
        setQrCode(methods.qrCodes?.[0] || null);


        // Fetch UPI IDs safely
        try {
          const upiResult = await managerPaymentAPI.getUpiIds(managerId, tournamentId);
          setUpiIds(upiResult.upiIds || []);
        } catch (upiError) {
          console.warn("No UPI IDs found:", upiError);
          setUpiIds([]); // empty array
          // Optional: soft message for user
          Alert.alert("Info", "No UPI IDs have been uploaded by the manager yet.");
        }

      } catch (error) {
        console.error("Failed to load payment details:", error);
        Alert.alert("Error", "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [managerId, tournamentId]);

  // Listen for keyboard events to adjust layout
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    const dimensionsChangeSubscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenHeight(window.height);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      dimensionsChangeSubscription?.remove();
    };
  }, []);


  // ✅ Safe and compliant QR Code Download
  const handleDownloadQr = async () => {
    if (!qrCode?.imageUrl) {
      Alert.alert("Error", "Invalid QR code");
      return;
    }

    setDownloadingQr(true);

    try {
      const timestamp = new Date().getTime();
      const filename = `QR_${qrCode.label || "Payment"}_${timestamp}.png`;
      const fileUri = FileSystem.documentDirectory + filename;

      // 🟢 Download QR image into app's private storage
      const downloadResult = await FileSystem.downloadAsync(qrCode.imageUrl, fileUri);

      if (downloadResult.status === 200) {
        // ✅ Let the user know it's downloaded successfully
        Alert.alert(
          "Saved!",
          "QR code downloaded in app storage.\n\nYou can share it to save or send to gallery.",
          [
            {
              text: "Share Now",
              onPress: async () => {
                try {
                  await Sharing.shareAsync(downloadResult.uri, {
                    mimeType: "image/png",
                    dialogTitle: "Share QR Code",
                  });
                } catch (err) {

                }
              },
            },
            { text: "OK", style: "default" },
          ]
        );
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Error downloading QR code:", error);
      Alert.alert("Error", "Failed to download QR code. Please try again.");
    } finally {
      setDownloadingQr(false);
    }
  };

  // ✅ Safe and compliant QR Code Share
  const handleShareQr = async () => {
    if (!qrCode?.imageUrl) {
      Alert.alert("Error", "Invalid QR code");
      return;
    }

    setSharingQr(true);

    try {
      // Check if sharing is available
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Sharing not supported",
          "Your device does not support sharing files."
        );
        return;
      }

      const timestamp = new Date().getTime();
      const filename = `QR_${qrCode.label || "Payment"}_${timestamp}.png`;
      const fileUri = FileSystem.documentDirectory + filename;

      // 🟢 Download image into local app storage for sharing
      const downloadResult = await FileSystem.downloadAsync(qrCode.imageUrl, fileUri);

      if (downloadResult.status === 200) {
        // ✅ Share using Android/iOS system share sheet
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: "image/png",
          dialogTitle: `Share QR Code${qrCode.label ? ` - ${qrCode.label}` : ""}`,
        });
      } else {
        throw new Error("Download failed");
      }
    } catch (error) {
      console.error("Error sharing QR code:", error);
      Alert.alert("Error", "Failed to share QR code. Please try again.");
    } finally {
      setSharingQr(false);
    }
  };

  const handleConfirmPayment = async () => {

    if (!transactionId.trim()) {
      Alert.alert("Missing Info", "Please enter the transaction ID");
      return;
    }

    try {
      setIsUploading(true);

      // Prepare booking data
      const bookingPayload = {
        userId,
        userName: bookingData?.userName || "Player",
        userEmail: bookingData?.userEmail || "player@example.com",
        userPhone: bookingData?.userPhone || "N/A",
        tournamentId,
        tournamentName: tournament?.name || "Tournament",
        tournamentType: tournament?.type || "N/A",
        paymentAmount: amount,
        paymentMethod: "online",
        transactionId,
        status: "pending",
        team: bookingData?.team || {}, // Include team info if exists
        selectedCategories: bookingData?.selectedCategories || [], // Include selected categories
        employeeId: bookingData?.employeeId || null,
      };

      const response = await axios.post(
        TournamentConfig.ENDPOINTS.BOOKINGS.CREATE,
        bookingPayload
      );

      if (response.data?.success) {
        try {
          const notifyRes = await managerPaymentAPI.notifyManager(managerId, tournamentId, {
            userId,
            amount: amount ?? tournament?.price ?? 0,
            registrationId: bookingPayload?.registrationId || `reg_${Date.now()}`,
            paymentMethod: "online", // ✅ add this
            selectedCategories: bookingPayload.selectedCategories // ✅ ADD THIS
          });



          if (notifyRes.notificationId) {
            showMessage({
              message: "Manager Notified",
              description: notifyRes.notification || "Payment pending verification",
              type: notifyRes.message.includes("already notified") ? "info" : "success",
              icon: notifyRes.message.includes("already notified") ? "info" : "success",
              duration: 3000,
            });
          } else {
            showMessage({
              message: "Notification Sent",
              description: "Manager has been notified about the cash payment.",
              type: "success",
              icon: "success",
              duration: 3000,
            });
          }
        } catch (notifyError) {
          console.error("Failed to notify manager:", notifyError);
          showMessage({
            message: "Booking Created",
            description: "Booking successful but failed to notify manager.",
            type: "warning",
            icon: "warning",
            duration: 3000,
          });
        }

        // Optionally, navigate to Payment Status Screen
        navigation.navigate("Events", { screen: "EventScreen" });
      } else {
        throw new Error(response.data?.message || "Booking failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      Toast.show({
        type: "error",
        text1: "Booking Failed",
        text2: error.message || "Please try again",
      });
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView contentContainerStyle={[styles.container, keyboardVisible && styles.containerWithKeyboard]}>

          {/* Status Section */}
          <View style={styles.statusContainer}>
            <View style={styles.statusIconContainer}>
              <Ionicons name="time-outline" size={48} color="#3B82F6" />
            </View>
            <Text style={styles.statusTitle}>Payment Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Pending - Verification</Text>
            </View>
          </View>

          {/* Event Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Event Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Event:</Text>
              <Text style={styles.detailValue}>{tournamentName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>{paymentMethod}</Text>
            </View>
          </View>


          {/* Coupon Section */}
          <View style={styles.card}>
            <CouponInput
              totalAmount={Number(amount) || 0}
              applicableType="tournament"
              applicableId={tournamentId}
              userId={userId}
              onApply={(data) => {
                showMessage({
                  message: "Coupon Applied!",
                  description: `You save ₹${data.discount_amount}. Pay ₹${data.final_amount} instead of ₹${data.original_amount}`,
                  type: "success",
                  duration: 4000,
                });
              }}
              onRemove={() => {
                showMessage({
                  message: "Coupon Removed",
                  type: "info",
                  duration: 2000,
                });
              }}
            />
          </View>

          {/* QR Code Section */}
          {qrCode ? (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Scan QR Code to Pay</Text>

              <View style={styles.qrCodeContainer}>
                <Image
                  source={{ uri: qrCode.imageUrl }}
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
                {qrCode.label ? <Text style={styles.qrLabel}>{qrCode.label}</Text> : null}

                {/* Download and Share buttons */}
                <View style={styles.qrActionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.qrActionButton,
                      styles.downloadButton,
                      downloadingQr && styles.qrActionButtonDisabled
                    ]}
                    onPress={handleDownloadQr}
                    disabled={downloadingQr}
                  >
                    {downloadingQr ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="download-outline" size={16} color="#ffffff" />
                    )}
                    <Text style={styles.qrActionText}>
                      {downloadingQr ? 'Saving...' : 'Download'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.qrActionButton,
                      styles.shareButton,
                      sharingQr && styles.qrActionButtonDisabled
                    ]}
                    onPress={handleShareQr}
                    disabled={sharingQr}
                  >
                    {sharingQr ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="share-outline" size={16} color="#ffffff" />
                    )}
                    <Text style={styles.qrActionText}>
                      {sharingQr ? 'Sharing...' : 'Share'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.qrInstructions}>
                Scan the QR code with your mobile banking app to make the payment
              </Text>
            </View>
          ) : (
            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>Scan QR Code to Pay</Text>
              <Text style={styles.noQrText}>
                No QR code has been uploaded yet. Please check back later.
              </Text>
            </View>
          )}


          {/* UPI ID Section */}
          {upiIds.length > 0 ? (
            <View style={styles.upiCard}>
              <Text style={styles.upiCardTitle}>Available UPI IDs</Text>
              {upiIds.map((upiObj, index) => (
                <View key={upiObj._id || index} style={styles.upiRow}>
                  <View style={styles.upiInfo}>
                    <Text style={styles.upiLabel}>{upiObj.label || `UPI ${index + 1}`}</Text>
                    <Text style={styles.upiId}>{upiObj.upi}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={async () => {
                      await Clipboard.setStringAsync(upiObj.upi);
                      Toast.show({
                        type: "success",
                        text1: "Copied to clipboard!",
                        text2: upiObj.upi,
                      });
                    }}
                  >
                    <Text style={styles.copyText}>Copy to Clipboard</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.upiCard}>
              <Text style={styles.upiCardTitle}>Available UPI IDs</Text>
              <Text style={styles.noUpiText}>No UPI IDs have been added yet. Please check back later.</Text>
            </View>
          )}


          {/* Transaction ID Input */}
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <Ionicons name="receipt-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <Text style={styles.inputLabel}>Enter Transaction ID</Text>
            </View>
            <Text style={styles.inputSubLabel}>Faster verification with UPI ID</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your transaction ID"
              placeholderTextColor="#9CA3AF"
              value={transactionId}
              onChangeText={setTransactionId}
              autoCapitalize="none"
              keyboardType="visible-password"  // Shows password as plain text but enables return key
              returnKeyType="done"
              blurOnSubmit={true}
              accessibilityLabel="Transaction ID input field"
              accessibilityHint="Enter your transaction ID to verify payment"
              onSubmitEditing={() => {
                // Submit the form when done is pressed
                if (transactionId.trim()) {
                  handleConfirmPayment();
                }
              }}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                (!transactionId.trim()) && styles.uploadButtonDisabled
              ]}
              onPress={handleConfirmPayment}
              disabled={!transactionId.trim()}
              accessibilityLabel="Submit payment proof button"
              accessibilityHint="Tap to submit your payment verification"
            >
              {isUploading ? (
                <Text style={styles.uploadButtonText}>Uploading...</Text>
              ) : (
                <Text style={styles.uploadButtonText}>Submit Payment Proof</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backToEventsButton} onPress={() => navigation.navigate("Events", { screen: "EventScreen" })}>
              <Text style={styles.backToEventsText}>Back to Events</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    paddingBottom: 20,
  },
  containerWithKeyboard: {
    paddingBottom: 100, // Extra padding when keyboard is visible
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  filterButton: {
    padding: 8,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  statusBadgeText: {
    color: "#1E40AF",
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  paymentInfoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  paymentInfoText: {
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
    textAlign: "center",
  },
  qrSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  qrCodeContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignSelf: 'center',
  },
  qrCodeImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  qrActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  qrActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  downloadButton: {
    backgroundColor: "#10B981", // green-500
  },
  shareButton: {
    backgroundColor: "#3B82F6", // blue-500
  },
  qrActionButtonDisabled: {
    opacity: 0.6,
  },
  qrActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  qrInstructions: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    maxWidth: 280,
    marginTop: 8,
  },
  upiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  upiCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  upiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
  },
  upiInfo: {
    flex: 1,
    marginRight: 12,
  },
  upiLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  upiId: {
    fontSize: 16,
    color: "#1F2937",
  },
  copyButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  copyText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  inputSubLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    fontSize: 16,
    color: "#111827",
  },
  uploadSection: {
    marginBottom: 16,
  },
  uploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  uploadCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  uploadCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  uploadCardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  uploadAreaText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
  },
  uploadAreaSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginVertical: 8,
  },
  chooseFileButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  chooseFileText: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: 14,
  },
  fileFormatsText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  uploadedImageContainer: {
    position: "relative",
    alignItems: "center",
  },
  uploadedImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  instructionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  uploadButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  uploadButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  uploadButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  backToEventsButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  backToEventsText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default QRPaymentScreen;