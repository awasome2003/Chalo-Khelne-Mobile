import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TournamentViewer from "./TournamentViewer";
import tournamentConfig from "../../api/tournaments";
import axios from "axios";

const { width } = Dimensions.get("window");

const PlayersManager = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { tournament, tournamentId: paramId } = route.params || {};
  const rawId = paramId || tournament?._id || tournament?.id;
  const tournamentId = (rawId && typeof rawId === 'object') ? (rawId._id || rawId).toString() : rawId;

  // STATE WITH PROPER SUB-TABS
  const [selectedTab, setSelectedTab] = useState("Players");
  const [selectedSubTab, setSelectedSubTab] = useState("Registered Players");

  // Players data for different types
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [superPlayers, setSuperPlayers] = useState([]);

  // Loading states
  const [loading, setLoading] = useState({
    registered: true,
    topPlayers: false,
    superPlayers: false,
    tournament: true,
  });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Tournament info
  const [tournamentInfo, setTournamentInfo] = useState(null);

  // SEARCH & FILTER STATE
  const [searchQuery, setSearchQuery] = useState("");

  // FETCH FUNCTIONS
  const fetchRegisteredPlayers = async () => {
    try {
      setLoading(prev => ({ ...prev, registered: true }));
      const response = await axios.get(tournamentConfig.ENDPOINTS.GROUP_STAGE.TOURNAMENT_BOOKINGS(tournamentId));
      if (response.data?.success && Array.isArray(response.data.bookings)) {
        const fetchedPlayers = response.data.bookings.map((booking, index) => ({
          id: booking._id || booking.id || index,
          name: booking.userId?.name?.trim() || booking.userName?.trim() || "Player",
          image: booking.userId?.profileImage || booking.image || "https://randomuser.me/api/portraits/lego/1.jpg",
          category: booking.category || "Open",
        }));
        setRegisteredPlayers(fetchedPlayers);
      }
    } catch (err) {
      setError(err.message || "Failed to load players");
    } finally {
      setLoading(prev => ({ ...prev, registered: false }));
    }
  };

  const fetchTopPlayers = async () => {
    try {
      setLoading(prev => ({ ...prev, topPlayers: true }));
      const response = await axios.get(tournamentConfig.ENDPOINTS.TOP_PLAYERS.BY_TOURNAMENT(tournamentId));
      if (response.data?.success) {
        let fetchedTopPlayers = [];
        if (response.data.data && Array.isArray(response.data.data)) {
          fetchedTopPlayers = response.data.data.flatMap(group =>
            group.players?.map((player, index) => ({
              id: player._id || index,
              name: player.playerId?.name?.trim() || player.playerName?.trim() || "Player",
              image: player.playerId?.profileImage || "https://randomuser.me/api/portraits/lego/2.jpg",
              points: player.points || 0,
              rank: player.rank || (index + 1),
            })) || []
          );
        }
        setTopPlayers(fetchedTopPlayers);
      }
    } catch (err) {
    } finally {
      setLoading(prev => ({ ...prev, topPlayers: false }));
    }
  };

  const fetchSuperPlayers = async () => {
    try {
      setLoading(prev => ({ ...prev, superPlayers: true }));
      const response = await axios.get(tournamentConfig.ENDPOINTS.PROGRESSION.SUPER_PLAYERS(tournamentId));
      if (response.data?.success && Array.isArray(response.data.superPlayers)) {
        const fetchedSuperPlayers = response.data.superPlayers.map((player, index) => ({
          id: player._id || player.playerId || index,
          name: player.playerId?.name?.trim() || player.playerName?.trim() || "Super Player",
          image: player.playerId?.profileImage || "https://randomuser.me/api/portraits/lego/3.jpg",
          groupName: player.groupName || "Super Group",
        }));
        setSuperPlayers(fetchedSuperPlayers);
      }
    } catch (err) {
    } finally {
      setLoading(prev => ({ ...prev, superPlayers: false }));
    }
  };

  const fetchTournamentInfo = async () => {
    try {
      setLoading(prev => ({ ...prev, tournament: true }));
      const response = await axios.get(tournamentConfig.ENDPOINTS.BY_ID(tournamentId));
      if (response.data?.success) setTournamentInfo(response.data.tournament);
    } catch (err) {
    } finally {
      setLoading(prev => ({ ...prev, tournament: false }));
    }
  };

  useEffect(() => {
    if (tournamentId) {
      fetchRegisteredPlayers();
      fetchTournamentInfo();
    }
  }, [tournamentId]);

  const handleSubTabChange = (tab) => {
    setSelectedSubTab(tab);
    if (tab === "Top Players" && topPlayers.length === 0) fetchTopPlayers();
    if (tab === "Super Players" && superPlayers.length === 0) fetchSuperPlayers();
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    await Promise.all([fetchRegisteredPlayers(), fetchTournamentInfo(),
    selectedSubTab === "Top Players" ? fetchTopPlayers() : Promise.resolve(),
    selectedSubTab === "Super Players" ? fetchSuperPlayers() : Promise.resolve()
    ]);
    setRefreshing(false);
  };

  const filteredData = useMemo(() => {
    const list = selectedSubTab === "Top Players" ? topPlayers :
      selectedSubTab === "Super Players" ? superPlayers : registeredPlayers;

    if (!searchQuery.trim()) return list;
    return list.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [selectedSubTab, registeredPlayers, topPlayers, superPlayers, searchQuery]);

  const renderPlayerItem = (item, index) => (
    <View key={item.id || index} style={styles.modernPlayerCard}>
      <Image source={{ uri: item.image }} style={styles.modernAvatar} defaultSource={require("../../../assets/Trainers.png")} />
      <View style={styles.playerInfo}>
        <Text style={styles.modernPlayerName} numberOfLines={1}>{item.name}</Text>
        {item.rank ? <Text style={styles.rankLabel}>Rank #{item.rank} • {item.points} PTS</Text> :
          item.groupName ? <Text style={styles.groupLabel}>{item.groupName}</Text> :
            <Text style={styles.categoryLabel}>{item.category || "Registered"}</Text>}
      </View>
      <TouchableOpacity style={styles.profileBtn}>
        <Ionicons name="chevron-forward" size={16} color="#ADB5BD" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = (message) => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-search-outline" size={60} color="#DEE2E6" />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );

  if (loading.tournament) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6A00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Premium Header */}
      <LinearGradient colors={["#004E93", "#002147"]} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>{tournamentInfo?.title || "Participants"}</Text>
            <Text style={styles.headerSubtitle}>{registeredPlayers.length} Members Registered</Text>
          </View>
          <TouchableOpacity onPress={refreshAllData} style={styles.headerBtn}>
            <Ionicons name="refresh" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Master Selector */}
        <View style={styles.masterSelector}>
          {["Players", "Groups"].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.selectorBtn, selectedTab === tab && styles.selectorActive]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.selectorText, selectedTab === tab && styles.selectorTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {selectedTab === "Players" ? (
        <View style={{ flex: 1 }}>
          {/* Sub-Tabs */}
          <View style={styles.subTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
              {["Registered Players", "Top Players", "Super Players"].map((tab) => {
                const isActive = selectedSubTab === tab;
                const count = tab === "Top Players" ? topPlayers.length :
                  tab === "Super Players" ? superPlayers.length : registeredPlayers.length;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.subTabPill, isActive && styles.activeSubTabPill]}
                    onPress={() => handleSubTabChange(tab)}
                  >
                    <Text style={[styles.subTabLabel, isActive && styles.activeSubTabLabel]}>{tab}</Text>
                    <View style={[styles.countBadge, isActive && styles.activeCountBadge]}>
                      <Text style={[styles.countBadgeText, isActive && styles.activeCountBadgeText]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#ADB5BD" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${selectedSubTab}...`}
              placeholderTextColor="#ADB5BD"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAllData} tintColor="#FF6A00" />}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardContainer}>
              {loading.registered || loading.topPlayers || loading.superPlayers ? (
                <ActivityIndicator color="#FF6A00" style={{ marginTop: 40 }} />
              ) : filteredData.length > 0 ? (
                <View style={styles.playerGrid}>
                  {filteredData.map(renderPlayerItem)}
                </View>
              ) : renderEmptyState(`No ${selectedSubTab.toLowerCase()} found`)}
            </View>

            {/* Quick Stats Card */}
            {selectedSubTab === "Registered Players" && tournamentInfo && (
              <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                  <FontAwesome5 name="info-circle" size={16} color="#004E93" />
                  <Text style={styles.infoCardTitle}>Tournament Overview</Text>
                </View>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>{tournamentInfo.type || 'Standard'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Category</Text>
                    <Text style={styles.infoValue}>{tournamentInfo.sportsType || 'Open'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={[styles.infoValue, { color: '#4CAF50' }]}>{tournamentInfo.tournamentStatus?.toUpperCase() || 'LIVE'}</Text>
                  </View>
                </View>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      ) : (
        <TournamentViewer tournamentId={tournamentId} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, elevation: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  titleContainer: { flex: 1, marginHorizontal: 15 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  masterSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 4 },
  selectorBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 13 },
  selectorActive: { backgroundColor: '#FFF' },
  selectorText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13 },
  selectorTextActive: { color: '#004E93' },

  subTabsContainer: { paddingVertical: 12 },
  subTabsScroll: { paddingHorizontal: 20 },
  subTabPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, marginRight: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  activeSubTabPill: { backgroundColor: '#FF6A00' },
  subTabLabel: { fontSize: 13, fontWeight: '700', color: '#495057', marginRight: 8 },
  activeSubTabLabel: { color: '#FFF' },
  countBadge: { backgroundColor: '#F8F9FA', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  activeCountBadge: { backgroundColor: 'rgba(255,255,255,0.25)' },
  countBadgeText: { fontSize: 10, fontWeight: '900', color: '#ADB5BD' },
  activeCountBadgeText: { color: '#FFF' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 20, paddingHorizontal: 15, borderRadius: 15, height: 50, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 20 },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  modernPlayerCard: { width: (width - 54) / 2, backgroundColor: '#FFF', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F3F5' },
  modernAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 10, backgroundColor: '#E9ECEF' },
  playerInfo: { flex: 1 },
  modernPlayerName: { fontSize: 12, fontWeight: '700', color: '#343A40' },
  rankLabel: { fontSize: 10, color: '#FF6A00', fontWeight: '800', marginTop: 2 },
  groupLabel: { fontSize: 10, color: '#004AAD', fontWeight: '700', marginTop: 2 },
  categoryLabel: { fontSize: 10, color: '#6C757D', fontWeight: '600', marginTop: 2 },
  profileBtn: { padding: 4 },

  infoCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 22, marginTop: 25, elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15 },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  infoCardTitle: { fontSize: 15, fontWeight: '800', color: '#333', marginLeft: 10 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#ADB5BD', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '800', color: '#495057' },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 18, color: '#ADB5BD', fontWeight: '700', fontSize: 14 }
});

export default PlayersManager;