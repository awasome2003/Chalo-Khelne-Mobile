import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import TournamentConfig from "../../api/tournaments";
import { useAuth } from "../../context/AuthContext";
import Website_SERVER_URL from "../../api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const normalizeLocation = (eventLocation) => {
  if (!eventLocation) return "Location Not Specified";
  if (typeof eventLocation === "string") {
    if (eventLocation.startsWith("[") && eventLocation.endsWith("]")) {
      try {
        const parsed = JSON.parse(eventLocation);
        if (Array.isArray(parsed)) return normalizeLocation(parsed);
      } catch (e) {
        return eventLocation.trim();
      }
    }
    return eventLocation.trim();
  }
  if (typeof eventLocation === "object") {
    if (Array.isArray(eventLocation)) {
      const locationNames = [];
      eventLocation.forEach(item => {
        if (typeof item === "string") {
          if (item.startsWith("[") && item.endsWith("]")) {
            try {
              const parsed = JSON.parse(item);
              if (Array.isArray(parsed)) locationNames.push(normalizeLocation(parsed));
              else locationNames.push(String(parsed).trim());
            } catch (e) {
              locationNames.push(item.trim());
            }
          } else locationNames.push(item.trim());
        } else if (typeof item === "object" && item !== null) {
          const name = item.name || item.title || item.address || item._id || JSON.stringify(item);
          locationNames.push(typeof name === 'string' ? name.trim() : normalizeLocation(name));
        }
      });
      const result = locationNames.filter(name => name && name !== "" && name !== "Location Not Specified").join(", ");
      return result || "Location Not Specified";
    } else {
      const name = eventLocation.name || eventLocation.title || eventLocation.address || eventLocation._id || JSON.stringify(eventLocation);
      return typeof name === 'string' ? name.trim() : normalizeLocation(name);
    }
  }
  return String(eventLocation).trim() || "Location Not Specified";
};

const getTournamentDuration = (rawData) => {
  if (!rawData?.startDate || !rawData?.endDate) return "NA";
  const start = new Date(rawData.startDate);
  const end = new Date(rawData.endDate);
  if (isNaN(start) || isNaN(end)) return "NA";
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return `${diffDays} days`;
};

