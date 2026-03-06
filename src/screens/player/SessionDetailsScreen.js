import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const SessionDetailsScreen = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelingSession, setCancelingSession] = useState(false);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const sessionResponse = await axios.get(
        API.ENDPOINTS.GET_SESSION_BY_ID(sessionId)
      );
      setSession(sessionResponse.data);

      // Fetch trainer details if trainer ID is available
      if (sessionResponse.data.trainerId) {
        const trainerId =
          typeof sessionResponse.data.trainerId === "object"
            ? sessionResponse.data.trainerId._id
            : sessionResponse.data.trainerId;

        const trainerResponse = await axios.get(
          API.ENDPOINTS.GET_BY_ID(trainerId)
        );
        setTrainer(trainerResponse.data);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching session details:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load session details");
    }
  };

  const handleCancelSession = () => {
    Alert.alert(
      "Cancel Session",
      "Are you sure you want to cancel this session? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", onPress: confirmCancelSession },
      ]
    );
  };

  const confirmCancelSession = async () => {
    try {
      setCancelingSession(true);

      // Remove player from session
      const updatedPlayers = session.players.filter(
        (player) => player._id !== user.id && player !== user.id
      );

      // Get the proper trainerId value with safer null checks
      let trainerId;
      if (session.trainerId) {
        // If trainerId is an object with _id property
        if (
          typeof session.trainerId === "object" &&
          session.trainerId !== null &&
          session.trainerId._id
        ) {
          trainerId = session.trainerId._id;
        }
        // If trainerId is a string/ID directly
        else {
          trainerId = session.trainerId;
        }
      } else {
        // Handle case where trainerId is missing (shouldn't happen normally)
        console.warn("Warning: trainerId is missing from session data");
        // We'll still try to update without it, or you could set a default value here
      }

      // Create update payload with conditional trainerId
      const updatePayload = {
        players: updatedPlayers,
        currentParticipants: updatedPlayers.length,
      };

      // Only include trainerId in the payload if we have a valid value
      if (trainerId) {
        updatePayload.trainerId = trainerId;
      }

      // Update session with player removed
      await axios.put(API.ENDPOINTS.UPDATE_SESSION(sessionId), updatePayload);

      setCancelingSession(false);

      Alert.alert(
        "Session Cancelled",
        "You have been removed from this session.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("FindTrainers", {
                screen: "FindTrainers",
                params: { initialTab: "myTraining" },
              }),
          },
        ]
      );
    } catch (error) {
      console.error("Error cancelling session:", error);
      setCancelingSession(false);
      Alert.alert("Error", "Failed to cancel session. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSessionTypeIcon = (type) => {
    switch (type) {
      case "personal":
        return "person";
      case "group":
        return "people";
      case "intermediate":
        return "trending-up";
      default:
        return "fitness";
    }
  };

  const getSessionTypeColor = (type) => {
    switch (type) {
      case "personal":
        return "#FF6A00";
      case "group":
        return "#4CAF50";
      case "intermediate":
        return "#2196F3";
      default:
        return "#FF6A00";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Session Title Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.sessionTypeBadge}>
            <Ionicons
              name={getSessionTypeIcon(session.type)}
              size={20}
              color="#fff"
            />
            <Text style={styles.sessionTypeBadgeText}>
              {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
            </Text>
          </View>
          <Text style={styles.sessionTitle}>{session.title}</Text>
          <Text style={styles.sessionStatus}>
            Status:{" "}
            <Text style={styles.statusHighlight}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </Text>
          </Text>
        </View>

        {/* Session Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Session Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>
              {formatDate(session.startTime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>
              {formatTime(session.startTime)} - {formatTime(session.endTime)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>{session.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>₹{session.price}</Text>
          </View>

          {session.sportType && (
            <View style={styles.detailRow}>
              <Ionicons name="basketball-outline" size={20} color="#FF6A00" />
              <Text style={styles.detailText}>{session.sportType}</Text>
            </View>
          )}

          {session.type === "group" && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color="#FF6A00" />
              <Text style={styles.detailText}>
                {session.currentParticipants}/{session.maxParticipants}{" "}
                participants
              </Text>
            </View>
          )}

          {session.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Session Notes:</Text>
              <Text style={styles.notesText}>{session.notes}</Text>
            </View>
          )}
        </View>

        {/* Trainer Details Card */}
        {trainer && (
          <View style={styles.trainerCard}>
            <Text style={styles.sectionTitle}>Trainer</Text>

            <View style={styles.trainerProfileContainer}>
              <Image
                source={
                  trainer.profileImage
                    ? { uri: trainer.profileImage }
                    : require("../../../assets/person.webp")
                }
                style={styles.trainerImage}
              />

              <View style={styles.trainerInfo}>
                <Text style={styles.trainerName}>
                  {trainer.firstName} {trainer.lastName}
                </Text>

                {trainer.rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {trainer.rating.toFixed(1)}
                      {trainer.reviewCount ? ` (${trainer.reviewCount})` : ""}
                    </Text>
                  </View>
                )}

                {trainer.sports && trainer.sports.length > 0 && (
                  <View style={styles.sportsContainer}>
                    {trainer.sports.map((sport, index) => (
                      <Text key={index} style={styles.sportTag}>
                        {sport}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() =>
                navigation.navigate("TrainerProfile", {
                  trainerId: trainer._id,
                })
              }
            >
              <Text style={styles.viewProfileButtonText}>
                View Trainer Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Participants Section (for group sessions) */}
        {session.type === "group" &&
          session.players &&
          session.players.length > 0 && (
            <View style={styles.participantsCard}>
              <Text style={styles.sectionTitle}>
                Participants ({session.players.length})
              </Text>

              {session.players.map((player, index) => (
                <View key={index} style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <View style={styles.participantInitial}>
                      <Text style={styles.initialText}>
                        {(player.name || "").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.participantName}>
                      {player.name || "Anonymous Player"}
                    </Text>
                  </View>

                  {player._id === user.id && (
                    <Text style={styles.youBadge}>You</Text>
                  )}
                </View>
              ))}
            </View>
          )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {/* Only show cancel button if session is scheduled AND user is confirmed participant */}
        {session.status === "scheduled" &&
          session.players &&
          session.players.some(
            (player) =>
              (player._id === user.id || player === user.id) &&
              (!session.paymentStatus || session.paymentStatus === "completed")
          ) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSession}
              disabled={cancelingSession}
            >
              {cancelingSession ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Booking</Text>
              )}
            </TouchableOpacity>
          )}

        {/* If session is scheduled but user hasn't completed payment, show different button */}
        {session.status === "scheduled" &&
          session.players &&
          session.players.some(
            (player) =>
              (player._id === user.id || player === user.id) &&
              session.paymentStatus === "pending"
          ) && (
            <TouchableOpacity
              style={styles.completePaymentButton}
              onPress={() =>
                navigation.navigate("PaymentScreen", {
                  sessionId: session._id,
                  amount: session.price,
                })
              }
            >
              <Text style={styles.completePaymentButtonText}>
                Complete Payment
              </Text>
            </TouchableOpacity>
          )}

        {/* If user is viewing a session they're not part of, show book button */}
        {session.status === "scheduled" &&
          (!session.players ||
            !session.players.some(
              (player) => player._id === user.id || player === user.id
            )) && (
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() =>
                navigation.navigate("BookTraining", {
                  sessionId: session._id,
                  trainerId: session.trainerId._id || session.trainerId,
                })
              }
            >
              <Text style={styles.bookButtonText}>Request to Join</Text>
            </TouchableOpacity>
          )}
      </View>
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
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#FF6A00",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  scrollContainer: {
    flex: 1,
  },
  bannerContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sessionTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6A00",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  sessionTypeBadgeText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  sessionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sessionStatus: {
    fontSize: 14,
    color: "#666",
  },
  statusHighlight: {
    fontWeight: "600",
    color: "#4CAF50",
  },
  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  notesContainer: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  trainerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trainerProfileContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  trainerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  trainerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sportTag: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 12,
    color: "#666",
  },
  viewProfileButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  viewProfileButtonText: {
    color: "#FF6A00",
    fontWeight: "600",
  },
  participantsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  participantInitial: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  initialText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  participantName: {
    fontSize: 16,
  },
  youBadge: {
    fontSize: 12,
    color: "#fff",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    backgroundColor: "#F44336",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  completePaymentButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  completePaymentButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default SessionDetailsScreen;
