import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  ActivityIndicator, StatusBar, Platform, Modal, TextInput, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import CHAT from "../../api/chat";
import API from "../../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import groupChatApi from "../../api/groupChat";

const FILTERS = ["All", "Chats", "Groups"];

const ChatListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { fetchUnreadTotal } = useChat();

  const [conversations, setConversations] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState(null); // "chat" | "group"
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const userId = user?._id || user?.id || "";

  useFocusEffect(
    useCallback(() => {
      fetchAll();
      fetchUnreadTotal();
    }, [])
  );

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchConversations(), fetchGroups()]);
    setLoading(false);
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch(CHAT.ENDPOINTS.CONVERSATIONS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setConversations(data.conversations || []);
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const userData = await AsyncStorage.getItem("auth_user");
      const u = userData ? JSON.parse(userData) : null;
      const uid = u?._id || u?.id || userId;
      if (!uid) return;
      const res = await axios.get(groupChatApi.CHATS, { params: { userId: uid } });
      setGroupChats(res.data?.chats || []);
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const userData = await AsyncStorage.getItem("auth_user");
      const u = userData ? JSON.parse(userData) : {};
      const res = await axios.post(groupChatApi.CHATS, {
        name: groupName.trim(),
        createdBy: u._id || u.id || userId,
        createdByName: u.name || "User",
        createdByRole: u.role || "Player",
      });
      setShowCreate(false);
      setGroupName("");
      setCreateType(null);
      if (res.data?.chat) {
        navigation.navigate("GroupChatConversation", {
          chatId: res.data.chat._id,
          chatName: res.data.chat.name,
        });
      }
      fetchGroups();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  // Merge and sort
  const getDisplayData = () => {
    const dmItems = conversations.map((c) => ({
      _id: c._id,
      type: "dm",
      name: c.otherUser?.name || "Player",
      avatar: c.otherUser?.profileImage,
      lastMessage: c.lastMessage?.text || "",
      lastTime: c.lastMessage?.timestamp,
      unread: c.unreadCount || 0,
      raw: c,
    }));

    const groupItems = groupChats.map((g) => ({
      _id: g._id,
      type: "group",
      name: g.name,
      avatar: null,
      lastMessage: g.lastMessageText ? `${g.lastMessageBy}: ${g.lastMessageText}` : "",
      lastTime: g.lastMessageAt,
      unread: 0,
      memberCount: g.members?.length || 0,
      isOwner: g.createdBy === userId,
      raw: g,
    }));

    let combined = [...dmItems, ...groupItems];

    if (activeFilter === "Chats") combined = combined.filter((i) => i.type === "dm");
    if (activeFilter === "Groups") combined = combined.filter((i) => i.type === "group");

    // Sort by last message time
    combined.sort((a, b) => {
      const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0;
      const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0;
      return tb - ta;
    });

    return combined;
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getProfileImage = (img) => {
    if (!img) return null;
    const clean = img.replace(/\\/g, "/").replace(/^\.?\/?uploads\//i, "");
    return `${API.SERVER_URL}/uploads/${clean}`;
  };

  const handleItemPress = (item) => {
    if (item.type === "dm") {
      navigation.navigate("ChatConversation", {
        conversationId: item._id,
        otherUser: item.raw.otherUser,
      });
    } else {
      navigation.navigate("GroupChatConversation", {
        chatId: item._id,
        chatName: item.name,
      });
    }
  };

  const displayData = getDisplayData();

  const renderItem = ({ item }) => {
    const isGroup = item.type === "group";
    const profileUri = !isGroup ? getProfileImage(item.avatar) : null;

    return (
      <TouchableOpacity style={styles.chatItem} activeOpacity={0.7} onPress={() => handleItemPress(item)}>
        {/* Avatar */}
        {isGroup ? (
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={22} color="#FFF" />
          </View>
        ) : profileUri ? (
          <Image source={{ uri: profileUri }} style={styles.avatar} />
        ) : (
          <View style={styles.defaultAvatar}>
            <Text style={styles.defaultAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <View style={styles.nameRow}>
              <Text style={[styles.chatName, item.unread > 0 && styles.chatNameBold]} numberOfLines={1}>
                {item.name}
              </Text>
              {isGroup && item.isOwner && <Ionicons name="star" size={10} color="#FF6A00" />}
              {isGroup && (
                <View style={styles.groupTag}>
                  <Text style={styles.groupTagText}>Group</Text>
                </View>
              )}
            </View>
            <Text style={[styles.chatTime, item.unread > 0 && styles.chatTimeBold]}>
              {formatTime(item.lastTime)}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={[styles.chatMessage, item.unread > 0 && styles.chatMessageBold]} numberOfLines={1}>
              {item.lastMessage || (isGroup ? "No messages yet" : "Start a conversation")}
            </Text>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread > 99 ? "99+" : item.unread}</Text>
              </View>
            )}
            {isGroup && (
              <View style={styles.membersBadge}>
                <Ionicons name="people-outline" size={10} color="#9CA3AF" />
                <Text style={styles.membersText}>{item.memberCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#004E93" />
        </View>
      ) : displayData.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {activeFilter === "Groups" ? "No group chats yet" : activeFilter === "Chats" ? "No conversations yet" : "No chats yet"}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeFilter === "Groups" ? "Create a group to start chatting!" : "Start a new conversation"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => `${item.type}-${item._id}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => { setShowCreate(false); setCreateType(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {createType === "group" ? "Create Group" : createType === "chat" ? "New Chat" : "New Conversation"}
              </Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setCreateType(null); setGroupName(""); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {!createType ? (
              // Choose type
              <View style={styles.typeChoices}>
                <TouchableOpacity
                  style={styles.typeCard}
                  onPress={() => { setShowCreate(false); setCreateType(null); navigation.navigate("ChatSearch"); }}
                >
                  <View style={[styles.typeIcon, { backgroundColor: "#004E93" }]}>
                    <Ionicons name="chatbubble" size={24} color="#FFF" />
                  </View>
                  <Text style={styles.typeLabel}>New Chat</Text>
                  <Text style={styles.typeDesc}>Start a 1-on-1 conversation</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.typeCard} onPress={() => setCreateType("group")}>
                  <View style={[styles.typeIcon, { backgroundColor: "#FF6A00" }]}>
                    <Ionicons name="people" size={24} color="#FFF" />
                  </View>
                  <Text style={styles.typeLabel}>New Group</Text>
                  <Text style={styles.typeDesc}>Create a group chat</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Group creation form
              <View>
                <TextInput
                  style={styles.groupInput}
                  placeholder="Group name..."
                  placeholderTextColor="#9CA3AF"
                  value={groupName}
                  onChangeText={setGroupName}
                  autoFocus
                  maxLength={50}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => { setCreateType(null); setGroupName(""); }} style={styles.modalCancelBtn}>
                    <Text style={styles.modalCancelText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalCreateBtn, !groupName.trim() && { opacity: 0.5 }]}
                    onPress={handleCreateGroup}
                    disabled={!groupName.trim() || creating}
                  >
                    {creating ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.modalCreateText}>Create</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12, backgroundColor: "#FFF",
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#1F2937" },
  createBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#004E93",
    justifyContent: "center", alignItems: "center",
  },
  filterBar: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#FFF", gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterChipActive: { backgroundColor: "#004E93" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterTextActive: { color: "#FFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#6B7280", marginTop: 12 },
  emptyDesc: { fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  chatItem: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#EEE", marginRight: 12 },
  defaultAvatar: {
    width: 52, height: 52, borderRadius: 18, backgroundColor: "#004E93",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  defaultAvatarText: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  groupAvatar: {
    width: 52, height: 52, borderRadius: 18, backgroundColor: "#FF6A00",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, marginRight: 8 },
  chatName: { fontSize: 15, fontWeight: "600", color: "#1F2937", flexShrink: 1 },
  chatNameBold: { fontWeight: "800", color: "#000" },
  groupTag: { backgroundColor: "#FF6A00", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  groupTagText: { fontSize: 9, fontWeight: "700", color: "#FFF" },
  chatTime: { fontSize: 11, color: "#9CA3AF" },
  chatTimeBold: { color: "#004E93", fontWeight: "700" },
  chatFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatMessage: { fontSize: 13, color: "#9CA3AF", flex: 1, marginRight: 8 },
  chatMessageBold: { color: "#1F2937", fontWeight: "600" },
  unreadBadge: {
    backgroundColor: "#004E93", borderRadius: 12, minWidth: 22, height: 22,
    justifyContent: "center", alignItems: "center", paddingHorizontal: 5,
  },
  unreadText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  membersBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  membersText: { fontSize: 10, color: "#9CA3AF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  typeChoices: { flexDirection: "row", gap: 12 },
  typeCard: {
    flex: 1, backgroundColor: "#F9FAFB", borderRadius: 16, padding: 20,
    alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB",
  },
  typeIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  typeLabel: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  typeDesc: { fontSize: 11, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  groupInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: "#1F2937", backgroundColor: "#F9FAFB",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  modalCancelBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  modalCreateBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#004E93" },
  modalCreateText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});

export default ChatListScreen;
