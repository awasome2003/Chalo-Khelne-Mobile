import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
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
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

const STATUS_STYLES = {
  confirmed: { bg: "#FFF3E0", fg: "#B25E00", label: "Order Confirmed" },
  packed: { bg: "#FFF3E0", fg: "#B25E00", label: "Packed" },
  shipped: { bg: "#FFF3E0", fg: "#B25E00", label: "Shipped" },
  out_for_delivery: { bg: "#FFF3E0", fg: "#B25E00", label: "Out for delivery" },
  delivered: { bg: "#E8F7F0", fg: "#0F8A55", label: "Delivered" },
  cancelled: { bg: "#FDECEC", fg: "#C8322A", label: "Cancelled" },
};

const STATUS_OPTIONS = [
  { key: "confirmed", label: "Order confirmed" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const DATE_OPTIONS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This Month" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
];

// Returns the lower-bound Date (>=) for a given date filter key, or null for "all".
const dateBoundFor = (key) => {
  if (!key) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case "today":
      return start;
    case "week": {
      const d = new Date(start);
      d.setDate(d.getDate() - 6);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "30d": {
      const d = new Date(start);
      d.setDate(d.getDate() - 29);
      return d;
    }
    case "90d": {
      const d = new Date(start);
      d.setDate(d.getDate() - 89);
      return d;
    }
    default:
      return null;
  }
};

// Map backend (status + paymentStatus + deliveryStatus) → display key
const resolveStatus = (item) => {
  if (item.deliveryStatus) return item.deliveryStatus;
  if (item.paymentStatus === "Rejected") return "cancelled";
  if (item.status === "Sold") return "delivered";
  if (item.status === "Reserved") return "confirmed";
  return "confirmed";
};

const sectionTitleFor = (date) => {
  const d = new Date(date);
  const today = new Date();
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) {
    return "Today";
  }
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const MyClaimsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Applied filters (drive the list)
  const [activeDate, setActiveDate] = useState(null);
  const [activeStatus, setActiveStatus] = useState(null);

  // Pending filters inside the sheet (not committed until Apply)
  const [pendingDate, setPendingDate] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  const openFilters = () => {
    setPendingDate(activeDate);
    setPendingStatus(activeStatus);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setActiveDate(pendingDate);
    setActiveStatus(pendingStatus);
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setPendingDate(null);
    setPendingStatus(null);
  };

  const fetchClaims = async () => {
    try {
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

  // ─── Build sections grouped by claimedAt date ──────────────────────
  const sections = useMemo(() => {
    const dateBound = dateBoundFor(activeDate);

    const filtered = claims.filter((c) => {
      if (activeStatus && resolveStatus(c) !== activeStatus) return false;
      if (dateBound) {
        const claimedAt = new Date(c.claimedAt || c.createdAt);
        if (claimedAt < dateBound) return false;
      }
      return true;
    });

    const buckets = new Map();
    filtered.forEach((item) => {
      const dateKey = sectionTitleFor(item.claimedAt || item.createdAt);
      if (!buckets.has(dateKey)) buckets.set(dateKey, []);
      buckets.get(dateKey).push(item);
    });

    // Sort: Today first, then dated groups newest → oldest
    return Array.from(buckets.entries())
      .sort(([a], [b]) => {
        if (a === "Today") return -1;
        if (b === "Today") return 1;
        return new Date(b) - new Date(a);
      })
      .map(([title, data]) => ({ title, data }));
  }, [claims, activeDate, activeStatus]);

  const hasActiveFilter = !!(activeDate || activeStatus);

  const goToOrder = (item) => {
    navigation.navigate("TrackOrder", {
      orderId: `INX${String(item._id).slice(-6).toUpperCase()}`,
      items: [
        {
          listingId: item._id,
          itemName: item.itemName,
          description: item.description,
          askingPrice: item.askingPrice,
          image: assetUrl(item.images?.[0]),
          isDonation: item.isDonation,
          qty: 1,
        },
      ],
      amount: item.askingPrice,
      orderDate: item.claimedAt || item.createdAt,
    });
  };

  // ─── Card ───────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const key = resolveStatus(item);
    const st = STATUS_STYLES[key] || STATUS_STYLES.confirmed;
    const imageUrl = assetUrl(item.images?.[0]);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => goToOrder(item)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="basketball-outline" size={22} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.itemName}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusPillText, { color: st.fg }]}>
                {st.label}
              </Text>
            </View>
          </View>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.priceText}>
            {item.isDonation
              ? "Free"
              : `₹${item.askingPrice?.toLocaleString()}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

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
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity
          onPress={openFilters}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="options-outline" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={56} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>
            {hasActiveFilter ? "No orders match your filters" : "No orders yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {hasActiveFilter
              ? "Try clearing some filters."
              : "Browse equipment and place an order!"}
          </Text>
          {!hasActiveFilter && (
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate("EquipmentHub")}
            >
              <Text style={styles.emptyBtnText}>Browse Equipment</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
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

      {/* Apply filter sheet */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setFilterOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => setFilterOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={18} color={TEXT_DARK} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetTitle}>Apply filter</Text>

            <ScrollView
              style={{ maxHeight: 480 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.groupLabel}>Select date</Text>
              {DATE_OPTIONS.map((opt) => {
                const selected = pendingDate === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={styles.filterRow}
                    onPress={() =>
                      setPendingDate(selected ? null : opt.key)
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.radio, selected && styles.radioOn]}
                    >
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.filterLabel,
                        selected && styles.filterLabelOn,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.groupLabel, { marginTop: 18 }]}>
                Select Status
              </Text>
              {STATUS_OPTIONS.map((opt) => {
                const selected = pendingStatus === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={styles.filterRow}
                    onPress={() =>
                      setPendingStatus(selected ? null : opt.key)
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.radio, selected && styles.radioOn]}
                    >
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.filterLabel,
                        selected && styles.filterLabelOn,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={resetFilters}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={applyFilters}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    flex: 1,
    marginLeft: 4,
  },

  // Section header
  sectionHeader: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 14,
    marginBottom: 8,
  },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
  },
  cardImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1, justifyContent: "center" },
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
  priceText: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 4,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
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
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Filter sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 18,
  },
  groupLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOn: { borderColor: GREEN },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
  },
  filterLabel: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_MUTED,
  },
  filterLabelOn: {
    color: TEXT_DARK,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 18 },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: GREEN,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default MyClaimsScreen;
