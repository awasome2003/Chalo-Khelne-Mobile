import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import AUTH from "../../api/auth";
import POSTS from "../../api/posts";
import PLAYER_STATS from "../../api/playerStats";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const ORANGE = "#F59E0B";
const BLUE = "#2563EB";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const FIELD_BG = "#F4F4F5";

const COVER_FALLBACK = require("../../../assets/TurnImageNew.jpg");
const AVATAR_FALLBACK = require("../../../assets/ProfilePlaceholder.png");

const ROLE_OPTIONS = ["Player", "Trainer", "Umpire", "Manager", "Referee"];

const titleCase = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

const resolveAvatar = (user) => {
  if (!user?.profileImage) return null;
  const img = user.profileImage;
  return assetUrl(img);
};

const formatDOB = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const PlayerProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user: authUser, updateUser, logout } = useAuth();

  const [profile, setProfile] = useState(authUser || null);
  const [loading, setLoading] = useState(!authUser);
  const [refreshing, setRefreshing] = useState(false);
  const [postsCount, setPostsCount] = useState(0);
  const [careerStats, setCareerStats] = useState(null);
  const [activeSport, setActiveSport] = useState(null);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) return;
      const res = await fetch(AUTH.ENDPOINTS.CURRENT_USER, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        updateUser?.(data);
      }
    } catch (e) {
      console.error("Profile fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPostsCount = async () => {
    try {
      const res = await fetch(POSTS.ENDPOINTS.GET_ALL);
      const data = await res.json();
      const list = data?.posts || data || [];
      const uid = authUser?.id || authUser?._id || profile?.id || profile?._id;
      const mine = list.filter(
        (p) => p.user?._id === uid || p.user === uid || p.userId === uid
      );
      setPostsCount(mine.length);
    } catch (e) {
      console.warn("Posts count fetch failed:", e?.message);
    }
  };

  const fetchCareerStats = async () => {
    try {
      const uid = authUser?.id || authUser?._id || profile?.id || profile?._id;
      if (!uid) return;
      const res = await fetch(PLAYER_STATS.ENDPOINTS.CAREER(uid));
      const data = await res.json();
      if (data?.success) {
        setCareerStats(data);
        // Default the sport-filter chip to the user's most-played sport
        const top = (data.sportStats || []).slice().sort(
          (a, b) => (b.matches || 0) - (a.matches || 0)
        )[0];
        if (top?.sport) setActiveSport(top.sport);
      }
    } catch (e) {
      console.warn("Career stats fetch failed:", e?.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchPostsCount();
      fetchCareerStats();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
    fetchPostsCount();
    fetchCareerStats();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load profile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUri = resolveAvatar(profile);
  const userRoles =
    Array.isArray(profile.roles) && profile.roles.length > 0
      ? profile.roles
      : profile.role
      ? [profile.role]
      : [];
  const currentRole = profile.role || userRoles[0] || "Player";

  const achievements = (profile.achievements || "")
    .split(/\n+/)
    .map((a) => a.trim())
    .filter(Boolean);

  // Real performance — derived from /api/player-stats/:userId aggregation
  const sportStats = careerStats?.sportStats || [];
  const sportNames = sportStats.map((s) => s.sport);
  const activeStat =
    sportStats.find((s) => s.sport === activeSport) ||
    sportStats[0] ||
    null;
  const perf = activeStat
    ? {
        win: activeStat.wins || 0,
        lose: activeStat.losses || 0,
        draw: activeStat.draws || 0,
        rate: activeStat.winRate || 0,
      }
    : { win: 0, lose: 0, draw: 0, rate: 0 };
  const totalMatches = perf.win + perf.lose + perf.draw;
  const hasAnyStats = sportStats.length > 0;

  const handleAddRole = () => {
    const remaining = ROLE_OPTIONS.filter(
      (r) =>
        ![...userRoles, currentRole]
          .map((x) => x.toLowerCase())
          .includes(r.toLowerCase())
    );
    if (remaining.length === 0) {
      Alert.alert("All roles added", "You already have every available role.");
      return;
    }
    Alert.alert("Add a role", "Multi-role assignment coming soon.");
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => logout() },
    ]);
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
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero cover + avatar */}
        <View style={styles.heroWrap}>
          <Image source={COVER_FALLBACK} style={styles.coverImage} />
          <TouchableOpacity
            style={styles.coverEditBtn}
            onPress={() => navigation.navigate("EditProfile")}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.avatarRing}>
            <Image
              source={avatarUri ? { uri: avatarUri } : AVATAR_FALLBACK}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Name + tagline */}
        <Text style={styles.name}>{profile.name || "Player"}</Text>
        <Text style={styles.bio}>
          {profile.bio || "Football lover & weekend player ⚽"}
        </Text>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Posts</Text>
            <Text style={styles.statNum}>{postsCount}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Followers</Text>
            <Text style={styles.statNum}>0</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Following</Text>
            <Text style={styles.statNum}>0</Text>
          </View>
        </View>

        {/* Role chips */}
        <View style={styles.rolesRow}>
          <TouchableOpacity
            style={styles.roleAdd}
            onPress={handleAddRole}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={GREEN} />
          </TouchableOpacity>
          {[...new Set([currentRole, ...userRoles, ...ROLE_OPTIONS])]
            .slice(0, 4)
            .map((r) => {
              const active =
                r.toLowerCase() === (currentRole || "").toLowerCase();
              return (
                <View
                  key={r}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      active && styles.roleChipTextActive,
                    ]}
                  >
                    {titleCase(r)}
                  </Text>
                </View>
              );
            })}
        </View>

        {/* Performance card */}
        <View style={styles.perfCard}>
          <Text style={styles.perfTitle}>My Performance</Text>

          {hasAnyStats ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
              >
                {sportNames.map((s) => {
                  const active = s === activeSport;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.perfSport,
                        active && styles.perfSportActive,
                      ]}
                      onPress={() => setActiveSport(s)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.perfSportText,
                          active && styles.perfSportTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.winRateRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.winRateLabel}>Overall Win Rate</Text>
                  <Text style={styles.winRateValue}>{perf.rate}%</Text>
                </View>
                <View style={styles.winRateChart}>
                  <View style={styles.winRateChartInner}>
                    <Ionicons name="trending-up" size={20} color={BLUE} />
                  </View>
                </View>
              </View>

              <View style={styles.perfStatsRow}>
                <View style={styles.perfStatCol}>
                  <View
                    style={[styles.perfStatBar, { backgroundColor: GREEN }]}
                  />
                  <Text style={styles.perfStatLabel}>Win</Text>
                  <Text style={styles.perfStatNum}>{perf.win}</Text>
                </View>
                <View style={styles.perfStatCol}>
                  <View
                    style={[styles.perfStatBar, { backgroundColor: "#EF4444" }]}
                  />
                  <Text style={styles.perfStatLabel}>Lose</Text>
                  <Text style={styles.perfStatNum}>{perf.lose}</Text>
                </View>
                <View style={styles.perfStatCol}>
                  <View
                    style={[styles.perfStatBar, { backgroundColor: "#9CA3AF" }]}
                  />
                  <Text style={styles.perfStatLabel}>Draw</Text>
                  <Text style={styles.perfStatNum}>{perf.draw}</Text>
                </View>
              </View>

              <Text style={styles.perfTotal}>
                Played total{" "}
                <Text style={{ fontWeight: "800" }}>{totalMatches}</Text> matches
              </Text>
            </>
          ) : (
            <View style={styles.perfEmpty}>
              <Ionicons name="trophy-outline" size={36} color="#D1D5DB" />
              <Text style={styles.perfEmptyTitle}>No matches played yet</Text>
              <Text style={styles.perfEmptyDesc}>
                Your win rate and per-sport stats will appear here once you
                play tournament matches.
              </Text>
            </View>
          )}
        </View>

        {/* Basic Details card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Basic Details</Text>

          <Text style={styles.detailsSection}>Basic Details</Text>
          <DetailRow label="Player name:" value={profile.name} />
          <DetailRow label="DOB:" value={formatDOB(profile.dateOfBirth)} />
          <DetailRow label="Gender:" value={titleCase(profile.sex)} />
          <DetailRow
            label="Club name:"
            value={
              profile.clubName ||
              (Array.isArray(profile.clubNames) && profile.clubNames[0]) ||
              "—"
            }
          />

          <View style={styles.detailsDivider} />

          <Text style={styles.detailsSection}>Contact</Text>
          <DetailRow label="Contact number:" value={profile.mobile} />
          <DetailRow
            label="Emergency contact:"
            value={profile.emergencyContact}
          />
          <DetailRow label="Email:" value={profile.email} />
          <DetailRow label="Address:" value={profile.address} />

          <View style={styles.detailsDivider} />

          <Text style={styles.detailsSection}>Achievements</Text>
          {achievements.length > 0 ? (
            achievements.map((a, i) => (
              <View key={`${a}-${i}`} style={styles.achievementRow}>
                <View style={styles.achievementIcon}>
                  <Ionicons name="medal" size={14} color={ORANGE} />
                </View>
                <Text style={styles.achievementText}>{a}</Text>
              </View>
            ))
          ) : (
            <Text
              style={[styles.detailValue, { textAlign: "left", marginTop: 4 }]}
            >
              No achievements added yet.
            </Text>
          )}
        </View>

        {/* Log out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>
      {value || "—"}
    </Text>
  </View>
);

const AVATAR_SIZE = 110;
const COVER_HEIGHT = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 14, color: TEXT_MUTED },

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
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: AVATAR_SIZE / 2 + 16,
  },
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
    width: 30,
    height: 30,
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
    marginBottom: 16,
    paddingHorizontal: 24,
  },

  // Stats
  statsCard: {
    flexDirection: "row",
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    marginHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  statCol: { flex: 1, alignItems: "center" },
  statLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  statNum: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 4,
  },

  // Roles
  rolesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  roleAdd: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: "#E8F7F0",
    alignItems: "center",
    justifyContent: "center",
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: FIELD_BG,
  },
  roleChipActive: { backgroundColor: GREEN },
  roleChipText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  roleChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Performance
  perfCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GREEN,
    padding: 14,
    marginBottom: 16,
  },
  perfTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: GREEN_DARK,
  },
  perfSport: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: FIELD_BG,
  },
  perfSportActive: { backgroundColor: "#E8F7F0" },
  perfSportText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  perfSportTextActive: { color: GREEN_DARK, fontWeight: "700" },

  winRateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  winRateLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  winRateValue: {
    fontSize: 28,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: BLUE,
    marginTop: 2,
  },
  winRateChart: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: BLUE,
    borderRightColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  winRateChartInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  perfStatsRow: {
    flexDirection: "row",
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  perfStatCol: { flex: 1, alignItems: "flex-start", paddingHorizontal: 14 },
  perfStatBar: { width: 24, height: 2, borderRadius: 1, marginBottom: 4 },
  perfStatLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  perfStatNum: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 2,
  },
  perfTotal: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    textAlign: "center",
    marginTop: 10,
  },
  perfEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  perfEmptyTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: TEXT_MUTED,
    marginTop: 10,
  },
  perfEmptyDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },

  // Details card
  detailsCard: {
    marginHorizontal: 16,
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  detailsSection: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 12,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_DARK,
    textAlign: "right",
  },
  detailsDivider: { height: 1, backgroundColor: "#E5E7EB", marginTop: 14 },

  achievementRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 5,
  },
  achievementIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  achievementText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    lineHeight: 19,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  logoutText: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#EF4444",
  },
});

export default PlayerProfileScreen;
