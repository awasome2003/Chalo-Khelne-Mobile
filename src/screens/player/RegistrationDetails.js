import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  StatusBar,
  ImageBackground,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const RegistrationDetails = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { tournament, item } = route.params || {};
  const tournamentData = tournament || item;

  if (!tournamentData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.simpleHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.simpleHeaderTitle}>My Registration</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clipboard-text-off-outline" size={80} color="#CCC" />
          <Text style={styles.emptyText}>Registration details not available</Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleViewTournamentDetails = () => {
    navigation.navigate("Tournament Details", {
      item: tournamentData,
      tournamentId: tournamentData.id,
      isPastTournament: tournamentData.status === "Past"
    });
  };

  const handleViewMatchDetails = () => {
    const tournamentType = tournamentData?.booking?.tournamentType || tournamentData?.type;
    if (!tournamentType) {
      Alert.alert("Error", "Tournament type information is missing");
      return;
    }
    const typeNormalized = tournamentType.toLowerCase();
    if (typeNormalized.includes("group")) {
      navigation.navigate("GroupStage", { tournament: tournamentData });
    } else if (typeNormalized.includes("knockout")) {
      navigation.navigate("TeamKnockouts", { id: tournamentData.id, tournament: tournamentData });
    } else {
      Alert.alert("Information", `Navigation to ${tournamentType} matches is not yet implemented`);
    }
  };

  const tournamentName = tournamentData.name !== "NA" ? tournamentData.name : (tournamentData.booking?.tournamentName || "Tournament");
  const venueInfo = tournamentData.eventLocation || tournamentData.club || "N/A";
  const status = tournamentData.booking?.status || "Confirmed";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Immersive Hero Header */}
      <View style={styles.heroContainer}>
        <ImageBackground
          source={require("../../../assets/Home1.jpg")} // Fallback or logic for tournament image
          style={styles.heroBackground}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.8)", "rgba(0,0,0,0.4)", "#F8F9FA"]}
            style={styles.heroGradient}
          />

          <View style={[styles.customHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Registration</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: status === "Confirmed" ? "#4CAF50" : "#FF9800" }]} />
              <Text style={styles.statusText}>{status.toUpperCase()}</Text>
            </View>
            <Text style={styles.tournamentName} numberOfLines={2}>{tournamentName}</Text>
            <View style={styles.heroInfoRow}>
              <Ionicons name="location" size={16} color="#FF6A00" />
              <Text style={styles.heroVenueText}>{venueInfo}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats Dashboard */}
        <View style={styles.dashboardGrid}>
          <View style={styles.dashCard}>
            <LinearGradient colors={["#FFF", "#F0F4F8"]} style={styles.dashGradient}>
              <MaterialIcons name="event" size={20} color="#FF6A00" />
              <Text style={styles.dashLabel}>Event Date</Text>
              <Text style={styles.dashValue}>{tournamentData.date || "TBA"}</Text>
            </LinearGradient>
          </View>
          <View style={styles.dashCard}>
            <LinearGradient colors={["#FFF", "#F0F4F8"]} style={styles.dashGradient}>
              <MaterialIcons name="access-time" size={20} color="#FF6A00" />
              <Text style={styles.dashLabel}>Start Time</Text>
              <Text style={styles.dashValue}>{tournamentData.startTime || "TBA"}</Text>
            </LinearGradient>
          </View>
          <View style={styles.dashCard}>
            <LinearGradient colors={["#FFF", "#F0F4F8"]} style={styles.dashGradient}>
              <MaterialIcons name="sports" size={20} color="#FF6A00" />
              <Text style={styles.dashLabel}>Type</Text>
              <Text style={styles.dashValue}>{tournamentData.type || "Standard"}</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Registration Info</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="person" size={18} color="#666" />
            </View>
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Registered By</Text>
              <Text style={styles.infoValue}>{tournamentData.booking?.userName || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <MaterialIcons name="payment" size={18} color="#666" />
            </View>
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Payment Status</Text>
              <Text style={[styles.infoValue, { color: "#4CAF50" }]}>Verified (₹{tournamentData.price})</Text>
            </View>
          </View>

          {tournamentData.booking?.category && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconBox}>
                <MaterialCommunityIcons name="align-vertical-bottom" size={18} color="#666" />
              </View>
              <View style={styles.infoTextColumn}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{tournamentData.booking.category}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Venue Details</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="map" size={18} color="#666" />
            </View>
            <View style={styles.infoTextColumn}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{tournamentData.address || venueInfo}</Text>
            </View>
          </View>
        </View>

        {/* Action Dock */}
        <View style={styles.actionDock}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleViewTournamentDetails}
          >
            <MaterialIcons name="info-outline" size={20} color="#FF6A00" />
            <Text style={styles.secondaryBtnText}>T-Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleViewMatchDetails}
          >
            <LinearGradient
              colors={["#FF6A00", "#FF4B00"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryBtnText}>View Matches & Schedule</Text>
              <MaterialIcons name="keyboard-arrow-right" size={22} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  heroContainer: { height: 320, width: '100%' },
  heroBackground: { width: '100%', height: '100%' },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  heroContent: {
    paddingHorizontal: 25,
    marginTop: 'auto',
    paddingBottom: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: 'Bold', color: '#333' },
  tournamentName: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  heroInfoRow: { flexDirection: 'row', alignItems: 'center' },
  heroVenueText: { marginLeft: 6, color: '#DDD', fontSize: 14, fontWeight: '500' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  dashboardGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  dashCard: { width: (width - 60) / 3, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  dashGradient: { padding: 12, alignItems: 'center', height: 90, justifyContent: 'center' },
  dashLabel: { fontSize: 10, color: '#666', marginTop: 4 },
  dashValue: { fontSize: 12, fontWeight: '700', color: '#333', marginTop: 2 },

  detailsSection: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTextColumn: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#333' },

  actionDock: { flexDirection: 'row', marginTop: 10, gap: 12 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FF6A00',
    backgroundColor: '#FFF'
  },
  secondaryBtnText: { marginLeft: 8, color: '#FF6A00', fontWeight: '700', fontSize: 15 },
  primaryBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
  primaryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  primaryBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15, marginRight: 8 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 20, textAlign: 'center' },
  goBackBtn: { marginTop: 30, paddingHorizontal: 30, paddingVertical: 12, backgroundColor: '#FF6A00', borderRadius: 25 },
  goBackBtnText: { color: '#FFF', fontWeight: '700' },
  simpleHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  backBtn: { padding: 10, marginLeft: -10 },
  simpleHeaderTitle: { fontSize: 20, fontWeight: '800', color: '#333', marginLeft: 10 },
});

export default RegistrationDetails;

