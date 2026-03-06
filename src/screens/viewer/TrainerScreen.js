import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../../config/colors";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";

const TrainerScreen = ({ navigation }) => {
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

          // Handle Windows-style paths or relative paths
          if (formattedUrl) {
            if (formattedUrl.match(/^[A-Z]:\\/)) {
              // Extract just the filename for Windows paths
              const filename = formattedUrl.split("\\").pop();
              formattedUrl = `${TRAINERS.BASE_URL}/api/uploads/certificates/${filename}`;
            } else if (formattedUrl.startsWith("/uploads")) {
              formattedUrl = `${TRAINERS.BASE_URL}${formattedUrl}`;
            } else if (!formattedUrl.startsWith("http")) {
              formattedUrl = `${TRAINERS.BASE_URL}/api/${formattedUrl}`;
            }
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

      // Fix profile image URL if it's a relative path
      if (
        trainerData.profileImage &&
        trainerData.profileImage.startsWith("/")
      ) {
        trainerData.profileImage = `${TRAINERS.BASE_URL}${trainerData.profileImage}`;
      } else if (trainerData.profileImage) {
        console.log(
          "TrainerScreen - Original profile image URL:",
          trainerData.profileImage
        );
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

    // Create full image URL if it's a relative path
    let imageUrl = item.profileImage;
    if (imageUrl && imageUrl.startsWith("/")) {
      imageUrl = `${TRAINERS.BASE_URL}${imageUrl}`;
    }

    return (
      <TouchableOpacity
        style={styles.trainerCard}
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
          <Text style={styles.trainerName}>{fullName}</Text>
          <Text style={styles.trainerSport}>
            {item.sports && item.sports.length > 0
              ? `${item.sports[0]} Coach`
              : "Sports Coach"}
          </Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating || 0}</Text>
          </View>
          <Text style={styles.experience}>{experienceText}</Text>
        </View>
        <TouchableOpacity
          style={styles.bookButton}
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
      onPress={() => handleSessionTypePress(item)}
    >
      <View style={styles.sessionTypeIcon}>
        <Ionicons name={item.icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.sessionTypeName}>{item.name}</Text>
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading trainers...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Your Coach</Text>
        <Text style={styles.headerSubtitle}>
          Improve your skills with expert guidance
        </Text>
      </View>

      {/* Search and Filter Bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => promptSignIn("search for trainers")}
      >
        <Ionicons name="search" size={20} color="#666" />
        <Text style={styles.searchPlaceholder}>
          Search by name, sport or location
        </Text>
      </TouchableOpacity>

      {/* Session Types */}
      {loading.sessionTypes ? (
        <View style={styles.sectionLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
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
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : error.featured ? (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>
            Error loading featured coach: {error.featured}
          </Text>
        </View>
      ) : featuredTrainer ? (
        <View style={styles.featuredSection}>
          <View style={styles.featuredCard}>
            <View style={styles.featuredContent}>
              <Text style={styles.featuredLabel}>Featured Coach</Text>
              <Text style={styles.featuredName}>
                {`${featuredTrainer.firstName || ""} ${featuredTrainer.lastName || ""
                  }`.trim() || "Top Coach"}
              </Text>
              <Text style={styles.featuredSport}>
                {featuredTrainer.sports && featuredTrainer.sports.length > 0
                  ? `Professional ${featuredTrainer.sports[0]} Coach`
                  : "Professional Coach"}
              </Text>
              <Text style={styles.featuredDescription}>
                {featuredTrainer.bio
                  ? `${featuredTrainer.bio.substring(0, 100)}${featuredTrainer.bio.length > 100 ? "..." : ""
                  }`
                  : `${featuredTrainer.experience || ""
                  } years of coaching experience`}
              </Text>
              <TouchableOpacity
                style={styles.featuredButton}
                onPress={() => handleTrainerPress(featuredTrainer)}
              >
                <Text style={styles.featuredButtonText}>View Profile</Text>
              </TouchableOpacity>
            </View>
            <Image
              source={
                featuredTrainer.profileImage &&
                  featuredTrainer.profileImage.startsWith("/")
                  ? {
                    uri: `${TRAINERS.BASE_URL}${featuredTrainer.profileImage}`,
                  }
                  : featuredTrainer.profileImage
                    ? { uri: featuredTrainer.profileImage }
                    : require("../../../assets/Trainers.png")
              }
              style={styles.featuredImage}
              onError={() =>
                console.log("Error loading featured trainer image")
              }
            />
          </View>
        </View>
      ) : null}

      {/* Top Rated Trainers */}
      {loading.trainers ? (
        <View style={styles.sectionLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
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
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
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
        onPress={() => promptSignIn("request a custom coaching package")}
      >
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
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTrainerModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>

              <ScrollView>
                <View style={styles.trainerProfileHeader}>
                  <Image
                    source={
                      selectedTrainer.profileImage &&
                        selectedTrainer.profileImage.startsWith("/")
                        ? {
                          uri: `${TRAINERS.BASE_URL}${selectedTrainer.profileImage}`,
                        }
                        : selectedTrainer.profileImage && !profileImageError
                          ? { uri: selectedTrainer.profileImage }
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
                    <Text style={styles.trainerProfileName}>
                      {`${selectedTrainer.firstName || ""} ${selectedTrainer.lastName || ""
                        }`.trim()}
                    </Text>
                    <Text style={styles.trainerProfileSport}>
                      {selectedTrainer.sports &&
                        selectedTrainer.sports.length > 0
                        ? `${selectedTrainer.sports[0]} Coach`
                        : "Sports Coach"}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={18} color="#FFD700" />
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
                        color={colors.primary}
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
                        color={colors.primary}
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
                        color={colors.primary}
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
                    <ActivityIndicator size="small" color={colors.primary} />
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
                            color={colors.primary}
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
                          size={20}
                          color="#999"
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </View>

                <TouchableOpacity
                  style={styles.bookSessionButton}
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
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSessionDetailsModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>

              <ScrollView>
                <View style={styles.sessionDetailsHeader}>
                  <View style={styles.sessionTypeIconLarge}>
                    <Ionicons
                      name={selectedSessionForDetails.icon}
                      size={40}
                      color={colors.primary}
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
                          color={colors.primary}
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
                        color={colors.primary}
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
                        color={colors.primary}
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
                        color={colors.primary}
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
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBookingModal(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>

              <ScrollView>
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
                          color={colors.primary}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
    marginTop: 5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchPlaceholder: {
    color: "#999",
    fontSize: 15,
    marginLeft: 10,
  },
  section: {
    marginTop: 20,
    marginHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
  },
  sessionTypeCard: {
    width: 120,
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginRight: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionTypeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionTypeName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  featuredSection: {
    marginTop: 25,
    marginHorizontal: 15,
  },
  featuredCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  featuredContent: {
    flex: 1,
    paddingRight: 10,
  },
  featuredLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  featuredName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  featuredSport: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  featuredDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    lineHeight: 18,
  },
  featuredButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  featuredButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  featuredImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  trainerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trainerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  trainerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  trainerSport: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 5,
  },
  experience: {
    fontSize: 13,
    color: "#666",
    marginTop: 3,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  ctaButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 15,
    marginTop: 25,
    marginBottom: 25,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  fullScreenLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  sectionLoader: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
    marginVertical: 10,
  },
  errorSection: {
    padding: 20,
    backgroundColor: "#ffebee",
    borderRadius: 10,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: "center",
  },
  retryText: {
    color: colors.primary,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  emptyStateText: {
    color: "#666",
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  noSlotsText: {
    fontSize: 14,
    color: "#999",
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: "90%",
  },
  modalCloseButton: {
    alignSelf: "flex-end",
    padding: 15,
  },

  // Trainer Profile Modal styles
  trainerProfileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  trainerProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  trainerProfileInfo: {
    flex: 1,
    marginLeft: 15,
  },
  trainerProfileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  trainerProfileSport: {
    fontSize: 16,
    color: "#666",
    marginTop: 2,
  },
  trainerProfileRating: {
    fontSize: 16,
    color: "#666",
    marginLeft: 5,
    fontWeight: "bold",
  },
  trainerProfileExperience: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },
  trainerProfileSection: {
    marginBottom: 20,
  },
  trainerProfileSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  trainerProfileBio: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
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
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  bookSessionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Booking Modal styles
  bookingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  bookingSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  bookingSection: {
    marginBottom: 20,
  },
  bookingSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  sessionTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bookingSessionType: {
    width: "23%",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  bookingSessionTypeName: {
    fontSize: 12,
    color: "#333",
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
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 8,
  },
  dateButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
  },
  dateButtonDay: {
    fontSize: 12,
    color: "#333",
    marginBottom: 2,
  },
  dateButtonDate: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  timeSlotList: {
    paddingVertical: 5,
  },
  timeSlotButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  timeSlotUnavailable: {
    backgroundColor: "#f0f0f0",
    borderColor: "#ddd",
  },
  timeSlotSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
  },
  timeSlotText: {
    fontSize: 14,
    color: "#333",
  },
  timeSlotTextUnavailable: {
    color: "#999",
  },
  timeSlotTextSelected: {
    color: colors.primary,
    fontWeight: "bold",
  },
  bookingDetailRow: {
    marginBottom: 15,
  },
  bookingDetailLabel: {
    fontSize: 15,
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
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  bookingDetailOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
  },
  bookingDetailOptionText: {
    fontSize: 14,
    color: "#333",
  },
  bookingSummary: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
  },
  bookingSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bookingSummaryLabel: {
    fontSize: 15,
    color: "#444",
  },
  bookingSummaryValue: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  bookingSummaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  bookingSummaryLabelTotal: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  bookingSummaryValueTotal: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "bold",
  },
  confirmBookingButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  confirmBookingButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  sessionTypeIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  sessionDetailsHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  sessionDetailsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  sessionDetailsDescription: {
    fontSize: 16,
    color: "#444",
    lineHeight: 24,
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  sessionInfoSection: {
    marginBottom: 25,
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
  },
  sessionInfoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  sessionInfoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  sessionInfoText: {
    fontSize: 15,
    color: "#444",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  sessionInfoRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  sessionInfoRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  sessionInfoRowContent: {
    flex: 1,
  },
  sessionInfoRowTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  sessionInfoRowText: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },
  findTrainersButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 20,
  },
  findTrainersButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Add to the existing styles object
  certificateItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  certificateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(244, 81, 30, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  certificateContent: {
    flex: 1,
  },
  certificateName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  certificateIssuer: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  certificateDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  noCertificatesText: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
});

export default TrainerScreen;
