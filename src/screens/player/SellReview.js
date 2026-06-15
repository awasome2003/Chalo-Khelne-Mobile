import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
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

const { width } = Dimensions.get("window");

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

// TODO: replace with admin-configured value once that flow exists
const DELIVERY_FEE = 50;

// Color name → swatch hex
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

const SellReview = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    product = {},
    images = [],
    seller = {},
    shippingAddress = {},
  } = route.params || {};

  const [activeIdx, setActiveIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);

  const onMomentumEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
    setActiveIdx(idx);
  };

  const swatch =
    COLOR_SWATCHES[product.color] || COLOR_SWATCHES.Other;
  const swatchBorder =
    product.color === "White" ? { borderWidth: 1, borderColor: "#E5E7EB" } : null;

  // Build pill tags: first 2 features + condition (if any) + 'Verified Seller'
  const tags = [];
  if (Array.isArray(product.features)) {
    product.features.slice(0, 2).forEach((f) => tags.push(f));
  }
  if (product.condition && !tags.includes(product.condition)) {
    tags.push(product.condition);
  }
  tags.push("Verified Seller");

  const qty = Number(product.quantity) || 1;
  const productPrice = product.isDonation ? 0 : Number(product.askingPrice) || 0;
  const total = productPrice * qty + (product.isDonation ? 0 : DELIVERY_FEE);

  // ─── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (images.length === 0) {
      Alert.alert(
        "Missing photos",
        "Please go back and add at least one photo."
      );
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const fd = new FormData();

      // Product fields
      Object.entries(product).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        fd.append(
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value)
        );
      });

      // Seller top-level fields
      if (seller.fullName) fd.append("sellerName", seller.fullName);
      if (seller.playerLevel) fd.append("sellerLevel", seller.playerLevel);
      if (seller.mobile) fd.append("sellerContact", seller.mobile);

      // Shipping subdocument as JSON
      fd.append("shippingAddress", JSON.stringify(shippingAddress));

      // Images
      images.forEach((img) => {
        fd.append("equipmentImages", {
          uri: img.uri,
          name: img.name,
          type: img.type,
        });
      });

      const res = await axios.post(DONATIONS.ENDPOINTS.CREATE, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        const listing = res.data.data || {};
        navigation.reset({
          index: 1,
          routes: [
            { name: "EquipmentHub" },
            {
              name: "SellListingSuccess",
              params: {
                product,
                images,
                seller,
                listingId: listing._id,
              },
            },
          ],
        });
      } else {
        throw new Error(res.data?.message || "Failed to list");
      }
    } catch (err) {
      console.error("Listing failed:", err);
      Alert.alert(
        "Listing Failed",
        err.response?.data?.message ||
          err.message ||
          "Could not create your listing. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>Review</Text>
      </View>

      {/* Progress — 100% */}
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 110 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product card */}
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

          {/* Color */}
          {product.color ? (
            <View style={styles.colorRow}>
              <View
                style={[styles.colorDot, { backgroundColor: swatch }, swatchBorder]}
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
        </View>

        {/* Price Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Price Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Qyt :</Text>
            <Text style={styles.summaryValue}>
              {String(qty).padStart(2, "0")}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product price</Text>
            <Text style={styles.summaryValue}>
              {product.isDonation ? "Free" : `₹${productPrice}/-`}
            </Text>
          </View>
          {!product.isDonation && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery fee</Text>
              <Text style={styles.summaryValue}>₹{DELIVERY_FEE}/-</Text>
            </View>
          )}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {product.isDonation ? "Free" : `₹${total}/-`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil" size={18} color={GREEN} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.9}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>Product Listing</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const HERO_W = width - 32;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

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

  progressTrack: {
    marginHorizontal: 16,
    height: 3,
    backgroundColor: "#EAEAEA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { width: "100%", height: "100%", backgroundColor: GREEN },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  imageWrap: { position: "relative" },
  heroImage: {
    width: HERO_W - 28,
    height: 220,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
    marginRight: 0,
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

  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
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
    marginTop: 14,
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

  specRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
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

  // Summary
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 14,
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

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    flexDirection: "row",
    gap: 10,
  },
  editBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default SellReview;
