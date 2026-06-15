import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Dimensions, Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";

const { width } = Dimensions.get("window");

/**
 * Service Roles that a user can activate.
 * Each role has its own profile, verification, and application flow.
 */
const SERVICE_ROLES = [
  {
    key: "trainer",
    title: "Trainer / Coach",
    subtitle: "Coach players, run sessions, get hired by clubs",
    icon: "whistle",
    color: "#FF6A00",
    bgColor: "#FFF7ED",
    fields: ["sports", "experience", "certificates", "fees", "availability"],
  },
  {
    key: "referee",
    title: "Referee / Umpire",
    subtitle: "Officiate matches, get assigned to tournaments",
    icon: "cards",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    fields: ["sports", "certificationLevel", "certificates", "availability"],
  },
  {
    key: "scorer",
    title: "Scorer",
    subtitle: "Keep live scores for tournament matches",
    icon: "counter",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    fields: ["sports", "experience"],
  },
  {
    key: "cameraman",
    title: "Cameraman / Videographer",
    subtitle: "Record matches and create highlights",
    icon: "video",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    fields: ["experience", "equipment", "portfolio"],
  },
  {
    key: "commentator",
    title: "Commentator",
    subtitle: "Provide live commentary for events",
    icon: "microphone",
    color: "#14B8A6",
    bgColor: "#F0FDFA",
    fields: ["sports", "experience", "languages"],
  },
  {
    key: "staff",
    title: "Ground Staff / Spot Boy",
    subtitle: "Assist in tournament operations on ground",
    icon: "account-hard-hat",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    fields: ["experience"],
  },
];

