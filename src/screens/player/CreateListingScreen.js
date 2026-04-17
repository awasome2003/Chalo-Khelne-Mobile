import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import DONATIONS from "../../api/donations";

const SPORTS = [
  "Badminton", "Table Tennis", "Tennis", "Cricket", "Football",
  "Basketball", "Volleyball", "Chess", "Carrom", "Pickleball",
  "Snooker", "Hockey", "Kabaddi",
];

const CATEGORIES = [
  "Racket", "Bat", "Shoes", "Jersey", "Ball",
  "Net", "Protective Gear", "Accessories", "Other",
];

const CONDITIONS = ["Like New", "Good", "Fair", "Used"];

const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "club", label: "Club" },
  { value: "district", label: "District" },
  { value: "state", label: "State" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const CreateListingScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [form, setForm] = useState({
    sport: "",
    itemName: "",
    description: "",
    category: "",
    condition: "",
    originalPrice: "",
    askingPrice: "",
    sellerLevel: "club",
    sellerContact: user?.mobile || "",
  });
  const [isDonation, setIsDonation] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.sport || !form.itemName || !form.description || !form.category || !form.condition) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const payload = {
        ...form,
        originalPrice: Number(form.originalPrice) || 0,
        askingPrice: isDonation ? 0 : Number(form.askingPrice) || 0,
        images: [],
      };

      await axios.post(DONATIONS.ENDPOINTS.CREATE, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert("Success", "Your equipment has been listed!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List Equipment</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sport */}
          <Text style={styles.label}>Sport *</Text>
          <View style={styles.chipRow}>
            {SPORTS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, form.sport === s && styles.chipActive]}
                onPress={() => updateField("sport", s)}
              >
                <Text style={[styles.chipText, form.sport === s && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Item Name */}
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            value={form.itemName}
            onChangeText={(v) => updateField("itemName", v)}
            placeholder="e.g. Yonex Astrox 99 Pro"
            placeholderTextColor="#9CA3AF"
            maxLength={150}
          />

          {/* Category */}
          <Text style={styles.label}>Category *</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, form.category === c && styles.chipActive]}
                onPress={() => updateField("category", c)}
              >
                <Text style={[styles.chipText, form.category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Condition */}
          <Text style={styles.label}>Condition *</Text>
          <View style={styles.chipRow}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, form.condition === c && styles.chipActive]}
                onPress={() => updateField("condition", c)}
              >
                <Text style={[styles.chipText, form.condition === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => updateField("description", v)}
            placeholder="Describe the item condition, usage history, why you're selling..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />

          {/* Your Level */}
          <Text style={styles.label}>Your Player Level</Text>
          <View style={styles.chipRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity
                key={l.value}
                style={[styles.chip, form.sellerLevel === l.value && styles.chipActive]}
                onPress={() => updateField("sellerLevel", l.value)}
              >
                <Text style={[styles.chipText, form.sellerLevel === l.value && styles.chipTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Free donation toggle */}
          <View style={styles.donationToggle}>
            <View>
              <Text style={styles.toggleTitle}>Free Donation</Text>
              <Text style={styles.toggleSubtitle}>Give this equipment for free</Text>
            </View>
            <Switch
              value={isDonation}
              onValueChange={setIsDonation}
              trackColor={{ false: "#E5E7EB", true: "#A7F3D0" }}
              thumbColor={isDonation ? "#059669" : "#9CA3AF"}
            />
          </View>

          {/* Prices */}
          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <Text style={styles.label}>Original Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={form.originalPrice}
                onChangeText={(v) => updateField("originalPrice", v)}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
            {!isDonation && (
              <View style={styles.priceField}>
                <Text style={styles.label}>Asking Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={form.askingPrice}
                  onChangeText={(v) => updateField("askingPrice", v)}
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>

          {/* Contact */}
          <Text style={styles.label}>Your Contact Number</Text>
          <TextInput
            style={styles.input}
            value={form.sellerContact}
            onChangeText={(v) => updateField("sellerContact", v)}
            placeholder="Mobile number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name={isDonation ? "gift" : "pricetag"} size={20} color="#fff" />
                <Text style={styles.submitText}>
                  {isDonation ? "List as Free Donation" : "List for Sale"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111", letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },
  label: {
    fontSize: 11, fontWeight: "700", color: "#6B7280",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 20,
  },
  input: {
    backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, fontWeight: "600", color: "#111", borderWidth: 1, borderColor: "#E5E7EB",
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  chipTextActive: { color: "#fff" },
  donationToggle: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#ECFDF5", borderRadius: 14, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  toggleTitle: { fontSize: 15, fontWeight: "700", color: "#065F46" },
  toggleSubtitle: { fontSize: 12, color: "#059669", marginTop: 2 },
  priceRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  priceField: { flex: 1 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0079EE", paddingVertical: 16, borderRadius: 16, marginTop: 30,
  },
  submitText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});

export default CreateListingScreen;
