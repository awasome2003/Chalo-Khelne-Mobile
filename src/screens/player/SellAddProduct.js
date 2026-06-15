import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Switch,
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

const GREEN = "#15A765";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#9CA3AF";
const FIELD_BG = "#F4F4F5";
const BORDER = "#EEF1FA";

const CATEGORIES = [
  "Racket",
  "Bat",
  "Shoes",
  "Jersey",
  "Ball",
  "Net",
  "Protective Gear",
  "Accessories",
  "Other",
];

const BRANDS = [
  "Nike",
  "Adidas",
  "Puma",
  "Reebok",
  "Yonex",
  "Wilson",
  "MRF",
  "SG",
  "SS",
  "Cosco",
  "Decathlon",
  "Other",
];

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "One Size"];

// Size options per category — choosing a category swaps what the Size field offers.
const SIZE_OPTIONS = {
  Racket: ["G1", "G2", "G3", "G4", "G5"], // grip sizes
  Bat: ["Size 4", "Size 5", "Size 6", "Harrow", "Short Handle", "Long Handle"],
  Shoes: ["5", "6", "7", "8", "9", "10", "11", "12", "13"],
  Jersey: ["XS", "S", "M", "L", "XL", "XXL"],
  Ball: ["Size 1", "Size 3", "Size 4", "Size 5"],
  Net: ["Full Size", "Half / Practice", "Standard"],
  "Protective Gear": ["XS", "S", "M", "L", "XL", "XXL"],
  Accessories: ["One Size", "Small", "Medium", "Large"],
  Other: SIZES,
};
const sizeOptionsFor = (category) => SIZE_OPTIONS[category] || SIZES;

const COLORS = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Gray",
  "Orange",
  "Pink",
  "Other",
];

const CONDITIONS = ["Like New", "Good", "Fair", "Used"];

// Field components are declared at module scope so they aren't redefined
// on every render — that re-creation would unmount/remount the TextInput
// after each keystroke and drop the keyboard.
const DropdownField = ({ label, value, placeholder, style, onPress }) => (
  <View style={[styles.fieldGroup, style]}>
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
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
    </TouchableOpacity>
  </View>
);

