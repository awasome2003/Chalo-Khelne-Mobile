import React, { useState, useEffect } from "react";
import { assetUrl } from "../../utils/assetUrl";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import TRAINERS from "../../api/trainers";
import { useAuth } from "../../context/AuthContext";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";

// ─── Green design system tokens ──────────────────────────────────────────
const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const GREEN_TINT = "#E8F7F0";
const AMBER = "#F59E0B";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEEEFF";
const FIELD_BG = "#F4F4F5";
const SCREEN_BG = "#FFFFFF";

const TrainerScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const isAuthenticated = !!token;

  // State variables for UI
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const [selectedSessionType, setSelectedSessionType] = useState(null);
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState("1hour");
  const [selectedLocation, setSelectedLocation] = useState("default");

  const [selectedSessionForDetails, setSelectedSessionForDetails] =
    useState(null);
  const [showSessionDetailsModal, setShowSessionDetailsModal] = useState(false);

  // Data states
  const [trainers, setTrainers] = useState([]);
  const [featuredTrainer, setFeaturedTrainer] = useState(null);
  const [sessionTypes, setSessionTypes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [trainerCertificates, setTrainerCertificates] = useState([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  // UI states
  const [loading, setLoading] = useState({
    trainers: true,
    featured: true,
    sessionTypes: true,
  });
  const [error, setError] = useState({
    trainers: null,
    featured: null,
    sessionTypes: null,
  });

  // Fetch data on component mount
  useEffect(() => {
    fetchTrainers();
    fetchFeaturedTrainer();
    fetchSessionTypes();
    generateAvailableDates();
  }, []);

  const fetchTrainerCertificates = async (trainerId) => {
    try {
      setLoadingCertificates(true);

      const profileUrl = TRAINERS.ENDPOINTS.PROFILE(trainerId);
      const response = await axios.get(profileUrl);

      if (response.data && response.data.certificates) {
        // Process certificates to properly format URLs
        const processedCertificates = response.data.certificates.map((cert) => {
          let formattedUrl = cert.certificateUrl;

          // Normalize any cert path (Windows abs path, /uploads, relative, or full URL).
          if (formattedUrl) {
            if (formattedUrl.match(/^[A-Z]:\\/)) {
              formattedUrl = "certificates/" + formattedUrl.split("\\").pop();
            }
            formattedUrl = assetUrl(formattedUrl);
          }

          // Determine if it's a PDF
          const isPdf = formattedUrl
            ? formattedUrl.toLowerCase().endsWith(".pdf") ||
            (formattedUrl.includes("certificate-") &&
              !formattedUrl.endsWith(".jpg") &&
              !formattedUrl.endsWith(".png"))
            : false;

          return {
            ...cert,
            formattedUrl,
            isPdf,
          };
        });

        setTrainerCertificates(processedCertificates);
      } else {
        setTrainerCertificates([]);
      }

      setLoadingCertificates(false);
    } catch (error) {
      setTrainerCertificates([]);
      setLoadingCertificates(false);
    }
  };

  // Generate dates for date picker
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateObj = {
        id:
          i === 0
            ? "today"
            : i === 1
              ? "tomorrow"
              : date
                .toLocaleDateString("en-US", { weekday: "short" })
                .toLowerCase(),
        label:
          i === 0
            ? "Today"
            : i === 1
              ? "Tom"
              : date.toLocaleDateString("en-US", { weekday: "short" }),
        date: date.getDate(),
        month: date.toLocaleDateString("en-US", { month: "short" }),
        fullDate: date.toISOString().split("T")[0],
      };

      dates.push(dateObj);
    }

    setAvailableDates(dates);
  };

  // API fetch functions
  const fetchTrainers = async () => {
    try {
      setLoading((prev) => ({ ...prev, trainers: true }));
      setError((prev) => ({ ...prev, trainers: null }));

      const response = await axios.get(TRAINERS.ENDPOINTS.GET_ALL);
      setTrainers(response.data);

      setLoading((prev) => ({ ...prev, trainers: false }));
    } catch (err) {
      console.error("Error fetching trainers:", err);
      setError((prev) => ({ ...prev, trainers: err.message }));
      setLoading((prev) => ({ ...prev, trainers: false }));
    }
  };

  const fetchFeaturedTrainer = async () => {
    try {
      setLoading((prev) => ({ ...prev, featured: true }));
      setError((prev) => ({ ...prev, featured: null }));

      // Try to get featured trainers first
      try {
        const response = await axios.get(TRAINERS.ENDPOINTS.FILTERS.FEATURED);
        if (response.data && response.data.length > 0) {
          setFeaturedTrainer(response.data[0]);
          setLoading((prev) => ({ ...prev, featured: false }));
          return;
        }
      } catch (error) {
        console.log("No featured trainers found, using top rated instead");
      }

      // If featured trainers not available, get top rated trainers
      const response = await axios.get(
        TRAINERS.ENDPOINTS.FILTERS.BY_RATING(4.5)
      );
      if (response.data && response.data.length > 0) {
        setFeaturedTrainer(response.data[0]);
      }

      setLoading((prev) => ({ ...prev, featured: false }));
    } catch (err) {
      console.error("Error fetching featured trainer:", err);
      setError((prev) => ({ ...prev, featured: err.message }));
      setLoading((prev) => ({ ...prev, featured: false }));
    }
  };

  const fetchSessionTypes = async () => {
    try {
      setLoading((prev) => ({ ...prev, sessionTypes: true }));
      setError((prev) => ({ ...prev, sessionTypes: null }));

      // If a trainer is selected, get their specific session types
      let endpoint = TRAINERS.ENDPOINTS.SESSION_TYPES.GET;
      if (selectedTrainer && (selectedTrainer._id || selectedTrainer.userId)) {
        const trainerId = selectedTrainer._id || selectedTrainer.userId;
        endpoint = TRAINERS.ENDPOINTS.SESSION_TYPES.GET_BY_TRAINER(trainerId);
      }

      const response = await axios.get(endpoint);
      setSessionTypes(response.data);
      setLoading((prev) => ({ ...prev, sessionTypes: false }));
    } catch (err) {
      console.error("Error fetching session types:", err);
      setError((prev) => ({ ...prev, sessionTypes: err.message }));
      setLoading((prev) => ({ ...prev, sessionTypes: false }));
      // No fallback values - rely completely on the API
    }
  };

  const fetchTrainerAvailability = async (trainerId, dateString) => {
    try {
      // In a real implementation, this would call an API endpoint to get the trainer's availability for a specific date
      // For now, we'll generate some random time slots
      const slots = [];
      const startHour = 8; // 8 AM
      const endHour = 20; // 8 PM

      for (let hour = startHour; hour <= endHour; hour++) {
        // Skip some hours to simulate unavailable times
        if (Math.random() > 0.7) continue;

        const time = hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
        slots.push({
          id: hour.toString(),
          time,
          available: true,
        });
      }

      setTimeSlots(slots);
    } catch (err) {
      console.error("Error fetching trainer availability:", err);
      // Set some default time slots on error
      setTimeSlots([
        { id: "9", time: "9:00 AM", available: true },
        { id: "10", time: "10:00 AM", available: true },
        { id: "11", time: "11:00 AM", available: false },
        { id: "15", time: "3:00 PM", available: true },
        { id: "16", time: "4:00 PM", available: true },
        { id: "17", time: "5:00 PM", available: false },
      ]);
    }
  };

  const fetchTrainerDetails = async (trainerId) => {
    try {
      const response = await axios.get(TRAINERS.ENDPOINTS.GET_BY_ID(trainerId));

      // Process the trainer data
      const trainerData = response.data;

      // Resolve profile image via the shared assetUrl helper (handles
      // relative paths, leading slashes, backslashes, and full URLs).
      if (trainerData.profileImage) {
        trainerData.profileImage = assetUrl(trainerData.profileImage);
      } else {
        console.log("TrainerScreen - No profile image available");
      }

      setSelectedTrainer(trainerData);
      setProfileImageError(false); // Reset error state when loading new trainer

      // Use the userId from the response if available, otherwise use the trainerId
      const profileId =
        trainerData.userId?._id || trainerData.userId || trainerId;

      // Fetch certificates
      await fetchTrainerCertificates(profileId);

      // Fetch availability for today
      const today = new Date().toISOString().split("T")[0];
      fetchTrainerAvailability(trainerId, today);
    } catch (err) {
      console.error("Error fetching trainer details:", err);
      Alert.alert("Error", "Could not load trainer details. Please try again.");
    }
  };

  const handleViewCertificate = async (certificate) => {
    if (!certificate.formattedUrl) {
      Alert.alert("Error", "Certificate file not available");
      return;
    }

    try {
      // Handle PDFs and images differently and handle platform-specific details
      if (certificate.isPdf) {
        // PDFs need special handling on Android
        if (Platform.OS === "android") {
          try {
            // First try direct linking (opens in user's default PDF viewer)
            await Linking.openURL(certificate.formattedUrl);
          } catch (linkingError) {
            try {
              // Then try Web Browser (opens in a browser tab)
              await WebBrowser.openBrowserAsync(certificate.formattedUrl);
            } catch (browserError) {
              // Last resort: Download and view locally
              const filename = `certificate_${Date.now()}.pdf`;
              const fileUri = `${FileSystem.cacheDirectory}${filename}`;

              // Show downloading message
              Alert.alert(
                "Downloading",
                "Preparing certificate for viewing..."
              );

              const downloadResult = await FileSystem.downloadAsync(
                certificate.formattedUrl,
                fileUri
              );

              if (downloadResult.status === 200) {
                try {
                  await Linking.openURL(`file://${fileUri}`);
                } catch (finalError) {
                  throw new Error("Could not open downloaded PDF");
                }
              } else {
                throw new Error("Failed to download PDF");
              }
            }
          }
        } else {
          // iOS handles PDFs in WebBrowser or Safari better
          try {
            // Open in WebBrowser - this is a modal experience in iOS
            await WebBrowser.openBrowserAsync(certificate.formattedUrl);
          } catch (error) {
            await Linking.openURL(certificate.formattedUrl);
          }
        }
      } else {
        // Image files - both platforms handle these similarly
        try {
          // First try WebBrowser for a controlled experience
          await WebBrowser.openBrowserAsync(certificate.formattedUrl);
        } catch (error) {
          await Linking.openURL(certificate.formattedUrl);
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not open certificate. " + (error.message || "Please try again.")
      );
    }
  };

  // Helper function for auth headers
  const getAuthHeaders = () => {
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // API action functions
  const promptSignIn = (action) => {
    Alert.alert("Sign In Required", `Please sign in to ${action}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign In", onPress: () => navigation.navigate("Account") },
    ]);
  };

  const handleTrainerPress = async (trainer) => {
    if (!trainer._id) {
      Alert.alert("Error", "Invalid trainer data");
      return;
    }

    try {
      await fetchTrainerDetails(trainer._id);
      setShowTrainerModal(true);
    } catch (err) {
      console.error("Error handling trainer press:", err);
      Alert.alert("Error", "Could not load trainer details. Please try again.");
    }
  };

  const handleBookSession = (trainer) => {
    if (!isAuthenticated) {
      promptSignIn("book a session");
      return;
    }

    setShowTrainerModal(false);
    setShowBookingModal(true);
    fetchTrainerAvailability(
      trainer._id || trainer.userId,
      availableDates[0].fullDate
    );
  };

  const handleDateChange = (dateId) => {
    setSelectedDate(dateId);

    // Find the full date from availableDates
    const selectedDateObj = availableDates.find((date) => date.id === dateId);
    if (selectedDateObj && selectedTrainer) {
      fetchTrainerAvailability(
        selectedTrainer._id || selectedTrainer.userId,
        selectedDateObj.fullDate
      );
    }

    // Reset time slot selection
    setSelectedTimeSlot(null);
  };

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      promptSignIn("confirm your booking");
      return;
    }

    if (!selectedTrainer || !selectedSessionType || !selectedTimeSlot) {
      Alert.alert("Error", "Please select all required fields");
      return;
    }

    try {
      // Get the selected date object
      const selectedDateObj = availableDates.find(
        (date) => date.id === selectedDate
      );
      if (!selectedDateObj) {
        Alert.alert("Error", "Invalid date selection");
        return;
      }

      // Get the selected time slot
      const selectedTimeObj = timeSlots.find(
        (slot) => slot.id === selectedTimeSlot
      );
      if (!selectedTimeObj) {
        Alert.alert("Error", "Invalid time slot selection");
        return;
      }

      // Calculate duration in hours
      let durationHours = 1;
      if (selectedDuration === "1.5hours") durationHours = 1.5;
      if (selectedDuration === "2hours") durationHours = 2;

      // Create session request payload
      const requestData = {
        type: "player",
        playerId: user?._id,
        playerName: user?.name,
        trainerId: selectedTrainer._id || selectedTrainer.userId,
        requestedDate: selectedDateObj.fullDate,
        requestedTime: selectedTimeObj.time,
        sessionType: selectedSessionType,
        location:
          selectedLocation === "default"
            ? selectedTrainer.location
            : "Custom Location",
        notes: "Booked via mobile app",
        sportType:
          selectedTrainer.sports && selectedTrainer.sports.length > 0
            ? selectedTrainer.sports[0]
            : "General",
      };

      // Send request to API
      const response = await axios.post(
        TRAINERS.ENDPOINTS.REQUEST_SESSION,
        requestData,
        { headers: getAuthHeaders() }
      );

      // Close the booking modal and show success message
      setShowBookingModal(false);
      Alert.alert(
        "Booking Request Sent",
        "Your booking request has been sent to the trainer. You will be notified once they respond.",
        [{ text: "OK" }]
      );
    } catch (err) {
      console.error("Error booking session:", err);
      Alert.alert("Error", "Failed to send booking request. Please try again.");
    }
  };

  const handleSessionTypePress = (sessionType) => {
    setSelectedSessionForDetails(sessionType);
    setShowSessionDetailsModal(true);
  };

  const renderTrainerCard = ({ item }) => {
    // Format the trainer's name and experience
    const fullName =
      `${item.firstName || ""} ${item.lastName || ""}`.trim() ||
      "Unknown Trainer";
    const experienceText = `${item.experience || 0} ${item.experience === 1 ? "year" : "years"
      } experience`;

    // Resolve image via the shared assetUrl helper.
    const imageUrl = assetUrl(item.profileImage);

    return (
      <TouchableOpacity
        style={styles.trainerCard}
        activeOpacity={0.85}
        onPress={() => handleTrainerPress(item)}
      >
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require("../../../assets/Trainers.png")
          }
          style={styles.trainerImage}
          onError={() =>
            console.log(`Error loading image for trainer: ${fullName}`)
          }
        />
        <View style={styles.trainerInfo}>
          <Text style={styles.trainerName} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.trainerSport} numberOfLines={1}>
            {item.sports && item.sports.length > 0
              ? `${item.sports[0]} Coach`
              : "Sports Coach"}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={AMBER} />
            <Text style={styles.ratingText}>{item.rating || 0}</Text>
            <Text style={styles.experience}>· {experienceText}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
          activeOpacity={0.85}
          onPress={() => handleTrainerPress(item)}
        >
          <Text style={styles.bookButtonText}>Book</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSessionType = ({ item }) => (
    <TouchableOpacity
      style={styles.sessionTypeCard}
      activeOpacity={0.85}
      onPress={() => handleSessionTypePress(item)}
    >
      <View style={styles.sessionTypeIcon}>
        <Ionicons name={item.icon} size={26} color={GREEN} />
      </View>
      <Text style={styles.sessionTypeName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderTimeSlot = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.timeSlotButton,
        !item.available && styles.timeSlotUnavailable,
        selectedTimeSlot === item.id && styles.timeSlotSelected,
      ]}
      disabled={!item.available}
      onPress={() => setSelectedTimeSlot(item.id)}
    >
      <Text
        style={[
          styles.timeSlotText,
          !item.available && styles.timeSlotTextUnavailable,
          selectedTimeSlot === item.id && styles.timeSlotTextSelected,
        ]}
      >
        {item.time}
      </Text>
    </TouchableOpacity>
  );

  // Render loading state for the entire screen
  if (loading.trainers && loading.featured && loading.sessionTypes) {
    return (
      <View style={styles.fullScreenLoader}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading trainers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[GREEN, GREEN_DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <Text style={styles.headerTitle}>Find Your Coach</Text>
          <Text style={styles.headerSubtitle}>
            Improve your skills with expert guidance
          </Text>
        </LinearGradient>

        {/* Search and Filter Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.85}
          onPress={() => promptSignIn("search for trainers")}
        >
          <Ionicons name="search" size={20} color={TEXT_MUTED} />
          <Text style={styles.searchPlaceholder}>
            Search by name, sport or location
          </Text>
        </TouchableOpacity>

        {/* Session Types */}
        {loading.sessionTypes ? (
          <View style={styles.sectionLoader}>
            <ActivityIndicator size="small" color={GREEN} />
          </View>
        ) : error.sessionTypes ? (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>
            Error loading session types: {error.sessionTypes}
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Session Types</Text>
            <TouchableOpacity
              onPress={() => promptSignIn("view all session types")}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={sessionTypes}
            renderItem={renderSessionType}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Featured Coach */}
      {loading.featured ? (
        <View style={styles.sectionLoader}>
          <ActivityIndicator size="small" color={GREEN} />
        </View>
      ) : error.featured ? (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>
            Error loading featured coach: {error.featured}
          </Text>
        </View>
      ) : featuredTrainer ? (
        <View style={styles.featuredSection}>
          <LinearGradient
            colors={[GREEN_TINT, "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
            <View style={styles.featuredContent}>
              <View style={styles.featuredLabelPill}>
                <Ionicons name="star" size={11} color={AMBER} />
                <Text style={styles.featuredLabel}>Featured Coach</Text>
              </View>
              <Text style={styles.featuredName} numberOfLines={1}>
                {`${featuredTrainer.firstName || ""} ${featuredTrainer.lastName || ""
                  }`.trim() || "Top Coach"}
              </Text>
              <Text style={styles.featuredSport} numberOfLines={1}>
                {featuredTrainer.sports && featuredTrainer.sports.length > 0
                  ? `Professional ${featuredTrainer.sports[0]} Coach`
                  : "Professional Coach"}
              </Text>
              <Text style={styles.featuredDescription} numberOfLines={3}>
                {featuredTrainer.bio
                  ? `${featuredTrainer.bio.substring(0, 100)}${featuredTrainer.bio.length > 100 ? "..." : ""
                  }`
                  : `${featuredTrainer.experience || ""
                  } years of coaching experience`}
              </Text>
              <TouchableOpacity
                style={styles.featuredButton}
                activeOpacity={0.85}
                onPress={() => handleTrainerPress(featuredTrainer)}
              >
                <Text style={styles.featuredButtonText}>View Profile</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={
                assetUrl(featuredTrainer.profileImage)
                  ? { uri: assetUrl(featuredTrainer.profileImage) }
                  : require("../../../assets/Trainers.png")
              }
              style={styles.featuredImage}
              onError={() =>
                console.log("Error loading featured trainer image")
              }
            />
          </LinearGradient>
        </View>
      ) : null}

      {/* Top Rated Trainers */}
      {loading.trainers ? (
        <View style={styles.sectionLoader}>
          <ActivityIndicator size="small" color={GREEN} />
        </View>
      ) : error.trainers ? (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>
            Error loading trainers: {error.trainers}
          </Text>
          <TouchableOpacity onPress={fetchTrainers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Rated Trainers</Text>
            <TouchableOpacity onPress={() => promptSignIn("view all trainers")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {trainers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="account-search-outline"
                size={52}
                color="#D1D5DB"
              />
              <Text style={styles.emptyStateText}>No trainers yet</Text>
              <Text style={styles.emptyStateSubtext}>
                No trainers available at the moment
              </Text>
            </View>
          ) : (
            <FlatList
              data={trainers}
              renderItem={renderTrainerCard}
              keyExtractor={(item) => item._id.toString()}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          )}
        </View>
      )}

      {/* Book a Session CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        activeOpacity={0.85}
        onPress={() => promptSignIn("request a custom coaching package")}
      >
        <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
        <Text style={styles.ctaButtonText}>Request Custom Coaching</Text>
      </TouchableOpacity>

      {/* Trainer Detail Modal */}
      <Modal
        visible={showTrainerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrainerModal(false)}
      >
        {selectedTrainer && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <TouchableOpacity
                style={styles.modalCloseButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setShowTrainerModal(false)}
              >
                <Ionicons name="close" size={22} color={TEXT_DARK} />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.trainerProfileHeader}>
                  <Image
                    source={
                      assetUrl(selectedTrainer.profileImage) &&
                        !profileImageError
                        ? { uri: assetUrl(selectedTrainer.profileImage) }
                        : require("../../../assets/Trainers.png")
                    }
                    style={styles.trainerProfileImage}
                    onError={(e) => {
                      console.log(
                        "Error loading trainer profile image:",
                        e.nativeEvent.error
                      );
                      setProfileImageError(true);
                    }}
                  />
                  <View style={styles.trainerProfileInfo}>
                    <Text style={styles.trainerProfileName} numberOfLines={1}>
                      {`${selectedTrainer.firstName || ""} ${selectedTrainer.lastName || ""
                        }`.trim()}
                    </Text>
                    <Text style={styles.trainerProfileSport} numberOfLines={1}>
                      {selectedTrainer.sports &&
                        selectedTrainer.sports.length > 0
                        ? `${selectedTrainer.sports[0]} Coach`
                        : "Sports Coach"}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color={AMBER} />
                      <Text style={styles.trainerProfileRating}>
                        {selectedTrainer.rating || 0}
                      </Text>
                    </View>
                    <Text style={styles.trainerProfileExperience}>
                      {`${selectedTrainer.experience || 0} ${selectedTrainer.experience === 1 ? "year" : "years"
                        } experience`}
                    </Text>
                  </View>
                </View>

                <View style={styles.trainerProfileSection}>
                  <Text style={styles.trainerProfileSectionTitle}>About</Text>
                  <Text style={styles.trainerProfileBio}>
                    {selectedTrainer.bio || "No bio available"}
                  </Text>
                </View>

                <View style={styles.trainerProfileSection}>
                  <Text style={styles.trainerProfileSectionTitle}>Details</Text>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons
                        name="cash-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Hourly Rate</Text>
                      <Text style={styles.detailValue}>
                        ₹{selectedTrainer.fees?.perSession || 0}/hour
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Availability</Text>
                      <Text style={styles.detailValue}>
                        {selectedTrainer.availability &&
                          selectedTrainer.availability.length > 0
                          ? "Check calendar for available slots"
                          : "Contact for availability"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons
                        name="location-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>
                        {selectedTrainer.address || "Location not specified"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Add this after the trainer profile details section */}
                <View style={styles.trainerProfileSection}>
                  <Text style={styles.trainerProfileSectionTitle}>
                    Certificates
                  </Text>

                  {loadingCertificates ? (
                    <ActivityIndicator size="small" color={GREEN} />
                  ) : trainerCertificates.length === 0 ? (
                    <Text style={styles.noCertificatesText}>
                      No certificates available
                    </Text>
                  ) : (
                    trainerCertificates.map((certificate, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.certificateItem}
                        onPress={() => handleViewCertificate(certificate)}
                      >
                        <View style={styles.certificateIconContainer}>
                          <Ionicons
                            name={certificate.isPdf ? "document-text" : "image"}
                            size={20}
                            color={GREEN}
                          />
                        </View>
                        <View style={styles.certificateContent}>
                          <Text style={styles.certificateName}>
                            {certificate.name}
                          </Text>
                          <Text style={styles.certificateIssuer}>
                            Issued by: {certificate.issuedBy}
                          </Text>
                          <Text style={styles.certificateDate}>
                            Issued:{" "}
                            {new Date(
                              certificate.issueDate
                            ).toLocaleDateString()}
                            {certificate.expiryDate &&
                              ` (Expires: ${new Date(
                                certificate.expiryDate
                              ).toLocaleDateString()})`}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={TEXT_MUTED}
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <TouchableOpacity
                  style={styles.bookSessionButton}
                  activeOpacity={0.85}
                  onPress={() => handleBookSession(selectedTrainer)}
                >
                  <Text style={styles.bookSessionButtonText}>
                    Book a Session
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Session Details Modal */}
      <Modal
        visible={showSessionDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSessionDetailsModal(false)}
      >
        {selectedSessionForDetails && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <TouchableOpacity
                style={styles.modalCloseButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setShowSessionDetailsModal(false)}
              >
                <Ionicons name="close" size={22} color={TEXT_DARK} />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sessionDetailsHeader}>
                  <View style={styles.sessionTypeIconLarge}>
                    <Ionicons
                      name={selectedSessionForDetails.icon}
                      size={40}
                      color={GREEN}
                    />
                  </View>
                  <Text style={styles.sessionDetailsTitle}>
                    {selectedSessionForDetails.name}
                  </Text>
                </View>

                <Text style={styles.sessionDetailsDescription}>
                  {selectedSessionForDetails.description}
                </Text>

                <View style={styles.sessionInfoSection}>
                  <Text style={styles.sessionInfoTitle}>What to expect</Text>
                  {selectedSessionForDetails.details.expectations.map(
                    (expectation, index) => (
                      <View key={index} style={styles.sessionInfoItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={GREEN}
                        />
                        <Text style={styles.sessionInfoText}>
                          {expectation}
                        </Text>
                      </View>
                    )
                  )}
                </View>

                <View style={styles.sessionInfoSection}>
                  <Text style={styles.sessionInfoTitle}>Details</Text>
                  <View style={styles.sessionInfoRow}>
                    <View style={styles.sessionInfoRowIcon}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.sessionInfoRowContent}>
                      <Text style={styles.sessionInfoRowTitle}>Duration</Text>
                      <Text style={styles.sessionInfoRowText}>
                        {selectedSessionForDetails.details.duration}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <View style={styles.sessionInfoRowIcon}>
                      <Ionicons
                        name="people-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.sessionInfoRowContent}>
                      <Text style={styles.sessionInfoRowTitle}>
                        Participants
                      </Text>
                      <Text style={styles.sessionInfoRowText}>
                        {selectedSessionForDetails.details.participants}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionInfoRow}>
                    <View style={styles.sessionInfoRowIcon}>
                      <Ionicons
                        name="cash-outline"
                        size={20}
                        color={GREEN}
                      />
                    </View>
                    <View style={styles.sessionInfoRowContent}>
                      <Text style={styles.sessionInfoRowTitle}>Pricing</Text>
                      <Text style={styles.sessionInfoRowText}>
                        {selectedSessionForDetails.details.pricing}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.findTrainersButton}
                  onPress={() => {
                    setShowSessionDetailsModal(false);
                    setSelectedSessionType(selectedSessionForDetails.id);
                    promptSignIn(
                      `find trainers for ${selectedSessionForDetails.name.toLowerCase()} sessions`
                    );
                  }}
                >
                  <Text style={styles.findTrainersButtonText}>
                    Find Trainers
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        {selectedTrainer && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <TouchableOpacity
                style={styles.modalCloseButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setShowBookingModal(false)}
              >
                <Ionicons name="close" size={22} color={TEXT_DARK} />
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.bookingTitle}>Book a Session</Text>
                <Text style={styles.bookingSubtitle}>
                  with{" "}
                  {`${selectedTrainer.firstName || ""} ${selectedTrainer.lastName || ""
                    }`.trim()}
                  (
                  {selectedTrainer.sports && selectedTrainer.sports.length > 0
                    ? selectedTrainer.sports[0]
                    : "Coach"}
                  )
                </Text>

                <View style={styles.bookingSection}>
                  <Text style={styles.bookingSectionTitle}>
                    Select Session Type
                  </Text>
                  <View style={styles.sessionTypeRow}>
                    {sessionTypes.map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.bookingSessionType,
                          selectedSessionType === type.id &&
                          styles.bookingDetailOptionSelected,
                        ]}
                        onPress={() => setSelectedSessionType(type.id)}
                      >
                        <Ionicons
                          name={type.icon}
                          size={22}
                          color={GREEN}
                        />
                        <Text style={styles.bookingSessionTypeName}>
                          {type.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.bookingSection}>
                  <Text style={styles.bookingSectionTitle}>Select Date</Text>
                  <View style={styles.dateSelector}>
                    {availableDates.map((date, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dateButton,
                          selectedDate === date.id && styles.dateButtonSelected,
                        ]}
                        onPress={() => handleDateChange(date.id)}
                      >
                        <Text style={styles.dateButtonDay}>{date.label}</Text>
                        <Text style={styles.dateButtonDate}>
                          {date.date} {date.month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.bookingSection}>
                  <Text style={styles.bookingSectionTitle}>
                    Available Time Slots
                  </Text>
                  {timeSlots.length === 0 ? (
                    <Text style={styles.noSlotsText}>
                      No time slots available on this date
                    </Text>
                  ) : (
                    <FlatList
                      data={timeSlots}
                      renderItem={renderTimeSlot}
                      keyExtractor={(item) => item.id}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.timeSlotList}
                    />
                  )}
                </View>

                <View style={styles.bookingSection}>
                  <Text style={styles.bookingSectionTitle}>
                    Session Details
                  </Text>

                  <View style={styles.bookingDetailRow}>
                    <Text style={styles.bookingDetailLabel}>Duration:</Text>
                    <View style={styles.bookingDetailOptions}>
                      <TouchableOpacity
                        style={[
                          styles.bookingDetailOption,
                          selectedDuration === "1hour" &&
                          styles.bookingDetailOptionSelected,
                        ]}
                        onPress={() => setSelectedDuration("1hour")}
                      >
                        <Text style={styles.bookingDetailOptionText}>
                          1 hour
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.bookingDetailOption,
                          selectedDuration === "1.5hours" &&
                          styles.bookingDetailOptionSelected,
                        ]}
                        onPress={() => setSelectedDuration("1.5hours")}
                      >
                        <Text style={styles.bookingDetailOptionText}>
                          1.5 hours
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.bookingDetailOption,
                          selectedDuration === "2hours" &&
                          styles.bookingDetailOptionSelected,
                        ]}
                        onPress={() => setSelectedDuration("2hours")}
                      >
                        <Text style={styles.bookingDetailOptionText}>
                          2 hours
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.bookingDetailRow}>
                    <Text style={styles.bookingDetailLabel}>Location:</Text>
                    <View style={styles.bookingDetailOptions}>
                      <TouchableOpacity
                        style={[
                          styles.bookingDetailOption,
                          selectedLocation === "default" &&
                          styles.bookingDetailOptionSelected,
                        ]}
                        onPress={() => setSelectedLocation("default")}
                      >
                        <Text style={styles.bookingDetailOptionText}>
                          {selectedTrainer.address || "Default Location"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.bookingDetailOption,
                          selectedLocation === "other" &&
                          styles.bookingDetailOptionSelected,
                        ]}
                        onPress={() => setSelectedLocation("other")}
                      >
                        <Text style={styles.bookingDetailOptionText}>
                          Other
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.bookingSummary}>
                  <View style={styles.bookingSummaryRow}>
                    <Text style={styles.bookingSummaryLabel}>
                      Session Cost:
                    </Text>
                    <Text style={styles.bookingSummaryValue}>
                      ₹{selectedTrainer.fees?.perSession || 0}
                    </Text>
                  </View>

                  <View style={styles.bookingSummaryRow}>
                    <Text style={styles.bookingSummaryLabel}>
                      Platform Fee:
                    </Text>
                    <Text style={styles.bookingSummaryValue}>
                      ₹
                      {Math.round(
                        (selectedTrainer.fees?.perSession || 0) * 0.05
                      )}
                    </Text>
                  </View>

                  <View style={styles.bookingSummaryRowTotal}>
                    <Text style={styles.bookingSummaryLabelTotal}>Total:</Text>
                    <Text style={styles.bookingSummaryValueTotal}>
                      ₹
                      {(selectedTrainer.fees?.perSession || 0) +
                        Math.round(
                          (selectedTrainer.fees?.perSession || 0) * 0.05
                        )}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmBookingButton,
                    !selectedSessionType || !selectedTimeSlot
                      ? styles.disabledButton
                      : null,
                  ]}
                  onPress={handleConfirmBooking}
                  disabled={!selectedSessionType || !selectedTimeSlot}
                >
                  <Text style={styles.confirmBookingButtonText}>
                    Confirm Booking
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: "#fff",
    marginTop: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#fff",
    opacity: 0.92,
    marginTop: 5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FIELD_BG,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  searchPlaceholder: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
  section: {
    marginTop: 22,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: GREEN,
  },
  sessionTypeCard: {
    width: 116,
    height: 104,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginRight: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  sessionTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionTypeName: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    textAlign: "center",
  },
  featuredSection: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  featuredCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredContent: {
    flex: 1,
    paddingRight: 10,
  },
  featuredLabelPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 6,
  },
  featuredLabel: {
    fontSize: 10,
    fontFamily: "Montserrat_600SemiBold",
    color: GREEN_DARK,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  featuredName: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 2,
  },
  featuredSport: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  featuredDescription: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 8,
    lineHeight: 18,
  },
  featuredButton: {
    backgroundColor: GREEN,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  featuredButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "700",
  },
  featuredImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#fff",
  },
  trainerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  trainerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: FIELD_BG,
  },
  trainerInfo: {
    flex: 1,
    marginLeft: 14,
  },
  trainerName: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  trainerSport: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
    marginLeft: 4,
  },
  experience: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginLeft: 6,
  },
  bookButton: {
    backgroundColor: GREEN,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "700",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: GREEN,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: TEXT_MUTED,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
  },
  sectionLoader: {
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
  },
  errorSection: {
    padding: 18,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginHorizontal: 16,
    marginVertical: 10,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  retryText: {
    color: GREEN,
    fontWeight: "700",
    fontFamily: "Montserrat_600SemiBold",
    textAlign: "center",
    marginTop: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  emptyStateText: {
    color: TEXT_MUTED,
    marginTop: 12,
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    textAlign: "center",
  },
  emptyStateSubtext: {
    color: "#9CA3AF",
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  noDataText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontStyle: "italic",
  },
  noSlotsText: {
    fontSize: 13,
    color: TEXT_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 8,
    maxHeight: "90%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    marginBottom: 4,
  },
  modalCloseButton: {
    alignSelf: "flex-end",
    padding: 8,
  },

  // Trainer Profile Modal styles
  trainerProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  trainerProfileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: FIELD_BG,
  },
  trainerProfileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  trainerProfileName: {
    fontSize: 21,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  trainerProfileSport: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  trainerProfileRating: {
    fontSize: 14,
    color: TEXT_DARK,
    marginLeft: 5,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  trainerProfileExperience: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
  },
  trainerProfileSection: {
    marginBottom: 22,
  },
  trainerProfileSectionTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 10,
  },
  trainerProfileBio: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#444",
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  detailIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  detailValue: {
    fontSize: 15,
    fontFamily: "Montserrat_500Medium",
    color: TEXT_DARK,
    fontWeight: "600",
    marginTop: 1,
  },
  qualificationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  qualificationText: {
    fontSize: 15,
    color: "#444",
    marginLeft: 8,
  },
  bookSessionButton: {
    backgroundColor: GREEN,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  bookSessionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },

  // Booking Modal styles
  bookingTitle: {
    fontSize: 21,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 4,
  },
  bookingSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginBottom: 20,
  },
  bookingSection: {
    marginBottom: 20,
  },
  bookingSectionTitle: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 12,
  },
  sessionTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookingSessionType: {
    width: "23%",
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  bookingSessionTypeName: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    marginTop: 5,
    textAlign: "center",
  },
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  dateButton: {
    width: "23%",
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 8,
  },
  dateButtonSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN_TINT,
  },
  dateButtonDay: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  dateButtonDate: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  timeSlotList: {
    paddingVertical: 5,
  },
  timeSlotButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: FIELD_BG,
    borderRadius: 999,
    marginRight: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  timeSlotUnavailable: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E5E7EB",
  },
  timeSlotSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN_TINT,
  },
  timeSlotText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
  },
  timeSlotTextUnavailable: {
    color: "#9CA3AF",
  },
  timeSlotTextSelected: {
    color: GREEN_DARK,
    fontWeight: "700",
  },
  bookingDetailRow: {
    marginBottom: 15,
  },
  bookingDetailLabel: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#444",
    marginBottom: 8,
  },
  bookingDetailOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bookingDetailOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: FIELD_BG,
    borderRadius: 999,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bookingDetailOptionSelected: {
    borderColor: GREEN,
    backgroundColor: GREEN_TINT,
  },
  bookingDetailOptionText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
  },
  bookingSummary: {
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  bookingSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bookingSummaryLabel: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#444",
  },
  bookingSummaryValue: {
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: TEXT_DARK,
    fontWeight: "600",
  },
  bookingSummaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  bookingSummaryLabelTotal: {
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    color: TEXT_DARK,
    fontWeight: "700",
  },
  bookingSummaryValueTotal: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    color: GREEN,
    fontWeight: "800",
  },
  confirmBookingButton: {
    backgroundColor: GREEN,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#CBD5E1",
  },
  confirmBookingButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  sessionTypeIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  sessionDetailsHeader: {
    alignItems: "center",
    paddingVertical: 16,
  },
  sessionDetailsTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  sessionDetailsDescription: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#444",
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  sessionInfoSection: {
    marginBottom: 22,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sessionInfoTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 14,
  },
  sessionInfoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  sessionInfoText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#444",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  sessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sessionInfoRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  sessionInfoRowContent: {
    flex: 1,
  },
  sessionInfoRowTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  sessionInfoRowText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  findTrainersButton: {
    backgroundColor: GREEN,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginVertical: 16,
  },
  findTrainersButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  // Certificate row styles
  certificateItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  certificateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN_TINT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  certificateContent: {
    flex: 1,
  },
  certificateName: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  certificateIssuer: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  certificateDate: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9CA3AF",
    marginTop: 2,
  },
  noCertificatesText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
});

export default TrainerScreen;
