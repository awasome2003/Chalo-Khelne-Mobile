import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import TournamentConfig from "../../api/tournaments";
import API from "../../api/api";
import axios from "axios";

const MyEventScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventData, setEventData] = useState({ upcoming: [], past: [] });

  useEffect(() => {
    fetchUserBookings();
  }, [user]);

  const fetchUserBookings = async () => {
    if (!user?._id && !user?.id) return;
    try {
      setLoading(true);
      const userId = user._id || user.id;
      const response = await axios.get(TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId));

      if (response.data?.success) {
        const bookings = response.data.data || [];

        // Split into upcoming and past
        const now = new Date();
        const upcoming = [];
        const past = [];

        bookings.forEach(booking => {
          const tournament = booking.tournamentId;
          if (!tournament) return;

          // Try to parse tournament date
          let isPast = false;
          if (tournament.endDate) {
            const endDate = new Date(tournament.endDate);
            if (!isNaN(endDate.getTime())) {
              isPast = endDate < now;
            }
          } else if (tournament.startDate) {
            const startDate = new Date(tournament.startDate);
            if (!isNaN(startDate.getTime())) {
              isPast = startDate < now;
            }
          }

          const formattedEvent = {
            id: booking._id,
            name: tournament.title || booking.tournamentName,
            type: tournament.sportsType || booking.tournamentType,
            date: tournament.startDate || "TBA",
            price: `₹ ${booking.paymentAmount}/-`,
            startTime: tournament.selectedTime?.startTime || "TBA",
            status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
            venue: Array.isArray(tournament.eventLocation) ? tournament.eventLocation[0] : (tournament.eventLocation || "TBA"),
            imageUrl: tournament.tournamentLogo
              ? `${API.Wbsite_SERVER_URL}/${tournament.tournamentLogo.replace(/\\/g, "/")}`
              : "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?q=80&w=1470&auto=format&fit=crop",
            rawData: booking
          };

          if (isPast || booking.status === "completed") {
            past.push(formattedEvent);
          } else {
            upcoming.push(formattedEvent);
          }
        });

        setEventData({ upcoming, past });
      }
    } catch (error) {
      console.error("Error fetching user bookings:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserBookings();
  };

  const eventsToDisplay = activeTab === "Upcoming" ? eventData.upcoming : eventData.past;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Events</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("Upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Upcoming" && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "Past" && styles.activeTab]}
          onPress={() => setActiveTab("Past")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "Past" && styles.activeTabText,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0056d2" />
        </View>
      ) : (
        <ScrollView
          style={styles.eventList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {eventsToDisplay.length > 0 ? (
            eventsToDisplay.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate("MyEventDetails", { event: event.rawData })}
              >
                <Image
                  source={{ uri: event.imageUrl }}
                  style={styles.eventImage}
                />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <View style={[
                      styles.badgeContainer,
                      event.status === "Confirmed" ? styles.confirmedBadge :
                        event.status === "Pending" ? styles.pendingBadge : styles.completedBadge
                    ]}>
                      <Text style={[
                        styles.badgeText,
                        event.status === "Confirmed" ? styles.confirmedText :
                          event.status === "Pending" ? styles.pendingText : styles.completedText
                      ]}>{event.status}</Text>
                    </View>
                  </View>

                  <View style={styles.eventDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="category" size={16} color="#666" />
                      <Text style={styles.detailText}>{event.type}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="date-range" size={16} color="#666" />
                      <Text style={styles.detailText}>{event.date}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="access-time" size={16} color="#666" />
                      <Text style={styles.detailText}>{event.startTime}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={16} color="#666" />
                      <Text style={styles.detailText}>{event.venue}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <MaterialIcons name="payments" size={16} color="#666" />
                      <Text style={styles.detailText}>
                        Entry Fee: {event.price}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noEventsContainer}>
              <MaterialIcons name="event-busy" size={64} color="#ccc" />
              <Text style={styles.noEventsText}>
                No {activeTab.toLowerCase()} events found
              </Text>
              <Text style={styles.noEventsSubtext}>
                Register for tournaments to see them here
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#0056d2",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  eventList: {
    flex: 1,
    padding: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImage: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  badgeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confirmedBadge: { backgroundColor: "#E6F4EA" },
  pendingBadge: { backgroundColor: "#FEF3C7" },
  completedBadge: { backgroundColor: "#EBF5FF" },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  confirmedText: { color: "#1E7E34" },
  pendingText: { color: "#D97706" },
  completedText: { color: "#0056D2" },
  eventDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 10,
    color: "#4A5568",
    fontSize: 14,
    fontWeight: "500",
  },
  noEventsContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  noEventsText: {
    fontSize: 18,
    color: "#4A5568",
    marginTop: 16,
    fontWeight: "700",
  },
  noEventsSubtext: {
    fontSize: 14,
    color: "#718096",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default MyEventScreen;
