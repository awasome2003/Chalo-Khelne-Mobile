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
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSportName, getTournamentType, getCategories } from "../../utils/sportTrack";
import { useFocusEffect } from "@react-navigation/native";
import TOURNAMENTS from "../../api/tournaments";
import { authFetch } from "../../api/authFetch";
import { assetUrl } from "../../utils/assetUrl";

// ─── Green design system tokens ──────────────────────────────────────────────
const GREEN = "#15A765"; // primary brand — buttons, active states, accents
const GREEN_DARK = "#0F8A55"; // gradients, emphasis text
const GREEN_TINT = "#E8F7F0"; // active chip bg, soft fills
const TEXT_DARK = "#1A181B"; // headings / primary text
const TEXT_MUTED = "#6B7280"; // secondary text, labels, placeholders
const BORDER = "#EEEEFF"; // card/search borders
const FIELD_BG = "#F4F4F5"; // input/track/inactive-chip bg
const SCREEN_BG = "#FFFFFF"; // screen background

const EventDetails = ({ route, navigation }) => {
  const { tournamentId } = route.params;
  const insets = useSafeAreaInsets();
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
      const response = await authFetch(url);
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
  // STEP 17b.iii — read per-sport categories.
  const getDisplayCategories = () => {
    const _cats = getCategories(tournament);
    if (_cats.length === 0) return "";
    return _cats.map(c => {
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
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={styles.loadingText}>Loading tournament details...</Text>
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={56} color="#D1D5DB" />
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
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Tournament Image Hero */}
        <View style={styles.imageContainer}>
          <Image
            source={
              tournament.logo
                ? { uri: assetUrl(tournament.logo) }
                : require("../../../assets/tournament-banner.jpg")
            }
            style={styles.tournamentImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            style={styles.imageOverlay}
          />
          <TouchableOpacity
            style={[styles.backIconButton, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
          </TouchableOpacity>
        </View>

        {/* Tournament Details — content sheet overlapping the hero */}
        <View style={styles.detailsContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.tournamentTypeContainer}>
              <Text style={styles.tournamentType}>
                {getTournamentType(tournament) || "Tournament"}
              </Text>
            </View>

            {(() => {
              const _sportName = getSportName(tournament);
              return _sportName && (
                <View style={styles.sportTypeContainer}>
                  <Ionicons
                    name={getSportIcon(_sportName)}
                    size={16}
                    color={GREEN_DARK}
                  />
                  <Text style={styles.sportTypeText}>
                    {_sportName}
                  </Text>
                </View>
              );
            })()}
          </View>

          <Text style={styles.tournamentTitle}>{tournament.title}</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color={GREEN} />
              <Text style={styles.infoText}>
                {getDisplayDate()}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={GREEN} />
              <Text style={styles.infoText}>
                {tournament.isAllDay
                  ? "All Day"
                  : formatTime(tournament.selectedTime)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color={GREEN} />
              <Text style={styles.infoText} numberOfLines={1}>
                {normalizeLocation(tournament.eventLocation || tournament.location || tournament.address)}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color={GREEN} />
              <Text style={styles.infoText}>
                {tournament.numTeams || 0} Teams
              </Text>
            </View>
          </View>

          {tournament.tournamentFee > 0 && (
            <View style={styles.feeContainer}>
              <Ionicons name="cash-outline" size={20} color={GREEN_DARK} />
              <Text style={styles.feeText}>
                Registration Fee: ₹{tournament.tournamentFee}
              </Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>
                {tournament.description || "No description available."}
              </Text>
            </View>
          </View>

          {/* Tournament Details */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Tournament Details</Text>

            <View style={styles.detailsCard}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Format:</Text>
                <Text style={styles.detailValue}>
                  {getTournamentType(tournament) || "Standard"}
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

              {getCategories(tournament).length > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Categories:</Text>
                  <Text style={styles.detailValue}>
                    {getDisplayCategories()}
                  </Text>
                </View>
              )}

              {tournament.createdAt && (
                <View style={[styles.detailItem, styles.detailItemLast]}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(tournament.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Register Now bar — sign-in stub, GREEN button */}
      <View style={[styles.registrationContainer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
          disabled={registering}
          activeOpacity={0.85}
        >
          {registering ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.registerButtonText}>Register Now</Text>
              <MaterialIcons name="chevron-right" size={22} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SCREEN_BG,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: SCREEN_BG,
  },
  errorText: {
    fontSize: 18,
    color: TEXT_MUTED,
    marginVertical: 20,
    textAlign: "center",
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 30,
    backgroundColor: GREEN,
    borderRadius: 14,
  },
  backButtonText: {
    color: "#fff",
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    fontSize: 14,
  },
  imageContainer: {
    position: "relative",
    height: 300,
    overflow: "hidden",
  },
  tournamentImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  backIconButton: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: SCREEN_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: "row",
    marginBottom: 14,
  },
  tournamentTypeContainer: {
    backgroundColor: GREEN_TINT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 10,
  },
  tournamentType: {
    color: GREEN_DARK,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sportTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_TINT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sportTypeText: {
    color: GREEN_DARK,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    fontSize: 12,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  tournamentTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: FIELD_BG,
    padding: 15,
    borderRadius: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: TEXT_DARK,
    marginLeft: 8,
    fontFamily: "Poppins_400Regular",
    flexShrink: 1,
  },
  feeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GREEN_TINT,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  feeText: {
    fontSize: 15,
    color: GREEN_DARK,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    marginLeft: 10,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 12,
  },
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  descriptionText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontFamily: "Poppins_400Regular",
    lineHeight: 22,
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  detailItem: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  detailItemLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 13,
    color: TEXT_MUTED,
    width: 130,
    fontFamily: "Poppins_400Regular",
  },
  detailValue: {
    fontSize: 13,
    color: TEXT_DARK,
    flex: 1,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
  },
  registrationContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: SCREEN_BG,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  registerButton: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    marginRight: 6,
  },
});

export default EventDetails;
