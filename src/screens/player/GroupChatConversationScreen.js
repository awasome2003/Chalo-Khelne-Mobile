import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Modal,
  ScrollView, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import groupChatApi from "../../api/groupChat";
import { getSocket, initSocket } from "../../context/ChatContext";

export default function GroupChatConversationScreen({ route, navigation }) {
  const { chatId, chatName } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [chat, setChat] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const flatListRef = useRef(null);

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

  const fetchChat = async () => {
    try {
      const res = await axios.get(groupChatApi.CHAT(chatId));
      setChat(res.data?.chat);
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(groupChatApi.MESSAGES(chatId));
      setMessages(res.data?.messages || []);
    } catch (err) {
      console.error("Error fetching messages:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (chatId) { fetchChat(); fetchMessages(); }
  }, [chatId]));

  // Socket real-time
  useEffect(() => {
    let socket;
    try { socket = getSocket() || initSocket(); } catch { return; }
    if (!socket) return;

    socket.emit("join:gchat", { chatId });

    const onMessage = (msg) => {
      if (msg.chatId !== chatId) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("gchat:message", onMessage);
    socket.on("gchat:updated", () => fetchChat());

    return () => {
      socket.emit("leave:gchat", { chatId });
      socket.off("gchat:message", onMessage);
      socket.off("gchat:updated");
    };
  }, [chatId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("senderId", userId);
      fd.append("senderName", userName);
      fd.append("senderRole", userRole);
      fd.append("text", text.trim());
      await axios.post(groupChatApi.SEND_MESSAGE(chatId), fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setText("");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.7,
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
    } catch (err) {
      Alert.alert("Error", "Failed to send image");
    } finally {
      setSending(false);
    }
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await axios.get(groupChatApi.SEARCH_USERS, { params: { q } });
      const memberIds = (chat?.members || []).map((m) => m.userId);
      setSearchResults((res.data?.users || []).filter((u) => !memberIds.includes(u._id)));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const handleAddMember = async (user) => {
    try {
      await axios.post(groupChatApi.ADD_MEMBER(chatId), {
        requesterId: userId, userId: user._id, name: user.name, role: user.role || "Player",
      });
      setSearchResults(searchResults.filter((u) => u._id !== user._id));
      fetchChat();
      Alert.alert("Added", `${user.name} added to the group`);
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    Alert.alert("Remove Member", `Remove ${memberName} from this group?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await axios.post(groupChatApi.REMOVE_MEMBER(chatId), { requesterId: userId, userId: memberId });
            fetchChat();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed");
          }
        },
      },
    ]);
  };

  const handleDeleteChat = () => {
    Alert.alert("Delete Group", "This will permanently delete the group and all messages.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(groupChatApi.CHAT(chatId), { data: { requesterId: userId } });
            navigation.goBack();
          } catch (err) {
            Alert.alert("Error", err.response?.data?.message || "Failed");
          }
        },
      },
    ]);
  };

  const handleRename = async () => {
    if (!newGroupName.trim()) return;
    try {
      await axios.put(groupChatApi.RENAME(chatId), {
        requesterId: userId,
        name: newGroupName.trim(),
      });
      fetchChat();
      setShowRename(false);
      setNewGroupName("");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to rename");
    }
  };

  const isOwner = chat?.createdBy === userId;

  const renderMessage = ({ item }) => {
    const isOwn = item.senderId === userId;
    return (
      <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
        <View style={[styles.msgBubble, isOwn ? styles.msgBubbleOwn : styles.msgBubbleOther]}>
          {!isOwn && (
            <View style={styles.senderRow}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              <Text style={styles.senderRole}>{item.senderRole}</Text>
            </View>
          )}
          {item.text ? <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>{item.text}</Text> : null}
          {item.attachments?.map((att, i) => (
            <Image key={i} source={{ uri: att.url?.startsWith("http") ? att.url : `${groupChatApi.BASE.replace("/api/group-chat", "")}/${att.url}` }}
              style={styles.attachImage} resizeMode="cover" />
          ))}
          <Text style={[styles.msgTime, isOwn && styles.msgTimeOwn]}>
            {new Date(item.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerInfo} onPress={() => setShowMembers(true)}>
          <Text style={styles.headerName} numberOfLines={1}>{chatName || chat?.name}</Text>
          <Text style={styles.headerSub}>{chat?.members?.length || 0} members · Tap for info</Text>
        </TouchableOpacity>
        {isOwner && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => { setNewGroupName(chat?.name || ""); setShowRename(true); }} style={styles.headerBtn}>
              <Ionicons name="create-outline" size={20} color="#004E93" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddMember(true)} style={styles.headerBtn}>
              <Ionicons name="person-add" size={20} color="#004E93" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteChat} style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Messages */}
        {loading ? (
          <ActivityIndicator size="large" color="#004E93" style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyMsg}>
                <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyMsgText}>No messages yet. Say hello!</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={[styles.inputBar, { paddingBottom: Platform.OS === 'ios' ? 20 : 10 }]}>
          <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
            <Ionicons name="image-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          >
            {sending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Members Modal */}
      <Modal visible={showMembers} transparent animationType="slide" onRequestClose={() => setShowMembers(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.membersModal}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Members ({chat?.members?.length || 0})</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {(chat?.members || []).map((m) => (
                <View key={m.userId} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>{m.name?.charAt(0)?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={styles.memberName}>{m.name}</Text>
                      {m.userId === chat?.createdBy && <Ionicons name="star" size={12} color="#FF6A00" />}
                    </View>
                    <Text style={styles.memberRole}>{m.role}</Text>
                  </View>
                  {isOwner && m.userId !== chat?.createdBy && (
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

      {/* Add Member Modal */}
      <Modal visible={showAddMember} transparent animationType="slide" onRequestClose={() => setShowAddMember(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.membersModal}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Add Member</Text>
              <TouchableOpacity onPress={() => { setShowAddMember(false); setSearchQuery(""); setSearchResults([]); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name..."
              placeholderTextColor="#9CA3AF"
              autoFocus
            />
            <ScrollView style={{ maxHeight: 300 }}>
              {searching && <ActivityIndicator size="small" color="#004E93" style={{ marginVertical: 20 }} />}
              {!searching && searchQuery.length >= 1 && searchResults.length === 0 && (
                <Text style={styles.noResults}>No users found</Text>
              )}
              {searchResults.map((user) => (
                <View key={user._id} style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: "#004E93" }]}>
                    <Text style={styles.memberAvatarText}>{user.name?.charAt(0)?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{user.name}</Text>
                    <Text style={styles.memberRole}>{user.role} {user.email && `· ${user.email}`}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleAddMember(user)} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rename Group Modal */}
      <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => setShowRename(false)}>
        <View style={[styles.modalOverlay, { justifyContent: "center" }]}>
          <View style={styles.renameModal}>
            <Text style={styles.membersTitle}>Rename Group</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFF",
    paddingHorizontal: 12, paddingTop: Platform.OS === "ios" ? 56 : 46, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: "#E5E7EB", gap: 8,
  },
  backBtn: { padding: 6 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  headerSub: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { padding: 8 },
  messageList: { paddingHorizontal: 12, paddingVertical: 8 },
  msgRow: { marginBottom: 6 },
  msgRowOwn: { alignItems: "flex-end" },
  msgBubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  msgBubbleOwn: { backgroundColor: "#004E93", borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: "#FFF", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#E5E7EB" },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  senderName: { fontSize: 11, fontWeight: "700", color: "#004E93" },
  senderRole: { fontSize: 9, color: "#9CA3AF", backgroundColor: "#F3F4F6", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  msgText: { fontSize: 14, color: "#1F2937", lineHeight: 20 },
  msgTextOwn: { color: "#FFF" },
  msgTime: { fontSize: 9, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
  msgTimeOwn: { color: "rgba(255,255,255,0.5)" },
  attachImage: { width: 200, height: 150, borderRadius: 12, marginTop: 6 },
  emptyMsg: { alignItems: "center", paddingVertical: 60 },
  emptyMsgText: { fontSize: 14, color: "#9CA3AF", marginTop: 8 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", backgroundColor: "#FFF",
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#E5E7EB", gap: 8,
  },
  attachBtn: { padding: 8 },
  textInput: {
    flex: 1, maxHeight: 100, backgroundColor: "#F3F4F6", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: "#1F2937",
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#004E93", justifyContent: "center", alignItems: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  membersModal: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  membersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  membersTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#004E93", justifyContent: "center", alignItems: "center" },
  memberAvatarText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
  memberName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  memberRole: { fontSize: 11, color: "#9CA3AF" },
  searchInput: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, color: "#1F2937", backgroundColor: "#F9FAFB", marginBottom: 12,
  },
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
