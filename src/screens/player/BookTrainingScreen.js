import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const BookTrainingScreen = ({ route, navigation }) => {
  const { sessionId, trainerId } = route.params;
  const { user } = useAuth();

  // State Management
  const [session, setSession] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);

  // Request States
  const [isRequesting, setIsRequesting] = useState(false);

  // Form States
  const [notes, setNotes] = useState("");

  // Fetch Session and Trainer Details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);

        // Fetch Session Details
        const sessionResponse = await axios.get(
          API.ENDPOINTS.GET_SESSION_BY_ID(sessionId)
        );
        setSession(sessionResponse.data);

        // Fetch Trainer Details
        const trainerResponse = await axios.get(
          API.ENDPOINTS.GET_BY_ID(trainerId)
        );
        setTrainer(trainerResponse.data);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching details:", error);
        Alert.alert("Error", "Failed to load session details");
        setLoading(false);
      }
    };

    fetchDetails();
  }, [sessionId, trainerId]);

  // Handle Session Request Submission
  const handleSubmitRequest = async () => {
    // Validate inputs
    if (!session || !trainer) {
      Alert.alert("Error", "Session or trainer information is missing");
      return;
    }

    const trainerUserId = session.trainerId
      ? typeof session.trainerId === "object"
        ? session.trainerId._id
        : session.trainerId
      : trainer && trainer.userId
        ? typeof trainer.userId === "object"
          ? trainer.userId._id
          : trainer.userId
        : trainerId;

    try {
      setIsRequesting(true);

      // Prepare request data
      const requestData = {
        type: "player",
        playerId: user.id,
        playerName: user.name,
        trainerId: trainerUserId,
        sessionId: session._id,
        requestType: "join_session",
        requestedDate: new Date(session.startTime).toISOString().split("T")[0],
        requestedTime: new Date(session.startTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sessionType: session.type,
        location: session.location,
        notes: notes || "Request to join session",
      };

      // Submit session request
      await axios.post(API.ENDPOINTS.JOIN_SESSION, requestData);

      // Navigate to My Training tab
      Alert.alert(
        "Request Sent",
        "Your request has been sent to the trainer. You can view its status in the My Training section.",
        [
          {
            text: "View My Training",
            onPress: () =>
              navigation.navigate("FindTrainers", { initialTab: "myTraining" }),
          },
          { text: "OK", onPress: () => navigation.goBack() },
        ]
      );
    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to submit request"
      );
      setIsRequesting(false);
    }
  };

  // Render Loading State
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
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
        <Text style={styles.headerTitle}>Request Session</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Session Details Card */}
        <View style={styles.sessionCard}>
          <Text style={styles.sectionTitle}>Session Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>
              {new Date(session.startTime).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>
              {new Date(session.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              -
              {new Date(session.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>{session.location}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="fitness-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>
              {session.type.charAt(0).toUpperCase() + session.type.slice(1)}{" "}
              Training
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={20} color="#FF6A00" />
            <Text style={styles.detailText}>₹{session.price}</Text>
          </View>

          {session.type === "group" && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color="#FF6A00" />
              <Text style={styles.detailText}>
                {session.currentParticipants}/{session.maxParticipants}{" "}
                participants
              </Text>
            </View>
          )}
        </View>

        {/* Trainer Details Card */}
        <View style={styles.trainerCard}>
          <Text style={styles.sectionTitle}>Trainer</Text>
          <Text style={styles.trainerName}>
            {trainer.firstName} {trainer.lastName}
          </Text>

          {trainer.sports && trainer.sports.length > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="barbell-outline" size={20} color="#FF6A00" />
              <Text style={styles.detailText}>{trainer.sports.join(", ")}</Text>
            </View>
          )}

          {trainer.rating > 0 && (
            <View style={styles.detailRow}>
              <Ionicons name="star" size={20} color="#FFD700" />
              <Text style={styles.detailText}>
                {trainer.rating.toFixed(1)} ({trainer.reviewCount} reviews)
              </Text>
            </View>
          )}
        </View>

        {/* Notes Input */}
        <View style={styles.notesCard}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any specific requirements or information for the trainer"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Request Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleSubmitRequest}
          disabled={isRequesting}
        >
          {isRequesting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.requestButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>
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
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionCard: {
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
  notesCard: {
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
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 12,
    fontSize: 16,
  },
  trainerName: {
    fontSize: 16,
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
  },
  bottomBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  requestButton: {
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  requestButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "80%",
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalCloseButton: {
    marginTop: 12,
  },
  modalCloseButtonText: {
    color: "#666",
  },
});

export default BookTrainingScreen;
