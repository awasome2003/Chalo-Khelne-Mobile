import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import SPORT_LIBRARY from "../../api/sportLibrary";
import TOURNAMENTS from "../../api/tournaments";

const { width } = Dimensions.get("window");

const resolveImage = (item) => {
  if (!item?.image) return null;
  return assetUrl(item.image);
};

// "1250+" / "850" → numeric for summing
const parseCount = (s) => {
  if (typeof s === "number") return s;
  const n = parseInt(String(s || "").replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
};

export default function SportsLibrary() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [sports, setSports] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSports = async () => {
    try {
      const res = await axios.get(SPORT_LIBRARY.ENDPOINTS.LIST);
      setSports(res.data?.data || []);
    } catch (e) {
      console.error("Failed to fetch sports library:", e);
      setSports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Real count of upcoming tournaments (not the seeded per-sport placeholders).
  // Mirrors PlayerHomeScreen's "upcoming" filter so the count matches the
  // events the user actually sees on the home screen.
  const fetchUpcomingCount = async () => {
    try {
      const res = await axios.get(TOURNAMENTS.ENDPOINTS.BASE);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const upcoming = list.filter((t) => {
        const dateStr = t.startDate || t.selectedDate || t.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        if (Number.isNaN(d.getTime())) return true; // keep undated entries (matches home)
        return d.getTime() >= now.getTime();
      });
      setUpcomingCount(upcoming.length);
    } catch (e) {
      console.warn("Failed to fetch upcoming tournaments:", e?.message);
      setUpcomingCount(0);
    }
  };

  useEffect(() => {
    fetchSports();
    fetchUpcomingCount();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSports();
    fetchUpcomingCount();
  }, []);

  const filteredSports = useMemo(
    () =>
      sports.filter(
        (sport) =>
          sport.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sport.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sport.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [sports, searchQuery]
  );

  // Banner totals — sports count is real, upcoming events is the live tournament
  // count, active players sums the (admin-set) per-sport player figures.
  const banner = useMemo(() => {
    const sportsAvailable = sports.length;
    const activePlayers = sports.reduce(
      (sum, s) => sum + parseCount(s.playersCount),
      0
    );
    return { sportsAvailable, upcomingEvents: upcomingCount, activePlayers };
  }, [sports, upcomingCount]);

  const handleSportPress = (sport) => {
    navigation.navigate("SportDetails", { sport });
  };

  const renderSportCard = ({ item }) => {
    const imageUrl = resolveImage(item);
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => handleSportPress(item)}
      >
        <View style={styles.iconContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.sportImage} />
          ) : (
            <MaterialCommunityIcons
              name={item.iconName || "trophy-outline"}
              size={60}
              color={item.iconColor || "#15A765"}
            />
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.titleTagRow}>
              <Text style={styles.sportName}>{item.name}</Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{item.type}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#666666" />
          </View>

          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statDetail}>
              <Ionicons name="calendar-outline" size={15} color="#999999" />
              <Text style={styles.statDetailText}>
                {item.eventsCount} events
              </Text>
            </View>
            <View style={styles.statDetail}>
              <Ionicons name="people-outline" size={18} color="#999999" />
              <Text style={styles.statDetailText}>
                {item.playersCount} players
              </Text>
            </View>
          </View>

          <View style={styles.popularityContainer}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <Text style={styles.popularityLabel}>Popularity</Text>
              <Text style={styles.popularityPercent}>{item.popularity}%</Text>
            </View>
            <View style={styles.popularityBarWrapper}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${item.popularity || 0}%` },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#666666" />
          <Text style={styles.headerTitle}>Sports Library</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color="#666666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sports"
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
        <View style={styles.searchDivider} />
        <TouchableOpacity style={styles.micButton} activeOpacity={0.7}>
          <Ionicons name="mic-outline" size={22} color="#666666" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#15A765" />
        </View>
      ) : (
        <FlatList
          data={filteredSports}
          keyExtractor={(item) => item._id}
          renderItem={renderSportCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#15A765"]}
              tintColor="#15A765"
            />
          }
          ListHeaderComponent={
            <>
              {/* Quick Stats Banner */}
              <View style={styles.statsBanner}>
                <View style={styles.bannerStatCol}>
                  <Text style={styles.bannerStatVal}>
                    {banner.sportsAvailable}
                  </Text>
                  <Text style={styles.bannerStatLbl}>Sports available</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerStatCol}>
                  <Text style={styles.bannerStatVal}>
                    {banner.upcomingEvents}
                  </Text>
                  <Text style={styles.bannerStatLbl}>Upcoming events</Text>
                </View>
                <View style={styles.bannerDivider} />
                <View style={styles.bannerStatCol}>
                  <Text style={styles.bannerStatVal}>
                    {banner.activePlayers >= 1000
                      ? `${(banner.activePlayers / 1000).toFixed(1)}k`
                      : banner.activePlayers}
                  </Text>
                  <Text style={styles.bannerStatLbl}>Active players</Text>
                </View>
              </View>

              <Text style={styles.listTitle}>
                All sports (
                {filteredSports.length < 10
                  ? `0${filteredSports.length}`
                  : filteredSports.length}
                )
              </Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#999" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No sports found matching your search."
                  : "No sports available yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 53,
    borderWidth: 1,
    gap: 16,
    borderColor: "#EEEEFF",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
    padding: 0,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#666666",
  },
  listContent: {
    paddingBottom: 100,
  },
  statsBanner: {
    flexDirection: "row",
    backgroundColor: "#15A76529",
    borderRadius: 16,
    padding: 16,
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  bannerStatCol: {
    flex: 1,
    alignItems: "center",
  },
  bannerStatVal: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1A181B",
    textAlign: "center",
  },
  bannerStatLbl: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    color: "#666666",
    textAlign: "center",
  },
  bannerDivider: {
    width: 1,
    height: 60,
    backgroundColor: "#DDDDDD",
  },
  listTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 10,
    borderColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 108,
    height: 108,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sportImage: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleTagRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sportName: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    color: "#1A181B",
  },
  tagPill: {
    backgroundColor: "#F5F5F5",
    borderRadius: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },
  descriptionText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginTop: 2,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  statDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDetailText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  popularityContainer: {
    marginTop: 6,
  },
  popularityLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  popularityBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#DDDDDD",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#15A765",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  popularityPercent: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#333333",
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#888888",
    textAlign: "center",
  },
});
