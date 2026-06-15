import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import NEWS from "../../api/news";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

const SPORT_FILTERS = [
  { key: "Table Tennis", icon: "tennisball-outline" },
  { key: "Tennis", icon: "tennisball-outline" },
  { key: "Volleyball", icon: "football-outline" },
  { key: "Badminton", icon: "tennisball-outline" },
];

const { width } = Dimensions.get("window");

const timeAgo = (dateStr) => {
  if (!dateStr) return "";
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}hr ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const thumbUrl = (item) => {
  if (!item?.thumbnail) return null;
  return assetUrl(item.thumbnail);
};

const NewsListScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSport, setActiveSport] = useState(null);
  const [search, setSearch] = useState("");

  const fetchNews = async () => {
    try {
      const url = activeSport
        ? NEWS.ENDPOINTS.BY_SPORT(activeSport)
        : NEWS.ENDPOINTS.ACTIVE;
      const res = await axios.get(url);
      setNews(res.data?.data || []);
    } catch (e) {
      console.error("Failed to fetch news:", e);
      setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [activeSport]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNews();
  }, [activeSport]);

  const filtered = useMemo(() => {
    if (!search.trim()) return news;
    const q = search.toLowerCase();
    return news.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.body?.toLowerCase().includes(q) ||
        n.sports?.some((s) => s.toLowerCase().includes(q))
    );
  }, [news, search]);

  const trending = useMemo(
    () => [...filtered].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5),
    [filtered]
  );

  // "Highlight" — everything that's not in the trending set
  const trendingIds = new Set(trending.map((t) => t._id));
  const highlights = filtered.filter((n) => !trendingIds.has(n._id));

  const openDetail = (newsId) =>
    navigation.navigate("NewsDetail", { newsId });

  // ─── Render helpers ────────────────────────────────────────────────
  const TrendingCard = ({ item }) => {
    const img = thumbUrl(item);
    return (
      <TouchableOpacity
        style={styles.trendCard}
        activeOpacity={0.85}
        onPress={() => openDetail(item._id)}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.trendImage} />
        ) : (
          <View style={[styles.trendImage, styles.imagePlaceholder]}>
            <Ionicons name="newspaper-outline" size={32} color="#D1D5DB" />
          </View>
        )}
        <View style={styles.trendBadge}>
          <Text style={styles.trendBadgeText}>Trending</Text>
        </View>
        <Text style={styles.trendTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trendMeta}>
          <Text style={styles.trendSport} numberOfLines={1}>
            {item.sports?.[0] || item.type || "News"}
          </Text>
          <Text style={styles.trendTime}>{timeAgo(item.publishDate || item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const HighlightRow = ({ item }) => {
    const img = thumbUrl(item);
    const summary = (item.body || "").slice(0, 90).trim();
    return (
      <TouchableOpacity
        style={styles.highlightCard}
        activeOpacity={0.85}
        onPress={() => openDetail(item._id)}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.highlightImage} />
        ) : (
          <View style={[styles.highlightImage, styles.imagePlaceholder]}>
            <Ionicons name="newspaper-outline" size={22} color="#D1D5DB" />
          </View>
        )}
        <View style={styles.highlightBody}>
          <Text style={styles.highlightTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.highlightSummary} numberOfLines={2}>
            {summary || "Read more"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search sports,"
            placeholderTextColor={TEXT_MUTED}
          />
          <View style={styles.searchDivider} />
          <Ionicons name="mic-outline" size={18} color={TEXT_MUTED} />
        </View>

        {/* Sport chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {SPORT_FILTERS.map((s) => {
            const active = activeSport === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveSport(active ? null : s.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={s.icon}
                  size={16}
                  color={active ? "#FFFFFF" : GREEN_DARK}
                />
                {active ? (
                  <Text style={styles.chipText}>{s.key}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        ) : (
          <>
            {/* Trending */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending News</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.sectionLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {trending.length > 0 ? (
              <FlatList
                horizontal
                data={trending}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => <TrendingCard item={item} />}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              />
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No trending news right now</Text>
              </View>
            )}

            {/* Highlight */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Highlight</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.sectionLink}>See All</Text>
              </TouchableOpacity>
            </View>
            {highlights.length > 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                {highlights.map((n) => (
                  <HighlightRow key={n._id} item={n} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  {activeSport
                    ? `No more ${activeSport} stories`
                    : "No news yet"}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const TREND_W = width * 0.62;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { padding: 40, alignItems: "center", justifyContent: "center" },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_DARK,
    padding: 0,
  },
  searchDivider: { width: 1, height: 18, backgroundColor: "#E5E7EB" },

  // Sport chips
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    minWidth: 40,
    height: 40,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
    paddingHorizontal: 16,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Section heading
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
  },
  sectionLink: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_MUTED,
  },

  // Trending card
  trendCard: {
    width: TREND_W,
  },
  trendImage: {
    width: TREND_W,
    height: 140,
    borderRadius: 14,
    backgroundColor: FIELD_BG,
  },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },
  trendBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendBadgeText: {
    fontSize: 11,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  trendTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 8,
  },
  trendMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  trendSport: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  trendTime: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },

  // Highlight
  highlightCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
    marginBottom: 10,
  },
  highlightImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
  },
  highlightBody: { flex: 1, justifyContent: "center" },
  highlightTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  highlightSummary: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 17,
  },

  emptyRow: { paddingVertical: 30, alignItems: "center" },
  emptyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
});

export default NewsListScreen;
