import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Calendar } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";

const TrainerSessionsScreen = ({ route, navigation }) => {
  const { trainerId } = route.params;
  const { user } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [markedDates, setMarkedDates] = useState({});
  const [filteredSessions, setFilteredSessions] = useState([]);

  // Session request modal states
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestDate, setRequestDate] = useState(new Date());
  const [requestTime, setRequestTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [requestType, setRequestType] = useState("personal");
  const [requestNotes, setRequestNotes] = useState("");
  const [requestLocation, setRequestLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTrainerDetails();
    fetchTrainerSessions();
  }, [trainerId]);

  useEffect(() => {
    filterSessions();
  }, [selectedDate, selectedType, sessions]);

  const fetchTrainerDetails = async () => {
    try {
      const response = await axios.get(API.ENDPOINTS.GET_BY_ID(trainerId));
      setTrainer(response.data);

      // Set default location based on trainer data
      if (response.data.address) {
        setRequestLocation(response.data.address);
      }
    } catch (error) {
      console.error("Error fetching trainer details:", error);
      Alert.alert("Error", "Unable to load trainer details. Please try again.");
    }
  };

  const fetchTrainerSessions = async () => {
    try {
      setLoading(true);

      // Log the trainerId to verify
      console.log("Fetching sessions for trainerId:", trainerId);

      // Fetch sessions for the specific trainer
      const response = await axios.get(API.ENDPOINTS.SESSIONS(trainerId));

      // Log the raw response to verify data
      console.log("Raw session response:", response.data);

      // Modify filtering to be less restrictive
      const validSessions = response.data.filter((session) => {
        // Log each session for detailed inspection
        console.log("Individual Session:", session);
        return session.status === "scheduled";
      });

      console.log("Filtered valid sessions:", validSessions);

      // Set sessions
      setSessions(validSessions);

      // Generate calendar marked dates
      const marks = {};
      validSessions.forEach((session) => {
        const dateStr = new Date(session.startTime).toISOString().split("T")[0];

        if (!marks[dateStr]) {
          marks[dateStr] = {
            dots: [],
            marked: true,
          };
        }

        // Add a dot for each session type
        const typeDot = {
          key: session.type,
          color: getSessionTypeColor(session.type),
        };

        // Avoid duplicate dots for the same type
        if (!marks[dateStr].dots.some((dot) => dot.key === session.type)) {
          marks[dateStr].dots.push(typeDot);
        }
      });

      // Mark selected date
      if (marks[selectedDate]) {
        marks[selectedDate] = {
          ...marks[selectedDate],
          selected: true,
          selectedColor: "#FF6A00",
        };
      } else {
        marks[selectedDate] = {
          selected: true,
          selectedColor: "#FF6A00",
          dots: [],
        };
      }

      setMarkedDates(marks);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching trainer sessions:", error);

      // More detailed error logging
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Error request:", error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", error.message);
      }

      setLoading(false);
      Alert.alert("Error", "Unable to load sessions. Please try again.");
    }
  };

  const filterSessions = () => {
    if (!sessions.length) {
      setFilteredSessions([]);
      return;
    }

    // Filter by date
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    let filtered = sessions.filter((session) => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= dayStart && sessionDate <= dayEnd;
    });

    // Filter by type if not "all"
    if (selectedType !== "all") {
      filtered = filtered.filter((session) => session.type === selectedType);
    }

    // Sort by start time
    filtered.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    setFilteredSessions(filtered);
  };

  const handleDateSelect = (day) => {
    // Update selected date
    setSelectedDate(day.dateString);

    // Update marked dates to highlight the selected date
    const updatedMarkedDates = { ...markedDates };

    // Remove selection from previous date
    Object.keys(updatedMarkedDates).forEach((date) => {
      if (updatedMarkedDates[date].selected) {
        const { selected, selectedColor, ...rest } = updatedMarkedDates[date];
        updatedMarkedDates[date] = rest;
      }
    });

    // Mark new selected date
    if (updatedMarkedDates[day.dateString]) {
      updatedMarkedDates[day.dateString] = {
        ...updatedMarkedDates[day.dateString],
        selected: true,
        selectedColor: "#FF6A00",
      };
    } else {
      updatedMarkedDates[day.dateString] = {
        selected: true,
        selectedColor: "#FF6A00",
        dots: [],
      };
    }

    setMarkedDates(updatedMarkedDates);
  };

  const handleRequestSubmit = async () => {
    if (!requestLocation.trim()) {
      Alert.alert("Error", "Please provide a location for the session");
      return;
    }

    try {
      setIsSubmitting(true);

      // Format date and time
      const dateStr = requestDate.toISOString().split("T")[0];

      // Get hours and minutes in HH:MM format
      const hours = String(requestTime.getHours()).padStart(2, "0");
      const minutes = String(requestTime.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      const trainerUserId =
        trainer && trainer.userId
          ? typeof trainer.userId === "object"
            ? trainer.userId._id
            : trainer.userId
          : trainerId;

      // Create the request
      const requestData = {
        type: "player",
        playerId: user.id,
        playerName: user.name,
        trainerId: trainerUserId,
        requestedDate: dateStr,
        requestedTime: timeStr,
        sessionType: requestType,
        location: requestLocation,
        notes: requestNotes,
        sportType:
          trainer.sports && trainer.sports.length > 0
            ? trainer.sports[0]
            : "General",
      };

      // Send request to the API
      await axios.post(API.ENDPOINTS.REQUEST_SESSION, requestData);

      setIsSubmitting(false);
      setRequestModalVisible(false);

      // Reset form fields
      setRequestDate(new Date());
      setRequestTime(new Date());
      setRequestType("personal");
      setRequestNotes("");

      // Navigate to My Training tab instead of RequestStatus screen
      Alert.alert(
        "Request Sent",
        "Your request has been sent to the trainer. You can view its status in the My Training section.",
        [
          {
            text: "View My Training",
            onPress: () =>
              navigation.navigate("FindTrainers", {
                screen: "FindTrainers",
                params: { initialTab: "myTraining" },
              }),
          },
          { text: "OK" },
        ]
      );
    } catch (error) {
      console.error("Error submitting session request:", error);
      setIsSubmitting(false);
      Alert.alert("Error", "Failed to send request. Please try again.");
    }
  };

  const handleBookSession = (item) => {
    // Check if the session is already joined or full
    const isFull = item.currentParticipants >= item.maxParticipants;
    const isJoined =
      item.players &&
      item.players.some(
        (player) => player === user?.id || player._id === user?.id
      );

    // If it's already joined or full, just navigate to session details
    if (isJoined) {
      navigation.navigate("SessionDetails", {
        sessionId: item._id,
        trainerId: trainerId,
      });
      return;
    }

    if (isFull) {
      Alert.alert("Session Full", "This session is already at full capacity.");
      return;
    }

    // Otherwise request to join based on session type
    if (item.type === "personal") {
      // For personal sessions, go to BookTraining screen for scheduling
      navigation.navigate("BookTraining", {
        sessionId: item._id,
        trainerId: trainerId,
      });
    } else {
      // For group or intermediate, use the requestJoinSession endpoint
      Alert.alert(
        "Join Session",
        "Would you like to request to join this session?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Request to Join",
            onPress: () => submitJoinRequest(item._id),
          },
        ]
      );
    }
  };

  const submitJoinRequest = async (sessionId) => {
    try {
      setIsSubmitting(true);

      // Create join request
      const requestData = {
        sessionId: sessionId,
        playerId: user.id,
        notes: "Request to join session",
      };

      await axios.post(API.ENDPOINTS.JOIN_SESSION, requestData);

      setIsSubmitting(false);

      // Navigate to My Training tab instead of RequestStatus screen
      Alert.alert(
        "Request Sent",
        "Your request has been sent to the trainer. You can view its status in the My Training section.",
        [
          {
            text: "View My Training",
            onPress: () =>
              navigation.navigate("FindTrainers", {
                screen: "FindTrainers",
                params: { initialTab: "myTraining" },
              }),
          },
          { text: "OK" },
        ]
      );
    } catch (error) {
      console.error("Error submitting join request:", error);
      setIsSubmitting(false);
      Alert.alert("Error", "Failed to send request. Please try again.");
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
        return "#999";
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderSessionItem = ({ item }) => {
    const startTime = formatTime(item.startTime);
    const endTime = formatTime(item.endTime);
    const isFull = item.currentParticipants >= item.maxParticipants;
    const isJoined =
      item.players &&
      item.players.some(
        (player) => player === user?.id || player._id === user?.id
      );

    return (
      <View style={styles.sessionCard}>
        <View style={styles.sessionTimeContainer}>
          <Text style={styles.sessionTime}>{startTime}</Text>
          <View style={styles.timeDivider} />
          <Text style={styles.sessionTime}>{endTime}</Text>
        </View>

        <View style={styles.sessionDetails}>
          <Text style={styles.sessionTitle}>{item.title}</Text>
          <Text style={styles.sessionLocation}>{item.location}</Text>
          <View style={styles.sessionTypeContainer}>
            <View
              style={[
                styles.sessionTypeBadge,
                { backgroundColor: getSessionTypeColor(item.type) },
              ]}
            >
              <Text style={styles.sessionTypeBadgeText}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            {item.type === "group" && (
              <Text style={styles.participantsText}>
                {item.currentParticipants}/{item.maxParticipants} participants
              </Text>
            )}
          </View>
        </View>

        <View style={styles.sessionPriceContainer}>
          <Text style={styles.sessionPrice}>₹{item.price}</Text>
          <TouchableOpacity
            style={[
              styles.bookButton,
              isFull && styles.disabledButton,
              isJoined && styles.joinedButton,
            ]}
            disabled={isFull}
            onPress={() => handleBookSession(item)}
          >
            <Text style={styles.bookButtonText}>
              {isJoined ? "View" : isFull ? "Full" : "Book"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDatePickerModal = () => (
    <Modal
      transparent={true}
      visible={showDatePicker}
      animationType="slide"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={requestDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                setRequestDate(selectedDate);
                if (Platform.OS === "android") {
                  setShowDatePicker(false);
                }
              }
            }}
            style={styles.datePicker}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderTimePickerModal = () => (
    <Modal
      transparent={true}
      visible={showTimePicker}
      animationType="slide"
      onRequestClose={() => setShowTimePicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTimePicker(false)}
      >
        <View style={styles.datePickerContainer}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={requestTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minuteInterval={15}
            onChange={(event, selectedTime) => {
              if (selectedTime) {
                setRequestTime(selectedTime);
                if (Platform.OS === "android") {
                  setShowTimePicker(false);
                }
              }
            }}
            style={styles.datePicker}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trainer Sessions</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {/* Calendar */}
          <Calendar
            current={selectedDate}
            onDayPress={handleDateSelect}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: "#ffffff",
              calendarBackground: "#ffffff",
              textSectionTitleColor: "#b6c1cd",
              selectedDayBackgroundColor: "#FF6A00",
              selectedDayTextColor: "#ffffff",
              todayTextColor: "#FF6A00",
              dayTextColor: "#2d4150",
              dotColor: "#FF6A00",
              selectedDotColor: "#ffffff",
              arrowColor: "#FF6A00",
              disabledArrowColor: "#d9e1e8",
              monthTextColor: "#2d4150",
              indicatorColor: "#FF6A00",
              textDayFontWeight: "300",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "300",
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 14,
            }}
          />

          {/* Session Type Filters */}
          <View style={styles.typeFilterContainer}>
            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                selectedType === "all" && styles.selectedTypeFilter,
              ]}
              onPress={() => setSelectedType("all")}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  selectedType === "all" && styles.selectedTypeFilterText,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                selectedType === "personal" && styles.selectedTypeFilter,
              ]}
              onPress={() => setSelectedType("personal")}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  selectedType === "personal" && styles.selectedTypeFilterText,
                ]}
              >
                Personal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                selectedType === "group" && styles.selectedTypeFilter,
              ]}
              onPress={() => setSelectedType("group")}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  selectedType === "group" && styles.selectedTypeFilterText,
                ]}
              >
                Group
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeFilterButton,
                selectedType === "intermediate" && styles.selectedTypeFilter,
              ]}
              onPress={() => setSelectedType("intermediate")}
            >
              <Text
                style={[
                  styles.typeFilterText,
                  selectedType === "intermediate" &&
                  styles.selectedTypeFilterText,
                ]}
              >
                Intermediate
              </Text>
            </TouchableOpacity>
          </View>

          {/* Selected Date Display */}
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateText}>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.sessionsCountText}>
              {filteredSessions.length}{" "}
              {filteredSessions.length === 1 ? "session" : "sessions"} available
            </Text>
          </View>

          {/* Session List */}
          {loadingMore ? (
            <ActivityIndicator
              size="small"
              color="#FF6A00"
              style={styles.loadingMore}
            />
          ) : (
            <FlatList
              data={filteredSessions}
              renderItem={renderSessionItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.sessionsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>
                    No available sessions for this day
                  </Text>
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => setRequestModalVisible(true)}
                  >
                    <Text style={styles.requestButtonText}>
                      Request a Session
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}

          {/* Request Button (always visible) */}
          {filteredSessions.length > 0 && (
            <TouchableOpacity
              style={styles.floatingRequestButton}
              onPress={() => setRequestModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.floatingRequestButtonText}>
                Request Session
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Session Request Modal */}
      <Modal
        visible={requestModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.requestModalContent}>
            <View style={styles.requestModalHeader}>
              <Text style={styles.requestModalTitle}>Request a Session</Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.requestModalBody}>
              <Text style={styles.requestModalLabel}>Session Type</Text>
              <View style={styles.sessionTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.sessionTypeButton,
                    requestType === "personal" &&
                    styles.sessionTypeButtonActive,
                  ]}
                  onPress={() => setRequestType("personal")}
                >
                  <Ionicons
                    name="person"
                    size={20}
                    color={requestType === "personal" ? "#fff" : "#333"}
                  />
                  <Text
                    style={[
                      styles.sessionTypeButtonText,
                      requestType === "personal" &&
                      styles.sessionTypeButtonTextActive,
                    ]}
                  >
                    Personal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sessionTypeButton,
                    requestType === "group" && styles.sessionTypeButtonActive,
                  ]}
                  onPress={() => setRequestType("group")}
                >
                  <Ionicons
                    name="people"
                    size={20}
                    color={requestType === "group" ? "#fff" : "#333"}
                  />
                  <Text
                    style={[
                      styles.sessionTypeButtonText,
                      requestType === "group" &&
                      styles.sessionTypeButtonTextActive,
                    ]}
                  >
                    Group
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sessionTypeButton,
                    requestType === "intermediate" &&
                    styles.sessionTypeButtonActive,
                  ]}
                  onPress={() => setRequestType("intermediate")}
                >
                  <Ionicons
                    name="trending-up"
                    size={20}
                    color={requestType === "intermediate" ? "#fff" : "#333"}
                  />
                  <Text
                    style={[
                      styles.sessionTypeButtonText,
                      requestType === "intermediate" &&
                      styles.sessionTypeButtonTextActive,
                    ]}
                  >
                    Intermediate
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.requestModalLabel}>Date</Text>
              <TouchableOpacity
                style={styles.dateTimeSelector}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateTimeSelectorText}>
                  {requestDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </TouchableOpacity>

              <Text style={styles.requestModalLabel}>Time</Text>
              <TouchableOpacity
                style={styles.dateTimeSelector}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.dateTimeSelectorText}>
                  {requestTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>

              <Text style={styles.requestModalLabel}>Location</Text>
              <TextInput
                style={styles.requestInput}
                placeholder="Enter session location"
                value={requestLocation}
                onChangeText={setRequestLocation}
              />

              {/* Price Display */}
              {trainer && trainer.fees && trainer.fees.perSession > 0 && (
                <View style={styles.priceContainer}>
                  <Text style={styles.requestModalLabel}>Estimated Price</Text>
                  <View style={styles.priceDisplay}>
                    <Ionicons name="cash-outline" size={20} color="#666" />
                    <Text style={styles.priceValue}>
                      ₹
                      {requestType === "personal"
                        ? trainer.fees.perSession
                        : requestType === "group"
                          ? Math.round(trainer.fees.perSession * 0.7)
                          : Math.round(trainer.fees.perSession * 1.2)}
                    </Text>
                  </View>
                  <Text style={styles.priceNote}>
                    Final price may vary based on trainer's rates and session
                    details.
                  </Text>
                </View>
              )}

              <Text style={styles.requestModalLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.requestInput, styles.requestTextarea]}
                placeholder="Any specific requirements or goals for this session?"
                value={requestNotes}
                onChangeText={setRequestNotes}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.submitRequestButton,
                  isSubmitting && styles.disabledButton,
                ]}
                onPress={handleRequestSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitRequestButtonText}>
                    Submit Request
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date and Time Picker Modals */}
      {renderDatePickerModal()}
      {renderTimePickerModal()}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  contentContainer: {
    flex: 1,
  },
  selectedDateContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sessionsCountText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  typeFilterContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    justifyContent: "space-between",
  },
  typeFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
  },
  selectedTypeFilter: {
    backgroundColor: "#FF6A00",
  },
  typeFilterText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedTypeFilterText: {
    color: "#fff",
  },
  sessionsList: {
    padding: 16,
    paddingBottom: 80,
  },
  sessionCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sessionTimeContainer: {
    alignItems: "center",
    marginRight: 16,
    minWidth: 50,
  },
  sessionTime: {
    fontSize: 14,
    fontWeight: "500",
  },
  timeDivider: {
    width: 16,
    height: 1,
    backgroundColor: "#666",
    marginVertical: 4,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sessionLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  sessionTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  sessionTypeBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  participantsText: {
    fontSize: 12,
    color: "#666",
  },
  sessionPriceContainer: {
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  sessionPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6A00",
    marginBottom: 8,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "#FF6A00",
    borderRadius: 16,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  joinedButton: {
    backgroundColor: "#4CAF50",
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
    marginBottom: 16,
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FF6A00",
    borderRadius: 8,
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
  floatingRequestButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#FF6A00",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  floatingRequestButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  requestModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  requestModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  requestModalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  requestModalBody: {
    padding: 16,
  },
  requestModalLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8,
  },
  sessionTypeButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionTypeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sessionTypeButtonActive: {
    backgroundColor: "#FF6A00",
  },
  sessionTypeButtonText: {
    marginLeft: 6,
    fontWeight: "500",
  },
  sessionTypeButtonTextActive: {
    color: "#fff",
  },
  dateTimeSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
  },
  dateTimeSelectorText: {
    marginLeft: 8,
    fontSize: 16,
  },
  requestInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  requestTextarea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitRequestButton: {
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  submitRequestButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "80%",
    padding: 16,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  datePicker: {
    height: 200,
  },
  confirmButton: {
    backgroundColor: "#FF6A00",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  loadingMore: {
    paddingVertical: 16,
  },
  // Price display styles
  priceContainer: {
    marginVertical: 8,
  },
  priceDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
  },
  priceValue: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6A00",
  },
  priceNote: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default TrainerSessionsScreen;
