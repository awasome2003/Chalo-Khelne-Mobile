import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import DONATIONS from "../../api/donations";
import API from "../../api/api";

const { width } = Dimensions.get("window");

const SPORTS = [
  "All", "Badminton", "Table Tennis", "Tennis", "Cricket", "Football",
  "Basketball", "Volleyball", "Chess", "Pickleball",
];

const CONDITION_COLORS = {
  "Like New": { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" },
  Good: { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" },
  Fair: { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" },
  Used: { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA" },
};

const DonationListScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSport, setActiveSport] = useState("All");
  const [search, setSearch] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchListings = async (pageNum = 1, reset = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit: 12 });
      if (activeSport !== "All") params.append("sport", activeSport);
      if (search.trim()) params.append("search", search.trim());
      if (freeOnly) params.append("freeOnly", "true");

      const res = await axios.get(`${DONATIONS.ENDPOINTS.LISTINGS}?${params}`);
      const data = res.data.data || [];
      const pagination = res.data.pagination || {};

      if (reset || pageNum === 1) {
        setListings(data);
      } else {
        setListings((prev) => [...prev, ...data]);
      }
      setHasMore(pageNum < (pagination.pages || 1));
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings(1, true);
  }, [activeSport, freeOnly]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchListings(1, true);
  }, [activeSport, freeOnly]);

  const handleSearch = () => {
    fetchListings(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchListings(page + 1);
    }
  };

  const renderItem = ({ item }) => {
    const conditionStyle = CONDITION_COLORS[item.condition] || CONDITION_COLORS.Used;
    const discount = item.originalPrice > 0
      ? Math.round(((item.originalPrice - item.askingPrice) / item.originalPrice) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("DonationDetail", { listingId: item._id })}
        activeOpacity={0.8}
      >
        {/* Image */}
        <View style={styles.cardImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons name="basketball-outline" size={40} color="#D1D5DB" />
            </View>
          )}

          {/* Free badge */}
          {item.isDonation && (
            <View style={styles.freeBadge}>
              <Ionicons name="gift" size={10} color="#fff" />
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}

          {/* Condition badge */}
          <View style={[styles.conditionBadge, { backgroundColor: conditionStyle.bg, borderColor: conditionStyle.border }]}>
            <Text style={[styles.conditionText, { color: conditionStyle.text }]}>{item.condition}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.sportTag}>{item.sport}</Text>
          <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            {item.isDonation ? (
              <Text style={styles.freeText}>Free Legacy Donation</Text>
            ) : (
              <>
                <Text style={styles.askingPrice}>₹{item.askingPrice.toLocaleString()}</Text>
                {item.originalPrice > item.askingPrice && (
                  <Text style={styles.originalPrice}>₹{item.originalPrice.toLocaleString()}</Text>
                )}
                {discount > 0 && (
                  <Text style={styles.discount}>{discount}% off</Text>
                )}
              </>
            )}
          </View>

          {/* Seller */}
          <View style={styles.sellerRow}>
            <Ionicons name="person-circle" size={16} color="#9CA3AF" />
            <Text style={styles.sellerName} numberOfLines={1}>{item.sellerName}</Text>
            {item.sellerLevel && item.sellerLevel !== "club" && item.sellerLevel !== "beginner" && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{item.sellerLevel}</Text>
              </View>
            )}
          </View>

          {/* Vendor "Buy New" indicator */}
          {item.vendorLink && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4, backgroundColor: "#FFF7ED", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 }}>
              <Ionicons name="cart" size={10} color="#F97316" />
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#F97316" }}>
                Buy New{item.vendorName ? ` — ${item.vendorName}` : ""}
              </Text>
            </View>
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
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Equipment Exchange</Text>
            <Text style={styles.headerSubtitle}>Legacy gear from top players</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("CreateListing")}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search equipment..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(""); fetchListings(1, true); }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.freeToggle, freeOnly && styles.freeToggleActive]}
          onPress={() => setFreeOnly(!freeOnly)}
        >
          <Ionicons name="gift" size={16} color={freeOnly ? "#fff" : "#059669"} />
          <Text style={[styles.freeToggleText, freeOnly && { color: "#fff" }]}>Free</Text>
        </TouchableOpacity>
      </View>

      {/* Sport Tabs */}
      <FlatList
        horizontal
        data={SPORTS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sportTabs}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.sportTab, activeSport === item && styles.sportTabActive]}
            onPress={() => setActiveSport(item)}
          >
            <Text style={[styles.sportTabText, activeSport === item && styles.sportTabTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0079EE" />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="basketball-outline" size={64} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>No equipment found</Text>
          <Text style={styles.emptySubtitle}>Be the first to list your gear!</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate("CreateListing")}
          >
            <Text style={styles.emptyBtnText}>List Equipment</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0079EE"]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: 16 }} color="#0079EE" /> : null}
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", marginTop: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: "#0079EE",
    justifyContent: "center", alignItems: "center",
  },
  searchRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
    gap: 8, backgroundColor: "#fff",
  },
  searchBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111", fontWeight: "600" },
  freeToggle: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#ECFDF5",
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  freeToggleActive: { backgroundColor: "#059669", borderColor: "#059669" },
  freeToggleText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  sportTabs: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, backgroundColor: "#fff" },
  sportTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#F3F4F6", marginRight: 6,
  },
  sportTabActive: { backgroundColor: "#111" },
  sportTabText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  sportTabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },
  row: { justifyContent: "space-between", marginBottom: 12 },
  card: {
    width: (width - 36) / 2, backgroundColor: "#fff", borderRadius: 16,
    overflow: "hidden", borderWidth: 1, borderColor: "#F3F4F6",
  },
  cardImageContainer: { width: "100%", height: 140, position: "relative" },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%", height: "100%", backgroundColor: "#F9FAFB",
    justifyContent: "center", alignItems: "center",
  },
  freeBadge: {
    position: "absolute", top: 8, left: 8, flexDirection: "row", alignItems: "center",
    gap: 3, backgroundColor: "#059669", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  freeBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  conditionBadge: {
    position: "absolute", top: 8, right: 8,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  conditionText: { fontSize: 9, fontWeight: "700" },
  cardContent: { padding: 10 },
  sportTag: {
    fontSize: 9, fontWeight: "800", color: "#0079EE", letterSpacing: 1,
    textTransform: "uppercase", marginBottom: 3,
  },
  itemName: { fontSize: 14, fontWeight: "800", color: "#111", letterSpacing: -0.3 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  askingPrice: { fontSize: 16, fontWeight: "800", color: "#111" },
  originalPrice: { fontSize: 12, color: "#9CA3AF", textDecorationLine: "line-through" },
  discount: { fontSize: 10, fontWeight: "700", color: "#059669" },
  freeText: { fontSize: 13, fontWeight: "700", color: "#059669" },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  sellerName: { fontSize: 11, fontWeight: "600", color: "#6B7280", flex: 1 },
  levelBadge: {
    backgroundColor: "#FEF3C7", paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4, borderWidth: 1, borderColor: "#FDE68A",
  },
  levelText: { fontSize: 8, fontWeight: "800", color: "#D97706", textTransform: "uppercase" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#6B7280", marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },
  emptyBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: "#0079EE", borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default DonationListScreen;
