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
  Share,
  Linking,
} from "react-native";
import {
  MaterialIcons,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import TournamentConfig from "../../api/tournaments";
import { useAuth } from "../../context/AuthContext";
import Website_SERVER_URL from "../../api/api";
import { getSportName } from "../../utils/sportTrack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DOBGateModal from "./DOBGateModal";

const { width } = Dimensions.get("window");

// ─── Helpers ────────────────────────────────────────────────────────────────

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
      eventLocation.forEach((item) => {
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
          const name =
            item.name || item.title || item.address || item._id || JSON.stringify(item);
          locationNames.push(typeof name === "string" ? name.trim() : normalizeLocation(name));
        }
      });
      const result = locationNames
        .filter((name) => name && name !== "" && name !== "Location Not Specified")
        .join(", ");
      return result || "Location Not Specified";
    } else {
      const name =
        eventLocation.name ||
        eventLocation.title ||
        eventLocation.address ||
        eventLocation._id ||
        JSON.stringify(eventLocation);
      return typeof name === "string" ? name.trim() : normalizeLocation(name);
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
    if (/[a-zA-Z]/.test(cleanTime)) return cleanTime;

    let [hour, minute] = cleanTime.split(":").map(Number);
    if (isNaN(hour)) return cleanTime;

    const period = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    const mStr = minute !== undefined ? `:${minute.toString().padStart(2, "0")}` : ":00";

    return `${h12}${mStr} ${period}`;
  };

  if (selectedTime.timeSlot) return selectedTime.timeSlot;

  let start = selectedTime.startTime;
  let end = selectedTime.endTime;

  if (!start && selectedTime.hour) {
    start = `${selectedTime.hour}:${selectedTime.minute || "00"}`;
  }

  if (!start) return "TBA";

  const displayStart = to12Hour(start);
  const displayEnd = end ? to12Hour(end) : "";

  if (displayEnd) return `${displayStart} - ${displayEnd}`;

  if (selectedTime.period && !displayStart.includes("AM") && !displayStart.includes("PM")) {
    return `${displayStart} ${selectedTime.period}`;
  }

  return displayStart;
};

const clearTournamentCache = async (id) => {
  try {
    await AsyncStorage.removeItem(`tournament_${id}`);
  } catch (error) {
    console.warn("Error clearing tournament cache:", error);
  }
};

// Amenity name → icon component + icon name. Falls back to a check icon.
const getAmenityIcon = (name) => {
  const key = String(name || "").toLowerCase().trim();
  const map = {
    floodlights: { Icon: Ionicons, iconName: "bulb-outline" },
    lights: { Icon: Ionicons, iconName: "bulb-outline" },
    washroom: { Icon: MaterialCommunityIcons, iconName: "human-male-female" },
    restroom: { Icon: MaterialCommunityIcons, iconName: "human-male-female" },
    toilet: { Icon: MaterialCommunityIcons, iconName: "human-male-female" },
    parking: { Icon: MaterialIcons, iconName: "local-parking" },
    water: { Icon: Ionicons, iconName: "water-outline" },
    "drinking water": { Icon: Ionicons, iconName: "water-outline" },
    "seating area": { Icon: MaterialIcons, iconName: "event-seat" },
    seating: { Icon: MaterialIcons, iconName: "event-seat" },
    "first aid": { Icon: MaterialIcons, iconName: "medical-services" },
    medical: { Icon: MaterialIcons, iconName: "medical-services" },
    wifi: { Icon: Ionicons, iconName: "wifi" },
    ac: { Icon: MaterialCommunityIcons, iconName: "air-conditioner" },
    shower: { Icon: MaterialCommunityIcons, iconName: "shower" },
    cafe: { Icon: Ionicons, iconName: "cafe-outline" },
    food: { Icon: MaterialIcons, iconName: "restaurant" },
    snacks: { Icon: MaterialIcons, iconName: "restaurant" },
  };
  return map[key] || { Icon: MaterialIcons, iconName: "check-circle-outline" };
};

