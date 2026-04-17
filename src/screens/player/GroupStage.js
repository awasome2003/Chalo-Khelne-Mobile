import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Groups from "./Groups";
import tournamentConfig from "../../api/tournaments";
import axios from "axios";

const { width } = Dimensions.get("window");

const Tournament = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { tournament, tournamentId: paramId } = route.params || {};
  const tournamentId = paramId || tournament?._id || tournament?.id;

  const [topTab, setTopTab] = useState("RegisteredPlayers");
  const [subTab, setSubTab] = useState("RegisteredPlayers");
  const [players, setPlayers] = useState([]);
  const [topPlayers, setTopPlayers] = useState({});
  const [superPlayers, setSuperPlayers] = useState([]);
  const [round2Status, setRound2Status] = useState(null);
  const [directKnockoutMatches, setDirectKnockoutMatches] = useState([]);
  const [tournamentProgression, setTournamentProgression] = useState({
    currentStage: 'group_stage',
    availablePhases: ['group_stage'],
    progressionData: {}
  });

  const [loading, setLoading] = useState({
    players: true,
    topPlayers: true,
    superPlayers: true,
    round2Status: true,
    directKnockout: true,
  });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch regular players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await axios.get(
          tournamentConfig.ENDPOINTS.BOOKINGS.BY_TOURNAMENT(tournamentId)
        );
        const bookings = response.data?.bookings || [];
        const playerList = bookings.map((booking) => ({
          id: booking._id,
          name: booking.userName?.trim() || "Player Name Not Available",
          image: booking.image || "https://randomuser.me/api/portraits/lego/1.jpg",
        }));
        setPlayers(playerList);
        setLoading((prev) => ({ ...prev, players: false }));
      } catch (err) {
        console.error("Error fetching players:", err);
        setError(err.response?.data?.message || err.message || "Failed to load players");
        setLoading((prev) => ({ ...prev, players: false }));
      }
    };

    if (tournamentId) fetchPlayers();
  }, [tournamentId]);

  // Enhanced Tournament Progression API calls
  const fetchTournamentProgression = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.PROGRESSION.ROUND2_STATUS(tournamentId)
      );
      if (response.data?.success) {
        setRound2Status(response.data.data);
        setTournamentProgression(prev => ({
          ...prev,
          currentStage: response.data.data?.currentStage || 'group_stage',
          roundTwoMode: response.data.data?.roundTwoMode || 'round2-plus-knockout',
          availablePhases: response.data.data?.availablePhases || ['group_stage'],
          progressionData: response.data.data || {}
        }));
      }
      setLoading(prev => ({ ...prev, round2Status: false }));
    } catch (err) {
      setLoading(prev => ({ ...prev, round2Status: false }));
    }
  };

  const fetchSuperPlayers = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.PROGRESSION.SUPER_PLAYERS(tournamentId)
      );
      if (response.data?.success) setSuperPlayers(response.data.data || []);
      setLoading(prev => ({ ...prev, superPlayers: false }));
    } catch (err) {
      setLoading(prev => ({ ...prev, superPlayers: false }));
    }
  };

  const fetchDirectKnockoutMatches = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.PROGRESSION.DIRECT_KNOCKOUT_MATCHES(tournamentId)
      );
      if (response.data?.success) setDirectKnockoutMatches(response.data.matches || []);
      setLoading(prev => ({ ...prev, directKnockout: false }));
    } catch (err) {
      setLoading(prev => ({ ...prev, directKnockout: false }));
    }
  };

  useEffect(() => {
    if (subTab !== "TopPlayers") return;
    const fetchTopPlayers = async () => {
      try {
        const topPlayersData = {};
        const response = await axios.get(`${tournamentConfig.ENDPOINTS.TOP_PLAYERS.BY_TOURNAMENT(tournamentId)}?mobile=true`);
        if (response.data?.success && Array.isArray(response.data.data)) {
          response.data.data.forEach((groupData) => {
            const groupKey = groupData.groupName.replace(/Group|Top Players Group/g, "").trim();
            if (groupData.topPlayers && Array.isArray(groupData.topPlayers)) {
              topPlayersData[groupKey] = groupData.topPlayers.map((player) => ({
                id: player._id || player.playerId,
                name: player.playerName || player.userName || `Player ${player._id}`,
                image: player.imageUrl || "https://randomuser.me/api/portraits/lego/1.jpg",
                rank: player.rank || 0,
                points: player.points || 0,
              }));
            }
          });
        }
        setTopPlayers(topPlayersData);
        setLoading((prev) => ({ ...prev, topPlayers: false }));
      } catch (err) {
        setLoading((prev) => ({ ...prev, topPlayers: false }));
      }
    };
    fetchTopPlayers();
  }, [subTab, tournamentId]);

  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      if (tournamentId) {
        await Promise.all([fetchTournamentProgression(), fetchSuperPlayers(), fetchDirectKnockoutMatches()]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (tournamentId) {
      fetchTournamentProgression();
      fetchSuperPlayers();
      fetchDirectKnockoutMatches();
    }
  }, [tournamentId]);

  const renderPlayerItem = (player, index) => (
    <View key={player.id || index} style={styles.modernPlayerCard}>
      <Image source={{ uri: player.image }} style={styles.modernAvatar} />
      <View style={styles.playerInfo}>
        <Text style={styles.modernPlayerName} numberOfLines={1}>{player.name}</Text>
        {player.rank ? <Text style={styles.rankLabel}>Rank #{player.rank}</Text> : null}
      </View>
      <TouchableOpacity style={styles.profileBtn}>
        <Ionicons name="chevron-forward" size={16} color="#ADB5BD" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = (message) => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#DEE2E6" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  const subTabsData = useMemo(() => [
    { key: "RegisteredPlayers", label: "Players", icon: "people", count: players.length },
    { key: "TopPlayers", label: "Top Rank", icon: "emoji-events", count: Object.values(topPlayers).flat().length },
    { key: "SuperPlayers", label: "Super 16", icon: "flash-on", count: superPlayers.length },
    { key: "Round2Status", label: "Round 2", icon: "trending-up", count: round2Status?.eligibleTeams?.length || 0 },
    { key: "DirectKnockout", label: "Brackets", icon: "grid-view", count: directKnockoutMatches.length },
  ], [players.length, topPlayers, superPlayers.length, round2Status, directKnockoutMatches.length]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Premium Header */}
      <LinearGradient colors={["#004E93", "#002147"]} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tournament Hub</Text>
          <TouchableOpacity onPress={refreshAllData} style={styles.headerBtn}>
            <Ionicons name="refresh" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Master Selector */}
        <View style={styles.masterSelector}>
          <TouchableOpacity
            style={[styles.selectorBtn, topTab === "RegisteredPlayers" && styles.selectorActive]}
            onPress={() => setTopTab("RegisteredPlayers")}
          >
            <Text style={[styles.selectorText, topTab === "RegisteredPlayers" && styles.selectorTextActive]}>Standings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.selectorBtn, topTab === "Groups" && styles.selectorActive]}
            onPress={() => setTopTab("Groups")}
          >
            <Text style={[styles.selectorText, topTab === "Groups" && styles.selectorTextActive]}>Groups</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {topTab === "RegisteredPlayers" ? (
        <View style={{ flex: 1 }}>
          <View style={styles.subTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
              {subTabsData.map((tab) => {
                const isActive = subTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.subTabPill, isActive && styles.activeSubTabPill]}
                    onPress={() => setSubTab(tab.key)}
                  >
                    <MaterialIcons name={tab.icon} size={18} color={isActive ? "#FFF" : "#6C757D"} />
                    <Text style={[styles.subTabLabel, isActive && styles.activeSubTabLabel]}>{tab.label}</Text>
                    <View style={[styles.countBadge, isActive && styles.activeCountBadge]}>
                      <Text style={[styles.countBadgeText, isActive && styles.activeCountBadgeText]}>{tab.count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAllData} tintColor="#FF6A00" />}
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Registered Players */}
            {subTab === "RegisteredPlayers" && (
              <View style={styles.cardContainer}>
                <Text style={styles.sectionTitle}>Tournament Roster</Text>
                {loading.players ? (
                  <ActivityIndicator color="#FF6A00" style={{ marginTop: 20 }} />
                ) : players.length > 0 ? (
                  <View style={styles.playerGrid}>
                    {players.map(renderPlayerItem)}
                  </View>
                ) : renderEmptyState("No registrations found")}
              </View>
            )}

            {/* Top Players */}
            {subTab === "TopPlayers" && (
              <View style={styles.cardContainer}>
                <Text style={styles.sectionTitle}>Elite Performers</Text>
                {loading.topPlayers ? (
                  <ActivityIndicator color="#FF6A00" style={{ marginTop: 20 }} />
                ) : Object.keys(topPlayers).length > 0 ? (
                  Object.entries(topPlayers).map(([groupName, players]) => (
                    <View key={groupName} style={styles.groupSection}>
                      <LinearGradient colors={["#FF6A00", "#FF4B00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.groupHeader}>
                        <Text style={styles.groupHeaderText}>Group {groupName}</Text>
                      </LinearGradient>
                      <View style={styles.playerList}>
                        {players.map(renderPlayerItem)}
                      </View>
                    </View>
                  ))
                ) : renderEmptyState("Rankings not available")}
              </View>
            )}

            {/* Super Players */}
            {subTab === "SuperPlayers" && (
              <View style={styles.cardContainer}>
                <Text style={styles.sectionTitle}>Super 16 Qualifiers</Text>
                {loading.superPlayers ? (
                  <ActivityIndicator color="#FF6A00" style={{ marginTop: 20 }} />
                ) : superPlayers.length > 0 ? (
                  superPlayers.map((playerGroup, idx) => (
                    <View key={idx} style={styles.groupSection}>
                      <View style={styles.superGroupHeader}>
                        <FontAwesome5 name="bolt" size={14} color="#FF6A00" />
                        <Text style={styles.superGroupTitle}>{playerGroup.groupName || `Pool ${String.fromCharCode(65 + idx)}`}</Text>
                      </View>
                      <View style={styles.playerList}>
                        {playerGroup.players?.map(renderPlayerItem)}
                      </View>
                    </View>
                  ))
                ) : renderEmptyState("Qualifiers pending...")}
              </View>
            )}

            {/* Round 2 Status */}
            {subTab === "Round2Status" && (
              <View style={styles.cardContainer}>
                <Text style={styles.sectionTitle}>Advancement Status</Text>
                {loading.round2Status ? (
                  <ActivityIndicator color="#FF6A00" style={{ marginTop: 20 }} />
                ) : round2Status ? (
                  <View>
                    <View style={styles.progressionCard}>
                      <View style={styles.progressionIcon}>
                        <MaterialCommunityIcons name="tournament" size={28} color="#FFF" />
                      </View>
                      <View style={styles.progressionInfo}>
                        <Text style={styles.progressionLabel}>Current Stage</Text>
                        <Text style={styles.progressionValue}>
                          {tournamentProgression.currentStage?.replace('_', ' ').toUpperCase() || 'GROUP STAGE'}
                        </Text>
                      </View>
                    </View>

                    {round2Status.eligibleTeams && (
                      <View style={styles.detailsBox}>
                        <Text style={styles.boxTitle}>Teams Advancing to Next Round</Text>
                        {round2Status.eligibleTeams.map((team, i) => (
                          <View key={i} style={styles.teamEntry}>
                            <View style={styles.teamLeading}>
                              <Text style={styles.rankNum}>#{team.rank}</Text>
                              <Text style={styles.teamText}>{team.teamName}</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ) : renderEmptyState("Phase details not yet released")}
              </View>
            )}

            {/* Brackets (Direct Knockout) */}
            {subTab === "DirectKnockout" && (
              <View style={styles.cardContainer}>
                <Text style={styles.sectionTitle}>Playoff Brackets</Text>
                {loading.directKnockout ? (
                  <ActivityIndicator color="#FF6A00" style={{ marginTop: 20 }} />
                ) : directKnockoutMatches.length > 0 ? (
                  directKnockoutMatches.map((match, i) => (
                    <View key={match._id || i} style={styles.modernMatchCard}>
                      <View style={styles.matchMeta}>
                        <Text style={styles.roundTag}>{match.round?.replace('-', ' ').toUpperCase()}</Text>
                        <View style={[styles.matchStatusBadge, { backgroundColor: match.status === 'completed' ? '#E8F5E9' : '#FFF3E0' }]}>
                          <Text style={[styles.statusBadgeText, { color: match.status === 'completed' ? '#2E7D32' : '#EF6C00' }]}>
                            {match.status?.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.matchMain}>
                        <View style={styles.playerSlot}>
                          <Text style={styles.matchPlayerName} numberOfLines={1}>{match.player1?.playerName || 'TBD'}</Text>
                          {match.result?.winner?.playerId === match.player1?.playerId && (
                            <View style={styles.winBar} />
                          )}
                        </View>
                        <View style={styles.vsCircle}>
                          <Text style={styles.vsText}>VS</Text>
                        </View>
                        <View style={styles.playerSlot}>
                          <Text style={[styles.matchPlayerName, { textAlign: 'right' }]} numberOfLines={1}>{match.player2?.playerName || 'TBD'}</Text>
                          {match.result?.winner?.playerId === match.player2?.playerId && (
                            <View style={[styles.winBar, { alignSelf: 'flex-end' }]} />
                          )}
                        </View>
                      </View>

                      {match.status === "COMPLETED" && (() => {
                        const r = require('../../utils/matchResultUtils').readMatchResult(match);
                        return r ? (
                          <View style={styles.scoreBoard}>
                            <Text style={styles.scoreDigit}>{r.player1Score}</Text>
                            <Text style={styles.scoreSeparator}>:</Text>
                            <Text style={styles.scoreDigit}>{r.player2Score}</Text>
                          </View>
                        ) : null;
                      })()}
                    </View>
                  ))
                ) : renderEmptyState("Brackets are being finalized")}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      ) : (
        <Groups tournamentId={tournamentId} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },

  masterSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 4 },
  selectorBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 13 },
  selectorActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  selectorText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13 },
  selectorTextActive: { color: '#004E93' },

  subTabsContainer: { paddingVertical: 12 },
  subTabsScroll: { paddingHorizontal: 20 },
  subTabPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, marginRight: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#F1F3F5' },
  activeSubTabPill: { backgroundColor: '#FF6A00', borderColor: '#FF6A00' },
  subTabLabel: { fontSize: 13, fontWeight: '700', color: '#495057', marginHorizontal: 8 },
  activeSubTabLabel: { color: '#FFF' },
  countBadge: { backgroundColor: '#F8F9FA', paddingHorizontal: 6, py: 2, borderRadius: 10, minWidth: 24, alignItems: 'center' },
  activeCountBadge: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countBadgeText: { fontSize: 10, fontWeight: '900', color: '#ADB5BD' },
  activeCountBadgeText: { color: '#FFF' },

  content: { flex: 1, paddingHorizontal: 20 },
  cardContainer: { marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#212529', marginBottom: 15, letterSpacing: -0.5 },

  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  modernPlayerCard: { width: (width - 54) / 2, backgroundColor: '#FFF', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F3F5' },
  modernAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10, backgroundColor: '#E9ECEF' },
  playerInfo: { flex: 1 },
  modernPlayerName: { fontSize: 12, fontWeight: '700', color: '#343A40' },
  rankLabel: { fontSize: 10, color: '#FF6A00', fontWeight: '800', marginTop: 2 },
  profileBtn: { padding: 4 },

  groupSection: { marginBottom: 25 },
  groupHeader: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, marginBottom: 15 },
  groupHeaderText: { color: '#FFF', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  playerList: { gap: 12 },

  superGroupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#FFF', padding: 10, borderRadius: 10, alignSelf: 'flex-start', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
  superGroupTitle: { fontSize: 14, fontWeight: '800', color: '#343A40', marginLeft: 8 },

  progressionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#004E93', padding: 22, borderRadius: 24, marginBottom: 20, shadowColor: '#004E93', shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  progressionIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  progressionInfo: { flex: 1 },
  progressionLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '700', textTransform: 'uppercase' },
  progressionValue: { fontSize: 22, fontWeight: '900', color: '#FFF', marginTop: 2 },

  detailsBox: { backgroundColor: '#FFF', borderRadius: 24, padding: 22, elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15 },
  boxTitle: { fontSize: 15, fontWeight: '800', color: '#495057', marginBottom: 18 },
  teamEntry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  teamLeading: { flexDirection: 'row', alignItems: 'center' },
  rankNum: { fontSize: 13, fontWeight: '900', color: '#CED4DA', width: 30 },
  teamText: { fontSize: 15, fontWeight: '700', color: '#212529' },

  modernMatchCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 18, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: '#F1F3F5' },
  matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  roundTag: { fontSize: 10, fontWeight: '900', color: '#FF6A00', backgroundColor: '#FFF0E6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  matchStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 9, fontWeight: '900' },
  matchMain: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  playerSlot: { flex: 1 },
  matchPlayerName: { fontSize: 15, fontWeight: '800', color: '#212529' },
  vsCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', marginHorizontal: 15, borderWidth: 1, borderColor: '#E9ECEF' },
  vsText: { fontSize: 11, fontWeight: '900', color: '#ADB5BD' },
  winBar: { width: 45, height: 4, backgroundColor: '#2E7D32', borderRadius: 2, marginTop: 6 },
  scoreBoard: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: '#F8F9FA' },
  scoreDigit: { fontSize: 28, fontWeight: '900', color: '#004E93' },
  scoreSeparator: { fontSize: 24, fontWeight: '900', color: '#DEE2E6', marginHorizontal: 12 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 18, color: '#ADB5BD', fontWeight: '700', fontSize: 15 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFEBEE', padding: 12, borderRadius: 10, marginBottom: 15 },
  errorText: { color: '#D32F2F', fontSize: 13, fontWeight: '600', marginLeft: 10 }
});

export default Tournament;
