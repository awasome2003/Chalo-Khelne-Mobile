import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TournamentFeeSummary = ({ navigation, route }) => {
    const {
        bookingData = {},
        tournament = {},
        userId = null,
        tournamentId = null,
        managerId = route.params?.managerId || bookingData?.managerId, // ✅ fix managerId extraction
        bookingId = null,
    } = route.params || {};

    // Extract tournament details
    const tournamentName = tournament?.name || "Tournament";
    const date = tournament?.date || "TBA";
    const time = tournament?.time || "TBA";
    const venue = tournament?.venue || "Venue not decided";

    // Extract booking details
    const name = bookingData?.userName || "Player";
    const email = bookingData?.userEmail || "N/A";
    const phone = bookingData?.userPhone || "N/A";
    const amount = bookingData?.paymentAmount || 0;
    const paymentMethod = bookingData?.paymentMethod || "Not selected";
    const status = bookingData?.status || "Pending";

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

    const paymentMethods = [
        {
            id: 'cash',
            title: 'Offline - Pay Cash to Admin',
            subtitle: 'Pay in cash directly to the event administrator at this venue. Your registration will be confirmed after admin approval.',
            icon: 'cash',
            iconColor: '#10B981', // green-500
            note: 'Payment must be made before the event date'
        },
        {
            id: 'online',
            title: 'Pay via QR Code',
            subtitle: 'Scan the QR code to make payment through your mobile banking app, then upload a screenshot as proof of payment.',
            icon: 'qr-code',
            iconColor: '#3B82F6', // blue-500
            note: 'Payment verification usually takes 1-2 hours'
        }
    ];

    const handlePaymentMethodSelect = (methodId) => {
        setSelectedPaymentMethod(methodId);
    };

    const handleProceedToPayment = () => {
        if (!selectedPaymentMethod) {
            Alert.alert(
                "Please select a payment method",
                "You need to choose how you want to pay before proceeding."
            );
            return;
        }

        if (selectedPaymentMethod === "cash") {
            navigation.navigate("Cash Payment", {
                bookingData,          // ✅ full booking data
                tournament,           // ✅ full tournament data
                userId,
                tournamentId,
                managerId,
                bookingId,
                paymentMethod: selectedPaymentMethod,
                amount: bookingData?.paymentAmount || amount, // ensure consistency
                tournamentName: tournament?.name || "Tournament",
            });
        } else if (selectedPaymentMethod === "online") {
            navigation.navigate("Online Payment", {
                bookingData,          // ✅ full booking data
                tournament,           // ✅ full tournament data
                userId,
                tournamentId,
                managerId,
                bookingId,
                paymentMethod: selectedPaymentMethod,
                amount: bookingData?.paymentAmount || amount,
                tournamentName: tournament?.name || "Tournament",
            });
        }
    };

    const handleGoBack = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Tournament Info Card */}
                <View style={styles.tournamentCard}>
                    <Text style={styles.tournamentName}>{tournamentName}</Text>
                    <Text style={styles.tournamentDate}>{date}</Text>
                    <Text style={styles.tournamentVenue}>{venue}</Text>

                    <View style={styles.feeContainer}>
                        <Text style={styles.feeLabel}>Registration Fee:</Text>
                        <Text style={styles.feeAmount}>₹{amount}</Text>
                    </View>
                </View>

                {/* Payment Methods Section */}
                <Text style={styles.sectionTitle}>Select Payment Method</Text>

                {paymentMethods.map((method) => (
                    <TouchableOpacity
                        key={method.id}
                        style={[
                            styles.paymentMethodCard,
                            selectedPaymentMethod === method.id && styles.selectedPaymentMethod
                        ]}
                        onPress={() => handlePaymentMethodSelect(method.id)}
                    >
                        <View style={styles.paymentMethodHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: `${method.iconColor}20` }]}>
                                <Ionicons name={method.icon} size={24} color={method.iconColor} />
                            </View>
                            <View style={styles.paymentMethodInfo}>
                                <Text style={styles.paymentMethodTitle}>{method.title}</Text>
                                <Text style={styles.paymentMethodSubtitle}>{method.subtitle}</Text>
                            </View>
                            <View style={styles.radioButton}>
                                {selectedPaymentMethod === method.id && (
                                    <View style={styles.radioButtonSelected} />
                                )}
                            </View>
                        </View>

                        {method.note && (
                            <View style={styles.noteContainer}>
                                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                                <Text style={styles.noteText}>{method.note}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}

                {/* Important Notes */}
                <View style={styles.importantNotesContainer}>
                    <Text style={styles.importantNotesTitle}>Important Notes:</Text>
                    <Text style={styles.importantNote}>• Your slot is not confirmed until payment is verified</Text>
                    <Text style={styles.importantNote}>• Refunds are subject to event terms and conditions</Text>
                    <Text style={styles.importantNote}>• Contact event organizers for any payment issues</Text>
                </View>

                {/* Proceed Button */}
                <TouchableOpacity
                    style={[
                        styles.proceedButton,
                        !selectedPaymentMethod && styles.proceedButtonDisabled
                    ]}
                    onPress={handleProceedToPayment}
                    disabled={!selectedPaymentMethod}
                >
                    <Text style={[
                        styles.proceedButtonText,
                        !selectedPaymentMethod && styles.proceedButtonTextDisabled
                    ]}>
                        Proceed to Payment
                    </Text>
                </TouchableOpacity>

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
        marginBottom: 20,
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
    tournamentCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    tournamentName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 8,
    },
    tournamentDate: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    tournamentVenue: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
    },
    feeContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    feeLabel: {
        fontSize: 16,
        color: "#374151",
        fontWeight: "500",
    },
    feeAmount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#10B981",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 16,
    },
    paymentMethodCard: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: "transparent",
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    selectedPaymentMethod: {
        borderColor: "#3B82F6",
        backgroundColor: "#EFF6FF",
    },
    paymentMethodHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    paymentMethodInfo: {
        flex: 1,
        marginRight: 12,
    },
    paymentMethodTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#111827",
        marginBottom: 4,
    },
    paymentMethodSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    radioButtonSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#3B82F6",
    },
    noteContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    noteText: {
        fontSize: 12,
        color: "#D97706",
        marginLeft: 6,
        flex: 1,
    },
    importantNotesContainer: {
        backgroundColor: "#FFFBEB",
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#FEF3C7",
    },
    importantNotesTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#92400E",
        marginBottom: 8,
    },
    importantNote: {
        fontSize: 12,
        color: "#92400E",
        marginBottom: 4,
        lineHeight: 16,
    },
    proceedButton: {
        backgroundColor: "#3B82F6",
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    proceedButtonDisabled: {
        backgroundColor: "#E5E7EB",
    },
    proceedButtonText: {
        color: "#ffffff",
        fontWeight: "700",
        fontSize: 16,
    },
    proceedButtonTextDisabled: {
        color: "#9CA3AF",
    },
});

export default TournamentFeeSummary;