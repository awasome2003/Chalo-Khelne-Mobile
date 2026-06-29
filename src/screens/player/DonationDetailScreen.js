import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking,
  Pressable,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DONATIONS from "../../api/donations";

const { width, height } = Dimensions.get("window");

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

const SafeImage = ({ uri, style, fallback, ...rest }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : fallback}
      style={style}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

const DonationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { listingId } = route.params;

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [isFav, setIsFav] = useState(false);

  // Claim form
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [buyerContact, setBuyerContact] = useState(user?.mobile || "");

  // Payment upload
  const [showPayForm, setShowPayForm] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [uploading, setUploading] = useState(false);

  const close = () => navigation.goBack();

  const fetchListing = async () => {
    try {
      const res = await axios.get(DONATIONS.ENDPOINTS.LISTING_BY_ID(listingId));
      setListing(res.data.data);
    } catch (err) {
      console.error("Failed to fetch listing:", err);
      Alert.alert("Error", "Failed to load listing details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [listingId]);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        DONATIONS.ENDPOINTS.CLAIM(listingId),
        { paymentMethod, buyerContact },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", res.data.message);
      setShowClaimForm(false);
      fetchListing();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to claim item."
      );
    } finally {
      setClaiming(false);
    }
  };

  const handlePayUpload = async () => {
    if (!transactionId.trim()) {
      Alert.alert("Error", "Please enter transaction ID.");
      return;
    }
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      await axios.post(
        DONATIONS.ENDPOINTS.PAY(listingId),
        { transactionId, paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Payment proof uploaded. Seller will verify.");
      setShowPayForm(false);
      fetchListing();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to upload payment."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async (action) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        DONATIONS.ENDPOINTS.VERIFY(listingId),
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", res.data.message);
      fetchListing();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to verify."
      );
    }
  };

  // ─── Spec helpers ───────────────────────────────────────────────────
  // Build a flat key→value object from whatever the listing exposes.
  const getSpecs = (l) => {
    const specs = l.specifications || {};
    const map = {
      Brand: l.brand || specs.brand,
      Material: specs.material,
      "Grip Size": specs.gripSize,
      Size: l.size || specs.size,
      Weight: specs.weight,
      Condition: l.condition,
      Usage: specs.usage,
      Warranty: specs.warranty,
    };
    return Object.fromEntries(
      Object.entries(map).filter(([, v]) => v !== undefined && v !== "")
    );
  };

  // Feature pills above description (e.g. "Breathable", "2 Paddles")
  const getFeatures = (l) => {
    if (Array.isArray(l.features)) return l.features;
    if (Array.isArray(l.tags)) return l.tags;
    return [];
  };

  // ─── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.backdrop}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <Pressable style={styles.backdrop} onPress={close}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Listing not found</Text>
        </View>
      </Pressable>
    );
  }

  const isSeller =
    user?._id === listing.seller?._id || user?._id === listing.seller;
  const isBuyer =
    user?._id === listing.claimedBy?._id || user?._id === listing.claimedBy;
  const isFree = listing.isDonation || listing.askingPrice === 0;
  const specs = getSpecs(listing);
  const features = getFeatures(listing);
  const useDetailedList = Object.keys(specs).length >= 3;

  const buyButtonLabel = listing.isDonation ? "Claim Now" : "Buy Now";
  const canBuy = listing.status === "Active" && !isSeller;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Dark backdrop area (touch closes the sheet) */}
      <Pressable style={styles.backdropTouch} onPress={close}>
        <View style={[styles.closeWrap, { top: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={close}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={20} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>
      </Pressable>

      {/* Bottom sheet card */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 }}
        >
          {/* Hero image */}
          <View style={styles.imageWrap}>
            {listing.images && listing.images.length > 0 ? (
              <SafeImage
                uri={listing.images[activeImage] || listing.images[0]}
                style={styles.heroImage}
                resizeMode="cover"
                fallback={require("../../../assets/turf.jpg")}
              />
            ) : (
              <View style={[styles.heroImage, styles.imagePlaceholder]}>
                <Ionicons name="basketball-outline" size={56} color="#D1D5DB" />
              </View>
            )}

            {/* Rating badge — only if present */}
            {listing.rating ? (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{listing.rating}</Text>
              </View>
            ) : null}

            {/* Image dots */}
            {listing.images && listing.images.length > 1 && (
              <View style={styles.dotsRow}>
                {listing.images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setActiveImage(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <View
                      style={[
                        styles.dot,
                        activeImage === i && styles.dotActive,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* INOX Verified + Favorite */}
          <View style={styles.verifyRow}>
            <View style={styles.verifyLeft}>
              <Ionicons name="checkmark-circle" size={16} color={GREEN} />
              <Text style={styles.verifyText}>INOX Verified</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFav((p) => !p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={22}
                color={isFav ? "#E11D48" : "#D1D5DB"}
              />
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text style={styles.title}>{listing.itemName}</Text>

          {/* Feature pills (only for detailed-spec variant matches Figma 2) */}
          {useDetailedList && features.length > 0 && (
            <View style={styles.pillRow}>
              {features.map((f) => (
                <View key={f} style={styles.featurePill}>
                  <Text style={styles.featurePillText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Description */}
          {listing.description ? (
            <Text style={styles.description}>{listing.description}</Text>
          ) : null}

          {/* Price */}
          <View style={styles.priceRow}>
            {isFree ? (
              <Text style={styles.priceMain}>Free</Text>
            ) : (
              <>
                {listing.originalPrice > listing.askingPrice ? (
                  <Text style={styles.priceStrike}>
                    ₹{listing.originalPrice?.toLocaleString()}
                  </Text>
                ) : null}
                <Text style={styles.priceMain}>
                  ₹{listing.askingPrice?.toLocaleString()}/-
                </Text>
              </>
            )}
          </View>
          {listing.quantity ? (
            <Text style={styles.qtyText}>
              {Number(listing.quantity) <= 1 ? "Only 1 left" : `${listing.quantity} in stock`}
            </Text>
          ) : null}

          {/* Feature pills (simple variant — Figma 1 places them above price area) */}
          {!useDetailedList && features.length > 0 && (
            <View style={[styles.pillRow, { marginTop: 8 }]}>
              {features.map((f) => (
                <View key={f} style={styles.featurePill}>
                  <Text style={styles.featurePillText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Seller card */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              {listing.sellerAvatar ? (
                <SafeImage
                  uri={listing.sellerAvatar}
                  style={styles.sellerAvatarImg}
                  fallback={require("../../../assets/ProfilePlaceholder.png")}
                />
              ) : (
                <Ionicons name="person" size={22} color="#9CA3AF" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>
                {listing.sellerName || "Seller"}
              </Text>
              <Text style={styles.sellerLevel}>
                {listing.sellerLevel
                  ? listing.sellerLevel.charAt(0).toUpperCase() +
                    listing.sellerLevel.slice(1) +
                    " Player"
                  : "Player"}
                {listing.sport ? ` (${listing.sport})` : ""}
              </Text>
            </View>
          </View>

          {/* Specs — detailed list OR two boxes */}
          {useDetailedList ? (
            <View style={styles.detailsBlock}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              {Object.entries(specs).map(([k, v]) => (
                <View key={k} style={styles.detailRow}>
                  <Text style={styles.detailKey}>{k}:</Text>
                  <Text style={styles.detailVal}>{v}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.boxRow}>
              {specs.Brand ? (
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>Brand</Text>
                  <Text style={styles.specBoxValue}>{specs.Brand}</Text>
                </View>
              ) : null}
              {specs.Size ? (
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>Size</Text>
                  <Text style={styles.specBoxValue}>{specs.Size}</Text>
                </View>
              ) : null}
              {listing.sellUnit === "pack" ? (
                <View style={styles.specBox}>
                  <Text style={styles.specBoxLabel}>Sold as</Text>
                  <Text style={styles.specBoxValue}>
                    Box of {listing.packSize || 1}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Delivery */}
          <View style={styles.deliveryRow}>
            <Ionicons name="car-outline" size={20} color={GREEN} />
            <View>
              <Text style={styles.deliveryTitle}>Delivered by INOX</Text>
              <Text style={styles.deliverySub}>3-5 days delivery</Text>
            </View>
          </View>

          {/* Vendor link (Buy New) */}
          {listing.vendorLink ? (
            <TouchableOpacity
              style={styles.vendorBtn}
              onPress={async () => {
                try {
                  await axios.post(
                    `${DONATIONS.LISTINGS}/../vendor-click/${listing._id}`
                  );
                } catch {}
                Linking.openURL(listing.vendorLink);
              }}
            >
              <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
              <Text style={styles.vendorBtnText}>
                Buy New{listing.vendorName ? ` from ${listing.vendorName}` : ""}
              </Text>
              {listing.vendorPrice > 0 ? (
                <Text style={styles.vendorPrice}>
                  ₹{listing.vendorPrice.toLocaleString()}
                </Text>
              ) : null}
              <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          ) : null}

          {/* Claim/Buy form (inline) */}
          {canBuy && showClaimForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {listing.isDonation ? "Claim Equipment" : "Purchase Equipment"}
              </Text>

              <Text style={styles.inputLabel}>Your Contact Number</Text>
              <TextInput
                style={styles.input}
                value={buyerContact}
                onChangeText={setBuyerContact}
                placeholder="Enter your mobile number"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />

              {!listing.isDonation && (
                <>
                  <Text style={styles.inputLabel}>Payment Method</Text>
                  <View style={styles.payMethodRow}>
                    {["upi", "qr", "offline"].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.payMethod,
                          paymentMethod === m && styles.payMethodActive,
                        ]}
                        onPress={() => setPaymentMethod(m)}
                      >
                        <Text
                          style={[
                            styles.payMethodText,
                            paymentMethod === m && { color: "#FFFFFF" },
                          ]}
                        >
                          {m.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowClaimForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, claiming && { opacity: 0.6 }]}
                  onPress={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Payment upload (buyer side) */}
          {listing.status === "Reserved" &&
            isBuyer &&
            !listing.isDonation &&
            listing.paymentStatus === "Pending" && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Payment Details</Text>
                {!showPayForm ? (
                  <TouchableOpacity
                    style={styles.uploadPayBtn}
                    onPress={() => setShowPayForm(true)}
                  >
                    <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmBtnText}>
                      Upload Payment Proof
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>
                      Transaction ID / Reference
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={transactionId}
                      onChangeText={setTransactionId}
                      placeholder="Enter UPI transaction ID"
                      placeholderTextColor="#9CA3AF"
                    />
                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setShowPayForm(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.confirmBtn,
                          uploading && { opacity: 0.6 },
                        ]}
                        onPress={handlePayUpload}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.confirmBtnText}>Submit</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

          {/* Seller verify */}
          {listing.status === "Reserved" && isSeller && (
            <View style={styles.verifyCard}>
              <Ionicons name="hourglass" size={22} color="#D97706" />
              <Text style={styles.verifyTitle}>
                {listing.isDonation ? "Claim Request" : "Payment Verification"}
              </Text>
              <Text style={styles.verifySubtitle}>
                Claimed by: {listing.claimedByName || "A player"}
              </Text>
              {listing.transactionId ? (
                <Text style={styles.txnId}>
                  Txn ID: {listing.transactionId}
                </Text>
              ) : null}
              <View style={styles.verifyActions}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() =>
                    Alert.alert("Reject", "Reject this claim?", [
                      { text: "Cancel" },
                      {
                        text: "Reject",
                        style: "destructive",
                        onPress: () => handleVerify("reject"),
                      },
                    ])
                  }
                >
                  <Ionicons name="close" size={16} color="#DC2626" />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleVerify("approve")}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sold banner */}
          {listing.status === "Sold" && (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-circle" size={20} color={GREEN} />
              <Text style={styles.soldText}>This item has been sold</Text>
            </View>
          )}
        </ScrollView>

        {/* Sticky Buy Now */}
        {canBuy && !showClaimForm && (
          <View
            style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}
          >
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={() => setShowClaimForm(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.buyBtnText}>{buyButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  backdropTouch: { height: height * 0.12 },
  closeWrap: { position: "absolute", right: 16 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#FFFFFF" },

  sheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Image
  imageWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F4F4F5",
    position: "relative",
  },
  heroImage: { width: "100%", height: 240 },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  ratingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
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
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  dotActive: { backgroundColor: "#FFFFFF", width: 16, borderRadius: 4 },

  // Verify + Fav
  verifyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  verifyLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifyText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN,
  },

  // Title
  title: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 6,
  },

  description: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 8,
    lineHeight: 18,
  },

  // Price
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 10,
  },
  priceStrike: {
    fontSize: 13,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontFamily: "Poppins_400Regular",
  },
  priceMain: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  qtyText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Feature pills
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  featurePill: {
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featurePillText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN_DARK,
  },

  // Seller
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  sellerAvatarImg: { width: 44, height: 44, borderRadius: 22 },
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

  // Simple spec boxes
  boxRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  specBox: {
    flex: 1,
    backgroundColor: "#F4F4F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  specBoxLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  specBoxValue: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
  },

  // Detailed list
  detailsBlock: { marginTop: 18 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  detailKey: {
    flex: 0.45,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  detailVal: {
    flex: 0.55,
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_DARK,
  },

  // Delivery
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  deliveryTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  deliverySub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Vendor btn
  vendorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F97316",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  vendorBtnText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    fontSize: 14,
  },
  vendorPrice: {
    color: "#FED7AA",
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },

  // Form
  formCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 18,
  },
  formTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    borderWidth: 1,
    borderColor: BORDER,
  },
  payMethodRow: { flexDirection: "row", gap: 8 },
  payMethod: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  payMethodActive: { backgroundColor: GREEN },
  payMethodText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_MUTED,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: "center",
  },
  confirmBtnText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  uploadPayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 10,
  },

  // Verify card (seller)
  verifyCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
  },
  verifyTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: "#92400E",
  },
  verifySubtitle: { fontSize: 12, color: "#92400E" },
  txnId: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#D97706",
    marginTop: 4,
  },
  verifyActions: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#DC2626",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: GREEN,
  },
  approveText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Sold
  soldBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F7F0",
    padding: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  soldText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN,
  },

  // Bottom sticky bar
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
  buyBtn: {
    backgroundColor: GREEN,
    borderRadius: 28,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default DonationDetailScreen;
