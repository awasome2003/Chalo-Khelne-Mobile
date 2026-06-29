import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import API from "../../api/api";
import TOURNAMENTS from "../../api/tournaments";
import { useAuth } from "../../context/AuthContext";
import { authFetch } from "../../api/authFetch";

// ─── Helpers ────────────────────────────────────────────────────────────
const getSportIcon = (sportName) => {
  const sport = String(sportName || "").toLowerCase();
  if (sport.includes("basket")) return require("../../../assets/Basketball.png");
  if (sport.includes("cricket")) return require("../../../assets/Cricket.png");
  if (sport.includes("football") || sport.includes("soccer"))
    return require("../../../assets/Football.png");
  if (sport.includes("badminton")) return require("../../../assets/shuttlecock.png");
  if (sport.includes("tennis") || sport.includes("table"))
    return require("../../../assets/ping-pong.png");
  return require("../../../assets/sports_soccer.png");
};

// Min pricePerHour across a turf's sports[]. Returns null if no priced sport.
const computeMinPrice = (turf) => {
  if (!Array.isArray(turf?.sports) || turf.sports.length === 0) return null;
  const prices = turf.sports
    .map((s) => (typeof s === "object" ? Number(s.pricePerHour) : NaN))
    .filter((n) => !isNaN(n) && n > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices);
};

const getFormattedLocation = (turf) => {
  if (turf?.address) {
    const { area, city } = turf.address;
    if (area && city) return `${area}, ${city}`;
    if (area) return area;
    if (city) return city;
    if (turf.address.fullAddress) return turf.address.fullAddress;
  }
  if (turf?.location) {
    if (typeof turf.location === "string") return turf.location;
    if (typeof turf.location === "object")
      return turf.location.address || turf.location.city || "";
  }
  return "Location not available";
};

const calculateDistance = (turf) => {
  // Real distance computation isn't wired yet; return a stable placeholder
  // derived from the turf id so the same turf always shows the same value.
  if (typeof turf?.distance === "string" || typeof turf?.distance === "number") {
    return `${turf.distance} km`;
  }
  // Deterministic pseudo-random: hash id → 0.5..5.5 km
  const id = String(turf?._id || "");
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  const km = 0.5 + (h % 50) / 10;
  return `${km.toFixed(1)} km`;
};

// Turf images may be hosted on external servers and fail to load; fall back to
// a bundled placeholder on error so cards never show a blank box.
const TURF_FALLBACK = require("../../../assets/turf.jpg");
const TurfImage = ({ source, style }) => {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={failed ? TURF_FALLBACK : source}
      style={style}
      onError={() => setFailed(true)}
    />
  );
};

