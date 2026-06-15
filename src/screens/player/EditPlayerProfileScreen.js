import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import AUTH from "../../api/auth";
import API from "../../api/api";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const ORANGE = "#F59E0B";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

const COVER_FALLBACK = require("../../../assets/TurnImageNew.jpg");
const AVATAR_FALLBACK = require("../../../assets/ProfilePlaceholder.png");

const GENDER_OPTIONS = ["Male", "Female", "Other"];

// Module-scope field components so the keyboard never drops on re-render.
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.fieldWrap, multiline && { minHeight: 80, alignItems: "flex-start", paddingTop: 10 }]}>
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

const DropdownField = ({ label, value, placeholder, onPress }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.fieldWrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color={TEXT_MUTED} />
    </TouchableOpacity>
  </View>
);

const DateField = ({ label, value, placeholder, onPress }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.fieldWrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
        {value || placeholder}
      </Text>
      <Ionicons name="calendar-outline" size={18} color={TEXT_MUTED} />
    </TouchableOpacity>
  </View>
);

const formatDateInput = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const parseDateInput = (str) => {
  if (!str) return null;
  const [dd, mm, yyyy] = str.split("/");
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
  return isNaN(d.getTime()) ? null : d;
};

const EditPlayerProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const initialProfile = route.params?.profile || user || {};

  // Form state
  const [profileImage, setProfileImage] = useState(null);
  const [name, setName] = useState(initialProfile.name || "");
  const [dob, setDob] = useState(formatDateInput(initialProfile.dateOfBirth));
  const [showPicker, setShowPicker] = useState(false);
  const [gender, setGender] = useState(
    initialProfile.sex
      ? initialProfile.sex.charAt(0).toUpperCase() +
          initialProfile.sex.slice(1)
      : ""
  );
  const [genderPickerOpen, setGenderPickerOpen] = useState(false);
  const [clubName, setClubName] = useState(
    initialProfile.clubName ||
      (Array.isArray(initialProfile.clubNames) && initialProfile.clubNames[0]) ||
      ""
  );
  const [contactNumber, setContactNumber] = useState(
    initialProfile.mobile || ""
  );
  const [emergencyContact, setEmergencyContact] = useState(
    initialProfile.emergencyContact || ""
  );
  const [email, setEmail] = useState(initialProfile.email || "");
  const [address, setAddress] = useState(initialProfile.address || "");
  const [achievements, setAchievements] = useState(
    initialProfile.achievements
      ? initialProfile.achievements.split(/\n+/).filter((a) => a.trim())
      : []
  );

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Hydrate avatar URI
  useEffect(() => {
    const img = initialProfile.profileImage;
    if (img) {
      const uri = img.startsWith("http")
        ? img
        : `${API.SERVER_URL}/uploads/${img}`;
      setProfileImage({ uri });
    }
  }, [initialProfile.profileImage]);

  const getToken = () => AsyncStorage.getItem("auth_token");

  // ─── Image upload ──────────────────────────────────────────────────
  const pickAndUploadAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Photo library access required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setProfileImage({ uri: asset.uri });
      await uploadProfileImage(asset);
    } catch (e) {
      console.error("Avatar pick failed:", e);
      Alert.alert("Error", "Failed to update photo.");
    }
  };

  const uploadProfileImage = async (asset) => {
    setUploadingImage(true);
    try {
      const token = await getToken();
      const userId = user?.id || user?._id;
      const fd = new FormData();
      fd.append("profile-image", {
        uri: asset.uri,
        type: "image/jpeg",
        name: "profile-image.jpg",
      });
      const res = await fetch(AUTH.ENDPOINTS.USER.UPLOAD_IMAGE(userId), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
    } catch (e) {
      console.error("Upload error:", e);
      Alert.alert("Upload failed", "Could not upload your photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Achievements list ─────────────────────────────────────────────
  const updateAchievement = (idx, text) =>
    setAchievements((prev) =>
      prev.map((a, i) => (i === idx ? text : a))
    );
  const removeAchievement = (idx) =>
    setAchievements((prev) => prev.filter((_, i) => i !== idx));
  const addAchievement = () =>
    setAchievements((prev) => [...prev, ""]);

  // ─── Save ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert("Required", "Full name is required.");
    if (!email.trim()) return Alert.alert("Required", "Email is required.");
    if (!contactNumber.trim())
      return Alert.alert("Required", "Contact number is required.");

    setLoading(true);
    try {
      const token = await getToken();
      const userId = user?.id || user?._id;
      const dobDate = parseDateInput(dob);
      const payload = {
        name: name.trim(),
        dateOfBirth: dobDate ? dobDate.toISOString() : null,
        sex: gender.toLowerCase(),
        clubNames: clubName ? [clubName] : [],
        clubName,
        mobile: contactNumber,
        emergencyContact,
        email,
        address,
        achievements: achievements
          .map((a) => a.trim())
          .filter(Boolean)
          .join("\n"),
      };

      const res = await fetch(AUTH.ENDPOINTS.USER.PROFILE(userId), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || "Update failed");
      }

      if (updateProfile) await updateProfile(userId, payload, "user");
      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.error("Save profile failed:", e);
      Alert.alert("Error", e.message || "Could not save changes.");
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 110 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero cover + avatar with camera */}
          <View style={styles.heroWrap}>
            <Image source={COVER_FALLBACK} style={styles.coverImage} />
            <View style={styles.coverEditBtn}>
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </View>

            <View style={styles.avatarRing}>
              {uploadingImage ? (
                <View style={[styles.avatar, styles.avatarLoading]}>
                  <ActivityIndicator color={GREEN} />
                </View>
              ) : (
                <Image
                  source={profileImage || AVATAR_FALLBACK}
                  style={styles.avatar}
                />
              )}
              <TouchableOpacity
                style={styles.cameraBadge}
                onPress={pickAndUploadAvatar}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.name}>{name || "Player"}</Text>
          <Text style={styles.bio}>
            {initialProfile.bio || "Football lover & weekend player ⚽"}
          </Text>

          {/* Basic Details */}
          <Text style={styles.sectionHeader}>Basic Details</Text>
          <View style={styles.card}>
            <InputField
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
            />
            <DateField
              label="Date of Birth"
              value={dob}
              placeholder="DD/MM/YYYY"
              onPress={() => setShowPicker(true)}
            />
            <DropdownField
              label="Gender"
              value={gender}
              placeholder="Male"
              onPress={() => setGenderPickerOpen(true)}
            />
            <InputField
              label="Club Name"
              value={clubName}
              onChangeText={setClubName}
              placeholder="Puneri Paltan"
            />
          </View>

          {/* Contact */}
          <Text style={styles.sectionHeader}>Contact</Text>
          <View style={styles.card}>
            <InputField
              label="Contact Number"
              value={contactNumber}
              onChangeText={setContactNumber}
              placeholder="9874563214"
              keyboardType="phone-pad"
            />
            <InputField
              label="Emergency Contact"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              placeholder="1235468799"
              keyboardType="phone-pad"
            />
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="abc@email.com"
              keyboardType="email-address"
            />
            <InputField
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Ajmera Colony, Pimpri, 411018"
            />
          </View>

          {/* Achievements */}
          <Text style={styles.sectionHeader}>Achievements</Text>
          <View style={styles.card}>
            {achievements.map((a, i) => (
              <View key={i} style={styles.achievementRow}>
                <View style={styles.achievementField}>
                  <TextInput
                    style={styles.achievementInput}
                    value={a}
                    onChangeText={(t) => updateAchievement(i, t)}
                    placeholder="e.g. Gold medal in state level 2021 (Football)"
                    placeholderTextColor={TEXT_MUTED}
                    multiline
                  />
                </View>
                <TouchableOpacity
                  style={styles.achievementDelete}
                  onPress={() => removeAchievement(i)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addAchievementBtn}
              onPress={addAchievement}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={GREEN} />
              <Text style={styles.addAchievementText}>Add Achievement</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Save Changes */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.saveBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnRow}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Date picker */}
      {showPicker && (
        <DateTimePicker
          value={parseDateInput(dob) || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (selectedDate) setDob(formatDateInput(selectedDate));
          }}
        />
      )}

      {/* Gender picker */}
      <Modal
        transparent
        visible={genderPickerOpen}
        animationType="fade"
        onRequestClose={() => setGenderPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setGenderPickerOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.sheetGrabber} />
            <Text style={styles.sheetTitle}>Choose gender</Text>
            {GENDER_OPTIONS.map((g) => {
              const selected = g === gender;
              return (
                <TouchableOpacity
                  key={g}
                  style={styles.optRow}
                  onPress={() => {
                    setGender(g);
                    setGenderPickerOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optLabel, selected && styles.optLabelOn]}>
                    {g}
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

const AVATAR_SIZE = 110;
const COVER_HEIGHT = 160;

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

  // Hero
  heroWrap: { marginBottom: AVATAR_SIZE / 2 + 16 },
  coverImage: {
    width: "100%",
    height: COVER_HEIGHT,
    borderRadius: 16,
    backgroundColor: FIELD_BG,
  },
  coverEditBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(21,167,101,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarRing: {
    position: "absolute",
    bottom: -AVATAR_SIZE / 2,
    alignSelf: "center",
    width: AVATAR_SIZE + 6,
    height: AVATAR_SIZE + 6,
    borderRadius: (AVATAR_SIZE + 6) / 2,
    backgroundColor: ORANGE,
    padding: 3,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: FIELD_BG,
  },
  avatarLoading: { justifyContent: "center", alignItems: "center" },
  cameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  name: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    textAlign: "center",
  },
  bio: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 24,
  },

  // Section header + card
  sectionHeader: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 4,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 16,
  },

  // Fields
  fieldGroup: { marginBottom: 10 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  fieldWrap: {
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: BORDER,
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

  // Achievements
  achievementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  achievementField: {
    flex: 1,
    backgroundColor: FIELD_BG,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  achievementInput: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },
  achievementDelete: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  addAchievementBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: GREEN,
    backgroundColor: "#FFFFFF",
    marginTop: 4,
  },
  addAchievementText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN,
  },

  // Bottom CTA
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  saveBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
  },

  // Modal sheet
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

export default EditPlayerProfileScreen;
