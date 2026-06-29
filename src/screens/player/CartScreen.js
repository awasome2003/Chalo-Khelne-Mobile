import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { getCart, updateQty, removeFromCart } from "../../api/cart";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";

const DELIVERY_FEE = 50;

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

const CartScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const items = await getCart();
    setCart(items);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onInc = async (id, currentQty, max) => {
    // Never let the cart quantity exceed the listing's available stock. Used
    // items default to quantity 1 (one-of-a-kind), so this caps them at 1.
    const cap = Number(max) >= 1 ? Number(max) : 1;
    if (currentQty >= cap) return;
    const next = await updateQty(id, currentQty + 1);
    setCart(next);
  };

  const onDec = async (id, currentQty) => {
    // At qty 1, minus removes the item from the cart.
    if (currentQty <= 1) {
      const next = await removeFromCart(id);
      setCart(next);
      return;
    }
    const next = await updateQty(id, currentQty - 1);
    setCart(next);
  };

  const onRemove = (id, name) => {
    Alert.alert("Remove from cart?", name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          const next = await removeFromCart(id);
          setCart(next);
        },
      },
    ]);
  };

  const productPrice = cart.reduce(
    (sum, i) => sum + (i.askingPrice || 0) * (i.qty || 1),
    0
  );
  const total = productPrice + (cart.length > 0 ? DELIVERY_FEE : 0);

  const handleProceed = () => {
    if (cart.length === 0) return;
    navigation.navigate("EquipmentPaymentMethod", {
      cartItems: cart,
      amount: total,
      baseAmount: productPrice,
      userName: user?.name || "",
      userEmail: user?.email || "",
      userPhone: user?.phone || user?.mobile || "",
    });
  };

  // ─── Cart item card ────────────────────────────────────────────────
  const CartItem = ({ item }) => {
    const isFree = item.isDonation || item.askingPrice === 0;
    const features = Array.isArray(item.features) ? item.features : [];
    const available = Number(item.quantity) >= 1 ? Number(item.quantity) : 1;
    const atMax = (item.qty || 1) >= available;
    const pills = [];
    if (item.condition) pills.push(item.condition);
    features.slice(0, 2).forEach((f) => pills.push(f));
    pills.push(available <= 1 ? "Only 1 left" : `${available} in stock`);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        activeOpacity={0.95}
        onLongPress={() => onRemove(item.listingId, item.itemName)}
      >
        {item.image ? (
          <SafeImage
            uri={item.image}
            style={styles.itemImage}
            fallback={require("../../../assets/turf.jpg")}
          />
        ) : (
          <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
            <Ionicons name="basketball-outline" size={26} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.itemBody}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.itemName}
          </Text>
          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={1}>
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

          <View style={styles.itemFooter}>
            <View style={styles.priceWrap}>
              {isFree ? (
                <Text style={styles.priceMain}>Free</Text>
              ) : (
                <>
                  {item.originalPrice > item.askingPrice ? (
                    <Text style={styles.priceStrike}>
                      ₹{item.originalPrice?.toLocaleString()}
                    </Text>
                  ) : null}
                  <Text style={styles.priceMain}>
                    ₹{item.askingPrice?.toLocaleString()}/-
                  </Text>
                </>
              )}
            </View>

            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => onDec(item.listingId, item.qty || 1)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="remove" size={14} color={TEXT_DARK} />
              </TouchableOpacity>
              <Text style={styles.stepCount}>{item.qty || 1}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
                disabled={atMax}
                onPress={() =>
                  onInc(item.listingId, item.qty || 1, item.quantity)
                }
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="add" size={14} color={atMax ? "#C7CBD1" : TEXT_DARK} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Cart</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 100 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={styles.hero}>Preview</Text>
        <Text style={styles.heroSub}>Check your gear and proceed</Text>

        {/* Items */}
        {cart.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cart-outline" size={56} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyDesc}>
              Add equipment from the Store to see them here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              {cart.map((item) => (
                <CartItem key={item.listingId} item={item} />
              ))}
            </View>

            {/* Price Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Price Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Product price</Text>
                <Text style={styles.summaryValue}>
                  ₹{productPrice.toLocaleString()}/-
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery fee</Text>
                <Text style={styles.summaryValue}>₹{DELIVERY_FEE}/-</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ₹{total.toLocaleString()}/-
                </Text>
              </View>
            </View>

            {/* Delivery Address */}
            <View style={styles.addressCard}>
              <View style={styles.addressHeader}>
                <Text style={styles.addressTitle}>Delivery Address</Text>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("Profile", { screen: "EditProfile" })
                  }
                >
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.addressName}>
                {user?.name || "Add your name"}
              </Text>
              <Text style={styles.addressBody}>
                {user?.address ||
                  "No delivery address saved. Tap Change to add one."}
              </Text>
              {user?.phone || user?.mobile ? (
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={14} color={GREEN} />
                  <Text style={styles.phoneText}>
                    {user.phone || user.mobile}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {cart.length > 0 && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={handleProceed}
            activeOpacity={0.9}
          >
            <Text style={styles.payBtnText}>Proceed to Pay</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backBtn: { width: 28, height: 28, justifyContent: "center" },
  headerTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },

  // Hero
  hero: {
    fontSize: 26,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 4,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
    marginBottom: 16,
  },

  section: { gap: 12 },

  // Item card
  itemCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
  },
  itemImage: {
    width: 90,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
  },
  itemImagePlaceholder: { justifyContent: "center", alignItems: "center" },
  itemBody: { flex: 1, justifyContent: "space-between" },
  itemName: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  itemDesc: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
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
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  priceWrap: { flexDirection: "row", alignItems: "baseline", gap: 6, flex: 1 },
  priceStrike: {
    fontSize: 11,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    fontFamily: "Poppins_400Regular",
  },
  priceMain: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F5",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 6,
  },
  stepBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBtnDisabled: {
    backgroundColor: "#F1F2F4",
  },
  stepCount: {
    minWidth: 16,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_DARK,
  },

  // Summary
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 16,
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

  // Address
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginTop: 12,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  changeLink: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN,
  },
  addressName: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    marginTop: 2,
  },
  addressBody: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 18,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  phoneText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_DARK,
  },

  // Empty
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 30,
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

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  payBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },
});

export default CartScreen;
