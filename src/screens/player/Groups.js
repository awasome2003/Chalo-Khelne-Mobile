import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import tournamentConfig from "../../api/tournaments";
import axios from "axios";

const { width } = Dimensions.get("window");

const Groups = ({ tournamentId }) => {
  const navigation = useNavigation();

  const [groupSubTab, setGroupSubTab] = useState("League");
  const [selectedLeagueGroup, setSelectedLeagueGroup] = useState(null);
  const [selectedKnockoutStage, setSelectedKnockoutStage] = useState("Quarterfinal");
  const [showPointsTable, setShowPointsTable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupsData, setGroupsData] = useState([]);
  const [playersData, setPlayersData] = useState({});
  const [matchesData, setMatchesData] = useState({});
  const [topPlayersData, setTopPlayersData] = useState({});

  const [tournamentProgression, setTournamentProgression] = useState(null);
  const [superPlayers, setSuperPlayers] = useState([]);
  const [round2Groups, setRound2Groups] = useState([]);
  const [directKnockoutMatches, setDirectKnockoutMatches] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTopPlayers = async (groupId) => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.TOP_PLAYERS.BY_GROUP(tournamentId, groupId)
      );
      if (response.data.success && response.data.data) {
        return response.data.data.players || response.data.data.topPlayers || [];
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const fetchTournamentProgression = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.PROGRESSION.ROUND2_STATUS(tournamentId)
      );
      if (response.data.success) setTournamentProgression(response.data.status);
    } catch (err) { }
  };

  const fetchSuperPlayers = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.PROGRESSION.SUPER_PLAYERS(tournamentId)
      );
      if (response.data.success) setSuperPlayers(response.data.data || response.data.superPlayers || []);
    } catch (err) {
      setSuperPlayers([]);
    }
  };

  const fetchDirectKnockoutMatches = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.PROGRESSION.DIRECT_KNOCKOUT_MATCHES(tournamentId)
      );
      if (response.data.success) setDirectKnockoutMatches(response.data.matches || []);
    } catch (err) {
      setDirectKnockoutMatches([]);
    }
  };

  const fetchGroupMatches = async (groupId) => {
    try {
      const response = await axios.get(`${tournamentConfig.ENDPOINTS.MATCHES.BY_GROUP(tournamentId, groupId)}?mobile=true`);
      return response.data.success ? response.data.matches || [] : [];
    } catch (err) {
      return [];
    }
  };

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${tournamentConfig.ENDPOINTS.BOOKING_GROUPS.BY_TOURNAMENT(tournamentId)}?mobile=true`);
      const groups = Array.isArray(response.data) ? response.data : response.data.groups || response.data.data || [];

      if (groups.length > 0) {
        setGroupsData(groups);
        setSelectedLeagueGroup(groups[0]._id);
        const playersMap = {};
        const matchesMap = {};
        const topPlayersMap = {};

        for (const group of groups) {
          playersMap[group._id] = (group.players || []).map((player) => ({
            id: player.playerId || player._id,
            name: player.userName,
            uri: player.imageUrl || "https://randomuser.me/api/portraits/lego/1.jpg",
          }));
          matchesMap[group._id] = await fetchGroupMatches(group._id);
          topPlayersMap[group._id] = await fetchTopPlayers(group._id);
        }
        setPlayersData(playersMap);
        setMatchesData(matchesMap);
        setTopPlayersData(topPlayersMap);
      } else {
        setError("No groups available yet");
      }
    } catch (err) {
      setError("Failed to load tournament data");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    try {
      await fetchGroups();
      if (tournamentId) {
        await Promise.all([fetchTournamentProgression(), fetchSuperPlayers(), fetchDirectKnockoutMatches()]);
      }
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { initializeData(); }, [tournamentId]);
  const initializeData = async () => {
    if (tournamentId) {
      await fetchGroups();
      fetchTournamentProgression();
      fetchSuperPlayers();
      fetchDirectKnockoutMatches();
    }
  };

  const getSelectedGroupName = () => {
    const selectedGroup = groupsData.find(g => g._id === selectedLeagueGroup);
    return selectedGroup ? selectedGroup.groupName : "";
  };

  const renderEmptyState = (msg) => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="tournament" size={60} color="#DEE2E6" />
      <Text style={styles.emptyText}>{msg}</Text>
    </View>
  );

  const renderMatchCard = (match) => {
    const isLive = match.status === "Live" || match.status === "IN_PROGRESS";
    const isCompleted = match.status === "Completed" || match.status === "COMPLETED";

    return (
      <TouchableOpacity
        key={match._id || match.id}
        style={styles.modernMatchCard}
        onPress={() => navigation.navigate("MatchDetailsscreen", {
          matchId: match._id || match.id,
          match: { status: match.status },
          player1: match.player1,
          player2: match.player2
        })}
      >
        <View style={styles.matchCardHeader}>
          <Text style={styles.matchTypeLabel}>{match.name || "Match"}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: isLive ? '#FF3B30' : isCompleted ? '#4CAF50' : '#ADB5BD' }]}>
            <Text style={styles.statusIndicatorText}>{match.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.matchMain}>
          <View style={styles.matchParticipant}>
            <Image source={{ uri: match.player1?.uri || match.player1?.imageUrl || "https://randomuser.me/api/portraits/lego/1.jpg" }} style={styles.participantAvatar} />
            <Text style={styles.participantName} numberOfLines={1}>{match.player1?.name || match.player1?.userName || "TBD"}</Text>
          </View>
          <View style={styles.vsContainer}>
            <Text style={styles.vsLabel}>VS</Text>
          </View>
          <View style={[styles.matchParticipant, { alignItems: 'flex-end' }]}>
            <Image source={{ uri: match.player2?.uri || match.player2?.imageUrl || "https://randomuser.me/api/portraits/lego/2.jpg" }} style={styles.participantAvatar} />
            <Text style={[styles.participantName, { textAlign: 'right' }]} numberOfLines={1}>{match.player2?.name || match.player2?.userName || "TBD"}</Text>
          </View>
        </View>

        <View style={styles.matchFooter}>
          <View style={styles.footerInfo}>
            <Ionicons name="time-outline" size={14} color="#6C757D" />
            <Text style={styles.footerText}>{match.time || match.scheduledTime ? new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD"}</Text>
          </View>
          <View style={styles.footerInfo}>
            <Ionicons name="location-outline" size={14} color="#6C757D" />
            <Text style={styles.footerText}>{match.court || "Court 1"}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderKnockoutContent = () => {
    const isDirectKnockout = tournamentProgression?.roundTwoMode === 'direct-knockout';
    const hasDirectKnockoutMatches = directKnockoutMatches && directKnockoutMatches.length > 0;

    if (isDirectKnockout || hasDirectKnockoutMatches) {
      if (!hasDirectKnockoutMatches) return renderEmptyState("Brackets are being prepared");

      const groupedMatches = directKnockoutMatches.reduce((acc, match) => {
        const round = match.round || 'Knockout';
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
      }, {});

      return Object.entries(groupedMatches).map(([round, matches]) => (
        <View key={round} style={styles.roundContainer}>
          <View style={styles.roundHeader}>
            <Text style={styles.roundHeaderText}>{round.replace('-', ' ').toUpperCase()}</Text>
          </View>
          {matches.map(renderMatchCard)}
        </View>
      ));
    }

    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.innerTabs}>
          {["Quarterfinal", "Semifinal", "Final"].map((stage) => (
            <TouchableOpacity
              key={stage}
              style={[styles.innerTabPill, selectedKnockoutStage === stage && styles.activeInnerTabPill]}
              onPress={() => setSelectedKnockoutStage(stage)}
            >
              <Text style={[styles.innerTabText, selectedKnockoutStage === stage && styles.activeInnerTabText]}>{stage}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ marginTop: 15 }}>
          {renderEmptyState(`${selectedKnockoutStage} Brackets pending`)}
        </View>
      </View>
    );
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF6A00" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {[{ key: "League", label: "League", icon: "grid" }, { key: "TopPlayers", label: "Ranking", icon: "ribbon" }, { key: "Knockout", label: "Brackets", icon: "trophy" }].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabBtn, groupSubTab === tab.key && styles.activeTabBtn]}
            onPress={() => setGroupSubTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={18} color={groupSubTab === tab.key ? "#FFF" : "#ADB5BD"} />
            <Text style={[styles.tabBtnText, groupSubTab === tab.key && styles.activeTabBtnText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAllData} tintColor="#FF6A00" />}>
        {groupSubTab === "League" && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupPills}>
              {groupsData.map((group) => (
                <TouchableOpacity
                  key={group._id}
                  style={[styles.groupPill, selectedLeagueGroup === group._id && styles.activeGroupPill]}
                  onPress={() => setSelectedLeagueGroup(group._id)}
                >
                  <Text style={[styles.groupPillText, selectedLeagueGroup === group._id && styles.activeGroupPillText]}>{group.groupName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Group Standings</Text>
              <TouchableOpacity style={styles.pointsBtn} onPress={() => setShowPointsTable(true)}>
                <LinearGradient colors={["#FF8C00", "#FF4500"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pointsBtnGradient}>
                  <MaterialIcons name="leaderboard" size={18} color="#FFF" />
                  <Text style={styles.pointsBtnText}>Points Table</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.playerGrid}>
              {(playersData[selectedLeagueGroup] || []).map((player) => (
                <TouchableOpacity key={player.id} style={styles.modernPlayerItem} onPress={() => navigation.navigate("PlayerProfile", { playerId: player.id })}>
                  <Image source={{ uri: player.uri }} style={styles.smallAvatar} />
                  <Text style={styles.tinyPlayerName} numberOfLines={1}>{player.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.subSectionTitle}>Group Fixtures</Text>
            {(matchesData[selectedLeagueGroup] || []).length > 0 ? (
              (matchesData[selectedLeagueGroup] || []).map(renderMatchCard)
            ) : renderEmptyState("Fixtures not yet generated")}
          </View>
        )}

        {groupSubTab === "TopPlayers" && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupPills}>
              {groupsData.map((group) => (
                <TouchableOpacity key={group._id} style={[styles.groupPill, selectedLeagueGroup === group._id && styles.activeGroupPill]} onPress={() => setSelectedLeagueGroup(group._id)}>
                  <Text style={[styles.groupPillText, selectedLeagueGroup === group._id && styles.activeGroupPillText]}>{group.groupName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.rankingList}>
              {(topPlayersData[selectedLeagueGroup] || [])
                .sort((a, b) => (b.points || 0) - (a.points || 0))
                .map((player, idx) => (
                  <View key={player.id || idx} style={styles.rankingCard}>
                    <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#F1F3F5' }]}>
                      <Text style={[styles.rankBadgeText, { color: idx < 3 ? '#FFF' : '#6C757D' }]}>{idx + 1}</Text>
                    </View>
                    <Image source={{ uri: player.uri || player.imageUrl || "https://randomuser.me/api/portraits/lego/1.jpg" }} style={styles.rankingAvatar} />
                    <View style={styles.rankingMain}>
                      <Text style={styles.rankingName}>{player.playerName || player.userName || player.name}</Text>
                      <View style={styles.rankingStatsLine}>
                        <Text style={styles.rankingStatItem}>P: {player.played || 0}</Text>
                        <Text style={styles.rankingStatDivider}>|</Text>
                        <Text style={styles.rankingStatItem}>W: {player.won || 0}</Text>
                        <Text style={styles.rankingStatDivider}>|</Text>
                        <Text style={styles.rankingStatItem}>L: {player.lost || 0}</Text>
                      </View>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsBadgeText}>{player.points || 0}</Text>
                      <Text style={styles.pointsLabel}>PTS</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}

        {groupSubTab === "Knockout" && renderKnockoutContent()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Points Table Overlay */}
      {showPointsTable && (
        <View style={styles.overlay}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.overlayHeader}>
              <Text style={styles.overlayTitle}>League Standings</Text>
              <TouchableOpacity onPress={() => setShowPointsTable(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.overlayScroll}>
              <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2, textAlign: 'left' }]}>PLAYER</Text>
                  <Text style={styles.th}>P</Text>
                  <Text style={styles.th}>W</Text>
                  <Text style={styles.th}>L</Text>
                  <Text style={[styles.th, { fontWeight: '900', color: '#FF6A00' }]}>PTS</Text>
                </View>
                {(topPlayersData[selectedLeagueGroup] || []).sort((a, b) => (b.points || 0) - (a.points || 0)).map((p, i) => (
                  <View key={i} style={[styles.tr, i % 2 === 1 && styles.trAlt]}>
                    <View style={[styles.td, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.tableIdx}>{i + 1}</Text>
                      <Text style={styles.tableName} numberOfLines={1}>{p.playerName || p.userName || p.name}</Text>
                    </View>
                    <Text style={styles.td}>{p.played || 0}</Text>
                    <Text style={styles.td}>{p.won || 0}</Text>
                    <Text style={styles.td}>{p.lost || 0}</Text>
                    <Text style={[styles.td, { fontWeight: '900', color: '#FF6A00' }]}>{p.points || 0}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', padding: 15, justifyContent: 'space-around', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  activeTabBtn: { backgroundColor: '#004E93' },
  tabBtnText: { marginLeft: 8, fontSize: 13, fontWeight: '700', color: '#ADB5BD' },
  activeTabBtnText: { color: '#FFF' },

  content: { flex: 1, padding: 15 },
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyText: { marginTop: 15, color: '#ADB5BD', fontSize: 14, fontWeight: '600' },

  groupPills: { marginBottom: 20 },
  groupPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#F1F3F5' },
  activeGroupPill: { backgroundColor: '#FF6A00', borderColor: '#FF6A00' },
  groupPillText: { fontSize: 13, fontWeight: '700', color: '#6C757D' },
  activeGroupPillText: { color: '#FFF' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#333' },
  pointsBtn: { borderRadius: 12, overflow: 'hidden', elevation: 3 },
  pointsBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  pointsBtnText: { color: '#FFF', fontWeight: '800', marginLeft: 6, fontSize: 12 },

  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  modernPlayerItem: { width: (width - 60) / 3, backgroundColor: '#FFF', padding: 10, borderRadius: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  smallAvatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 6 },
  tinyPlayerName: { fontSize: 11, fontWeight: '700', color: '#495057' },

  subSectionTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginBottom: 15 },
  modernMatchCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderLeftWidth: 4, borderLeftColor: '#004E93' },
  matchCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  matchTypeLabel: { fontSize: 11, fontWeight: '800', color: '#ADB5BD', textTransform: 'uppercase' },
  statusIndicator: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusIndicatorText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  matchMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  matchParticipant: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  participantAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  participantName: { fontSize: 13, fontWeight: '700', color: '#343A40', flex: 1 },
  vsContainer: { width: 40, alignItems: 'center' },
  vsLabel: { fontSize: 10, fontWeight: '900', color: '#E9ECEF' },
  matchFooter: { flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F8F9FA' },
  footerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 11, color: '#6C757D', marginLeft: 5, fontWeight: '600' },

  rankingList: { gap: 12 },
  rankingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankBadgeText: { fontSize: 12, fontWeight: '900' },
  rankingAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  rankingMain: { flex: 1 },
  rankingName: { fontSize: 14, fontWeight: '800', color: '#333' },
  rankingStatsLine: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rankingStatItem: { fontSize: 11, color: '#ADB5BD', fontWeight: '700' },
  rankingStatDivider: { marginHorizontal: 6, color: '#E9ECEF', fontSize: 10 },
  pointsBadge: { backgroundColor: '#F8F9FA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: 'center', minWidth: 45 },
  pointsBadgeText: { fontSize: 15, fontWeight: '900', color: '#004E93' },
  pointsLabel: { fontSize: 7, fontWeight: '800', color: '#ADB5BD', marginTop: -2 },

  roundContainer: { marginBottom: 25 },
  roundHeader: { backgroundColor: '#E9ECEF', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 10, marginBottom: 15 },
  roundHeaderText: { fontSize: 12, fontWeight: '900', color: '#495057', letterSpacing: 1 },
  innerTabs: { marginBottom: 15 },
  innerTabPill: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#F1F3F5' },
  activeInnerTabPill: { backgroundColor: '#343A40', borderColor: '#343A40' },
  innerTabText: { fontSize: 12, fontWeight: '700', color: '#ADB5BD' },
  activeInnerTabText: { color: '#FFF' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF', zIndex: 9999 },
  overlayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F3F5' },
  overlayTitle: { fontSize: 20, fontWeight: '900', color: '#333' },
  overlayScroll: { flex: 1, padding: 15 },
  tableCard: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F3F5' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8F9FA', padding: 15 },
  th: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: '#ADB5BD' },
  tr: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  trAlt: { backgroundColor: '#FAFAFA' },
  td: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#495057' },
  tableName: { fontSize: 13, fontWeight: '800', color: '#333', flex: 1 },
  tableIdx: { width: 25, fontSize: 11, fontWeight: '900', color: '#DEE2E6' }
});

export default Groups;
