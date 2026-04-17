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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DONATIONS from "../../api/donations";

const STATUS_TABS = ["All", "Active", "Reserved", "Sold", "Withdrawn"];

const STATUS_COLORS = {
  Active: { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  Reserved: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  Sold: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  Withdrawn: { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
};

const MyListingsScreen = () => {
  const navigation = useNavigation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(DONATIONS.ENDPOINTS.MY_LISTINGS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setListings(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch my listings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings();
  }, []);

  const handleWithdraw = (id, itemName) => {
    Alert.alert(
      "Withdraw Listing",
      `Are you sure you want to withdraw "${itemName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("auth_token");
              await axios.delete(DONATIONS.ENDPOINTS.WITHDRAW(id), {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert("Done", "Listing withdrawn successfully.");
              fetchListings();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to withdraw.");
            }
          },
        },
      ]
    );
  };

  const handleVerify = async (claimId, action) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      await axios.post(
        DONATIONS.ENDPOINTS.VERIFY(claimId),
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Done", action === "approve" ? "Payment approved! Item marked as sold." : "Payment rejected. Listing is active again.");
      fetchListings();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Verification failed.");
    }
  };

  const filtered = activeTab === "All" ? listings : listings.filter((l) => l.status === activeTab);

  const renderItem = ({ item }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.Withdrawn;

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
            <View style={styles.cardTopRow}>
              <Text style={styles.sportTag}>{item.sport}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
            <Text style={styles.priceText}>
              {item.isDonation ? "Free Donation" : `₹${item.askingPrice?.toLocaleString()}`}
            </Text>

            {/* Claimed by info */}
            {item.status === "Reserved" && item.claimedBy && (
              <View style={styles.claimInfo}>
                <Ionicons name="person" size={12} color="#D97706" />
                <Text style={styles.claimText}>
                  Claimed by {item.claimedBy.name || "a player"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.cardActions}>
          {item.status === "Active" && (
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => handleWithdraw(item._id, item.itemName)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.withdrawText}>Withdraw</Text>
            </TouchableOpacity>
          )}

          {item.status === "Reserved" && item.paymentStatus === "Uploaded" && (
            <View style={styles.verifyRow}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleVerify(item._id, "approve")}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleVerify(item._id, "reject")}
              >
                <Ionicons name="close-circle" size={16} color="#DC2626" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.status === "Reserved" && item.paymentStatus === "Pending" && !item.isDonation && (
            <Text style={styles.waitingText}>Waiting for buyer's payment...</Text>
          )}

          {item.status === "Reserved" && item.isDonation && (
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => handleVerify(item._id, "approve")}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.approveBtnText}>Confirm Handover</Text>
            </TouchableOpacity>
          )}
        </View>
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
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity onPress={() => navigation.navigate("CreateListing")} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tab, activeTab === item && styles.tabActive]}
            onPress={() => setActiveTab(item)}
          >
            <Text style={[styles.tabText, activeTab === item && styles.tabTextActive]}>{item}</Text>
            {item !== "All" && (
              <Text style={[styles.tabCount, activeTab === item && styles.tabCountActive]}>
                {listings.filter((l) => l.status === item).length}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0079EE" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="pricetag-outline" size={56} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === "All" ? "List your equipment and share your legacy!" : `No ${activeTab.toLowerCase()} listings`}
          </Text>
          {activeTab === "All" && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("CreateListing")}>
              <Text style={styles.emptyBtnText}>List Equipment</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
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
  addBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: "#0079EE",
    justifyContent: "center", alignItems: "center",
  },
  tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, backgroundColor: "#fff" },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#F3F4F6", marginRight: 6,
  },
  tabActive: { backgroundColor: "#111" },
  tabText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  tabTextActive: { color: "#fff" },
  tabCount: { fontSize: 10, fontWeight: "800", color: "#9CA3AF" },
  tabCountActive: { color: "#fff" },
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
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sportTag: {
    fontSize: 9, fontWeight: "800", color: "#0079EE", letterSpacing: 1,
    textTransform: "uppercase",
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: "700" },
  itemName: { fontSize: 15, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  priceText: { fontSize: 14, fontWeight: "700", color: "#059669", marginTop: 4 },
  claimInfo: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  claimText: { fontSize: 11, fontWeight: "600", color: "#D97706" },
  cardActions: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  withdrawBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 8, borderRadius: 10, backgroundColor: "#FEF2F2",
    borderWidth: 1, borderColor: "#FECACA",
  },
  withdrawText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  verifyRow: { flexDirection: "row", gap: 8 },
  approveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 10, borderRadius: 10, backgroundColor: "#059669",
  },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  rejectBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 10, borderRadius: 10, backgroundColor: "#FEF2F2",
    borderWidth: 1, borderColor: "#FECACA",
  },
  rejectBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  waitingText: { fontSize: 12, fontWeight: "600", color: "#D97706", textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#6B7280", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  emptyBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: "#0079EE", borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default MyListingsScreen;