const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  style,
  multiline = false,
  minHeight,
}) => (
  <View style={[styles.fieldGroup, style]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View
      style={[
        styles.fieldWrap,
        multiline && { minHeight, alignItems: "flex-start", paddingTop: 12 },
      ]}
    >
      <TextInput
        style={[styles.fieldInput, multiline && { textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={TEXT_MUTED}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  </View>
);

const SellAddProduct = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // Pre-fill when navigated from MyListings → edit on a Pending listing
  const editing = route.params?.editingListing || null;

  const [form, setForm] = useState({
    itemName: editing?.itemName || "",
    category: editing?.category || "",
    brand: editing?.brand || "",
    size: editing?.size || "",
    color: editing?.color || "",
    quantity: editing?.quantity ? String(editing.quantity) : "1",
    originalPrice: editing?.originalPrice ? String(editing.originalPrice) : "",
    askingPrice: editing?.askingPrice ? String(editing.askingPrice) : "",
    condition: editing?.condition || "",
    description: editing?.description || "",
    usageDuration: editing?.usageDuration || "",
  });
  const [isDonation, setIsDonation] = useState(!!editing?.isDonation);
  const [pickerKey, setPickerKey] = useState(null); // which dropdown is open

  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleNext = () => {
    if (!form.itemName.trim()) {
      Alert.alert("Required", "Please enter a product name.");
      return;
    }
    if (!form.category) {
      Alert.alert("Required", "Please choose a category.");
      return;
    }
    if (!form.condition) {
      Alert.alert("Required", "Please choose a condition.");
      return;
    }
    if (!form.description.trim()) {
      Alert.alert("Required", "Please add a description.");
      return;
    }
    if (!isDonation) {
      if (!form.askingPrice || Number(form.askingPrice) <= 0) {
        Alert.alert("Required", "Please enter a selling price.");
        return;
      }
    }

    const payload = {
      ...form,
      quantity: Number(form.quantity) || 1,
      originalPrice: Number(form.originalPrice) || 0,
      askingPrice: isDonation ? 0 : Number(form.askingPrice) || 0,
      isDonation,
    };

    navigation.navigate("SellUploadImages", { product: payload });
  };

  // ─── Dropdown picker (single shared modal) ──────────────────────────
  const PICKER_CONFIG = {
    category: { title: "Choose a category", options: CATEGORIES },
    brand: { title: "Choose a brand", options: BRANDS },
    size: { title: "Choose a size", options: sizeOptionsFor(form.category) },
    color: { title: "Choose a color", options: COLORS },
    condition: { title: "Select condition", options: CONDITIONS },
  };

  const closePicker = () => setPickerKey(null);
  const pickOption = (value) => {
    if (pickerKey === "category" && value !== form.category) {
      // Changing the category invalidates a previously chosen size (e.g. "M"
      // makes no sense after switching to Shoes), so clear it.
      setForm((p) => ({ ...p, category: value, size: "" }));
    } else if (pickerKey) {
      update(pickerKey, value);
    }
    closePicker();
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
        <Text style={styles.headerTitle}>Add Product Detail</Text>
      </View>

      {/* Progress bar */}
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
          <TextField
            label="Product Name"
            value={form.itemName}
            onChangeText={(v) => update("itemName", v)}
            placeholder="e.g., Football Jersey, Cricket Bat"
          />

          <DropdownField
            label="Category"
            value={form.category}
            placeholder="Choose a category"
            onPress={() => setPickerKey("category")}
          />

          <DropdownField
            label="Brands"
            value={form.brand}
            placeholder="e.g., Nike, Puma"
            onPress={() => setPickerKey("brand")}
          />

          <View style={styles.row}>
            <DropdownField
              label="Size"
              value={form.size}
              placeholder={form.category ? `e.g., ${sizeOptionsFor(form.category)[0]}` : "Choose category first"}
              style={styles.half}
              onPress={() => setPickerKey("size")}
            />
            <DropdownField
              label="Color"
              value={form.color}
              placeholder="e.g., Green"
              style={styles.half}
              onPress={() => setPickerKey("color")}
            />
          </View>

          <View style={styles.row}>
            {/* Donate toggle */}
            <View style={[styles.fieldGroup, styles.half]}>
              <Text style={styles.fieldLabel}>Donate Your Gear</Text>
              <View style={[styles.fieldWrap, styles.toggleWrap]}>
                <Text style={styles.toggleLabel}>Switch toggle on</Text>
                <Switch
                  value={isDonation}
                  onValueChange={setIsDonation}
                  trackColor={{ false: "#D1D5DB", true: GREEN }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            </View>

            {/* Qty */}
            <TextField
              label="Qyt :"
              value={form.quantity}
              onChangeText={(v) => update("quantity", v)}
              placeholder="01"
              keyboardType="number-pad"
              style={styles.half}
            />
          </View>

          {/* Pricing — hidden when donating */}
          {!isDonation && (
            <View style={styles.row}>
              <TextField
                label="Original Price"
                value={form.originalPrice}
                onChangeText={(v) => update("originalPrice", v)}
                placeholder="₹3,999/-"
                keyboardType="number-pad"
                style={styles.half}
              />
              <TextField
                label="Selling Price"
                value={form.askingPrice}
                onChangeText={(v) => update("askingPrice", v)}
                placeholder="₹800/-"
                keyboardType="number-pad"
                style={styles.half}
              />
            </View>
          )}

          <DropdownField
            label="Condition"
            value={form.condition}
            placeholder="Select condition"
            onPress={() => setPickerKey("condition")}
          />

          <TextField
            label="Description"
            value={form.description}
            onChangeText={(v) => update("description", v)}
            placeholder="Add details about condition & usage"
            multiline
            minHeight={140}
          />

          <TextField
            label="Usage Duration"
            value={form.usageDuration}
            onChangeText={(v) => update("usageDuration", v)}
            placeholder="e.g., 3-6 months"
          />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Dropdown picker modal */}
      <Modal
        transparent
        visible={!!pickerKey}
        animationType="fade"
        onRequestClose={closePicker}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={closePicker}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>
              {pickerKey ? PICKER_CONFIG[pickerKey].title : ""}
            </Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {pickerKey
                ? PICKER_CONFIG[pickerKey].options.map((opt) => {
                    const selected = form[pickerKey] === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={styles.optRow}
                        onPress={() => pickOption(opt)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.optLabel,
                            selected && styles.optLabelOn,
                          ]}
                        >
                          {opt}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={GREEN}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                : null}
            </ScrollView>
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

  // Progress bar
  progressTrack: {
    marginHorizontal: 16,
    height: 3,
    backgroundColor: "#EAEAEA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    width: "25%",
    height: "100%",
    backgroundColor: GREEN,
  },

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
  fieldText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
  },
  fieldPlaceholder: { color: TEXT_MUTED },
  fieldInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },
  toggleWrap: {
    paddingVertical: 8,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },

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
  nextBtn: {
    backgroundColor: GREEN,
    borderRadius: 28,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: {
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

export default SellAddProduct;
