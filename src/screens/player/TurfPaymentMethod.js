import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";

// Method definitions — id matches the paymentProvider stored on the booking
// when paymentMethod = "online". The "cod" option maps to paymentMethod="cash".
const METHODS = [
  {
    id: "upi",
    label: "UPI",
    sub: "Google Pay, PhonePe, Paytm",
    icon: "phone-portrait-outline",
    online: true,
  },
  {
    id: "card",
    label: "Card",
    sub: "Credit or Debit card",
    icon: "card-outline",
    online: true,
  },
  {
    id: "wallet",
    label: "Wallet",
    sub: "Digital wallets",
    icon: "wallet-outline",
    online: true,
  },
  {
    id: "cod",
    label: "Cash on Delivery (COD)",
    sub: "Pay directly at the Delivery time",
    icon: "flash-outline",
    online: false,
  },
];

const TurfPaymentMethod = ({ route }) => {
  const params = route.params || {};
  const {
    turfId,
    turfName,
    turfAddress,
    date,
    selectedSlot,
    selectedCourt,
    selectedSport,
    baseAmount,
    amount,
    couponCode,
    couponDiscount,
    userName,
    userEmail,
    userPhone,
  } = params;

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const totalAmount =
    typeof amount === "number"
      ? amount
      : typeof baseAmount === "number"
      ? baseAmount
      : 0;

  // ─── Booking creation ────────────────────────────────────────────────
  const createBooking = async (method, provider) => {
    const userId = user?.id || user?._id;
    if (!userId) {
      Alert.alert("Login Required", "Please log in to complete the booking.");
      return null;
    }

    const sportPayload =
      selectedSport && selectedSport.name
        ? {
            name: selectedSport.name,
            pricePerHour:
              Number(selectedSport.pricePerHour) || totalAmount || 0,
          }
        : undefined;

    const bookingData = {
      userId,
      userName: userName || user?.name || "",
      userEmail: userEmail || user?.email || "",
      userPhone: userPhone || user?.phone || user?.mobile || "",
      turfId,
      turfName,
      sportName: selectedSport?.name,
      ...(sportPayload ? { sport: sportPayload } : {}),
      date,
      timeSlot: selectedSlot?.timeSlot,
      amount: totalAmount,
      paymentMethod: method,
      paymentProvider: provider || "",
      ...(selectedCourt
        ? { court: { name: selectedCourt.name, type: selectedCourt.type || "" } }
        : {}),
      ...(couponCode ? { couponCode } : {}),
    };

    try {
      const res = await axios.post(
        API.ENDPOINTS.TURF_BOOKINGS.CREATE,
        bookingData
      );
      if (res.data && res.data.success) {
        return res.data.booking || res.data;
      }
      throw new Error(res.data?.message || "Booking creation failed");
    } catch (err) {
      console.error("[TurfPaymentMethod] booking failed:", err);
      Alert.alert(
        "Booking Failed",
        err.response?.data?.message ||
          err.message ||
          "Could not complete your booking. Please try again."
      );
      return null;
    }
  };

  const navigateToConfirmation = (booking, method, provider) => {
    navigation.navigate("TurfConfirmation", {
      bookingId: booking?._id,
      userId: user?.id || user?._id,
      turfId,
      turfName: turfName || "Turf",
      type: selectedSport?.name,
      date,
      time: selectedSlot?.timeSlot,
      venue: turfAddress || "Venue address not available",
      amount: totalAmount,
      status: "Confirmed",
      name: userName,
      email: userEmail,
      phone: userPhone,
      paymentMethod: method,
      paymentProvider: provider || "",
      couponCode: couponCode || null,
      couponDiscount: couponDiscount || 0,
      court: selectedCourt,
    });
  };

  // ─── Pay action ──────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!selectedMethodId || submitting) return;

    const method = METHODS.find((m) => m.id === selectedMethodId);
    if (!method) return;

    setSubmitting(true);
    try {
      if (method.online) {
        const booking = await createBooking("online", method.id);
        if (booking) navigateToConfirmation(booking, "online", method.id);
      } else {
        // Cash on Delivery — booking goes through immediately, paid at venue.
        const booking = await createBooking("cash", "");
        if (booking) navigateToConfirmation(booking, "cash", "");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#1A181B" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Payment</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {METHODS.map((m) => {
          const isSelected = selectedMethodId === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[s.methodCard, isSelected && s.methodCardSelected]}
              onPress={() => setSelectedMethodId(m.id)}
              activeOpacity={0.85}
            >
              <View style={s.methodIconWrap}>
                <Ionicons name={m.icon} size={22} color="#15A765" />
              </View>
              <View style={s.methodBody}>
                <Text style={s.methodTitle}>{m.label}</Text>
                <Text style={s.methodSub}>{m.sub}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom: Total + Pay now */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>₹{totalAmount}/-</Text>
        </View>
        <TouchableOpacity
          style={[
            s.payBtn,
            (!selectedMethodId || submitting) && s.payBtnDisabled,
          ]}
          onPress={handlePay}
          disabled={!selectedMethodId || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.payBtnText}>Pay now</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },

  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1FA",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: "#15A765",
    backgroundColor: "#F4FBF7",
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E8F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  methodBody: { flex: 1 },
  methodTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  methodSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    marginTop: 2,
  },

  bottomBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#1A181B",
  },
  totalValue: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  payBtn: {
    backgroundColor: "#15A765",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: {
    backgroundColor: "#A4D9BD",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default TurfPaymentMethod;
