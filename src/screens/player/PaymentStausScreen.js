import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    Linking
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showMessage } from "react-native-flash-message";
import ManagerPaymentAPI from '../../api/managerPayment'
import axios from "axios";
import TournamentConfig from '../../api/tournaments'
import CouponInput from "../../components/CouponInput"

const PaymentStatusScreen = ({ navigation, route }) => {
    const {
        bookingData = {},
        tournament = {},
        userId = null,
        tournamentId = null,
        managerId = null,
        bookingId = null,
        tournamentName: rootTournamentName = "",
    } = route.params || {};

    // Booking details
    const {
        userName = "",
        userEmail = "",
        userPhone = "",
        paymentAmount = 0,
        paymentMethod = "cash",
        tournamentName: bookingTournamentName = "",
        tournamentType: bookingTournamentType = "",
    } = bookingData;

    // Tournament details (from tournament object)
    const tournamentName =
        tournament?.name ||
        bookingTournamentName ||
        rootTournamentName ||
        "Tournament";

    const finalTournamentType =
        tournament?.type ||
        bookingTournamentType ||
        "N/A";

    // If you have manager details, you can pass them too
    const adminPhone = tournament?.contactPhone || "+1 (555) 567-6544";
    const registrationId = bookingData.registrationId || `reg_${Date.now()}`;
    const registrationDate = new Date().toLocaleDateString();

    const [offlinePayments, setOfflinePayments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        // ✅ Ensure both IDs are present and valid before fetching
        if (!tournamentId || !managerId || managerId === 'undefined') {
            setLoading(false);
            return;
        }

        const loadOfflinePayments = async () => {
            try {
                setLoading(true);
                const data = await ManagerPaymentAPI.getOfflinePayments(managerId, tournamentId);
                setOfflinePayments(data.offlinePayments || []);
            } catch (err) {
                console.error("Failed to fetch offline payments:", err);
                setOfflinePayments([]);
            } finally {
                setLoading(false);
            }
        };

        loadOfflinePayments();
    }, [managerId, tournamentId]);

    const handleCallAdmin = () => {
        const phoneNumber = adminPhone.replace(/\D/g, ''); // Remove non-digits
        Linking.openURL(`tel:${phoneNumber}`);
    };

    const handleConfirmCashPayment = async () => {
        try {
            setLoading(true); // optional: show loader while processing

            // Prepare booking data for cash payment
            const bookingPayload = {
                userId,
                userName: bookingData?.userName || "Player",
                userEmail: bookingData?.userEmail || "player@example.com",
                userPhone: bookingData?.userPhone || "N/A",
                tournamentId,
                tournamentName: tournament?.name || "Tournament",
                tournamentType: tournament?.type || "N/A", // consistent naming
                paymentAmount: tournament.price || 0,
                paymentMethod: "cash",
                selectedCategories: bookingData?.selectedCategories || [], // Include selected categories
                status: "pending", // required for all payments
                transactionId: "CASH_PAYMENT", // placeholder for cash bookings
                team: bookingData?.team || {},
                registrationId: bookingData?.registrationId || `reg_${Date.now()}`, // keep it for notifications
                employeeId: bookingData?.employeeId || null,
            };

            // Create booking via backend
            const response = await axios.post(
                TournamentConfig.ENDPOINTS.BOOKINGS.CREATE,
                bookingPayload
            );

            if (response.data?.success) {
                // Notify manager after booking creation
                try {
                    const mgrId = Array.isArray(managerId) ? managerId[0] : managerId;
                    if (!mgrId) throw new Error("Manager ID not available");
                    const notifyRes = await ManagerPaymentAPI.notifyManager(mgrId, tournamentId, {
                        userId,
                        amount: paymentAmount ?? tournament?.price ?? 0,  // ✅ must be `amount`
                        registrationId: bookingPayload?.registrationId || `reg_${Date.now()}`,
                        paymentMethod: "cash", // ✅ add this
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
                // Navigate to Payment Status Screen
                navigation.navigate("Events", {
                    screen: "EventScreen", params: {
                        bookingId: response.data.booking?._id || null,
                        userId,
                        tournamentId,
                        managerId,
                        tournamentName: tournament?.name,
                        amount: paymentAmount,
                        selectedCategories: bookingData?.selectedCategories || [],
                        paymentMethod: "cash",
                    }
                });

            } else {
                throw new Error(response.data?.message || "Cash booking failed");
            }

        } catch (error) {
            console.error("Cash booking error:", error);
            showMessage({
                message: "Booking Failed",
                description: error.message || "Please try again",
                type: "danger",
                icon: "danger",
                duration: 3000,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoHome = () => {
        navigation.navigate("Events", { screen: "EventScreen" });
    };

    const handleViewTournament = () => {
        navigation.navigate("Tournament Details", { item: tournament });
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Status Icon and Title */}
                <View style={styles.statusContainer}>
                    <View style={styles.statusIconContainer}>
                        <Ionicons name="time-outline" size={48} color="#F59E0B" />
                    </View>
                    <Text style={styles.statusTitle}>Registration Status</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>Pending - Offline</Text>
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
                        <Text style={styles.detailLabel}>Registration ID:</Text>
                        <Text style={styles.detailValue}>{registrationId}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Registered:</Text>
                        <Text style={styles.detailValue}>{registrationDate}</Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Payment Method:</Text>
                        <Text style={styles.detailValue}>{paymentMethod}</Text>
                    </View>
                </View>

                {/* Admin Contact Card */}
                {offlinePayments.length > 0 && (
                    <View style={styles.contactCard}>
                        <Text style={styles.contactTitle}>Admin Contact Details</Text>

                        {offlinePayments.map((person, idx) => (
                            <View key={idx} style={{ marginBottom: 10 }}>
                                <View style={styles.contactRow}>
                                    <Ionicons name="person-outline" size={20} color="#3B82F6" />
                                    <Text style={styles.contactText}>
                                        {person.receiverName} {person.label ? `(${person.label})` : ""}
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.contactRow}
                                    onPress={() => Linking.openURL(`tel:${person.receiverContact}`)}
                                >
                                    <Ionicons name="call-outline" size={20} color="#3B82F6" />
                                    <Text style={[styles.contactText, styles.contactLink]}>
                                        {person.receiverContact}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Coupon Section */}
                <View style={styles.card}>
                    <CouponInput
                        totalAmount={Number(paymentAmount) || 0}
                        applicableType="tournament"
                        applicableId={tournamentId}
                        userId={userId}
                        onApply={() => {}}
                        onRemove={() => {}}
                    />
                </View>

                {/* Payment Instructions Section */}
                <View style={styles.paymentInstructionsCard}>
                    <Text style={styles.paymentInstructionsTitle}>Payment Instructions</Text>

                    <View style={styles.instructionItem}>
                        <View style={styles.instructionNumber}>
                            <Text style={styles.instructionNumberText}>1</Text>
                        </View>
                        <Text style={styles.instructionText}>
                            Contact the tournament admin using the phone number provided above
                        </Text>
                    </View>

                    <View style={styles.instructionItem}>
                        <View style={styles.instructionNumber}>
                            <Text style={styles.instructionNumberText}>2</Text>
                        </View>
                        <Text style={styles.instructionText}>
                            Arrange a meeting time and location for cash payment
                        </Text>
                    </View>

                    <View style={styles.instructionItem}>
                        <View style={styles.instructionNumber}>
                            <Text style={styles.instructionNumberText}>3</Text>
                        </View>
                        <Text style={styles.instructionText}>
                            Pay the registration fee of ₹{paymentAmount} in cash to the admin
                        </Text>
                    </View>

                    <View style={styles.instructionItem}>
                        <View style={styles.instructionNumber}>
                            <Text style={styles.instructionNumberText}>4</Text>
                        </View>
                        <Text style={styles.instructionText}>
                            Your registration will be confirmed after payment verification
                        </Text>
                    </View>
                </View>

                {/* Payment Instructions */}
                <View style={styles.instructionsCard}>
                    <Text style={styles.instructionsTitle}>
                        Please pay the registration amount in cash directly to the admin at the venue. By clicking “Proceed to Cash Payment”, you are notifying the admin that you are ready to make a cash payment. This will place your registration in the offline payment queue, and your participation will be confirmed once the admin verifies and approves the payment.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.notifyButton} onPress={handleConfirmCashPayment}>
                        <Text style={styles.notifyButtonText}>Proceed to Cash Payment</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity style={styles.secondaryButton} onPress={handleViewTournament}>
                        <Text style={styles.secondaryButtonText}>View Tournament Details</Text>
                    </TouchableOpacity> */}

                </View>

                <View style={{ height: 20 }} />
            </ScrollView>
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
        backgroundColor: "#FEF3C7",
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
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F59E0B",
    },
    statusBadgeText: {
        color: "#92400E",
        fontSize: 12,
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#ddd",
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
    instructionsCard: {
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 28,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    instructionsTitle: {
        fontSize: 14,
        color: "#1E40AF",
        lineHeight: 20,
    },
    contactCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 12,
    },
    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    contactText: {
        fontSize: 14,
        color: "#374151",
        marginLeft: 8,
    },
    contactLink: {
        color: "#3B82F6",
        textDecorationLine: "underline",
    },
    readyToPayCard: {
        backgroundColor: "#F0FDF4",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#BBF7D0",
    },
    readyToPayTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#15803D",
        marginBottom: 8,
    },
    readyToPayText: {
        fontSize: 14,
        color: "#166534",
        lineHeight: 20,
        marginBottom: 16,
    },
    notifyButton: {
        backgroundColor: "#F97316",
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: "center",
    },
    notifyButtonText: {
        color: "#ffffff",
        fontWeight: "600",
        fontSize: 14,
    },
    paymentInstructionsCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#ddd",
    },
    paymentInstructionsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 16,
    },
    instructionItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    instructionNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#3B82F6",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
        marginTop: 2,
    },
    instructionNumberText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "600",
    },
    instructionText: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
        flex: 1,
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 16,
    },
    secondaryButton: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#D1D5DB",
    },
    secondaryButtonText: {
        color: "#374151",
        fontWeight: "600",
        fontSize: 14,
    },
});

export default PaymentStatusScreen;