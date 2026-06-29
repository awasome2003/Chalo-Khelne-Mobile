import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/api";
import POSTS from "../../api/posts";
import { assetUrl } from "../../utils/assetUrl";

const { width } = Dimensions.get("window");
const COLS = 3;
const TILE = width / COLS;

const AVATAR_FALLBACK = require("../../../assets/ProfilePlaceholder.png");

// Remote image that falls back to a bundled placeholder on error.
const SafeImage = ({ uri, style, fallback }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={uri && !failed ? { uri } : fallback}
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

const postMedia = (post) => {
  const raw = post?.linkPreview?.image || post?.mediaUrl || null;
  return raw ? assetUrl(raw) : null;
};

const PlayerPublicProfile = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const params = route.params || {};
  const userId = params.userId || params.user?._id || params.user?.id;

  // Seed with whatever the caller passed (search result) so the header isn't
  // blank while the status request is in flight.
  const [profile, setProfile] = useState(params.user || null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statusRes, postsRes] = await Promise.all([
        axios.get(API.ENDPOINTS.FOLLOW.STATUS(userId)),
        axios.get(POSTS.ENDPOINTS.BY_USER(userId)),
      ]);

      const s = statusRes.data || {};
      if (s.user) setProfile((prev) => ({ ...prev, ...s.user }));
      setIsFollowing(!!s.isFollowing);
      setIsSelf(!!s.isSelf || String(userId) === String(me?._id || me?.id));
      setFollowers(s.followersCount || 0);
      setFollowing(s.followingCount || 0);

      const body = postsRes.data;
      setPosts(Array.isArray(body) ? body : body?.posts || []);
    } catch (err) {
      console.error("[PlayerPublicProfile] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, me]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleFollow = async () => {
    if (toggling || isSelf || !userId) return;
    setToggling(true);
    // Optimistic flip.
    const prevFollowing = isFollowing;
    setIsFollowing(!prevFollowing);
    setFollowers((c) => Math.max(0, c + (prevFollowing ? -1 : 1)));
    try {
      const res = await axios.post(API.ENDPOINTS.FOLLOW.TOGGLE(userId));
      const d = res.data || {};
      // Reconcile with the server's authoritative values.
      if (typeof d.following === "boolean") setIsFollowing(d.following);
      if (typeof d.followersCount === "number") setFollowers(d.followersCount);
      if (typeof d.followingCount === "number") setFollowing(d.followingCount);
    } catch (err) {
      console.error("[PlayerPublicProfile] follow toggle failed:", err);
      // Revert on failure.
      setIsFollowing(prevFollowing);
      setFollowers((c) => Math.max(0, c + (prevFollowing ? 1 : -1)));
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setToggling(false);
    }
  };

  const name = profile?.name || "Player";
  const role = profile?.role || "Player";
  const bio = profile?.bio || "";
  const avatar = profile?.profileImage ? assetUrl(profile.profileImage) : null;

  const Stat = ({ value, label }) => (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const Header = () => (
    <View style={styles.headerBlock}>
      <View style={styles.topRow}>
        <SafeImage uri={avatar} style={styles.avatar} fallback={AVATAR_FALLBACK} />
        <View style={styles.statsRow}>
          <Stat value={posts.length} label="Posts" />
          <Stat value={followers} label="Followers" />
          <Stat value={following} label="Following" />
        </View>
      </View>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.role}>{role}</Text>
      {!!bio && <Text style={styles.bio}>{bio}</Text>}

      {!isSelf && (
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={toggleFollow}
          disabled={toggling}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.followBtnText,
              isFollowing && styles.followingBtnText,
            ]}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.gridTitle}>Posts</Text>
    </View>
  );

  const renderPost = ({ item }) => {
    const uri = postMedia(item);
    return (
      <TouchableOpacity
        style={styles.tile}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("SocialHome", { initialPostId: item._id })
        }
      >
        {uri ? (
          <SafeImage uri={uri} style={styles.tileImg} fallback={AVATAR_FALLBACK} />
        ) : (
          <View style={[styles.tileImg, styles.tileText]}>
            <Text numberOfLines={4} style={styles.tileCaption}>
              {item.caption || item.text || ""}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.bar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1A181B" />
        </TouchableOpacity>
        <Text style={styles.barTitle} numberOfLines={1}>
          {name}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && posts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#15A765" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item, i) => String(item?._id || i)}
          numColumns={COLS}
          renderItem={renderPost}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="images-outline" size={40} color="#CCC" />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  barTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#1A181B",
  },

  headerBlock: { paddingHorizontal: 16, paddingTop: 16 },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEE",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginLeft: 8,
  },
  stat: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1A181B" },
  statLabel: { fontSize: 12, color: "#645E66", marginTop: 2 },

  name: { marginTop: 12, fontSize: 17, fontWeight: "800", color: "#1A181B" },
  role: { marginTop: 2, fontSize: 13, color: "#15A765", fontWeight: "600" },
  bio: { marginTop: 6, fontSize: 13, color: "#3A363D", lineHeight: 19 },

  followBtn: {
    marginTop: 14,
    backgroundColor: "#15A765",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  followingBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#15A765",
  },
  followBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  followingBtnText: { color: "#15A765" },

  gridTitle: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#1A181B",
  },

  tile: { width: TILE, height: TILE, padding: 1 },
  tileImg: { flex: 1, backgroundColor: "#F2F2F2" },
  tileText: { alignItems: "center", justifyContent: "center", padding: 8 },
  tileCaption: { fontSize: 11, color: "#645E66", textAlign: "center" },

  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyText: { color: "#999", fontSize: 14 },
});

export default PlayerPublicProfile;