const formatTime = (selectedTime) => {
  if (!selectedTime) return "TBA";

  const to12Hour = (timeStr) => {
    if (!timeStr) return "";
    let cleanTime = timeStr.trim();
    // If it already has AM/PM, return as is
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

  if (!start) return "TBA";

  const displayStart = to12Hour(start);
  const displayEnd = end ? to12Hour(end) : "";

  if (displayEnd) {
    return `${displayStart} - ${displayEnd}`;
  }

  // Fallback if period is provided separately item doesn't have it
  if (selectedTime.period && !displayStart.includes("AM") && !displayStart.includes("PM")) {
    return `${displayStart} ${selectedTime.period}`;
  }

  return displayStart;
};

const clearTournamentCache = async (id) => {
  try { await AsyncStorage.removeItem(`tournament_${id}`); }
  catch (error) { console.warn('Error clearing tournament cache:', error); }
};

const TournamentDetails = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const params = route.params?.params || route.params || {};
  const { item, tournamentId, isPastTournament } = params;

  const [tournament, setTournament] = useState(item || {});
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingChecking, setBookingChecking] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Whitelist/Verification
  const [isVerified, setIsVerified] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [empIdInput, setEmpIdInput] = useState("");

  const actualTournamentId = tournamentId || item?.id || item?._id;

  const categories = useMemo(() => {
    let cats = tournament.rawData?.category || tournament.category || item?.category || [];
    if (Array.isArray(cats) && cats.length > 0 && Array.isArray(cats[0])) cats = cats[0];
    if (!Array.isArray(cats)) return [];
    return cats.filter(c => c && (c.name || c.categoryName || c.title)).map(c => ({
      _id: c._id || c.id,
      name: c.name || c.categoryName || c.title,
      fee: c.fee ?? c.amount ?? 0,
    }));
  }, [tournament.rawData?.category, tournament.category, item?.category]);

  const totalPrice = useMemo(() => selectedCategories.reduce((sum, cat) => sum + (parseFloat(cat.fee) || 0), 0), [selectedCategories]);

  useEffect(() => {
    if (actualTournamentId && (!tournament.rawData || tournament.id !== actualTournamentId)) {
      fetchTournamentDetails();
    }
  }, [actualTournamentId]);

  const fetchTournamentDetails = async () => {
    const id = actualTournamentId;
    if (!id) return;
    setLoading(true);
    try {
      const response = await axios.get(TournamentConfig.ENDPOINTS.BY_ID(id), { timeout: 8000 });
      if (response.data) {
        const tData = response.data.tournament || response.data;
        const fullT = {
          id: tData._id || id,
          name: tData.title || tData.name || "Untitled Tournament",
          rawData: tData,
          imageUri: tData.tournamentLogo ? `${Website_SERVER_URL.Wbsite_SERVER_URL}/uploads/tournaments/${tData.tournamentLogo}` : null,
        };
        setTournament(fullT);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkUserBooking = async () => {
    try {
      const userId = user?.id || user?._id;
      if (!userId) { setIsBooked(false); setBookingChecking(false); return; }
      setBookingChecking(true);
      const res = await axios.get(TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId));
      const bookings = res.data.data || res.data.bookings || res.data || [];
      setIsBooked(bookings.some(b => {
        const tId = b.tournamentId?._id || b.tournamentId;
        return tId === actualTournamentId;
      }));
    } catch (e) { console.error("Booking check error:", e); setIsBooked(false); }
    finally { setBookingChecking(false); }
  };

  useEffect(() => {
    if (actualTournamentId && user) checkUserBooking();
    else setBookingChecking(false);
  }, [actualTournamentId, user?.id]);

  const handleRegistration = () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please log in to register.", [
        { text: "Cancel", style: "cancel" },
        { text: "Login", onPress: () => navigation.navigate("Login", { redirectTo: "Tournament Details", tournamentId: actualTournamentId }) }
      ]);
      return;
    }
    if (categories.length > 0) setShowCategoryPopup(true);
    else navigation.navigate("Booking Screen", { tournament, selectedCategory: null });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (actualTournamentId) {
      await clearTournamentCache(actualTournamentId);
      await fetchTournamentDetails();
      if (user) await checkUserBooking();
    }
    setRefreshing(false);
  };

  const formatDate = (date) => {
    if (!date || isNaN(new Date(date).getTime())) return "N.A.";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const bannerImg = tournament.imageUri ? { uri: tournament.imageUri } : require("../../../assets/tournament-banner.jpg");
  const desc = tournament.rawData?.description || "No description available.";
  const location = normalizeLocation(tournament.rawData?.eventLocation || tournament.rawData?.address);

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top + 5 }]}>
        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6A00"]} />}
      >
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <Image source={bannerImg} style={styles.bannerImg} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bannerOverlay}>
            <View style={styles.bannerContent}>
              <View style={styles.typeTag}>
                <Text style={styles.typeText}>{tournament.rawData?.sportsType || "Athletics"}</Text>
              </View>
              <Text style={styles.tourName}>{tournament.name || "Tournament Arena"}</Text>
              <View style={styles.hostRow}>
                <Ionicons name="business" size={14} color="#FF6A00" />
                <Text style={styles.hostName}>{tournament.rawData?.organizerName || "Sports Club"}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FF6A00" />
            <Text style={styles.loadText}>Fetching details...</Text>
          </View>
        ) : (
          <View style={styles.detailsContent}>

            {/* Quick Info Grid */}
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconBg, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="calendar" size={20} color="#1976D2" />
                </View>
                <Text style={styles.infoLabel}>Starts</Text>
                <Text style={styles.infoValue}>{formatDate(tournament.rawData?.startDate)}</Text>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconBg, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="time" size={20} color="#7B1FA2" />
                </View>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{formatTime(tournament.rawData?.selectedTime)}</Text>
              </View>
              <View style={styles.infoItem}>
                <View style={[styles.infoIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="location" size={20} color="#388E3C" />
                </View>
                <Text style={styles.infoLabel}>Venue</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{location.split(',')[0]}</Text>
              </View>
            </View>

            {/* Description Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>About Tournament</Text>
              <Text style={styles.descText} numberOfLines={showMore ? undefined : 4}>
                {desc}
              </Text>
              <TouchableOpacity onPress={() => setShowMore(!showMore)} style={styles.readMoreBtn}>
                <Text style={styles.readMoreTxt}>{showMore ? "Show Less" : "Read Full Description"}</Text>
                <Ionicons name={showMore ? "chevron-up" : "chevron-down"} size={16} color="#FF6A00" />
              </TouchableOpacity>
            </View>

            {/* Venue Full Section */}
            <View style={styles.sectionCard}>
              <View style={styles.secHeaderRow}>
                <Text style={styles.sectionTitle}>Venue Details</Text>
              </View>
              <View style={styles.locationRow}>
                <View style={styles.locIconWrapper}>
                  <Ionicons name="navigate-circle" size={24} color="#FF6A00" />
                </View>
                <Text style={styles.fullLocText}>{location}</Text>
              </View>
            </View>

            {/* Categories Section */}
            {categories.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Tournament Categories</Text>
                <View style={styles.catList}>
                  {categories.map((cat, i) => (
                    <View key={i} style={styles.catItem}>
                      <View style={styles.catInfo}>
                        <View style={styles.catDot} />
                        <Text style={styles.catName}>{cat.name}</Text>
                      </View>
                      <Text style={styles.catFee}>₹{cat.fee}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Terms & Amenities Summary */}
            <View style={styles.doubleSecRow}>
              <View style={[styles.halfCard, { marginRight: 12 }]}>
                <Ionicons name="shield-checkmark" size={22} color="#4CAF50" />
                <Text style={styles.halfTitle}>Safe Play</Text>
                <Text style={styles.halfDesc}>Verified Rules</Text>
              </View>
              <View style={styles.halfCard}>
                <Ionicons name="water" size={22} color="#03A9F4" />
                <Text style={styles.halfTitle}>Amenities</Text>
                <Text style={styles.halfDesc}>Basic Facilities</Text>
              </View>
            </View>

          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Action Dock */}
      {!loading && !isPastTournament && (
        <View style={[styles.actionDock, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.priceCol}>
            <Text style={styles.priceLabel}>Entry Fee</Text>
            <Text style={styles.priceValue}>
              {categories.length > 0 ? `₹${Math.min(...categories.map(c => c.fee))}` : "Free"}
              {categories.length > 1 && <Text style={styles.onward}> onward</Text>}
            </Text>
          </View>

          {bookingChecking ? (
            <View style={styles.loadingBtn}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : isBooked ? (
            <View style={styles.bookedBtn}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginRight: 6 }} />
              <Text style={styles.bookedBtnText}>Registered</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.bookBtn} onPress={handleRegistration}>
              <Text style={styles.bookBtnText}>Registration</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modern Category Selection Bottom Sheet */}
      <Modal visible={showCategoryPopup} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCategoryPopup(false)} />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Categories</Text>
                <Text style={styles.sheetSubtitle}>Choose one or more to register</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCategoryPopup(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#90A4AE" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {categories.map((cat, i) => {
                const isSel = selectedCategories.some(sc => sc._id === cat._id);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.sheetItem, isSel && styles.sheetItemSel]}
                    onPress={() => {
                      if (isSel) setSelectedCategories(prev => prev.filter(s => s._id !== cat._id));
                      else setSelectedCategories(prev => [...prev, cat]);
                    }}
                  >
                    <View style={styles.sheetItemMain}>
                      <View style={[styles.checkCircle, isSel && styles.checkCircleSel]}>
                        {isSel && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                      <View style={{ marginLeft: 15 }}>
                        <Text style={[styles.sheetItemName, isSel && styles.textPrimary]}>{cat.name}</Text>
                        <Text style={styles.sheetItemFee}>Registration: ₹{cat.fee}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalVal}>₹{totalPrice}</Text>
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, selectedCategories.length === 0 && styles.disabledBtn]}
                disabled={selectedCategories.length === 0}
                onPress={() => {
                  setShowCategoryPopup(false);
                  navigation.navigate("Booking Screen", { tournament, selectedCategory: selectedCategories });
                }}
              >
                <Text style={styles.confirmBtnText}>Proceed to Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  bannerContainer: { height: 320, width: '100%', position: 'relative' },
  bannerImg: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 25 },
  bannerContent: { marginBottom: 10 },
  typeTag: { backgroundColor: '#FF6A00', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  typeText: { color: '#FFF', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  tourName: { fontSize: 26, fontWeight: '900', color: '#FFF', marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 10 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hostName: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  loadingBox: { padding: 50, alignItems: 'center' },
  loadText: { marginTop: 15, color: '#90A4AE', fontWeight: '600' },
  detailsContent: { paddingHorizontal: 20, marginTop: -30 },
  infoGrid: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 25, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoIconBg: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#90A4AE', fontWeight: '700', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '800', color: '#263238' },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#263238', marginBottom: 15 },
  descText: { fontSize: 15, color: '#546E7A', lineHeight: 24 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 5 },
  readMoreTxt: { fontSize: 14, color: '#FF6A00', fontWeight: '700' },
  secHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  mapBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F0F7FF' },
  mapBtnTxt: { fontSize: 12, color: '#007AFF', fontWeight: '800' },
  locationRow: { flexDirection: 'row', gap: 15, alignItems: 'center' },
  locIconWrapper: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center' },
  fullLocText: { flex: 1, fontSize: 14, color: '#546E7A', fontWeight: '600', lineHeight: 20 },
  catList: { marginTop: 5 },
  catItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  catInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CFD8DC' },
  catName: { fontSize: 15, color: '#455A64', fontWeight: '700' },
  catFee: { fontSize: 16, fontWeight: '800', color: '#263238' },
  doubleSecRow: { flexDirection: 'row', marginTop: 20 },
  halfCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 25, padding: 20, alignItems: 'center' },
  halfTitle: { fontSize: 15, fontWeight: '800', color: '#263238', marginTop: 10 },
  halfDesc: { fontSize: 12, color: '#90A4AE', marginTop: 4 },
  actionDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingHorizontal: 25, paddingTop: 15, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ECEFF1', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 10 },
  priceCol: { flex: 1 },
  priceLabel: { fontSize: 12, color: '#90A4AE', fontWeight: '700' },
  priceValue: { fontSize: 22, fontWeight: '900', color: '#263238' },
  onward: { fontSize: 14, color: '#B0BEC5', fontWeight: '500' },
  bookBtn: { backgroundColor: '#FF6A00', height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8 },
  bookBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  loadingBtn: { backgroundColor: '#ECEFF1', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  bookedBtn: { backgroundColor: '#E8F5E9', height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25, borderWidth: 1, borderColor: '#C8E6C9' },
  bookedBtnText: { color: '#2E7D32', fontSize: 16, fontWeight: '800' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, maxHeight: '85%', paddingBottom: 20 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#ECEFF1', alignSelf: 'center', marginTop: 15 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, paddingTop: 25, paddingBottom: 15 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#263238' },
  sheetSubtitle: { fontSize: 14, color: '#90A4AE', fontWeight: '500', marginTop: 4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F7F8', justifyContent: 'center', alignItems: 'center' },
  sheetList: { paddingHorizontal: 25, maxHeight: 400 },
  sheetItem: { padding: 18, borderRadius: 20, backgroundColor: '#F8F9FA', marginBottom: 12, borderWidth: 1, borderColor: '#F1F3F5' },
  sheetItemSel: { backgroundColor: '#FFF9F5', borderColor: '#FF6A00', borderWidth: 1.5 },
  sheetItemMain: { flexDirection: 'row', alignItems: 'center' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CFD8DC', justifyContent: 'center', alignItems: 'center' },
  checkCircleSel: { backgroundColor: '#FF6A00', borderColor: '#FF6A00' },
  sheetItemName: { fontSize: 16, fontWeight: '800', color: '#455A64' },
  textPrimary: { color: '#FF6A00' },
  sheetItemFee: { fontSize: 13, color: '#90A4AE', marginTop: 4, fontWeight: '600' },
  sheetFooter: { padding: 25, borderTopWidth: 1, borderTopColor: '#F5F7F8' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { fontSize: 16, color: '#90A4AE', fontWeight: '700' },
  totalVal: { fontSize: 24, fontWeight: '900', color: '#263238' },
  confirmBtn: { backgroundColor: '#FF6A00', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF6A00', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  confirmBtnText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  disabledBtn: { backgroundColor: '#ECEFF1', shadowOpacity: 0, elevation: 0 },
});

export default TournamentDetails;
