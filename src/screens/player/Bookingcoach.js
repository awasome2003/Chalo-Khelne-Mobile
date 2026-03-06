import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const Bookingcoach = () => {
  const { user } = useAuth();
  const [innerActiveTab, setInnerActiveTab] = useState("Upcoming");
  const [myTraining, setMyTraining] = useState({ requests: [], sessions: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id || user?._id) {
      fetchMyTraining();
    }
  }, [user]);

  const fetchMyTraining = async () => {
    if (!user || (!user.id && !user._id)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = user.id || user._id;
      const response = await axios.get(API.ENDPOINTS.MY_TRAINING(userId));
      setMyTraining(response.data);
    } catch (error) {
      console.error("Error fetching coaching data:", error);
      setError("Failed to load coaching sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderSessionCard = ({ item }) => {
    // Determine if the item is a request or a confirmed session
    const isRequest = !item.startTime; // Sessions have startTime, requests don't

    // Get trainer name from the item
    const trainerName = (() => {
      if (item.trainerProfile) {
        return `${item.trainerProfile.firstName || ""} ${item.trainerProfile.lastName || ""
          }`.trim();
      } else if (item.trainerName) {
        return item.trainerName;
      } else if (
        typeof item.trainerId === "object" &&
        item.trainerId &&
        item.trainerId.name
      ) {
        return item.trainerId.name;
      } else {
        return "Trainer Name";
      }
    })();

    // Get sports/tags from the item
    const sports = item.sports || item.sport || ["Sport"];

    // Handle cancel request
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
                await axios.put(API.ENDPOINTS.CANCEL_REQUEST(item._id));
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

    // Handle view details
    const handleViewDetails = () => {
      const detailsTitle = isRequest
        ? "Training Request Details"
        : "Session Details";
      const detailsContent = isRequest
        ? `Date: ${item.requestedDate}\nTime: ${item.requestedTime}\nStatus: ${item.status
        }\nLocation: ${item.location || "Not specified"}\nNotes: ${item.notes || "No notes provided"
        }`
        : `Date: ${new Date(
          item.startTime
        ).toLocaleDateString()}\nTime: ${new Date(
          item.startTime
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}\nLocation: ${item.location || "Not specified"}\nSession Type: ${item.type || "Not specified"
        }`;

      Alert.alert(
        detailsTitle,
        detailsContent,
        [
          { text: "OK" },
          isRequest && item.status === "pending"
            ? { text: "Cancel Request", onPress: handleCancelRequest }
            : null,
        ].filter(Boolean)
      );
    };

    return (
      <View style={styles.card}>
        <Image
          source={
            item.trainerProfile && item.trainerProfile.profileImage
              ? item.trainerProfile.profileImage.startsWith("/")
                ? { uri: `${API.BASE_URL}${item.trainerProfile.profileImage}` }
                : { uri: item.trainerProfile.profileImage }
              : require("../../../assets/Trainers.png")
          }
          style={styles.trainerImage}
        />
        <View style={styles.cardContent}>
          <Text style={styles.trainerName}>{trainerName}</Text>

          <View style={styles.tagsRow}>
            {/* Display session type as a tag */}
            <Text style={styles.tag}>
              {isRequest ? item.sessionType : item.type || "Session"}
            </Text>

            {/* Display status as a tag with appropriate color */}
            <Text
              style={[
                styles.tag,
                item.status === "pending"
                  ? styles.pendingTag
                  : item.status === "accepted" || item.status === "scheduled"
                    ? styles.acceptedTag
                    : item.status === "cancelled"
                      ? styles.cancelledTag
                      : item.status === "rejected"
                        ? styles.rejectedTag
                        : styles.tag,
              ]}
            >
              {item.status || "Active"}
            </Text>
          </View>

          <View style={styles.iconsRow}>
            <View style={styles.iconsRow1}>
              {/* Show icons based on session type */}
              {(isRequest ? item.sessionType : item.type) === "personal" && (
                <MaterialIcons name="person-outline" size={24} color="#666" />
              )}
              {(isRequest ? item.sessionType : item.type) === "group" && (
                <MaterialIcons name="groups" size={24} color="#666" />
              )}
              {(isRequest ? item.sessionType : item.type) ===
                "intermediate" && (
                  <MaterialIcons name="trending-up" size={24} color="#666" />
                )}

              {/* Date icon with text */}
              <View style={styles.iconWithText}>
                <MaterialIcons name="event" size={20} color="#666" />
                <Text style={styles.iconText}>
                  {isRequest
                    ? item.requestedDate
                    : new Date(item.startTime).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={styles.viewdetail}>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={handleViewDetails}
              >
                <Text style={styles.detailsText}>View details</Text>
                <MaterialIcons name="chevron-right" size={16} color="#1B89FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Filter data based on selected tab
  const getCurrentData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (innerActiveTab === "Upcoming") {
      // For Upcoming tab, show pending requests and future sessions
      const pendingRequests = myTraining.requests.filter(
        (req) => req.status === "pending" || req.status === "accepted"
      );

      const upcomingSessions = myTraining.sessions.filter((session) => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate >= today && session.status !== "cancelled";
      });

      return [...pendingRequests, ...upcomingSessions];
    } else {
      // For History tab, show past sessions and rejected/cancelled requests
      const pastRequests = myTraining.requests.filter(
        (req) => req.status === "rejected" || req.status === "cancelled"
      );

      const pastSessions = myTraining.sessions.filter((session) => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate < today || session.status === "cancelled";
      });

      return [...pastRequests, ...pastSessions];
    }
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.innerTabContainer}>
        <TouchableOpacity
          style={
            innerActiveTab === "Upcoming"
              ? styles.innerTabActive
              : styles.innerTab
          }
          onPress={() => setInnerActiveTab("Upcoming")}
        >
          <Text
            style={
              innerActiveTab === "Upcoming"
                ? styles.innerTabTextActive
                : styles.innerTabText
            }
          >
            Booking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={
            innerActiveTab === "History"
              ? styles.innerTabActive
              : styles.innerTab
          }
          onPress={() => setInnerActiveTab("History")}
        >
          <Text
            style={
              innerActiveTab === "History"
                ? styles.innerTabTextActive
                : styles.innerTabText
            }
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#f44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchMyTraining}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {!loading && !error && (
        <View style={styles.container1}>
          <FlatList
            data={getCurrentData()}
            keyExtractor={(item) => item._id}
            renderItem={renderSessionCard}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="sports" size={64} color="#ddd" />
                <Text style={styles.emptyText}>
                  {innerActiveTab === "Upcoming"
                    ? "No upcoming training sessions"
                    : "No past training sessions"}
                </Text>
                {/* {innerActiveTab === "Upcoming" && (
                  <TouchableOpacity
                    style={styles.findCoachButton}
                    onPress={() => navigation.navigate("FindTrainers")}
                  >
                    <Text style={styles.findCoachButtonText}>Find a Coach</Text>
                  </TouchableOpacity>
                )} */}
              </View>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 20,
  },
  innerTabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  innerTab: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 10,
  },
  innerTabActive: {
    flex: 1,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#ff6a00",
    paddingBottom: 11,
  },
  innerTabText: {
    fontSize: 16,
    color: "#333",
  },
  innerTabTextActive: {
    fontSize: 16,
    color: "#ff6a00",
    fontWeight: "bold",
  },
  container1: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    padding: 12,
    gap: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trainerImage: {
    height: 78,
    width: 78,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
  },
  trainerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: "#FFF8EB",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    fontSize: 12,
    color: "#666",
  },
  pendingTag: {
    backgroundColor: "#FFF0E6",
    color: "#FF6A00",
  },
  acceptedTag: {
    backgroundColor: "#E8F5E9",
    color: "#4CAF50",
  },
  cancelledTag: {
    backgroundColor: "#FFF8E1",
    color: "#FF9800",
  },
  rejectedTag: {
    backgroundColor: "#FFEBEE",
    color: "#F44336",
  },
  iconsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  iconsRow1: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  iconWithText: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  iconText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  viewdetail: {
    justifyContent: "center",
    alignItems: "center",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailsText: {
    fontSize: 11,
    color: "#1B89FF",
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#f44336",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FF6A00",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  findCoachButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#FF6A00",
    borderRadius: 8,
  },
  findCoachButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Bookingcoach;
