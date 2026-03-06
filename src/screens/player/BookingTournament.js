import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";

const BookingTournament = () => {
  const [innerActiveTab, setInnerActiveTab] = useState("Upcoming");
  const tournaments = [
    {
      id: 1,
      name: "Tournament Name",
      type: "Tournament Type",
      date: "Oct 19th - Oct 20th",
      price: "₹ 600/- onward",
      startTime: "11.00am",
      closingDate: "Booking closes on: 19th Oct 2024",
      club: "Rajdhani sports club, victory complex, Opposite city Park, Sector 12, Pimpri pune 17",
      image: require("../../../assets/TT.png"),
    },
    {
      id: 2,
      name: "Tournament Name",
      type: "Tournament Type",
      date: "Oct 22nd - Oct 23rd",
      price: "₹ 800/- onward",
      startTime: "12.00am",
      closingDate: "Booking closes on: 21st Oct 2024",
      club: "Victory Sports Arena, Sector 8, Hinjewadi, Pune",
      image: require("../../../assets/TT.png"),
    },
    {
      id: 3,
      name: "Tournament Name",
      type: "Tournament Type",
      date: "Nov 5th - Nov 6th",
      price: "₹ 500/- onward",
      startTime: "01.00am",
      closingDate: "Booking closes on: 4th Nov 2024",
      club: "Golden Club House, Kothrud, Pune",
      image: require("../../../assets/TT.png"),
    },
  ];
  return (
    <View style={styles.container}>
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
            Upcoming
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
      {innerActiveTab === "Upcoming" ? (
        <View>
          {tournaments.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card}>
              <Image
                source={item.image}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <View style={styles.headerRow}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardType}>{item.type}</Text>
                </View>

                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{item.date}</Text>
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>

                <Text style={styles.startTime}>
                  Start Time: {item.startTime}
                </Text>
                <Text style={styles.closingDate}>{item.closingDate}</Text>

                <Text style={styles.clubName}>Club Name</Text>
                <Text style={styles.club}>{item.club}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={{ marginTop: 20 }}>History of Turf Bookings</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  text: {
    fontSize: 22,
    color: "#333",
  },
  innerTabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#ddd",
    marginHorizontal: 20,
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
  card: {
    backgroundColor: "#fff",
    marginTop: 12,
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 200,
  },
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  cardType: {
    color: "gray",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  priceText: {
    fontSize: 14,
  },
  startTime: {
    marginTop: 6,
    color: "gray",
    fontSize: 13,
  },
  closingDate: {
    marginTop: 6,
    color: "gray",
    fontSize: 13,
  },
  clubName: {
    fontWeight: "bold",
    marginTop: 10,
  },
  club: {
    color: "gray",
    fontSize: 13,
    marginTop: 4,
  },
});

export default BookingTournament;
