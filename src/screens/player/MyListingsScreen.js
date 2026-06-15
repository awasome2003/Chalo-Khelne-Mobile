import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import DONATIONS from "../../api/donations";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

const TABS = ["Active", "Pending", "Sold"];

const tabMatches = (item, tab) => {
  if (tab === "Active") {
    return (
      item.lifecycleStatus === "approved" &&
      (item.status === "Active" || item.status === "Reserved")
    );
  }
  if (tab === "Pending") return item.lifecycleStatus === "pending";
  if (tab === "Sold") return item.status === "Sold";
  return true;
};

const resolveImage = (item) => {
  if (!item?.images?.[0]) return null;
  const first = item.images[0];
  return assetUrl(first);
};

const MyListingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("Active");

  const fetchListings = async () => {
    try {
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

  const handleDelete = (id, itemName) => {
    Alert.alert(
      "Delete listing?",
      `Permanently remove "${itemName}" from your listings.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("auth_token");
              await axios.delete(DONATIONS.ENDPOINTS.WITHDRAW(id), {
                headers: { Authorization: `Bearer ${token}` },
              });
              fetchListings();
            } catch (err) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete."
              );
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item) =>
    navigation.navigate("SellAddProduct", { editingListing: item });

  // ─── Derived stats for Sold tab ────────────────────────────────────
  // "Total Product" is scoped to sold items so it always matches the visible list.
  // "Pending" still shows the cross-tab pending-approval count so the seller has
  // a quick sense of items not yet live.
  const stats = useMemo(() => {
    const soldItems = listings.filter((l) => l.status === "Sold");
    const totalProduct = soldItems.length;
    const pendingCount = listings.filter(
      (l) => l.lifecycleStatus === "pending"
    ).length;
    const totalIncome = soldItems
      .filter((l) => !l.isDonation)
      .reduce((sum, l) => sum + (l.askingPrice || 0), 0);
    return { totalProduct, pendingCount, totalIncome };
  }, [listings]);

  const filtered = useMemo(
    () => listings.filter((l) => tabMatches(l, activeTab)),
    [listings, activeTab]
  );

  // ─── Card renderers ────────────────────────────────────────────────
  const ActiveCard = ({ item }) => {
    const imageUrl = resolveImage(item);
    const pills = [];
    if (item.condition) pills.push(item.condition);
    if (Array.isArray(item.features) && item.features[0]) {
      pills.push(item.features[0]);
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("DonationDetail", { listingId: item._id })
        }
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="basketball-outline" size={26} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.itemName}
          </Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}

          {pills.length > 0 && (
            <View style={styles.pillRow}>
              {pills.map((p, i) => (
                <View key={`${p}-${i}`} style={styles.pill}>
                  <Text style={styles.pillText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.activePriceRow}>
            <Text style={styles.priceMain}>
              {item.isDonation ? "Free" : `₹${item.askingPrice?.toLocaleString()}/-`}
            </Text>
            {item.originalPrice > item.askingPrice ? (
              <Text style={styles.priceStrike}>
                ₹{item.originalPrice?.toLocaleString()}/-
              </Text>
            ) : null}
          </View>

          <View style={styles.viewsRow}>
            <Text style={styles.viewsCount}>{item.views || 0}</Text>
            <Ionicons name="eye-outline" size={14} color={TEXT_MUTED} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const PendingCard = ({ item }) => {
    const imageUrl = resolveImage(item);
    return (
      <View style={styles.card}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.pendingImage} />
        ) : (
          <View style={[styles.pendingImage, styles.cardImagePlaceholder]}>
            <Ionicons name="basketball-outline" size={22} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.pendingBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.itemName}
          </Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.pendingActions}>
          <TouchableOpacity
            style={styles.editIconBtn}
            onPress={() => handleEdit(item)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="pencil" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteIconBtn}
            onPress={() => handleDelete(item._id, item.itemName)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const SoldCard = ({ item }) => {
    const imageUrl = resolveImage(item);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("DonationDetail", { listingId: item._id })
        }
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.pendingImage} />
        ) : (
          <View style={[styles.pendingImage, styles.cardImagePlaceholder]}>
            <Ionicons name="basketball-outline" size={22} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.pendingBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.itemName}
          </Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.soldRight}>
          <View style={styles.soldPill}>
            <Text style={styles.soldPillText}>Sold Already</Text>
          </View>
          <Text style={styles.soldPrice}>
            {item.isDonation ? "Free" : `₹${item.askingPrice?.toLocaleString()}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    if (activeTab === "Active") return <ActiveCard item={item} />;
    if (activeTab === "Pending") return <PendingCard item={item} />;
    return <SoldCard item={item} />;
  };

  // ─── Render ────────────────────────────────────────────────────────
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
        <Text style={styles.headerTitle}>My Listing</Text>
      </View>

      {/* Pill tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.tabText, active && styles.tabTextActive]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sold-tab stats card */}
      {activeTab === "Sold" && !loading && (
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.totalProduct}</Text>
            <Text style={styles.statLabel}>Total Product</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: GREEN }]}>
              ₹{stats.totalIncome.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Income</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : filtered.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[GREEN]}
              tintColor={GREEN}
            />
          }
        >
          <View style={styles.center}>
            <Ionicons name="pricetag-outline" size={56} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>
              {activeTab === "Active"
                ? "No active listings"
                : activeTab === "Pending"
                ? "No pending listings"
                : "No sold items yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "Active"
                ? "List your equipment and share your gear!"
                : activeTab === "Pending"
                ? "Items awaiting INOX approval will show here."
                : "Items you've sold will show here."}
            </Text>
            {activeTab !== "Sold" && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate("SellGearIntro")}
              >
                <Text style={styles.emptyBtnText}>List Equipment</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 40 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[GREEN]}
              tintColor={GREEN}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

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

  // Tabs
  tabRow: {
    flexDirection: "row",
    backgroundColor: FIELD_BG,
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: "center",
  },
  tabActive: { backgroundColor: GREEN },
  tabText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  tabTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Sold stats
  statsCard: {
    flexDirection: "row",
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
  },
  statCol: { flex: 1, alignItems: "center" },
  statNum: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Common card shell
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  cardImage: {
    width: 96,
    height: 110,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
  },
  cardImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1, justifyContent: "space-between" },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  cardDesc: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // Active card extras
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  pill: {
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillText: {
    fontSize: 10,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN_DARK,
  },
  activePriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 6,
  },
  priceMain: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  priceStrike: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontFamily: "Poppins_400Regular",
  },
  viewsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 6,
  },
  viewsCount: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
  },

  // Pending card
  pendingImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
  },
  pendingBody: { flex: 1, justifyContent: "center" },
  pendingActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sold card
  soldRight: { alignItems: "flex-end", justifyContent: "center", gap: 8 },
  soldPill: {
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  soldPillText: {
    fontSize: 10,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN_DARK,
  },
  soldPrice: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },

  // Empty
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: GREEN,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default MyListingsScreen;
