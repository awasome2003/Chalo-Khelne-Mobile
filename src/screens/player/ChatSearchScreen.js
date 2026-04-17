import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import CHAT from "../../api/chat";
import API from "../../api/api";

const ChatSearchScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(null);
  const debounceRef = useRef(null);

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setPlayers([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${CHAT.ENDPOINTS.SEARCH_PLAYERS}?q=${encodeURIComponent(text.trim())}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (data.success) {
          setPlayers(data.players);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const startChat = async (player) => {
    setCreating(player._id);
    try {
      const response = await fetch(CHAT.ENDPOINTS.CONVERSATIONS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantId: player._id }),
      });
      const data = await response.json();

      if (data.success) {
        navigation.replace("ChatConversation", {
          conversationId: data.conversation._id,
          otherUser: player,
        });
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setCreating(null);
    }
  };

  const getProfileImage = (u) => {
    if (!u?.profileImage) return null;
    const img = u.profileImage.replace(/\\/g, "/").replace(/^\.?\/?uploads\//i, "");
    return `${API.SERVER_URL}/uploads/${img}`;
  };

  const renderPlayer = ({ item }) => {
    const profileUri = getProfileImage(item);
    const isCreating = creating === item._id;

    return (
      <TouchableOpacity
        style={styles.playerItem}
        activeOpacity={0.7}
        onPress={() => startChat(item)}
        disabled={isCreating}
      >
        <Image
          source={profileUri ? { uri: profileUri } : require("../../../assets/profile.jpg")}
          style={styles.playerAvatar}
        />
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{item.name}</Text>
          <Text style={styles.playerRole}>{item.role || "Player"}</Text>
        </View>
        {isCreating ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <View style={styles.chatIconBg}>
            <Ionicons name="chatbubble" size={16} color="#007AFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search players by name..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setPlayers([]); }}>
              <Ionicons name="close-circle" size={20} color="#CCC" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : query.length < 2 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color="#D0D0D0" />
          <Text style={styles.hintText}>Type at least 2 characters to search</Text>
        </View>
      ) : players.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color="#D0D0D0" />
          <Text style={styles.hintText}>No players found for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item._id}
          renderItem={renderPlayer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 14, backgroundColor: "#FFF",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#333" },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#FFF" },
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F5F5F5", borderRadius: 14,
    paddingHorizontal: 14, height: 48, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#333" },
  centerContainer: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40,
  },
  hintText: { fontSize: 14, color: "#999", marginTop: 12, textAlign: "center" },
  listContent: { paddingVertical: 8 },
  playerItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F5F5F5",
  },
  playerAvatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: "#EEE", marginRight: 14 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 16, fontWeight: "700", color: "#333" },
  playerRole: { fontSize: 12, color: "#999", marginTop: 2, textTransform: "capitalize" },
  chatIconBg: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "#F0F7FF", justifyContent: "center", alignItems: "center",
  },
});

export default ChatSearchScreen;
