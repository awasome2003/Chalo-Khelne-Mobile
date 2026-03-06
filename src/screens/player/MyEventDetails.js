import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { useNavigation, useRoute } from "@react-navigation/native";

const MyEventDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { event } = route.params || {};

  // Use provided event or fallback
  const bookingData = event || {};
  const tournament = bookingData.tournamentId || {};

  const currentEvent = {
    id: bookingData._id,
    name: tournament.title || bookingData.tournamentName,
    type: tournament.sportsType || bookingData.tournamentType,
    date: tournament.startDate || "TBA",
    price: `₹ ${bookingData.paymentAmount || 0}/-`,
    startTime: tournament.selectedTime?.startTime || "TBA",
    status: (bookingData.status || "pending").charAt(0).toUpperCase() + (bookingData.status || "pending").slice(1),
    venue: Array.isArray(tournament.eventLocation) ? tournament.eventLocation[0] : (tournament.eventLocation || "TBA"),
    imageUrl: tournament.tournamentLogo
      ? `https://chalo-khelne-backend.onrender.com/${tournament.tournamentLogo.replace(/\\/g, "/")}`
      : "https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?q=80&w=1470&auto=format&fit=crop",
    description: tournament.description || "No description available.",
    organizer: tournament.organizerName || "TBA",
    rules: tournament.termsAndConditions ? [tournament.termsAndConditions] : ["Tournament rules follow general sports guidelines"],
    prizes: ["Trophies for winners", "Certificates for participants"],
    registrationId: bookingData._id?.substring(0, 8).toUpperCase() || "TBA",
    paymentStatus: bookingData.paymentStatus === "paid" ? "Paid" : "Pending",
    paymentDate: bookingData.createdAt ? new Date(bookingData.createdAt).toLocaleDateString() : "TBA",
    transactionId: bookingData.paymentId || "N/A",
  };

  // Handle opening map location
  const openLocation = () => {
    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(
      currentEvent.venue
    )}`;
    Linking.openURL(mapUrl).catch((err) =>
      console.error("Error opening map:", err)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <TouchableOpacity>
          <MaterialIcons name="share" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: currentEvent.imageUrl }}
          style={styles.eventImage}
        />

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{currentEvent.status}</Text>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.eventName}>{currentEvent.name}</Text>

          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color="#0056d2" />
            <Text style={styles.infoLabel}>Event Date:</Text>
            <Text style={styles.infoValue}>{currentEvent.date}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="schedule" size={20} color="#0056d2" />
            <Text style={styles.infoLabel}>Start Time:</Text>
            <Text style={styles.infoValue}>{currentEvent.startTime}</Text>
          </View>

          <TouchableOpacity style={styles.infoRow} onPress={openLocation}>
            <MaterialIcons name="location-on" size={20} color="#0056d2" />
            <Text style={styles.infoLabel}>Venue:</Text>
            <Text style={[styles.infoValue, styles.linkText]}>
              {currentEvent.venue}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <MaterialIcons name="emoji-events" size={20} color="#0056d2" />
            <Text style={styles.infoLabel}>Event Type:</Text>
            <Text style={styles.infoValue}>{currentEvent.type}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="attach-money" size={20} color="#0056d2" />
            <Text style={styles.infoLabel}>Entry Fee:</Text>
            <Text style={styles.infoValue}>{currentEvent.price}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="groups" size={20} color="#0056d2" />
            <Text style={styles.infoLabel}>Organizer:</Text>
            <Text style={styles.infoValue}>{currentEvent.organizer}</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{currentEvent.description}</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Rules & Regulations</Text>
          {currentEvent.rules &&
            currentEvent.rules.map((rule, index) => (
              <View key={index} style={styles.listItem}>
                <MaterialIcons name="check-circle" size={16} color="#0056d2" />
                <Text style={styles.listItemText}>{rule}</Text>
              </View>
            ))}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Prizes</Text>
          {currentEvent.prizes &&
            currentEvent.prizes.map((prize, index) => (
              <View key={index} style={styles.listItem}>
                <MaterialIcons name="emoji-events" size={16} color="gold" />
                <Text style={styles.listItemText}>{prize}</Text>
              </View>
            ))}
        </View>

        <View style={styles.bookingDetailsContainer}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          <View style={styles.bookingRow}>
            <Text style={styles.bookingLabel}>Registration ID</Text>
            <Text style={styles.bookingValue}>
              {currentEvent.registrationId}
            </Text>
          </View>

          <View style={styles.bookingRow}>
            <Text style={styles.bookingLabel}>Payment Status</Text>
            <View style={[
              styles.paymentStatusBadge,
              currentEvent.paymentStatus === "Paid" ? styles.paidBadge : styles.pendingBadge
            ]}>
              <Text style={styles.paymentStatusText}>
                {currentEvent.paymentStatus}
              </Text>
            </View>
          </View>

          <View style={styles.bookingRow}>
            <Text style={styles.bookingLabel}>Payment Date</Text>
            <Text style={styles.bookingValue}>{currentEvent.paymentDate}</Text>
          </View>

          <View style={styles.bookingRow}>
            <Text style={styles.bookingLabel}>Transaction ID</Text>
            <Text style={styles.bookingValue}>
              {currentEvent.transactionId}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.supportButton}>
            <MaterialIcons name="support-agent" size={20} color="#fff" />
            <Text style={styles.buttonText}>Contact Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ticketButton}>
            <MaterialIcons name="confirmation-number" size={20} color="#fff" />
            <Text style={styles.buttonText}>View Ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0056d2",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  content: {
    flex: 1,
  },
  eventImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  statusBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 86, 210, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  detailsContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 4,
  },
  eventName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
    width: 90,
  },
  infoValue: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  linkText: {
    color: "#0056d2",
    textDecorationLine: "underline",
  },
  sectionContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  listItemText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  bookingDetailsContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  bookingLabel: {
    fontSize: 14,
    color: "#666",
  },
  bookingValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadge: { backgroundColor: "#e6f7ff" },
  pendingBadge: { backgroundColor: "#fff4e5" },
  paymentStatusText: {
    color: "#0056d2",
    fontSize: 12,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  supportButton: {
    backgroundColor: "#666",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  ticketButton: {
    backgroundColor: "#0056d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default MyEventDetailsScreen;
