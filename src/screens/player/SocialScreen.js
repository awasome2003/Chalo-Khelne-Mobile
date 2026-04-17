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
import Add from "./AddPopUp";
import POSTS from "../../api/posts";
import API from "../../api/api";
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from "expo-sharing";

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
const CommentModal = ({ visible, onClose, post, onAddComment }) => {
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!commentText.trim()) return;
    setLoading(true);
    await onAddComment(post._id, commentText);
    setCommentText("");
    setLoading(false);
    // don't close automatically for faster chatting
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

  // Trigger double tap animation externally
  useEffect(() => {
    // This needs a trigger from parent or internal handling. 
    // Implementing internal double tap logic within the image touchable area.
  }, [item.isLiked]);

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

  // Double tap logic
  let lastTap = null;
  const handleTouch = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && (now - lastTap) < DOUBLE_PRESS_DELAY) {
      handleDoubleTapAction();
    } else {
      lastTap = now;
      // Single tap can open image link
      onImageClick(item);
    }
  };

  return (
    <View style={styles.postCard}>
      {/* Header */}
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

      {/* Media */}
      <TouchableWithoutFeedback onPress={handleTouch}>
        <View style={styles.mediaContainer}>
          <Image
            source={item.linkPreview?.image ? { uri: item.linkPreview.image } : require("../../../assets/fallback.jpg")}
            style={styles.postImage}
            resizeMode="cover"
          />
          {/* Animated Heart Overlay */}
          <Animated.View style={[styles.heartOverlay, { transform: [{ scale: heartScale }], opacity: opacityAnim }]}>
            <MaterialIcons name="favorite" size={80} color="white" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      {/* Actions */}
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

      {/* Stats & Caption */}
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
const Social = ({ navigation }) => {
  const { token, isAuthenticated, user } = useAuth();
  const currentUserId = user?._id;
  const route = useRoute();

  // States
  const [activeTab, setActiveTab] = useState("Home");
  const [activeSubTab, setActiveSubTab] = useState("My Posts");
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false); // Create Post Modal
  const [commentModalVisible, setCommentModalVisible] = useState(false); // Comment Modal
  const [selectedPost, setSelectedPost] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filteredPosts, setFilteredPosts] = useState([]);

  // Data fetching
  const fetchPosts = async (isRefreshing = false) => {
    if (isRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const endpoint = activeTab === "Home"
        ? POSTS.ENDPOINTS.GET_ALL
        : activeSubTab === "My Posts"
          ? POSTS.ENDPOINTS.BY_USER(user._id)
          : POSTS.ENDPOINTS.SAVED_BY_USER(user._id);

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let data = [];
      if (activeTab === "Home") {
        data = response.data;
      } else {
        data = response.data.posts || [];
      }

      // Process data
      // If viewing saved posts, all posts are saved by definition
      const isViewingSaved = activeTab === "My Account" && activeSubTab === "Save Post";

      const processed = data.map(post => ({
        ...post,
        likesCount: post.likes?.length || 0,
        isLiked: post.likes?.some(like => like._id === currentUserId || like.toString() === currentUserId),
        isSaved: isViewingSaved ? true : (
          post.saves?.some(save => (save._id || save).toString() === currentUserId) ||
          (user?.savedPosts && user.savedPosts.some(sp => (sp._id || sp).toString() === post._id?.toString()))
        ),
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

  // Search Capability
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

  // Actions
  const handleLike = async (id) => {
    // Optimistic update
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
    } catch (e) {
      // Revert if error
      console.error("Like failed", e);
    }
  };

  const handleDoubleTap = (id) => {
    const post = posts.find(p => p._id === id);
    if (post && !post.isLiked) {
      handleLike(id);
    }
  };

  const handleSave = async (id) => {
    // Optimistic
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
    // Robust check for ownership using string comparison
    const postOwnerId = post.user?._id?.toString();
    const currentId = currentUserId?.toString();
    const isOwner = postOwnerId && currentId && postOwnerId === currentId;

    const options = [];
    if (isOwner) {
      options.push({
        text: "Delete Post",
        style: "destructive",
        onPress: () => confirmDeletePost(post._id)
      });
    } else {
      options.push({
        text: "Report Post",
        style: "destructive",
        onPress: () => Alert.alert("Reported", "Thank you for reporting this post. We will review it shortly.")
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(
      "Options",
      "What would you like to do?",
      options,
      { cancelable: true }
    );
  };

  const confirmDeletePost = (postId) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePost(postId)
        }
      ]
    );
  };

  const deletePost = async (postId) => {
    try {
      const res = await axios.delete(POSTS.ENDPOINTS.DELETE(postId), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setPosts(current => current.filter(p => p._id !== postId));
      }
    } catch (e) {
      console.error("Delete failed", e);
      Alert.alert("Error", "Could not delete post");
    }
  };

  const handleAddComment = async (postId, text) => {
    try {
      const res = await axios.post(POSTS.ENDPOINTS.ADD_COMMENT(postId), { text }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        // Update local state
        setPosts(current => current.map(p => {
          if (p._id === postId) {
            return { ...p, comments: res.data.comments };
          }
          return p;
        }));

        // Also update selected post for modal
        setSelectedPost(prev => ({ ...prev, comments: res.data.comments }));
      }
    } catch (e) {
      console.error("Comment failed", e);
      Alert.alert("Error", "Could not post comment");
    }
  };

  // Render
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Create Post Modal */}
      {modalVisible && <Add visible={modalVisible} onClose={() => setModalVisible(false)} onPostCreated={() => fetchPosts(true)} />}

      {/* Comment Modal */}
      {commentModalVisible && selectedPost && (
        <CommentModal
          visible={commentModalVisible}
          post={selectedPost}
          onClose={() => setCommentModalVisible(false)}
          onAddComment={handleAddComment}
        />
      )}

      {/* Header */}
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

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <LinearGradient colors={['#FF6A00', '#FF8C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtnGradient}>
            <MaterialIcons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Sub-tabs for My Account */}
      {activeTab === "My Account" && (
        <View style={styles.subTabContainer}>
          <TouchableOpacity onPress={() => setActiveSubTab("My Posts")} style={[styles.subTab, activeSubTab === "My Posts" && styles.activeSubTab]}>
            <Ionicons name="grid-outline" size={20} color={activeSubTab === "My Posts" ? "#FF6A00" : "#999"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveSubTab("Save Post")} style={[styles.subTab, activeSubTab === "Save Post" && styles.activeSubTab]}>
            <Ionicons name="bookmark-outline" size={20} color={activeSubTab === "Save Post" ? "#FF6A00" : "#999"} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
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

      {/* Feed */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      ) : (
        <FlatList
          data={searchQuery.length > 0 ? filteredPosts : posts}
          keyExtractor={item => item._id}
          // ListHeaderComponent={() => (
          //   <>
          //     {activeTab === "Home" && (
          //       <View style={styles.storiesContainer}>
          //         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
          //           <TouchableOpacity style={styles.storyWrapper} onPress={() => setModalVisible(true)}>
          //             <View style={[styles.storyCircle, { borderColor: '#ddd' }]}>
          //               <Image source={user?.profileImage ? { uri: `${API.SERVER_URL}/${user.profileImage}` } : require("../../../assets/default-pfp.jpg")} style={styles.storyImage} />
          //               <View style={styles.addStoryBtn}>
          //                 <MaterialIcons name="add" size={14} color="#fff" />
          //               </View>
          //             </View>
          //             <Text style={styles.storyName}>Your Story</Text>
          //           </TouchableOpacity>

          //           {/* Mock Stories for Social Media Feel */}
          //           {['Live: Final', 'Under 19', 'Pro League', 'Highlights', 'Open Tourney'].map((name, i) => (
          //             <View key={i} style={styles.storyWrapper}>
          //               <LinearGradient colors={['#FF6A00', '#EE0979']} style={styles.storyGradient}>
          //                 <View style={styles.storyCircleInner}>
          //                   <Image source={{ uri: `https://i.pravatar.cc/150?u=${i + 10}` }} style={styles.storyImage} />
          //                 </View>
          //               </LinearGradient>
          //               <Text style={styles.storyName} numberOfLines={1}>{name}</Text>
          //             </View>
          //           ))}
          //         </ScrollView>
          //       </View>
          //     )}
          //   </>
          // )}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Platform.OS === "android" ? 0 : 40,
    backgroundColor: "#fff",
  },
  tabContainer: {
    flexDirection: "row",
    gap: 20,
  },
  tabBtn: {
    position: "relative",
    paddingBottom: 4,
  },
  tabText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
  },
  activeTabText: {
    color: "#000",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -6,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#FF6A00",
    borderRadius: 2,
  },
  addBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  subTabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
    padding: 12,
    backgroundColor: "#fff",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
  },

  // Post Card Styles
  postCard: {
    marginBottom: 4,
    backgroundColor: "#fff",
    borderBottomWidth: 8, // Separator like functionality
    borderBottomColor: "#f8f8f8",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#eee",
  },
  postUser: {
    fontWeight: "700",
    fontSize: 14,
    color: "#262626",
  },
  postLocation: {
    fontSize: 11,
    color: "#666",
    marginTop: 1,
  },
  mediaContainer: {
    width: width,
    height: width, // Square aspect ratio typically or adjust based on content
    backgroundColor: "#f0f0f0",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  heartOverlay: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    // Touch target size
  },
  postFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  likesText: {
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  captionContainer: {
    marginBottom: 6,
  },
  captionText: {
    fontSize: 14,
    lineHeight: 18,
    color: "#262626",
  },
  captionUser: {
    fontWeight: "700",
  },
  tagsText: {
    color: "#00376b",
    fontSize: 14,
    marginTop: 2,
  },
  viewCommentsText: {
    color: "#999",
    fontSize: 14,
    marginBottom: 4,
  },
  timeAgoText: {
    color: "#999",
    fontSize: 10,
    textTransform: "uppercase",
  },

  // Stories Styles
  storiesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  storiesScroll: {
    paddingHorizontal: 12,
  },
  storyWrapper: {
    alignItems: "center",
    marginRight: 15,
    width: 70,
  },
  storyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  storyCircleInner: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  storyGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  addStoryBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6A00",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  storyName: {
    fontSize: 11,
    marginTop: 4,
    color: "#262626",
    textAlign: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    position: "relative",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    marginBottom: 10,
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: 16,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  commentList: {
    padding: 16,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    gap: 8,
    alignItems: "baseline",
  },
  commentUser: {
    fontWeight: "700",
    fontSize: 13,
  },
  commentTime: {
    fontSize: 11,
    color: "#999",
  },
  commentText: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
  },
  commentInputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
  },
  postBtnText: {
    color: "#FF6A00",
    fontWeight: "700",
    fontSize: 15,
  },
  disabledText: {
    opacity: 0.5,
  },
  emptyComments: {
    padding: 40,
    alignItems: "center",
  },
});

export default Social;