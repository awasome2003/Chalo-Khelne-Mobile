import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import tournamentConfig from "../../api/tournaments";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AllTournamentsScreen = ({ navigation }) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState([]);

  useEffect(() => {
    fetchTournaments();
    fetchUserRegistrations();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch(tournamentConfig.ENDPOINTS.BASE);
      const data = await response.json();

      // Change this part - it seems the API doesn't return a 'success' field
      // and directly returns the tournaments array
      if (data && Array.isArray(data)) {
        setTournaments(data);
      } else if (data && data.success) {
        setTournaments(data.tournaments);
      } else {
        Alert.alert("Error", "Failed to load tournaments");
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      Alert.alert(
        "Error",
        "Failed to load tournaments. Please check your connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserRegistrations = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const response = await fetch(
        tournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId)
      );
      const data = await response.json();

      if (data.success) {
        // Extract tournament IDs from registrations - handle populated object or string
        const registeredTournamentIds = data.bookings.map(
          (booking) => {
            const tId = booking.tournamentId?._id || booking.tournamentId;
            return typeof tId === 'object' ? tId.toString() : tId;
          }
        );
        setUserRegistrations(registeredTournamentIds);
      }
    } catch (error) {
      console.error("Error fetching user registrations:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
    fetchUserRegistrations();
  };

  // Add this new function to navigate directly to specific tournament types
  // Update the handleDirectNavigation function
  const handleDirectNavigation = (tournament) => {
    const t = tournament.type?.toLowerCase() || "";
    if (t.includes("group stage")) {
      navigation.navigate("GroupStage", {
        tournamentId: tournament._id,
        tournamentName: tournament.title,
      });
    } else if (t.includes("knockout")) {
      navigation.navigate("TeamKnockouts", {
        tournamentId: tournament._id,
      });
    } else {
      navigation.navigate("Tournament Details", { tournament });
    }
  };

  // const formatDate = (dateString) => {
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString("en-US", {
  //     year: "numeric",
  //     month: "short",
  //     day: "numeric",
  //   });
  // };

  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";

    try {
      let date;
      // Handle DD/MM/YYYY format from API
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        date = new Date(dateString);
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const isDateInFuture = (dateString) => {
    if (!dateString) return false;

    try {
      let tournamentDate;
      // Handle DD/MM/YYYY format from API
      if (dateString.includes("/")) {
        const [day, month, year] = dateString.split("/");
        tournamentDate = new Date(year, month - 1, day);
      } else {
        tournamentDate = new Date(dateString);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
      tournamentDate.setHours(0, 0, 0, 0);

      return tournamentDate >= today;
    } catch (error) {
      console.error("Error checking date:", error);
      return false;
    }
  };

  const renderTournamentItem = ({ item }) => {
    const isRegistered = userRegistrations.includes(item._id);
    const isActive = item.selectedDate
      ? isDateInFuture(item.selectedDate)
      : true;
    const tournamentType = item.type || "Tournament";

    return (
      <TouchableOpacity
        style={[styles.tournamentCard, isRegistered && styles.registeredCard]}
      >
        <View style={styles.cardHeader}>
          {/* <View style={styles.logoContainer}>
            {item.tournamentLogo ? (
              <Image
                source={require("../../../assets/tournament-banner.jpg")}
                style={styles.tournamentLogo}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderLogo}>
                <MaterialIcons name="sports-tennis" size={30} color="#666" />
              </View>
            )}
          </View> */}
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentName}>{item.title}</Text>
            <Text style={styles.tournamentLocation}>
              <MaterialIcons name="location-on" size={14} color="#666" />{" "}
              {item.eventLocation || "Location not specified"}
            </Text>
            <Text style={styles.tournamentType}>{tournamentType}</Text>
          </View>
          {isRegistered && (
            <View style={styles.registeredBadge}>
              <Text style={styles.registeredText}>Registered</Text>
            </View>
          )}
          {!isActive && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons name="event" size={16} color="#007AFF" />
            <Text style={styles.detailText}>
              {formatDate(item.selectedDate)}
            </Text>
          </View>

          {/* <View style={styles.detailItem}>
            <MaterialIcons name="groups" size={16} color="#007AFF" />
            <Text style={styles.detailText}>
              {item.playerNoValue || "Not specified"}
            </Text>
          </View> */}

          <View style={styles.detailItem}>
            <MaterialIcons name="emoji-events" size={16} color="#007AFF" />
            <Text style={styles.detailText}>
              {item.setNo ? `${item.setNo} sets` : "3 sets"}
            </Text>
          </View>

          {item.tournamentFee > 0 && (
            <View style={styles.detailItem}>
              <MaterialIcons name="attach-money" size={16} color="#007AFF" />
              <Text style={styles.detailText}>Fee: {item.tournamentFee}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          {item.type && (
            <TouchableOpacity
              style={styles.directNavButton}
              onPress={() => handleDirectNavigation(item)}
            >
              <Text style={styles.directNavText}>
                {item.type?.toLowerCase().includes("group stage") ? "View Groups" : "View Knockouts"}
              </Text>
              <MaterialIcons name="launch" size={16} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Tournaments</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading tournaments...</Text>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          renderItem={renderTournamentItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="sports-tennis" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No tournaments available</Text>
            </View>
          }
        />
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
    backgroundColor: "#fff",
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  listContainer: {
    padding: 16,
  },
  tournamentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  tournamentType: {
    fontSize: 12,
    color: "#007AFF",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  registeredCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  tournamentLogo: {
    width: 50,
    height: 50,
  },
  placeholderLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  tournamentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  tournamentLocation: {
    fontSize: 14,
    color: "#666",
    flexDirection: "row",
    alignItems: "center",
  },
  registeredBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  registeredText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "500",
  },
  completedBadge: {
    backgroundColor: "#ECEFF1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  completedText: {
    color: "#607D8B",
    fontSize: 12,
    fontWeight: "500",
  },
  cardDetails: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  cardFooter: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  directNavButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  directNavText: {
    fontSize: 14,
    color: "#4CAF50",
    marginRight: 4,
    fontWeight: "500",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#007AFF",
    marginRight: 4,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
});

export default AllTournamentsScreen;
