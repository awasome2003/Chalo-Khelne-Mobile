import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";

const { width } = Dimensions.get("window");

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

const COLOR_SWATCHES = {
  Black: "#000000",
  White: "#FFFFFF",
  Red: "#DC2626",
  Blue: "#2563EB",
  Green: "#15A765",
  "Dark Green": "#0F8A55",
  Yellow: "#F59E0B",
  Gray: "#6B7280",
  Orange: "#F97316",
  Pink: "#EC4899",
  Other: "#9CA3AF",
};

const titleCase = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

const SellListingSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    product = {},
    images = [],
    seller = {},
    listingId,
  } = route.params || {};

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef(null);

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
    setActiveIdx(idx);
  };

  const swatch = COLOR_SWATCHES[product.color] || COLOR_SWATCHES.Other;
  const swatchBorder =
    product.color === "White"
      ? { borderWidth: 1, borderColor: "#E5E7EB" }
      : null;

  const tags = [];
  if (Array.isArray(product.features)) {
    product.features.slice(0, 2).forEach((f) => tags.push(f));
  }
  if (product.condition && !tags.includes(product.condition)) {
    tags.push(product.condition);
  }
  tags.push("Verified Seller");

  const sellerName = seller.fullName || user?.name || "Seller";
  const sellerLevelLabel = seller.playerLevel
    ? `${titleCase(seller.playerLevel)} Level Player`
    : "Player";

  const goToListings = () => {
    navigation.reset({
      index: 1,
      routes: [{ name: "EquipmentHub" }, { name: "MyListings" }],
    });
  };

  const goToStatus = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: "EquipmentHub" },
        {
          name: "SellProductStatus",
          params: { listingId, product, images },
        },
      ],
    });
  };

  const userAvatarUri =
    typeof user?.profileImage === "string" && user.profileImage.startsWith("http")
      ? user.profileImage
      : user?.profileImage
      ? `${API.SERVER_URL}/uploads/${user.profileImage}`
      : null;

  return (
    <View style={styles.root}>
      {/* Green hero */}
      <SafeAreaView style={styles.hero} edges={["top"]}>
        <View style={styles.heroContent}>
          <View style={styles.tickCircle}>
            <Ionicons name="checkmark" size={32} color={GREEN} />
          </View>
          <Text style={styles.heroTitle}>Your Product is List on ionx</Text>
          <Text style={styles.heroSub}>
            Your item is now visible to buyers and{"\n"}ready to sell
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product card overlapping hero */}
        <View style={styles.card}>
          <View style={styles.imageWrap}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumEnd}
            >
              {images.length > 0 ? (
                images.map((img, i) => (
                  <Image
                    key={img.uri || i}
                    source={{ uri: img.uri }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                ))
              ) : (
                <View style={[styles.heroImage, styles.imagePlaceholder]}>
                  <Ionicons
                    name="basketball-outline"
                    size={48}
                    color="#D1D5DB"
                  />
                </View>
              )}
            </ScrollView>

            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, activeIdx === i && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Title + description */}
          <Text style={styles.title}>{product.itemName || "Equipment"}</Text>
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}

          {/* Seller row */}
          <View style={styles.sellerRow}>
            {userAvatarUri ? (
              <Image
                source={{ uri: userAvatarUri }}
                style={styles.sellerAvatar}
              />
            ) : (
              <View style={[styles.sellerAvatar, styles.sellerAvatarFallback]}>
                <Ionicons name="person" size={20} color="#9CA3AF" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              <Text style={styles.sellerLevel}>{sellerLevelLabel}</Text>
            </View>
          </View>

          {/* Color */}
          {product.color ? (
            <View style={styles.colorRow}>
              <View
                style={[
                  styles.colorDot,
                  { backgroundColor: swatch },
                  swatchBorder,
                ]}
              />
              <Text style={styles.colorText}>{product.color}</Text>
            </View>
          ) : null}

          {/* Tags */}
          {tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {tags.map((t, i) => (
                <View key={`${t}-${i}`} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Brand + Size */}
          {(product.brand || product.size) && (
            <View style={styles.specRow}>
              {product.brand ? (
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>Brand</Text>
                  <Text style={styles.specValue}>{product.brand}</Text>
                </View>
              ) : null}
              {product.size ? (
                <View style={styles.specBox}>
                  <Text style={styles.specLabel}>Size</Text>
                  <Text style={styles.specValue}>{product.size}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={goToListings}
          activeOpacity={0.85}
        >
          <Text style={styles.outlineBtnText}>My Listing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.solidBtn}
          onPress={goToStatus}
          activeOpacity={0.9}
        >
          <Text style={styles.solidBtnText}>Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
    textAlign: "center",
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.92)",
    textAlign: "center",
    lineHeight: 18,
  },

  scrollArea: { flex: 1, marginTop: -40 },

  // Card
  card: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  imageWrap: { position: "relative" },
  heroImage: {
    width: width - 60,
    height: 220,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
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

  title: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 14,
  },
  description: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 6,
    lineHeight: 18,
  },

  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FIELD_BG,
  },
  sellerAvatarFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  sellerName: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  sellerLevel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  colorText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN_DARK,
  },

  specRow: { flexDirection: "row", gap: 12, marginTop: 14 },
  specBox: {
    flex: 1,
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  specLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  specValue: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
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

export default SellListingSuccess;
