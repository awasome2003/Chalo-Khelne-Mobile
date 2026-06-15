import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#9CA3AF";
const FIELD_BG = "#F4F4F5";

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "club", label: "Club" },
  { value: "district", label: "District" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

// Field components at module scope so TextInput keeps focus on re-render.
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  style,
}) => (
  <View style={[styles.fieldGroup, style]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldWrap}>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT_MUTED}
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

const DropdownField = ({ label, value, placeholder, onPress }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.fieldWrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[styles.fieldText, !value && styles.fieldPlaceholder]}
        numberOfLines={1}
      >
        {value
          ? LEVELS.find((l) => l.value === value)?.label || value
          : placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
    </TouchableOpacity>
  </View>
);

const SellSellerDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const product = route.params?.product || {};
  const images = route.params?.images || [];

  const [form, setForm] = useState({
    fullName: user?.name || "",
    playerLevel: "",
    mobile: user?.phone || user?.mobile || "",
    email: user?.email || "",
    address: user?.address || "",
    pincode: user?.pincode || user?.address?.pincode || "",
    state: user?.state || user?.address?.state || "",
    city: user?.city || user?.address?.city || "",
  });
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  // ─── Continue → Review (final step submits) ────────────────────────
  const handleContinue = () => {
    if (!form.fullName.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    if (!form.mobile.trim()) {
      Alert.alert("Required", "Please enter your mobile number.");
      return;
    }
    if (!form.address.trim()) {
      Alert.alert("Required", "Please enter your address.");
      return;
    }
    if (images.length === 0) {
      Alert.alert(
        "Missing photos",
        "Please go back and add at least one photo."
      );
      return;
    }

    navigation.navigate("SellReview", {
      product,
      images,
      seller: {
        fullName: form.fullName,
        playerLevel: form.playerLevel,
        mobile: form.mobile,
      },
      shippingAddress: {
        mobile: form.mobile,
        email: form.email,
        address: form.address,
        pincode: form.pincode,
        state: form.state,
        city: form.city,
      },
    });
  };

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
        <Text style={styles.headerTitle}>Seller Details</Text>
      </View>

      {/* Progress — final step */}
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 110 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <InputField
            label="Full Name"
            value={form.fullName}
            onChangeText={(v) => update("fullName", v)}
            placeholder="Rahul Verma"
          />

          <DropdownField
            label="Player Level (Optional)"
            value={form.playerLevel}
            placeholder="e.g., National"
            onPress={() => setLevelPickerOpen(true)}
          />

          <InputField
            label="Mobile Number"
            value={form.mobile}
            onChangeText={(v) => update("mobile", v)}
            placeholder="e.g., 9876543210"
            keyboardType="phone-pad"
          />

          <InputField
            label="Email"
            value={form.email}
            onChangeText={(v) => update("email", v)}
            placeholder="e.g., rahul@email.com"
            keyboardType="email-address"
          />

          <InputField
            label="Address"
            value={form.address}
            onChangeText={(v) => update("address", v)}
            placeholder="Flat 402, Green Heights"
          />

          <InputField
            label="Pincode"
            value={form.pincode}
            onChangeText={(v) => update("pincode", v)}
            placeholder="411045"
            keyboardType="number-pad"
          />

          <View style={styles.row}>
            <InputField
              label="State"
              value={form.state}
              onChangeText={(v) => update("state", v)}
              placeholder="Maharashtra"
              style={styles.half}
            />
            <InputField
              label="City"
              value={form.city}
              onChangeText={(v) => update("city", v)}
              placeholder="Pune"
              style={styles.half}
            />
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleContinue}
            activeOpacity={0.9}
          >
            <Text style={styles.saveBtnText}>Save & Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Player level picker */}
      <Modal
        transparent
        visible={levelPickerOpen}
        animationType="fade"
        onRequestClose={() => setLevelPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setLevelPickerOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Choose your level</Text>
            {LEVELS.map((opt) => {
              const selected = form.playerLevel === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.optRow}
                  onPress={() => {
                    update("playerLevel", opt.value);
                    setLevelPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.optLabel, selected && styles.optLabelOn]}
                  >
                    {opt.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color={GREEN} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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

  progressTrack: {
    marginHorizontal: 16,
    height: 3,
    backgroundColor: "#EAEAEA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { width: "75%", height: "100%", backgroundColor: GREEN },

  // Field
  fieldGroup: { marginTop: 14 },
  fieldLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  fieldWrap: {
    minHeight: 46,
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },
  fieldText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
  },
  fieldPlaceholder: { color: TEXT_MUTED },

  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  saveBtn: {
    backgroundColor: GREEN,
    borderRadius: 28,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },

  // Picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 12,
  },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
  },
  optLabel: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_DARK,
  },
  optLabelOn: { color: GREEN, fontWeight: "700" },
});

export default SellSellerDetails;
