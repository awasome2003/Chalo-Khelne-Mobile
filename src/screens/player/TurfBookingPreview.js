import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import API from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import CouponInput from "../../components/CouponInput";

// ─── Helpers ────────────────────────────────────────────────────────────

// Parse a time string ("3:30", "15:30", "3:30 PM") into total minutes.
const parseMinutes = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || "0", 10) || 0;
  const ap = m[3];
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (isNaN(h)) return null;
  return h * 60 + min;
};

// Convert a time string to "3:30PM" / "10:00AM" form.
const to12hWithSuffix = (raw) => {
  if (!raw) return "";
  const s = String(raw).trim().toLowerCase();
  const m = s.match(/(\d{1,2}):?(\d{0,2})/);
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || "0", 10) || 0;
  if (isNaN(h)) return raw;
  const ap = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${String(min).padStart(2, "0")}${ap}`;
};

// "3:30 – 5:00 PM" when both halves share a period, else "3:30 PM – 5:00 PM".
const to12hRange = (slot) => {
  if (!slot?.startTime || !slot?.endTime) return slot?.timeSlot || "";
  const parse = (raw) => {
    const m = String(raw).trim().toLowerCase().match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2] || "0", 10) || 0;
    const ap = m[3];
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return { h, m: min };
  };
  const s = parse(slot.startTime);
  const e = parse(slot.endTime);
  if (!s || !e) return slot.timeSlot || "";
  const sAp = s.h >= 12 ? "PM" : "AM";
  const eAp = e.h >= 12 ? "PM" : "AM";
  const sh = s.h === 0 ? 12 : s.h > 12 ? s.h - 12 : s.h;
  const eh = e.h === 0 ? 12 : e.h > 12 ? e.h - 12 : e.h;
  const sStr = `${sh}:${String(s.m).padStart(2, "0")}`;
  const eStr = `${eh}:${String(e.m).padStart(2, "0")}`;
  if (sAp === eAp) return `${sStr} – ${eStr} ${sAp}`;
  return `${sStr} ${sAp} – ${eStr} ${eAp}`;
};

// "60 min" / "90 min" computed from start → end.
const slotDurationLabel = (slot) => {
  const s = parseMinutes(slot?.startTime);
  const e = parseMinutes(slot?.endTime);
  if (s == null || e == null) return "60 min";
  let diff = e - s;
  if (diff <= 0) diff += 24 * 60;
  return `${diff} min`;
};

// "Wed, 22 Apr" from a YYYY-MM-DD string.
const formatDateLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const mon = d.toLocaleDateString("en-US", { month: "short" });
  return `${day}, ${d.getDate()} ${mon}`;
};

const TurfBookingPreview = ({ route }) => {
  const params = route.params || {};
  const {
    turfId,
    turfName: incomingTurfName,
    turfAddress: incomingTurfAddress,
    date,
    selectedSlot,
    selectedCourt,
    selectedSport,
  } = params;

  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [turfDetails, setTurfDetails] = useState(null);
  const [loadingTurf, setLoadingTurf] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!turfId) {
      setLoadingTurf(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(API.ENDPOINTS.TURFS.BY_ID(turfId));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTurfDetails(data);
      } catch (err) {
        console.error("[TurfBookingPreview] turf fetch failed:", err);
      } finally {
        setLoadingTurf(false);
      }
    })();
  }, [turfId]);

  // ─── Derived ─────────────────────────────────────────────────────────
  const turfName = incomingTurfName || turfDetails?.name || "Sport Zone";
  const sportName = selectedSport?.name || "Sport";
  const address =
    incomingTurfAddress ||
    (turfDetails?.address
      ? [turfDetails.address.area, turfDetails.address.city]
          .filter(Boolean)
          .join(", ")
      : "");

  const heroImage = useMemo(() => {
    if (turfDetails?.images?.[0]) {
      return {
        uri: `${API.UPLOADS_URL}/${String(turfDetails.images[0]).replace(/\\/g, "/")}`,
      };
    }
    return require("../../../assets/turf.jpg");
  }, [turfDetails]);

  const baseAmount = useMemo(() => {
    const sportPrice = Number(selectedSport?.pricePerHour);
    const slotPrice = Number(selectedSlot?.price);
    if (!isNaN(sportPrice) && sportPrice > 0) return sportPrice;
    if (!isNaN(slotPrice) && slotPrice > 0) return slotPrice;
    return 0;
  }, [selectedSport, selectedSlot]);

  const finalAmount = appliedCoupon?.final_amount ?? baseAmount;

  const dateLabel = formatDateLabel(date);
  const timeLabel = to12hWithSuffix(selectedSlot?.startTime);
  const timeRangeLabel = to12hRange(selectedSlot);
  const durationLabel = slotDurationLabel(selectedSlot);

  // ─── Actions ─────────────────────────────────────────────────────────
  const handleProceedToPay = () => {
    if (!user) {
      Alert.alert("Login Required", "Please login to continue.");
      return;
    }
    const email = user.email;
    const phone = user.phone || user.phoneNumber || user.mobile;
    if (!email || !phone) {
      Alert.alert(
        "Profile incomplete",
        "Please add your email and phone number to your profile before booking.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Edit Profile",
            onPress: () => navigation.navigate("EditProfile"),
          },
        ]
      );
      return;
    }
    if (!termsAccepted) {
      Alert.alert(
        "Terms required",
        "Please accept the venue's Terms & Conditions to continue."
      );
      return;
    }

    navigation.navigate("TurfPaymentMethod", {
      turfId,
      turfName,
      turfAddress: address,
      date,
      selectedSlot,
      selectedCourt,
      selectedSport,
      baseAmount,
      amount: finalAmount,
      couponCode: appliedCoupon?.code || null,
      couponDiscount: appliedCoupon?.discount_amount || 0,
      // Contact info pulled from the auth profile — no inline form on this screen.
      userName: user.fullName || user.name || "",
      userEmail: email,
      userPhone: phone,
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────
  if (loadingTurf) {
    return (
      <SafeAreaView style={s.container} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#15A765" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.headerBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#1A181B" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cart</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Title block */}
          <Text style={s.pageTitle}>Preview</Text>
          <Text style={s.pageSubtitle}>
            {turfName} Turf, {sportName}
          </Text>

          {/* Booking summary card */}
          <View style={s.card}>
            <Image source={heroImage} style={s.cardImage} resizeMode="cover" />
            <View style={s.cardBody}>
              <View style={s.cardTopRow}>
                <Text style={s.cardSport}>{sportName}</Text>
                <Text style={s.cardDuration}>{durationLabel}</Text>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>
                {turfName}
              </Text>

              <View style={s.cardDetailRow}>
                <Ionicons name="time-outline" size={14} color="#8D848F" />
                <Text style={s.cardDetailText}>{timeRangeLabel}</Text>
              </View>

              {!!address && (
                <View style={s.cardDetailRow}>
                  <Ionicons name="location-outline" size={14} color="#8D848F" />
                  <Text style={s.cardDetailText} numberOfLines={1}>
                    {address}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Coupon */}
          <View style={s.couponWrap}>
            <CouponInput
              totalAmount={baseAmount}
              applicableType="facility"
              applicableId={turfId}
              userId={user?._id || user?.id}
              onApply={(couponData) => setAppliedCoupon(couponData)}
              onRemove={() => setAppliedCoupon(null)}
            />
          </View>

          {/* Date & Time block */}
          <Text style={s.sectionTitle}>Date & Time</Text>
          <View style={s.kvRow}>
            <Text style={s.kvLabel}>{dateLabel || "—"}</Text>
            <Text style={s.kvValue}>{timeLabel || "—"}</Text>
          </View>
          <View style={s.kvRow}>
            <Text style={s.kvLabel}>Court</Text>
            <Text style={s.kvValue}>{selectedCourt?.name || "—"}</Text>
          </View>

          <View style={s.divider} />

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <View style={{ alignItems: "flex-end" }}>
              {appliedCoupon && finalAmount !== baseAmount && (
                <Text style={s.totalStruck}>₹{baseAmount}/-</Text>
              )}
              <Text style={s.totalValue}>₹{finalAmount}/-</Text>
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={s.termsRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.85}
          >
            <View
              style={[
                s.checkbox,
                termsAccepted && s.checkboxChecked,
              ]}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={s.termsText}>
              I agree to the venue's{" "}
              <Text
                style={s.termsLink}
                onPress={() => navigation.navigate("TermsConditionsScreen")}
              >
                Terms & Conditions
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={s.payBtn}
          activeOpacity={0.85}
          onPress={handleProceedToPay}
        >
          <Text style={s.payBtnText}>Proceed to Pay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

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

  pageTitle: {
    fontSize: 24,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginTop: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginBottom: 14,
  },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1FA",
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 14,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#eee",
  },
  cardBody: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardSport: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#15A765",
  },
  cardDuration: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#8D848F",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 2,
  },
  cardDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardDetailText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },

  // Coupon
  couponWrap: { marginBottom: 14 },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginTop: 6,
    marginBottom: 10,
  },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  kvLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
  },
  kvValue: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },

  divider: {
    height: 1,
    backgroundColor: "#EEF1FA",
    marginVertical: 14,
  },

  // Total
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  totalValue: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  totalStruck: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#8D848F",
    textDecorationLine: "line-through",
  },

  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#15A765",
    borderColor: "#15A765",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#1A181B",
    lineHeight: 20,
  },
  termsLink: {
    color: "#0088FF",
    textDecorationLine: "underline",
  },

  // Bottom
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  payBtn: {
    backgroundColor: "#15A765",
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default TurfBookingPreview;
