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
import { getSportName, getTournamentType } from "../../utils/sportTrack";
import axios from "axios";
import apiConfig from "../../api/api";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSportPlayMode } from '../../utils/bookingFieldConfig';

const { width } = Dimensions.get('window');

const BookingScreen = ({ route }) => {
  // STEP 12b — Multi-sport: route.params now also carries sportSelections.
  // selectedCategory is the existing legacy shape (used by the review UI
  // here); sportSelections is the new authoritative shape for the API.
  const {
    tournament,
    selectedCategory,
    sportSelections: sportSelectionsParam,
    employeeId: passedEmployeeId,
  } = route.params;
  // When sportSelections wasn't sent (legacy entry points), derive from
  // selectedCategory so the API submit always has a consistent shape.
  const sportSelections = Array.isArray(sportSelectionsParam) && sportSelectionsParam.length > 0
    ? sportSelectionsParam
    : (Array.isArray(selectedCategory) ? selectedCategory.map((c) => ({
        sportId: c.sportId || null,
        // STEP 17b.iii — read sport name from per-sport track. rawData
        // contains the full tournament doc with sports[]; root sportsType
        // fallback removed.
        sportName: c.sportName || getSportName(tournament?.rawData) || getSportName(tournament) || null,
        categoryName: c.name,
        fee: Number(c.fee || 0),
      })) : []);
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

  // Sport-specific config
  const sportName = tournament.rawData?.sportsType || tournament.sport || null;
  const playMode = getSportPlayMode(sportName);

  const scrollViewRef = useRef(null);

  // Tournament type detection — STEP 17b.iii: per-sport.
  const tournamentRawType = getTournamentType(tournament.rawData) || getSportName(tournament.rawData);
  const tournamentType = tournamentRawType || getTournamentType(tournament) || "Tournament";

  // Sport-aware team detection
  const isTeamSport = playMode.isTeam;
  const isTeamKnockoutType =
    (tournamentType || "").toLowerCase().includes("team knock") ||
    (tournamentType || "").toLowerCase().includes("teams");

  // Booking mode: team sports get a toggle between "solo" (individual entry) and "team" (full team entry)
  // Individual sports always book as solo — no tabs shown
  const [bookingMode, setBookingMode] = useState(isTeamSport ? "solo" : "solo");
  const isTeamBooking = bookingMode === "team";
  const isTeamKnockouts = isTeamBooking || (!isTeamSport && isTeamKnockoutType);

  // Dynamic player slots based on sport's typical team size
  const initialPlayerCount = isTeamSport ? playMode.typical : 2;
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState(
    Array.from({ length: initialPlayerCount }, () => ({ name: "" }))
  );
  const [substitutes, setSubstitutes] = useState([{ name: "" }, { name: "" }]);

  const baseFee = categoryFees.length > 0 ? totalCategoryFee : parseFloat(tournament.price?.replace(/[^\d.]/g, "") || 0);
  const totalFee = baseFee;

  useEffect(() => {
    if (isAuthenticated && user) {
      setName(user.fullName || user.name || "");
      setEmail(user.email || "");
      if (user.mobile || user.phoneNumber) {
        setPhone((user.mobile || user.phoneNumber).toString());
      }
    }
  }, [user, isAuthenticated]);

  // Reset team fields when booking mode changes
  useEffect(() => {
    if (isTeamBooking && user) {
      const slots = Array.from({ length: initialPlayerCount }, (_, i) =>
        i === 0 ? { name: user.fullName || user.name || "" } : { name: "" }
      );
      setPlayers(slots);
      setSubstitutes([{ name: "" }, { name: "" }]);
      setTeamName("");
    }
  }, [isTeamBooking, initialPlayerCount]);

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

  // Player search state
  const [searchResults, setSearchResults] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null); // which player field is searching
  const [searchType, setSearchType] = useState(null); // "player" or "substitute"
  const searchTimerRef = useRef(null);

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(apiConfig.ENDPOINTS.USER.SEARCH(query.trim()));
      if (res.data && Array.isArray(res.data)) {
        setSearchResults(res.data.slice(0, 8)); // limit to 8 results
      } else if (res.data?.users) {
        setSearchResults(res.data.users.slice(0, 8));
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    }
  };

  const handlePlayerChange = (index, value) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { name: value, verified: false };
    setPlayers(updatedPlayers);

    // Debounced search
    setActiveSearchIndex(index);
    setSearchType("player");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(value), 400);
  };

  const handleSelectPlayer = (index, selectedUser) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = {
      name: selectedUser.name || selectedUser.fullName,
      odId: selectedUser._id || selectedUser.id,
      verified: true,
    };
    setPlayers(updatedPlayers);
    setSearchResults([]);
    setActiveSearchIndex(null);
    setSearchType(null);
  };

  const handleSubstituteChange = (index, value) => {
    const updatedSubs = [...substitutes];
    updatedSubs[index] = { name: value, verified: false };
    setSubstitutes(updatedSubs);

    // Debounced search
    setActiveSearchIndex(index);
    setSearchType("substitute");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(value), 400);
  };

  const handleSelectSubstitute = (index, selectedUser) => {
    const updatedSubs = [...substitutes];
    updatedSubs[index] = {
      name: selectedUser.name || selectedUser.fullName,
      odId: selectedUser._id || selectedUser.id,
      verified: true,
    };
    setSubstitutes(updatedSubs);
    setSearchResults([]);
    setActiveSearchIndex(null);
    setSearchType(null);
  };

  const validateForm = async () => {
    const errors = {};
    if (!name.trim()) errors.name = "Full name is required";
    if (!email.trim()) errors.email = "Valid email is required";
    if (!phone.trim() || phone.length !== 10) {
      errors.phone = "10-digit phone number is required";
    }

    if (isTeamBooking) {
      if (!teamName.trim()) errors.teamName = "Team name is required";

      // Sport-aware minimum player validation
      const filledPlayers = players.filter(p => p.name.trim());
      const minRequired = isTeamSport ? playMode.minPlayers : 2;
      if (filledPlayers.length < minRequired) {
        errors.players = `At least ${minRequired} players required for ${sportName || "this sport"}`;
      }

      // Verify all filled players are registered (selected from search)
      const unverifiedPlayers = filledPlayers
        .filter((p, i) => i !== 0 && !p.verified) // skip Player 1 (current user)
        .map(p => p.name);
      if (unverifiedPlayers.length > 0) {
        errors.unverified = `These players are not verified: ${unverifiedPlayers.join(", ")}. Select from search suggestions.`;
      }

      // Check substitutes too
      const filledSubs = substitutes.filter(s => s.name.trim());
      const unverifiedSubs = filledSubs.filter(s => !s.verified).map(s => s.name);
      if (unverifiedSubs.length > 0) {
        errors.unverifiedSubs = `These substitutes are not verified: ${unverifiedSubs.join(", ")}. Select from search suggestions.`;
      }

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

    // Server-side validation for players (only in team booking mode)
    if (isTeamBooking) {
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
      // STEP 12b — Multi-sport: derive the proper legacy `selectedCategories`
      // API shape (with `price` field, not `fee`) from sportSelections so the
      // backend's STEP 9c dual-write logic computes totalFee correctly. Send
      // sportSelections alongside as the new authoritative shape.
      const apiSelectedCategories = sportSelections.map((s) => ({
        id: null,
        name: s.categoryName,
        price: Number(s.fee || 0),
        gender: null,
        ageCategory: null,
      }));
      const bookingData = {
        userId: user?.id || user?._id,
        tournamentId: tournament.id || tournament._id,
        managerId: Array.isArray(tournament.managerId) ? tournament.managerId[0] : (Array.isArray(tournament.rawData?.managerId) ? tournament.rawData.managerId[0] : (tournament.managerId || tournament.rawData?.managerId)),
        userName: name,
        userEmail: email,
        userPhone: phone,
        tournamentName: tournament.name,
        tournamentType: tournamentType,
        selectedCategories: apiSelectedCategories,
        sportSelections,
        paymentAmount: totalFee,
        paymentMethod: "cash",
        employeeId: passedEmployeeId || null,
      };

      // Include booking mode so backend knows how this player registered
      bookingData.bookingMode = bookingMode;

      if (isTeamBooking) {
        bookingData.team = {
          name: teamName,
          players: players.map(p => p.name),
          substitutes: substitutes.filter(s => s.name.trim()).map(s => s.name),
        };
      }

      // Sport-specific custom fields removed from player booking (managed by tournament manager)

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

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
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

            {/* Booking Mode Tabs — only for team sports */}
            {isTeamSport && (
              <View style={{
                flexDirection: 'row', backgroundColor: '#F1F3F5', borderRadius: 14,
                padding: 4, marginBottom: 18,
              }}>
                <TouchableOpacity
                  onPress={() => setBookingMode("solo")}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center',
                    backgroundColor: bookingMode === "solo" ? "#FFF" : "transparent",
                    ...(bookingMode === "solo" ? {
                      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
                    } : {}),
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="account"
                    size={20}
                    color={bookingMode === "solo" ? "#FF6A00" : "#999"}
                    style={{ marginBottom: 2 }}
                  />
                  <Text style={{
                    fontSize: 13, fontWeight: '800',
                    color: bookingMode === "solo" ? "#FF6A00" : "#999",
                  }}>Solo Entry</Text>
                  <Text style={{ fontSize: 10, color: '#AAA', marginTop: 1 }}>Join as individual</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setBookingMode("team")}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center',
                    backgroundColor: bookingMode === "team" ? "#FFF" : "transparent",
                    ...(bookingMode === "team" ? {
                      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
                    } : {}),
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={20}
                    color={bookingMode === "team" ? "#FF6A00" : "#999"}
                    style={{ marginBottom: 2 }}
                  />
                  <Text style={{
                    fontSize: 13, fontWeight: '800',
                    color: bookingMode === "team" ? "#FF6A00" : "#999",
                  }}>Team Entry</Text>
                  <Text style={{ fontSize: 10, color: '#AAA', marginTop: 1 }}>Register full team</Text>
                </TouchableOpacity>
              </View>
            )}

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

            {/* Team Details — shown only in "team" booking mode */}
            {isTeamBooking && (
              <>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="account-group" size={22} color="#FF6A00" />
                  <Text style={styles.sectionTitle}>
                    {isTeamSport ? `${playMode.label} Roster` : "Squad Roster"}
                  </Text>
                </View>
                <View style={styles.modernCard}>
                  {renderModernInput("Team Name", teamName, setTeamName, "shield-outline", `Enter ${isTeamSport ? sportName?.toLowerCase() || '' : ''} team name`.trim(), { errorKey: 'teamName' })}

                  <View style={styles.rosterLine} />
                  <Text style={styles.subLabel}>
                    Players ({isTeamSport ? `${playMode.minPlayers}-${playMode.maxPlayers} required` : `${players.length} Required`})
                  </Text>
                  {players.map((p, i) => (
                    <View key={i} style={{ marginBottom: 6 }}>
                      <View style={styles.playerRow}>
                        <View style={styles.playerNum}>
                          <Text style={styles.pNumText}>{i + 1}</Text>
                        </View>
                        <TextInput
                          style={[
                            styles.playerInput,
                            validationErrors.players && !p.name.trim() && styles.pInputErr,
                            p.verified && { borderColor: '#34C759', borderWidth: 1.5 },
                          ]}
                          placeholder={i === 0 ? "Player 1 (You — Captain)" : `Search player ${i + 1}...`}
                          value={p.name}
                          onChangeText={(v) => handlePlayerChange(i, v)}
                          placeholderTextColor="#CFD8DC"
                          editable={i !== 0}
                          onFocus={() => { setActiveSearchIndex(i); setSearchType("player"); }}
                          onBlur={() => setTimeout(() => { if (activeSearchIndex === i) { setSearchResults([]); setActiveSearchIndex(null); } }, 200)}
                        />
                        {p.verified && (
                          <MaterialIcons name="verified" size={18} color="#34C759" style={{ position: 'absolute', right: 10, top: 12 }} />
                        )}
                      </View>
                      {/* Search dropdown for this player field */}
                      {activeSearchIndex === i && searchType === "player" && searchResults.length > 0 && (
                        <View style={{
                          backgroundColor: '#FFF', borderRadius: 10, marginTop: 2, marginLeft: 36,
                          borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 160,
                          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
                        }}>
                          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {searchResults.map((u, idx) => (
                              <TouchableOpacity
                                key={u._id || idx}
                                onPress={() => handleSelectPlayer(i, u)}
                                style={{
                                  flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
                                  borderBottomWidth: idx < searchResults.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6',
                                }}
                              >
                                <MaterialCommunityIcons name="account-circle" size={24} color="#FF6A00" style={{ marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>{u.name || u.fullName}</Text>
                                  {u.mobile && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{u.mobile}</Text>}
                                </View>
                                <MaterialIcons name="add-circle-outline" size={20} color="#34C759" />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Add/Remove player buttons for team sports */}
                  {isTeamSport && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 }}>
                      {players.length < playMode.maxPlayers && (
                        <TouchableOpacity
                          onPress={() => setPlayers([...players, { name: "" }])}
                          style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E8F5E9', borderRadius: 8 }}
                        >
                          <Text style={{ color: '#2E7D32', fontWeight: '700', fontSize: 13 }}>+ Add Player</Text>
                        </TouchableOpacity>
                      )}
                      {players.length > playMode.minPlayers && (
                        <TouchableOpacity
                          onPress={() => setPlayers(players.slice(0, -1))}
                          style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFEBEE', borderRadius: 8 }}
                        >
                          <Text style={{ color: '#C62828', fontWeight: '700', fontSize: 13 }}>- Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={[styles.subLabel, { marginTop: 15 }]}>Substitutes (Optional)</Text>
                  {substitutes.map((s, i) => (
                    <View key={i} style={{ marginBottom: 6 }}>
                      <View style={styles.playerRow}>
                        <View style={[styles.playerNum, { backgroundColor: '#F5F7F8' }]}>
                          <Text style={[styles.pNumText, { color: '#90A4AE' }]}>S{i + 1}</Text>
                        </View>
                        <TextInput
                          style={[styles.playerInput, s.verified && { borderColor: '#34C759', borderWidth: 1.5 }]}
                          placeholder={`Search substitute ${i + 1}...`}
                          value={s.name}
                          onChangeText={(v) => handleSubstituteChange(i, v)}
                          placeholderTextColor="#CFD8DC"
                          onFocus={() => { setActiveSearchIndex(i); setSearchType("substitute"); }}
                          onBlur={() => setTimeout(() => { if (activeSearchIndex === i && searchType === "substitute") { setSearchResults([]); setActiveSearchIndex(null); } }, 200)}
                        />
                        {s.verified && (
                          <MaterialIcons name="verified" size={18} color="#34C759" style={{ position: 'absolute', right: 10, top: 12 }} />
                        )}
                      </View>
                      {/* Search dropdown for this substitute field */}
                      {activeSearchIndex === i && searchType === "substitute" && searchResults.length > 0 && (
                        <View style={{
                          backgroundColor: '#FFF', borderRadius: 10, marginTop: 2, marginLeft: 36,
                          borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 160,
                          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
                        }}>
                          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            {searchResults.map((u, idx) => (
                              <TouchableOpacity
                                key={u._id || idx}
                                onPress={() => handleSelectSubstitute(i, u)}
                                style={{
                                  flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
                                  borderBottomWidth: idx < searchResults.length - 1 ? 1 : 0, borderBottomColor: '#F3F4F6',
                                }}
                              >
                                <MaterialCommunityIcons name="account-circle" size={24} color="#FF6A00" style={{ marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>{u.name || u.fullName}</Text>
                                  {u.mobile && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{u.mobile}</Text>}
                                </View>
                                <MaterialIcons name="add-circle-outline" size={20} color="#34C759" />
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Sport-Specific Fields (match format, seeding, overs, etc.) removed from player booking.
               These settings are managed by the tournament manager on the web side. */}

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
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F3F5', borderWidth: 1.5, borderColor: '#ECEFF1' },
  selectChipActive: { backgroundColor: '#FF6A0015', borderColor: '#FF6A00' },
  selectChipText: { fontSize: 13, fontWeight: '700', color: '#78909C' },
  selectChipTextActive: { color: '#FF6A00' },
});

export default BookingScreen;