const PlayerVenue = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState(null); // single-select

  const [turfs, setTurfs] = useState([]);
  const [filteredTurfs, setFilteredTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [availableSports, setAvailableSports] = useState([]); // from tournaments
  const [availability, setAvailability] = useState({}); // { turfId: { availableSlots } }
  const [favorites, setFavorites] = useState(new Set()); // Set<turfId>

  // ─── Fetchers ─────────────────────────────────────────────────────────
  const fetchTurfs = async () => {
    try {
      const response = await authFetch(API.ENDPOINTS.TURFS.BASE);
      const data = await response.json();
      const turfData = data.turfs || data || [];
      if (Array.isArray(turfData)) setTurfs(turfData);
      else setTurfs([]);
    } catch (error) {
      console.error("Error fetching turfs:", error);
      Alert.alert("Error", "Failed to load venues. Please try again later.");
      setTurfs([]);
    }
  };

  // Pull the unique sport-name list out of all tournaments' `sports[]` arrays.
  // No dedicated sports endpoint exists yet; tournaments are our source of truth.
  const fetchAvailableSports = async () => {
    try {
      const res = await authFetch(TOURNAMENTS.ENDPOINTS.BASE);
      const data = await res.json();
      const tournaments = Array.isArray(data) ? data : data?.tournaments || [];
      const set = new Set();
      for (const t of tournaments) {
        if (Array.isArray(t?.sports)) {
          for (const s of t.sports) {
            const name = typeof s === "string" ? s : s?.sportName || s?.name;
            if (name) set.add(name.trim());
          }
        }
      }
      setAvailableSports(Array.from(set));
    } catch (e) {
      console.error("Error fetching tournament sports:", e);
      setAvailableSports([]);
    }
  };

  const fetchAvailability = async () => {
    try {
      const res = await authFetch(API.ENDPOINTS.TURFS.AVAILABILITY_TODAY);
      const data = await res.json();
      if (data?.success && data.availability) setAvailability(data.availability);
    } catch (e) {
      console.error("Error fetching availability:", e);
    }
  };

  const fetchFavorites = async () => {
    if (!userId) return;
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const res = await authFetch(API.ENDPOINTS.USER.USER_FAVORITES(userId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const list = data?.favorites || data?.data || data || [];
      const ids = new Set();
      for (const fav of Array.isArray(list) ? list : []) {
        const id = fav?._id || fav?.turfId?._id || fav?.turfId || fav;
        if (id) ids.add(String(id));
      }
      setFavorites(ids);
    } catch (e) {
      console.error("Error fetching favorites:", e);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchTurfs(),
      fetchAvailableSports(),
      fetchAvailability(),
      fetchFavorites(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Re-fetch favorites whenever the screen regains focus (e.g. after coming
  // back from FavouriteVenue where the user may have unfavorited a turf).
  useFocusEffect(
    useCallback(() => {
      if (userId) fetchFavorites();
    }, [userId])
  );

  // ─── Filtering ────────────────────────────────────────────────────────
  useEffect(() => {
    let filtered = [...turfs];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (turf) =>
          (turf.name && turf.name.toLowerCase().includes(q)) ||
          turf.address?.area?.toLowerCase().includes(q) ||
          turf.address?.city?.toLowerCase().includes(q) ||
          turf.sports?.some((sport) => {
            const name = typeof sport === "string" ? sport : sport?.name || "";
            return name.toLowerCase().includes(q);
          })
      );
    }

    if (selectedSport) {
      filtered = filtered.filter((turf) =>
        turf.sports?.some((sport) => {
          const name = typeof sport === "string" ? sport : sport?.name || "";
          return name.toLowerCase() === selectedSport.toLowerCase();
        })
      );
    }

    setFilteredTurfs(filtered);
  }, [turfs, searchQuery, selectedSport]);

  // ─── Actions ──────────────────────────────────────────────────────────
  const handleVoiceInput = () => {
    Alert.alert("Voice search", "Voice input integration coming soon");
  };

  const handleToggleFavorite = async (turfId) => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to save favorites.");
      return;
    }
    // Backend expects an explicit action ("add" | "remove"); derive it from the
    // current state BEFORE the optimistic flip.
    const action = favorites.has(turfId) ? "remove" : "add";

    // Optimistic toggle
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(turfId)) next.delete(turfId);
      else next.add(turfId);
      return next;
    });

    try {
      const res = await authFetch(API.ENDPOINTS.USER.TOGGLE_FAVORITE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, turfId, action }),
      });
      if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
    } catch (e) {
      console.error("Favorite toggle failed:", e);
      // Revert on failure
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(turfId)) next.delete(turfId);
        else next.add(turfId);
        return next;
      });
    }
  };

  const handleBookNow = (turf) => {
    navigation.navigate("TurfDetails", { turfId: turf._id });
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAll();
            }}
            colors={["#15A765"]}
            tintColor="#15A765"
          />
        }
      >
        {/* Header */}
        <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>Book Turf</Text>
          <TouchableOpacity
            style={styles.favLink}
            onPress={() => navigation.navigate("FavouriteVenue")}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={14} color="#15A765" />
            <Text style={styles.favLinkText}>View favorites</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color="#666" />
          <TextInput
            placeholder="Search sports, turfs or location"
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <MaterialIcons
                name="close"
                size={20}
                color="#666"
                style={{ marginRight: 8 }}
              />
            </TouchableOpacity>
          ) : null}
          <View style={styles.searchDivider} />
          <TouchableOpacity onPress={handleVoiceInput} style={styles.micBtn}>
            <MaterialIcons name="mic-none" size={22} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Sport chips */}
        {availableSports.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipRowOuter}
          >
            {availableSports.map((sport) => {
              const isActive =
                selectedSport &&
                sport.toLowerCase() === selectedSport.toLowerCase();
              return (
                <TouchableOpacity
                  key={sport}
                  style={[styles.sportChip, isActive && styles.sportChipActive]}
                  activeOpacity={0.85}
                  onPress={() =>
                    setSelectedSport((prev) =>
                      prev && prev.toLowerCase() === sport.toLowerCase()
                        ? null
                        : sport
                    )
                  }
                >
                  <Image source={getSportIcon(sport)} style={styles.chipIcon} />
                  <Text
                    style={[
                      styles.chipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {sport}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#15A765" />
            <Text style={styles.loadingText}>Loading venues...</Text>
          </View>
        ) : filteredTurfs.length > 0 ? (
          <View style={styles.listWrap}>
            {filteredTurfs.map((turf) => {
              const hasImage =
                Array.isArray(turf.images) && turf.images.length > 0;
              const imageSrc = hasImage
                ? { uri: `${API.UPLOADS_URL}/${turf.images[0]}` }
                : require("../../../assets/turf.jpg");
              const minPrice = computeMinPrice(turf);
              const distance = calculateDistance(turf);
              const location = getFormattedLocation(turf);
              const isFav = favorites.has(String(turf._id));
              const slots =
                availability[String(turf._id)]?.availableSlots ?? null;

              return (
                <View key={turf._id} style={styles.card}>
                  <TurfImage source={imageSrc} style={styles.cardImage} />

                  <View style={styles.cardBody}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {turf.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleToggleFavorite(String(turf._id))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isFav ? "heart" : "heart-outline"}
                          size={20}
                          color={isFav ? "#FF3040" : "#BBB"}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.cardLocation} numberOfLines={1}>
                      {location} · {distance} away
                    </Text>

                    <View style={styles.cardPriceRow}>
                      <Text style={styles.cardPrice}>
                        ₹{minPrice != null ? minPrice : 0}/-{" "}
                        <Text style={styles.cardPriceUnit}>per hour</Text>
                      </Text>
                    </View>

                    <View style={styles.cardFooterRow}>
                      <Text style={styles.cardSlots}>
                        {slots != null
                          ? `${slots} slot${slots === 1 ? "" : "s"} available today`
                          : "Check availability"}
                      </Text>
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => handleBookNow(turf)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.bookBtnText}>Book now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="sports-soccer" size={56} color="#D1D5DB" />
            <Text style={styles.emptyText}>No venues found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search or sport filter
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
  },
  favLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#E8F7F0",
  },
  favLinkText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#15A765",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    height: 50,
    borderColor: "#EEEEFF",
    borderRadius: 53,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  micBtn: {
    padding: 2,
  },

  // Sport chips
  chipRowOuter: {
    marginBottom: 14,
  },
  chipRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingRight: 24,
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEEEFF",
    backgroundColor: "#FFFFFF",
    marginRight: 10,
  },
  sportChipActive: {
    backgroundColor: "#E8F7F0",
    borderColor: "#15A765",
  },
  chipIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },
  chipTextActive: {
    color: "#15A765",
  },

  // List
  listWrap: {
    paddingHorizontal: 16,
    gap: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    overflow: "hidden",
    marginBottom: 14,
  },
  cardImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#eee",
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginRight: 10,
  },
  cardLocation: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },
  cardPriceRow: {
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#15A765",
  },
  cardPriceUnit: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "400",
    color: "#645E66",
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardSlots: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginRight: 12,
  },
  bookBtn: {
    backgroundColor: "#15A765",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },

  // States
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
});

export default PlayerVenue;
