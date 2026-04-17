import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import API from "../../api/api";
import INVITATIONS from "../../api/invitations";

export default function InvitePlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const { tournamentId, tournamentName } = route.params || {};

  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null); // player ID being sent
  const [message, setMessage] = useState("");
  const [sentIds, setSentIds] = useState(new Set()); // track already-invited players
  const [searchTimer, setSearchTimer] = useState(null);

  // Fetch already-sent invitations for this tournament
  useEffect(() => {
    if (tournamentId && user?._id) {
      fetchSentInvitations();
    }
  }, [tournamentId]);

  const fetchSentInvitations = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(INVITATIONS.SENT(user._id || user.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const ids = new Set(
          res.data.invitations
            .filter((inv) => inv.tournamentId?._id === tournamentId || inv.tournamentId === tournamentId)
            .map((inv) => inv.receiverId?._id || inv.receiverId)
        );
        setSentIds(ids);
      }
    } catch {}
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (searchTimer) clearTimeout(searchTimer);
    if (text.length < 2) {
      setPlayers([]);
      return;
    }
    const timer = setTimeout(() => searchPlayers(text), 400);
    setSearchTimer(timer);
  };

  const searchPlayers = async (query) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(`${INVITATIONS.SEARCH_PLAYERS}?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        // Filter out self
        const filtered = res.data.players.filter((p) => p._id !== user?._id);
        setPlayers(filtered);
      }
    } catch (err) {
      console.error("Search error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (player) => {
    if (sentIds.has(player._id)) {
      Alert.alert("Already Invited", `${player.name} has already been invited to this tournament.`);
      return;
    }

    setSending(player._id);
    try {
      const senderId = user?._id || user?.id;
      const receiverId = player?._id || player?.id;

      console.log("[INVITE_DEBUG] sender_id:", senderId, "receiver_id:", receiverId, "tournament_id:", tournamentId);

      if (!senderId || !receiverId || !tournamentId) {
        Alert.alert("Error", `Missing data: sender=${!!senderId}, receiver=${!!receiverId}, tournament=${!!tournamentId}`);
        setSending(null);
        return;
      }

      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.post(
        INVITATIONS.SEND,
        {
          sender_id: senderId,
          receiver_id: receiverId,
          tournament_id: tournamentId,
          message: message.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSentIds((prev) => new Set([...prev, player._id]));
        Alert.alert("Invitation Sent!", `${player.name} has been invited to ${tournamentName}.`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      Alert.alert("Failed", msg);
    } finally {
      setSending(null);
    }
  };

  const getProfileImage = (player) => {
    if (player.profileImage) {
      const img = player.profileImage.replace(/^uploads[\\/]/, "");
      return `${API.SERVER_URL}/uploads/${img}`;
    }
    return null;
  };

  const renderPlayer = ({ item }) => {
    const alreadySent = sentIds.has(item._id);

    return (
      <View style={styles.playerCard}>
        <View style={styles.playerLeft}>
          {getProfileImage(item) ? (
            <Image source={{ uri: getProfileImage(item) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={22} color="#9CA3AF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerRole}>{item.role || "Player"}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.inviteBtn, alreadySent && styles.invitedBtn]}
          onPress={() => handleSendInvite(item)}
          disabled={sending === item._id || alreadySent}
        >
          {sending === item._id ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : alreadySent ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.invitedText}>Sent</Text>
            </>
          ) : (
            <>
              <Ionicons name="paper-plane" size={14} color="#FFF" />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Invite Players</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{tournamentName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Custom Message */}
        <View style={styles.messageBox}>
          <Text style={styles.label}>Message (optional)</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Hey! Join this tournament, it'll be fun!"
            placeholderTextColor="#9CA3AF"
            maxLength={200}
            multiline
          />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search players by name..."
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(""); setPlayers([]); }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : players.length === 0 && search.length >= 2 ? (
          <View style={styles.centerBox}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No players found</Text>
          </View>
        ) : players.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons name="search-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Search for players to invite</Text>
            <Text style={styles.emptySubText}>Type at least 2 characters</Text>
          </View>
        ) : (
          <FlatList
            data={players}
            keyExtractor={(item) => item._id}
            renderItem={renderPlayer}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  messageBox: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6 },
  messageInput: {
    backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: "#1F2937", borderWidth: 1, borderColor: "#E5E7EB", minHeight: 50,
  },
  searchBox: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginVertical: 12,
    backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 40 },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#9CA3AF", marginTop: 12 },
  emptySubText: { fontSize: 12, color: "#D1D5DB", marginTop: 4 },
  playerCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  playerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3F4F6" },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  playerName: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  playerRole: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#4F46E5", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10,
  },
  inviteBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  invitedBtn: {
    backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0",
  },
  invitedText: { color: "#059669", fontSize: 12, fontWeight: "700" },
});
