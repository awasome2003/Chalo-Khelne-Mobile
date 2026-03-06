import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ImageBackground,
  Dimensions,
} from "react-native";
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import apiConfig from "../../api/api";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const BookingScreen = ({ route }) => {
  const { tournament, selectedCategory } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();

  // Extract category fees if categories are selected
  const categoryFees = [];
  if (Array.isArray(selectedCategory) && selectedCategory.length > 0) {
    selectedCategory.forEach(category => {
      if (category.fee !== undefined) {
        categoryFees.push(category.fee);
      }
    });
  }

  const totalCategoryFee = categoryFees.reduce((sum, fee) => sum + fee, 0);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Team Knockout specific states
  const [teamName, setTeamName] = useState("");
  // Fixed: Team consists of User + 1 Player
  const [players, setPlayers] = useState([{ name: "" }, { name: "" }]);
  const [substitutes, setSubstitutes] = useState([{ name: "" }, { name: "" }]);

  const scrollViewRef = useRef(null);

  // Tournament type detection
  const tournamentRawType = tournament.rawData?.type || tournament.rawData?.sportsType;
  const tournamentType = tournamentRawType || tournament.type || "Tournament";

  const isTeamKnockouts =
    (tournamentType || "").toLowerCase().includes("team knock") ||
    (tournamentType || "").toLowerCase().includes("knockout") ||
    (tournamentType || "").toLowerCase().includes("teams");

  const baseFee = categoryFees.length > 0 ? totalCategoryFee : parseFloat(tournament.price?.replace(/[^\d.]/g, "") || 0);
  const totalFee = baseFee;

  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.fullName || user.name || "");
      setEmail(user.email || "");
      if (user.mobile || user.phoneNumber) {
        setPhone((user.mobile || user.phoneNumber).toString());
      }
      if (isTeamKnockouts) {
        // Set Player 1 as the current user
        setPlayers([{ name: user.fullName || user.name || "" }, { name: "" }]);
      }
    }
  }, [user, isAuthenticated, isTeamKnockouts]);

  const handlePhoneChange = (value) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length <= 10) {
      setPhone(numericValue);
      if (numericValue.length === 10) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.phone;
          return newErrors;
        });
      }
    }
  };

  const handlePlayerChange = (index, value) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { name: value };
    setPlayers(updatedPlayers);
  };

  const handleSubstituteChange = (index, value) => {
    const updatedSubs = [...substitutes];
    updatedSubs[index] = { name: value };
    setSubstitutes(updatedSubs);
  };

  const validateForm = async () => {
    const errors = {};
    if (!name.trim()) errors.name = "Full name is required";
    if (!email.trim()) errors.email = "Valid email is required";
    if (!phone.trim() || phone.length !== 10) {
      errors.phone = "10-digit phone number is required";
    }

    if (isTeamKnockouts) {
      if (!teamName.trim()) errors.teamName = "Team name is required";
      if (!players[0].name.trim()) errors.players = "Player 1 (You) is required";
      if (!players[1].name.trim()) errors.players = "Player 2 is required";

      const validSubs = substitutes.filter(s => s.name.trim());
      const allNames = [...players.map(p => p.name), ...validSubs.map(s => s.name)]
        .filter(n => n.trim())
        .map(n => n.trim().toLowerCase());

      if (new Set(allNames).size !== allNames.length) {
        errors.duplicates = "Duplicate names found in roster.";
      }
    }

    if (!termsAccepted) errors.terms = "Please accept T&C";

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert("Form Incomplete", "Please check all required fields.");
      return false;
    }

    // Server-side validation for players
    if (isTeamKnockouts) {
      const namesToVal = [...players.map(p => p.name.trim()), ...substitutes.map(s => s.name.trim())].filter(Boolean);
      setLoading(true);
      try {
        const res = await axios.post(apiConfig.ENDPOINTS.USER.VALIDATE_PLAYERS, { players: namesToVal });
        if (res.data.success && res.data.invalidPlayers?.length > 0) {
          Alert.alert("Registration Missing", `Some players are not registered on Chalo Khelne: ${res.data.invalidPlayers.join(", ")}`);
          setLoading(false);
          return false;
        }
      } catch (e) {
        Alert.alert("Network Error", "Failed to validate players.");
        setLoading(false);
        return false;
      }
      setLoading(false);
    }
    return true;
  };

  const handleBookingSubmission = async () => {
    setLoading(true);
    try {
      const bookingData = {
        userId: user?.id || user?._id,
        tournamentId: tournament.id || tournament._id,
        managerId: tournament.managerId || tournament.rawData?.managerId,
        userName: name,
        userEmail: email,
        userPhone: phone,
        tournamentName: tournament.name,
        tournamentType: tournamentType,
        selectedCategories: selectedCategory,
        paymentAmount: totalFee,
        paymentMethod: "cash",
      };

      if (isTeamKnockouts) {
        bookingData.team = {
          name: teamName,
          players: players.map(p => p.name),
          substitutes: substitutes.filter(s => s.name.trim()).map(s => s.name),
        };
      }

      navigation.navigate("Payment Method", {
        bookingData,
        tournament,
        userId: bookingData.userId,
        tournamentId: bookingData.tournamentId,
        managerId: bookingData.managerId, // ✅ pass managerId explicitly
      });
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderModernInput = (label, value, onChangeText, icon, placeholder, extra = {}) => (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.modernInput, validationErrors[extra.errorKey] && styles.inputError]}>
        <Ionicons name={icon} size={20} color="#FF6A00" style={styles.innerIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#ADB5BD"
          style={styles.textInput}
          {...extra}
        />
      </View>
      {validationErrors[extra.errorKey] && <Text style={styles.errorSubText}>{validationErrors[extra.errorKey]}</Text>}
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header Overlay */}
      <View style={[styles.customHeader]}>
        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
        {/* <View style={{ width: 42 }} /> */}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollContainer}
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          {/* Immersive Banner */}
          <View style={styles.heroBanner}>
            <ImageBackground
              source={require("../../../assets/booking-bg.jpeg")}
              style={styles.bannerImg}
              resizeMode="cover"
            >
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.bannerOverlay}>
                <View style={styles.bannerInfo}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{tournamentType}</Text>
                  </View>
                  <Text style={styles.bannerTourName}>{tournament.name}</Text>
                  <View style={styles.miniDetailRow}>
                    <Ionicons name="calendar-outline" size={14} color="#FFF" />
                    <Text style={styles.miniDetailText}>{tournament.closingDate}</Text>
                    <View style={styles.dot} />
                    <Ionicons name="location-outline" size={14} color="#FFF" />
                    <Text style={styles.miniDetailText} numberOfLines={1}>
                      {Array.isArray(tournament?.rawData?.eventLocation) ? tournament.rawData.eventLocation[0] : tournament?.rawData?.eventLocation || "Venue Attached"}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </View>

          <View style={styles.contentPad}>
            {/* Contact Details Card */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="account-check" size={20} color="#FF6A00" />
              <Text style={styles.sectionTitle}>Registrant Information</Text>
            </View>
            <View style={styles.modernCard}>
              {renderModernInput("Full Name", name, setName, "person-outline", "e.g. Rahul Sharma", { errorKey: 'name' })}
              {renderModernInput("Email Address", email, setEmail, "mail-outline", "rahul@example.com", { errorKey: 'email', keyboardType: 'email-address', autoCapitalize: 'none' })}
              {renderModernInput("Phone Number", phone, handlePhoneChange, "call-outline", "10-digit mobile number", { errorKey: 'phone', keyboardType: 'numeric', maxLength: 10 })}
            </View>

            {/* Team Details if applicable */}
            {isTeamKnockouts && (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="account-group" size={22} color="#FF6A00" />
                  <Text style={styles.sectionTitle}>Squad Roster</Text>
                </View>
                <View style={styles.modernCard}>
                  {renderModernInput("Team Name", teamName, setTeamName, "shield-outline", "Enter squad name", { errorKey: 'teamName' })}
                  {/* Captain Removed - User is P1 */}

                  <View style={styles.rosterLine} />
                  <Text style={styles.subLabel}>Active Players (2 Required)</Text>
                  {players.map((p, i) => (
                    <View key={i} style={styles.playerRow}>
                      <View style={styles.playerNum}>
                        <Text style={styles.pNumText}>{i + 1}</Text>
                      </View>
                      <TextInput
                        style={[styles.playerInput, validationErrors.players && !p.name.trim() && styles.pInputErr]}
                        placeholder={i === 0 ? "Player 1 (You)" : `Enter player ${i + 1} name`}
                        value={p.name}
                        onChangeText={(v) => handlePlayerChange(i, v)}
                        placeholderTextColor="#CFD8DC"
                        editable={i !== 0} // User is always Player 1
                      />
                    </View>
                  ))}

                  <Text style={[styles.subLabel, { marginTop: 15 }]}>Substitutes (Optional)</Text>
                  {substitutes.map((s, i) => (
                    <View key={i} style={styles.playerRow}>
                      <View style={[styles.playerNum, { backgroundColor: '#F5F7F8' }]}>
                        <Text style={[styles.pNumText, { color: '#90A4AE' }]}>S{i + 1}</Text>
                      </View>
                      <TextInput
                        style={styles.playerInput}
                        placeholder={`Enter substitute ${i + 1} name`}
                        value={s.name}
                        onChangeText={(v) => handleSubstituteChange(i, v)}
                        placeholderTextColor="#CFD8DC"
                      />
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Summary Card */}
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color="#FF6A00" />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
            <View style={styles.modernCard}>
              {selectedCategory?.length > 0 ? (
                selectedCategory.map((cat, i) => (
                  <View key={i} style={styles.summaryRow}>
                    <Text style={styles.sumLabel}>{cat.name}</Text>
                    <Text style={styles.sumVal}>₹{cat.fee}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.summaryRow}>
                  <Text style={styles.sumLabel}>Tournament Entry</Text>
                  <Text style={styles.sumVal}>₹{baseFee}</Text>
                </View>
              )}
              <View style={styles.dash} />
              <View style={[styles.summaryRow, { marginTop: 5 }]}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalVal}>₹{totalFee}</Text>
              </View>

              <TouchableOpacity
                style={styles.tcRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.tcCheck, termsAccepted && styles.tcCheckActive]}>
                  {termsAccepted && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={styles.tcText}>I agree to the tournament's Terms & Conditions</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.payBtn, (!termsAccepted || loading) && styles.disabledBtn]}
              onPress={async () => {
                const ok = await validateForm();
                if (ok) {
                  Alert.alert(
                    "Confirm Booking",
                    `Finalize your slot for ₹${totalFee}?`,
                    [{ text: "Edit", style: "cancel" }, { text: "Yes, Proceed", onPress: handleBookingSubmission }]
                  );
                }
              }}
              disabled={!termsAccepted || loading}
            >
              <LinearGradient
                colors={['#FF6A00', '#FF8C00']}
                style={styles.btnGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Proceed to Payment</Text>
                    <Ionicons name="arrow-forward-circle" size={22} color="#FFF" style={{ marginLeft: 10 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  scrollContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  customHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 100,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  heroBanner: { height: 260, width: '100%' },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { flex: 1, justifyContent: 'flex-end', padding: 25 },
  bannerInfo: { gap: 5 },
  typeBadge: { backgroundColor: '#FF6A00', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 5 },
  typeText: { color: '#FFF', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  bannerTourName: { fontSize: 24, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  miniDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  miniDetailText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  contentPad: { paddingHorizontal: 25, marginTop: -20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15, marginTop: 30, marginLeft: 5 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#263238', textTransform: 'uppercase', letterSpacing: 1 },
  modernCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  inputWrapper: { marginBottom: 20 },
  inputLabel: { fontSize: 13, color: '#90A4AE', fontWeight: '700', marginBottom: 8, marginLeft: 5 },
  modernInput: { flexDirection: 'row', alignItems: 'center', height: 56, backgroundColor: '#F8F9FA', borderRadius: 16, borderHorizontal: 1, borderColor: '#ECEFF1', paddingHorizontal: 15 },
  innerIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#263238', fontWeight: '600' },
  inputError: { borderColor: '#FF5252', backgroundColor: '#FFF8F8' },
  errorSubText: { fontSize: 11, color: '#FF5252', marginTop: 5, marginLeft: 5, fontWeight: '600' },
  subLabel: { fontSize: 12, color: '#B0BEC5', fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, marginTop: 10 },
  rosterLine: { height: 1, backgroundColor: '#F1F3F5', marginVertical: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  playerNum: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FF6A0020', justifyContent: 'center', alignItems: 'center' },
  pNumText: { color: '#FF6A00', fontSize: 12, fontWeight: '800' },
  playerInput: { flex: 1, height: 48, backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 15, fontSize: 14, fontWeight: '600', color: '#263238' },
  pInputErr: { borderColor: '#FF5252', borderHorizontal: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  sumLabel: { fontSize: 15, color: '#546E7A', fontWeight: '600' },
  sumVal: { fontSize: 15, color: '#263238', fontWeight: '800' },
  dash: { height: 1, backgroundColor: '#F1F3F5', borderStyle: 'dashed', marginVertical: 10 },
  totalLabel: { fontSize: 18, fontWeight: '900', color: '#263238' },
  totalVal: { fontSize: 22, fontWeight: '900', color: '#FF6A00' },
  tcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 25 },
  tcCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CFD8DC', justifyContent: 'center', alignItems: 'center' },
  tcCheckActive: { backgroundColor: '#FF6A00', borderColor: '#FF6A00' },
  tcText: { fontSize: 13, color: '#78909C', fontWeight: '600', flex: 1 },
  payBtn: { marginTop: 35, borderRadius: 20, overflow: 'hidden', shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  btnGrad: { height: 64, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  disabledBtn: { opacity: 0.5 },
});

export default BookingScreen;