const TournamentDetails = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const params = route.params?.params || route.params || {};
  const { item, tournamentId, isPastTournament } = params;

  const [tournament, setTournament] = useState(item || {});
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showRules, setShowRules] = useState(false); // collapsed by default
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingChecking, setBookingChecking] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Whitelist / Verification
  const [isVerified, setIsVerified] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showDOBGate, setShowDOBGate] = useState(false);
  const [empIdInput, setEmpIdInput] = useState("");
  const [verifiedEmployeeId, setVerifiedEmployeeId] = useState(null);
  const [verifyError, setVerifyError] = useState("");

  const actualTournamentId = tournamentId || item?.id || item?._id;

  // STEP 17b.iii — per-sport sections from tournament.sports[].
  const sportSections = useMemo(() => {
    const sportsArr = tournament.rawData?.sports || tournament.sports || item?.sports;
    if (!Array.isArray(sportsArr) || sportsArr.length === 0) return [];
    return sportsArr
      .filter((s) => s && Array.isArray(s.categories) && s.categories.length > 0)
      .map((s) => ({
        sportId: String(s.sportId || ""),
        sportName: s.sportName || "Sport",
        sportSlug: s.sportSlug || "",
        categories: s.categories
          .filter((c) => c && (c.name || c.categoryName || c.title))
          .map((c) => ({
            _id: String(c._id || c.id || `${s.sportId}-${c.name}`),
            name: c.name || c.categoryName || c.title,
            fee: c.fee ?? c.amount ?? 0,
            // Per-category format — used to group rows under Format headings
            // in the new design. Falls back to the tournament-level format if
            // no per-category field is present.
            format: c.format || c.playFormat || c.formatType || null,
            sportId: String(s.sportId || ""),
            sportName: s.sportName || "Sport",
          })),
      }));
  }, [tournament.rawData, tournament.sports, item]);

  // Flat list of categories across all sports — preserves the existing
  // selection-state contract (still uses unique `_id` keys).
  const categories = useMemo(
    () => sportSections.flatMap((s) => s.categories),
    [sportSections]
  );

  // Group each sport's categories by Format for the new card design.
  // If per-category format is missing everywhere, fall back to tournament-level
  // format (or a single "Categories" heading).
  const sportFormatSections = useMemo(() => {
    if (sportSections.length === 0) return [];
    const tournamentLevelFormat =
      tournament.rawData?.playFormat ||
      tournament.rawData?.format ||
      tournament.rawData?.tournamentFormat ||
      null;

    return sportSections.map((sport) => {
      const hasFormatField = sport.categories.some((c) => c.format);
      let formatGroups;
      if (hasFormatField) {
        const map = new Map();
        sport.categories.forEach((c) => {
          const fmt = c.format || tournamentLevelFormat || "Categories";
          if (!map.has(fmt)) map.set(fmt, []);
          map.get(fmt).push(c);
        });
        formatGroups = Array.from(map.entries()).map(([formatName, cats]) => ({
          formatName,
          categories: cats,
        }));
      } else {
        formatGroups = [
          {
            formatName: tournamentLevelFormat || "Categories",
            categories: sport.categories,
          },
        ];
      }
      return { ...sport, formatGroups };
    });
  }, [sportSections, tournament.rawData]);

  const totalPrice = useMemo(
    () => selectedCategories.reduce((sum, cat) => sum + (parseFloat(cat.fee) || 0), 0),
    [selectedCategories]
  );

  // Amenities — read from tournament.rawData.amenities (array | comma-separated string).
  const amenitiesList = useMemo(() => {
    const raw = tournament.rawData?.amenities;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((a) => String(a).trim()).filter(Boolean);
    if (typeof raw === "string")
      return raw
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
    return [];
  }, [tournament.rawData]);

  // Rules — read from tournament.rawData.rules (array | newline-separated string).
  const rulesList = useMemo(() => {
    const raw = tournament.rawData?.rules;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map((r) => String(r).trim()).filter(Boolean);
    if (typeof raw === "string")
      return raw
        .split(/\r?\n/)
        .map((r) => r.trim())
        .filter(Boolean);
    return [];
  }, [tournament.rawData]);

  // Short date range "Apr 24 - Apr 26"
  const dateRangeShort = useMemo(() => {
    const sd = tournament.rawData?.startDate;
    const ed = tournament.rawData?.endDate;
    if (!sd) return "TBA";
    const start = new Date(sd);
    if (isNaN(start)) return "TBA";
    const monthDay = (d) => `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
    if (!ed) return monthDay(start);
    const end = new Date(ed);
    if (isNaN(end) || end.getTime() === start.getTime()) return monthDay(start);
    return `${monthDay(start)} - ${monthDay(end)}`;
  }, [tournament.rawData]);

  useEffect(() => {
    if (
      actualTournamentId &&
      (!tournament.rawData || tournament.id !== actualTournamentId)
    ) {
      fetchTournamentDetails();
    }
  }, [actualTournamentId]);

  const fetchTournamentDetails = async () => {
    const id = actualTournamentId;
    if (!id) return;
    setLoading(true);
    try {
      const response = await axios.get(TournamentConfig.ENDPOINTS.BY_ID(id), {
        timeout: 8000,
      });
      if (response.data) {
        const tData = response.data.tournament || response.data;
        const fullT = {
          id: tData._id || id,
          name: tData.title || tData.name || "Untitled Tournament",
          rawData: tData,
          imageUri: tData.tournamentLogo
            ? `${Website_SERVER_URL.Wbsite_SERVER_URL}/uploads/tournaments/${tData.tournamentLogo}`
            : null,
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
      if (!userId) {
        setIsBooked(false);
        setBookingChecking(false);
        return;
      }
      setBookingChecking(true);
      const res = await axios.get(TournamentConfig.ENDPOINTS.BOOKINGS.BY_USER(userId));
      const bookings = res.data.data || res.data.bookings || res.data || [];
      setIsBooked(
        bookings.some((b) => {
          const tId = b.tournamentId?._id || b.tournamentId;
          return tId === actualTournamentId;
        })
      );
    } catch (e) {
      console.error("Booking check error:", e);
      setIsBooked(false);
    } finally {
      setBookingChecking(false);
    }
  };

  useEffect(() => {
    if (actualTournamentId && user) checkUserBooking();
    else setBookingChecking(false);
  }, [actualTournamentId, user?.id]);

  const isCorporateTournament =
    tournament.rawData?.whitelist && tournament.rawData.whitelist.length > 0;

  const handleRegistration = () => {
    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please log in to register.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () =>
            navigation.navigate("Login", {
              redirectTo: "Tournament Details",
              tournamentId: actualTournamentId,
            }),
        },
      ]);
      return;
    }

    if (isCorporateTournament && !isVerified) {
      setShowVerifyModal(true);
      return;
    }

    proceedToBooking();
  };

  const proceedToBooking = () => {
    if (!user?.dateOfBirth || !user?.sex) {
      setShowDOBGate(true);
      return;
    }

    if (categories.length > 0) {
      navigation.navigate("TournamentBookingWizard", {
        tournament,
        employeeId: verifiedEmployeeId,
      });
    } else {
      navigation.navigate("Booking Screen", {
        tournament,
        selectedCategory: null,
        employeeId: verifiedEmployeeId,
      });
    }
  };

  const handleVerifyEmployee = () => {
    const trimmedId = empIdInput.trim();
    if (!trimmedId) {
      setVerifyError("Please enter your Employee ID");
      return;
    }

    const userMobile = user?.mobile || user?.phone || "";
    const normalizeMobile = (m) => {
      if (!m) return "";
      return m.toString().replace(/[\s\-\+]/g, "").slice(-10);
    };

    const whitelist = tournament.rawData?.whitelist || [];
    const matched = whitelist.some((emp) => {
      const idMatch =
        emp.employeeId &&
        emp.employeeId.toString().trim().toLowerCase() === trimmedId.toLowerCase();
      const mobileMatch =
        userMobile &&
        emp.mobile &&
        normalizeMobile(emp.mobile) === normalizeMobile(userMobile);
      return idMatch || mobileMatch;
    });

    if (matched) {
      setIsVerified(true);
      setVerifiedEmployeeId(trimmedId);
      setVerifyError("");
      setShowVerifyModal(false);
      setTimeout(() => {
        if (categories.length > 0) {
          navigation.navigate("TournamentBookingWizard", {
            tournament,
            employeeId: trimmedId,
          });
        } else {
          navigation.navigate("Booking Screen", {
            tournament,
            selectedCategory: null,
            employeeId: trimmedId,
          });
        }
      }, 300);
    } else {
      setVerifyError(
        "Employee ID not found. Please check with your HR or tournament organizer."
      );
    }
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
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ─── New action handlers ─────────────────────────────────────────────────

  const handleShare = async () => {
    try {
      const tName = tournament.name || tournament.rawData?.title || "Tournament";
      const datePart = dateRangeShort && dateRangeShort !== "TBA" ? ` on ${dateRangeShort}` : "";
      await Share.share({
        message: `${tName}${datePart} — register at chalokhelne.com`,
      });
    } catch (err) {
      console.error("[TournamentDetails] share failed:", err);
    }
  };

  const handleOpenMap = () => {
    const loc = location;
    if (!loc || loc === "Location Not Specified") return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(loc)}`;
    Linking.openURL(url).catch((e) =>
      console.error("[TournamentDetails] open map failed:", e)
    );
  };

  const handleInvite = () => {
    navigation.navigate("InvitePlayer", {
      tournamentId: tournament._id || tournament.id || tournamentId,
      tournamentName: tournament.title || tournament.name,
    });
  };

  const handleExploreJobs = () => {
    navigation.navigate("BrowseTournamentJobsHome", {
      preSelectedTournament: {
        _id: tournament._id || tournament.id || tournamentId,
        title: tournament.title || tournament.name,
        sportsType: getSportName(tournament),
      },
    });
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const bannerImg = tournament.imageUri
    ? { uri: tournament.imageUri }
    : require("../../../assets/tournament-banner.jpg");
  const desc = tournament.rawData?.description || "No description available.";
  const location = normalizeLocation(
    tournament.rawData?.eventLocation || tournament.rawData?.address
  );
  const venueShort = location.split(",")[0] || location;
  const timeRange = formatTime(tournament.rawData?.selectedTime);
  const descNeedsToggle = (desc || "").length > 200;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#15A765"]}
            tintColor="#15A765"
          />
        }
      >
        {/* Banner image (no overlay text per redesign) */}
        <View style={styles.bannerContainer}>
          <Image source={bannerImg} style={styles.bannerImg} resizeMode="cover" />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#15A765" />
            <Text style={styles.loadText}>Fetching details...</Text>
          </View>
        ) : (
          <View style={styles.detailsContent}>
            {/* Title card — overlaps the banner */}
            <View style={styles.titleCard}>
              <View style={styles.titleRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.titleText} numberOfLines={2}>
                    {tournament.name || "Tournament"}
                  </Text>
                  <View style={styles.locRow}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.locText} numberOfLines={1}>
                      {location}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleShare} style={styles.shareSquare}>
                  <MaterialIcons name="share" size={16} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeCard}>
                  <MaterialIcons name="calendar-today" size={16} color="#666" />
                  <Text style={styles.dateTimeText}>{dateRangeShort}</Text>
                </View>
                <View style={styles.dateTimeCard}>
                  <MaterialIcons name="access-time" size={16} color="#666" />
                  <Text style={styles.dateTimeText}>{timeRange}</Text>
                </View>
              </View>
            </View>

            {/* Corporate Tournament Badge */}
            {isCorporateTournament && (
              <View style={styles.corporateBadge}>
                <View style={styles.corporateBadgeIcon}>
                  <MaterialIcons name="business" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.corporateBadgeTitle}>Corporate Tournament</Text>
                  <Text style={styles.corporateBadgeDesc}>
                    Restricted to authorized employees only
                  </Text>
                </View>
                {isVerified && (
                  <View style={styles.verifiedChip}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text style={styles.verifiedChipText}>Verified</Text>
                  </View>
                )}
              </View>
            )}

            {/* Venue Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue Details</Text>
              <Text style={styles.venueText}>{location}</Text>
              <TouchableOpacity onPress={handleOpenMap} style={styles.seeOnMapWrap}>
                <Text style={styles.seeOnMapText}>See on map</Text>
                <Ionicons name="chevron-forward" size={14} color="#0088FF" />
              </TouchableOpacity>
            </View>

            {/* About Tournament */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Tournament</Text>
              <Text style={styles.descText} numberOfLines={showMore ? undefined : 4}>
                {desc}
              </Text>
              {descNeedsToggle && (
                <TouchableOpacity
                  onPress={() => setShowMore(!showMore)}
                  style={styles.readMoreBtn}
                >
                  <Text style={styles.readMoreTxt}>
                    {showMore ? "Show Less" : "Read more"}
                  </Text>
                  <Ionicons
                    name={showMore ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#15A765"
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Tournament Categories (sport → format → categories) */}
            {sportFormatSections.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tournament Categories</Text>
                {sportFormatSections.map((sport, sIdx) => (
                  <View
                    key={sport.sportId || sport.sportName || sIdx}
                    style={styles.categoryCard}
                  >
                    <Text style={styles.catSportName}>{sport.sportName}</Text>
                    {sport.formatGroups.map((fmt, fIdx) => (
                      <View key={`${fmt.formatName}-${fIdx}`} style={styles.formatGroup}>
                        <Text style={styles.formatName}>{fmt.formatName}</Text>
                        <View style={styles.formatTable}>
                          {fmt.categories.map((cat) => (
                            <View key={cat._id} style={styles.catRow}>
                              <Text style={styles.catRowName}>{cat.name}</Text>
                              <Text style={styles.catRowFee}>₹{cat.fee}/-</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* Amenities */}
            {amenitiesList.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {amenitiesList.map((a, i) => {
                    const { Icon, iconName } = getAmenityIcon(a);
                    return (
                      <View key={`${a}-${i}`} style={styles.amenityTile}>
                        <Icon name={iconName} size={22} color="#15A765" />
                        <Text style={styles.amenityLabel}>{a}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Rules & info — collapsed by default */}
            {rulesList.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.rulesHeaderRow}
                  onPress={() => setShowRules(!showRules)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.sectionTitle}>Rules & info</Text>
                  <MaterialIcons
                    name={showRules ? "expand-less" : "expand-more"}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
                {showRules && (
                  <View style={styles.rulesBody}>
                    {rulesList.map((r, i) => (
                      <Text key={i} style={styles.ruleLine}>
                        {r}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Bottom spacer so content isn't hidden behind the action bar */}
        <View style={{ height: isPastTournament ? 40 : 180 }} />
      </ScrollView>

      {/* Floating action bar */}
      {!loading && !isPastTournament && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.actionTopRow}>
            <TouchableOpacity
              style={styles.outlinePill}
              onPress={handleInvite}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#15A765" />
              <Text style={styles.outlinePillText}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outlinePill}
              onPress={handleExploreJobs}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="briefcase-outline" size={16} color="#15A765" />
              <Text style={styles.outlinePillText}>Explore Jobs</Text>
            </TouchableOpacity>
          </View>

          {bookingChecking ? (
            <View style={[styles.registerBtn, { opacity: 0.6 }]}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : !isBooked ? (
            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegistration}
              activeOpacity={0.85}
            >
              <Text style={styles.registerBtnText}>Register</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Modern Category Selection Bottom Sheet (legacy fallback) */}
      <Modal
        visible={showCategoryPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPopup(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowCategoryPopup(false)}
          />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Categories</Text>
                <Text style={styles.sheetSubtitle}>Choose one or more to register</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCategoryPopup(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#90A4AE" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {sportSections.map((section, sIdx) => (
                <View key={section.sportId || section.sportName || sIdx}>
                  {sportSections.length > 1 && (
                    <View
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 4,
                        marginTop: sIdx === 0 ? 0 : 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#455A64",
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {section.sportName}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#90A4AE", marginTop: 2 }}>
                        {section.categories.length}{" "}
                        categor{section.categories.length === 1 ? "y" : "ies"}
                      </Text>
                    </View>
                  )}
                  {section.categories.map((cat, i) => {
                    const isSel = selectedCategories.some((sc) => sc._id === cat._id);
                    return (
                      <TouchableOpacity
                        key={cat._id || `${section.sportId}-${i}`}
                        style={[styles.sheetItem, isSel && styles.sheetItemSel]}
                        onPress={() => {
                          if (isSel)
                            setSelectedCategories((prev) =>
                              prev.filter((s) => s._id !== cat._id)
                            );
                          else setSelectedCategories((prev) => [...prev, cat]);
                        }}
                      >
                        <View style={styles.sheetItemMain}>
                          <View
                            style={[
                              styles.checkCircle,
                              isSel && styles.checkCircleSel,
                            ]}
                          >
                            {isSel && <Ionicons name="checkmark" size={14} color="#FFF" />}
                          </View>
                          <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text
                              style={[
                                styles.sheetItemName,
                                isSel && styles.textPrimary,
                              ]}
                            >
                              {cat.name}
                            </Text>
                            <Text style={styles.sheetItemFee}>
                              {Number(cat.fee || 0) === 0
                                ? "Free entry"
                                : `Registration: ₹${cat.fee}`}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.sheetFooter}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand Total</Text>
                <Text style={styles.totalVal}>₹{totalPrice}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  selectedCategories.length === 0 && styles.disabledBtn,
                ]}
                disabled={selectedCategories.length === 0}
                onPress={() => {
                  setShowCategoryPopup(false);
                  const sportSelections = selectedCategories.map((c) => ({
                    sportId: c.sportId || null,
                    sportName: c.sportName || null,
                    categoryName: c.name,
                    fee: Number(c.fee || 0),
                  }));
                  navigation.navigate("Booking Screen", {
                    tournament,
                    selectedCategory: selectedCategories,
                    sportSelections,
                    employeeId: verifiedEmployeeId,
                  });
                }}
              >
                <Text style={styles.confirmBtnText}>Proceed to Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DOB / Gender gate */}
      <DOBGateModal
        visible={showDOBGate}
        onClose={() => setShowDOBGate(false)}
        onSaved={() => {
          setShowDOBGate(false);
          if (categories.length > 0) {
            navigation.navigate("TournamentBookingWizard", {
              tournament,
              employeeId: verifiedEmployeeId,
            });
          } else {
            navigation.navigate("Booking Screen", {
              tournament,
              selectedCategory: null,
              employeeId: verifiedEmployeeId,
            });
          }
        }}
      />

      {/* Employee Verification Modal */}
      <Modal
        visible={showVerifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowVerifyModal(false);
          setVerifyError("");
        }}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => {
              setShowVerifyModal(false);
              setVerifyError("");
            }}
          />
          <View style={styles.verifySheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.verifyHeader}>
              <View style={styles.verifyIconCircle}>
                <MaterialIcons name="verified-user" size={28} color="#15A765" />
              </View>
              <Text style={styles.verifyTitle}>Employee Verification</Text>
              <Text style={styles.verifySubtitle}>
                This is a corporate tournament. Please enter your Employee ID to verify
                your eligibility.
              </Text>
            </View>

            <View style={styles.verifyInputWrapper}>
              <MaterialIcons name="badge" size={22} color="#90A4AE" />
              <TextInput
                style={styles.verifyInput}
                placeholder="Enter your Employee ID"
                placeholderTextColor="#B0BEC5"
                value={empIdInput}
                onChangeText={(text) => {
                  setEmpIdInput(text);
                  setVerifyError("");
                }}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleVerifyEmployee}
              />
            </View>

            {verifyError ? (
              <View style={styles.verifyErrorRow}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.verifyErrorText}>{verifyError}</Text>
              </View>
            ) : null}

            <Text style={styles.verifyHint}>
              Your Employee ID or registered mobile number will be matched against the
              company's approved list.
            </Text>

            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyEmployee}>
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.verifyCancelBtn}
              onPress={() => {
                setShowVerifyModal(false);
                setVerifyError("");
              }}
            >
              <Text style={styles.verifyCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const AMENITY_TILE_WIDTH = (width - 32 - 16) / 3; // 16px padding × 2, 8px gap × 2

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#FFF" },
  container: { flex: 1, backgroundColor: "#FFF" },

  // Banner
  bannerContainer: { height: 280, width: "100%", backgroundColor: "#eee" },
  bannerImg: { width: "100%", height: "100%" },

  loadingBox: { padding: 50, alignItems: "center" },
  loadText: { marginTop: 15, color: "#90A4AE", fontWeight: "600" },

  // Content
  detailsContent: {
    paddingHorizontal: 16,
    marginTop: -24,
  },

  // Title card (overlaps banner bottom)
  titleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  titleText: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 6,
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    flexShrink: 1,
  },
  shareSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  dateTimeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  dateTimeText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    flexShrink: 1,
  },

  // Corporate badge
  corporateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FBF4",
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#BBF0CB",
    gap: 12,
  },
  corporateBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#15A765",
    justifyContent: "center",
    alignItems: "center",
  },
  corporateBadgeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15A765",
  },
  corporateBadgeDesc: {
    fontSize: 12,
    color: "#388E3C",
    fontWeight: "500",
    marginTop: 2,
  },
  verifiedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  verifiedChipText: { fontSize: 11, fontWeight: "700", color: "#16A34A" },

  // Generic section
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 10,
  },

  // Venue
  venueText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    lineHeight: 22,
  },
  seeOnMapWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 2,
    marginTop: 8,
  },
  seeOnMapText: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#0088FF",
  },

  // About
  descText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    lineHeight: 22,
  },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  readMoreTxt: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#15A765",
  },

  // Categories
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    padding: 14,
    marginBottom: 12,
  },
  catSportName: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#1A181B",
    marginBottom: 4,
  },
  formatGroup: {
    marginTop: 10,
  },
  formatName: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: "#645E66",
    marginBottom: 8,
  },
  formatTable: {
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    overflow: "hidden",
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  catRowName: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#1A181B",
  },
  catRowFee: {
    fontSize: 13,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: "#1A181B",
  },

  // Amenities
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityTile: {
    width: AMENITY_TILE_WIDTH,
    height: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  amenityLabel: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: "#1A181B",
  },

  // Rules
  rulesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rulesBody: {
    marginTop: 10,
    gap: 6,
  },
  ruleLine: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    lineHeight: 20,
  },

  // Action bar
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
    gap: 10,
  },
  actionTopRow: {
    flexDirection: "row",
    gap: 10,
  },
  outlinePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF0CB",
    backgroundColor: "#F4FBF6",
    gap: 6,
  },
  outlinePillText: {
    color: "#15A765",
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    fontSize: 13,
  },
  registerBtn: {
    backgroundColor: "#15A765",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  registerBtnText: {
    color: "#FFFFFF",
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    fontSize: 15,
  },

  // Legacy modals (preserved)
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    maxHeight: "85%",
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ECEFF1",
    alignSelf: "center",
    marginTop: 15,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 15,
  },
  sheetTitle: { fontSize: 22, fontWeight: "900", color: "#263238" },
  sheetSubtitle: { fontSize: 14, color: "#90A4AE", fontWeight: "500", marginTop: 4 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F7F8",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetList: { paddingHorizontal: 25, maxHeight: 400 },
  sheetItem: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  sheetItemSel: {
    backgroundColor: "#F0FBF4",
    borderColor: "#15A765",
    borderWidth: 1.5,
  },
  sheetItemMain: { flexDirection: "row", alignItems: "center" },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CFD8DC",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleSel: { backgroundColor: "#15A765", borderColor: "#15A765" },
  sheetItemName: { fontSize: 16, fontWeight: "800", color: "#455A64" },
  textPrimary: { color: "#15A765" },
  sheetItemFee: { fontSize: 13, color: "#90A4AE", marginTop: 4, fontWeight: "600" },
  sheetFooter: { padding: 25, borderTopWidth: 1, borderTopColor: "#F5F7F8" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  totalLabel: { fontSize: 16, color: "#90A4AE", fontWeight: "700" },
  totalVal: { fontSize: 24, fontWeight: "900", color: "#263238" },
  confirmBtn: {
    backgroundColor: "#15A765",
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  disabledBtn: { backgroundColor: "#ECEFF1" },

  // Verification Modal
  verifySheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingBottom: 30,
  },
  verifyHeader: { alignItems: "center", paddingTop: 20, paddingBottom: 10 },
  verifyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0FBF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#BBF0CB",
  },
  verifyTitle: { fontSize: 22, fontWeight: "900", color: "#263238", marginBottom: 8 },
  verifySubtitle: {
    fontSize: 14,
    color: "#78909C",
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  verifyInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 60,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    gap: 12,
  },
  verifyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#263238",
    letterSpacing: 1,
  },
  verifyErrorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
    paddingHorizontal: 4,
  },
  verifyErrorText: { fontSize: 13, color: "#EF4444", fontWeight: "600", flex: 1 },
  verifyHint: {
    fontSize: 12,
    color: "#B0BEC5",
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  verifyBtn: {
    backgroundColor: "#15A765",
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },
  verifyBtnText: { color: "#FFF", fontSize: 17, fontWeight: "800" },
  verifyCancelBtn: { alignItems: "center", marginTop: 15 },
  verifyCancelText: { fontSize: 15, fontWeight: "700", color: "#90A4AE" },
});

export default TournamentDetails;
