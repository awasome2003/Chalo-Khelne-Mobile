import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  SafeAreaView,
  Animated,
  Modal,
  StatusBar,
  Alert,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";
import POSTS from "../../api/posts";
import STORIES from "../../api/stories";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";

const { width } = Dimensions.get("window");
const numColumns = 3;
const itemSize = width / numColumns;

const SafeImage = ({ uri, style, fallback, ...rest }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : fallback}
      style={style}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

// Resolve a story image to a usable URI. Backend stores a relative path like
// "stories/storyImage-xxx.jpg"; full URLs (or already-prefixed paths) pass through.
const resolveStoryImage = (image) => {
  if (!image) return null;
  return assetUrl(image);
};

// ─── Full-screen story viewer for own stories ────────────────────────────
const StoryViewModal = ({ visible, onClose, stories, initialIndex = 0, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const STORY_DURATION = 5000;

  useEffect(() => {
    if (visible) setCurrentIndex(initialIndex);
    else {
      progress.stopAnimation();
      progress.setValue(0);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (visible && stories && stories.length > 0) startAnimation();
    return () => progress.stopAnimation();
  }, [currentIndex, visible]);

  const startAnimation = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
  };

  const handleNext = () => {
    progress.stopAnimation();
    if (currentIndex < stories.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };
  const handlePrev = () => {
    progress.stopAnimation();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    else startAnimation();
  };

  if (!stories || stories.length === 0) return null;
  const currentStory = stories[currentIndex];
  const imageUri = resolveStoryImage(currentStory.image);

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View
        style={[
          styles.storyFullContainer,
          imageUri
            ? { backgroundColor: "#000" }
            : { backgroundColor: currentStory.bgColor },
        ]}
      >
        <StatusBar hidden />

        <View style={styles.storyProgressContainer}>
          {stories.map((_, i) => (
            <View key={i} style={styles.storyProgressBarWrapper}>
              <Animated.View
                style={[
                  styles.storyProgressBar,
                  {
                    backgroundColor: "#fff",
                    width:
                      i < currentIndex
                        ? "100%"
                        : i === currentIndex
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          })
                        : "0%",
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.storyFullHeader}>
          <View style={styles.storyUserInfo}>
            <Image
              source={
                currentStory.user?.profileImage
                  ? {
                      uri: assetUrl(currentStory.user.profileImage),
                    }
                  : require("../../../assets/default-pfp.jpg")
              }
              style={styles.storyUserAvatar}
            />
            <View>
              <Text style={styles.storyUserName}>
                {currentStory.user?.name || "User"}
              </Text>
              <Text style={styles.storyTime}>Just now</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(currentStory.id)}
                style={{ marginRight: 15 }}
              >
                <Feather name="trash-2" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.storyFullClose}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storyFullContent}>
          <View style={styles.storyNavContainer}>
            <TouchableOpacity style={styles.storyNavBtn} onPress={handlePrev} />
            <TouchableOpacity style={styles.storyNavBtn} onPress={handleNext} />
          </View>

          {imageUri ? (
            <SafeImage
              uri={imageUri}
              style={styles.storyFullImage}
              resizeMode="contain"
              fallback={require("../../../assets/turf.jpg")}
            />
          ) : (
            <Text
              style={[
                styles.storyFullText,
                {
                  fontFamily:
                    currentStory.fontFamily === "System"
                      ? undefined
                      : currentStory.fontFamily,
                },
              ]}
            >
              {currentStory.text}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Screen ─────────────────────────────────────────────────────────────
const SocialProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const userId = user?._id || user?.id;

  const [activeTab, setActiveTab] = useState("Grid"); // "Grid" | "Saved"
  const [myPosts, setMyPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myStories, setMyStories] = useState([]);
  const [viewStoryVisible, setViewStoryVisible] = useState(false);

  const hasStory = myStories.length > 0;

  const loadStories = async () => {
    if (!userId) return;
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await axios.get(STORIES.ENDPOINTS.MINE, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setMyStories(res.data?.stories || []);
    } catch (e) {
      console.error("[SocialProfile] failed to load stories:", e);
      setMyStories([]);
    }
  };

  const fetchProfileData = async (isRefreshing = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (!isRefreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [mineRes, savedRes] = await Promise.all([
        axios.get(POSTS.ENDPOINTS.BY_USER(userId), { headers }),
        axios.get(POSTS.ENDPOINTS.SAVED_BY_USER(userId), { headers }),
      ]);

      const mine = Array.isArray(mineRes.data)
        ? mineRes.data
        : mineRes.data?.posts || [];
      const saved = Array.isArray(savedRes.data)
        ? savedRes.data
        : savedRes.data?.posts || [];

      setMyPosts(mine);
      setSavedPosts(saved);
    } catch (e) {
      console.error("[SocialProfile] failed to fetch profile posts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      loadStories();
    }, [userId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfileData(true);
    loadStories();
  };

  const handlePostPress = (item) => {
    navigation.navigate("SocialHome", {
      initialPostId: item._id,
    });
  };

  const handleDeleteStory = (storyId) => {
    Alert.alert("Delete Story", "Are you sure you want to delete this story?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("auth_token");
            const res = await axios.delete(STORIES.ENDPOINTS.DELETE(storyId), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.data?.success) {
              setMyStories((prev) => {
                const updated = prev.filter((s) => s.id !== storyId);
                if (updated.length === 0) setViewStoryVisible(false);
                return updated;
              });
            }
          } catch (e) {
            console.error("[SocialProfile] delete story failed:", e);
            Alert.alert(
              "Delete failed",
              e.response?.data?.message || e.message
            );
          }
        },
      },
    ]);
  };

  const renderPostItem = ({ item }) => {
    const mediaUrl = item.linkPreview?.image || item.mediaUrl || null;
    const isVideo =
      item.mediaType === "video" ||
      item.linkPreview?.type === "video" ||
      (mediaUrl && /\.(mp4|mov|avi)$/i.test(mediaUrl));

    return (
      <TouchableOpacity
        style={styles.postItem}
        activeOpacity={0.85}
        onPress={() => handlePostPress(item)}
      >
        <Image
          source={
            mediaUrl
              ? { uri: mediaUrl }
              : require("../../../assets/fallback.jpg")
          }
          style={styles.postThumbnail}
          resizeMode="cover"
        />
        {isVideo && (
          <View style={styles.videoOverlay}>
            <Ionicons name="play" size={18} color="#FFF" style={{ marginLeft: 2 }} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const dataToRender = activeTab === "Grid" ? myPosts : savedPosts;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Header — back button only */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#1A181B" />
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile info */}
      <View style={styles.profileInfoContainer}>
        <TouchableOpacity
          activeOpacity={hasStory ? 0.7 : 1}
          onPress={() => {
            if (hasStory) setViewStoryVisible(true);
          }}
        >
          <View
            style={[
              styles.avatarWrapper,
              hasStory && { borderColor: "#15A765" },
            ]}
          >
            <Image
              source={
                user?.profileImage
                  ? { uri: assetUrl(user.profileImage) }
                  : require("../../../assets/default-pfp.jpg")
              }
              style={styles.avatar}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{user?.name || "Player"}</Text>
        <Text style={styles.profileBio}>
          {user?.bio || ""}
        </Text>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Posts</Text>
            <Text style={styles.statValue}>{myPosts.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Followers</Text>
            <Text style={styles.statValue}>{user?.followersCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Following</Text>
            <Text style={styles.statValue}>{user?.followingCount || 0}</Text>
          </View>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Grid" && styles.activeTab]}
          onPress={() => setActiveTab("Grid")}
        >
          <MaterialCommunityIcons
            name={activeTab === "Grid" ? "cube" : "cube-outline"}
            size={26}
            color={activeTab === "Grid" ? "#1A181B" : "#A0A0A0"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Saved" && styles.activeTab]}
          onPress={() => setActiveTab("Saved")}
        >
          <Ionicons
            name={activeTab === "Saved" ? "bookmark" : "bookmark-outline"}
            size={26}
            color={activeTab === "Saved" ? "#1A181B" : "#A0A0A0"}
          />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15A765" />
        </View>
      ) : (
        <FlatList
          data={dataToRender}
          keyExtractor={(item) => item._id}
          numColumns={numColumns}
          renderItem={renderPostItem}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#15A765"]}
              tintColor="#15A765"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name={
                  activeTab === "Grid"
                    ? "image-multiple-outline"
                    : "bookmark-outline"
                }
                size={56}
                color="#D0D0D0"
              />
              <Text style={styles.emptyText}>
                {activeTab === "Grid" ? "No posts yet" : "No saved posts"}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.gridContainer,
            dataToRender.length === 0 && { flex: 1 },
          ]}
        />
      )}

      {/* Story view modal (own stories, delete-capable) */}
      <StoryViewModal
        visible={viewStoryVisible}
        onClose={() => setViewStoryVisible(false)}
        stories={myStories}
        initialIndex={0}
        onDelete={handleDeleteStory}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  profileInfoContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 20,
  },
  avatarWrapper: {
    padding: 4,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 0.5,
    borderColor: "#0000001A",
    backgroundColor: "#eee",
  },
  profileName: {
    fontFamily: "Montserrat",
    fontSize: 18,
    fontWeight: "500",
    color: "#262626",
    marginBottom: 2,
  },
  profileBio: {
    fontFamily: "Poppins",
    fontSize: 14,
    color: "#5D4F5F",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FCFCFD",
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 10,
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EEF1FA",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontFamily: "Montserrat",
    fontSize: 12,
    color: "#666666",
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontFamily: "Montserrat",
    fontSize: 20,
    fontWeight: "600",
    color: "#1A181B",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#1A181B",
  },
  gridContainer: {
    paddingBottom: 80,
  },
  postItem: {
    width: itemSize,
    height: itemSize,
    padding: 1,
  },
  postThumbnail: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
  },
  videoOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 14,
    fontSize: 16,
    color: "#A0A0A0",
    fontFamily: "Poppins",
  },

  // Story view
  storyFullContainer: {
    flex: 1,
    paddingTop: 40,
  },
  storyProgressContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginTop: 10,
    height: 3,
    width: "100%",
    gap: 4,
  },
  storyProgressBarWrapper: {
    flex: 1,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  storyProgressBar: {
    height: "100%",
    width: "100%",
  },
  storyFullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginTop: 15,
  },
  storyUserInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  storyUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#fff",
  },
  storyUserName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  storyTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  storyFullClose: {
    padding: 5,
  },
  storyFullContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    position: "relative",
  },
  storyNavContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 10,
  },
  storyNavBtn: {
    flex: 1,
    height: "100%",
  },
  storyFullImage: {
    width: "100%",
    height: "100%",
  },
  storyFullText: {
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default SocialProfileScreen;
