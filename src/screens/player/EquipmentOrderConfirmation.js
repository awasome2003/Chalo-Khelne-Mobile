import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

const SUPPORT_PHONE = "+91 98765 43210";

// Display order ID: INX + first 6 of claim/listing _id, uppercased
const makeOrderId = (items) => {
  const first = items?.[0];
  const seed =
    first?.claimId ||
    first?.responseId ||
    first?.listingId ||
    Math.random().toString(36).slice(2);
  return `INX${String(seed).replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`;
};

const formatDeliveryDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const EquipmentOrderConfirmation = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    items = [],
    failedItems = [],
    amount = 0,
    paymentMethod = "online",
    orderDate,
  } = route.params || {};

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  const orderId = makeOrderId(items);
  const deliveryDate = formatDeliveryDate();
  const totalCount = items.length;
  const firstName = items?.[0]?.itemName || "Equipment";
  const productLabel =
    totalCount > 1 ? `${firstName} +${totalCount - 1} more` : firstName;

  const goToOrders = () => navigation.navigate("MyClaims");
  const goToTrackOrder = () =>
    navigation.navigate("TrackOrder", {
      orderId,
      items,
      amount,
      deliveryDate,
      orderDate,
    });
  const callSupport = () => {
    const tel = SUPPORT_PHONE.replace(/[\s-]/g, "");
    Linking.openURL(`tel:${tel}`);
  };
  const openChat = () =>
    navigation.navigate("Chat", { screen: "ChatList" });

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
    setActiveIdx(idx);
  };

  return (
    <View style={styles.root}>
      {/* Green hero (extends behind status bar) */}
      <SafeAreaView style={styles.hero} edges={["top"]}>
        <View style={styles.heroContent}>
          <View style={styles.tickCircle}>
            <Ionicons name="checkmark" size={32} color={GREEN} />
          </View>
          <Text style={styles.heroTitle}>Order Confirmed</Text>
          <Text style={styles.heroSub}>
            Your order has been placed successfully and{"\n"}is being processed
            by INOX
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{
          paddingBottom: 130 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product card overlaps the hero */}
        <View style={styles.productCard}>
          <View style={styles.imageWrap}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumEnd}
            >
              {items.length === 0 ? (
                <View style={[styles.heroImage, styles.imagePlaceholder]}>
                  <Ionicons
                    name="basketball-outline"
                    size={48}
                    color="#D1D5DB"
                  />
                </View>
              ) : (
                items.map((it, i) =>
                  it.image ? (
                    <Image
                      key={it.listingId || i}
                      source={{ uri: it.image }}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      key={it.listingId || i}
                      style={[styles.heroImage, styles.imagePlaceholder]}
                    >
                      <Ionicons
                        name="basketball-outline"
                        size={48}
                        color="#D1D5DB"
                      />
                    </View>
                  )
                )
              )}
            </ScrollView>

            {items.length > 1 && (
              <View style={styles.dotsRow}>
                {items.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeIdx === i && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Details */}
          <View style={styles.detailsBlock}>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Order ID</Text>
              <Text style={styles.kvVal}>{orderId}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Product</Text>
              <Text style={styles.kvVal} numberOfLines={1}>
                {productLabel}
              </Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Total Paid</Text>
              <Text style={styles.kvVal}>
                ₹{Number(amount).toLocaleString()}
              </Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Delivery By</Text>
              <Text style={styles.kvVal}>{deliveryDate}</Text>
            </View>
          </View>
        </View>

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
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={GREEN} />
              <Text style={styles.helpBtnText}>Chat with us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Failed claims warning, if any */}
        {failedItems.length > 0 && (
          <View style={styles.warnCard}>
            <Text style={styles.warnTitle}>
              {failedItems.length} item{failedItems.length === 1 ? "" : "s"}{" "}
              could not be claimed
            </Text>
            {failedItems.map((f) => (
              <Text key={f.item.listingId} style={styles.warnRow}>
                · {f.item.itemName} — {f.message}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom CTAs */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={goToTrackOrder}
          activeOpacity={0.85}
        >
          <Text style={styles.outlineBtnText}>Track Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.solidBtn}
          onPress={goToOrders}
          activeOpacity={0.9}
        >
          <Text style={styles.solidBtnText}>My Order's</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PRODUCT_IMAGE_WIDTH = width - 32;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  // Hero
  hero: {
    backgroundColor: GREEN,
    paddingBottom: 60,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroContent: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  tickCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: 18,
  },

  scrollArea: {
    flex: 1,
    marginTop: -40,
  },

  // Product card
  productCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  imageWrap: { position: "relative" },
  heroImage: {
    width: PRODUCT_IMAGE_WIDTH,
    height: 220,
    backgroundColor: "#F4F4F5",
  },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  dotActive: {
    backgroundColor: TEXT_DARK,
    width: 16,
    borderRadius: 4,
  },

  detailsBlock: { padding: 16, paddingTop: 14 },
  kvRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  kvKey: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  kvVal: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    marginLeft: 12,
  },

  // Help
  helpCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
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

  // Warn
  warnCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warnTitle: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 6,
  },
  warnRow: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#92400E",
    marginTop: 2,
  },

  // CTAs
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
    flexDirection: "row",
    gap: 10,
  },
  outlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  outlineBtnText: {
    color: GREEN_DARK,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
  solidBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  solidBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default EquipmentOrderConfirmation;
