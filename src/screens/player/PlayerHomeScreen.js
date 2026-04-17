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
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Location from "../../../assets/location_on.png";
import Swiper from "react-native-swiper";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import TOURNAMENTS from "../../api/tournaments";
import API from "../../api/api";
import POSTS from "../../api/posts";
import AUTH from "../../api/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Website_SERVER_URL from "../../api/api";
import { useNotifications } from "../../context/NotificationContext";

const PlayerHomeScreen = () => {
  const navigation = useNavigation();
  const { user, logout, updateUser } = useAuth();
  const { unreadCount: unreadNotifications } = useNotifications();
  // const AnimatedIcon = Animated.createAnimatedComponent(MaterialIcons);
  const [favorites, setFavorites] = useState({});
  const scaleAnim = useRef({}).current;
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const windowWidth = Dimensions.get("window").width;
  const notificationPanelX = useRef(new Animated.Value(windowWidth)).current;

  const [isOpen, setIsOpen] = useState(false);
  const { width } = Dimensions.get("window");
  const [selectedTab, setSelectedTab] = useState("All");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-width)).current;
  const animation = useRef(new Animated.Value(0)).current;
  const [saved, setSaved] = useState({});

  // Dynamic state variables
  const [tournaments, setTournaments] = useState([]);
  const [turfs, setTurfs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState({
    tournaments: true,
    turfs: true,
    posts: true,
  });

  // Static data
  const tabs = ["All", "Table-Tennis", "Cricket", "Football"];

  const slides = [
    {
      image: require("../../../assets/Home1.jpg"),
      title: "Explore Upcoming Events",
      subtitle: "Join the latest tournaments near you",
      buttonText: "Find Events",
      route: "Events"
    },
    {
      image: require("../../../assets/Home2.jpg"),
      title: "Stay Connected",
      subtitle: "Share your sports journey with everyone",
      buttonText: "Go Social",
      route: "Social"
    },
  ];

  // Fetch data on component mount
  useEffect(() => {
    fetchFreshUserData();
    fetchNotificationCount();
    fetchTournaments();
    fetchPosts();
  }, []);

  const fetchFreshUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token && user?.id) {
        const response = await fetch(AUTH.ENDPOINTS.CURRENT_USER, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging requests
          timeout: 10000,
        });

        if (response.ok) {
          const freshUser = await response.json();
          // Update the auth context with fresh data
          await updateUser(freshUser);
        }
      }
    } catch (error) {
      console.warn("Could not fetch fresh user data:", error);
      // Continue with existing user data - this is not critical
    }
  };

  const toggleNotifications = () => {
    if (!notificationsVisible) {
      fetchNotificationsData();
    }

    // Control tab bar visibility
    navigation.getParent()?.setOptions({
      tabBarStyle: notificationsVisible
        ? { display: "flex" }
        : { display: "none" },
    });

    Animated.timing(notificationPanelX, {
      toValue: notificationsVisible ? windowWidth : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setNotificationsVisible(!notificationsVisible);
  };

  // Control tab bar when component unmounts
  useEffect(() => {
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      });
    };
  }, [navigation]);

  // Function to fetch notifications
  const fetchNotificationsData = async () => {
    if (!user?.id) return;

    setNotificationsLoading(true);
    try {
      const response = await fetch(
        TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.USER(user.id)
      );
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

  // Function to mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await fetch(
        TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
        {
          method: "PUT",
        }
      );

      // Update local notification state to show as read
      setNotifications(
        notifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );

      // Update unread count
      fetchNotificationCount();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Function to mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await fetch(TOURNAMENTS.ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ(user.id), {
        method: "PUT",
      });

      // Update local notification state to show all as read
      setNotifications(
        notifications.map((notification) => ({ ...notification, read: true }))
      );

      // Update unread count
      fetchNotificationCount();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Helper function to get icon based on notification type
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

  // Helper function to format notification date
  const formatNotificationDate = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationBgColor = (type, status) => {
    switch (type) {
      case "session": return "#E8F5E9";
      case "request": return "#E3F2FD";
      case "response":
        return status === "accepted" ? "#E8F5E9" : "#FFEBEE";
      case "tournament":
      case "event": return "#FFF8E1";
      case "booking": return "#F3E5F5";
      default: return "#F3F4F6";
    }
  };

  const getNotificationIconColor = (type, status) => {
    switch (type) {
      case "session": return "#4CAF50";
      case "request": return "#2196F3";
      case "response":
        return status === "accepted" ? "#4CAF50" : "#F44336";
      case "tournament":
      case "event": return "#FFB300";
      case "booking": return "#9C27B0";
      default: return "#6B7280";
    }
  };

  const toggleSidebar = () => {
    Animated.timing(translateX, {
      toValue: sidebarVisible ? -width : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setSidebarVisible(!sidebarVisible);
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

  const line1Style = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "45deg"],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 8],
        }),
      },
    ],
  };

  const line2Style = {
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  const line3Style = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "-35deg"],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -13],
        }),
      },
    ],
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  // Notification count is now handled by NotificationContext (useNotifications hook)
  const fetchNotificationCount = () => {};

  // Fetch tournaments
  const fetchTournaments = async () => {
    setLoading((prev) => ({ ...prev, tournaments: true }));
    try {
      const response = await fetch(TOURNAMENTS.ENDPOINTS.BASE);
      const data = await response.json();

      // Get current date for filtering upcoming events
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Filter out past tournaments based strictly on start date
      const upcomingData = data.filter((tournament) => {
        const dateStr = tournament.startDate || tournament.selectedDate || tournament.createdAt;
        if (!dateStr) return false;

        const tournamentDate = new Date(dateStr);
        tournamentDate.setHours(0, 0, 0, 0);

        // If date parsing fails, keep it to be safe, otherwise compare
        if (isNaN(tournamentDate.getTime())) return true;

        return tournamentDate.getTime() >= now.getTime();
      });

      // Sort tournaments by date before processing
      const sortedData = upcomingData.sort((a, b) => {
        // Try to sort by start date
        const dateA = new Date(a.startDate || a.selectedDate || a.createdAt || a._id);
        const dateB = new Date(b.startDate || b.selectedDate || b.createdAt || b._id);

        // Sort in ascending order (closest upcoming tournament first)
        return dateA - dateB;
      });

      // Process tournament data
      const processedTournaments = sortedData.map((tournament) => {
        const hasRemoteImage =
          typeof tournament?.tournamentLogo === "string" &&
          tournament.tournamentLogo.trim().length > 0;

        return {
          id: tournament._id,
          name: tournament.title,
          type: tournament.sportsType || "Tournament Type",
          date: formatDate(tournament.startDate || tournament.selectedDate),
          price: (() => {
            // If categories exist, calculate min/max prices
            if (tournament.category && Array.isArray(tournament.category) && tournament.category.length > 0) {
              const fees = tournament.category.map(cat => cat.fee).filter(fee => fee !== undefined);
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
            // Fallback to original tournament fee
            return tournament.tournamentFee
              ? `₹ ${tournament.tournamentFee}/- onward`
              : "₹ 0/- onward";
          })(),
          startTime: tournament.startTime || "11.00am",
          closingDate: `Booking closes on: ${formatDate(
            tournament.registrationEndDate || tournament.endDate || tournament.startDate || tournament.selectedDate
          )}`,
          club: tournament.organizerName,
          category: tournament.category, // Include categories

          imageUri: hasRemoteImage
            ? `${Website_SERVER_URL.Wbsite_SERVER_URL}/uploads/tournaments/${tournament.tournamentLogo}`
            : null,

          hasImageError: false,
        };
      });

      setTournaments(processedTournaments);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      Alert.alert("Error", "Failed to load tournament data");
    } finally {
      setLoading((prev) => ({ ...prev, tournaments: false }));
    }
  };

  // Fetch turfs
  // const fetchTurfs = async () => {
  //   setLoading((prev) => ({ ...prev, turfs: true }));
  //   try {
  //     const response = await fetch(API.ENDPOINTS.TURFS.BASE);
  //     const data = await response.json();

  //     if (data.turfs && Array.isArray(data.turfs)) {
  //       const processedTurfs = data.turfs.map((turf) => {
  //         // Process sports array to handle object structure
  //         const processedSports = Array.isArray(turf.sports)
  //           ? turf.sports
  //             .map((sport) =>
  //               typeof sport === "object" && sport.name
  //                 ? sport.name
  //                 : typeof sport === "string"
  //                   ? sport
  //                   : "Unknown Sport"
  //             )
  //             .filter((sport) => sport !== "Unknown Sport")
  //           : ["Box Cricket", "Football", "Badminton", "Table Tennis"];

  //         return {
  //           id: turf._id,
  //           image: {
  //             uri: `${API.UPLOADS_URL}/${turf.images?.[0] || "default-turf.jpg"
  //               }`,
  //           },
  //           title: turf.name,
  //           clubName: turf.clubName || "Club Name N/A",
  //           addressLine1:
  //             turf.address?.area ||
  //             turf.address?.city ||
  //             "Address not available",
  //           addressLine2: `${turf.address?.city || ""} ${turf.address?.pincode || ""
  //             }`,
  //           rating: turf.ratings?.average || 4.5,
  //           distance: "N/A",
  //           sports: processedSports,
  //           discount: turf.discount || "20% off",
  //         };
  //       });

  //       setTurfs(processedTurfs);
  //     } else {
  //       setTurfs([]);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching turfs:", error);
  //   } finally {
  //     setLoading((prev) => ({ ...prev, turfs: false }));
  //   }
  // };

  // Fetch posts

  const fetchPosts = async () => {
    setLoading((prev) => ({ ...prev, posts: true }));
    try {
      const response = await fetch(POSTS.ENDPOINTS.GET_ALL);
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

  //Fetch trainer
  // const fetchTrainers = async () => {
  //   setLoading((prev) => ({ ...prev, trainers: true }));
  //   try {
  //     // Use the proper endpoint
  //     const response = await fetch(TRAINERS.ENDPOINTS.GET_ALL);
  //     const data = await response.json();

  //     if (Array.isArray(data)) {
  //       const processedTrainers = data.map((trainer) => {
  //         // Create proper sports array from the single sport field
  //         const trainerSports = trainer.sport
  //           ? [trainer.sport]
  //           : ["Football", "Cricket"];

  //         return {
  //           id: trainer._id,
  //           name:
  //             `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim() ||
  //             "Trainer Name",
  //           sports: trainerSports,
  //           rating: trainer.rating || 4,
  //           reviews: trainer.reviewCount || 345,
  //           experience: trainer.experience || 0,
  //           badgeCount: trainer.certifications?.length || 5,
  //           // Use path to trainer profile picture if available
  //           image: (() => {
  //             if (trainer.profileImage) {
  //               // If it's a relative path, prepend the base URL
  //               if (trainer.profileImage.startsWith("/")) {
  //                 return { uri: `${TRAINERS.BASE_URL}${trainer.profileImage}` };
  //               }
  //               // If it's already a full URL, use it as is
  //               return { uri: trainer.profileImage };
  //             }
  //             // Fallback to default image
  //             return require("../../../assets/Trainers.png");
  //           })(),
  //         };
  //       });

  //       setTrainers(processedTrainers);
  //     } else {
  //       // Handle empty or invalid response
  //       setTrainers([]);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching trainers:", error);
  //     // Fallback to empty array instead of static data
  //     setTrainers([]);
  //   } finally {
  //     setLoading((prev) => ({ ...prev, trainers: false }));
  //   }
  // };

  const toggleSave = async (postId) => {
    try {
      const isSaved = saved[postId];
      const response = await fetch(POSTS.ENDPOINTS.SAVE(postId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          saved: !isSaved,
        }),
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
        return (
          <Image
            source={require("../../../assets/sports_cricket.png")}
            style={styles.tagIcon}
          />
        );
      case "football":
      case "soccer":
        return (
          <Image
            source={require("../../../assets/sports_soccer.png")}
            style={styles.tagIcon}
          />
        );
      case "badminton":
        return (
          <Image
            source={require("../../../assets/shuttlecock.png")}
            style={styles.tagIcon}
          />
        );
      case "table-tennis":
      case "table tennis":
      case "tennis":
        return (
          <Image
            source={require("../../../assets/ping-pong.png")}
            style={styles.tagIcon}
          />
        );
      default:
        return (
          <Image
            source={require("../../../assets/ping-pong.png")}
            style={styles.tagIcon}
          />
        );
    }
  };

  const toggleFavorite = async (postId) => {
    try {
      const isFav = favorites[postId];
      const response = await fetch(POSTS.ENDPOINTS.LIKE(postId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          liked: !isFav,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFavorites({ ...favorites, [postId]: !isFav });

        // Animation effect
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
      // Use the correct sport parameter name that matches your backend
      const response = await fetch(
        `${API.ENDPOINTS.TURFS.BASE}?sport=${encodeURIComponent(category)}`
      );
      const data = await response.json();

      if (data.turfs && Array.isArray(data.turfs)) {
        const processedTurfs = data.turfs.map((turf) => {
          // Fix the sports processing here too
          const processedSports = Array.isArray(turf.sports)
            ? turf.sports
              .map((sport) =>
                typeof sport === "object" && sport.name
                  ? sport.name
                  : typeof sport === "string"
                    ? sport
                    : "Unknown Sport"
              )
              .filter((sport) => sport !== "Unknown Sport")
            : [];

          return {
            id: turf._id,
            image:
              turf.images && turf.images.length > 0
                ? { uri: `${API.UPLOADS_URL}/${turf.images[0]}` }
                : require("../../../assets/turf.jpg"),
            title: turf.name,
            clubName: turf.clubName || "Club Name N/A",
            addressLine1:
              turf.address?.area ||
              turf.address?.city ||
              "Address not available",
            addressLine2: `${turf.address?.city || ""} ${turf.address?.pincode || ""
              }`,
            rating: turf.ratings?.average || 4.5,
            distance: "N/A",
            sports: processedSports,
            discount: turf.discount || "20% off",
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

  // console.log("turfs", tournaments);

  return (
    <View style={styles.containers}>
      {/* Main Content */}
      <FlatList
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.modernHeader}>
              <LinearGradient
                colors={['#34A4FA', '#3B4DFD']} // Your new colors
                start={{ x: 0.5, y: 0 }}      // Top center
                end={{ x: 0.5, y: 1 }}        // Bottom center
                style={styles.headerGradient}
              >
                <View style={styles.headerTop}>
                  <View>
                    <Text style={styles.greetingText}>Welcome back,</Text>
                    <Text style={styles.userNameText}>{user?.name || "Player"}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.notificationBtn}
                    onPress={() => {
                      try {
                        navigation.navigate("Notifications");
                      } catch {
                        navigation.getParent()?.navigate("Home", { screen: "Notifications" });
                      }
                    }}
                  >
                    <MaterialIcons name="notifications-none" size={28} color="#fff" />
                    {unreadNotifications > 0 && (
                      <View style={styles.notificationBadge}>
                        <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
                          {unreadNotifications > 9 ? "9+" : unreadNotifications}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {/* <View style={styles.searchcontainer}>
              <MaterialIcons name="search" size={24} color="#666" />
              <TextInput
                placeholder="Search"
                placeholderTextColor="#6B7280"
                style={styles.input}
                onSubmitEditing={(event) => {
                  navigation.navigate("SearchScreen", {
                    query: event.nativeEvent.text,
                  });
                }}
              />
            </View> */}

            <View style={styles.carouselWrapper}>
              <Swiper
                showsPagination
                dotStyle={styles.customDot}
                activeDotStyle={styles.customActiveDot}
                autoplay
                autoplayTimeout={6}
                containerStyle={styles.swiperContainer}
                paginationStyle={styles.paginationStyle}
              >
                {slides.map((slide, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.slideItem}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (slide.route === "Events") {
                        navigation.navigate("Events");
                      } else {
                        navigation.navigate("Social");
                      }
                    }}
                  >
                    <ImageBackground
                      source={slide.image}
                      imageStyle={styles.slideBackgroundImage}
                      style={styles.slideInner}
                    >
                      <LinearGradient
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']}
                        style={styles.slideGradient}
                      >
                        <View style={styles.slideInfoContainer}>
                          <Text style={styles.premiumSlideTitle}>{slide.title}</Text>
                          <Text style={styles.premiumSlideSubtitle}>{slide.subtitle}</Text>
                          <View style={styles.premiumSlideButton}>
                            <Text style={styles.premiumSlideButtonText}>{slide.buttonText}</Text>
                            <MaterialIcons name="chevron-right" size={20} color="#252944" />
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </Swiper>
            </View>
          </>
        }
        ListFooterComponent={
          <>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Quick Actions */}
              <View style={{ marginHorizontal: 16, marginHorizontal: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#1a1a2e", marginBottom: 12 }}>Quick Actions</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {/* Book a Turf */}
                  <TouchableOpacity
                    style={{
                      flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
                      borderWidth: 1, borderColor: "#f0f0f0",
                    }}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("TurfList")}
                  >
                    <LinearGradient
                      colors={["#34A4FA", "#3B4DFD"]}
                      style={{
                        width: 44, height: 44, borderRadius: 14,
                        justifyContent: "center", alignItems: "center", marginBottom: 12,
                      }}
                    >
                      <MaterialIcons name="sports-soccer" size={24} color="#fff" />
                    </LinearGradient>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a2e" }}>Book a Turf</Text>
                    <Text style={{ fontSize: 11, color: "#888", marginTop: 3 }}>Browse & book venues</Text>
                  </TouchableOpacity>

                  {/* My Bookings */}
                  <TouchableOpacity
                    style={{
                      flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
                      borderWidth: 1, borderColor: "#f0f0f0",
                    }}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate("MyBookings")}
                  >
                    <View style={{
                      width: 44, height: 44, borderRadius: 14, backgroundColor: "#E3FF3B",
                      justifyContent: "center", alignItems: "center", marginBottom: 12,
                    }}>
                      <MaterialIcons name="event-note" size={24} color="#252944" />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a2e" }}>My Bookings</Text>
                    <Text style={{ fontSize: 11, color: "#888", marginTop: 3 }}>View your reservations</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.Eventscontainer}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.heading}>Upcoming Events</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Events", { screen: "EventScreen" })}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.eventsContainer}>
                {loading.tournaments ? (
                  <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#0056d2" />
                    <Text style={styles.loadingText}>Loading events...</Text>
                  </View>
                ) : tournaments.length > 0 ? (
                  tournaments.slice(0, 5).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.modernEventCard}
                      onPress={() =>
                        navigation.navigate("Tournament Details", {
                          tournamentId: item.id,
                          item: item,
                        })
                      }
                    >
                      <ImageBackground
                        source={
                          item.hasImageError || !item.imageUri
                            ? require("../../../assets/tournament-banner.jpg")
                            : { uri: item.imageUri }
                        }
                        style={styles.cardImage}
                        imageStyle={{ borderRadius: 16 }}
                        resizeMode="cover"
                        onError={() => {
                          setTournaments(prev =>
                            prev.map(t =>
                              t.id === item.id ? { ...t, hasImageError: true } : t
                            )
                          );
                        }}
                      >
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.cardGradient}
                        >
                          <View style={styles.cardHeader}>
                            <View style={styles.sportBadge}>
                              <Text style={styles.sportBadgeText}>{item.type}</Text>
                            </View>
                            <View style={styles.priceBadge}>
                              <Text style={styles.priceBadgeText}>{item.price.split(' ')[1]}</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </ImageBackground>

                      <View style={styles.cardBottomInfo}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.cardMetaRow}>
                          <View style={styles.metaItem}>
                            <MaterialIcons name="calendar-today" size={14} color="#666" />
                            <Text style={styles.metaText}>{item.date}</Text>
                          </View>
                          <View style={styles.metaItem}>
                            <MaterialIcons name="access-time" size={14} color="#666" />
                            <Text style={styles.metaText}>{item.startTime}</Text>
                          </View>
                        </View>
                        <View style={styles.cardOrganizerRow}>
                          <MaterialIcons name="business" size={14} color="#004E93" />
                          <Text style={styles.organizerText}>{item.club}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noDataContainer}>
                    <MaterialIcons name="event-busy" size={48} color="#ccc" />
                    <Text style={styles.noDataText}>No upcoming tournaments</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </>
        }
      />

      {/* {Notification Modal} */}
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
              <TouchableOpacity
                style={styles.markAllBtn}
                onPress={markAllAsRead}
              >
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={toggleNotifications}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {notificationsLoading ? (
          <View style={styles.notificationLoading}>
            <ActivityIndicator size="large" color="#f4511e" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length > 0 ? (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.notificationItem,
                  !item.read && styles.unreadItem,
                ]}
                onPress={() => markAsRead(item._id)}
              >
                <View style={[
                  styles.notificationIconContainer,
                  { backgroundColor: getNotificationBgColor(item.type, item.status) }
                ]}>
                  <MaterialIcons
                    name={getIconForType(item.type)}
                    size={22}
                    color={getNotificationIconColor(item.type, item.status)}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationItemHeader}>
                    <Text style={styles.notificationItemTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  containers: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  modernHeader: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#004E93',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    marginBottom: 5,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    backgroundColor: '#FF6A00',
    borderWidth: 1.5,
    borderColor: '#004E93',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBarInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
  },

  carouselWrapper: {
    marginTop: 25,
    height: 200,
    marginHorizontal: 16,
  },
  swiperContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  slideItem: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  slideInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideBackgroundImage: {
    borderRadius: 20,
    resizeMode: 'cover',
  },
  slideGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 24,
  },
  slideInfoContainer: {
    width: '100%',
  },
  premiumSlideTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  premiumSlideSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  premiumSlideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3FF3B',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: "#FF6A00",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumSlideButtonText: {
    color: '#252944',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  paginationStyle: {
    bottom: 15,
  },
  customDot: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  customActiveDot: {
    backgroundColor: '#E3FF3B',
    width: 20,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  Turfcontainer: {
    flex: 1,
    backgroundColor: "#f2f4f7",
    paddingTop: 20,
    // marginHorizontal: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  tabContainer: {
    marginBottom: 20,
  },
  tabButton: {
    // paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
  },
  activeTabButton: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  tabText: {
    color: "#000",
    fontSize: 14,
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    backgroundColor: "#f2f4f7",
    padding: 15,
    paddingTop: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 15,
  },
  tabContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    // marginHorizontal: 16,
    elevation: 5,
  },
  imageContainer: {
    position: "relative",
  },
  image1: {
    width: "100%",
    height: 180,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    // paddingHorizontal: 10,
    paddingVertical: 8,
  },
  notificationOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 10,
  },
  overlayText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    fontSize: 16,
    color: "#ffd700",
    marginRight: 3,
  },
  ratingText: {
    color: "#fff",
    fontSize: 14,
  },
  discountTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FF6B00",
    // paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  discountText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  addressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    // paddingHorizontal: 10,
    paddingVertical: 10,
  },
  address: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    marginRight: 10,
  },
  distanceColumn: {
    alignItems: "center",
    justifyContent: "center",
  },
  locationIcon: {
    fontSize: 16,
  },
  distanceText: {
    fontSize: 12,
    color: "#555",
  },
  sportsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
    // paddingHorizontal: 10,
    paddingBottom: 10,
  },
  sportItem: {
    backgroundColor: "#f0f0f0",
    // paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 8,
    marginTop: 5,
    display: "flex",
    flexDirection: "row",
    gap: 5,
  },
  sportText: {
    fontSize: 12,
    color: "#333",
  },
  Eventscontainer: {
    margin: 16,
  },
  hamburgerWrapper: {
    flexDirection: "row",
    justifyContent: "flex-end",
    left: 0,
    right: 0,
    zIndex: 30,
  },
  hamburgerIconContainer: {
    height: 25,
    width: 25,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "70%",
    backgroundColor: "#1D6A8B",
    padding: 20,
    elevation: 8,
    zIndex: 10,
  },
  eventsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingBottom: 70,
    paddingHorizontal: 16,
  },
  modernEventCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    overflow: 'hidden',
  },
  cardImage: {
    height: 180,
    width: '100%',
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sportBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#004E93',
  },
  priceBadge: {
    backgroundColor: '#FF6A00',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardBottomInfo: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  cardOrganizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  organizerText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginLeft: 6,
  },
  sidebarcontents: {
    marginTop: 100,
    // marginHorizontal: 16,
  },
  contentdetails: {
    display: "flex",
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  contentdetails1: {
    display: "flex",
    flexDirection: "row",
    gap: 16,
    marginBottom: 43,
  },
  detailname: {
    fontSize: 16,
    fontWeight: "400",
    color: "#fff",
  },
  trainerCard: {
    width: 220,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 10,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 200,
    backgroundColor: "#eee",
  },
  trainerImage: {
    width: "100%",
    height: "100%",
  },
  badgeWrapper: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    // paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  badgeCount: {
    fontSize: 14,
    fontWeight: "bold",
  },
  cardContent: {
    padding: 10,
  },
  trainerName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 6,
  },
  sportsWrapper: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  sportTag: {
    borderWidth: 1,
    borderColor: "#ccc",
    // paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sportText: {
    fontSize: 13,
  },
  ratingWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  trainerheader: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 10,
  },
  postheader: {
    fontSize: 22,
    fontWeight: "600",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 40,
    marginRight: 16,
  },
  name: {
    color: "#333",
    fontWeight: "600",
    fontSize: 16,
  },
  subtitle: {
    color: "#333",
    fontSize: 14,
    fontWeight: "400",
  },
  menu: { fontSize: 20 },
  caption: {
    color: "#333",
    // paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "400",
  },
  caption1: {
    color: "#007AFF",
    marginBottom: 10,
    // paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: "400",
  },
  thumbnailWrapper: {
    position: "relative",
    height: 180,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  playButton: {
    position: "absolute",
    top: "40%",
    left: "45%",
    width: 60,
    height: 60,
    fontSize: 30,
    color: "#fff",
    backgroundColor: "#007AFF",
    borderRadius: 30,
    textAlign: "center",
    lineHeight: 60,
    overflow: "hidden",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
    // paddingHorizontal: 16,
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: "#666",
    fontWeight: "400",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionIcon: {
    fontSize: 18,
    marginLeft: 8,
  },
  tagIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    // marginHorizontal: 16,
    marginBottom: 15,
    marginTop: 15,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 10,
    // marginHorizontal: 16,
    marginBottom: 15,
    marginTop: 15,
  },
  noDataText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    // marginBottom: 5,
  },
  viewAllText: {
    color: "#0056d2",
    fontSize: 14,
    fontWeight: "500",
  },
  notificationPanel: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: "85%",
    height: "100%",
    backgroundColor: "#fff",
    elevation: 20,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: -5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  notificationTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  notificationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllBtn: {
    backgroundColor: "#FFF5F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: {
    color: "#FF6A00",
    fontWeight: "700",
    fontSize: 13,
  },
  closeBtn: {
    backgroundColor: "#F3F4F6",
    padding: 6,
    borderRadius: 20,
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
    backgroundColor: "#FFFBF9",
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
    backgroundColor: "#FF6A00",
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
  scrollContent: {
    paddingBottom: 10,
  },
});

export default PlayerHomeScreen;
