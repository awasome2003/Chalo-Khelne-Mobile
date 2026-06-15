import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import DONATIONS from "../../api/donations";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const ORANGE = "#F59E0B";
const AMBER_BG = "#FEF3C7";
const AMBER_FG = "#92400E";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

const SUPPORT_PHONE = "+91 98765 43210";
// TODO: replace with admin-configured value once that flow exists
const DELIVERY_FEE = 50;

const STAGE_STATUS = { DONE: "done", ACTIVE: "active", PENDING: "pending" };

const formatStamp = (d) =>
  d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatRegistered = (d) =>
  d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

// 4-stage lifecycle for sellers, derived from days elapsed since createdAt.
const buildStages = (createdAt) => {
  const now = new Date();
  const elapsed = Math.floor(
    (now - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  const stamp = (offsetDays, offsetHours = 0, offsetMins = 0) => {
    const d = new Date(createdAt.getTime());
    d.setDate(d.getDate() + offsetDays);
    d.setHours(d.getHours() + offsetHours);
    d.setMinutes(d.getMinutes() + offsetMins);
    return formatStamp(d);
  };

  const statusFor = (stageIdx) => {
    if (elapsed > stageIdx) return STAGE_STATUS.DONE;
    if (elapsed === stageIdx) return STAGE_STATUS.ACTIVE;
    return STAGE_STATUS.PENDING;
  };

  return [
    {
      label: "Product listed",
      stamp: stamp(0),
      status: STAGE_STATUS.DONE,
    },
    {
      label: "Picked up",
      stamp: stamp(1, -1, -10),
      status: statusFor(1),
    },
    {
      label: "In verification",
      stamp: stamp(2, -2, -30),
      status: statusFor(2),
    },
    {
      label: "Approved",
      stamp: elapsed >= 3 ? stamp(3, -2) : "Pending",
      status: statusFor(3),
    },
  ];
};

const SellProductStatus = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    listingId,
    product: paramProduct,
    images: paramImages,
  } = route.params || {};

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(!paramProduct);

  // Fetch listing details when we don't already have them in params
  useEffect(() => {
    if (paramProduct) return;
    if (!listingId) return;
    (async () => {
      try {
        const res = await axios.get(DONATIONS.ENDPOINTS.LISTING_BY_ID(listingId));
        setListing(res.data?.data || null);
      } catch (e) {
        console.error("Failed to fetch listing status:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId, paramProduct]);

  // Derive view-model from either nav params (fresh from submit) or fetched listing
  const itemName =
    paramProduct?.itemName || listing?.itemName || "Equipment";
  const firstImage =
    paramImages?.[0]?.uri ||
    assetUrl(listing?.images?.[0]);
  const createdAt = listing?.createdAt ? new Date(listing.createdAt) : new Date();
  const stages = buildStages(createdAt);

  const productPrice =
    paramProduct?.isDonation || listing?.isDonation
      ? 0
      : Number(paramProduct?.askingPrice ?? listing?.askingPrice ?? 0);
  const isDonation = !!(paramProduct?.isDonation || listing?.isDonation);
  const total = productPrice + (isDonation ? 0 : DELIVERY_FEE);

  // Show "taking longer" banner once the listing is past the active stage by 1 day
  const showSlowBanner = stages.some((s) => s.status === STAGE_STATUS.ACTIVE);

  // ─── Handlers ──────────────────────────────────────────────────────
  const callSupport = () => {
    const tel = SUPPORT_PHONE.replace(/[\s-]/g, "");
    Linking.openURL(`tel:${tel}`);
  };
  const openChat = () => navigation.navigate("Chat", { screen: "ChatList" });
  const goToListings = () =>
    navigation.reset({
      index: 1,
      routes: [{ name: "EquipmentHub" }, { name: "MyListings" }],
    });

  // ─── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  const StageRow = ({ stage, isLast }) => {
    const isDone = stage.status === STAGE_STATUS.DONE;
    const isActive = stage.status === STAGE_STATUS.ACTIVE;

    return (
      <View style={styles.row}>
        <View style={styles.indicatorCol}>
          {isDone ? (
            <View style={[styles.bullet, { backgroundColor: GREEN }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          ) : isActive ? (
            <View style={[styles.bullet, { backgroundColor: ORANGE }]}>
              <Ionicons name="time-outline" size={14} color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.bulletPending} />
          )}
          {!isLast && (
            <View
              style={[
                styles.connector,
                { backgroundColor: isDone ? GREEN : "#E5E7EB" },
              ]}
            />
          )}
        </View>

        <View style={styles.rowText}>
          <Text style={styles.stageLabel}>{stage.label}</Text>
          <Text style={styles.stageStamp}>{stage.stamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Status</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product summary */}
        <View style={styles.productCard}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.productImg} />
          ) : (
            <View style={[styles.productImg, styles.productImgFallback]}>
              <Ionicons name="basketball-outline" size={22} color="#D1D5DB" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {itemName}
            </Text>
            <Text style={styles.productMeta}>
              Registered on {formatRegistered(createdAt)}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineCard}>
          {stages.map((s, i) => (
            <StageRow
              key={s.label}
              stage={s}
              isLast={i === stages.length - 1}
            />
          ))}
        </View>

        {/* Slow-tracking banner */}
        {showSlowBanner && (
          <View style={styles.slowBanner}>
            <View style={styles.slowIcon}>
              <Ionicons name="cube-outline" size={20} color={AMBER_FG} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.slowTitle}>
                Tracking taking longer than usual
              </Text>
              <Text style={styles.slowSub}>
                We're still processing your item. You'll receive an update
                shortly.
              </Text>
            </View>
          </View>
        )}

        {/* Help card */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need help?</Text>
          <Text style={styles.helpSub}>
            Your item is safe. Reach out for updates
          </Text>
          <View style={styles.helpRow}>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={callSupport}
              activeOpacity={0.85}
            >
              <Ionicons name="call-outline" size={18} color={GREEN} />
              <Text style={styles.helpBtnText}>{SUPPORT_PHONE}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={openChat}
              activeOpacity={0.85}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={GREEN}
              />
              <Text style={styles.helpBtnText}>Chat with us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Price Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product price</Text>
            <Text style={styles.summaryValue}>
              {isDonation ? "Free" : `₹${productPrice}/-`}
            </Text>
          </View>
          {!isDonation && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>₹{DELIVERY_FEE}/-</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {isDonation ? "Free" : `₹${total}/-`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.cta}
          onPress={goToListings}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>My Listing</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const BULLET = 22;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },

  // Product summary
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  productImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
  },
  productImgFallback: { justifyContent: "center", alignItems: "center" },
  productTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  productMeta: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Timeline
  timelineCard: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  row: { flexDirection: "row", alignItems: "stretch" },
  indicatorCol: {
    alignItems: "center",
    width: BULLET,
    marginRight: 14,
  },
  bullet: {
    width: BULLET,
    height: BULLET,
    borderRadius: BULLET / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  bulletPending: {
    width: BULLET,
    height: BULLET,
    borderRadius: BULLET / 2,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  connector: {
    flex: 1,
    width: 2,
    marginVertical: 2,
  },
  rowText: { flex: 1, paddingBottom: 18 },
  stageLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  stageStamp: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
  },

  // Slow banner
  slowBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: AMBER_BG,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  slowIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  slowTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 2,
  },
  slowSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: AMBER_FG,
    lineHeight: 17,
  },

  // Help
  helpCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  helpSub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
    marginBottom: 12,
  },
  helpRow: { flexDirection: "row", gap: 10 },
  helpBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 12,
  },
  helpBtnText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN,
  },

  // Summary
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_DARK,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  totalValue: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },

  // CTA
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  cta: {
    backgroundColor: GREEN,
    borderRadius: 28,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default SellProductStatus;
