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
    label: "Pay at Venue",
    sub: "Pay directly at the venue",
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
    selectedSlots,
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

  // Multi-slot: one booking is created per selected slot.
  const slots =
    Array.isArray(selectedSlots) && selectedSlots.length
      ? selectedSlots
      : selectedSlot
      ? [selectedSlot]
      : [];

  const priceOf = (slot) => {
    const p = Number(slot?.price);
    if (!isNaN(p) && p > 0) return p;
    const sp = Number(selectedSport?.pricePerHour);
    if (!isNaN(sp) && sp > 0) return sp;
    return 0;
  };

  // The coupon discount is for the whole order; attach it to the first slot's
  // booking so the per-booking amounts still sum to the total the user saw.
  const orderDiscount = Math.max(
    0,
    (Number(baseAmount) || 0) - (Number(amount) || 0)
  );

  // ─── Booking creation ────────────────────────────────────────────────
  // Creates a booking for ONE slot. `withCoupon` attaches the coupon to this
  // booking (used for the first slot only).
  const createBooking = async (method, provider, slot, slotAmount, withCoupon) => {
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
              Number(selectedSport.pricePerHour) || slotAmount || 0,
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
      timeSlot: slot?.timeSlot,
      amount: slotAmount,
      paymentMethod: method,
      paymentProvider: provider || "",
      ...(selectedCourt
        ? { court: { name: selectedCourt.name, type: selectedCourt.type || "" } }
        : {}),
      ...(withCoupon && couponCode ? { couponCode } : {}),
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
          `Could not book the ${slot?.timeSlot || ""} slot. Please try again.`
      );
      return null;
    }
  };

  const navigateToConfirmation = (bookings, method, provider, chargedTotal) => {
    const bookedSlots = slots.slice(0, bookings.length);
    navigation.navigate("TurfConfirmation", {
      bookingId: bookings[0]?._id,
      bookingIds: bookings.map((b) => b?._id).filter(Boolean),
      userId: user?.id || user?._id,
      turfId,
      turfName: turfName || "Turf",
      type: selectedSport?.name,
      date,
      time: bookedSlots.map((sl) => sl?.timeSlot).filter(Boolean).join(", "),
      slotCount: bookings.length,
      venue: turfAddress || "Venue address not available",
      amount: chargedTotal,
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
    if (slots.length === 0) {
      Alert.alert("No slot selected", "Please select at least one slot.");
      return;
    }

    setSubmitting(true);
    try {
      const payMethod = method.online ? "online" : "cash";
      const provider = method.online ? method.id : "";

      // One booking per slot. The coupon discount goes on the first slot only.
      const created = [];
      let chargedTotal = 0;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const isFirst = i === 0;
        const slotAmount = isFirst
          ? Math.max(0, priceOf(slot) - orderDiscount)
          : priceOf(slot);
        const booking = await createBooking(
          payMethod,
          provider,
          slot,
          slotAmount,
          isFirst
        );
        if (!booking) break; // createBooking already alerted
        created.push(booking);
        chargedTotal += slotAmount;
      }

      if (created.length === 0) return; // all failed; alert already shown
      if (created.length < slots.length) {
        Alert.alert(
          "Partially booked",
          `Booked ${created.length} of ${slots.length} slots. The remaining slot(s) couldn't be completed.`
        );
      }
      navigateToConfirmation(created, payMethod, provider, chargedTotal);
    } finally {
      setSubmitting(false);
    }
  };

  // Free slot → skip payment selection; one "Create Booking" button. Mirrors
  // handlePay's loop with no payment method (amount 0). The backend creates the
  // booking; slot-availability and other checks run there as usual.
  const handleFreeBooking = async () => {
    if (submitting) return;
    if (slots.length === 0) {
      Alert.alert("No slot selected", "Please select at least one slot.");
      return;
    }
    setSubmitting(true);
    try {
      const created = [];
      let chargedTotal = 0;
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const slotAmount = i === 0
          ? Math.max(0, priceOf(slot) - orderDiscount)
          : priceOf(slot);
        const booking = await createBooking("online", "", slot, slotAmount, i === 0);
        if (!booking) break;
        created.push(booking);
        chargedTotal += slotAmount;
      }
      if (created.length === 0) return;
      navigateToConfirmation(created, "online", "", chargedTotal);
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
        {Number(totalAmount) === 0 ? (
          /* Free slot — no payment method to choose */
          <View style={s.methodCard}>
            <View style={s.methodIconWrap}>
              <Ionicons name="gift-outline" size={22} color="#15A765" />
            </View>
            <View style={s.methodBody}>
              <Text style={s.methodTitle}>This slot is free</Text>
              <Text style={s.methodSub}>No payment required — tap Create Booking to confirm.</Text>
            </View>
          </View>
        ) : (
          METHODS.map((m) => {
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
          })
        )}
      </ScrollView>

      {/* Bottom: Total + Pay now */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>{Number(totalAmount) === 0 ? 'Free' : `₹${totalAmount}/-`}</Text>
        </View>
        {Number(totalAmount) === 0 ? (
          <TouchableOpacity
            style={[s.payBtn, submitting && s.payBtnDisabled]}
            onPress={handleFreeBooking}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.payBtnText}>Create Booking</Text>
            )}
          </TouchableOpacity>
        ) : (
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
        )}
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
