import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Modal, ScrollView,
  StyleSheet, ActivityIndicator, RefreshControl, Alert, Platform,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import groupChatApi from "../../api/groupChat";
import API from "../../api/api";

export default function GroupChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]); // [{ _id, name }]
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem("auth_user");
      if (userData) {
        const u = JSON.parse(userData);
        setUserId(u._id || u.id || "");
        setUserName(u.name || "User");
        setUserRole(u.role || "Player");
      }
    })();
  }, []);

  const fetchChats = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(groupChatApi.CHATS, { params: { userId } });
      setChats(res.data?.chats || []);
    } catch (err) {
      console.error("Error fetching group chats:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (userId) fetchChats();
  }, [userId]));

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(API.ENDPOINTS.USER.SEARCH(query.trim()));
      const users = Array.isArray(res.data) ? res.data : res.data?.users || [];
      // Filter out already selected members and self
      setSearchResults(users.filter(u =>
        (u._id || u.id) !== userId && !selectedMembers.some(m => m._id === (u._id || u.id))
      ).slice(0, 8));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleMemberSearch = (text) => {
    setMemberSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchUsers(text), 400);
  };

  const addMember = (user) => {
    setSelectedMembers(prev => [...prev, { _id: user._id || user.id, name: user.name || user.fullName }]);
    setMemberSearch("");
    setSearchResults([]);
  };

  const removeMember = (id) => {
    setSelectedMembers(prev => prev.filter(m => m._id !== id));
  };

  const handleCreate = async () => {
    if (!newName.trim()) { Alert.alert("Required", "Enter a group name"); return; }
    if (selectedMembers.length < 2) {
      Alert.alert("Need More Members", "A group needs at least 2 other members (3 people total including you).");
      return;
    }
    setCreating(true);
    try {
      const res = await axios.post(groupChatApi.CHATS, {
        name: newName.trim(),
        createdBy: userId,
        createdByName: userName,
        createdByRole: userRole,
        members: selectedMembers.map(m => m._id),
      });
      setShowCreate(false);
      setNewName("");
      setSelectedMembers([]);
      if (res.data?.chat) {
        navigation.navigate("GroupChatConversation", { chatId: res.data.chat._id, chatName: res.data.chat.name });
      }
      fetchChats();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const timeAgo = (d) => {
    if (!d) return "";
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  const renderChat = ({ item }) => {
    const isOwner = item.createdBy === userId;
    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => navigation.navigate("GroupChatConversation", { chatId: item._id, chatName: item.name })}
        activeOpacity={0.7}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatNameRow}>
            <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
            {isOwner && <Ionicons name="star" size={12} color="#FF6A00" />}
          </View>
          <Text style={styles.chatLastMessage} numberOfLines={1}>
            {item.lastMessageText ? `${item.lastMessageBy}: ${item.lastMessageText}` : "No messages yet"}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          {item.lastMessageAt && <Text style={styles.chatTime}>{timeAgo(item.lastMessageAt)}</Text>}
          <View style={styles.memberBadge}>
            <Ionicons name="people" size={10} color="#94A3B8" />
            <Text style={styles.memberCount}>{item.members?.length || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Group Chats</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#004E93" style={{ marginTop: 40 }} />
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No group chats yet</Text>
          <Text style={styles.emptyDesc}>Create a group to start chatting!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle" size={20} color="#FFF" />
            <Text style={styles.emptyBtnText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item._id}
          renderItem={renderChat}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(); }} colors={["#004E93"]} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => { setShowCreate(false); setSelectedMembers([]); setMemberSearch(""); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group Chat</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setSelectedMembers([]); setMemberSearch(""); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Group Name */}
            <TextInput
              style={styles.modalInput}
              placeholder="Group name..."
              placeholderTextColor="#9CA3AF"
              value={newName}
              onChangeText={setNewName}
              maxLength={50}
            />

            {/* Member Search */}
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#374151", marginTop: 14, marginBottom: 6 }}>
              Add Members (min 2) *
            </Text>
            <View style={[styles.modalInput, { flexDirection: "row", alignItems: "center", paddingVertical: 0 }]}>
              <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: "#1F2937", paddingVertical: 10 }}
                placeholder="Search people..."
                placeholderTextColor="#9CA3AF"
                value={memberSearch}
                onChangeText={handleMemberSearch}
              />
              {searching && <ActivityIndicator size="small" color="#9CA3AF" />}
            </View>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <View style={{ backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, marginTop: 4, maxHeight: 120 }}>
                <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {searchResults.map((u) => (
                    <TouchableOpacity
                      key={u._id || u.id}
                      onPress={() => addMember(u)}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}
                    >
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#3B82F6" }}>{(u.name || "?")[0].toUpperCase()}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F2937", flex: 1 }}>{u.name || u.fullName}</Text>
                      <MaterialIcons name="add-circle-outline" size={18} color="#16A34A" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {selectedMembers.map((m) => (
                  <View key={m._id} style={{
                    flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF",
                    borderRadius: 16, paddingVertical: 4, paddingLeft: 10, paddingRight: 4, gap: 4,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563EB" }}>{m.name}</Text>
                    <TouchableOpacity onPress={() => removeMember(m._id)} style={{ padding: 2 }}>
                      <Ionicons name="close-circle" size={16} color="#93C5FD" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Member count hint */}
            <Text style={{ fontSize: 11, color: selectedMembers.length >= 2 ? "#16A34A" : "#EF4444", marginTop: 6 }}>
              {selectedMembers.length >= 2
                ? `✓ ${selectedMembers.length + 1} people (you + ${selectedMembers.length} members)`
                : `Add at least ${2 - selectedMembers.length} more member${2 - selectedMembers.length > 1 ? "s" : ""}`}
            </Text>

            <View style={[styles.modalActions, { marginTop: 16 }]}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCreate(false); setSelectedMembers([]); setMemberSearch(""); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreate, (!newName.trim() || selectedMembers.length < 2) && styles.modalCreateDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim() || selectedMembers.length < 2 || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalCreateText}>Create ({selectedMembers.length + 1})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 60 : 50, paddingBottom: 16,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#1F2937" },
  createBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#FF6A00",
    justifyContent: "center", alignItems: "center",
  },
  chatCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 16,
    borderWidth: 1, borderColor: "#F3F4F6",
  },
  chatAvatar: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: "#004E93",
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  chatAvatarText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  chatInfo: { flex: 1, marginRight: 8 },
  chatNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  chatName: { fontSize: 15, fontWeight: "700", color: "#1F2937", flex: 1 },
  chatLastMessage: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  chatMeta: { alignItems: "flex-end", gap: 4 },
  chatTime: { fontSize: 10, color: "#9CA3AF" },
  memberBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  memberCount: { fontSize: 10, color: "#94A3B8" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#6B7280", marginTop: 12 },
  emptyDesc: { fontSize: 13, color: "#9CA3AF", marginTop: 4, textAlign: "center" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20,
    backgroundColor: "#004E93", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  modalInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, color: "#1F2937", backgroundColor: "#F9FAFB",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 },
  modalCancel: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  modalCreate: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#004E93" },
  modalCreateDisabled: { opacity: 0.5 },
  modalCreateText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});
