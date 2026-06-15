import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import API from "../../api/api";
import { assetUrl } from "../../utils/assetUrl";
import SPORT_LIBRARY from "../../api/sportLibrary";

const { width } = Dimensions.get("window");

const BULLET = "•";
const CROSS = "✕";

const resolveImage = (item) => {
  if (!item?.image) return null;
  return assetUrl(item.image);
};

export default function SportDetails() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("Rules");

  const passed = route.params?.sport || {};
  const [sport, setSport] = useState(passed);
  const [loading, setLoading] = useState(
    // Need a fetch only if the content sections weren't passed in
    !(passed.aboutSections || passed.rules)
  );

  useEffect(() => {
    const needsFetch = !(passed.aboutSections || passed.rules);
    const idOrSlug = passed._id || passed.slug;
    if (!needsFetch || !idOrSlug) return;
    (async () => {
      try {
        const res = await axios.get(SPORT_LIBRARY.ENDPOINTS.BY_ID(idOrSlug));
        if (res.data?.success) setSport(res.data.data);
      } catch (e) {
        console.error("Failed to fetch sport detail:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [passed._id, passed.slug]);

  const sportName = sport.name || "Sport";
  const imageUrl = resolveImage(sport);

  const handleJoinEvents = () => {
    navigation.navigate("Events", {
      screen: "EventScreen",
      params: { selectedSport: sportName },
    });
  };
  const handleBookTurf = () => navigation.navigate("Turf", { screen: "Play" });

  const renderTabContent = () => {
    switch (activeTab) {
      case "About":
        return (sport.aboutSections || []).map((section, idx) => (
          <View key={idx} style={styles.ruleCard}>
            <Text style={styles.ruleCardTitle}>{section.title}</Text>
            {section.text ? (
              <Text style={styles.sectionBodyText}>{section.text}</Text>
            ) : null}
            {(section.points || []).map((pt, pIdx) => (
              <View key={pIdx} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>{BULLET}</Text>
                <Text style={styles.bulletText}>{pt}</Text>
              </View>
            ))}
          </View>
        ));
      case "Court Info":
        return (sport.courtSections || []).map((section, idx) => (
          <View key={idx} style={styles.ruleCard}>
            <Text style={styles.ruleCardTitle}>{section.title}</Text>
            {section.highlightBlock && section.highlightBlock.length > 0 && (
              <View style={styles.highlightBlock}>
                {section.highlightBlock.map((line, lIdx) => (
                  <Text key={lIdx} style={styles.highlightBlockText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
            {section.text ? (
              <Text style={styles.sectionBodyText}>{section.text}</Text>
            ) : null}
            {(section.points || []).map((pt, pIdx) => (
              <View key={pIdx} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>{BULLET}</Text>
                <Text style={styles.bulletText}>{pt}</Text>
              </View>
            ))}
          </View>
        ));
      case "Beginner Tips":
        return (sport.tipsSections || []).map((section, idx) => (
          <View key={idx} style={styles.ruleCard}>
            <Text style={styles.ruleCardTitle}>{section.title}</Text>
            {(section.points || []).map((pt, pIdx) => {
              if (section.type === "numbered") {
                return (
                  <View key={pIdx} style={styles.bulletRow}>
                    <Text style={styles.numberPrefix}>{pIdx + 1}.</Text>
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                );
              } else if (section.type === "cross") {
                return (
                  <View key={pIdx} style={styles.bulletRow}>
                    <Text style={styles.crossPrefix}>{CROSS}</Text>
                    <Text style={styles.bulletText}>{pt}</Text>
                  </View>
                );
              }
              return (
                <View key={pIdx} style={styles.bulletRow}>
                  <Text style={styles.bulletPoint}>{BULLET}</Text>
                  <Text style={styles.bulletText}>{pt}</Text>
                </View>
              );
            })}
          </View>
        ));
      case "Rules":
      default:
        return (sport.rules || []).map((rule, idx) => (
          <View key={idx} style={styles.ruleCard}>
            <Text style={styles.ruleCardTitle}>{rule.title}</Text>
            {(rule.points || []).map((pt, pIdx) => (
              <View key={pIdx} style={styles.bulletRow}>
                <Text style={styles.bulletPoint}>{BULLET}</Text>
                <Text style={styles.bulletText}>{pt}</Text>
              </View>
            ))}
          </View>
        ));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#15A765" />
        </View>
      </View>
    );
  }

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Sport Card */}
        <View style={styles.sportInfoCard}>
          <View style={styles.sportInfoHead}>
            <View style={styles.iconContainer}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.sportImage} />
              ) : (
                <MaterialCommunityIcons
                  name={sport.iconName || "trophy-outline"}
                  size={48}
                  color={sport.iconColor || "#1A181B"}
                />
              )}
            </View>
            <View style={styles.sportTitleCol}>
              <Text style={styles.sportName}>{sportName}</Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{sport.type || "Outdoor"}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.sportDescText}>{sport.description}</Text>
        </View>

        {/* 2x2 Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statBoxHead}>
              <View style={styles.statIconBg}>
                <Ionicons name="calendar-outline" size={20} color="#15A765" />
              </View>
              <Text style={styles.statBoxVal}>{sport.eventsCount || 0}</Text>
            </View>
            <Text style={styles.statBoxLbl}>Upcoming Events</Text>
            <TouchableOpacity onPress={handleJoinEvents} style={styles.statActionBtn}>
              <Text style={styles.statActionTxt}>Find & join</Text>
              <Ionicons name="chevron-forward" size={12} color="#15A765" />
            </TouchableOpacity>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statBoxHead}>
              <View style={styles.statIconBg}>
                <Ionicons name="people-outline" size={20} color="#15A765" />
              </View>
              <Text style={styles.statBoxVal}>{sport.coaches || 0}</Text>
            </View>
            <Text style={styles.statBoxLbl}>Coaches Available</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.statActionBtn}>
              <Text style={styles.statActionTxt}>Book session</Text>
              <Ionicons name="chevron-forward" size={12} color="#15A765" />
            </TouchableOpacity>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statBoxHead}>
              <View style={styles.statIconBg}>
                <Ionicons name="location-outline" size={20} color="#15A765" />
              </View>
              <Text style={styles.statBoxVal}>{sport.turfs || 0}</Text>
            </View>
            <Text style={styles.statBoxLbl}>Turfs Available</Text>
            <TouchableOpacity onPress={handleBookTurf} style={styles.statActionBtn}>
              <Text style={styles.statActionTxt}>Book Turf</Text>
              <Ionicons name="chevron-forward" size={12} color="#15A765" />
            </TouchableOpacity>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statBoxHead}>
              <View style={styles.statIconBg}>
                <Ionicons name="trending-up-outline" size={20} color="#15A765" />
              </View>
              <Text style={styles.statBoxVal}>{sport.performance || "0%"}</Text>
            </View>
            <Text style={styles.statBoxLbl}>My Performance</Text>
            <TouchableOpacity activeOpacity={0.7} style={styles.statActionBtn}>
              <Text style={styles.statActionTxt}>View stats</Text>
              <Ionicons name="chevron-forward" size={14} color="#666666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selection Bar */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            {["About", "Rules", "Court Info", "Beginner Tips"].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabButton, isActive && styles.activeTabButton]}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      isActive && styles.activeTabButtonText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content Area */}
        <View style={styles.tabContentArea}>{renderTabContent()}</View>

        {/* Ready to Play Button Card */}
        <TouchableOpacity activeOpacity={0.9} onPress={handleJoinEvents}>
          <LinearGradient
            colors={["#15A765", "#018348"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.readyPlayCard}
          >
            <View style={styles.readyPlayTextCol}>
              <Text style={styles.readyPlayTitle}>Ready to Play?</Text>
              <Text style={styles.readyPlaySub}>
                Join upcoming {sportName} events
              </Text>
            </View>
            <View style={styles.arrowCircle}>
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 8,
  },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#1A181B",
  },
  scrollContent: { paddingBottom: 40 },
  sportInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  sportInfoHead: { flexDirection: "row", alignItems: "center" },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sportImage: { width: "100%", height: "100%", resizeMode: "contain" },
  sportTitleCol: { marginLeft: 10, justifyContent: "center" },
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
    alignSelf: "flex-start",
    marginTop: 4,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
  },
  sportDescText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#645E66",
    marginTop: 10,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statBox: {
    width: (width - 44) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statBoxHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#15A7651A",
    justifyContent: "center",
    alignItems: "center",
  },
  statBoxVal: {
    fontSize: 20,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
  },
  statBoxLbl: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#333333",
    marginBottom: 8,
  },
  statActionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  statActionTxt: {
    fontSize: 14,
    fontFamily: "Montserrat_400Regular",
    color: "#666666",
    textDecorationLine: "underline",
  },
  tabsContainer: { marginBottom: 24 },
  tabsScrollContent: { gap: 0 },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#DDDDDD",
  },
  activeTabButton: { borderBottomWidth: 2, borderBottomColor: "#15A765" },
  tabButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_400Regular",
    color: "#666666",
  },
  activeTabButtonText: {
    fontSize: 16,
    fontFamily: "Montserrat_500Medium",
    color: "#15A765",
  },
  tabContentArea: { marginBottom: 24 },
  ruleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F5F5F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  ruleCardTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 8,
  },
  bulletPoint: { fontSize: 14, color: "#666666", marginTop: -2 },
  bulletText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 18,
  },
  numberPrefix: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
  },
  crossPrefix: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#EB5757",
  },
  highlightBlock: {
    backgroundColor: "#F6F5FF",
    borderRadius: 8,
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  highlightBlockText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 18,
    textAlign: "center",
  },
  sectionBodyText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666666",
    lineHeight: 18,
  },
  readyPlayCard: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  readyPlayTextCol: { flex: 1 },
  readyPlayTitle: {
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
    color: "#FFFFFF",
  },
  readyPlaySub: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#FFFFFF",
    marginTop: 4,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    padding: 4,
    borderRadius: 50,
    backgroundColor: "#FFFFFF33",
    justifyContent: "center",
    alignItems: "center",
  },
});
