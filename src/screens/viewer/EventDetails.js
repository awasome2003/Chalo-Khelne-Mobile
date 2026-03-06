import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import TOURNAMENTS from "../../api/tournaments";
import API from "../../api/api";
import colors from "../../config/colors";

const EventDetails = ({ route, navigation }) => {
  const { tournamentId } = route.params;
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // useEffect(() => {
  //   fetchTournament Details();
  // }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Refetch tournament details whenever the screen comes into focus
      if (tournamentId) {
        fetchTournamentDetails();
      }

      return () => {
        // Clean up function (optional)
        setTournament(null);
      };
    }, [tournamentId])
  );

  const fetchTournamentDetails = async () => {
    setLoading(true);
    try {
      // Use the BY_ID endpoint from the TOURNAMENTS configuration
      const url = TOURNAMENTS.ENDPOINTS.BY_ID(tournamentId);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.tournament) {
        setTournament(data.tournament);
      } else {
        setTournament(data);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load tournament details");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      // This would be your registration logic
      // For now we'll just show an alert
      setTimeout(() => {
        Alert.alert(
          "Registration",
          "Sign in to register for the tournament and access more features!",
          [{ text: "OK" }]
        );
        setRegistering(false);
      }, 1000);
    } catch (error) {
      console.error("Error registering for tournament:", error);
      Alert.alert("Error", "Failed to register for tournament");
      setRegistering(false);
    }
  };

  // Helper function to get sport icon name
  const getSportIcon = (sportType) => {
    if (!sportType) return "tennisball-outline";

    const sport = sportType.toLowerCase();
    if (sport.includes("tennis")) return "tennisball-outline";
    if (sport.includes("football") || sport.includes("soccer"))
      return "football-outline";
    if (sport.includes("cricket")) return "baseball-outline";
    if (sport.includes("basketball")) return "basketball-outline";
    return "fitness-outline";
  };

  // Format time from selectedTime object
  const formatTime = (selectedTime) => {
    if (!selectedTime) return "Time TBD";

    const to12Hour = (timeStr) => {
      if (!timeStr) return "";
      let cleanTime = timeStr.trim();
      if (/[a-zA-Z]/.test(cleanTime)) return cleanTime;

      let [hour, minute] = cleanTime.split(':').map(Number);
      if (isNaN(hour)) return cleanTime;

      const period = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      const mStr = minute !== undefined ? `:${minute.toString().padStart(2, '0')}` : ':00';

      return `${h12}${mStr} ${period}`;
    };

    if (selectedTime.timeSlot) {
      return selectedTime.timeSlot;
    }

    let start = selectedTime.startTime;
    let end = selectedTime.endTime;

    if (!start && selectedTime.hour) {
      start = `${selectedTime.hour}:${selectedTime.minute || "00"}`;
    }

    if (!start) return "Time TBD";

    const displayStart = to12Hour(start);
    const displayEnd = end ? to12Hour(end) : "";

    if (displayEnd) {
      return `${displayStart} - ${displayEnd}`;
    }

    if (selectedTime.period && !displayStart.includes("AM") && !displayStart.includes("PM")) {
      return `${displayStart} ${selectedTime.period}`;
    }

    return displayStart || "Time TBD";
  };

  // Helper to robustly get the Display Date
  const getDisplayDate = () => {
    const d = tournament?.startDate || tournament?.selectedDate;
    if (!d) return "Date TBD";
    try {
      if (typeof d === "string" && d.includes("/")) {
        const parts = d.split("/");
        if (parts.length === 3) {
          const formatted = new Date(parts[2], parts[1] - 1, parts[0]);
          return formatted.toLocaleDateString();
        }
      }
      return new Date(d).toLocaleDateString();
    } catch {
      return "Date TBD";
    }
  };

  // Helper to normalize nested location formats reliably
  const normalizeLocation = (loc) => {
    if (!loc) return "Location TBD";
    if (typeof loc === "string") return loc.trim();
    if (typeof loc === "object") {
      if (Array.isArray(loc)) {
        return loc.map(item => {
          if (typeof item === "string") return item.trim();
          if (typeof item === "object") return item?.name || item?.title || item?.address || "";
          return String(item);
        }).filter(Boolean).join(", ");
      } else {
        return loc?.name || loc?.title || loc?.address || "Location TBD";
      }
    }
    return String(loc).trim();
  };

  // Helper to extract nested categories without [object Object] rendering
  const getDisplayCategories = () => {
    if (!tournament?.category || !Array.isArray(tournament.category)) return "";
    return tournament.category.map(c => {
      if (typeof c === "string") return c;
      if (typeof c === "object" && c !== null) {
        return c.label || c.name || c.title || c.categoryName || c.type || JSON.stringify(c);
      }
      return String(c);
    }).join(", ");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading tournament details...</Text>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
        <Text style={styles.errorText}>Tournament not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tournament Image Hero */}
        <View style={styles.imageContainer}>
          <Image
            source={
              tournament.logo
                ? { uri: `${API.UPLOADS_URL}/${tournament.logo}` }
                : require("../../../assets/tournament-banner.jpg")
            }
            style={styles.tournamentImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.01)']}
            style={styles.imageOverlay}
          />
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tournament Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.tournamentTypeContainer}>
              <Text style={styles.tournamentType}>
                {tournament.type || "Tournament"}
              </Text>
            </View>

            {tournament.sportsType && (
              <View style={styles.sportTypeContainer}>
                <Ionicons
                  name={getSportIcon(tournament.sportsType)}
                  size={16}
                  color="#FF6A00"
                />
                <Text style={styles.sportTypeText}>
                  {tournament.sportsType}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.tournamentTitle}>{tournament.title}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                {getDisplayDate()}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                {tournament.isAllDay
                  ? "All Day"
                  : formatTime(tournament.selectedTime)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {normalizeLocation(tournament.eventLocation || tournament.location || tournament.address)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                {tournament.numTeams || 0} Teams
              </Text>
            </View>
          </View>

          {tournament.tournamentFee > 0 && (
            <View style={styles.feeContainer}>
              <Ionicons name="cash-outline" size={20} color="#4CAF50" />
              <Text style={styles.feeText}>
                Registration Fee: ₹{tournament.tournamentFee}
              </Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {tournament.description || "No description available."}
            </Text>
          </View>

          {/* Tournament Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Tournament Details</Text>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Format:</Text>
              <Text style={styles.detailValue}>
                {tournament.type || "Standard"}
              </Text>
            </View>

            {tournament.selectedCourt && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Court:</Text>
                <Text style={styles.detailValue}>
                  {tournament.selectedCourt}
                </Text>
              </View>
            )}

            {tournament.playerNoValue && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Player Format:</Text>
                <Text style={styles.detailValue}>
                  {tournament.playerNoValue === "Single player"
                    ? "Single player"
                    : `${tournament.playerNoValue} players per team`}
                </Text>
              </View>
            )}

            {tournament.setNo && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Sets:</Text>
                <Text style={styles.detailValue}>
                  {String(tournament.setNo).includes("sets")
                    ? tournament.setNo
                    : `${tournament.setNo} sets`}
                </Text>
              </View>
            )}

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Organizer:</Text>
              <Text style={styles.detailValue}>
                {tournament.organizerName || "TBD"}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cancellation Policy:</Text>
              <Text style={styles.detailValue}>
                {tournament.cancellationPolicy || "None"}
              </Text>
            </View>

            {tournament.category && tournament.category.length > 0 && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Categories:</Text>
                <Text style={styles.detailValue}>
                  {getDisplayCategories()}
                </Text>
              </View>
            )}

            {tournament.createdAt && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Created:</Text>
                <Text style={styles.detailValue}>
                  {new Date(tournament.createdAt).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Registration Button Floor */}
      <View style={styles.registrationContainer}>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={registering}
        >
          <LinearGradient
            colors={['#FF6A00', '#FF4E00']}
            style={styles.gradientBtn}
          >
            {registering ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Register Now</Text>
                <MaterialIcons name="chevron-right" size={22} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 15,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  errorText: {
    fontSize: 18,
    color: "#252944",
    marginVertical: 20,
    textAlign: "center",
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#3B4DFD',
    borderRadius: 12,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imageContainer: {
    position: "relative",
    height: 300,
  },
  tournamentImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backIconButton: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    marginBottom: 15,
  },
  tournamentTypeContainer: {
    backgroundColor: 'rgba(59, 77, 253, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 10,
  },
  tournamentType: {
    color: '#3B4DFD',
    fontWeight: "bold",
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sportTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 106, 0, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sportTypeText: {
    color: "#FF6A00",
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  tournamentTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: "#444",
    marginLeft: 8,
    fontWeight: '500',
  },
  feeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 25,
  },
  feeText: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "bold",
    marginLeft: 10,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#252944",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: "#666",
    lineHeight: 24,
  },
  detailItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: "#888",
    width: 130,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    fontWeight: '600',
  },
  registrationContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  registerButton: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 56,
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
});

export default EventDetails;
