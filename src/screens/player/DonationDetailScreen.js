import React, { useState, useEffect } from "react";
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
  StatusBar,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DONATIONS from "../../api/donations";

const { width } = Dimensions.get("window");

const CONDITION_COLORS = {
  "Like New": { bg: "#ECFDF5", text: "#059669" },
  Good: { bg: "#EFF6FF", text: "#2563EB" },
  Fair: { bg: "#FFFBEB", text: "#D97706" },
  Used: { bg: "#FEF2F2", text: "#DC2626" },
};

const DonationDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { listingId } = route.params;

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Claim form
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [buyerContact, setBuyerContact] = useState(user?.mobile || "");

  // Payment upload
  const [showPayForm, setShowPayForm] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [uploading, setUploading] = useState(false);

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
      Alert.alert("Error", err.response?.data?.message || "Failed to claim item.");
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
      Alert.alert("Error", err.response?.data?.message || "Failed to upload payment.");
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
      Alert.alert("Error", err.response?.data?.message || "Failed to verify.");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0079EE" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  const isSeller = user?._id === listing.seller?._id || user?._id === listing.seller;
  const isBuyer = user?._id === listing.claimedBy?._id || user?._id === listing.claimedBy;
  const condStyle = CONDITION_COLORS[listing.condition] || CONDITION_COLORS.Used;
  const discount = listing.originalPrice > 0
    ? Math.round(((listing.originalPrice - listing.askingPrice) / listing.originalPrice) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageSection}>
          {listing.images && listing.images.length > 0 ? (
            <Image source={{ uri: listing.images[activeImage] || listing.images[0] }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Ionicons name="basketball-outline" size={80} color="#D1D5DB" />
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: listing.status === "Active" ? "#059669" : listing.status === "Sold" ? "#DC2626" : "#D97706" }]}>
            <Text style={styles.statusText}>{listing.status}</Text>
          </View>

          {/* Image thumbnails */}
          {listing.images && listing.images.length > 1 && (
            <View style={styles.thumbnailRow}>
              {listing.images.map((img, idx) => (
                <TouchableOpacity key={idx} onPress={() => setActiveImage(idx)}>
                  <Image
                    source={{ uri: img }}
                    style={[styles.thumbnail, activeImage === idx && styles.thumbnailActive]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Badges row */}
          <View style={styles.badgeRow}>
            <View style={styles.sportBadge}>
              <Text style={styles.sportBadgeText}>{listing.sport}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{listing.category}</Text>
            </View>
            <View style={[styles.condBadge, { backgroundColor: condStyle.bg }]}>
              <Text style={[styles.condText, { color: condStyle.text }]}>{listing.condition}</Text>
            </View>
          </View>

          {/* Item name */}
          <Text style={styles.itemName}>{listing.itemName}</Text>

          {/* Price section */}
          <View style={styles.priceSection}>
            {listing.isDonation ? (
              <View style={styles.freeBox}>
                <Ionicons name="gift" size={20} color="#059669" />
                <Text style={styles.freeLabel}>Free Legacy Donation</Text>
              </View>
            ) : (
              <View style={styles.priceBox}>
                <Text style={styles.bigPrice}>₹{listing.askingPrice?.toLocaleString()}</Text>
                {listing.originalPrice > listing.askingPrice && (
                  <View style={styles.priceDetails}>
                    <Text style={styles.origPrice}>₹{listing.originalPrice?.toLocaleString()}</Text>
                    {discount > 0 && <Text style={styles.discountBadge}>{discount}% off</Text>}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Buy New from Vendor — shown only if vendorLink exists */}
          {listing.vendorLink && (
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F97316",
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 12,
                marginBottom: 16,
                gap: 8,
              }}
              onPress={async () => {
                // Track click
                try {
                  await axios.post(`${DONATIONS.LISTINGS}/../vendor-click/${listing._id}`);
                } catch {}
                Linking.openURL(listing.vendorLink);
              }}
            >
              <Ionicons name="cart-outline" size={20} color="#FFF" />
              <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 15 }}>
                Buy New{listing.vendorName ? ` from ${listing.vendorName}` : ""}
              </Text>
              {listing.vendorPrice > 0 && (
                <Text style={{ color: "#FED7AA", fontWeight: "600", fontSize: 13, marginLeft: 4 }}>
                  ₹{listing.vendorPrice.toLocaleString()}
                </Text>
              )}
              <Ionicons name="open-outline" size={16} color="#FED7AA" />
            </TouchableOpacity>
          )}

          {/* Seller info */}
          <View style={styles.sellerCard}>
            <View style={styles.sellerLeft}>
              <View style={styles.sellerAvatar}>
                <Ionicons name="person" size={24} color="#6B7280" />
              </View>
              <View>
                <Text style={styles.sellerLabel}>Seller</Text>
                <Text style={styles.sellerNameText}>{listing.sellerName}</Text>
              </View>
            </View>
            {listing.sellerLevel && listing.sellerLevel !== "club" && listing.sellerLevel !== "beginner" && (
              <View style={styles.levelChip}>
                <Ionicons name="medal" size={12} color="#D97706" />
                <Text style={styles.levelChipText}>{listing.sellerLevel}</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          {/* Claim/Buy Section */}
          {listing.status === "Active" && !isSeller && (
            <View style={styles.section}>
              {!showClaimForm ? (
                <TouchableOpacity style={styles.claimBtn} onPress={() => setShowClaimForm(true)}>
                  <Ionicons name={listing.isDonation ? "gift" : "cart"} size={20} color="#fff" />
                  <Text style={styles.claimBtnText}>
                    {listing.isDonation ? "Claim This Item" : "Buy This Item"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.claimForm}>
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
                            style={[styles.payMethod, paymentMethod === m && styles.payMethodActive]}
                            onPress={() => setPaymentMethod(m)}
                          >
                            <Text style={[styles.payMethodText, paymentMethod === m && { color: "#fff" }]}>
                              {m.toUpperCase()}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowClaimForm(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmBtn, claiming && { opacity: 0.6 }]}
                      onPress={handleClaim}
                      disabled={claiming}
                    >
                      {claiming ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Confirm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Buyer: Upload payment */}
          {listing.status === "Reserved" && isBuyer && !listing.isDonation && listing.paymentStatus === "Pending" && (
            <View style={styles.section}>
              {!showPayForm ? (
                <TouchableOpacity style={styles.uploadPayBtn} onPress={() => setShowPayForm(true)}>
                  <Ionicons name="cloud-upload" size={20} color="#fff" />
                  <Text style={styles.claimBtnText}>Upload Payment Proof</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.claimForm}>
                  <Text style={styles.formTitle}>Payment Details</Text>
                  <Text style={styles.inputLabel}>Transaction ID / Reference</Text>
                  <TextInput
                    style={styles.input}
                    value={transactionId}
                    onChangeText={setTransactionId}
                    placeholder="Enter UPI transaction ID"
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.formActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayForm(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.confirmBtn, uploading && { opacity: 0.6 }]}
                      onPress={handlePayUpload}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.confirmBtnText}>Submit</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Seller: Verify payment */}
          {listing.status === "Reserved" && isSeller && (
            <View style={styles.section}>
              <View style={styles.verifyCard}>
                <Ionicons name="hourglass" size={24} color="#D97706" />
                <Text style={styles.verifyTitle}>
                  {listing.isDonation ? "Claim Request" : "Payment Verification"}
                </Text>
                <Text style={styles.verifySubtitle}>
                  Claimed by: {listing.claimedByName || "A player"}
                </Text>
                {listing.transactionId && (
                  <Text style={styles.txnId}>Txn ID: {listing.transactionId}</Text>
                )}
                <View style={styles.verifyActions}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => Alert.alert("Reject", "Reject this claim?", [
                      { text: "Cancel" },
                      { text: "Reject", style: "destructive", onPress: () => handleVerify("reject") },
                    ])}
                  >
                    <Ionicons name="close" size={18} color="#DC2626" />
                    <Text style={styles.rejectText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleVerify("approve")}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.approveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Sold banner */}
          {listing.status === "Sold" && (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" />
              <Text style={styles.soldText}>This item has been sold</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "#9CA3AF" },
  imageSection: { position: "relative" },
  mainImage: { width, height: 320 },
  imagePlaceholder: { backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  backBtn: {
    position: "absolute", top: 50, left: 16, width: 40, height: 40,
    borderRadius: 14, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center",
  },
  statusBadge: {
    position: "absolute", top: 50, right: 16,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: "800", color: "#fff", textTransform: "uppercase", letterSpacing: 1 },
  thumbnailRow: {
    position: "absolute", bottom: 12, left: 16, flexDirection: "row", gap: 8,
  },
  thumbnail: { width: 50, height: 50, borderRadius: 10, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  thumbnailActive: { borderColor: "#0079EE", borderWidth: 3 },
  content: { padding: 20 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  sportBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sportBadgeText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },
  categoryBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  condBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  condText: { fontSize: 11, fontWeight: "700" },
  itemName: { fontSize: 24, fontWeight: "800", color: "#111", letterSpacing: -0.5, lineHeight: 30 },
  priceSection: { marginTop: 16 },
  freeBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5", padding: 14, borderRadius: 14 },
  freeLabel: { fontSize: 18, fontWeight: "700", color: "#059669" },
  priceBox: {},
  bigPrice: { fontSize: 28, fontWeight: "800", color: "#111" },
  priceDetails: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  origPrice: { fontSize: 16, color: "#9CA3AF", textDecorationLine: "line-through" },
  discountBadge: { fontSize: 12, fontWeight: "700", color: "#059669", backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sellerCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#F9FAFB", borderRadius: 16, padding: 14, marginTop: 20,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  sellerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center" },
  sellerLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1 },
  sellerNameText: { fontSize: 15, fontWeight: "700", color: "#111", marginTop: 1 },
  levelChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  levelChipText: { fontSize: 11, fontWeight: "700", color: "#D97706", textTransform: "capitalize" },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  description: { fontSize: 15, color: "#4B5563", lineHeight: 22 },
  claimBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0079EE", paddingVertical: 16, borderRadius: 16,
  },
  uploadPayBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#7C3AED", paddingVertical: 16, borderRadius: 16,
  },
  claimBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  claimForm: {
    backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  formTitle: { fontSize: 16, fontWeight: "800", color: "#111", marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: "600", color: "#111", borderWidth: 1, borderColor: "#E5E7EB",
  },
  payMethodRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  payMethod: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
  payMethodActive: { backgroundColor: "#0079EE" },
  payMethodText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  formActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#E5E7EB", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#0079EE", alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  verifyCard: {
    backgroundColor: "#FFFBEB", borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: "#FDE68A", alignItems: "center", gap: 8,
  },
  verifyTitle: { fontSize: 16, fontWeight: "800", color: "#92400E" },
  verifySubtitle: { fontSize: 13, color: "#92400E" },
  txnId: { fontSize: 12, fontWeight: "700", color: "#D97706", marginTop: 4 },
  verifyActions: { flexDirection: "row", gap: 12, marginTop: 16, width: "100%" },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FECACA",
  },
  rejectText: { fontSize: 13, fontWeight: "700", color: "#DC2626" },
  approveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, borderRadius: 12, backgroundColor: "#059669",
  },
  approveText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  soldBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#ECFDF5", padding: 16, borderRadius: 16, marginTop: 24,
  },
  soldText: { fontSize: 15, fontWeight: "700", color: "#059669" },
});

export default DonationDetailScreen;
