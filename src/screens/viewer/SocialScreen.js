import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Animated,
  Share,
  Dimensions,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  RefreshControl,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  StatusBar,
  TouchableWithoutFeedback
} from "react-native";
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import POSTS from "../../api/posts";
import API from "../../api/api";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get("window");

// --- UTILS ---
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + "y";

  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + "mo";

  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + "d";

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + "h";

  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + "m";

  return Math.floor(seconds) + "s";
};

// --- COMPONENTS ---

// 1. Comment Modal
const CommentModal = ({ visible, onClose, post, onAddComment, isAuthenticated, promptSignIn }) => {
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      promptSignIn("comment on this post");
      return;
    }
    if (!commentText.trim()) return;
    setLoading(true);
    await onAddComment(post._id, commentText);
    setCommentText("");
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={post?.comments || []}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Image
                  source={item.user?.profileImage ? { uri: `${API.SERVER_URL}/${item.user.profileImage}` } : require("../../../assets/profile.jpg")}
                  style={styles.commentAvatar}
                />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{item.user?.name || "User"}</Text>
                    <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              </View>
            )}
            contentContainerStyle={styles.commentList}
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              </View>
            }
          />

          <View style={styles.commentInputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={handleSubmit} disabled={!commentText.trim() || loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#FF6A00" />
              ) : (
                <Text style={[styles.postBtnText, !commentText.trim() && styles.disabledText]}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// 2. Post Item
const PostItem = React.memo(({ item, currentUserId, onLike, onSave, onComment, onShare, onDoubleTap, onImageClick, onMoreOptions }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleLikePress = () => {
    onLike(item._id);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const triggerHeartAnimation = () => {
    heartScale.setValue(0);
    opacityAnim.setValue(1);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ])
    ]).start();
  };

  const handleDoubleTapAction = () => {
    onDoubleTap(item._id);
    triggerHeartAnimation();
  };

  let lastTap = null;
  const handleTouch = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      handleDoubleTapAction();
    } else {
      lastTap = now;
      onImageClick(item);
    }
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.headerLeft}>
          <Image
            source={item.user?.profileImage ? { uri: `${API.SERVER_URL}/${item.user.profileImage}` } : require("../../../assets/default-pfp.jpg")}
            style={styles.postAvatar}
          />
          <View>
            <Text style={styles.postUser}>{item.user?.name || "Unknown"}</Text>
            <Text style={styles.postLocation}>{item.tournamentName || "Tournament"}{item.location ? ` • ${item.location}` : ""}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onMoreOptions(item)}>
          <Feather name="more-horizontal" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={handleTouch}>
        <View style={styles.mediaContainer}>
          <Image
            source={item.linkPreview?.image ? { uri: item.linkPreview.image } : require("../../../assets/fallback.jpg")}
            style={styles.postImage}
            resizeMode="cover"
          />
          <Animated.View style={[styles.heartOverlay, { transform: [{ scale: heartScale }], opacity: opacityAnim }]}>
            <MaterialIcons name="favorite" size={80} color="white" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.actionRow}>
        <View style={styles.actionLeft}>
          <TouchableOpacity onPress={handleLikePress}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <MaterialIcons
                name={item.isLiked ? "favorite" : "favorite-border"}
                size={28}
                color={item.isLiked ? "#FF3040" : "#333"}
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onComment(item)} style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={26} color="#333" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onShare(item)} style={styles.actionBtn}>
            <Ionicons name="paper-plane-outline" size={26} color="#333" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => onSave(item._id)}>
          <FontAwesome5
            name={item.isSaved ? "bookmark" : "bookmark"}
            solid={item.isSaved}
            size={24}
            color={item.isSaved ? "#FF6A00" : "#333"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.postFooter}>
        <Text style={styles.likesText}>{item.likesCount || 0} likes</Text>
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            <Text style={styles.captionUser}>{item.user?.name || "User"} </Text>
            {item.caption}
          </Text>
          {item.tags && item.tags.length > 0 && (
            <Text style={styles.tagsText}>{item.tags.map(t => `#${t}`).join(" ")}</Text>
          )}
        </View>
        {item.comments && item.comments.length > 0 && (
          <TouchableOpacity onPress={() => onComment(item)}>
            <Text style={styles.viewCommentsText}>View all {item.comments.length} comments</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.timeAgoText}>{formatTimeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}, (prev, next) => {
  return prev.item._id === next.item._id &&
    prev.item.isLiked === next.item.isLiked &&
    prev.item.isSaved === next.item.isSaved &&
    prev.item.likesCount === next.item.likesCount &&
    prev.item.comments?.length === next.item.comments?.length;
});

