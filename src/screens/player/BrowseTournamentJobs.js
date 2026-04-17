import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, StatusBar, Modal, FlatList, RefreshControl,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import TournamentConfig from "../../api/tournaments";

const ROLE_OPTIONS = [
  { key: "trainer", label: "Trainer", icon: "whistle", color: "#FF6A00" },
  { key: "referee", label: "Referee", icon: "cards", color: "#3B82F6" },
  { key: "scorer", label: "Scorer", icon: "counter", color: "#8B5CF6" },
  { key: "cameraman", label: "Cameraman", icon: "video", color: "#EC4899" },
  { key: "commentator", label: "Commentator", icon: "microphone", color: "#14B8A6" },
  { key: "staff", label: "Staff", icon: "account-hard-hat", color: "#F59E0B" },
];

const BrowseTournamentJobs = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = user?.id || user?._id;

  const [tournaments, setTournaments] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "applied"

  // Apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyRate, setApplyRate] = useState("");
  const [applyRateType, setApplyRateType] = useState("per_day");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchTournaments(), fetchMyApplications()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const fetchTournaments = async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/tournaments`);
      if (res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data.tournaments || [];
        const now = new Date();
        // Show only upcoming tournaments (start date in future + not completed)
        setTournaments(list.filter((t) => {
          if (t.currentStage === "completed") return false;
          // Check start date — exclude past tournaments
          const startDate = t.startDate ? new Date(t.startDate) : null;
          if (startDate && startDate < now) return false;
          return true;
        }));
      }
    } catch (err) {
      console.error("Error fetching tournaments:", err);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await axios.get(`${API.BASE_URL}/staff-applications/my/${userId}`);
      if (res.data?.success) {
        setMyApplications(res.data.applications || []);
      }
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  const hasApplied = (tournamentId, role) => {
    return myApplications.some(
      (a) => a.tournamentId?._id === tournamentId && a.role === role && a.status !== "withdrawn"
    );
  };

  const openApplyModal = (tournament) => {
    setSelectedTournament(tournament);
    setSelectedRole(null);
    setApplyMessage("");
    setApplyRate("");
    setShowApplyModal(true);
  };

  const handleApply = async () => {
    if (!selectedRole) {
      Alert.alert("Select Role", "Please pick a role to apply for.");
      return;
    }

    setApplying(true);
    try {
      const res = await axios.post(`${API.BASE_URL}/staff-applications/apply`, {
        userId,
        tournamentId: selectedTournament._id,
        role: selectedRole,
        message: applyMessage,
        rateAmount: applyRate ? parseInt(applyRate) : null,
        rateType: applyRate ? applyRateType : null,
      });

      if (res.data?.success) {
        Alert.alert("Applied!", `You've applied as ${selectedRole} for ${selectedTournament.title}`);
        setShowApplyModal(false);
        fetchMyApplications();
      } else {
        Alert.alert("Error", res.data?.message || "Failed to apply");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      Alert.alert("Error", msg);
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async (applicationId) => {
    Alert.alert("Withdraw?", "Are you sure you want to withdraw this application?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.put(`${API.BASE_URL}/staff-applications/${applicationId}/withdraw`);
            fetchMyApplications();
          } catch (err) {
            Alert.alert("Error", "Failed to withdraw");
          }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted": return { bg: "#DCFCE7", text: "#16A34A" };
      case "rejected": return { bg: "#FEE2E2", text: "#DC2626" };
      case "pending": return { bg: "#FEF3C7", text: "#D97706" };
      default: return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  // ═══ RENDER ═══

  const renderTournamentCard = (tournament) => (
    <View key={tournament._id} style={styles.tournCard}>
      <View style={styles.tournHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tournTitle}>{tournament.title}</Text>
          <View style={styles.tournMeta}>
            <MaterialCommunityIcons name="trophy-variant" size={13} color="#888" />
            <Text style={styles.tournMetaText}>{tournament.sportsType || "Multi-Sport"}</Text>
            {tournament.startDate && (
              <>
                <View style={styles.dot} />
                <MaterialIcons name="event" size={13} color="#888" />
                <Text style={styles.tournMetaText}>{tournament.startDate}</Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Quick apply buttons per role */}
      <View style={styles.roleChips}>
        {ROLE_OPTIONS.map((role) => {
          const applied = hasApplied(tournament._id, role.key);
          return (
            <TouchableOpacity
              key={role.key}
              style={[styles.roleChip, applied && { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }]}
              onPress={() => {
                if (applied) return;
                setSelectedTournament(tournament);
                setSelectedRole(role.key);
                setApplyMessage("");
                setApplyRate("");
                setShowApplyModal(true);
              }}
              disabled={applied}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name={role.icon} size={14} color={applied ? "#16A34A" : role.color} />
              <Text style={[styles.roleChipText, applied && { color: "#16A34A" }]}>
                {applied ? "Applied" : role.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderApplicationCard = (app) => {
    const sc = getStatusColor(app.status);
    const roleDef = ROLE_OPTIONS.find((r) => r.key === app.role);

    return (
      <View key={app._id} style={styles.appCard}>
        <View style={styles.appHeader}>
          <MaterialCommunityIcons name={roleDef?.icon || "account"} size={20} color={roleDef?.color || "#666"} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.appTournament}>{app.tournamentId?.title || app.tournamentName || "Tournament"}</Text>
            <Text style={styles.appRole}>Applied as: {roleDef?.label || app.role}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{app.status.toUpperCase()}</Text>
          </View>
        </View>

        {app.rateAmount && (
          <Text style={styles.appRate}>Rate: ₹{app.rateAmount} / {(app.rateType || "").replace("per_", "")}</Text>
        )}
        {app.managerNote ? (
          <Text style={styles.appNote}>Manager: "{app.managerNote}"</Text>
        ) : null}

        {app.status === "pending" && (
          <TouchableOpacity style={styles.withdrawBtn} onPress={() => handleWithdraw(app._id)}>
            <Text style={styles.withdrawText}>Withdraw Application</Text>
          </TouchableOpacity>
        )}
      </View>
    );
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

      <LinearGradient colors={["#1E3A5F", "#0F2439"]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tournament Jobs</Text>
          <Text style={styles.headerSubtitle}>Apply as trainer, referee, or staff</Text>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "browse" && styles.tabActive]}
          onPress={() => setActiveTab("browse")}
        >
          <Text style={[styles.tabText, activeTab === "browse" && styles.tabTextActive]}>
            Browse ({tournaments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "applied" && styles.tabActive]}
          onPress={() => setActiveTab("applied")}
        >
          <Text style={[styles.tabText, activeTab === "applied" && styles.tabTextActive]}>
            My Applications ({myApplications.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6A00"]} />}
      >
        {activeTab === "browse" ? (
          tournaments.length > 0 ? (
            tournaments.map(renderTournamentCard)
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="briefcase-off" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No tournaments available right now</Text>
            </View>
          )
        ) : (
          myApplications.length > 0 ? (
            myApplications.map(renderApplicationCard)
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-document-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>You haven't applied anywhere yet</Text>
            </View>
          )
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Apply Modal */}
      <Modal visible={showApplyModal} transparent animationType="slide" onRequestClose={() => setShowApplyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply to Tournament</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTournName}>{selectedTournament?.title}</Text>

            {/* Role Selection */}
            <Text style={styles.fieldLabel}>Select Role *</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map((role) => {
                const applied = selectedTournament && hasApplied(selectedTournament._id, role.key);
                const selected = selectedRole === role.key;
                return (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleOption,
                      selected && { borderColor: role.color, backgroundColor: role.color + "10" },
                      applied && { opacity: 0.4 },
                    ]}
                    onPress={() => !applied && setSelectedRole(role.key)}
                    disabled={applied}
                  >
                    <MaterialCommunityIcons name={role.icon} size={20} color={selected ? role.color : "#999"} />
                    <Text style={[styles.roleOptionText, selected && { color: role.color, fontWeight: "800" }]}>
                      {role.label}
                    </Text>
                    {applied && <Text style={{ fontSize: 8, color: "#16A34A" }}>Applied</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Rate */}
            <Text style={styles.fieldLabel}>Your Rate (optional)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={applyRate}
                onChangeText={(v) => setApplyRate(v.replace(/\D/g, ""))}
                placeholder="Amount (Rs)"
                keyboardType="numeric"
                placeholderTextColor="#AAA"
              />
              <View style={{ flexDirection: "row", gap: 4 }}>
                {[{ k: "per_day", l: "/Day" }, { k: "per_tournament", l: "/Tourn" }].map((rt) => (
                  <TouchableOpacity
                    key={rt.k}
                    onPress={() => setApplyRateType(rt.k)}
                    style={[styles.rateChip, applyRateType === rt.k && styles.rateChipActive]}
                  >
                    <Text style={[styles.rateChipText, applyRateType === rt.k && { color: "#FF6A00" }]}>{rt.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Cover Note (optional)</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
              value={applyMessage}
              onChangeText={setApplyMessage}
              placeholder="Tell the organizer why you're a great fit..."
              multiline
              placeholderTextColor="#AAA"
            />

            {/* Submit */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={applying} activeOpacity={0.8}>
              <LinearGradient colors={["#FF6A00", "#FF4500"]} style={styles.submitGradient}>
                {applying ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>Submit Application</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FB" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 18, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  tabs: { flexDirection: "row", backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#FF6A00" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#999" },
  tabTextActive: { color: "#FF6A00" },
  content: { flex: 1, padding: 16 },
  tournCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tournHeader: { flexDirection: "row", marginBottom: 12 },
  tournTitle: { fontSize: 15, fontWeight: "800", color: "#1F2937" },
  tournMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  tournMetaText: { fontSize: 11, color: "#888" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#CCC", marginHorizontal: 4 },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB" },
  roleChipText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  appCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 12 },
  appHeader: { flexDirection: "row", alignItems: "center" },
  appTournament: { fontSize: 14, fontWeight: "800", color: "#1F2937" },
  appRole: { fontSize: 11, color: "#888", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "800" },
  appRate: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  appNote: { fontSize: 12, color: "#4B5563", fontStyle: "italic", marginTop: 6, backgroundColor: "#F9FAFB", padding: 8, borderRadius: 8 },
  withdrawBtn: { marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FEE2E2" },
  withdrawText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: "#AAA", marginTop: 12 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1F2937" },
  modalTournName: { fontSize: 14, fontWeight: "700", color: "#FF6A00", marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#374151", marginBottom: 8, marginTop: 4 },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  roleOption: { alignItems: "center", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", minWidth: 80 },
  roleOptionText: { fontSize: 11, fontWeight: "600", color: "#999", marginTop: 4 },
  modalInput: { backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1F2937", borderWidth: 1, borderColor: "#E5E7EB" },
  rateChip: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  rateChipActive: { borderColor: "#FF6A00", backgroundColor: "#FFF7ED" },
  rateChipText: { fontSize: 11, fontWeight: "700", color: "#999" },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 16 },
  submitGradient: { paddingVertical: 15, alignItems: "center" },
  submitText: { fontSize: 15, fontWeight: "900", color: "#FFF" },
});

export default BrowseTournamentJobs;
