import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import API from "../api/api";

/**
 * Reusable Coupon Input Component with auto-discovery.
 * Shows available coupons + manual code entry.
 *
 * Props:
 * - totalAmount: number
 * - applicableType: "facility" | "tournament"
 * - applicableId: string
 * - userId: string
 * - onApply: (couponData) => void
 * - onRemove: () => void
 */
export default function CouponInput({
  totalAmount,
  applicableType,
  applicableId,
  userId,
  onApply,
  onRemove,
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showAvailable, setShowAvailable] = useState(false);
  const [fetchingCoupons, setFetchingCoupons] = useState(false);

  // Fetch available coupons on mount
  useEffect(() => {
    fetchAvailableCoupons();
  }, [applicableType, applicableId]);

  const fetchAvailableCoupons = async () => {
    setFetchingCoupons(true);
    try {
      const params = {};
      if (applicableType) params.type = applicableType;
      if (applicableId) params.item_id = applicableId;

      const res = await axios.get(`${API.BASE_URL}/coupons/available`, { params });
      if (res.data.success) {
        setAvailableCoupons(res.data.coupons || []);
      }
    } catch {} finally {
      setFetchingCoupons(false);
    }
  };

  const handleApply = async (couponCode) => {
    const applyCode = couponCode || code.trim().toUpperCase();
    if (!applyCode) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await axios.post(`${API.BASE_URL}/coupons/validate`, {
        code: applyCode,
        applicable_id: applicableId,
        applicable_type: applicableType,
        total_amount: totalAmount,
        user_id: userId,
      });

      if (res.data.valid) {
        setResult(res.data);
        setCode(applyCode);
        onApply?.({
          coupon_id: res.data.coupon_id,
          code: res.data.code,
          discount_amount: res.data.discount_amount,
          final_amount: res.data.final_amount,
          original_amount: res.data.original_amount,
        });
      } else {
        setError(res.data.message || "Invalid coupon");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to validate coupon");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCode("");
    setResult(null);
    setError("");
    onRemove?.();
  };

  const getDiscountText = (coupon) => {
    if (coupon.discountType === "percentage") {
      return `${coupon.discountValue}% OFF${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ""}`;
    }
    return `₹${coupon.discountValue} OFF`;
  };

  // Applied state
  if (result?.valid) {
    return (
      <View style={styles.appliedContainer}>
        <View style={styles.appliedLeft}>
          <View style={styles.appliedIcon}>
            <Ionicons name="pricetag" size={16} color="#059669" />
          </View>
          <View>
            <Text style={styles.appliedCode}>{result.code}</Text>
            <Text style={styles.appliedSaving}>You save ₹{result.discount_amount}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleRemove} style={styles.removeBtn}>
          <Ionicons name="close-circle" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Available Coupons */}
      {availableCoupons.length > 0 && (
        <View style={styles.availableSection}>
          <TouchableOpacity
            style={styles.availableHeader}
            onPress={() => setShowAvailable(!showAvailable)}
          >
            <View style={styles.availableHeaderLeft}>
              <Ionicons name="gift" size={16} color="#059669" />
              <Text style={styles.availableTitle}>
                {availableCoupons.length} coupon{availableCoupons.length !== 1 ? "s" : ""} available
              </Text>
            </View>
            <Ionicons
              name={showAvailable ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showAvailable && (
            <View style={styles.couponList}>
              {availableCoupons.map((coupon) => (
                <TouchableOpacity
                  key={coupon._id}
                  style={styles.couponCard}
                  onPress={() => handleApply(coupon.code)}
                >
                  <View style={styles.couponLeft}>
                    <View style={styles.couponCodeBox}>
                      <Text style={styles.couponCodeText}>{coupon.code}</Text>
                    </View>
                    <View>
                      <Text style={styles.couponDiscount}>{getDiscountText(coupon)}</Text>
                      {coupon.description ? (
                        <Text style={styles.couponDesc} numberOfLines={1}>{coupon.description}</Text>
                      ) : null}
                      {coupon.minAmount > 0 && (
                        <Text style={styles.couponMin}>Min order: ₹{coupon.minAmount}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.tapApply}>
                    <Text style={styles.tapApplyText}>TAP TO APPLY</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Manual code entry */}
      <Text style={styles.label}>Or enter coupon code</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="pricetag-outline" size={16} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => { setCode(t.toUpperCase()); setError(""); }}
            placeholder="Enter code"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            maxLength={20}
          />
        </View>
        <TouchableOpacity
          style={[styles.applyBtn, !code.trim() && styles.applyBtnDisabled]}
          onPress={() => handleApply()}
          disabled={!code.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.applyText}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  inputRow: { flexDirection: "row", gap: 8 },
  inputWrapper: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F9FAFB", borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "#E5E7EB", height: 44,
  },
  input: { flex: 1, fontSize: 14, fontWeight: "700", color: "#1F2937", letterSpacing: 1 },
  applyBtn: {
    backgroundColor: "#059669", paddingHorizontal: 20, borderRadius: 10,
    justifyContent: "center", alignItems: "center", height: 44,
  },
  applyBtnDisabled: { backgroundColor: "#D1D5DB" },
  applyText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, color: "#EF4444", fontWeight: "500" },
  appliedContainer: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12, marginVertical: 8,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  appliedLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  appliedIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: "#D1FAE5",
    justifyContent: "center", alignItems: "center",
  },
  appliedCode: { fontSize: 14, fontWeight: "800", color: "#065F46", letterSpacing: 1 },
  appliedSaving: { fontSize: 11, color: "#059669", fontWeight: "600", marginTop: 1 },
  removeBtn: { padding: 4 },

  // Available coupons
  availableSection: {
    backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1,
    borderColor: "#BBF7D0", marginBottom: 10, overflow: "hidden",
  },
  availableHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
  },
  availableHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  availableTitle: { fontSize: 13, fontWeight: "700", color: "#065F46" },
  couponList: { borderTopWidth: 1, borderTopColor: "#BBF7D0" },
  couponCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#D1FAE5",
  },
  couponLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  couponCodeBox: {
    backgroundColor: "#FFF", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: "#A7F3D0", borderStyle: "dashed",
  },
  couponCodeText: { fontSize: 11, fontWeight: "800", color: "#059669", letterSpacing: 1, fontFamily: undefined },
  couponDiscount: { fontSize: 12, fontWeight: "700", color: "#065F46" },
  couponDesc: { fontSize: 10, color: "#6B7280", marginTop: 1 },
  couponMin: { fontSize: 9, color: "#9CA3AF", marginTop: 1 },
  tapApply: {
    backgroundColor: "#059669", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  tapApplyText: { fontSize: 9, fontWeight: "800", color: "#FFF", letterSpacing: 0.5 },
});
