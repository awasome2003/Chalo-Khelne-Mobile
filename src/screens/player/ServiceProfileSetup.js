import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Switch, Platform, Image,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import * as DocumentPicker from "expo-document-picker";

/**
 * ServiceProfileSetup — Create or edit a service profile (Trainer, Referee, Staff, etc.)
 *
 * Route params:
 * - roleKey: "trainer" | "referee" | "scorer" | "cameraman" | "commentator" | "staff"
 * - roleTitle: display name
 * - isEdit: boolean
 * - profileData: existing profile data (if editing)
 */

const SPORTS_OPTIONS = [
  "Table Tennis", "Badminton", "Tennis", "Cricket", "Football",
  "Basketball", "Volleyball", "Hockey", "Kabaddi", "Chess",
  "Carrom", "Pickleball", "Squash", "Snooker",
];

const RATE_TYPES = [
  { key: "per_hour", label: "Per Hour" },
  { key: "per_day", label: "Per Day" },
  { key: "per_session", label: "Per Session" },
  { key: "per_tournament", label: "Per Tournament" },
];

const ServiceProfileSetup = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { roleKey, roleTitle, isEdit, profileData } = route.params;
  const userId = user?.id || user?._id;

  // Form state
  const [saving, setSaving] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState(
    profileData?.experience && profileData.experience > 0 ? "experienced" : "fresher"
  );
  const [experienceDocs, setExperienceDocs] = useState(() => {
    // Load existing certificates from profile data
    if (profileData?.certificates?.length > 0) {
      return profileData.certificates.map((cert) => ({
        name: cert.name || "Document",
        uri: cert.certificateUrl || null,
        type: cert.certificateUrl?.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        size: null,
        isExisting: true, // flag to skip re-uploading
        _id: cert._id,
      }));
    }
    return [];
  });
  const [form, setForm] = useState({
    sports: profileData?.sports || [],
    experience: profileData?.experience?.toString() || "0",
    experienceMonths: profileData?.experienceMonths?.toString() || "0",
    experienceDescription: profileData?.experienceDescription || "",
    certificationLevel: profileData?.certificationLevel || "",
    rateAmount: profileData?.fees?.perSession?.toString() || profileData?.rateAmount?.toString() || "",
    rateType: profileData?.rateType || "per_day",
    availableDays: profileData?.availableDays || [],
    bio: profileData?.bio || "",
    equipment: profileData?.equipment || "",
    languages: profileData?.languages?.join(", ") || "",
  });

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSport = (sport) => {
    setForm((prev) => ({
      ...prev,
      sports: prev.sports.includes(sport)
        ? prev.sports.filter((s) => s !== sport)
        : [...prev.sports, sport],
    }));
  };

  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleSave = async () => {
    // Basic validation
    if ((roleKey === "trainer" || roleKey === "referee" || roleKey === "scorer" || roleKey === "commentator") && form.sports.length === 0) {
      Alert.alert("Required", "Please select at least one sport.");
      return;
    }
    if (experienceLevel === "experienced" && !form.experience && !form.experienceMonths) {
      Alert.alert("Required", "Please enter your experience duration.");
      return;
    }

    setSaving(true);
    try {
      let endpoint, payload;

      const basePayload = {
        firstName: user?.name?.split(" ")[0] || "",
        lastName: user?.name?.split(" ").slice(1).join(" ") || "",
        sports: form.sports,
        experience: experienceLevel === "fresher" ? 0 : (parseInt(form.experience) || 0),
        experienceDescription: form.experienceDescription,
        availableDays: form.availableDays,
      };

      if (roleKey === "trainer") {
        endpoint = `${API.BASE_URL}/trainer/profile/${userId}`;
        payload = { ...basePayload, fees: { perSession: parseInt(form.rateAmount) || 0 } };
        // Opt-in auto-create when setting up for the first time. Backend ignores the flag for existing profiles.
        if (!isEdit) await axios.get(`${endpoint}?createIfMissing=true`);
        await axios.put(endpoint, payload);
      } else if (roleKey === "referee") {
        endpoint = `${API.BASE_URL}/referee/profile/${userId}`;
        payload = { ...basePayload, certificationLevel: form.certificationLevel || "Level 1" };
        // Opt-in auto-create when setting up for the first time. Backend ignores the flag for existing profiles.
        if (!isEdit) await axios.get(`${endpoint}?createIfMissing=true`);
        await axios.put(endpoint, payload);
      } else {
        Alert.alert("Coming Soon", `${roleTitle} profile setup will be available soon.`);
        setSaving(false);
        return;
      }

      // Upload only NEW documents (skip already-uploaded ones)
      const newDocs = experienceDocs.filter((d) => !d.isExisting);
      if (newDocs.length > 0) {
        const certEndpoint = roleKey === "trainer"
          ? `${API.BASE_URL}/trainer/certificate/${userId}`
          : `${API.BASE_URL}/referee/certificate/${userId}`;

        for (let i = 0; i < newDocs.length; i++) {
          const doc = newDocs[i];
          try {
            const formData = new FormData();
            formData.append("certificate", {
              uri: doc.uri,
              type: doc.type || "image/jpeg",
              name: doc.name || `document-${i + 1}.jpg`,
            });
            formData.append("name", doc.name || `Experience Document ${i + 1}`);

            console.log(`Uploading doc ${i + 1}/${newDocs.length}: ${doc.name} (${doc.type})`);
            await axios.post(certEndpoint, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 30000,
            });
            console.log(`Doc ${i + 1} uploaded successfully`);
            // Small delay between uploads
            if (i < newDocs.length - 1) await new Promise((r) => setTimeout(r, 500));
          } catch (uploadErr) {
            console.error(`Document ${i + 1} upload error:`, uploadErr.response?.data?.message || uploadErr.message);
          }
        }
      }

      Alert.alert(
        "Profile Saved!",
        `Your ${roleTitle.toLowerCase()} profile is ready${experienceDocs.length > 0 ? " with documents uploaded" : ""}. You can now apply to tournaments.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error("Save error:", err);
      Alert.alert("Error", err.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#1E3A5F", "#0F2439"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isEdit ? "Edit" : "Setup"} {roleTitle} Profile</Text>
          <Text style={styles.headerSubtitle}>Fill in your professional details</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Sports Selection — for sports-related roles */}
        {["trainer", "referee", "scorer", "commentator"].includes(roleKey) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sports *</Text>
            <Text style={styles.sectionHint}>Select the sports you specialize in</Text>
            <View style={styles.chipGrid}>
              {SPORTS_OPTIONS.map((sport) => {
                const selected = form.sports.includes(sport);
                return (
                  <TouchableOpacity
                    key={sport}
                    onPress={() => toggleSport(sport)}
                    style={[styles.chip, selected && styles.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{sport}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Experience Level Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience Level *</Text>
          <View style={{
            flexDirection: "row", backgroundColor: "#F1F3F5", borderRadius: 12,
            padding: 3, marginBottom: 14,
          }}>
            <TouchableOpacity
              onPress={() => {
                setExperienceLevel("fresher");
                updateField("experience", "0");
                updateField("experienceMonths", "0");
              }}
              style={{
                flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center",
                backgroundColor: experienceLevel === "fresher" ? "#FFF" : "transparent",
                ...(experienceLevel === "fresher" ? {
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
                } : {}),
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="account-school"
                size={20}
                color={experienceLevel === "fresher" ? "#3B82F6" : "#999"}
              />
              <Text style={{
                fontSize: 13, fontWeight: "800", marginTop: 2,
                color: experienceLevel === "fresher" ? "#3B82F6" : "#999",
              }}>Fresher</Text>
              <Text style={{ fontSize: 9, color: "#AAA", marginTop: 1 }}>No prior experience</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExperienceLevel("experienced")}
              style={{
                flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: "center",
                backgroundColor: experienceLevel === "experienced" ? "#FFF" : "transparent",
                ...(experienceLevel === "experienced" ? {
                  shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
                } : {}),
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="briefcase-check"
                size={20}
                color={experienceLevel === "experienced" ? "#FF6A00" : "#999"}
              />
              <Text style={{
                fontSize: 13, fontWeight: "800", marginTop: 2,
                color: experienceLevel === "experienced" ? "#FF6A00" : "#999",
              }}>Experienced</Text>
              <Text style={{ fontSize: 9, color: "#AAA", marginTop: 1 }}>Has prior experience</Text>
            </TouchableOpacity>
          </View>

          {/* Experience Duration — only for experienced */}
          {experienceLevel === "experienced" && (
            <View>
              <Text style={[styles.sectionHint, { marginBottom: 8 }]}>How long have you been working in this role?</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#666", marginBottom: 4 }}>Years</Text>
                  <TextInput
                    style={styles.input}
                    value={form.experience}
                    onChangeText={(v) => updateField("experience", v.replace(/\D/g, ""))}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#AAA"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#666", marginBottom: 4 }}>Months</Text>
                  <TextInput
                    style={styles.input}
                    value={form.experienceMonths}
                    onChangeText={(v) => {
                      const num = v.replace(/\D/g, "");
                      if (parseInt(num) > 11) return;
                      updateField("experienceMonths", num);
                    }}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor="#AAA"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>
          )}

          {experienceLevel === "fresher" && (
            <View style={{
              flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF",
              borderRadius: 10, padding: 12, gap: 8,
            }}>
              <MaterialIcons name="info-outline" size={16} color="#3B82F6" />
              <Text style={{ fontSize: 11, color: "#3B82F6", flex: 1 }}>
                No worries! Everyone starts somewhere. Your profile will show as "Fresher" to organizers.
              </Text>
            </View>
          )}
        </View>

        {/* Experience Documents Upload — only for experienced users */}
        {experienceLevel === "experienced" && <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience Documents</Text>
          <Text style={styles.sectionHint}>
            Upload experience letters, certificates, or proof of work (PDF, JPG, PNG)
          </Text>

          {/* Uploaded docs list */}
          {experienceDocs.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {experienceDocs.map((doc, idx) => (
                <View key={idx} style={{
                  flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB",
                  borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#E5E7EB",
                }}>
                  <MaterialCommunityIcons
                    name={
                      doc.type?.includes("pdf") ? "file-pdf-box"
                      : doc.type?.includes("word") || doc.name?.endsWith(".doc") || doc.name?.endsWith(".docx") ? "file-word-box"
                      : "file-image"
                    }
                    size={28}
                    color={
                      doc.type?.includes("pdf") ? "#DC2626"
                      : doc.type?.includes("word") || doc.name?.endsWith(".doc") || doc.name?.endsWith(".docx") ? "#2563EB"
                      : "#3B82F6"
                    }
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }} numberOfLines={1}>
                      {doc.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#9CA3AF" }}>
                      {doc.size ? `${(doc.size / 1024).toFixed(0)} KB` : "Uploaded"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      // If it's an existing server doc, delete from server first
                      if (doc.isExisting && doc._id) {
                        try {
                          const delEndpoint = roleKey === "trainer"
                            ? `${API.BASE_URL}/trainer/certificate/${userId}/${doc._id}`
                            : `${API.BASE_URL}/referee/certificate/${userId}/${doc._id}`;
                          await axios.delete(delEndpoint);
                        } catch (err) {
                          Alert.alert("Error", "Failed to delete document from server");
                          return;
                        }
                      }
                      setExperienceDocs(experienceDocs.filter((_, i) => i !== idx));
                    }}
                    style={{ padding: 6 }}
                  >
                    <MaterialIcons name="close" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Upload button */}
          <TouchableOpacity
            style={{
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: "#E5E7EB", borderStyle: "dashed",
              borderRadius: 14, paddingVertical: 16, gap: 8,
              backgroundColor: "#FAFAFA",
            }}
            onPress={async () => {
              try {
                const result = await DocumentPicker.getDocumentAsync({
                  type: [
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "image/jpg",
                    "image/webp",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  ],
                  multiple: true,
                });
                if (!result.canceled && result.assets?.length > 0) {
                  const newDocs = result.assets.map((a) => ({
                    name: a.name,
                    uri: a.uri,
                    type: a.mimeType || "application/octet-stream",
                    size: a.size,
                  }));
                  setExperienceDocs((prev) => [...prev, ...newDocs]);
                }
              } catch (err) {
                Alert.alert("Error", "Failed to pick document");
              }
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cloud-upload-outline" size={22} color="#9CA3AF" />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#9CA3AF" }}>
              Upload Documents
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: "#CCC", marginTop: 6, textAlign: "center" }}>
            PDF, DOC, DOCX, JPG, PNG — Max 5 MB each
          </Text>
        </View>}

        {/* About You */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>
          <Text style={styles.sectionHint}>Describe your experience, achievements, specializations</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            value={form.experienceDescription || form.bio}
            onChangeText={(v) => updateField("experienceDescription", v)}
            placeholder="Tell tournament organizers about yourself..."
            multiline
            placeholderTextColor="#AAA"
          />
        </View>

        {/* Rate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rate</Text>
          <Text style={styles.sectionHint}>How much do you charge?</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.rateAmount}
              onChangeText={(v) => updateField("rateAmount", v.replace(/\D/g, ""))}
              placeholder="Amount"
              keyboardType="numeric"
              placeholderTextColor="#AAA"
            />
          </View>
          <View style={[styles.chipGrid, { marginTop: 8 }]}>
            {RATE_TYPES.map((rt) => {
              const selected = form.rateType === rt.key;
              return (
                <TouchableOpacity
                  key={rt.key}
                  onPress={() => updateField("rateType", rt.key)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{rt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Certification Level — referee only */}
        {roleKey === "referee" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certification Level</Text>
            <View style={styles.chipGrid}>
              {["Level 1", "Level 2", "Level 3", "International"].map((level) => {
                const selected = form.certificationLevel === level;
                return (
                  <TouchableOpacity key={level} onPress={() => updateField("certificationLevel", level)}
                    style={[styles.chip, selected && styles.chipActive]}>
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Equipment — cameraman only */}
        {roleKey === "cameraman" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" }]}
              value={form.equipment}
              onChangeText={(v) => updateField("equipment", v)}
              placeholder="List your equipment (camera model, drones, etc.)"
              multiline
              placeholderTextColor="#AAA"
            />
          </View>
        )}

        {/* Languages — commentator only */}
        {roleKey === "commentator" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <TextInput
              style={styles.input}
              value={form.languages}
              onChangeText={(v) => updateField("languages", v)}
              placeholder="English, Hindi, Marathi..."
              placeholderTextColor="#AAA"
            />
          </View>
        )}

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={styles.sectionHint}>Which days are you available?</Text>
          <View style={styles.chipGrid}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
              const selected = form.availableDays.includes(day);
              return (
                <TouchableOpacity key={day} onPress={() => toggleDay(day)}
                  style={[styles.chip, selected && styles.chipActive]}>
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{day.slice(0, 3)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
          <LinearGradient colors={["#FF6A00", "#FF4500"]} style={styles.saveBtnGradient}>
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>{isEdit ? "Update Profile" : "Create Profile"}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 18, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#FFF" },
  headerSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  content: { flex: 1, padding: 16 },
  section: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#1F2937", marginBottom: 4 },
  sectionHint: { fontSize: 11, color: "#9CA3AF", marginBottom: 10 },
  input: {
    backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: "#1F2937", borderWidth: 1, borderColor: "#E5E7EB",
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#FFF7ED", borderColor: "#FF6A00" },
  chipText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  chipTextActive: { color: "#FF6A00" },
  saveBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  saveBtnGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, gap: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: "900", color: "#FFF" },
});

export default ServiceProfileSetup;
