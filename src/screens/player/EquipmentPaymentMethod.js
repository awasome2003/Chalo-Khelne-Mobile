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
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DONATIONS from "../../api/donations";
import { useAuth } from "../../context/AuthContext";
import { clearCart } from "../../api/cart";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#666666";

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

const EquipmentPaymentMethod = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    cartItems = [],
    amount = 0,
    baseAmount = 0,
    userName,
    userEmail,
    userPhone,
  } = route.params || {};

  const [selectedMethodId, setSelectedMethodId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── Sequential claim per cart item ────────────────────────────────
  const claimAllItems = async (apiPaymentMethod) => {
    const token = await AsyncStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const contact = userPhone || user?.phone || user?.mobile || "";

    const successes = [];
    const failures = [];

    for (const item of cartItems) {
      try {
        const res = await axios.post(
          DONATIONS.ENDPOINTS.CLAIM(item.listingId),
          { paymentMethod: apiPaymentMethod, buyerContact: contact },
          { headers }
        );
        successes.push({ item, response: res.data });
      } catch (err) {
        failures.push({
          item,
          message:
            err.response?.data?.message ||
            err.message ||
            "Could not claim this item",
        });
      }
    }

    return { successes, failures };
  };

  const handlePay = async () => {
    if (!selectedMethodId || submitting) return;
    if (!cartItems || cartItems.length === 0) {
      Alert.alert("Empty cart", "There are no items to pay for.");
      return;
    }

    const userId = user?.id || user?._id;
    if (!userId) {
      Alert.alert(
        "Login Required",
        "Please log in to complete the purchase."
      );
      return;
    }

    const method = METHODS.find((m) => m.id === selectedMethodId);
    if (!method) return;

    setSubmitting(true);
    try {
      // Backend expects upi/qr/offline; map online providers → "upi", cod → "offline"
      const apiPaymentMethod = method.online ? method.id : "offline";

      const { successes, failures } = await claimAllItems(apiPaymentMethod);

      if (successes.length === 0) {
        Alert.alert(
          "Order Failed",
          failures[0]?.message || "Could not place your order. Please try again."
        );
        return;
      }

      // Clear cart of items that were successfully claimed
      await clearCart();

      navigation.navigate("EquipmentOrderConfirmation", {
        items: successes.map((s) => ({
          ...s.item,
          claimId:
            s.response?.claim?._id ||
            s.response?.data?._id ||
            s.response?._id,
        })),
        failedItems: failures,
        orderDate: new Date().toISOString(),
        amount,
        baseAmount,
        paymentMethod: method.online ? "online" : "cash",
        paymentProvider: method.online ? method.id : "",
        userName: userName || user?.name || "",
        userEmail: userEmail || user?.email || "",
        userPhone: userPhone || user?.phone || user?.mobile || "",
      });
    } catch (err) {
      console.error("[EquipmentPaymentMethod] pay failed:", err);
      Alert.alert(
        "Payment Failed",
        err.response?.data?.message ||
          err.message ||
          "Could not complete your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
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
                <Ionicons name={m.icon} size={22} color={GREEN} />
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
          <Text style={s.totalValue}>₹{amount}/-</Text>
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
    color: TEXT_DARK,
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
    borderColor: GREEN,
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
    color: TEXT_DARK,
  },
  methodSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
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
    color: TEXT_DARK,
  },
  totalValue: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  payBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: { backgroundColor: "#A4D9BD" },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default EquipmentPaymentMethod;
