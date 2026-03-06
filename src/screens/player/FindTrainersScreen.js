import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const FindTrainersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState([]);
  const [filteredTrainers, setFilteredTrainers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionType, setSelectedSessionType] = useState("personal");
  const [activeTab, setActiveTab] = useState("sessionType"); // 'sessionType' or 'myTraining'
  const [myTraining, setMyTraining] = useState({ requests: [], sessions: [] });
  const [filterByAvailability, setFilterByAvailability] = useState(false);

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    if (trainers.length > 0) {
      filterTrainers();
    }
  }, [
    searchQuery,
    selectedSessionType,
    trainers,
    activeTab,
    filterByAvailability,
  ]);

  useEffect(() => {
    if (activeTab === "myTraining" && user?.id) {
      fetchMyTraining();
    }
  }, [activeTab, user]);

  // Compare dates without considering time
  const isSameOrAfterDate = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    return d1 >= d2;
  };

  const fetchMyTraining = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API.ENDPOINTS.MY_TRAINING(user.id));
      setMyTraining(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching my training data:", error);
      setLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      setLoading(true);

      // Fetch all trainers
      const trainersResponse = await axios.get(API.ENDPOINTS.GET_ALL);
      const trainersData = trainersResponse.data;

      // Process each trainer to get their sessions
      const trainersWithSessionsPromises = trainersData.map(async (trainer) => {
        try {
          // Use userId if available, otherwise use _id
          const idForSessions =
            trainer.userId?._id || trainer.userId || trainer._id;

          // Fetch sessions for this trainer
          const sessionsResponse = await axios.get(
            API.ENDPOINTS.SESSIONS(idForSessions)
          );

          // Filter for current/future scheduled sessions
          const today = new Date();
          const validSessions = sessionsResponse.data.filter(
            (session) =>
              session.status === "scheduled" &&
              isSameOrAfterDate(session.startTime, today)
          );

          return {
            ...trainer,
            sessions: validSessions,
            hasSessions: validSessions.length > 0,
          };
        } catch (err) {
          console.error(
            `Error fetching sessions for trainer ${trainer._id}:`,
            err
          );
          return { ...trainer, sessions: [], hasSessions: false };
        }
      });

      // Wait for all session fetches to complete
      const trainersWithSessionsData = await Promise.all(
        trainersWithSessionsPromises
      );

      // Only keep trainers with active sessions
      // const trainersWithSessions = trainersWithSessionsData.filter(
      //   (trainer) => trainer.hasSessions
      // );

      // setTrainers(trainersWithSessions);
      // setFilteredTrainers(trainersWithSessions);

      setTrainers(trainersWithSessionsData);
      setFilteredTrainers(trainersWithSessionsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      setLoading(false);
    }
  };

  const filterTrainers = () => {
    if (!trainers.length) {
      setFilteredTrainers([]);
      return;
    }

    let filtered = [...trainers];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (trainer) =>
          trainer.firstName
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          trainer.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (trainer.sports &&
            trainer.sports.some((sport) =>
              sport.toLowerCase().includes(searchQuery.toLowerCase())
            ))
      );
    }

    // Only filter by session type if availability filter is ON
    if (activeTab === "sessionType" && filterByAvailability) {
      filtered = filtered.filter((trainer) => {
        return (
          trainer.sessions &&
          trainer.sessions.some(
            (session) => session.type === selectedSessionType
          )
        );
      });
    }

    setFilteredTrainers(filtered);
  };

  const renderTrainerItem = ({ item }) => {
    const fullName =
      `${item.firstName || ""} ${item.lastName || ""}`.trim() || "Trainer";

    let imageUrl = item.profileImage;
    if (imageUrl && imageUrl.startsWith("/")) {
      imageUrl = `${API.BASE_URL}${imageUrl}`;
    }

    // Find which session types this trainer offers
    const hasPersonalSessions = item.sessions?.some(
      (s) => s.type === "personal"
    );
    const hasGroupSessions = item.sessions?.some((s) => s.type === "group");
    const hasIntermediateSessions = item.sessions?.some(
      (s) => s.type === "intermediate"
    );

    return (
      <TouchableOpacity
        style={styles.trainerCardSquare}
        onPress={() =>
          navigation.navigate("TrainerProfile", { trainerId: item._id })
        }
      >
        <Image
          source={
            imageUrl
              ? { uri: imageUrl }
              : require("../../../assets/Trainers.png")
          }
          style={styles.trainerImageSquare}
        />

        {/* Session type badges */}
        <View style={styles.sessionBadgesContainer}>
          {hasPersonalSessions && (
            <View
              style={[
                selectedSessionType === "personal"
                  ? styles.sessionBadgeLarge
                  : styles.sessionBadge,
                { backgroundColor: "#FF6A00" },
              ]}
            >
              <Text
                style={[
                  styles.sessionBadgeText,
                  selectedSessionType === "personal" &&
                  styles.sessionBadgeTextLarge,
                ]}
              >
                P
              </Text>
            </View>
          )}
          {hasGroupSessions && (
            <View
              style={[
                selectedSessionType === "group"
                  ? styles.sessionBadgeLarge
                  : styles.sessionBadge,
                { backgroundColor: "#4CAF50" },
              ]}
            >
              <Text
                style={[
                  styles.sessionBadgeText,
                  selectedSessionType === "group" &&
                  styles.sessionBadgeTextLarge,
                ]}
              >
                G
              </Text>
            </View>
          )}
          {hasIntermediateSessions && (
            <View
              style={[
                selectedSessionType === "intermediate"
                  ? styles.sessionBadgeLarge
                  : styles.sessionBadge,
                { backgroundColor: "#2196F3" },
              ]}
            >
              <Text
                style={[
                  styles.sessionBadgeText,
                  selectedSessionType === "intermediate" &&
                  styles.sessionBadgeTextLarge,
                ]}
              >
                I
              </Text>
            </View>
          )}
        </View>

        <View style={styles.trainerInfoSquare}>
          <Text style={styles.trainerNameSquare} numberOfLines={1}>
            {fullName}
          </Text>

          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingTextSquare}>
              {item.rating ? item.rating.toFixed(1) : "New"}
            </Text>
          </View>

          {item.sports && item.sports.length > 0 && (
            <Text style={styles.sportTextSquare} numberOfLines={1}>
              {item.sports[0]}
              {item.sports.length > 1 ? ` +${item.sports.length - 1}` : ""}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderTrainingRequestItem = ({ item }) => {
    const handleCancelRequest = async () => {
      Alert.alert(
        "Cancel Request",
        "Are you sure you want to cancel this request?",
        [
          { text: "No", style: "cancel" },
          {
            text: "Yes, Cancel",
            onPress: async () => {
              try {
                // Replace the direct URL construction with API.ENDPOINTS approach
                await axios.put(API.ENDPOINTS.CANCEL_REQUEST(item._id));
                // Refresh my training data after cancellation
                fetchMyTraining();
                Alert.alert("Success", "Request cancelled successfully");
              } catch (error) {
                console.error("Error cancelling request:", error);
                Alert.alert("Error", "Failed to cancel request");
              }
            },
          },
        ]
      );
    };

    return (
      <TouchableOpacity
        style={styles.trainingCard}
        onPress={() => {
          // Show more details in an alert instead of navigating to a new screen
          Alert.alert(
            `${item.sessionType.charAt(0).toUpperCase() +
            item.sessionType.slice(1)
            } Training Request`,
            `Date: ${item.requestedDate}\nTime: ${item.requestedTime
            }\nLocation: ${item.location || "Not specified"}\nNotes: ${item.notes || "No notes provided"
            }`,
            [
              { text: "OK" },
              item.status === "pending"
                ? { text: "Cancel Request", onPress: handleCancelRequest }
                : null,
            ].filter(Boolean)
          );
        }}
      >
        <View style={styles.trainingCardHeader}>
          <Text
            style={[
              styles.trainingCardLabel,
              item.status === "accepted"
                ? styles.acceptedLabel
                : item.status === "rejected"
                  ? styles.rejectedLabel
                  : item.status === "cancelled"
                    ? styles.cancelledLabel
                    : styles.pendingLabel,
            ]}
          >
            {item.status === "pending"
              ? "Pending"
              : item.status === "accepted"
                ? "Accepted"
                : item.status === "cancelled"
                  ? "Cancelled"
                  : "Rejected"}
          </Text>
        </View>

        <Text style={styles.trainingCardTitle}>
          {item.sessionType.charAt(0).toUpperCase() + item.sessionType.slice(1)}{" "}
          Training
        </Text>

        <View style={styles.trainingCardTrainer}>
          <Image
            source={require("../../../assets/person.webp")}
            style={styles.trainerThumb}
          />
          <Text style={styles.trainerCardName}>
            {(() => {
              if (item.trainerProfile) {
                return `${item.trainerProfile.firstName || ""} ${item.trainerProfile.lastName || ""
                  }`;
              } else if (item.trainerName) {
                return item.trainerName;
              } else if (
                typeof item.trainerId === "object" &&
                item.trainerId &&
                item.trainerId.name
              ) {
                // If trainerId is populated as a User with name
                return item.trainerId.name;
              } else {
                // Get trainerName from somewhere else or default
                return "Unknown Trainer";
              }
            })()}
          </Text>
        </View>

        <View style={styles.trainingCardDetail}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.trainingCardDetailText}>
            {item.requestedDate}
          </Text>
        </View>

        <View style={styles.trainingCardDetail}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.trainingCardDetailText}>
            {item.requestedTime}
          </Text>
        </View>

        {/* Add cancel button for pending requests */}
        {item.status === "pending" && (
          <TouchableOpacity
            style={styles.cancelRequestButton}
            onPress={handleCancelRequest}
          >
            <Text style={styles.cancelRequestButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderBookedSessionItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.trainingCard}
        onPress={() =>
          navigation.navigate("SessionDetails", { sessionId: item._id })
        }
      >
        <View style={styles.trainingCardHeader}>
          <Text style={[styles.trainingCardLabel, styles.confirmedLabel]}>
            Confirmed
          </Text>
        </View>

        <Text style={styles.trainingCardTitle}>{item.title}</Text>

        <View style={styles.trainingCardTrainer}>
          <Image
            source={
              item.trainerProfile && item.trainerProfile.profileImage
                ? { uri: item.trainerProfile.profileImage }
                : require("../../../assets/person.webp")
            }
            style={styles.trainerThumb}
          />
          <Text style={styles.trainerCardName}>
            {item.trainerProfile
              ? `${item.trainerProfile.firstName || ""} ${item.trainerProfile.lastName || ""
              }`
              : typeof item.trainerId === "object" &&
                item.trainerId &&
                item.trainerId.name
                ? item.trainerId.name
                : "Unknown Trainer"}
          </Text>
        </View>

        <View style={styles.trainingCardDetail}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.trainingCardDetailText}>
            {new Date(item.startTime).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.trainingCardDetail}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.trainingCardDetailText}>
            {new Date(item.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trainers</Text>
        <TouchableOpacity>
          <Ionicons name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity>
          <Ionicons name="filter-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Tabs and Filters */}
      <View style={styles.filterSection}>
        {/* Main Tabs */}
        <View style={styles.tabHeader}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "sessionType" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("sessionType")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "sessionType" && styles.activeTabButtonText,
              ]}
            >
              Session Type
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "myTraining" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("myTraining")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "myTraining" && styles.activeTabButtonText,
              ]}
            >
              My Training
            </Text>
          </TouchableOpacity>
        </View>

        {/* Show content only when sessionType tab is active */}
        {activeTab === "sessionType" && (
          <View>
            {/* Availability Toggle */}
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleLabel}>Filter by availability</Text>
              <Switch
                value={filterByAvailability}
                onValueChange={setFilterByAvailability}
                trackColor={{ false: "#E5E5E5", true: "#FF6A00" }}
                thumbColor={filterByAvailability ? "#fff" : "#f4f3f4"}
              />
            </View>

            {/* Session Type Selection - Only show when availability filter is ON */}
            {filterByAvailability && (
              <View>
                <Text style={styles.sectionSubtitle}>Select Session Type</Text>
                <View style={styles.sessionTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sessionTypeButton,
                      selectedSessionType === "personal" &&
                      styles.selectedSessionType,
                    ]}
                    onPress={() => setSelectedSessionType("personal")}
                  >
                    <Ionicons
                      name="person"
                      size={24}
                      color={
                        selectedSessionType === "personal" ? "#fff" : "#333"
                      }
                    />
                    <Text
                      style={[
                        styles.sessionTypeText,
                        selectedSessionType === "personal" &&
                        styles.selectedSessionTypeText,
                      ]}
                    >
                      Personal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sessionTypeButton,
                      selectedSessionType === "group" &&
                      styles.selectedSessionType,
                    ]}
                    onPress={() => setSelectedSessionType("group")}
                  >
                    <Ionicons
                      name="people"
                      size={24}
                      color={selectedSessionType === "group" ? "#fff" : "#333"}
                    />
                    <Text
                      style={[
                        styles.sessionTypeText,
                        selectedSessionType === "group" &&
                        styles.selectedSessionTypeText,
                      ]}
                    >
                      Group
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sessionTypeButton,
                      selectedSessionType === "intermediate" &&
                      styles.selectedSessionType,
                    ]}
                    onPress={() => setSelectedSessionType("intermediate")}
                  >
                    <Ionicons
                      name="trending-up"
                      size={24}
                      color={
                        selectedSessionType === "intermediate" ? "#fff" : "#333"
                      }
                    />
                    <Text
                      style={[
                        styles.sessionTypeText,
                        selectedSessionType === "intermediate" &&
                        styles.selectedSessionTypeText,
                      ]}
                    >
                      Intermediate
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Trainer List</Text>
          </View>
        )}
      </View>

      {/* Trainer List or My Training */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      ) : activeTab === "sessionType" ? (
        <FlatList
          data={filteredTrainers}
          renderItem={renderTrainerItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          key={"grid"}
          contentContainerStyle={styles.trainersGridList}
          columnWrapperStyle={styles.trainerColumnWrapper}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                No trainers found with available {selectedSessionType} sessions
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.myTrainingContainer}>
          {myTraining.requests.length > 0 && (
            <View style={styles.myTrainingSection}>
              <Text style={styles.myTrainingSectionTitle}>
                Training Requests
              </Text>
              <FlatList
                data={myTraining.requests}
                renderItem={renderTrainingRequestItem}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {myTraining.sessions.length > 0 && (
            <View style={styles.myTrainingSection}>
              <Text style={styles.myTrainingSectionTitle}>
                Upcoming Sessions
              </Text>
              <FlatList
                data={myTraining.sessions}
                renderItem={renderBookedSessionItem}
                keyExtractor={(item) => item._id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {myTraining.requests.length === 0 &&
            myTraining.sessions.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="fitness-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>
                  You haven't booked any sessions yet
                </Text>
                <TouchableOpacity
                  style={styles.findTrainersButton}
                  onPress={() => setActiveTab("sessionType")}
                >
                  <Text style={styles.findTrainersButtonText}>
                    Find Trainers
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  sessionBadgeLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  sessionBadgeTextLarge: {
    fontSize: 14,
    fontWeight: "bold",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#333",
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  tabHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  activeTabButton: {
    backgroundColor: "#FF6A00",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabButtonText: {
    color: "#fff",
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sessionTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sessionTypeButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedSessionType: {
    backgroundColor: "#FF6A00",
    borderColor: "#FF6A00",
  },
  sessionTypeText: {
    marginTop: 8,
    fontWeight: "500",
  },
  selectedSessionTypeText: {
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  trainersGridList: {
    padding: 12,
  },
  trainerColumnWrapper: {
    justifyContent: "space-between",
  },
  trainerCardSquare: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  trainerImageSquare: {
    width: "100%",
    aspectRatio: 1, // Makes the image square
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: 150, // Set fixed height
    resizeMode: "cover", // Center and cover the image area
  },
  sessionBadgesContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "column",
    alignItems: "center",
  },
  sessionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sessionBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  trainerInfoSquare: {
    padding: 12,
  },
  trainerNameSquare: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingTextSquare: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginLeft: 4,
  },
  sportTextSquare: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  // Old styles kept for compatibility
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  sportTag: {
    fontSize: 12,
    color: "#666",
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 4,
  },
  sessionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  activeSessionBadge: {
    backgroundColor: "#FF6A00",
  },
  sessionText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  activeSessionText: {
    color: "#fff",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },

  // My Training styles
  myTrainingContainer: {
    flex: 1,
    padding: 16,
  },
  myTrainingSection: {
    marginBottom: 24,
  },
  myTrainingSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  trainingCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trainingCardHeader: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  trainingCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingLabel: {
    color: "#FF6A00",
    backgroundColor: "#FFF0E6",
  },
  cancelledLabel: {
    color: "#FF9800",
    backgroundColor: "#FFF8E1",
  },
  acceptedLabel: {
    color: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  rejectedLabel: {
    color: "#F44336",
    backgroundColor: "#FFEBEE",
  },
  confirmedLabel: {
    color: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  trainingCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  trainingCardTrainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  trainerThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  trainerCardName: {
    fontSize: 14,
    color: "#333",
  },
  trainingCardDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  trainingCardDetailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  findTrainersButton: {
    backgroundColor: "#FF6A00",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  findTrainersButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  cancelRequestButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignSelf: "flex-end",
  },
  cancelRequestButtonText: {
    color: "#F44336",
    fontSize: 12,
    fontWeight: "500",
  },
});

export default FindTrainersScreen;
