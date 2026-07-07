import React, { useRef, useState, useEffect } from "react";
import {
  Animated,
  TouchableOpacity,
  View,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Image,
  Text,
  TextInput,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Location from "../../../assets/location_on.png";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import RoleSwitcher from "../../components/RoleSwitcher";
import { getSportName, getCategories } from "../../utils/sportTrack";
import TOURNAMENTS from "../../api/tournaments";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import POSTS from "../../api/posts";
import AUTH from "../../api/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Website_SERVER_URL from "../../api/api";
import { useNotifications } from "../../context/NotificationContext";
import { authFetch } from "../../api/authFetch";

const SPORTS_LIST = [
  { name: "Basketball", icon: require("../../../assets/Basketball.png") },
  { name: "Football", icon: require("../../../assets/Football.png") },
  { name: "Cricket", icon: require("../../../assets/Cricket.png") },
];

// Turf images can come from external servers and fail to load; fall back to a
// bundled placeholder on error so cards never show a blank grey box.
const TURF_FALLBACK = require("../../../assets/TurnImageNew.jpg");
const TurfImage = ({ source, style }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={failed ? TURF_FALLBACK : source}
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

// New accounts have no profileImage — show a clean initials avatar instead of a
// stock person photo (which looked like a real, unrelated person).
const initialsOf = (name) => {
  const n = String(name || "").trim();
  return n ? n.charAt(0).toUpperCase() : "?";
};
const HeaderAvatar = ({ user, style }) => {
  const [failed, setFailed] = useState(false);
  const raw = (user?.profileImage || "").trim();
  // Show the real photo only if it's a non-empty path that actually loads;
  // otherwise (no photo, or a broken/unreachable URL) show the initials.
  if (raw && !failed) {
    return (
      <Image
        source={{ uri: assetUrl(raw) }}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[style, styles.avatarFallback]}>
      <Text style={styles.avatarFallbackText}>{initialsOf(user?.name)}</Text>
    </View>
  );
};

const PlayerHomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const activeRoleLabel = (user?.role || "Player");
  const { unreadCount: unreadNotifications } = useNotifications();

  const windowWidth = Dimensions.get("window").width;
  const { width } = Dimensions.get("window");

  const [favorites, setFavorites] = useState({});
  const scaleAnim = useRef({}).current;
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationPanelX = useRef(new Animated.Value(windowWidth)).current;

  // Sidebar state — windowWidth must be declared above this line.
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const sidebarX = useRef(new Animated.Value(-windowWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Preserved sidebar/hamburger animation refs (old design, retained for safety).
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-width)).current;
  const animation = useRef(new Animated.Value(0)).current;

  // Data state
  const [tournaments, setTournaments] = useState([]);
  const [turfs, setTurfs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState({
    tournaments: true,
    turfs: true,
    posts: true,
  });

  // Preserved tab state (not rendered in new UI, kept for handler symmetry)
  const [selectedTab, setSelectedTab] = useState("All");
  const tabs = ["All", "Table-Tennis", "Cricket", "Football"];

  // Search state (friend's debounce + overlay)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({
    turfs: [],
    tournaments: [],
    users: [],
    trainers: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchFreshUserData();
    fetchNotificationCount();
    fetchTournaments();
    fetchTurfs();
    fetchPosts();
  }, []);

  const fetchFreshUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token && user?.id) {
        const response = await authFetch(AUTH.ENDPOINTS.CURRENT_USER, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });

        if (response.ok) {
          const freshUser = await response.json();
          await updateUser(freshUser);
        }
      }
    } catch (error) {
      console.warn("Could not fetch fresh user data:", error);
    }
  };

  const toggleNotifications = () => {
    if (!notificationsVisible) {
      fetchNotificationsData();
    }

    navigation.getParent()?.setOptions({
      tabBarStyle: notificationsVisible ? { display: "flex" } : { display: "none" },
    });

    Animated.timing(notificationPanelX, {
      toValue: notificationsVisible ? windowWidth : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setNotificationsVisible(!notificationsVisible);
  };

  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      });
    };
  }, [navigation]);

  const openSidebar = () => {
    setSidebarVisible(true);
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
    Animated.parallel([
      Animated.timing(sidebarX, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "flex" },
    });
    Animated.parallel([
      Animated.timing(sidebarX, {
        toValue: -windowWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setSidebarVisible(false));
  };

  const fetchNotificationsData = async () => {
    if (!user?.id) return;

    setNotificationsLoading(true);
    try {
      const response = await authFetch(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.USER(user.id));
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await authFetch(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
        method: "PUT",
      });

      setNotifications(
        notifications.map((notification) =>
          notification._id === notificationId ? { ...notification, read: true } : notification
        )
      );

      fetchNotificationCount();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await authFetch(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ(user.id), {
        method: "PUT",
      });

      setNotifications(notifications.map((notification) => ({ ...notification, read: true })));
      fetchNotificationCount();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "tournament":
      case "event":
        return "emoji-events";
      case "booking":
        return "calendar-today";
      case "match":
        return "sports";
      case "session":
        return "fitness-center";
      case "request":
        return "sports-handball";
      case "response":
        return "mark-chat-read";
      default:
        return "notifications";
    }
  };

  const formatNotificationDate = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getNotificationBgColor = (type, status) => {
    switch (type) {
      case "session":
        return "#E8F5E9";
      case "request":
        return "#E3F2FD";
      case "response":
        return status === "accepted" ? "#E8F5E9" : "#FFEBEE";
      case "tournament":
      case "event":
        return "#FFF8E1";
      case "booking":
        return "#F3E5F5";
      default:
        return "#F3F4F6";
    }
  };

  const getNotificationIconColor = (type, status) => {
    switch (type) {
      case "session":
        return "#4CAF50";
      case "request":
        return "#2196F3";
      case "response":
        return status === "accepted" ? "#4CAF50" : "#F44336";
      case "tournament":
      case "event":
        return "#FFB300";
      case "booking":
        return "#9C27B0";
      default:
        return "#6B7280";
    }
  };

  // Preserved (old sidebar/hamburger animation handlers — not wired to new UI).
  const toggleSidebar = () => {
    Animated.timing(translateX, {
      toValue: isOpen ? -width : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const toggleMenu = () => {
    Animated.timing(animation, {
      toValue: isOpen ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
    toggleSidebar();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const fetchNotificationCount = () => {};

  const fetchTournaments = async () => {
    setLoading((prev) => ({ ...prev, tournaments: true }));
    try {
      const response = await authFetch(TOURNAMENTS.ENDPOINTS.BASE);
      const data = await response.json();

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const upcomingData = data.filter((tournament) => {
        const dateStr =
          tournament.startDate || tournament.selectedDate || tournament.createdAt;
        if (!dateStr) return false;

        const tournamentDate = new Date(dateStr);
        tournamentDate.setHours(0, 0, 0, 0);

        if (isNaN(tournamentDate.getTime())) return true;

        return tournamentDate.getTime() >= now.getTime();
      });

      const sortedData = upcomingData.sort((a, b) => {
        const dateA = new Date(a.startDate || a.selectedDate || a.createdAt || a._id);
        const dateB = new Date(b.startDate || b.selectedDate || b.createdAt || b._id);
        return dateA - dateB;
      });

      const processedTournaments = sortedData.map((tournament) => {
        const hasRemoteImage =
          typeof tournament?.tournamentLogo === "string" &&
          tournament.tournamentLogo.trim().length > 0;

        const _categories = getCategories(tournament);
        return {
          id: tournament._id,
          name: tournament.title,
          type: getSportName(tournament) || "Tournament Type",
          date: formatDate(tournament.startDate || tournament.selectedDate),
          price: (() => {
            if (_categories.length > 0) {
              const fees = _categories.map((cat) => cat.fee).filter((fee) => fee !== undefined);
              if (fees.length > 0) {
                const minFee = Math.min(...fees);
                const maxFee = Math.max(...fees);
                if (minFee === maxFee) {
                  return `₹ ${minFee}`;
                } else {
                  return `₹ ${minFee} - ₹ ${maxFee}`;
                }
              }
            }
            return tournament.tournamentFee
              ? `₹ ${tournament.tournamentFee}/- onward`
              : "₹ 0/- onward";
          })(),
          startTime: tournament.startTime || "11.00am",
          closingDate: `Booking closes on: ${formatDate(
            tournament.registrationEndDate ||
              tournament.endDate ||
              tournament.startDate ||
              tournament.selectedDate
          )}`,
          club: tournament.organizerName,
          eventLocation:
            tournament.eventLocation ||
            tournament.location ||
            tournament.address ||
            tournament.city ||
            "",
          category: _categories,
          imageUri: hasRemoteImage
            ? assetUrl('tournaments/' + tournament.tournamentLogo)
            : null,
          hasImageError: false,
        };
      });

      setTournaments(processedTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading((prev) => ({ ...prev, tournaments: false }));
    }
  };

  const fetchTurfs = async () => {
    setLoading((prev) => ({ ...prev, turfs: true }));
    try {
      const response = await authFetch(API.ENDPOINTS.TURFS.BASE);
      const data = await response.json();

      if (data.turfs && Array.isArray(data.turfs)) {
        const processedTurfs = data.turfs.map((turf) => {
          const processedSports = Array.isArray(turf.sports)
            ? turf.sports
                .map((sport) =>
                  typeof sport === "object" && sport?.name
                    ? sport.name
                    : typeof sport === "string"
                    ? sport
                    : null
                )
                .filter(Boolean)
            : [];

          return {
            id: turf._id,
            image:
              turf.images && turf.images.length > 0
                ? { uri: assetUrl(turf.images[0]) }
                : require("../../../assets/TurnImageNew.jpg"),
            title: turf.name,
            clubName: turf.clubName || "",
            addressLine1:
              turf.address?.area || turf.address?.city || "Address not available",
            addressLine2:
              `${turf.address?.city || ""} ${turf.address?.pincode || ""}`.trim(),
            rating: turf.ratings?.average || 4.5,
            distance: "3km away",
            sports: processedSports,
            discount: turf.discount || "",
          };
        });

        setTurfs(processedTurfs);
      } else {
        setTurfs([]);
      }
    } catch (error) {
      console.error("Error fetching turfs:", error);
      setTurfs([]);
    } finally {
      setLoading((prev) => ({ ...prev, turfs: false }));
    }
  };

  const fetchPosts = async () => {
    setLoading((prev) => ({ ...prev, posts: true }));
    try {
      const response = await authFetch(POSTS.ENDPOINTS.GET_ALL);
      const data = await response.json();

      if (data.success || Array.isArray(data)) {
        const postsData = data.posts || data;
        const processedPosts = postsData.map((post) => ({
          id: post._id,
          name: post.user?.name,
          tournament: post.tournamentName,
          caption: post.caption,
          tags: post.tags,
          date: new Date(post.createdAt).toLocaleDateString(),
          likes: post.likes?.length || 0,
          linkPreview: post.linkPreview,
          createdAt: post.createdAt,
        }));

        setPosts(processedPosts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading((prev) => ({ ...prev, posts: false }));
    }
  };

  const toggleSave = async (postId) => {
    try {
      const isSaved = saved[postId];
      const response = await authFetch(POSTS.ENDPOINTS.SAVE(postId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, saved: !isSaved }),
      });

      const data = await response.json();

      if (data.success) {
        setSaved({ ...saved, [postId]: !isSaved });
        Alert.alert(isSaved ? "Removed from Saved" : "Saved Successfully!");
      }
    } catch (error) {
      console.error("Error toggling save:", error);
      Alert.alert("Error", "Could not save the post");
    }
  };

  const sharePost = async (caption) => {
    try {
      await Share.share({ message: caption });
    } catch (error) {
      Alert.alert("Error sharing post");
    }
  };

  const getTagIcon = (tag) => {
    const sportName = tag.toLowerCase();
    switch (sportName) {
      case "cricket":
      case "box cricket":
        return <Image source={require("../../../assets/sports_cricket.png")} style={styles.tagIcon} />;
      case "football":
      case "soccer":
        return <Image source={require("../../../assets/sports_soccer.png")} style={styles.tagIcon} />;
      case "badminton":
        return <Image source={require("../../../assets/shuttlecock.png")} style={styles.tagIcon} />;
      case "table-tennis":
      case "table tennis":
      case "tennis":
        return <Image source={require("../../../assets/ping-pong.png")} style={styles.tagIcon} />;
      default:
        return <Image source={require("../../../assets/ping-pong.png")} style={styles.tagIcon} />;
    }
  };

  const toggleFavorite = async (postId) => {
    try {
      const isFav = favorites[postId];
      const response = await authFetch(POSTS.ENDPOINTS.LIKE(postId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, liked: !isFav }),
      });

      const data = await response.json();

      if (data.success) {
        setFavorites({ ...favorites, [postId]: !isFav });

        if (!scaleAnim[postId]) {
          scaleAnim[postId] = new Animated.Value(1);
        }

        Animated.sequence([
          Animated.timing(scaleAnim[postId], {
            toValue: 1.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim[postId], {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleTabPress = (tab) => {
    setSelectedTab(tab);
    if (tab === "All") {
      fetchTurfs();
    } else {
      fetchTurfsByCategory(tab);
    }
  };

  const fetchTurfsByCategory = async (category) => {
    setLoading((prev) => ({ ...prev, turfs: true }));
    try {
      const response = await authFetch(
        `${API.ENDPOINTS.TURFS.BASE}?sport=${encodeURIComponent(category)}`
      );
      const data = await response.json();

      if (data.turfs && Array.isArray(data.turfs)) {
        const processedTurfs = data.turfs.map((turf) => {
          const processedSports = Array.isArray(turf.sports)
            ? turf.sports
                .map((sport) =>
                  typeof sport === "object" && sport?.name
                    ? sport.name
                    : typeof sport === "string"
                    ? sport
                    : null
                )
                .filter(Boolean)
            : [];

          return {
            id: turf._id,
            image:
              turf.images && turf.images.length > 0
                ? { uri: assetUrl(turf.images[0]) }
                : require("../../../assets/TurnImageNew.jpg"),
            title: turf.name,
            clubName: turf.clubName || "",
            addressLine1:
              turf.address?.area || turf.address?.city || "Address not available",
            addressLine2:
              `${turf.address?.city || ""} ${turf.address?.pincode || ""}`.trim(),
            rating: turf.ratings?.average || 4.5,
            distance: "3km away",
            sports: processedSports,
            discount: turf.discount || "",
          };
        });

        setTurfs(processedTurfs);
      } else {
        setTurfs([]);
      }
    } catch (error) {
      console.error("Error fetching turfs by category:", error);
      setTurfs([]);
    } finally {
      setLoading((prev) => ({ ...prev, turfs: false }));
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setIsSearching(false);
      setSearchResults({ turfs: [], tournaments: [], users: [], trainers: [] });
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const response = await authFetch(
          `${Website_SERVER_URL.Wbsite_SERVER_URL}/api/search?query=${encodeURIComponent(text)}`
        );
        const data = await response.json();

        // The backend returns a flat `results` array of
        // { type, id, label, sublabel }. Group it into the shapes the result
        // list renders. (Fall back to a pre-grouped response if present.)
        if (Array.isArray(data?.results)) {
          const grouped = { turfs: [], tournaments: [], users: [], trainers: [] };
          for (const r of data.results) {
            const base = { _id: r.id, name: r.label, sublabel: r.sublabel };
            if (r.type === "player") grouped.users.push(base);
            else if (r.type === "turf")
              grouped.turfs.push({ ...base, address: { area: r.sublabel } });
            else if (r.type === "tournament")
              grouped.tournaments.push({
                ...base,
                title: r.label,
                sportsType: r.sublabel,
              });
            else if (r.type === "trainer") grouped.trainers.push(base);
          }
          setSearchResults(grouped);
        } else {
          setSearchResults({
            turfs: data?.turfs || [],
            tournaments: data?.tournaments || [],
            users: data?.users || [],
            trainers: data?.trainers || [],
          });
        }
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults({ turfs: [], tournaments: [], users: [], trainers: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  // TODO: wire to a voice library such as @react-native-voice/voice when added.
  const handleVoiceInput = () => {
    Alert.alert("Voice search", "Voice input integration coming soon");
  };

  const popularEvents = tournaments.slice(0, 5);

  return (
    <View style={styles.mainContainer}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <FlatList
          data={[]}
          keyExtractor={() => "home"}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.contentContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <HeaderAvatar user={user} style={styles.profilePic} />
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.userName}>{user?.name || "there"}</Text>
                    <TouchableOpacity
                      style={styles.locationContainer}
                      onPress={() => setRoleSwitcherOpen(true)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="badge" size={15} color="#15A765" />
                      <Text style={styles.roleSwitchText}>{activeRoleLabel}</Text>
                      <MaterialIcons name="keyboard-arrow-down" size={16} color="#15A765" />
                    </TouchableOpacity>
                  </View>
                </View>
                <RoleSwitcher
                  visible={roleSwitcherOpen}
                  onClose={() => setRoleSwitcherOpen(false)}
                  onManageRoles={() => navigation.navigate("RoleHubHome")}
                />
                <View style={styles.headerRight}>
                  <TouchableOpacity style={styles.iconButton} onPress={openSidebar}>
                    <MaterialIcons name="menu" size={28} color="#8D848F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigation.navigate("Planner")}
                  >
                    <MaterialIcons name="event-note" size={28} color="#8D848F" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      try {
                        navigation.navigate("Notifications");
                      } catch {
                        navigation.getParent()?.navigate("Home", { screen: "Notifications" });
                      }
                    }}
                  >
                    <MaterialIcons name="notifications-none" size={28} color="#8D848F" />
                    {unreadNotifications > 0 && <View style={styles.notificationDot} />}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBarContainer}>
                <MaterialIcons name="search" size={24} color="#666666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search sports, turfs or players"
                  placeholderTextColor="#666666"
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearch("")}>
                    <MaterialIcons
                      name="close"
                      size={20}
                      color="#666"
                      style={{ marginRight: 8 }}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.searchDivider} />
                <TouchableOpacity onPress={handleVoiceInput}>
                  <MaterialIcons name="mic-none" size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              {/* Hero Banner */}
              <View style={styles.sliderContainer}>
                <Image
                  source={require("../../../assets/PlayesHomeBanner.png")}
                  style={styles.bannerImage}
                />
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActionsContainer}>
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Events", { screen: "EventScreen" })}
                >
                  <View style={styles.actionTextContent}>
                    <Text style={styles.actionTitle}>Play Now</Text>
                    <Text style={styles.actionSubtitle}>Join open games or invite squad</Text>
                  </View>
                  <Image
                    source={require("../../../assets/PlayNow3D.png")}
                    style={styles.actionImage}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Turf", { screen: "Play" })}
                >
                  <View style={styles.actionTextContent}>
                    <Text style={styles.actionTitle}>Book Turf</Text>
                    <Text style={styles.actionSubtitle}>Book premium turfs near you</Text>
                  </View>
                  <Image
                    source={require("../../../assets/BookTurf3D.png")}
                    style={styles.actionImageGoal}
                  />
                </TouchableOpacity>
              </View>

              {/* Explore Sports */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Explore Sports</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sportsList}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {SPORTS_LIST.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.name}-${index}`}
                    style={styles.sportItem}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate("SportDetails", {
                        // Go straight to this sport's page. Slug is derived the
                        // same way the backend generates it (name → lower, spaces→-),
                        // and name is passed so the header shows while it fetches.
                        sport: {
                          name: item.name,
                          slug: item.slug || item.name.toLowerCase().replace(/\s+/g, "-"),
                        },
                      })
                    }
                  >
                    <View>
                      <Image source={item.icon} style={styles.sportIcon} />
                    </View>
                    <Text style={styles.sportName}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Popular Turfs Near You (Horizontal) — wired to fetchTurfs */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Turfs Near You</Text>
              </View>
              {loading.turfs ? (
                <View style={styles.loaderRow}>
                  <ActivityIndicator color="#15A765" />
                </View>
              ) : turfs.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalTurfList}
                  contentContainerStyle={{ paddingRight: 16 }}
                >
                  {turfs.map((turf) => (
                    <TouchableOpacity
                      key={turf.id}
                      style={styles.turfCard}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate("TurfDetails", { turfId: turf.id })
                      }
                    >
                      <View style={styles.turfImageContainer}>
                        <TurfImage source={turf.image} style={styles.turfImage} />
                        <View style={styles.ratingBadge}>
                          <MaterialIcons name="star" size={12} color="#FFB300" />
                          <Text style={styles.ratingText}>
                            {typeof turf.rating === "number"
                              ? turf.rating.toFixed(1)
                              : turf.rating}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.distanceText}>{turf.distance}</Text>
                      <Text style={styles.turfName} numberOfLines={1}>
                        {turf.title}
                      </Text>
                      <Text style={styles.turfLocation} numberOfLines={1}>
                        {turf.addressLine1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No turfs available right now</Text>
                </View>
              )}

              {/* Popular Events Near You (Vertical list) — wired to fetchTournaments */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular Events Near You</Text>
              </View>
              <View style={styles.verticalList}>
                {loading.tournaments ? (
                  <View style={styles.loaderRow}>
                    <ActivityIndicator color="#15A765" />
                  </View>
                ) : popularEvents.length > 0 ? (
                  popularEvents.map((item) => (
                    <View key={item.id} style={styles.listItem}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.listItemLoc} numberOfLines={1}>
                          {item.eventLocation || item.club || "Location TBA"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.joinButton}
                        activeOpacity={0.85}
                        onPress={() =>
                          navigation.navigate("Tournament Details", {
                            tournamentId: item.id,
                            item: item,
                          })
                        }
                      >
                        <Text style={styles.joinButtonText}>Join Now</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No events available</Text>
                  </View>
                )}
              </View>

              {/* Promotional Banners */}
              <View style={styles.promotionalContainer}>
                <View style={[styles.promoCard, { backgroundColor: "#8BC34A" }]}>
                  <ImageBackground
                    source={require("../../../assets/GoldCoinBgImage.jpg")}
                    style={styles.promoBg}
                    imageStyle={{ borderRadius: 16 }}
                  >
                    <Text style={styles.promoTitle}>Employee Rewards</Text>
                    <Text style={styles.promoSubtitle} numberOfLines={5}>
                      Join the exclusive rewards program and earn coins for every match.
                    </Text>
                    <Image
                      source={require("../../../assets/GoldCoinBg.png")}
                      style={styles.promoCoins}
                    />
                  </ImageBackground>
                </View>
                <View style={styles.promoCardBlue}>
                  <Image
                    source={require("../../../assets/GameAndFun.png")}
                    style={styles.promoFullImage}
                  />
                </View>
              </View>
            </View>
          }
        />

        {/* Search Results Overlay */}
        {isSearching && (
          <View style={styles.searchResultsOverlay}>
            {searchLoading ? (
              <View style={styles.searchStatusContainer}>
                <ActivityIndicator size="small" color="#15A765" />
                <Text style={styles.searchStatusText}>Searching...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.searchResultsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {searchResults.turfs?.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Turfs</Text>
                    {searchResults.turfs.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setIsSearching(false);
                          navigation.navigate("TurfDetails", { turfId: item._id });
                        }}
                      >
                        <MaterialIcons name="place" size={20} color="#15A765" />
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultSub}>
                            {item.address?.area || item.address?.city || "Location"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {searchResults.tournaments?.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Tournaments</Text>
                    {searchResults.tournaments.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setIsSearching(false);
                          navigation.navigate("Tournament Details", {
                            tournamentId: item._id,
                          });
                        }}
                      >
                        <MaterialIcons name="emoji-events" size={20} color="#FFB300" />
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{item.title}</Text>
                          <Text style={styles.searchResultSub}>
                            {item.sportsType || "Tournament"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {searchResults.users?.length > 0 && (
                  <View style={styles.searchSection}>
                    <Text style={styles.searchSectionTitle}>Players</Text>
                    {searchResults.users.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        style={styles.searchResultItem}
                        onPress={() => {
                          setIsSearching(false);
                          navigation.navigate("PlayerPublicProfile", {
                            userId: item._id,
                            user: item,
                          });
                        }}
                      >
                        <Image
                          source={
                            item.profileImage
                              ? { uri: assetUrl(item.profileImage) }
                              : require("../../../assets/ProfilePlaceholder.png")
                          }
                          style={styles.searchResultProfile}
                        />
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName}>{item.name}</Text>
                          <Text style={styles.searchResultSub}>{item.role || "Player"}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {Object.values(searchResults).every((arr) => !arr || arr.length === 0) && (
                  <View style={styles.searchStatusContainer}>
                    <Text style={styles.searchStatusText}>
                      No results found for "{searchQuery}"
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Notification Side Panel — full content preserved from previous version */}
      <Animated.View
        style={[
          styles.notificationPanel,
          { transform: [{ translateX: notificationPanelX }] },
        ]}
      >
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>Notifications</Text>
          <View style={styles.notificationActions}>
            {notifications.length > 0 && (
              <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={toggleNotifications}>
              <MaterialIcons name="close" size={24} color="#1A181B" />
            </TouchableOpacity>
          </View>
        </View>

        {notificationsLoading ? (
          <View style={styles.notificationLoading}>
            <ActivityIndicator size="large" color="#15A765" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length > 0 ? (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notificationItem, !item.read && styles.unreadItem]}
                onPress={() => markAsRead(item._id)}
              >
                <View
                  style={[
                    styles.notificationIconContainer,
                    { backgroundColor: getNotificationBgColor(item.type, item.status) },
                  ]}
                >
                  <MaterialIcons
                    name={getIconForType(item.type)}
                    size={22}
                    color={getNotificationIconColor(item.type, item.status)}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationItemHeader}>
                    <Text style={styles.notificationItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {item.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationDate(item.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.noNotifications}>
            <MaterialIcons name="notifications-off" size={48} color="#ccc" />
            <Text style={styles.noNotificationsText}>No notifications yet</Text>
          </View>
        )}
      </Animated.View>

      {/* Sidebar Overlay — green gradient panel matching Figma */}
      {sidebarVisible && (
        <View style={styles.sidebarOverlay} pointerEvents="box-none">
          <Animated.View style={[styles.sidebarBackdrop, { opacity: backdropOpacity }]}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeSidebar}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.sidebarPanel,
              { transform: [{ translateX: sidebarX }], width: windowWidth * 0.78 },
            ]}
          >
            <LinearGradient
              colors={["#22B873", "#0F8A55"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sidebarGradient}
            >
              <View style={styles.sidebarInner}>
                {/* Top row: language + close */}
                <View style={styles.sidebarTopRow}>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Language", "Language selector coming soon")
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="translate" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={closeSidebar}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* User row */}
                <View style={styles.sidebarUserRow}>
                  <Image
                    source={
                      user?.profileImage
                        ? { uri: assetUrl(user.profileImage) }
                        : require("../../../assets/ProfilePlaceholder.png")
                    }
                    style={styles.sidebarAvatar}
                  />
                  <Text style={styles.sidebarUserName}>
                    {user?.name || "Player"}
                  </Text>
                </View>

                {/* Menu items */}
                {[
                  {
                    icon: "person-outline",
                    label: "My Profile",
                    onPress: () =>
                      navigation.navigate("Profile", {
                        screen: "Player Profile",
                      }),
                  },
                  {
                    icon: "calendar-today",
                    label: "My Bookings",
                    onPress: () => navigation.navigate("MyBookings"),
                  },
                  {
                    icon: "article",
                    label: "News",
                    onPress: () =>
                      navigation
                        .getParent()
                        ?.navigate("Social", { screen: "NewsList" }),
                  },
                  {
                    icon: "library-books",
                    label: "Sports Library",
                    onPress: () => navigation.navigate("SportsLibrary"),
                  },
                  {
                    icon: "supervised-user-circle",
                    label: "Trainers",
                    onPress: () => navigation.navigate("TrainerDashboard"),
                  },
                  {
                    icon: "work-outline",
                    label: "Browse Job/ My Application",
                    onPress: () => navigation.navigate("BrowseJobs"),
                  },
                  {
                    icon: "shopping-bag",
                    label: "My Orders",
                    onPress: () =>
                      navigation
                        .getParent()
                        ?.navigate("Store", { screen: "MyClaims" }),
                  },
                  {
                    icon: "trending-up",
                    label: "My Sales",
                    onPress: () =>
                      navigation
                        .getParent()
                        ?.navigate("Store", { screen: "MyListings" }),
                  },
                  {
                    icon: "sell",
                    label: "Sell Equipment",
                    onPress: () =>
                      navigation
                        .getParent()
                        ?.navigate("Store", { screen: "SellGearIntro" }),
                  },
                  {
                    icon: "mail-outline",
                    label: "Invitations",
                    onPress: () =>
                      navigation.navigate("Profile", { screen: "Invitations" }),
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.sidebarItem}
                    onPress={() => {
                      closeSidebar();
                      item.onPress();
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color="#FFFFFF"
                    />
                    <Text style={styles.sidebarItemText}>{item.label}</Text>
                    <MaterialIcons
                      name="chevron-right"
                      size={22}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    flexDirection: "row",
  },
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sidebarPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
    overflow: "hidden",
  },
  sidebarGradient: {
    flex: 1,
  },
  sidebarInner: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sidebarTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sidebarUserRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sidebarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sidebarUserName: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
  },
  sidebarItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#FFFFFF",
  },
  contentContainer: {
    paddingTop: 10,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#eee",
  },
  avatarFallback: {
    backgroundColor: "#15A765",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "Montserrat_600SemiBold",
  },
  headerTextContainer: {
    justifyContent: "center",
    flexShrink: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginRight: 4,
  },
  roleSwitchText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#15A765",
    marginHorizontal: 4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: 18,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4D4D",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    height: 50,
    borderColor: "#EEEEFF",
    borderRadius: 53,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    backgroundColor: "#FFFFFF",
  },
  sliderContainer: {
    height: 163,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  quickActionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 24,
    overflow: "visible",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    overflow: "visible",
    position: "relative",
    zIndex: 1,
    minHeight: 110,
  },
  actionTextContent: {
    flex: 1,
    zIndex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    width: "67%",
    paddingEnd: 5,
  },
  actionImage: {
    width: 98,
    height: 69,
    position: "absolute",
    right: -10,
    bottom: 0,
    resizeMode: "contain",
    zIndex: 100,
  },
  actionImageGoal: {
    width: 98,
    height: 69,
    position: "absolute",
    right: -15,
    bottom: -10,
    resizeMode: "contain",
    zIndex: 100,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#1A181B",
  },
  sportsList: {
    paddingLeft: 16,
    marginBottom: 24,
  },
  sportItem: {
    alignItems: "center",
    marginRight: 16,
    width: 130,
    height: 85,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#fff",
    borderRadius: 16,
    justifyContent: "center",
  },
  sportIcon: {
    width: 32,
    height: 32,
    marginBottom: 8,
    resizeMode: "contain",
  },
  sportName: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  horizontalTurfList: {
    paddingLeft: 16,
    marginBottom: 30,
  },
  turfCard: {
    width: 145,
    marginRight: 16,
  },
  turfImageContainer: {
    width: "100%",
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 6,
    position: "relative",
    backgroundColor: "#eee",
  },
  turfImage: {
    width: "100%",
    height: "100%",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 16,
    shadowColor: "#0B083847",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: "#1A181B",
    marginLeft: 2,
    fontWeight: "600",
  },
  distanceText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    marginBottom: 6,
  },
  turfName: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
    marginBottom: 2,
  },
  turfLocation: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666",
  },
  verticalList: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  listItem: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EEEEFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#8B96BA",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 2,
  },
  listItemTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#0A0A0A",
    marginBottom: 4,
  },
  listItemLoc: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
  },
  joinButton: {
    backgroundColor: "#15A765",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },
  promotionalContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 16,
    overflow: "visible",
  },
  promoCard: {
    flex: 1,
    height: 190,
    borderRadius: 16,
    overflow: "visible",
  },
  promoBg: {
    flex: 1,
    padding: 14,
  },
  promoTitle: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    marginBottom: 4,
  },
  promoSubtitle: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    lineHeight: 18,
    opacity: 0.9,
  },
  promoCardBlue: {
    flex: 1,
    height: 190,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0D47A1",
  },
  promoFullImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  promoCoins: {
    width: 243,
    height: 199,
    position: "absolute",
    right: -40,
    bottom: -40,
    resizeMode: "contain",
    zIndex: 1,
  },

  // Loaders / empty
  loaderRow: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 13,
  },

  // Preserved styles
  tagIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },

  // Notification panel
  notificationPanel: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "85%",
    height: "100%",
    backgroundColor: "#fff",
    elevation: 20,
    zIndex: 100,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  notificationHeader: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: "#1A181B",
  },
  notificationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllBtn: {
    backgroundColor: "#E8F8EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: {
    color: "#15A765",
    fontWeight: "700",
    fontSize: 13,
  },
  notificationLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  noNotifications: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noNotificationsText: {
    marginTop: 16,
    color: "#9CA3AF",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "flex-start",
  },
  unreadItem: {
    backgroundColor: "#F4FBF6",
  },
  notificationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationItemTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#111827",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#15A765",
    marginLeft: 8,
  },
  notificationMessage: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Search overlay
  searchResultsOverlay: {
    position: "absolute",
    top: 160,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: 350,
    zIndex: 9999,
    elevation: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    overflow: "hidden",
  },
  searchResultsScroll: {
    padding: 8,
  },
  searchStatusContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  searchStatusText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#666",
  },
  searchSection: {
    marginBottom: 16,
  },
  searchSectionTitle: {
    fontSize: 12,
    fontFamily: "Montserrat_600SemiBold",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginLeft: 10,
    marginBottom: 8,
    fontWeight: "700",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
    marginBottom: 6,
  },
  searchResultProfile: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  searchResultText: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  searchResultSub: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666",
  },
});

export default PlayerHomeScreen;
