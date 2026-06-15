import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import axios from "axios";
import API from "../../api/api";
import NEWS from "../../api/news";

const GREEN = "#15A765";
const GREEN_DARK = "#0F8A55";
const TEXT_DARK = "#1A181B";
const TEXT_MUTED = "#6B7280";
const BORDER = "#EEF1FA";
const FIELD_BG = "#F4F4F5";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

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
  return item.thumbnail.startsWith("http")
    ? item.thumbnail
    : `${API.SERVER_URL}/${item.thumbnail}`;
};

const NewsDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { newsId } = route.params || {};

  const [news, setNews] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!newsId) return;
    (async () => {
      try {
        const res = await axios.get(NEWS.ENDPOINTS.BY_ID(newsId));
        const item = res.data?.data || null;
        setNews(item);

        // Fetch related news by first sport tag
        if (item?.sports?.[0]) {
          try {
            const r = await axios.get(NEWS.ENDPOINTS.BY_SPORT(item.sports[0]));
            const items = (r.data?.data || []).filter((n) => n._id !== item._id);
            setRelated(items.slice(0, 3));
          } catch (e) {
            console.warn("Related news fetch failed:", e?.message);
          }
        }
      } catch (e) {
        console.error("Failed to fetch news:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [newsId]);

  const handleShare = async () => {
    if (!news) return;
    try {
      await Share.share({
        message: `${news.title}\n\n${(news.body || "").slice(0, 200)}…`,
      });
    } catch {}
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!news) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Article not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const img = thumbUrl(news);
  const sportLabel = news.sports?.[0] || news.type || "News";
  // Derive subtitle from first non-empty line of body (max ~140 chars)
  const bodyLines = (news.body || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const subtitle = bodyLines[0]?.slice(0, 140) || "";
  // Remaining body — drop the first line we used as subtitle
  const remainingBody = bodyLines.slice(1).join("\n\n") || news.body;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News</Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.iconBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="share-social-outline" size={20} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Category pill */}
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>{sportLabel}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{news.title}</Text>

        {/* Subtitle */}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Text style={styles.metaPoster}>
            Posted by : <Text style={{ fontWeight: "700" }}>
              {news.createdByName || "Team"}
            </Text>
          </Text>
          <View style={styles.metaDate}>
            <Ionicons name="calendar-outline" size={14} color={TEXT_MUTED} />
            <Text style={styles.metaDateText}>
              {formatDate(news.publishDate || news.createdAt)}
            </Text>
          </View>
        </View>

        {/* Hero image */}
        {img ? (
          <Image source={{ uri: img }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.imagePlaceholder]}>
            <Ionicons name="newspaper-outline" size={48} color="#D1D5DB" />
          </View>
        )}

        {/* Views */}
        <View style={styles.viewsRow}>
          <Ionicons name="eye-outline" size={14} color={TEXT_MUTED} />
          <Text style={styles.viewsText}>
            {(news.viewCount || 0).toLocaleString()} views
          </Text>
        </View>

        {/* Body */}
        <Text style={styles.body}>{remainingBody}</Text>

        {/* Tags */}
        {news.sports?.length > 0 && (
          <>
            <Text style={styles.tagsHeader}>Tags</Text>
            <View style={styles.tagsRow}>
              {news.sports.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Related */}
        {related.length > 0 && (
          <>
            <View style={styles.relatedDivider} />
            <Text style={styles.relatedHeader}>Related News</Text>
            {related.map((r) => (
              <TouchableOpacity
                key={r._id}
                style={styles.relatedCard}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.push("NewsDetail", { newsId: r._id })
                }
              >
                <View style={styles.relatedBody}>
                  <View style={styles.relatedCategoryPill}>
                    <Text style={styles.relatedCategoryText}>
                      {r.sports?.[0] || r.type || "News"}
                    </Text>
                  </View>
                  <Text style={styles.relatedTitle} numberOfLines={2}>
                    {r.title}
                  </Text>
                  <Text style={styles.relatedTime}>
                    {timeAgo(r.publishDate || r.createdAt)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 14, color: TEXT_MUTED },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: { width: 28, height: 28, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_DARK,
  },

  // Article
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F7F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryPillText: {
    fontSize: 11,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "700",
    color: GREEN_DARK,
  },
  title: {
    fontSize: 22,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 10,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 8,
    lineHeight: 19,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 14,
  },
  metaPoster: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },
  metaDate: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaDateText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },

  heroImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
  },
  imagePlaceholder: { justifyContent: "center", alignItems: "center" },

  viewsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  viewsText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
  },

  body: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#374151",
    lineHeight: 21,
    marginTop: 14,
  },

  // Tags
  tagsHeader: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
    marginTop: 20,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: FIELD_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "500",
    color: TEXT_DARK,
  },

  // Related
  relatedDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginTop: 20,
  },
  relatedHeader: {
    fontSize: 16,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "800",
    color: TEXT_DARK,
    marginTop: 14,
    marginBottom: 10,
  },
  relatedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 10,
  },
  relatedBody: { flex: 1 },
  relatedCategoryPill: {
    alignSelf: "flex-start",
    backgroundColor: FIELD_BG,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  relatedCategoryText: {
    fontSize: 10,
    fontFamily: "Montserrat_500Medium",
    fontWeight: "600",
    color: TEXT_MUTED,
  },
  relatedTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    fontWeight: "700",
    color: TEXT_DARK,
  },
  relatedTime: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: TEXT_MUTED,
    marginTop: 4,
  },
});

export default NewsDetailScreen;
