import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import {
  getCart,
  addToCart as addToCartStorage,
  removeFromCart as removeFromCartStorage,
} from "../../api/cart";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

const BASE = `${API.BASE_URL}/donations`;

export default function EquipmentHubScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeSport, setActiveSport] = useState("All");
  const [favorites, setFavorites] = useState(() => new Set());
  const [cartIds, setCartIds] = useState(() => new Set());

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${BASE}/listings`, { headers });
      setItems(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching equipment listings:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const syncCart = async () => {
    const cart = await getCart();
    setCartIds(new Set(cart.map((c) => c.listingId)));
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
      syncCart();
    }, [])
  );

  // ─── Sport chips: All + unique sports from listings ─────────────────
  const sportChips = React.useMemo(() => {
    const sports = new Set();
    items.forEach((i) => {
      if (i.sport) sports.add(i.sport);
    });
    return ["All", ...Array.from(sports)];
  }, [items]);

  // ─── Filtering ──────────────────────────────────────────────────────
  const visibleItems = React.useMemo(() => {
    let list = items;
    if (activeSport !== "All") {
      list = list.filter(
        (i) => (i.sport || "").toLowerCase() === activeSport.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.itemName || i.name || "").toLowerCase().includes(q) ||
          (i.sport || "").toLowerCase().includes(q) ||
          (i.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, activeSport, search]);

  // ─── Card actions ───────────────────────────────────────────────────
  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCart = async (item) => {
    const id = item._id;
    if (cartIds.has(id)) {
      const next = await removeFromCartStorage(id);
      setCartIds(new Set(next.map((c) => c.listingId)));
    } else {
      const imageUrl = assetUrl(item.images?.[0]);
      const next = await addToCartStorage({
        listingId: id,
        itemName: item.itemName || item.name || "Equipment",
        description: item.description || "",
        condition: item.condition || "",
        sport: item.sport || "",
        askingPrice: item.askingPrice || item.price || 0,
        originalPrice: item.originalPrice || 0,
        isDonation: !!item.isDonation,
        image: imageUrl,
        features: item.features || item.tags || [],
        quantity: item.quantity || 1,
        qty: 1,
      });
      setCartIds(new Set(next.map((c) => c.listingId)));
    }
  };

  const openMenu = () => {
    Alert.alert("Your Equipment", "Manage your listings and claims", [
      {
        text: "My Listings",
        onPress: () => navigation.navigate("MyListings"),
      },
      {
        text: "My Claims",
        onPress: () => navigation.navigate("MyClaims"),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ─── Renderers ──────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const isFree = item.isDonation || item.askingPrice === 0;
    const imageUrl = assetUrl(item.images?.[0]);
    const isFav = favorites.has(item._id);
    const inCart = cartIds.has(item._id);

    const conditionPills = [];
    if (item.condition) conditionPills.push(item.condition);
    if (item.isDonation) conditionPills.push("For Donation");

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
            <Ionicons name="basketball-outline" size={28} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.itemName || item.name || "Equipment"}
            </Text>
            <TouchableOpacity
              onPress={() => toggleFavorite(item._id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name={isFav ? "heart" : "heart-outline"}
                size={20}
                color={isFav ? "#E11D48" : "#D1D5DB"}
              />
            </TouchableOpacity>
          </View>

          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}

          {conditionPills.length > 0 && (
            <View style={styles.pillRow}>
              {conditionPills.map((p) => (
                <View key={p} style={styles.condPill}>
                  <Text style={styles.condPillText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.priceWrap}>
              {isFree ? (
                <Text style={styles.freeText}>Free</Text>
              ) : (
                <>
                  {item.originalPrice ? (
                    <Text style={styles.strikePrice}>₹{item.originalPrice}</Text>
                  ) : null}
                  <Text style={styles.priceText}>
                    ₹{item.askingPrice || item.price || 0}/-
                  </Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={[styles.addBtn, inCart && styles.addBtnAdded]}
              onPress={() => toggleCart(item)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={inCart ? "checkmark" : "add"}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.addBtnText}>
                {inCart ? "Added" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Hero banner ────────────────────────────────────────────────────
  const Hero = () => (
    <LinearGradient
      colors={["#B89DE3", "#8A6FD6"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroDecor}>
        <Ionicons name="tennisball" size={42} color="rgba(255,255,255,0.9)" />
        <Ionicons name="football" size={48} color="rgba(255,255,255,0.85)" />
        <Ionicons name="basketball" size={42} color="rgba(255,255,255,0.9)" />
      </View>
      <View style={styles.heroBody}>
        <Text style={styles.heroTitle}>Sell What You Don't Use.</Text>
        <Text style={styles.heroSub}>
          Turn unused sports gear into cash. List items in seconds.
        </Text>
        <TouchableOpacity
          style={styles.heroCta}
          onPress={() => navigation.navigate("SellGearIntro")}
          activeOpacity={0.85}
        >
          <Text style={styles.heroCtaText}>Sell Now</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // ─── Header ─────────────────────────────────────────────────────────
  const Header = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Equipment Store</Text>
      <TouchableOpacity
        onPress={openMenu}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="person-circle-outline" size={24} color={TEXT_DARK} />
      </TouchableOpacity>
    </View>
  );

  // ─── Search ─────────────────────────────────────────────────────────
  const SearchBar = () => (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={18} color={TEXT_MUTED} />
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search sports, turfs or players"
        placeholderTextColor={TEXT_MUTED}
      />
      <View style={styles.searchDivider} />
      <TouchableOpacity hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
        <Ionicons name="mic-outline" size={18} color={TEXT_MUTED} />
      </TouchableOpacity>
    </View>
  );

  // ─── Sport chips ────────────────────────────────────────────────────
  const Chips = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {sportChips.map((s) => {
        const active = activeSport === s;
        return (
          <TouchableOpacity
            key={s}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => setActiveSport(s)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ─── Empty / loading ────────────────────────────────────────────────
  const ListEmpty = () => {
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <Ionicons name="basketball-outline" size={56} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No equipment found</Text>
        <Text style={styles.emptyDesc}>
          {search.trim() || activeSport !== "All"
            ? "Try a different search or filter"
            : "Check back later for new items"}
        </Text>
      </View>
    );
  };

  const openCart = () => navigation.navigate("Cart");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            <Header />
            <View style={{ paddingHorizontal: 16 }}>
              <Hero />
              <SearchBar />
            </View>
            <Chips />
          </>
        }
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: (cartIds.size > 0 ? 160 : 100) + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating cart toast */}
      {cartIds.size > 0 && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openCart}
          style={[styles.cartToast, { bottom: 92 + insets.bottom }]}
        >
          <View style={styles.cartToastLeft}>
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
            <Text style={styles.cartToastText}>
              {cartIds.size} {cartIds.size === 1 ? "Item" : "Items"} added
            </Text>
          </View>
          <View style={styles.cartToastRight}>
            <Text style={styles.cartToastCta}>View Cart</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: -16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "600",
    color: TEXT_DARK,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  cartBtn: { position: "relative" },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: GREEN,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },

  // Hero
  hero: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 130,
    marginTop: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  heroDecor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 110,
    height: 90,
    gap: -8,
  },
  heroBody: { flex: 1, paddingLeft: 8, alignItems: "flex-end" },
  heroTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "right",
  },
  heroSub: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.92)",
    lineHeight: 15,
    marginBottom: 10,
    textAlign: "right",
  },
  heroCta: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  heroCtaText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_DARK,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },
  searchDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#E5E7EB",
  },

  // Chips
  chipRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#E8F7F0",
    borderColor: GREEN,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  chipTextActive: { color: GREEN, fontWeight: "700" },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    gap: 12,
    marginBottom: 12,
  },
  cardImage: {
    width: 96,
    height: 110,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
  },
  cardImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, justifyContent: "space-between" },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    flex: 1,
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
  pillRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  condPill: {
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  condPillText: {
    fontSize: 10,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#0F8A55",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  strikePrice: {
    fontSize: 11,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontFamily: "Poppins_400Regular",
  },
  priceText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  freeText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnAdded: { backgroundColor: "#0F8A55" },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },

  // Floating cart toast
  cartToast: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GREEN,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  cartToastLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cartToastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  cartToastRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cartToastCta: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },

  // States
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    marginTop: 4,
    textAlign: "center",
  },
});
