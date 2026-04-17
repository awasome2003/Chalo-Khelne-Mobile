import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Image,
  ActivityIndicator, RefreshControl, Platform, TextInput, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";

const TABS = [
  { key: "browse", label: "Browse", icon: "search" },
  { key: "listings", label: "My Listings", icon: "pricetag" },
  { key: "claims", label: "My Claims", icon: "bag-handle" },
];

const BASE = `${API.BASE_URL}/donations`;

export default function EquipmentHubScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?._id || user?.id;

  const [activeTab, setActiveTab] = useState("browse");
  const [browseItems, setBrowseItems] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [browseRes, listingsRes, claimsRes] = await Promise.allSettled([
        axios.get(`${BASE}/listings`),
        axios.get(`${BASE}/my-listings`, { headers }),
        axios.get(`${BASE}/my-claims`, { headers }),
      ]);

      if (browseRes.status === "fulfilled") setBrowseItems(browseRes.value.data?.data || []);
      if (listingsRes.status === "fulfilled") setMyListings(listingsRes.value.data?.data || []);
      if (claimsRes.status === "fulfilled") setMyClaims(claimsRes.value.data?.data || []);
    } catch (err) {
      console.error("Error fetching equipment data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const getItems = () => {
    let items = [];
    if (activeTab === "browse") items = browseItems;
    else if (activeTab === "listings") items = myListings;
    else items = myClaims;

    if (search.trim() && activeTab === "browse") {
      items = items.filter((i) =>
        (i.itemName || i.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.sport || "").toLowerCase().includes(search.toLowerCase())
      );
    }
    return items;
  };

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active" || s === "available") return { bg: "#ECFDF5", text: "#059669" };
    if (s === "sold" || s === "completed") return { bg: "#FEF2F2", text: "#DC2626" };
    if (s === "reserved" || s === "pending") return { bg: "#FFF7ED", text: "#EA580C" };
    return { bg: "#F3F4F6", text: "#6B7280" };
  };

  const renderItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const isFree = item.isDonation || item.askingPrice === 0;
    const imageUrl = item.images?.[0]
      ? (item.images[0].startsWith("http") ? item.images[0] : `${API.SERVER_URL}/${item.images[0]}`)
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("DonationDetail", { listingId: item._id })}
      >
        {/* Image */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="basketball-outline" size={28} color="#D1D5DB" />
          </View>
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardName} numberOfLines={1}>{item.itemName || item.name || "Equipment"}</Text>

          <View style={styles.cardMeta}>
            {item.sport && (
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>{item.sport}</Text>
              </View>
            )}
            {item.condition && (
              <Text style={styles.conditionText}>{item.condition}</Text>
            )}
          </View>

          <View style={styles.cardFooter}>
            {isFree ? (
              <Text style={styles.freeTag}>FREE</Text>
            ) : (
              <Text style={styles.priceText}>₹{item.askingPrice || item.price || 0}</Text>
            )}
            <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.statusText, { color: statusColor.text }]}>
                {(item.status || "Active").charAt(0).toUpperCase() + (item.status || "active").slice(1)}
              </Text>
            </View>
          </View>

          {/* Seller info for browse */}
          {activeTab === "browse" && item.sellerName && (
            <Text style={styles.sellerText}>by {item.sellerName} · {item.sellerLevel}</Text>
          )}

          {/* Claim info */}
          {activeTab === "claims" && item.paymentStatus && (
            <Text style={styles.sellerText}>Payment: {item.paymentStatus}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const items = getItems();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Equipment Exchange</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("CreateListing")}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? "#004E93" : "#9CA3AF"}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.key === "listings" && myListings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{myListings.length}</Text>
              </View>
            )}
            {tab.key === "claims" && myClaims.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{myClaims.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (browse only) */}
      {activeTab === "browse" && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search equipment..."
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#004E93" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={activeTab === "browse" ? "search" : activeTab === "listings" ? "pricetag-outline" : "bag-outline"}
            size={48} color="#D1D5DB"
          />
          <Text style={styles.emptyTitle}>
            {activeTab === "browse" ? "No equipment available" : activeTab === "listings" ? "No listings yet" : "No claims yet"}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === "browse"
              ? "Check back later for new items"
              : activeTab === "listings"
              ? "List your equipment for sale or donation"
              : "Claim items from the marketplace"}
          </Text>
          {activeTab === "listings" && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate("CreateListing")}>
              <Ionicons name="add-circle" size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>List Equipment</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={["#004E93"]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  addBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FF6A00", justifyContent: "center", alignItems: "center" },
  tabBar: {
    flexDirection: "row", backgroundColor: "#FFF", paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 12,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#004E93" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#9CA3AF" },
  tabTextActive: { color: "#004E93", fontWeight: "700" },
  tabBadge: { backgroundColor: "#004E93", borderRadius: 8, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  tabBadgeText: { color: "#FFF", fontSize: 9, fontWeight: "800" },
  searchBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB", gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#6B7280", marginTop: 12 },
  emptyDesc: { fontSize: 12, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16,
    backgroundColor: "#004E93", paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
  },
  emptyBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  card: {
    flexDirection: "row", backgroundColor: "#FFF", borderRadius: 16,
    marginTop: 10, overflow: "hidden", borderWidth: 1, borderColor: "#F3F4F6",
  },
  cardImage: { width: 100, height: 100 },
  cardImagePlaceholder: {
    width: 100, height: 100, backgroundColor: "#F9FAFB",
    justifyContent: "center", alignItems: "center",
  },
  cardContent: { flex: 1, padding: 12, justifyContent: "center" },
  cardName: { fontSize: 14, fontWeight: "700", color: "#1F2937", marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  sportBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sportBadgeText: { fontSize: 10, fontWeight: "700", color: "#004E93" },
  conditionText: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  freeTag: { fontSize: 13, fontWeight: "800", color: "#059669" },
  priceText: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  sellerText: { fontSize: 10, color: "#9CA3AF", marginTop: 3 },
});
