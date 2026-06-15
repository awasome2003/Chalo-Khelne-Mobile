import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  Pressable,
  ScrollView as RNScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API from "../../api/api";
import INVITATIONS from "../../api/invitations";
import ErrorBanner from "../../components/ErrorBanner";

// Invitation type config
const TYPE_CONFIG = {
  play_with_me: {
    label: "Play With Me",
    icon: "play-circle-outline",
    headerBg: "#F9F5FF",
    headerText: "#8A38F5",
  },
  tournament: {
    label: "Tournament",
    icon: "trophy-outline",
    headerBg: "#FFFAEC",
    headerText: "#C08000",
  },
  turf_match: {
    label: "Turf Match",
    icon: "location-outline",
    headerBg: "#EBFFEB",
    headerText: "#00BA00",
  },
  sports_event: {
    label: "Event",
    icon: "calendar-outline",
    headerBg: "#E6F1FA",
    headerText: "#0088FF",
  },
};

const getTypeConfig = (item) => {
  const key = item.invitationType || item.type || "tournament";
  return TYPE_CONFIG[key] || TYPE_CONFIG.tournament;
};

// Helpers
const getTimeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const fmt12 = (t) => {
  if (!t) return "";
  if (typeof t === "string" && (t.includes("AM") || t.includes("PM"))) return t;
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatTime = (start, end) => {
  if (!start) return null;
  const s = fmt12(start);
  if (!end) return s;
  const e = fmt12(end);
  return `${s} – ${e}`;
};

const getProfileImage = (userData) => {
  if (!userData?.profileImage && !userData?.image) return null;
  const raw = userData.profileImage || userData.image;
  const img = raw.replace(/^uploads[\\/]/, "");
  return `${API.SERVER_URL}/uploads/${img}`;
};

export default function InvitationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [tab, setTab] = useState("received");
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ types: [], statuses: [] });
  const [selectedGroup, setSelectedGroup] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchInvitations();
    }, [tab])
  );

  const fetchInvitations = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const url =
        tab === "received"
          ? INVITATIONS.RECEIVED(user._id || user.id)
          : INVITATIONS.SENT(user._id || user.id);
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const list = res.data.invitations || [];

        if (tab === "sent") {
          // Group bulk sends (shared batchId) into a single collapsed card
          const groups = {};
          const groupedList = [];
          list.forEach((item) => {
            const bid = item.batchId;
            const recipient = {
              name: item.receiverName,
              image: getProfileImage(item.receiverId),
              location:
                typeof item.receiverId?.address === "string"
                  ? item.receiverId.address
                  : item.receiverId?.address?.area ||
                    item.receiverId?.address?.city ||
                    "No Location",
            };
            if (bid) {
              if (!groups[bid]) {
                groups[bid] = { ...item, isGroup: true, recipients: [recipient] };
                groupedList.push(groups[bid]);
              } else {
                groups[bid].recipients.push(recipient);
              }
            } else {
              groupedList.push({ ...item, isGroup: false });
            }
          });
          setInvitations(groupedList);
        } else {
          setInvitations(list);
          setPendingCount(list.filter((i) => i.status === "pending").length);
        }
      }
    } catch (err) {
      console.error("Fetch invitations error:", err.message);
      setInvitations([]);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRespond = async (invitationId, status) => {
    setResponding(invitationId);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        INVITATIONS.RESPOND,
        { invitation_id: invitationId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setInvitations((prev) =>
          prev.map((inv) =>
            inv._id === invitationId
              ? { ...inv, status, respondedAt: new Date() }
              : inv
          )
        );
        setPendingCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    } finally {
      setResponding(null);
    }
  };

  const toggleFilter = (category, value) => {
    setActiveFilters((prev) => {
      const current = prev[category];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [category]: next };
    });
  };

  const filtered = invitations.filter((item) => {
    const searchMatch = searchQuery.trim()
      ? (item.receiverName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.senderName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tournamentName || "").toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const typeMatch = activeFilters.types.length > 0
      ? activeFilters.types.includes(item.invitationType)
      : true;

    const statusMatch = activeFilters.statuses.length > 0
      ? activeFilters.statuses.includes(item.status)
      : true;

    return searchMatch && typeMatch && statusMatch;
  });

  const renderCard = ({ item }) => {
    const isReceived = tab === "received";
    const otherPerson = isReceived ? item.senderId : item.receiverId;
    const tournament = item.tournamentId;
    const typeConf = getTypeConfig(item);
    const profileImg = getProfileImage(otherPerson);
    const personName =
      otherPerson?.name ||
      (isReceived ? item.senderName : item.receiverName) ||
      "Player";
    const sportTag = tournament?.sportsType || item.sport || null;
    const matchTitle = tournament?.title || item.tournamentName || "Invitation";
    const startDate = tournament?.startDate || item.eventDate;
    const startTime = tournament?.startTime || item.startTime;
    const endTime = tournament?.endTime || item.endTime;
    const venue = tournament?.venue || item.venue || tournament?.location;

    const isPending = item.status === "pending";
    const isAccepted = item.status === "accepted";
    const isRejected = item.status === "rejected";

    const statusColor = isAccepted ? "#00BA00" : isRejected ? "#DC2626" : "#C08000";
    const statusBg = isAccepted ? "#F0FFF0" : isRejected ? "#FEE2E2" : "#FFFAEC";
    const statusIcon = isAccepted
      ? "checkmark-circle"
      : isRejected
      ? "close-circle"
      : "time-outline";
    const statusLabel = isAccepted ? "Accepted" : isRejected ? "Declined" : "Pending";

    const venueText = venue
      ? typeof venue === "object"
        ? [venue.name, venue.area].filter(Boolean).join(", ")
        : venue
      : null;

    const isGroup = item.isGroup && item.recipients?.length > 1;

    return (
      <View style={s.card}>
        {/* Type header strip */}
        <View style={[s.typeHeader, { backgroundColor: typeConf.headerBg }]}>
          <View style={s.typeLeft}>
            <Ionicons name={typeConf.icon} size={16} color={typeConf.headerText} />
            <Text style={[s.typeLabel, { color: typeConf.headerText }]}>
              {typeConf.label}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
            <Ionicons name={statusIcon} size={13} color={statusColor} />
            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Person row */}
        <View style={s.personRow}>
          {isGroup ? (
            <View style={s.avatarGroup}>
              {item.recipients.slice(0, 3).map((r, idx) => (
                <View
                  key={idx}
                  style={[
                    s.avatarWrap,
                    { marginLeft: idx === 0 ? 0 : -15, zIndex: 10 - idx },
                  ]}
                >
                  {r.image ? (
                    <Image source={{ uri: r.image }} style={s.avatar} />
                  ) : (
                    <View style={s.avatarFallback}>
                      <Ionicons name="person-outline" size={20} color="#666" />
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : profileImg ? (
            <Image source={{ uri: profileImg }} style={s.avatar} />
          ) : (
            <View style={s.avatarFallback}>
              <Ionicons name="person-outline" size={20} color="#666" />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.sentLabel}>{isReceived ? "From" : "Sent to"}</Text>
            {isGroup ? (
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <TouchableOpacity
                  style={s.moreBadge}
                  onPress={() => setSelectedGroup(item)}
                >
                  <Text style={s.moreBadgeText}>
                    {item.recipients.length > 3
                      ? `+${item.recipients.length - 3} more`
                      : "View Players"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={s.personName}>{personName}</Text>
            )}
            <Text style={s.timeAgo}>{getTimeAgo(item.createdAt)}</Text>
          </View>

          {sportTag && (
            <View style={s.sportTag}>
              <Text style={s.sportTagText}>{sportTag}</Text>
            </View>
          )}
        </View>

        {/* Match title */}
        <Text style={s.matchTitle}>{matchTitle}</Text>

        {/* Info pills */}
        <View style={s.pillRow}>
          {startDate && (
            <View style={s.infoPill}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={s.infoPillText}>{formatDate(startDate)}</Text>
            </View>
          )}
          {(startTime || endTime) && (
            <View style={s.infoPill}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={s.infoPillText}>{formatTime(startTime, endTime)}</Text>
            </View>
          )}
        </View>

        {venueText && (
          <View style={s.pillRow}>
            <View style={s.infoPill}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={s.infoPillText}>{venueText}</Text>
            </View>
          </View>
        )}

        {/* Message box */}
        {item.message ? (
          <View style={s.messageBox}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={14}
                color="#666"
                style={{ marginTop: 2 }}
              />
              <Text style={[s.messageText, { flex: 1 }]}>"{item.message}"</Text>
            </View>
          </View>
        ) : null}

        {/* Pending received actions */}
        {isReceived && isPending && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={s.declineSquareBtn}
              onPress={() => handleRespond(item._id, "rejected")}
              disabled={responding === item._id}
            >
              {responding === item._id ? (
                <ActivityIndicator size="small" color="#15A765" />
              ) : (
                <Ionicons name="close" size={24} color="#15A765" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.acceptWideBtn}
              onPress={() => handleRespond(item._id, "accepted")}
              disabled={responding === item._id}
            >
              {responding === item._id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark"
                    size={24}
                    color="#FFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={s.acceptWideBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Status footer (if not pending received) */}
        {(!isPending || !isReceived) && (
          <View style={[s.statusFooter, { backgroundColor: statusBg }]}>
            <Ionicons name={statusIcon} size={18} color={statusColor} />
            <Text style={[s.statusFooterText, { color: statusColor }]}>
              {isAccepted
                ? isReceived
                  ? "You accepted this invitation"
                  : "Invitation Accepted"
                : isRejected
                ? isReceived
                  ? "You declined this invitation"
                  : "Invitation Declined"
                : "Pending Response"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#666666" />
          <Text style={s.headerTitle}>Invitations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.sendBtn}
          onPress={() => navigation.navigate("InvitePlayer")}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={s.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrapper}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={24} color="#666666" />
          <TextInput
            style={s.searchInput}
            placeholder="Search invitations"
            placeholderTextColor="#B0B7C3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="options-outline" size={24} color="#666666" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        <TouchableOpacity style={s.tabItem} onPress={() => setTab("received")}>
          <View style={s.tabInner}>
            <Text style={[s.tabLabel, tab === "received" && s.tabLabelActive]}>
              Received
            </Text>
            {pendingCount > 0 && (
              <View style={[s.tabBadge, tab !== "received" && { backgroundColor: "#666666" }]}>
                <Text style={s.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          {tab === "received" && <View style={s.tabUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity style={s.tabItem} onPress={() => setTab("sent")}>
          <View style={s.tabInner}>
            <Text style={[s.tabLabel, tab === "sent" && s.tabLabelActive]}>Sent</Text>
          </View>
          {tab === "sent" && <View style={s.tabUnderline} />}
        </TouchableOpacity>
      </View>

      {/* List */}
      <ErrorBanner visible={loadError} onRetry={fetchInvitations} />
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="mail-unread-outline" size={56} color="#D1D5DB" />
          <Text style={s.emptyTitle}>No {tab} invitations</Text>
          <Text style={s.emptySub}>
            {tab === "received"
              ? "When other players invite you, they'll appear here"
              : "Invitations you send will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 14, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchInvitations();
              }}
              tintColor="#10B981"
            />
          }
        />
      )}

      {/* Players group modal */}
      <Modal
        visible={!!selectedGroup}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedGroup(null)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setSelectedGroup(null)}>
          <TouchableOpacity
            style={s.floatingCloseBtn}
            onPress={() => setSelectedGroup(null)}
          >
            <Ionicons name="close" size={24} color="#7D7380" />
          </TouchableOpacity>
          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={s.bottomSheetHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Players Invited</Text>
            </View>
            <RNScrollView
              style={s.modalList}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {selectedGroup?.recipients.map((player, i) => (
                <View key={i} style={s.modalPlayerItem}>
                  {player.image ? (
                    <Image source={{ uri: player.image }} style={s.modalAvatar} />
                  ) : (
                    <View style={s.modalAvatarFallback}>
                      <Ionicons name="person-outline" size={20} color="#666666" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalPlayerName}>{player.name}</Text>
                    <Text style={s.modalPlayerLoc}>{player.location}</Text>
                  </View>
                  <View style={s.modalSportBadge}>
                    <Text style={s.modalSportText}>
                      {selectedGroup.sport || "Sport"}
                    </Text>
                  </View>
                </View>
              ))}
            </RNScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter modal */}
      <Modal
        visible={showFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowFilter(false)}>
          <TouchableOpacity
            style={s.floatingCloseBtn}
            onPress={() => setShowFilter(false)}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>

          <Pressable style={s.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={s.bottomSheetHandle} />
            <Text style={s.filterMainTitle}>Filter by</Text>

            <View style={s.filterSection}>
              <Text style={s.filterSectionTitle}>Invitation Type</Text>
              {[
                { key: "play_with_me", label: "Play with me" },
                { key: "turf_match", label: "Turf match" },
                { key: "sports_event", label: "Sports event" },
                { key: "tournament", label: "Tournament" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={s.filterOption}
                  onPress={() => toggleFilter("types", item.key)}
                >
                  <View
                    style={[
                      s.checkbox,
                      activeFilters.types.includes(item.key) && s.checkboxActive,
                    ]}
                  >
                    {activeFilters.types.includes(item.key) && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                  <Text style={s.filterOptionLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.divider} />

            <View style={s.filterSection}>
              <Text style={s.filterSectionTitle}>Status</Text>
              {[
                { key: "pending", label: "Pending" },
                { key: "accepted", label: "Accepted" },
                { key: "rejected", label: "Declined" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={s.filterOption}
                  onPress={() => toggleFilter("statuses", item.key)}
                >
                  <View
                    style={[
                      s.checkbox,
                      activeFilters.statuses.includes(item.key) && s.checkboxActive,
                    ]}
                  >
                    {activeFilters.statuses.includes(item.key) && (
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    )}
                  </View>
                  <Text style={s.filterOptionLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerTitle: { fontSize: 16, color: "#333333", fontFamily: "Montserrat_500Medium" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#15A765",
    padding: 12,
    borderRadius: 12,
  },
  sendBtnText: {
    color: "#FFF",
    fontSize: 16,
    lineHeight: 16,
    fontFamily: "Montserrat_500Medium",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFF",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFF",
    borderRadius: 53,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#666666",
    padding: 0,
    fontFamily: "Montserrat_500Medium",
  },
  filterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    paddingHorizontal: 16,
  },
  tabItem: { flex: 1, paddingTop: 8, alignItems: "center" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  tabLabel: { fontSize: 16, color: "#666666", fontFamily: "Montserrat_400Regular" },
  tabLabelActive: { color: "#15A765", fontFamily: "Montserrat_600SemiBold" },
  tabBadge: {
    backgroundColor: "#15A765",
    borderRadius: 26,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  tabBadgeText: { color: "#FFF", fontSize: 12, fontFamily: "Montserrat_500Medium" },
  tabUnderline: { width: "100%", height: 3, backgroundColor: "#15A765", borderRadius: 2 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: {
    fontSize: 16,
    color: "#666666",
    marginTop: 16,
    fontFamily: "Montserrat_500Medium",
  },
  emptySub: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    fontFamily: "Montserrat_500Medium",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderColor: "#F5F5F5",
    borderWidth: 1,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  typeLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeLabel: { fontSize: 14, lineHeight: 16, fontFamily: "Montserrat_600SemiBold" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 60,
  },
  statusText: { fontSize: 12, fontFamily: "Poppins_400Regular" },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatar: { width: 36, height: 36, borderRadius: 24, backgroundColor: "#EEEEEE" },
  avatarFallback: {
    padding: 10,
    borderRadius: 24,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
  },
  personName: { fontSize: 16, color: "#333333", fontFamily: "Montserrat_500Medium" },
  timeAgo: { fontSize: 12, color: "#666666", fontFamily: "Montserrat_500Medium" },
  sportTag: {
    backgroundColor: "#E6F1FA",
    borderRadius: 60,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sportTagText: {
    fontSize: 12,
    lineHeight: 12,
    color: "#0F7FE2",
    fontFamily: "Poppins_400Regular",
  },
  sentLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Montserrat_600SemiBold",
    marginBottom: 1,
  },
  matchTitle: {
    fontSize: 16,
    color: "#333333",
    paddingHorizontal: 16,
    marginBottom: 8,
    fontFamily: "Montserrat_600SemiBold",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 60,
  },
  infoPillText: { fontSize: 12, color: "#777777", fontFamily: "Poppins_400Regular" },
  messageBox: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
  },
  messageText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    fontFamily: "Poppins_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  declineSquareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  acceptWideBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#15A765",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptWideBtnText: { color: "#FFF", fontSize: 16, fontFamily: "Montserrat_500Medium" },
  statusFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    gap: 8,
    padding: 8,
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 8,
  },
  statusFooterText: { fontSize: 14, fontFamily: "Poppins_400Regular" },
  avatarGroup: { flexDirection: "row", alignItems: "center" },
  avatarWrap: {
    borderWidth: 2,
    borderColor: "#FFF",
    borderRadius: 22,
    overflow: "hidden",
  },
  moreBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moreBadgeText: {
    fontSize: 12,
    color: "#374151",
    fontFamily: "Montserrat_600SemiBold",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 200,
    maxHeight: "80%",
    paddingHorizontal: 16,
    paddingBottom: 50,
    paddingTop: 16,
  },
  floatingCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 50,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
    marginRight: 16,
    marginBottom: 8,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#333333" },
  modalList: { flexGrow: 0 },
  modalPlayerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  modalAvatar: { width: 44, height: 44, borderRadius: 50 },
  modalAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 50,
    backgroundColor: "#EEEEEE",
    justifyContent: "center",
    alignItems: "center",
  },
  modalPlayerName: { fontSize: 16, fontFamily: "Montserrat_500Medium", color: "#333333" },
  modalPlayerLoc: { fontSize: 12, fontFamily: "Montserrat_500Medium", color: "#666666" },
  modalSportBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 60,
  },
  modalSportText: { fontSize: 12, color: "#0F7FE2", fontFamily: "Poppins_400Regular" },
  filterMainTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#333333",
    marginBottom: 8,
  },
  filterSection: { marginBottom: 16 },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: "#666666",
    marginBottom: 16,
  },
  filterOption: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#15A765", borderColor: "#15A765" },
  filterOptionLabel: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
  },
  divider: { height: 1, backgroundColor: "#DDDDDD", marginBottom: 16 },
});