const RoleHub = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = user?.id || user?._id;

  const [loading, setLoading] = useState(true);
  const [activeRoles, setActiveRoles] = useState({}); // { trainer: { status, profileId }, referee: {...} }

  // Re-fetch every time screen comes into focus (after editing/uploading docs)
  useFocusEffect(
    useCallback(() => {
      fetchMyRoles();
    }, [])
  );

  const fetchMyRoles = async () => {
    setLoading(true);
    try {
      // Check trainer profile
      const roles = {};
      try {
        const trainerRes = await axios.get(`${API.BASE_URL}/trainer/profile/${userId}`);
        if (trainerRes.data && trainerRes.data._id) {
          roles.trainer = { status: "active", profileId: trainerRes.data._id, data: trainerRes.data };
        }
      } catch {}

      // Check referee profile
      try {
        const refRes = await axios.get(`${API.BASE_URL}/referee/profile/${userId}`);
        if (refRes.data && refRes.data._id) {
          roles.referee = { status: "active", profileId: refRes.data._id, data: refRes.data };
        }
      } catch {}

      setActiveRoles(roles);
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleTap = (role) => {
    const existing = activeRoles[role.key];

    if (existing) {
      // Referee with active profile → show action menu (assignments / browse jobs / edit)
      if (role.key === "referee") {
        Alert.alert(
          `${role.title}`,
          "What would you like to do?",
          [
            {
              text: "My Assignments",
              onPress: () => navigation.navigate("RefereeAssignments"),
            },
            {
              text: "Browse Officiating Jobs",
              onPress: () =>
                navigation.navigate("BrowseTournamentJobs", {
                  roleFilter: "referee",
                }),
            },
            {
              text: "Edit Profile",
              onPress: () =>
                navigation.navigate("ServiceProfileSetup", {
                  roleKey: role.key,
                  roleTitle: role.title,
                  isEdit: true,
                  profileData: existing.data,
                }),
            },
            { text: "Cancel", style: "cancel" },
          ]
        );
        return;
      }

      // Other active roles — navigate straight to edit
      navigation.navigate("ServiceProfileSetup", {
        roleKey: role.key,
        roleTitle: role.title,
        isEdit: true,
        profileData: existing.data,
      });
    } else {
      // New role — navigate to setup
      Alert.alert(
        `Become a ${role.title}?`,
        `Create your ${role.title.toLowerCase()} profile to start applying for tournaments and getting hired.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Let's Go",
            onPress: () => navigation.navigate("ServiceProfileSetup", {
              roleKey: role.key,
              roleTitle: role.title,
              isEdit: false,
              profileData: null,
            }),
          },
        ]
      );
    }
  };

  const getRoleStatus = (roleKey) => {
    const existing = activeRoles[roleKey];
    if (!existing) return null;
    return existing.status;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={["#1E3A5F", "#0F2439"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>My Services</Text>
          <Text style={styles.headerSubtitle}>Manage your professional roles</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Roles Summary */}
        {Object.keys(activeRoles).length > 0 && (
          <View style={styles.activeSummary}>
            <Text style={styles.activeSummaryTitle}>Active Profiles</Text>
            <View style={styles.activeBadges}>
              {Object.keys(activeRoles).map((key) => {
                const roleDef = SERVICE_ROLES.find((r) => r.key === key);
                if (!roleDef) return null;
                return (
                  <View key={key} style={[styles.activeBadge, { backgroundColor: roleDef.bgColor }]}>
                    <MaterialCommunityIcons name={roleDef.icon} size={14} color={roleDef.color} />
                    <Text style={[styles.activeBadgeText, { color: roleDef.color }]}>{roleDef.title.split(" /")[0]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Role Cards */}
        <Text style={styles.sectionLabel}>Available Roles</Text>
        <Text style={styles.sectionDesc}>
          Create a profile for any role. Once set up, you can apply to tournaments as that role.
        </Text>

        {SERVICE_ROLES.map((role) => {
          const status = getRoleStatus(role.key);
          const isActive = !!status;

          return (
            <TouchableOpacity
              key={role.key}
              style={[styles.roleCard, isActive && { borderColor: role.color, borderWidth: 1.5 }]}
              onPress={() => handleRoleTap(role)}
              activeOpacity={0.7}
            >
              <View style={[styles.roleIcon, { backgroundColor: role.bgColor }]}>
                <MaterialCommunityIcons name={role.icon} size={26} color={role.color} />
              </View>

              <View style={styles.roleInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  {isActive && (
                    <View style={[styles.statusPill, { backgroundColor: "#DCFCE7" }]}>
                      <MaterialIcons name="verified" size={12} color="#16A34A" />
                      <Text style={[styles.statusText, { color: "#16A34A" }]}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          );
        })}

        {/* Apply to Tournaments CTA */}
        {Object.keys(activeRoles).length > 0 && (
          <TouchableOpacity
            style={styles.applyCta}
            onPress={() => navigation.navigate("BrowseTournamentJobs")}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#FF6A00", "#FF4500"]} style={styles.applyCtaGradient}>
              <MaterialCommunityIcons name="briefcase-search" size={22} color="#FFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.applyCtaTitle}>Browse Tournament Openings</Text>
                <Text style={styles.applyCtaSubtitle}>Find tournaments looking for your skills</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FB" },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingVertical: 18, gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  content: { flex: 1, padding: 16 },
  activeSummary: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#F0F0F0" },
  activeSummaryTitle: { fontSize: 13, fontWeight: "800", color: "#374151", marginBottom: 10 },
  activeBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  activeBadgeText: { fontSize: 12, fontWeight: "700" },
  sectionLabel: { fontSize: 16, fontWeight: "900", color: "#111", marginBottom: 4 },
  sectionDesc: { fontSize: 12, color: "#888", marginBottom: 16, lineHeight: 18 },
  roleCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  roleIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 14 },
  roleInfo: { flex: 1 },
  roleTitle: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  roleSubtitle: { fontSize: 11, color: "#9CA3AF", marginTop: 3, lineHeight: 16 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "800" },
  applyCta: { marginTop: 16, borderRadius: 16, overflow: "hidden" },
  applyCtaGradient: { flexDirection: "row", alignItems: "center", padding: 18 },
  applyCtaTitle: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  applyCtaSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
});

export default RoleHub;
