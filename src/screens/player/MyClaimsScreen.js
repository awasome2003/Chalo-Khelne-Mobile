import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DONATIONS from "../../api/donations";

const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash"];

const STATUS_COLORS = {
  Active: { bg: "#ECFDF5", text: "#059669" },
  Reserved: { bg: "#FFFBEB", text: "#D97706" },
  Sold: { bg: "#EFF6FF", text: "#2563EB" },
};

const PAYMENT_COLORS = {
  Pending: { bg: "#FFFBEB", text: "#D97706" },
  Uploaded: { bg: "#EFF6FF", text: "#2563EB" },
  Verified: { bg: "#ECFDF5", text: "#059669" },
  Rejected: { bg: "#FEF2F2", text: "#DC2626" },
};

const MyClaimsScreen = () => {
  const navigation = useNavigation();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ method: "", transactionId: "" });

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(DONATIONS.ENDPOINTS.MY_CLAIMS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClaims(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch claims:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClaims();
  }, []);

  const handleUploadPayment = async (itemId) => {
    if (!paymentForm.method) {
      Alert.alert("Required", "Please select a payment method.");
      return;
    }
    if (!paymentForm.transactionId.trim()) {
      Alert.alert("Required", "Please enter the transaction ID.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("auth_token");
      await axios.post(
        DONATIONS.ENDPOINTS.PAY(itemId),
        {
          paymentMethod: paymentForm.method,
          transactionId: paymentForm.transactionId.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Submitted", "Payment details submitted. Waiting for seller verification.");
      setPayingId(null);
      setPaymentForm({ method: "", transactionId: "" });
      fetchClaims();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to submit payment.");
    }
  };

  const renderItem = ({ item }) => {
    const paymentStyle = PAYMENT_COLORS[item.paymentStatus] || PAYMENT_COLORS.Pending;
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.Reserved;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("DonationDetail", { listingId: item._id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          {/* Image */}
          <View style={styles.cardImageWrap}>
            {item.images && item.images.length > 0 ? (
              <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Ionicons name="basketball-outline" size={28} color="#D1D5DB" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.sportTag}>{item.sport}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status}</Text>
              </View>
              {!item.isDonation && item.paymentStatus && (
                <View style={[styles.badge, { backgroundColor: paymentStyle.bg }]}>
                  <Text style={[styles.badgeText, { color: paymentStyle.text }]}>
                    Payment: {item.paymentStatus}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.priceText}>
              {item.isDonation ? "Free Donation" : `₹${item.askingPrice?.toLocaleString()}`}
            </Text>

            {/* Seller info */}
            <View style={styles.sellerRow}>
              <Ionicons name="person-circle" size={14} color="#9CA3AF" />
              <Text style={styles.sellerName}>From: {item.sellerName}</Text>
            </View>
          </View>
        </View>

        {/* Sold banner */}
        {item.status === "Sold" && (
          <View style={styles.soldBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
            <Text style={styles.soldText}>
              {item.isDonation ? "Received! Enjoy your legacy gear." : "Purchase complete!"}
            </Text>
          </View>
        )}

        {/* Payment upload section */}
        {item.status === "Reserved" && !item.isDonation && item.paymentStatus === "Pending" && (
          <View style={styles.paySection}>
            {payingId === item._id ? (
              <View>
                <Text style={styles.payLabel}>Select Payment Method</Text>
                <View style={styles.methodRow}>
                  {PAYMENT_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodChip, paymentForm.method === m && styles.methodChipActive]}
                      onPress={() => setPaymentForm((p) => ({ ...p, method: m }))}
                    >
                      <Text style={[styles.methodText, paymentForm.method === m && styles.methodTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.input}
                  value={paymentForm.transactionId}
                  onChangeText={(v) => setPaymentForm((p) => ({ ...p, transactionId: v }))}
                  placeholder="Transaction ID / Reference"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={styles.payActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setPayingId(null); setPaymentForm({ method: "", transactionId: "" }); }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitPayBtn}
                    onPress={() => handleUploadPayment(item._id)}
                  >
                    <Text style={styles.submitPayText}>Submit Payment</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => setPayingId(item._id)}
              >
                <Ionicons name="card" size={16} color="#fff" />
                <Text style={styles.payBtnText}>Upload Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Waiting for verification */}
        {item.status === "Reserved" && !item.isDonation && item.paymentStatus === "Uploaded" && (
          <View style={styles.waitingBanner}>
            <Ionicons name="time" size={14} color="#2563EB" />
            <Text style={styles.waitingText}>Payment submitted. Waiting for seller verification...</Text>
          </View>
        )}

        {/* Payment rejected */}
        {item.paymentStatus === "Rejected" && (
          <View style={styles.rejectedBanner}>
            <Ionicons name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.rejectedText}>Payment was rejected. Please contact the seller.</Text>
          </View>
        )}

        {/* Free donation waiting */}
        {item.status === "Reserved" && item.isDonation && (
          <View style={styles.waitingBanner}>
            <Ionicons name="gift" size={14} color="#059669" />
            <Text style={[styles.waitingText, { color: "#059669" }]}>
              Claimed! Waiting for seller to confirm handover.
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Claims</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0079EE" />
        </View>
      ) : claims.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={56} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No claims yet</Text>
          <Text style={styles.emptySubtitle}>Browse equipment and claim items you want!</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate("DonationList")}
          >
            <Text style={styles.emptyBtnText}>Browse Equipment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0079EE"]} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  cardRow: { flexDirection: "row", gap: 12 },
  cardImageWrap: { width: 80, height: 80, borderRadius: 12, overflow: "hidden" },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%", height: "100%", backgroundColor: "#F9FAFB",
    justifyContent: "center", alignItems: "center",
  },
  cardInfo: { flex: 1 },
  sportTag: {
    fontSize: 9, fontWeight: "800", color: "#0079EE", letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 2,
  },
  itemName: { fontSize: 15, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: "700" },
  priceText: { fontSize: 14, fontWeight: "700", color: "#059669", marginTop: 4 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  sellerName: { fontSize: 11, fontWeight: "600", color: "#6B7280" },
  soldBanner: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10,
    backgroundColor: "#EFF6FF", padding: 10, borderRadius: 10,
  },
  soldText: { fontSize: 12, fontWeight: "600", color: "#2563EB", flex: 1 },
  paySection: {
    marginTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10,
  },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#0079EE", paddingVertical: 10, borderRadius: 10,
  },
  payBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  payLabel: { fontSize: 11, fontWeight: "700", color: "#6B7280", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  methodRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  methodChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  methodChipActive: { backgroundColor: "#111", borderColor: "#111" },
  methodText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  methodTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#F9FAFB", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontWeight: "600", color: "#111", borderWidth: 1, borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  payActions: { flexDirection: "row", gap: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  submitPayBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
    backgroundColor: "#0079EE",
  },
  submitPayText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  waitingBanner: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10,
    backgroundColor: "#EFF6FF", padding: 10, borderRadius: 10,
  },
  waitingText: { fontSize: 11, fontWeight: "600", color: "#2563EB", flex: 1 },
  rejectedBanner: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10,
    backgroundColor: "#FEF2F2", padding: 10, borderRadius: 10,
  },
  rejectedText: { fontSize: 11, fontWeight: "600", color: "#DC2626", flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#6B7280", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  emptyBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: "#0079EE", borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default MyClaimsScreen;
