import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Linking } from "react-native";

const TrainerProfileScreen = ({ route, navigation }) => {
  const { trainerId } = route.params;
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("about");

  useEffect(() => {
    fetchTrainerDetails();
  }, [trainerId]);

  const fetchTrainerDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API.ENDPOINTS.GET_BY_ID(trainerId));
      setTrainer(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching trainer details:", error);
      setLoading(false);
    }
  };

  const handleViewCertificate = async (certificate) => {
    if (!certificate.certificateUrl) {
      Alert.alert("Error", "Certificate file not available");
      return;
    }

    // Process certificate URL
    let formattedUrl = certificate.certificateUrl;

    // Handle Windows-style paths or relative paths
    if (formattedUrl) {
      if (formattedUrl.match(/^[A-Z]:\\/)) {
        // Extract just the filename for Windows paths
        const filename = formattedUrl.split("\\").pop();
        formattedUrl = `${API.SERVER_URL}/uploads/certificates/${filename}`;
      } else if (formattedUrl.startsWith("/uploads")) {
        formattedUrl = `${API.SERVER_URL}${formattedUrl}`;
      } else if (!formattedUrl.startsWith("http")) {
        // Strip leading "uploads/" if present to avoid double path
        const cleanPath = formattedUrl.replace(/^\.?\/?uploads\//i, "");
        formattedUrl = `${API.SERVER_URL}/uploads/${cleanPath}`;
      }
    }

    // Determine if it's a PDF
    const isPdf = formattedUrl
      ? formattedUrl.toLowerCase().endsWith(".pdf") ||
      (formattedUrl.includes("certificate-") &&
        !formattedUrl.endsWith(".jpg") &&
        !formattedUrl.endsWith(".png"))
      : false;

    try {
      // Handle PDFs and images differently and handle platform-specific details
      if (isPdf) {
        // PDFs need special handling on Android
        if (Platform.OS === "android") {
          try {
            // First try direct linking (opens in user's default PDF viewer)
            await Linking.openURL(formattedUrl);
          } catch (linkingError) {
            try {
              // Then try Web Browser (opens in a browser tab)
              await WebBrowser.openBrowserAsync(formattedUrl);
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
                formattedUrl,
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
            await WebBrowser.openBrowserAsync(formattedUrl);
          } catch (error) {
            await Linking.openURL(formattedUrl);
          }
        }
      } else {
        // Image files - both platforms handle these similarly
        try {
          // First try WebBrowser for a controlled experience
          await WebBrowser.openBrowserAsync(formattedUrl);
        } catch (error) {
          await Linking.openURL(formattedUrl);
        }
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not open certificate. " + (error.message || "Please try again.")
      );
    }
  };

  if (loading || !trainer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <ScrollView style={styles.scrollView}>
        <View style={styles.profileHeader}>
          <Image
            source={
              trainer.profileImage
                ? trainer.profileImage.startsWith("/")
                  ? { uri: `${API.BASE_URL}${trainer.profileImage}` }
                  : { uri: trainer.profileImage }
                : require("../../../assets/Trainers.png")
            }
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.trainerName}>
              {trainer.firstName} {trainer.lastName}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.ratingText}>
                {trainer.rating ? trainer.rating.toFixed(1) : "New"}
                {trainer.reviewCount ? ` (${trainer.reviewCount})` : ""}
              </Text>
            </View>
            <View style={styles.badgesContainer}>
              {trainer.verifiedClubs && trainer.verifiedClubs.length > 0 && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  <Text style={styles.badgeText}>Verified</Text>
                </View>
              )}
              {trainer.experience > 0 && (
                <View style={styles.experienceBadge}>
                  <Text style={styles.badgeText}>
                    {trainer.experience}+ Years
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trainer.sessionCount || "0"}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {trainer.sports ? trainer.sports.length : "0"}
            </Text>
            <Text style={styles.statLabel}>Sports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {trainer.certificates ? trainer.certificates.length : "0"}
            </Text>
            <Text style={styles.statLabel}>Certificates</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("TrainerSessions", { trainerId: trainer._id })
            }
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Book Session</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => {
              // Implement message functionality
              alert("Message functionality to be implemented");
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FF6A00" />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity> */}
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "about" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("about")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "about" && styles.activeTabText,
              ]}
            >
              About
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "sports" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("sports")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "sports" && styles.activeTabText,
              ]}
            >
              Sports
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "sessions" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("sessions")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "sessions" && styles.activeTabText,
              ]}
            >
              Sessions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "reviews" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("reviews")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "reviews" && styles.activeTabText,
              ]}
            >
              Reviews
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "about" && (
          <View style={styles.sectionContainer}>
            {trainer.bio ? (
              <Text style={styles.bioText}>{trainer.bio}</Text>
            ) : (
              <Text style={styles.emptyText}>No bio available</Text>
            )}

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Experience</Text>
              {trainer.experienceDescription ? (
                <Text style={styles.infoText}>
                  {trainer.experienceDescription}
                </Text>
              ) : (
                <Text style={styles.infoText}>
                  {trainer.experience > 0
                    ? `${trainer.experience} years of training experience`
                    : "New trainer"}
                </Text>
              )}
            </View>

            {trainer.languages && trainer.languages.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Languages</Text>
                <View style={styles.tagsContainer}>
                  {trainer.languages.map((language, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{language}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {trainer.certificates && trainer.certificates.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Certificates</Text>
                {trainer.certificates.map((cert, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.certificateItem}
                    onPress={() => handleViewCertificate(cert)}
                  >
                    <View style={styles.certificateIconContainer}>
                      <Ionicons
                        name={
                          cert.certificateUrl?.toLowerCase().endsWith(".pdf") ||
                            (cert.certificateUrl?.includes("certificate-") &&
                              !cert.certificateUrl?.endsWith(".jpg") &&
                              !cert.certificateUrl?.endsWith(".png"))
                            ? "document-text"
                            : "image"
                        }
                        size={20}
                        color="#FF6A00"
                      />
                    </View>
                    <View style={styles.certificateInfo}>
                      <Text style={styles.certificateName}>{cert.name}</Text>
                      <Text style={styles.certificateIssuer}>
                        {cert.issuedBy}
                        {cert.issueDate &&
                          ` • ${new Date(cert.issueDate).getFullYear()}`}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {trainer.verifiedClubs && trainer.verifiedClubs.length > 0 && (
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Verified Clubs</Text>
                {trainer.verifiedClubs.map((club, index) => (
                  <View key={index} style={styles.clubItem}>
                    <View style={styles.clubIconContainer}>
                      <Ionicons
                        name="shield-checkmark"
                        size={20}
                        color="#4CAF50"
                      />
                    </View>
                    <View style={styles.clubInfo}>
                      <Text style={styles.clubName}>
                        {club.name || club.clubName || "Verified Club"}
                      </Text>
                      {club.location && (
                        <Text style={styles.clubLocation}>{club.location}</Text>
                      )}
                      {club.rating && (
                        <View style={styles.clubRatingContainer}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.clubRating}>
                            {club.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === "sports" && (
          <View style={styles.sectionContainer}>
            {trainer.sports && trainer.sports.length > 0 ? (
              trainer.sports.map((sport, index) => (
                <View key={index} style={styles.sportItem}>
                  <View style={styles.sportIconContainer}>
                    <Ionicons
                      name="fitness-outline"
                      size={24}
                      color="#FF6A00"
                    />
                  </View>
                  <View style={styles.sportInfo}>
                    <Text style={styles.sportName}>{sport}</Text>
                    {/* Add more sport-specific details here if available */}
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                No sports information available
              </Text>
            )}
          </View>
        )}

        {activeTab === "sessions" && (
          <View style={styles.sectionContainer}>
            <View style={styles.sessionTypesContainer}>
              <Text style={styles.sectionTitle}>Session Types</Text>
              <View style={styles.sessionTypeCards}>
                {trainer.sessionTypes?.personal && (
                  <View style={styles.sessionTypeCard}>
                    <Ionicons name="person" size={24} color="#FF6A00" />
                    <Text style={styles.sessionTypeName}>Personal</Text>
                    <Text style={styles.sessionTypeDesc}>
                      One-on-one training
                    </Text>
                    {trainer.fees?.perSession && (
                      <Text style={styles.sessionTypePrice}>
                        ₹{trainer.fees.perSession}/session
                      </Text>
                    )}
                  </View>
                )}

                {trainer.sessionTypes?.group && (
                  <View style={styles.sessionTypeCard}>
                    <Ionicons name="people" size={24} color="#FF6A00" />
                    <Text style={styles.sessionTypeName}>Group</Text>
                    <Text style={styles.sessionTypeDesc}>
                      Small group training
                    </Text>
                    {trainer.fees?.perSession && (
                      <Text style={styles.sessionTypePrice}>
                        From ₹{Math.floor(trainer.fees.perSession * 0.7)}
                        /session
                      </Text>
                    )}
                  </View>
                )}

                {trainer.sessionTypes?.intermediate && (
                  <View style={styles.sessionTypeCard}>
                    <Ionicons name="trending-up" size={24} color="#FF6A00" />
                    <Text style={styles.sessionTypeName}>Intermediate</Text>
                    <Text style={styles.sessionTypeDesc}>
                      Advanced training
                    </Text>
                    {trainer.fees?.perSession && (
                      <Text style={styles.sessionTypePrice}>
                        From ₹{Math.floor(trainer.fees.perSession * 1.2)}
                        /session
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {trainer.fees?.packages && trainer.fees.packages.length > 0 && (
              <View style={styles.packagesContainer}>
                <Text style={styles.sectionTitle}>Packages</Text>
                {trainer.fees.packages.map((pkg, index) => (
                  <View key={index} style={styles.packageCard}>
                    <View style={styles.packageHeader}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packagePrice}>₹{pkg.price}</Text>
                    </View>
                    {pkg.description && (
                      <Text style={styles.packageDesc}>{pkg.description}</Text>
                    )}
                    <View style={styles.packageDetails}>
                      <View style={styles.packageDetail}>
                        <Ionicons name="calendar" size={16} color="#666" />
                        <Text style={styles.packageDetailText}>
                          {pkg.sessions} sessions
                        </Text>
                      </View>
                      <View style={styles.packageDetail}>
                        <Ionicons name="cash-outline" size={16} color="#666" />
                        <Text style={styles.packageDetailText}>
                          ₹{Math.floor(pkg.price / pkg.sessions)} per session
                        </Text>
                      </View>
                      {trainer.fees?.perSession && (
                        <View style={styles.packageDetail}>
                          <Ionicons
                            name="trending-down"
                            size={16}
                            color="#4CAF50"
                          />
                          <Text style={styles.savingsText}>
                            Save
                            {Math.floor(
                              ((trainer.fees.perSession * pkg.sessions -
                                pkg.price) /
                                (trainer.fees.perSession * pkg.sessions)) *
                              100
                            )}
                            %
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.viewAllSessionsButton}
              onPress={() =>
                navigation.navigate("TrainerSessions", {
                  trainerId: trainer._id,
                })
              }
            >
              <Text style={styles.viewAllSessionsText}>
                View Available Sessions
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#FF6A00" />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "reviews" && (
          <View style={styles.sectionContainer}>
            {/* This would typically fetch reviews from an API endpoint */}
            <Text style={styles.emptyText}>
              Reviews functionality to be implemented
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  clubsContainer: {
    marginTop: 8,
  },
  clubItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e8f5e8",
  },
  clubIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  clubLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  clubRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  clubRating: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },
  verifiedBadgeSmall: {
    backgroundColor: "#4CAF50",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  profileHeader: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trainerName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: "500",
  },
  badgesContainer: {
    flexDirection: "row",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  experienceBadge: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6A00",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#eee",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6A00",
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
  },
  messageButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FF6A00",
  },
  messageButtonText: {
    color: "#FF6A00",
    fontWeight: "bold",
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabButton: {
    paddingVertical: 16,
    marginRight: 16,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF6A00",
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#FF6A00",
  },
  sectionContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: "#666",
  },
  certificateItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  certificateInfo: {
    marginLeft: 12,
  },
  certificateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 106, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  certificateName: {
    fontSize: 16,
    fontWeight: "500",
  },
  certificateIssuer: {
    fontSize: 14,
    color: "#666",
  },
  sportItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sportInfo: {
    flex: 1,
  },
  sportName: {
    fontSize: 16,
    fontWeight: "500",
  },
  sessionTypesContainer: {
    marginBottom: 20,
  },
  sessionTypeCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  sessionTypeCard: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sessionTypeName: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  sessionTypeDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  sessionTypePrice: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FF6A00",
  },
  packagesContainer: {
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6A00",
  },
  packageDesc: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  packageDetails: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  packageDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  packageDetailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  savingsText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 8,
  },
  viewAllSessionsButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllSessionsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FF6A00",
    marginRight: 8,
  },
});

export default TrainerProfileScreen;