// --- MAIN SCREEN ---
const SocialScreen = ({ navigation }) => {
  const { token, user } = useAuth();
  const currentUserId = user?._id;
  const isAuthenticated = !!token;

  // States
  const [activeTab, setActiveTab] = useState("Home");
  const [activeSubTab, setActiveSubTab] = useState("My Posts");
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState([]);

  const promptSignIn = (action) => {
    Alert.alert("Sign In Required", `Please sign in to ${action}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign In", onPress: () => navigation.navigate("Account") },
    ]);
  };

  const fetchPosts = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      let endpoint = POSTS.ENDPOINTS.GET_ALL;

      if (activeTab === "My Account" && isAuthenticated) {
        endpoint = activeSubTab === "My Posts"
          ? POSTS.ENDPOINTS.BY_USER(user._id)
          : POSTS.ENDPOINTS.SAVED_BY_USER(user._id);
      } else if (activeTab === "My Account" && !isAuthenticated) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      let data = [];
      if (activeTab === "Home") {
        data = response.data;
      } else {
        data = response.data.posts || [];
      }

      const processed = data.map(post => ({
        ...post,
        likesCount: post.likes?.length || 0,
        isLiked: post.likes?.some(like => like._id === currentUserId),
        isSaved: post.saves?.some(save => save._id === currentUserId) ||
          (user?.savedPosts && user.savedPosts.includes(post._id))
      }));

      setPosts(processed);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [activeTab, activeSubTab])
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        const term = searchQuery.toLowerCase();
        const filtered = posts.filter(post =>
          post.caption?.toLowerCase().includes(term) ||
          post.tournamentName?.toLowerCase().includes(term) ||
          post.user?.name?.toLowerCase().includes(term)
        );
        setFilteredPosts(filtered);
      } else {
        setFilteredPosts([]);
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, posts]);

  const handleLike = async (id) => {
    if (!isAuthenticated) {
      promptSignIn("like this post");
      return;
    }
    setPosts(current => current.map(p => {
      if (p._id === id) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }
      return p;
    }));

    try {
      await axios.post(POSTS.ENDPOINTS.LIKE(id), {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { console.error("Like failed", e); }
  };

  const handleDoubleTap = (id) => {
    const post = posts.find(p => p._id === id);
    if (post && !post.isLiked) {
      handleLike(id);
    }
  };

  const handleSave = async (id) => {
    if (!isAuthenticated) {
      promptSignIn("save this post");
      return;
    }
    setPosts(current => current.map(p => {
      if (p._id === id) return { ...p, isSaved: !p.isSaved };
      return p;
    }));

    try {
      await axios.post(POSTS.ENDPOINTS.SAVE(id), {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { console.error("Save failed", e); }
  };

  const handleShare = async (post) => {
    try {
      const message = `🏆 ${post.tournamentName}\n\n${post.caption}\n\nShared via Chalo Khelne`;
      await Share.share({ message });
    } catch (e) { console.error(e); }
  };

  const handleImageClick = (post) => {
    const url = post.link || post.linkPreview?.url;
    if (url) Linking.openURL(url).catch(e => console.error(e));
  };

  const handleComment = (post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  };

  const handleMoreOptions = (post) => {
    const postOwnerId = post.user?._id?.toString();
    const currentId = currentUserId?.toString();
    const isOwner = postOwnerId && currentId && postOwnerId === currentId;

    const options = [];
    if (isOwner) {
      options.push({ text: "Delete Post", style: "destructive", onPress: () => confirmDeletePost(post._id) });
    } else {
      options.push({ text: "Report Post", style: "destructive", onPress: () => Alert.alert("Reported", "Thank you for reporting this post. We will review it shortly.") });
    }
    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Options", "What would you like to do?", options, { cancelable: true });
  };

  const deletePost = async (postId) => {
    try {
      const res = await axios.delete(POSTS.ENDPOINTS.DELETE(postId), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPosts(current => current.filter(p => p._id !== postId));
      }
    } catch (e) { console.error("Delete failed", e); }
  };

  const confirmDeletePost = (postId) => {
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePost(postId) }
    ]);
  };

  const handleAddComment = async (postId, text) => {
    try {
      const res = await axios.post(POSTS.ENDPOINTS.ADD_COMMENT(postId), { text }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setPosts(current => current.map(p => {
          if (p._id === postId) return { ...p, comments: res.data.comments };
          return p;
        }));
        setSelectedPost(prev => ({ ...prev, comments: res.data.comments }));
      }
    } catch (e) { console.error("Comment failed", e); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {commentModalVisible && selectedPost && (
        <CommentModal
          visible={commentModalVisible}
          post={selectedPost}
          onClose={() => setCommentModalVisible(false)}
          onAddComment={handleAddComment}
          isAuthenticated={isAuthenticated}
          promptSignIn={promptSignIn}
        />
      )}

      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity onPress={() => setActiveTab("Home")} style={[styles.tabBtn, activeTab === "Home" && styles.activeTabBtn]}>
            <Text style={[styles.tabText, activeTab === "Home" && styles.activeTabText]}>For You</Text>
            {activeTab === "Home" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab("My Account")} style={[styles.tabBtn, activeTab === "My Account" && styles.activeTabBtn]}>
            <Text style={[styles.tabText, activeTab === "My Account" && styles.activeTabText]}>Profile</Text>
            {activeTab === "My Account" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => promptSignIn("create a post")}>
          <LinearGradient colors={['#FF6A00', '#FF8C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGradient}>
            <MaterialIcons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {activeTab === "My Account" && (
        isAuthenticated ? (
          <View style={styles.subTabContainer}>
            <TouchableOpacity onPress={() => setActiveSubTab("My Posts")} style={[styles.subTab, activeSubTab === "My Posts" && styles.activeSubTab]}>
              <Ionicons name="grid-outline" size={20} color={activeSubTab === "My Posts" ? "#FF6A00" : "#999"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveSubTab("Save Post")} style={[styles.subTab, activeSubTab === "Save Post" && styles.activeSubTab]}>
              <Ionicons name="bookmark-outline" size={20} color={activeSubTab === "Save Post" ? "#FF6A00" : "#999"} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="account-circle" size={80} color="#eee" />
            <Text style={styles.emptyText}>Sign in to view your profile</Text>
            <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate("Account")}>
              <Text style={styles.loginBtnText}>Login</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {activeTab === "Home" && (
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      ) : (
        <FlatList
          data={searchQuery.length > 0 ? filteredPosts : posts}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <PostItem
              item={item}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDoubleTap={handleDoubleTap}
              onComment={handleComment}
              onSave={handleSave}
              onShare={handleShare}
              onMoreOptions={handleMoreOptions}
              onImageClick={handleImageClick}
            />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(true)} colors={["#FF6A00"]} />}
          contentContainerStyle={{ paddingBottom: 80 }}
          ListEmptyComponent={
            activeTab === "Home" || (activeTab === "My Account" && isAuthenticated) ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={60} color="#eee" />
                <Text style={styles.emptyText}>No posts found</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 15,
    backgroundColor: "#fff",
  },
  tabContainer: {
    flexDirection: "row",
    gap: 25,
  },
  tabBtn: {
    position: "relative",
    paddingBottom: 5,
  },
  tabText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#BBB",
  },
  activeTabText: {
    color: "#111",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#FF6A00",
    borderRadius: 2,
  },
  addBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  subTabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  subTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeSubTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF6A00",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6F8",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#999",
    marginTop: 15,
    fontSize: 16,
    textAlign: 'center',
  },
  loginBtn: {
    marginTop: 20,
    backgroundColor: '#FF6A00',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  postCard: {
    backgroundColor: "#fff",
    marginBottom: 10,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    paddingHorizontal: 15,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  postUser: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#222",
  },
  postLocation: {
    fontSize: 11,
    color: "#777",
    marginTop: 1,
  },
  mediaContainer: {
    width: width,
    height: width,
    backgroundColor: "#F9F9F9",
    justifyContent: "center",
    alignItems: "center",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  heartOverlay: {
    position: "absolute",
    zIndex: 10,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    marginLeft: 18,
  },
  postFooter: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  likesText: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#222",
    marginBottom: 5,
  },
  captionContainer: {
    flexDirection: "column",
  },
  captionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: "bold",
    color: "#222",
  },
  tagsText: {
    color: "#0056D2",
    fontSize: 13,
    marginTop: 4,
  },
  viewCommentsText: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
  },
  timeAgoText: {
    color: "#BBB",
    fontSize: 11,
    marginTop: 8,
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: "80%",
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#DDD",
    borderRadius: 3,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 25,
  },
  commentList: {
    padding: 15,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUser: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#222",
  },
  commentTime: {
    color: "#AAA",
    fontSize: 11,
  },
  commentText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 18,
  },
  emptyComments: {
    padding: 40,
    alignItems: "center",
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    paddingBottom: Platform.OS === "ios" ? 35 : 15,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  commentInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F5F6F8",
    borderRadius: 22,
    paddingHorizontal: 18,
    marginRight: 12,
    fontSize: 14,
  },
  postBtnText: {
    color: "#FF6A00",
    fontWeight: "bold",
    fontSize: 15,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default SocialScreen;
