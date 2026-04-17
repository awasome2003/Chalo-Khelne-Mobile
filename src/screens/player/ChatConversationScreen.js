import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Image, ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, Alert, Modal, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import CHAT from "../../api/chat";
import API from "../../api/api";
import groupChatApi from "../../api/groupChat";

/**
 * Unified conversation screen for both DM and Group chats.
 *
 * Route params:
 * - For DM:    { conversationId, otherUser }
 * - For Group: { chatId, chatName }
 */
const ChatConversationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { getSocket, decrementUnread } = useChat();
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Determine mode from route params
  const { conversationId, otherUser, chatId, chatName } = route.params || {};
  const isGroup = !!chatId;
  const currentUserId = user?._id || user?.id || "";

  // State
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Group-specific state
  const [groupChat, setGroupChat] = useState(null);
  const [userId, setUserId] = useState(currentUserId);
  const [userName, setUserName] = useState(user?.name || "User");
  const [userRole, setUserRole] = useState(user?.role || "Player");
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Load user data from storage for group chat
  useEffect(() => {
    if (!isGroup) return;
    (async () => {
      const userData = await AsyncStorage.getItem("auth_user");
      if (userData) {
        const u = JSON.parse(userData);
        setUserId(u._id || u.id || "");
        setUserName(u.name || "User");
        setUserRole(u.role || "Player");
      }
    })();
  }, [isGroup]);

  // ════════════════════════════════════
  // DATA FETCHING
  // ════════════════════════════════════

  const fetchMessages = async () => {
    try {
      setLoading(true);
      if (isGroup) {
        const res = await axios.get(groupChatApi.MESSAGES(chatId));
        setMessages(res.data?.messages || []);
      } else {
        const response = await fetch(CHAT.ENDPOINTS.MESSAGES(conversationId), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.success) setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupInfo = async () => {
    if (!isGroup) return;
    try {
      const res = await axios.get(groupChatApi.CHAT(chatId));
      setGroupChat(res.data?.chat);
    } catch {}
  };

  const markAsRead = async () => {
    if (isGroup) return;
    try {
      await fetch(CHAT.ENDPOINTS.MARK_READ(conversationId), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      decrementUnread();
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    fetchMessages();
    if (isGroup) fetchGroupInfo();
    else markAsRead();
  }, [isGroup ? chatId : conversationId]));

  // ════════════════════════════════════
  // SOCKET REAL-TIME
  // ════════════════════════════════════

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    if (isGroup) {
      socket.emit("join:gchat", { chatId });
      const onMsg = (msg) => {
        if (msg.chatId !== chatId) return;
        setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]);
      };
      socket.on("gchat:message", onMsg);
      socket.on("gchat:updated", fetchGroupInfo);
      return () => {
        socket.emit("leave:gchat", { chatId });
        socket.off("gchat:message", onMsg);
        socket.off("gchat:updated", fetchGroupInfo);
      };
    } else {
      socket.emit("join:conversation", { conversationId });
      const onMsg = ({ message: newMsg, conversationId: convId }) => {
        if (convId === conversationId) {
          setMessages((prev) => [...prev, newMsg]);
          markAsRead();
        }
      };
      const onTyping = ({ userId: uid, conversationId: convId, isTyping: typing }) => {
        if (convId === conversationId && uid !== currentUserId) setIsTyping(typing);
      };
      socket.on("message:new", onMsg);
      socket.on("user:typing", onTyping);
      return () => {
        socket.emit("leave:conversation", { conversationId });
        socket.off("message:new", onMsg);
        socket.off("user:typing", onTyping);
      };
    }
  }, [isGroup ? chatId : conversationId]);

  // ════════════════════════════════════
  // SEND MESSAGE
  // ════════════════════════════════════

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);

    try {
      if (isGroup) {
        const fd = new FormData();
        fd.append("senderId", userId);
        fd.append("senderName", userName);
        fd.append("senderRole", userRole);
        fd.append("text", msgText);
        await axios.post(groupChatApi.SEND_MESSAGE(chatId), fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Optimistic add
        const tempMsg = {
          _id: `temp_${Date.now()}`,
          sender: { _id: currentUserId, name: user?.name },
          text: msgText,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempMsg]);

        const response = await fetch(CHAT.ENDPOINTS.SEND, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, text: msgText }),
        });
        const data = await response.json();
        if (data.success) {
          setMessages((prev) => prev.map((m) => (m._id === tempMsg._id ? data.message : m)));
        }
      }
    } catch (err) {
      console.error("Error sending:", err);
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (!isGroup) return; // Image only for groups for now
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("senderId", userId);
      fd.append("senderName", userName);
      fd.append("senderRole", userRole);
      fd.append("text", "");
      fd.append("files", { uri: asset.uri, name: asset.fileName || "image.jpg", type: asset.mimeType || "image/jpeg" });
      await axios.post(groupChatApi.SEND_MESSAGE(chatId), fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch { Alert.alert("Error", "Failed to send image"); }
    finally { setSending(false); }
  };

  const handleTextChange = (val) => {
    setText(val);
    if (!isGroup) {
      const socket = getSocket();
      if (socket) {
        socket.emit("user:typing", { conversationId, isTyping: true });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("user:typing", { conversationId, isTyping: false });
        }, 2000);
      }
    }
  };

  // ════════════════════════════════════
  // GROUP MANAGEMENT
  // ════════════════════════════════════

  const isOwner = isGroup && groupChat?.createdBy === userId;

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(groupChatApi.SEARCH_USERS, { params: { q } });
      const memberIds = (groupChat?.members || []).map((m) => m.userId);
      setSearchResults((res.data?.users || []).filter((u) => !memberIds.includes(u._id)));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddMember = async (u) => {
    try {
      await axios.post(groupChatApi.ADD_MEMBER(chatId), { requesterId: userId, userId: u._id, name: u.name, role: u.role || "Player" });
      setSearchResults(searchResults.filter((x) => x._id !== u._id));
      fetchGroupInfo();
      Alert.alert("Added", `${u.name} added`);
    } catch (err) { Alert.alert("Error", err.response?.data?.message || "Failed"); }
  };

  const handleRemoveMember = (memberId, memberName) => {
    Alert.alert("Remove", `Remove ${memberName}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await axios.post(groupChatApi.REMOVE_MEMBER(chatId), { requesterId: userId, userId: memberId }); fetchGroupInfo(); }
        catch (err) { Alert.alert("Error", err.response?.data?.message || "Failed"); }
      }},
    ]);
  };

  const handleDeleteChat = () => {
    Alert.alert("Delete Group", "Delete group and all messages?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await axios.delete(groupChatApi.CHAT(chatId), { data: { requesterId: userId } }); navigation.goBack(); }
        catch (err) { Alert.alert("Error", err.response?.data?.message || "Failed"); }
      }},
    ]);
  };

  const handleRename = async () => {
    if (!newGroupName.trim()) return;
    try {
      await axios.put(groupChatApi.RENAME(chatId), {
        requesterId: userId,
        name: newGroupName.trim(),
      });
      fetchGroupInfo();
      setShowRename(false);
      setNewGroupName("");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to rename");
    }
  };

  // ════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════

  const getProfileImage = (u) => {
    if (!u?.profileImage) return null;
    const img = u.profileImage.replace(/\\/g, "/").replace(/^\.?\/?uploads\//i, "");
    return `${API.SERVER_URL}/uploads/${img}`;
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isNewDay = (curr, prev) => {
    if (!prev) return true;
    return new Date(curr).toDateString() !== new Date(prev).toDateString();
  };

  const formatDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "long", day: "numeric" });
  };

  const getSenderId = (msg) => isGroup ? msg.senderId : (msg.sender?._id || msg.sender);
  const getSenderName = (msg) => isGroup ? msg.senderName : (msg.sender?.name || "");
  const isMine = (msg) => getSenderId(msg) === (isGroup ? userId : currentUserId);

  // ════════════════════════════════════
  // RENDER
  // ════════════════════════════════════

  const headerTitle = isGroup ? (chatName || groupChat?.name || "Group") : (otherUser?.name || "Chat");
  const headerSub = isGroup
    ? `${groupChat?.members?.length || 0} members${isOwner ? " · You own this" : ""}`
    : (isTyping ? "typing..." : "");
  const profileUri = !isGroup ? getProfileImage(otherUser) : null;

  const renderMessage = ({ item, index }) => {
    const mine = isMine(item);
    const showDate = isNewDay(item.createdAt, index > 0 ? messages[index - 1]?.createdAt : null);

    return (
      <>
        {showDate && (
          <View style={styles.dateSep}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, mine && styles.msgRowRight]}>
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
            {/* Sender name in groups */}
            {isGroup && !mine && (
              <View style={styles.senderRow}>
                <Text style={styles.senderName}>{getSenderName(item)}</Text>
                {item.senderRole && <Text style={styles.senderRole}>{item.senderRole}</Text>}
              </View>
            )}
            {item.text ? <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.text}</Text> : null}
            {item.attachments?.map((att, i) => (
              <Image key={i} source={{ uri: att.url?.startsWith("http") ? att.url : `${API.SERVER_URL}/${att.url}` }}
                style={styles.attachImg} resizeMode="cover" />
            ))}
            <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        {isGroup ? (
          <View style={styles.groupAvatarSmall}>
            <Ionicons name="people" size={18} color="#FFF" />
          </View>
        ) : (
          <Image source={profileUri ? { uri: profileUri } : require("../../../assets/profile.jpg")} style={styles.headerAvatar} />
        )}

        <TouchableOpacity style={styles.headerInfo} onPress={isGroup ? () => setShowMembers(true) : undefined} activeOpacity={isGroup ? 0.7 : 1}>
          <Text style={styles.headerName} numberOfLines={1}>{headerTitle}</Text>
          {headerSub ? <Text style={[styles.headerSub, !isGroup && isTyping && styles.typingText]}>{headerSub}</Text> : null}
        </TouchableOpacity>

        {isGroup && (
          <View style={styles.headerActions}>
            {isOwner && (
              <>
                <TouchableOpacity onPress={() => { setNewGroupName(groupChat?.name || ""); setShowRename(true); }} style={styles.headerBtn}>
                  <Ionicons name="create-outline" size={20} color="#004E93" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAddMember(true)} style={styles.headerBtn}>
                  <Ionicons name="person-add" size={20} color="#004E93" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteChat} style={styles.headerBtn}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setShowMembers(true)} style={styles.headerBtn}>
              <Ionicons name="people-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Messages */}
      <View style={styles.flex1}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#004E93" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyMsg}>
                <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Say hello!</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          {isGroup && (
            <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
              <Ionicons name="image-outline" size={22} color="#6B7280" />
            </TouchableOpacity>
          )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={text}
              onChangeText={handleTextChange}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ══ GROUP MODALS ══ */}

      {/* Members */}
      {isGroup && (
        <Modal visible={showMembers} transparent animationType="slide" onRequestClose={() => setShowMembers(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Members ({groupChat?.members?.length || 0})</Text>
                <TouchableOpacity onPress={() => setShowMembers(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 400 }}>
                {(groupChat?.members || []).map((m) => (
                  <View key={m.userId} style={styles.memberRow}>
                    <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{m.name?.charAt(0)?.toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        {m.userId === groupChat?.createdBy && <Ionicons name="star" size={12} color="#FF6A00" />}
                      </View>
                      <Text style={styles.memberRole}>{m.role}</Text>
                    </View>
                    {isOwner && m.userId !== groupChat?.createdBy && (
                      <TouchableOpacity onPress={() => handleRemoveMember(m.userId, m.name)}>
                        <Ionicons name="remove-circle-outline" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Member */}
      {isGroup && (
        <Modal visible={showAddMember} transparent animationType="slide" onRequestClose={() => setShowAddMember(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Member</Text>
                <TouchableOpacity onPress={() => { setShowAddMember(false); setSearchQuery(""); setSearchResults([]); }}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <TextInput style={styles.searchInput} value={searchQuery} onChangeText={handleSearch}
                placeholder="Search by name..." placeholderTextColor="#9CA3AF" autoFocus />
              <ScrollView style={{ maxHeight: 300 }}>
                {searching && <ActivityIndicator size="small" color="#004E93" style={{ marginVertical: 20 }} />}
                {!searching && searchQuery.length >= 1 && searchResults.length === 0 && (
                  <Text style={styles.noResults}>No users found</Text>
                )}
                {searchResults.map((u) => (
                  <View key={u._id} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: "#004E93" }]}>
                      <Text style={styles.memberAvatarText}>{u.name?.charAt(0)?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{u.name}</Text>
                      <Text style={styles.memberRole}>{u.role} {u.email && `· ${u.email}`}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleAddMember(u)} style={styles.addBtn}>
                      <Text style={styles.addBtnText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Rename Group Modal */}
      {isGroup && (
        <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => setShowRename(false)}>
          <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
            <View style={styles.renameModal}>
              <Text style={styles.modalTitle}>Rename Group</Text>
              <TextInput
                style={styles.searchInput}
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Enter new group name..."
                placeholderTextColor="#9CA3AF"
                autoFocus
                maxLength={50}
              />
              <View style={styles.renameActions}>
                <TouchableOpacity onPress={() => { setShowRename(false); setNewGroupName(""); }} style={styles.renameCancelBtn}>
                  <Text style={styles.renameCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRename} disabled={!newGroupName.trim()} style={[styles.renameSaveBtn, !newGroupName.trim() && { opacity: 0.4 }]}>
                  <Text style={styles.renameSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 4 },
  headerAvatar: { width: 42, height: 42, borderRadius: 16, backgroundColor: "#EEE", marginRight: 10 },
  groupAvatarSmall: { width: 42, height: 42, borderRadius: 16, backgroundColor: "#FF6A00", justifyContent: "center", alignItems: "center", marginRight: 10 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: "700", color: "#1F2937" },
  headerSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  typingText: { color: "#004E93", fontStyle: "italic" },
  headerActions: { flexDirection: "row", gap: 2 },
  headerBtn: { padding: 6 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  messagesContent: { paddingHorizontal: 14, paddingVertical: 8, flexGrow: 1, justifyContent: "flex-end" },
  emptyMsg: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 100 },
  emptyText: { fontSize: 16, color: "#9CA3AF", marginTop: 12 },
  dateSep: { alignItems: "center", marginVertical: 14 },
  dateText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", backgroundColor: "#E5E7EB", paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10 },
  msgRow: { marginBottom: 4 },
  msgRowRight: { alignItems: "flex-end" },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMine: { backgroundColor: "#004E93", borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: "#FFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E5E7EB" },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  senderName: { fontSize: 11, fontWeight: "700", color: "#004E93" },
  senderRole: { fontSize: 9, color: "#9CA3AF", backgroundColor: "#F3F4F6", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 21, color: "#1F2937" },
  msgTextMine: { color: "#FFF" },
  msgTime: { fontSize: 10, marginTop: 3, alignSelf: "flex-end", color: "#9CA3AF" },
  msgTimeMine: { color: "rgba(255,255,255,0.6)" },
  attachImg: { width: 200, height: 150, borderRadius: 12, marginTop: 6 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 10, paddingTop: 8,
    backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB", gap: 6,
  },
  attachBtn: { padding: 8, marginBottom: 2 },
  inputContainer: { flex: 1, backgroundColor: "#F3F4F6", borderRadius: 22, paddingHorizontal: 16, paddingVertical: Platform.OS === "ios" ? 10 : 6, maxHeight: 100 },
  input: { fontSize: 15, color: "#1F2937", maxHeight: 80 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#004E93", justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { backgroundColor: "#B0C4DE" },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modal: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FF6A00", justifyContent: "center", alignItems: "center" },
  memberAvatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  memberName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  memberRole: { fontSize: 11, color: "#9CA3AF" },
  searchInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#1F2937", backgroundColor: "#F9FAFB", marginBottom: 12 },
  noResults: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20, fontSize: 13 },
  addBtn: { backgroundColor: "#004E93", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  renameModal: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, marginHorizontal: 30, alignSelf: "center", width: "85%" },
  renameActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 },
  renameCancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6" },
  renameCancelText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  renameSaveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: "#004E93" },
  renameSaveText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
});

export default ChatConversationScreen;
