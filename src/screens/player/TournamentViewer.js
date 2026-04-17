import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import tournamentConfig from "../../api/tournaments";
import axios from "axios";
import { readMatchResult, getLiveLabel } from "../../utils/matchResultUtils";

const TournamentViewer = ({ tournamentId: rawTournamentId }) => {
  // Normalize tournamentId to be a string
  const tournamentId = (rawTournamentId && typeof rawTournamentId === 'object')
    ? (rawTournamentId._id || rawTournamentId.id || rawTournamentId).toString()
    : rawTournamentId;

  const [activeSubGroupTab, setActiveSubGroupTab] = useState("League");
  const [activeGroup, setActiveGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Round 2 Top Players groups
  const [round2Groups, setRound2Groups] = useState([]);
  const [activeRound2Group, setActiveRound2Group] = useState(null);
  const [round2MatchesData, setRound2MatchesData] = useState({});

  // Knockout matches
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [knockoutMatchesByRound, setKnockoutMatchesByRound] = useState({});

  const [tournamentMode, setTournamentMode] = useState("round2-plus-knockout");

  // Match data for groups
  const [matchesData, setMatchesData] = useState({});

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showMatchDetails, setShowMatchDetails] = useState(false);

  // Fetch groups - Round 1 league groups
  const fetchGroups = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        tournamentConfig.ENDPOINTS.BOOKING_GROUPS.BY_TOURNAMENT(tournamentId)
      );

      const groupsArray = response?.data?.groups;

      if (Array.isArray(groupsArray)) {
        // Only show Round 1 groups in the Groups/League tab
        const round1Groups = groupsArray.filter(group => !group.round || group.round === 1);
        setGroups(round1Groups);
        if (round1Groups.length > 0) {
          setActiveGroup(round1Groups[0]._id);
        }
      } else {
        console.error('Expected array but got:', response.data);
        setError('Invalid data format received from server');
        setGroups([]);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
      setError(error.message || "Failed to load groups data");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournamentMode = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.BY_ID(tournamentId)
      );

      if (response.data.success && response.data.tournament) {
        const mode = response.data.tournament.roundTwoMode || "round2-plus-knockout";
        setTournamentMode(mode);
      }
    } catch (error) {
      console.error("Error fetching tournament mode:", error);
    }
  };

  // Fetch Round 2 groups (Top Players groups)
  const fetchRound2Groups = async () => {
    try {
      const response = await axios.get(
        tournamentConfig.ENDPOINTS.BOOKING_GROUPS.BY_TOURNAMENT(tournamentId)
      );

      const groupsArray = response?.data?.groups;

      if (Array.isArray(groupsArray)) {
        // Only show Round 2 groups in Top Players section
        const round2GroupsFiltered = groupsArray.filter(group => group.round === 2);

        setRound2Groups(round2GroupsFiltered);
        if (round2GroupsFiltered.length > 0 && !activeRound2Group) {
          setActiveRound2Group(round2GroupsFiltered[0]._id);
        }

        // Fetch matches for each Round 2 group
        if (round2GroupsFiltered.length > 0) {
          fetchRound2Matches(round2GroupsFiltered);
        }
      }
    } catch (error) {
      console.error("Error fetching Round 2 groups:", error);
    }
  };

  // Fetch knockout matches - SuperMatch objects support live-state integration
  const fetchKnockoutMatches = async () => {
    try {

      // Fetch both SuperMatch knockout matches AND Direct Knockout matches
      const [superMatchResponse, directKnockoutResponse] = await Promise.all([
        // SuperMatch knockout matches (traditional flow)
        axios.get(tournamentConfig.ENDPOINTS.GROUP_STAGE.KNOCKOUT_MATCHES(tournamentId))
          .catch(err => ({ data: { success: false, matches: [] } })),

        // Direct Knockout matches (new beast system!)
        axios.get(tournamentConfig.ENDPOINTS.PROGRESSION.DIRECT_KNOCKOUT_MATCHES(tournamentId))
          .catch(err => ({ data: { success: false, matches: [] } }))
      ]);

      let allMatches = [];

      // Process SuperMatch knockout matches
      if (superMatchResponse.data.success && superMatchResponse.data.matches?.length > 0) {

        const enrichedSuperMatches = superMatchResponse.data.matches.map(match => ({
          ...match,
          _id: match._id || match.matchId,
          type: 'supermatch',
          player1: match.player1,
          player2: match.player2,
          round: match.round,
          status: match.status?.toLowerCase() || 'scheduled',
          hasScores: !!match.winner?.playerName || !!match.score?.setScores,
          winner: match.winner?.playerName
        }));

        allMatches = [...allMatches, ...enrichedSuperMatches];
      }

      // Process Direct Knockout matches
      if (directKnockoutResponse.data.success && directKnockoutResponse.data.matches?.length > 0) {

        const enrichedDirectMatches = directKnockoutResponse.data.matches.map(match => ({
          ...match,
          _id: match._id || match.matchId,
          status: match.status?.toLowerCase() === 'scheduled' ? 'scheduled' :
            match.status?.toLowerCase() === 'in_progress' ? 'in-progress' :
              match.status?.toLowerCase() === 'completed' ? 'completed' : 'scheduled',
          hasScores: match.status === 'COMPLETED' || !!match.result?.winner?.playerId,
          type: 'direct-knockout',
          player1: match.player1,
          player2: match.player2,
          round: match.round,
          winner: match.result?.winner?.playerName
        }));

        allMatches = [...allMatches, ...enrichedDirectMatches];
      }

      // Group matches by round for display
      const matchesByRound = allMatches.reduce((acc, match) => {
        const roundKey = match.round || 'other';
        if (!acc[roundKey]) {
          acc[roundKey] = [];
        }
        acc[roundKey].push(match);
        return acc;
      }, {});

      setKnockoutMatches(allMatches);
      setKnockoutMatchesByRound(matchesByRound);
    } catch (err) {
      console.error('Error fetching knockout matches:', err);
      setKnockoutMatches([]);
      setKnockoutMatchesByRound({});
    }
  };

  // Fetch matches for Round 2 groups
  const fetchRound2Matches = async (groups) => {
    const matchesDataTemp = {};

    for (const group of groups) {
      try {
        const response = await axios.get(
          tournamentConfig.ENDPOINTS.GROUP_STAGE.MATCHES_BY_GROUP(tournamentId, group._id)
        );

        if (response.data.success) {
          matchesDataTemp[group._id] = response.data.matches || [];
        } else {
          matchesDataTemp[group._id] = [];
        }
      } catch (error) {
        console.error(`Error fetching matches for Round 2 group ${group._id}:`, error);
        matchesDataTemp[group._id] = [];
      }
    }

    setRound2MatchesData(matchesDataTemp);
  };

  // Fetch matches for a specific group
  const fetchMatches = async (groupId = activeGroup) => {
    try {
      if (!groupId) return;

      const response = await axios.get(
        tournamentConfig.ENDPOINTS.GROUP_STAGE.MATCHES_BY_GROUP(tournamentId, groupId)
      );

      if (response.data.success) {
        setMatchesData(prev => ({
          ...prev,
          [groupId]: response.data.matches || []
        }));
      }
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  // INITIALIZATION - Load all data
  useEffect(() => {
    const initializeData = async () => {
      if (tournamentId) {
        await Promise.all([
          fetchGroups(),
          fetchRound2Groups(),
          fetchKnockoutMatches(),
          fetchTournamentMode()
        ]);
      }
    };

    initializeData();
  }, [tournamentId]);

  // Fetch matches when active group changes
  useEffect(() => {
    if (activeGroup) {
      fetchMatches(activeGroup);
    }
  }, [activeGroup]);

  // REFRESH FUNCTION
  const refreshAllData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      if (tournamentId) {
        await Promise.all([
          fetchGroups(),
          fetchRound2Groups(),
          fetchKnockoutMatches(),
          fetchTournamentMode()
        ]);
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      Alert.alert(
        'Refresh Failed',
        'Some data could not be refreshed. Please check your connection.',
        [{ text: 'OK' }]
      );
    } finally {
      setRefreshing(false);
    }
  };

  // Get current group for League tab
  const currentGroup = groups.find(group => group._id === activeGroup);

  // Get current Round 2 group for Top Players tab
  const currentRound2Group = round2Groups.find(group => group._id === activeRound2Group);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D6A8B" />
        <Text style={styles.loadingText}>Loading tournament data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="exclamation-triangle" size={48} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Error Loading Data</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshAllData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAllData} />
      }
    >
      {/* SUB-GROUP TABS - EXACT SAME AS WEB */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["League", "Top Players", "Knockout"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveSubGroupTab(tab)}
              style={[
                styles.tab,
                activeSubGroupTab === tab && styles.activeTab
              ]}
            >
              <Text style={[
                styles.tabText,
                activeSubGroupTab === tab && styles.activeTabText
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* TAB CONTENT - EXACT SAME STRUCTURE AS WEB */}

      {/* LEAGUE TAB */}
      {activeSubGroupTab === "League" && (
        <View style={styles.tabContent}>
          {/* Group Selection Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabsContainer}>
            {groups.map((group, index) => (
              <TouchableOpacity
                key={group._id}
                onPress={async () => {
                  setActiveGroup(group._id);
                  await fetchMatches(group._id);
                }}
                style={[
                  styles.groupTab,
                  activeGroup === group._id && styles.activeGroupTab
                ]}
              >
                <Text style={[
                  styles.groupTabText,
                  activeGroup === group._id && styles.activeGroupTabText
                ]}>
                  {group.groupName || `Group ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Group Content */}
          {currentGroup && (
            <View style={styles.groupContent}>
              <Text style={styles.groupTitle}>
                {currentGroup.groupName || `Group ${groups.indexOf(currentGroup) + 1}`}
              </Text>

              {/* GROUP PLAYERS LIST - Like MGrouptabs */}
              <View style={styles.playersContainer}>
                <Text style={styles.sectionTitle}>
                  <Icon name="users" size={16} color="#1D6A8B" /> Players ({currentGroup.players?.length || 0})
                </Text>

                {currentGroup.players && currentGroup.players.length > 0 ? (
                  <View style={styles.playersList}>
                    {currentGroup.players.map((player, index) => (
                      <View key={player._id || index} style={styles.playerCard}>
                        <View style={styles.playerRank}>
                          <Text style={styles.rankText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.groupPlayerName}>
                          {player.userId?.name || player.userName || player.playerName || `Player ${index + 1}`}
                        </Text>
                        <View style={styles.playerStats}>
                          <Text style={styles.playerCategory}>
                            {player.category || 'Open'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="users" size={32} color="#CCC" />
                    <Text style={styles.emptyStateText}>No players in this group yet</Text>
                  </View>
                )}
              </View>

              {/* Group Matches */}
              <View style={styles.matchesContainer}>
                <Text style={styles.sectionTitle}>
                  <Icon name="gamepad" size={16} color="#1D6A8B" /> Matches
                </Text>

                {(matchesData[activeGroup] || []).length > 0 ? (
                  (matchesData[activeGroup] || []).map((match, index) => (
                    <TouchableOpacity
                      key={match._id || index}
                      style={styles.unifiedMatchCard}
                      onPress={() => {
                        setSelectedMatch(match);
                        setShowMatchDetails(true);
                      }}
                    >
                      {/* 🔥 UNIFIED MATCH HEADER */}
                      <View style={styles.unifiedMatchHeader}>
                        <View style={styles.matchTypeContainer}>
                          <Icon name="gamepad" size={14} color="#1D6A8B" />
                          <Text style={styles.unifiedMatchType}>Round 1 - Group Match</Text>
                        </View>
                        {/* 🚀 NAVIGATION SERIAL NUMBER */}
                        <View style={styles.serialNumberContainer}>
                          <Text style={styles.serialNumberText}>#{index + 1}</Text>
                        </View>
                        <View style={[styles.unifiedStatusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                          <Text style={styles.unifiedStatusText}>{match.status || 'SCHEDULED'}</Text>
                        </View>
                      </View>

                      {/* 🎯 ENHANCED MATCH INFO ROW */}
                      <View style={styles.matchInfoRow}>
                        {match.courtNumber && (
                          <View style={styles.matchInfoItem}>
                            <Icon name="map-marker" size={12} color="#6C757D" />
                            <Text style={styles.matchInfoText}>Court {match.courtNumber}</Text>
                          </View>
                        )}
                        {match.matchStartTime && (
                          <View style={styles.matchInfoItem}>
                            <Icon name="clock-o" size={12} color="#6C757D" />
                            <Text style={styles.matchInfoText}>
                              {new Date(match.matchStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        )}
                        {match.result?.finalScore && (
                          <View style={styles.matchInfoItem}>
                            <Icon name="bar-chart" size={12} color="#FF6400" />
                            <Text style={styles.matchInfoText}>
                              {(() => { const r = readMatchResult(match); return r ? `${r.player1Score}-${r.player2Score}` : '0-0'; })()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* 🔥 UNIFIED PLAYER DISPLAY */}
                      <View style={styles.unifiedMatchPlayers}>
                        <View style={styles.unifiedPlayer}>
                          <Text style={styles.unifiedPlayerName}>
                            {match.player1?.userName || match.player1?.playerName || 'Player 1'}
                          </Text>
                          {(() => {
                            const winnerId = match.result?.winner?.playerId?.toString() ||
                              match.result?.winner?.playerId?._id?.toString() ||
                              match.result?.winner?.playerId;
                            const player1Id = match.player1?.playerId?.toString() ||
                              match.player1?.playerId?._id?.toString() ||
                              match.player1?.playerId ||
                              match.player1?._id?.toString();
                            const winnerName = match.result?.winner?.playerName || match.result?.winner?.userName;
                            const player1Name = match.player1?.playerName || match.player1?.userName;

                            const isWinner = (winnerId && player1Id && winnerId === player1Id) ||
                              (winnerName && player1Name && winnerName === player1Name);

                            return isWinner && match.status === 'COMPLETED';
                          })() && (
                              <View style={styles.unifiedWinnerBadge}>
                                <Icon name="trophy" size={10} color="#FFD700" />
                                <Text style={styles.unifiedWinnerBadgeText}>W</Text>
                              </View>
                            )}
                        </View>

                        <View style={styles.unifiedVsContainer}>
                          <Text style={styles.unifiedVsText}>VS</Text>
                        </View>

                        <View style={styles.unifiedPlayer}>
                          <Text style={styles.unifiedPlayerName}>
                            {match.player2?.userName || match.player2?.playerName || 'Player 2'}
                          </Text>
                          {(() => {
                            const winnerId = match.result?.winner?.playerId?.toString() ||
                              match.result?.winner?.playerId?._id?.toString() ||
                              match.result?.winner?.playerId;
                            const player2Id = match.player2?.playerId?.toString() ||
                              match.player2?.playerId?._id?.toString() ||
                              match.player2?.playerId ||
                              match.player2?._id?.toString();
                            const winnerName = match.result?.winner?.playerName || match.result?.winner?.userName;
                            const player2Name = match.player2?.playerName || match.player2?.userName;

                            const isWinner = (winnerId && player2Id && winnerId === player2Id) ||
                              (winnerName && player2Name && winnerName === player2Name);

                            return isWinner && match.status === 'COMPLETED';
                          })() && (
                              <View style={styles.unifiedWinnerBadge}>
                                <Icon name="trophy" size={10} color="#FFD700" />
                                <Text style={styles.unifiedWinnerBadgeText}>W</Text>
                              </View>
                            )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="calendar" size={32} color="#CCC" />
                    <Text style={styles.emptyStateText}>No matches scheduled yet</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* TOP PLAYERS TAB */}
      {activeSubGroupTab === "Top Players" && (
        <View style={styles.tabContent}>
          {round2Groups.length > 0 ? (
            <>
              {/* Round 2 Group Selection Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupTabsContainer}>
                {round2Groups.map((group, index) => (
                  <TouchableOpacity
                    key={group._id}
                    onPress={() => setActiveRound2Group(group._id)}
                    style={[
                      styles.groupTab,
                      activeRound2Group === group._id && styles.activeGroupTab
                    ]}
                  >
                    <Text style={[
                      styles.groupTabText,
                      activeRound2Group === group._id && styles.activeGroupTabText
                    ]}>
                      {group.groupName || `Round 2 Group ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Round 2 Group Content */}
              {currentRound2Group && (
                <View style={styles.groupContent}>
                  <Text style={styles.groupTitle}>
                    {currentRound2Group.groupName || `Round 2 Group ${round2Groups.indexOf(currentRound2Group) + 1}`}
                  </Text>

                  {/* Round 2 Players List */}
                  <View style={styles.playersContainer}>
                    <Text style={styles.sectionTitle}>
                      <Icon name="star" size={16} color="#FFD700" /> Top Players
                    </Text>

                    <View style={styles.playersList}>
                      {(currentRound2Group.players || []).map((player, index) => (
                        <View key={player._id || index} style={styles.playerCard}>
                          <View style={styles.playerRank}>
                            <Text style={styles.rankText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.topPlayerName}>
                            {player.userName || player.playerName || `Player ${index + 1}`}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Round 2 Matches */}
                  <View style={styles.matchesContainer}>
                    <Text style={styles.sectionTitle}>
                      <Icon name="gamepad" size={16} color="#1D6A8B" /> Round 2 Matches
                    </Text>

                    {(round2MatchesData[activeRound2Group] || []).length > 0 ? (
                      (round2MatchesData[activeRound2Group] || []).map((match, index) => (
                        <TouchableOpacity
                          key={match._id || index}
                          style={styles.unifiedMatchCard}
                          onPress={() => {
                            setSelectedMatch(match);
                            setShowMatchDetails(true);
                          }}
                        >
                          {/* 🔥 UNIFIED MATCH HEADER */}
                          <View style={styles.unifiedMatchHeader}>
                            <View style={styles.matchTypeContainer}>
                              <Icon name="star" size={14} color="#FFD700" />
                              <Text style={styles.unifiedMatchType}>Round 2 - Top Players Match</Text>
                            </View>
                            {/* 🚀 NAVIGATION SERIAL NUMBER */}
                            <View style={styles.serialNumberContainer}>
                              <Text style={styles.serialNumberText}>#{index + 1}</Text>
                            </View>
                            <View style={[styles.unifiedStatusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                              <Text style={styles.unifiedStatusText}>{match.status || 'SCHEDULED'}</Text>
                            </View>
                          </View>

                          {/* 🎯 ENHANCED MATCH INFO ROW */}
                          <View style={styles.matchInfoRow}>
                            {match.courtNumber && (
                              <View style={styles.matchInfoItem}>
                                <Icon name="map-marker" size={12} color="#6C757D" />
                                <Text style={styles.matchInfoText}>Court {match.courtNumber}</Text>
                              </View>
                            )}
                            {match.matchStartTime && (
                              <View style={styles.matchInfoItem}>
                                <Icon name="clock-o" size={12} color="#6C757D" />
                                <Text style={styles.matchInfoText}>
                                  {new Date(match.matchStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                              </View>
                            )}
                            {match.result?.finalScore && (
                              <View style={styles.matchInfoItem}>
                                <Icon name="bar-chart" size={12} color="#FF6400" />
                                <Text style={styles.matchInfoText}>
                                  {(() => { const r = readMatchResult(match); return r ? `${r.player1Score}-${r.player2Score}` : '0-0'; })()}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* 🔥 UNIFIED PLAYER DISPLAY */}
                          <View style={styles.unifiedMatchPlayers}>
                            <View style={styles.unifiedPlayer}>
                              <Text style={styles.unifiedPlayerName}>
                                {match.player1?.userName || match.player1?.playerName || 'Player 1'}
                              </Text>
                              {(() => {
                                const winnerId = match.result?.winner?.playerId?.toString() ||
                                  match.result?.winner?.playerId?._id?.toString() ||
                                  match.result?.winner?.playerId;
                                const player1Id = match.player1?.playerId?.toString() ||
                                  match.player1?.playerId?._id?.toString() ||
                                  match.player1?.playerId ||
                                  match.player1?._id?.toString();
                                const winnerName = match.result?.winner?.playerName || match.result?.winner?.userName;
                                const player1Name = match.player1?.playerName || match.player1?.userName;

                                const isWinner = (winnerId && player1Id && winnerId === player1Id) ||
                                  (winnerName && player1Name && winnerName === player1Name);

                                return isWinner && match.status === 'COMPLETED';
                              })() && (
                                  <View style={styles.unifiedWinnerBadge}>
                                    <Icon name="trophy" size={10} color="#FFD700" />
                                    <Text style={styles.unifiedWinnerBadgeText}>W</Text>
                                  </View>
                                )}
                            </View>

                            <View style={styles.unifiedVsContainer}>
                              <Text style={styles.unifiedVsText}>VS</Text>
                            </View>

                            <View style={styles.unifiedPlayer}>
                              <Text style={styles.unifiedPlayerName}>
                                {match.player2?.userName || match.player2?.playerName || 'Player 2'}
                              </Text>
                              {(() => {
                                const winnerId = match.result?.winner?.playerId?.toString() ||
                                  match.result?.winner?.playerId?._id?.toString() ||
                                  match.result?.winner?.playerId;
                                const player2Id = match.player2?.playerId?.toString() ||
                                  match.player2?.playerId?._id?.toString() ||
                                  match.player2?.playerId ||
                                  match.player2?._id?.toString();
                                const winnerName = match.result?.winner?.playerName || match.result?.winner?.userName;
                                const player2Name = match.player2?.playerName || match.player2?.userName;

                                const isWinner = (winnerId && player2Id && winnerId === player2Id) ||
                                  (winnerName && player2Name && winnerName === player2Name);

                                return isWinner && match.status === 'COMPLETED';
                              })() && (
                                  <View style={styles.unifiedWinnerBadge}>
                                    <Icon name="trophy" size={10} color="#FFD700" />
                                    <Text style={styles.unifiedWinnerBadgeText}>W</Text>
                                  </View>
                                )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyState}>
                        <Icon name="calendar" size={32} color="#CCC" />
                        <Text style={styles.emptyStateText}>No Round 2 matches scheduled yet</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </>
          ) : (
            // Show different messages based on tournament mode
            tournamentMode === "direct-knockout" ? (
              <View style={styles.directKnockoutMessage}>
                <Icon name="trophy" size={48} color="#E67E22" />
                <Text style={styles.directKnockoutTitle}>Direct Knockout Tournament</Text>
                <Text style={styles.directKnockoutText}>
                  This tournament is running in Direct Knockout mode. Players proceed directly to knockout rounds without Round 2 groups.
                </Text>
                <Text style={styles.directKnockoutInstruction}>
                  Check the Knockout tab to see tournament brackets and matches.
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="users" size={48} color="#CCC" />
                <Text style={styles.emptyStateTitle}>No Top Players Groups Yet</Text>
                <Text style={styles.emptyStateText}>
                  Round 2 groups will appear here once Top Players are selected and groups are created.
                </Text>
                <Text style={styles.emptyStateInstruction}>
                  Go to Registered Players → Select Top Players → Create Round 2 Groups
                </Text>
              </View>
            )
          )}
        </View>
      )}

      {/* KNOCKOUT TAB */}
      {activeSubGroupTab === "Knockout" && (
        <View style={styles.tabContent}>
          {Object.keys(knockoutMatchesByRound).length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="flag" size={48} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No Knockout Matches</Text>
              <Text style={styles.emptyStateText}>
                Knockout matches will appear once group stages are completed
              </Text>
            </View>
          ) : (
            <View style={styles.knockoutContainer}>
              <Text style={styles.sectionTitle}>
                <Icon name="trophy" size={16} color="#FFD700" />
                {tournamentMode === "direct-knockout" ? "Direct Knockout Matches" : "Knockout Matches"}
              </Text>

              {Object.entries(knockoutMatchesByRound).map(([round, matches]) => {
                // Filter matches based on tournament mode
                const filteredMatches = tournamentMode === "direct-knockout"
                  ? matches.filter(match => match.type === 'direct-knockout')
                  : matches.filter(match => match.type === 'supermatch' || match.type === 'super-knockout'); // Show SuperMatch knockout matches

                // Skip empty rounds
                if (filteredMatches.length === 0) return null;

                return (
                  <View key={round} style={styles.roundContainer}>
                    <Text style={styles.roundTitle}>
                      {round.charAt(0).toUpperCase() + round.slice(1)}
                    </Text>

                    {filteredMatches.map((match, index) => (
                      <TouchableOpacity
                        key={match._id || index}
                        style={styles.unifiedMatchCard}
                        onPress={() => {
                          setSelectedMatch(match);
                          setShowMatchDetails(true);
                        }}
                      >
                        {/* 🔥 UNIFIED MATCH HEADER */}
                        <View style={styles.unifiedMatchHeader}>
                          <View style={styles.matchTypeContainer}>
                            <Icon name="trophy" size={14} color="#FFD700" />
                            <Text style={styles.unifiedMatchType}>
                              {match.type === 'direct-knockout' ? 'Direct Knockout' : 'Super Match'}
                            </Text>
                          </View>
                          {/* 🚀 NAVIGATION SERIAL NUMBER */}
                          <View style={styles.serialNumberContainer}>
                            <Text style={styles.serialNumberText}>#{index + 1}</Text>
                          </View>
                          <View style={[styles.unifiedStatusBadge, { backgroundColor: getStatusColor(match.status) }]}>
                            <Text style={styles.unifiedStatusText}>{match.status || 'SCHEDULED'}</Text>
                          </View>
                        </View>

                        {/* 🎯 ENHANCED MATCH INFO ROW */}
                        <View style={styles.matchInfoRow}>
                          {match.courtNumber && (
                            <View style={styles.matchInfoItem}>
                              <Icon name="map-marker" size={12} color="#6C757D" />
                              <Text style={styles.matchInfoText}>Court {match.courtNumber}</Text>
                            </View>
                          )}
                          {match.matchStartTime && (
                            <View style={styles.matchInfoItem}>
                              <Icon name="clock-o" size={12} color="#6C757D" />
                              <Text style={styles.matchInfoText}>
                                {new Date(match.matchStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                          )}
                          {match.result?.finalScore && (
                            <View style={styles.matchInfoItem}>
                              <Icon name="bar-chart" size={12} color="#FF6400" />
                              <Text style={styles.matchInfoText}>
                                {(() => { const r = readMatchResult(match); return r ? `${r.player1Score}-${r.player2Score}` : '0-0'; })()}
                              </Text>
                            </View>
                          )}
                          {match.round && (
                            <View style={styles.matchInfoItem}>
                              <Icon name="flag" size={12} color="#E67E22" />
                              <Text style={styles.matchInfoText}>{match.round}</Text>
                            </View>
                          )}
                        </View>

                        {/* 🔥 UNIFIED PLAYER DISPLAY */}
                        <View style={styles.unifiedMatchPlayers}>
                          <View style={styles.unifiedPlayer}>
                            <Text style={styles.unifiedPlayerName}>
                              {match.player1?.playerName || match.player1?.userName || 'TBD'}
                            </Text>
                            {(() => {
                              // 🔥 ROBUST WINNER DETECTION FOR ALL MATCH TYPES

                              // DirectKnockout: match.result.winner structure
                              const directWinnerId = match.result?.winner?.playerId?.toString() ||
                                match.result?.winner?.playerId?._id?.toString() ||
                                match.result?.winner?.playerId;
                              const directWinnerName = match.result?.winner?.playerName || match.result?.winner?.userName;

                              // SuperMatch: match.winner structure
                              const superWinnerId = match.winner?.playerId?.toString() ||
                                match.winner?.playerId?._id?.toString() ||
                                match.winner?.playerId;
                              const superWinnerName = match.winner?.playerName || match.winner?.userName;

                              const player1Id = match.player1?.playerId?.toString() ||
                                match.player1?.playerId?._id?.toString() ||
                                match.player1?.playerId ||
                                match.player1?._id?.toString();
                              const player1Name = match.player1?.playerName || match.player1?.userName;

                              // Check all possible winner structures
                              const isWinner =
                                // DirectKnockout ID match (when both IDs exist)
                                (directWinnerId && player1Id && directWinnerId === player1Id) ||
                                // DirectKnockout name match (always check names as fallback)
                                (directWinnerName && player1Name && directWinnerName === player1Name) ||
                                // SuperMatch ID match (when both IDs exist)
                                (superWinnerId && player1Id && superWinnerId === player1Id) ||
                                // SuperMatch name match (always check names as fallback)
                                (superWinnerName && player1Name && superWinnerName === player1Name);

                              return isWinner && (match.status === 'COMPLETED' || match.status === 'completed');
                            })() && (
                                <View style={styles.unifiedWinnerBadge}>
                                  <Icon name="trophy" size={10} color="#FFD700" />
                                  <Text style={styles.unifiedWinnerBadgeText}>W</Text>
                                </View>
                              )}
                          </View>

                          <View style={styles.unifiedVsContainer}>
                            <Text style={styles.unifiedVsText}>VS</Text>
                          </View>

                          <View style={styles.unifiedPlayer}>
                            <Text style={styles.unifiedPlayerName}>
                              {match.player2?.playerName || match.player2?.userName || 'TBD'}
                            </Text>
                            {(() => {
                              // 🔥 ROBUST WINNER DETECTION FOR ALL MATCH TYPES

                              // DirectKnockout: match.result.winner structure
                              const directWinnerId = match.result?.winner?.playerId?.toString() ||
                                match.result?.winner?.playerId?._id?.toString() ||
                                match.result?.winner?.playerId;
                              const directWinnerName = match.result?.winner?.playerName || match.result?.winner?.userName;

                              // SuperMatch: match.winner structure
                              const superWinnerId = match.winner?.playerId?.toString() ||
                                match.winner?.playerId?._id?.toString() ||
                                match.winner?.playerId;
                              const superWinnerName = match.winner?.playerName || match.winner?.userName;

                              const player2Id = match.player2?.playerId?.toString() ||
                                match.player2?.playerId?._id?.toString() ||
                                match.player2?.playerId ||
                                match.player2?._id?.toString();
                              const player2Name = match.player2?.playerName || match.player2?.userName;

                              // Check all possible winner structures
                              const isWinner =
                                // DirectKnockout ID match
                                (directWinnerId && player2Id && directWinnerId === player2Id) ||
                                // DirectKnockout name match
                                (directWinnerName && player2Name && directWinnerName === player2Name) ||
                                // SuperMatch ID match
                                (superWinnerId && player2Id && superWinnerId === player2Id) ||
                                // SuperMatch name match
                                (superWinnerName && player2Name && superWinnerName === player2Name);

                              return isWinner && (match.status === 'COMPLETED' || match.status === 'completed');
                            })() && (
                                <View style={styles.unifiedWinnerBadge}>
                                  <Icon name="trophy" size={10} color="#FFD700" />
                                  <Text style={styles.unifiedWinnerBadgeText}>W</Text>
                                </View>
                              )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Match Details Modal */}
      <Modal
        visible={showMatchDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMatchDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMatchDetails(false)}
              >
                <Icon name="times" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedMatch && (
              <ScrollView style={styles.modalBody}>
                {/* Match Type & Status */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                      {selectedMatch.type === 'direct-knockout' ? 'Direct Knockout' :
                        selectedMatch.type === 'super-knockout' ? 'Super Match' :
                          'Group Match'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedMatch.status) }]}>
                      <Text style={styles.statusText}>{selectedMatch.status || 'SCHEDULED'}</Text>
                    </View>
                  </View>
                </View>

                {/* 🔥 LIVE SCORE SECTION - The star of the show! */}
                {(selectedMatch.status === 'IN_PROGRESS' || selectedMatch.status === 'COMPLETED') && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>
                      <Icon name="trophy" size={16} color="#FFD700" />
                      {selectedMatch.status === 'IN_PROGRESS' ? ' Live Score' : ' Final Score'}
                    </Text>

                    {/* Current/Final Set Score */}
                    <View style={styles.scoreBoard}>
                      <View style={styles.scoreRow}>
                        <Text style={styles.playerScoreName}>
                          {selectedMatch.player1?.userName || selectedMatch.player1?.playerName || 'Player 1'}
                        </Text>
                        <Text style={styles.setScore}>
                          {(() => { const r = readMatchResult(selectedMatch); return r?.player1Score || 0; })()}
                        </Text>
                      </View>
                      <View style={styles.scoreRow}>
                        <Text style={styles.playerScoreName}>
                          {selectedMatch.player2?.userName || selectedMatch.player2?.playerName || 'Player 2'}
                        </Text>
                        <Text style={styles.setScore}>
                          {(() => { const r = readMatchResult(selectedMatch); return r?.player2Score || 0; })()}
                        </Text>
                      </View>
                    </View>

                    {/* Live Game Score (if in progress) */}
                    {selectedMatch.status === 'IN_PROGRESS' && selectedMatch.liveScore && (
                      <View style={styles.liveScoreContainer}>
                        <Text style={styles.liveScoreTitle}>Current Game</Text>
                        <View style={styles.liveScoreRow}>
                          <Text style={styles.liveScoreValue}>{selectedMatch.liveScore.player1Points || 0}</Text>
                          <Text style={styles.liveScoreSeparator}>-</Text>
                          <Text style={styles.liveScoreValue}>{selectedMatch.liveScore.player2Points || 0}</Text>
                        </View>
                        <Text style={styles.liveScoreInfo}>
                          {getLiveLabel(selectedMatch)}
                        </Text>
                      </View>
                    )}

                    {/* Set-by-Set Breakdown */}
                    {(selectedMatch.sets?.length > 0 || selectedMatch.score?.setScores?.length > 0) && (
                      <View style={styles.setsBreakdown}>
                        <Text style={styles.setsTitle}>{(() => { const r = readMatchResult(selectedMatch); return r?.labels?.round || "Round"; })()} Breakdown</Text>
                        {(selectedMatch.sets || selectedMatch.score?.setScores || []).map((set, index) => (
                          <View key={index} style={styles.setRow}>
                            <Text style={styles.setLabel}>{(() => { const r = readMatchResult(selectedMatch); return r?.labels?.round || "Round"; })()} {set.setNumber || index + 1}</Text>
                            <View style={styles.setScores}>
                              <Text style={styles.setScoreText}>
                                {set.games?.reduce((total, game) =>
                                  total + (game.winner?.playerId === selectedMatch.player1?.playerId ? 1 : 0), 0) ||
                                  set.player1Score || 0}
                              </Text>
                              <Text style={styles.setScoreSeparator}>-</Text>
                              <Text style={styles.setScoreText}>
                                {set.games?.reduce((total, game) =>
                                  total + (game.winner?.playerId === selectedMatch.player2?.playerId ? 1 : 0), 0) ||
                                  set.player2Score || 0}
                              </Text>
                            </View>
                            {set.winner && (
                              <Icon name="check-circle" size={14} color="#28A745" />
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>
                    <Icon name="bar-chart" size={16} color="#1D6A8B" /> Player Statistics
                  </Text>

                  <ScrollView
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    style={styles.statsOverviewContainer}
                    contentContainerStyle={styles.statsScrollContent}
                  >
                    <View style={styles.playerStatsCard}>
                      <View style={styles.playerStatsHeader}>
                        <Icon name="user" size={16} color="#1D6A8B" />
                        <Text style={styles.playerStatsName}>
                          {selectedMatch.player1?.userName || selectedMatch.player1?.playerName || 'Player 1'}
                        </Text>
                      </View>
                      <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{(() => { const r = readMatchResult(selectedMatch); return (r?.labels?.result || "Rounds") + " Won"; })()}</Text>
                          <Text style={styles.statValue}>
                            {selectedMatch.statistics?.player1Stats?.setsWon ||
                              (() => { const r = readMatchResult(selectedMatch); return r?.player1Score; })() ||
                              selectedMatch.sets?.filter(set => {
                                if (set.winner?.playerId && selectedMatch.player1?.playerId) {
                                  return set.winner.playerId.toString() === selectedMatch.player1.playerId.toString();
                                }
                                return set.winner?.playerName === selectedMatch.player1?.playerName;
                              })?.length || 0}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{(() => { const r = readMatchResult(selectedMatch); return (r?.labels?.score || "Score"); })()}</Text>
                          <Text style={styles.statValue}>
                            {selectedMatch.statistics?.player1Stats?.gamesWon ||
                              selectedMatch.sets?.reduce((total, set) =>
                                total + (set.games?.filter(game => {
                                  if (game.winner?.playerId && selectedMatch.player1?.playerId) {
                                    return game.winner.playerId.toString() === selectedMatch.player1.playerId.toString();
                                  }
                                  return game.winner?.playerName === selectedMatch.player1?.playerName;
                                })?.length || 0), 0) || 0}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Total Points</Text>
                          <Text style={styles.statValue}>
                            {selectedMatch.statistics?.player1Stats?.totalPoints ||
                              selectedMatch.sets?.reduce((total, set) =>
                                total + (set.games?.reduce((gameTotal, game) =>
                                  gameTotal + (game.finalScore?.player1 || 0), 0) || 0), 0) || 0}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Avg Points/Game</Text>
                          <Text style={styles.statValue}>
                            {(() => {
                              const totalGames = selectedMatch.sets?.reduce((total, set) => total + (set.games?.length || 0), 0) || 0;
                              const totalPoints = selectedMatch.statistics?.player1Stats?.totalPoints ||
                                selectedMatch.sets?.reduce((total, set) =>
                                  total + (set.games?.reduce((gameTotal, game) =>
                                    gameTotal + (game.finalScore?.player1 || 0), 0) || 0), 0) || 0;
                              return totalGames > 0 ? Math.round((totalPoints / totalGames) * 10) / 10 : 0;
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.vsStatsDivider}>
                      <Text style={styles.vsStatsText}>VS</Text>
                    </View>

                    <View style={styles.playerStatsCard}>
                      <View style={styles.playerStatsHeader}>
                        <Icon name="user" size={16} color="#1D6A8B" />
                        <Text style={styles.playerStatsName}>
                          {selectedMatch.player2?.userName || selectedMatch.player2?.playerName || 'Player 2'}
                        </Text>
                      </View>
                      <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{(() => { const r = readMatchResult(selectedMatch); return (r?.labels?.result || "Rounds") + " Won"; })()}</Text>
                          <Text style={styles.statValue}>
                            {selectedMatch.statistics?.player2Stats?.setsWon ||
                              (() => { const r = readMatchResult(selectedMatch); return r?.player2Score; })() || 0}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{(() => { const r = readMatchResult(selectedMatch); return (r?.labels?.score || "Score"); })()}</Text>
                          <Text style={styles.statValue}>
                            {selectedMatch.statistics?.player2Stats?.gamesWon ||
                              selectedMatch.sets?.reduce((total, set) =>
                                total + (set.games?.filter(game => {
                                  if (game.winner?.playerId && selectedMatch.player2?.playerId) {
                                    return game.winner.playerId.toString() === selectedMatch.player2.playerId.toString();
                                  }
                                  return game.winner?.playerName === selectedMatch.player2?.playerName;
                                })?.length || 0), 0) || 0}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Total Points</Text>
                          <Text style={styles.statValue}>
                            {selectedMatch.statistics?.player2Stats?.totalPoints ||
                              selectedMatch.sets?.reduce((total, set) =>
                                total + (set.games?.reduce((gameTotal, game) =>
                                  gameTotal + (game.finalScore?.player2 || 0), 0) || 0), 0) || 0}
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Avg Points/Game</Text>
                          <Text style={styles.statValue}>
                            {(() => {
                              const totalGames = selectedMatch.sets?.reduce((total, set) => total + (set.games?.length || 0), 0) || 0;
                              const totalPoints = selectedMatch.statistics?.player2Stats?.totalPoints ||
                                selectedMatch.sets?.reduce((total, set) =>
                                  total + (set.games?.reduce((gameTotal, game) =>
                                    gameTotal + (game.finalScore?.player2 || 0), 0) || 0), 0) || 0;
                              return totalGames > 0 ? Math.round((totalPoints / totalGames) * 10) / 10 : 0;
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  {/* 🎯 DETAILED NESTED SCORE DATA - Sets > Games > Points */}
                  {selectedMatch.sets?.length > 0 && (
                    <View style={styles.nestedScoreContainer}>
                      <Text style={styles.nestedScoreTitle}>
                        <Icon name="list-ol" size={14} color="#FF6400" /> Detailed Score Breakdown
                      </Text>

                      {selectedMatch.sets.map((set, setIndex) => (
                        <View key={setIndex} style={styles.setDetailCard}>
                          <View style={styles.setDetailHeader}>
                            <View style={styles.setDetailTitleRow}>
                              <Icon name="trophy" size={14} color="#1D6A8B" />
                              <Text style={styles.setDetailTitle}>Set {set.setNumber || setIndex + 1}</Text>
                              {set.status === 'COMPLETED' && set.winner && (
                                <View style={styles.setWinnerBadge}>
                                  <Icon name="crown" size={10} color="#FFD700" />
                                  <Text style={styles.setWinnerText}>
                                    {set.winner.playerName ||
                                      (set.winner.playerId?.toString() === selectedMatch.player1?.playerId?.toString() ?
                                        selectedMatch.player1?.playerName : selectedMatch.player2?.playerName) || 'Winner'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.setDetailStatus}>
                              Status: {set.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                            </Text>
                          </View>

                          {/* Games within this Set */}
                          {set.games?.length > 0 && (
                            <View style={styles.gamesContainer}>
                              <Text style={styles.gamesTitle}>Games:</Text>
                              {set.games.map((game, gameIndex) => (
                                <View key={gameIndex} style={styles.gameDetailRow}>
                                  <View style={styles.gameNumberContainer}>
                                    <Text style={styles.gameNumber}>G{game.gameNumber || gameIndex + 1}</Text>
                                  </View>
                                  <View style={styles.gameScoreContainer}>
                                    <Text style={styles.gameScore}>
                                      {game.finalScore?.player1 || 0} - {game.finalScore?.player2 || 0}
                                    </Text>
                                  </View>
                                  {game.winner && (
                                    <View style={styles.gameWinnerContainer}>
                                      <Icon name="check" size={10} color="#28A745" />
                                      <Text style={styles.gameWinnerText}>
                                        {game.winner.playerName ||
                                          (game.winner.playerId?.toString() === selectedMatch.player1?.playerId?.toString() ?
                                            'P1' : 'P2')}
                                      </Text>
                                    </View>
                                  )}
                                  <Text style={styles.gameStatus}>
                                    {game.status === 'COMPLETED' ? '✓' : '⏸'}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Set Summary */}
                          <View style={styles.setSummaryContainer}>
                            <View style={styles.setSummaryRow}>
                              <Text style={styles.setSummaryLabel}>Games Won:</Text>
                              <Text style={styles.setSummaryValue}>
                                {set.games?.filter(g => {
                                  if (g.winner?.playerId && selectedMatch.player1?.playerId) {
                                    return g.winner.playerId.toString() === selectedMatch.player1.playerId.toString();
                                  }
                                  return g.winner?.playerName === selectedMatch.player1?.playerName;
                                })?.length || 0} - {' '}
                                {set.games?.filter(g => {
                                  if (g.winner?.playerId && selectedMatch.player2?.playerId) {
                                    return g.winner.playerId.toString() === selectedMatch.player2.playerId.toString();
                                  }
                                  return g.winner?.playerName === selectedMatch.player2?.playerName;
                                })?.length || 0}
                              </Text>
                            </View>
                            <View style={styles.setSummaryRow}>
                              <Text style={styles.setSummaryLabel}>Total Points:</Text>
                              <Text style={styles.setSummaryValue}>
                                {set.games?.reduce((total, game) => total + (game.finalScore?.player1 || 0), 0) || 0} - {' '}
                                {set.games?.reduce((total, game) => total + (game.finalScore?.player2 || 0), 0) || 0}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* 🔥 MATCH FORMAT INFO — sport-aware labels */}
                {selectedMatch.matchFormat && (() => {
                  const mfmt = selectedMatch.matchFormat;
                  const r = readMatchResult(selectedMatch);
                  const labels = r?.labels || {};
                  const st = mfmt.scoringType;
                  const isSetBased = st === "sets" || (!st && mfmt.totalSets > 1);
                  const isTimeBased = st === "time";
                  const isInnings = st === "innings";
                  return (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>
                      <Icon name="cog" size={16} color="#6C757D" /> Match Format
                    </Text>
                    <View style={styles.formatGrid}>
                      {isSetBased && mfmt.setsToWin && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>{labels.round || "Sets"} to Win</Text>
                        <Text style={styles.formatValue}>{mfmt.setsToWin}</Text>
                      </View>
                      )}
                      {isSetBased && mfmt.gamesToWin && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>{labels.subRound || "Games"} to Win</Text>
                        <Text style={styles.formatValue}>{mfmt.gamesToWin}</Text>
                      </View>
                      )}
                      {isSetBased && mfmt.pointsToWinGame && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>{labels.score || "Points"} per {labels.subRound || "Game"}</Text>
                        <Text style={styles.formatValue}>{mfmt.pointsToWinGame}</Text>
                      </View>
                      )}
                      {isSetBased && mfmt.marginToWin && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>Win Margin</Text>
                        <Text style={styles.formatValue}>{mfmt.marginToWin}</Text>
                      </View>
                      )}
                      {isTimeBased && mfmt.halvesCount && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>Halves</Text>
                        <Text style={styles.formatValue}>{mfmt.halvesCount}</Text>
                      </View>
                      )}
                      {isTimeBased && mfmt.halvesDuration && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>Duration (min)</Text>
                        <Text style={styles.formatValue}>{mfmt.halvesDuration}</Text>
                      </View>
                      )}
                      {isInnings && mfmt.oversCount && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>Overs</Text>
                        <Text style={styles.formatValue}>{mfmt.oversCount}</Text>
                      </View>
                      )}
                      {isInnings && mfmt.inningsCount && (
                      <View style={styles.formatItem}>
                        <Text style={styles.formatLabel}>Innings</Text>
                        <Text style={styles.formatValue}>{mfmt.inningsCount}</Text>
                      </View>
                      )}
                    </View>
                  </View>
                  );
                })()}

                {/* Players */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Players</Text>
                  <View style={styles.playersContainer}>
                    <View style={styles.playerDetail}>
                      <Icon name="user" size={16} color="#1D6A8B" />
                      <Text style={styles.playerDetailName}>
                        {selectedMatch.player1?.userName || selectedMatch.player1?.playerName || 'Player 1'}
                      </Text>
                      {((selectedMatch.type === 'direct-knockout' && (() => {
                        // 🔥 ROBUST WINNER DETECTION - Handle different data structures
                        const winnerId = selectedMatch.result?.winner?.playerId?.toString() ||
                          selectedMatch.result?.winner?.playerId?._id?.toString() ||
                          selectedMatch.result?.winner?.playerId;

                        const player1Id = selectedMatch.player1?.playerId?.toString() ||
                          selectedMatch.player1?.playerId?._id?.toString() ||
                          selectedMatch.player1?.playerId ||
                          selectedMatch.player1?._id?.toString();

                        return winnerId && player1Id && winnerId === player1Id;
                      })()) ||
                        (selectedMatch.status === 'COMPLETED' && selectedMatch.winner &&
                          (typeof selectedMatch.winner === 'object' ?
                            selectedMatch.winner.playerName === selectedMatch.player1?.playerName :
                            selectedMatch.winner === selectedMatch.player1?.playerName))) && (
                          <View style={styles.winnerBadgeSmall}>
                            <Icon name="trophy" size={12} color="#FFD700" />
                            <Text style={styles.winnerBadgeText}>Winner</Text>
                          </View>
                        )}
                    </View>

                    <Text style={styles.vsTextLarge}>VS</Text>

                    <View style={styles.playerDetail}>
                      <Icon name="user" size={16} color="#1D6A8B" />
                      <Text style={styles.playerDetailName}>
                        {selectedMatch.player2?.userName || selectedMatch.player2?.playerName || 'Player 2'}
                      </Text>
                      {((selectedMatch.type === 'direct-knockout' && (() => {
                        // 🔥 ROBUST WINNER DETECTION - Handle different data structures
                        const winnerId = selectedMatch.result?.winner?.playerId?.toString() ||
                          selectedMatch.result?.winner?.playerId?._id?.toString() ||
                          selectedMatch.result?.winner?.playerId;

                        const player2Id = selectedMatch.player2?.playerId?.toString() ||
                          selectedMatch.player2?.playerId?._id?.toString() ||
                          selectedMatch.player2?.playerId ||
                          selectedMatch.player2?._id?.toString();

                        return winnerId && player2Id && winnerId === player2Id;
                      })()) ||
                        (selectedMatch.status === 'COMPLETED' && selectedMatch.winner &&
                          (typeof selectedMatch.winner === 'object' ?
                            selectedMatch.winner.playerName === selectedMatch.player2?.playerName :
                            selectedMatch.winner === selectedMatch.player2?.playerName))) && (
                          <View style={styles.winnerBadgeSmall}>
                            <Icon name="trophy" size={12} color="#FFD700" />
                            <Text style={styles.winnerBadgeText}>Winner</Text>
                          </View>
                        )}
                    </View>
                  </View>
                </View>

                {/* Match Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Match Information</Text>

                  {selectedMatch.courtNumber && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Court:</Text>
                      <Text style={styles.detailValue}>{selectedMatch.courtNumber}</Text>
                    </View>
                  )}

                  {selectedMatch.round && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Round:</Text>
                      <Text style={styles.detailValue}>{selectedMatch.round}</Text>
                    </View>
                  )}

                  {selectedMatch.position && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Position:</Text>
                      <Text style={styles.detailValue}>{selectedMatch.position}</Text>
                    </View>
                  )}

                  {selectedMatch.createdAt && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedMatch.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Winner Section */}
                {selectedMatch.status === 'COMPLETED' && selectedMatch.winner && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Result</Text>
                    <View style={styles.winnerSection}>
                      <Icon name="trophy" size={20} color="#FFD700" />
                      <Text style={styles.winnerDetailText}>
                        Winner: {typeof selectedMatch.winner === 'object' ?
                          (selectedMatch.winner.playerName || selectedMatch.winner.name || selectedMatch.winner.userName || 'Unknown') :
                          selectedMatch.winner}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// Helper function to get status colors
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return '#28A745';
    case 'in_progress':
    case 'in-progress':
      return '#FFC107';
    case 'scheduled':
      return '#6C757D';
    default:
      return '#6C757D';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1D6A8B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#EDEAEB',
    backgroundColor: '#EDEAEB',
  },
  activeTab: {
    borderColor: '#1D6A8B',
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  groupTabsContainer: {
    marginBottom: 16,
  },
  groupTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#E9ECEF',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  activeGroupTab: {
    backgroundColor: '#1D6A8B',
    borderColor: '#1D6A8B',
  },
  groupTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  activeGroupTabText: {
    color: '#FFF',
  },
  groupContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchesContainer: {
    marginTop: 16,
  },
  matchCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  knockoutMatchCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDD835',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  matchPlayers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  player: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginHorizontal: 8,
  },
  winnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28A745',
    marginLeft: 4,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28A745',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  winnerBadgeText: {
    fontSize: 10,
    color: '#FFF',
    marginLeft: 2,
  },
  courtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  courtText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  playersContainer: {
    marginBottom: 16,
  },
  playersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  topPlayerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  knockoutContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  roundContainer: {
    marginBottom: 20,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // 🔥 Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  playersContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  playerDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    width: '100%',
    justifyContent: 'space-between',
  },
  playerDetailName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  vsTextLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D6A8B',
    marginVertical: 8,
  },
  winnerBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  winnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  winnerDetailText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },

  // 🔥 Enhanced Scoring & Statistics Styles
  scoreBoard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  playerScoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  setScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D6A8B',
    minWidth: 40,
    textAlign: 'center',
  },
  liveScoreContainer: {
    backgroundColor: '#28A745',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  liveScoreTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveScoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    minWidth: 30,
    textAlign: 'center',
  },
  liveScoreSeparator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginHorizontal: 8,
  },
  liveScoreInfo: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 4,
  },
  setsBreakdown: {
    marginTop: 16,
  },
  setsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  setScores: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  setScoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 25,
    textAlign: 'center',
  },
  setScoreSeparator: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 8,
  },
  statsContainer: {
    marginTop: 12,
  },
  playerStatsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 6, // Space between cards for scroll
    borderWidth: 1,
    borderColor: '#E9ECEF',
    width: 280, // 🚀 OPTIMIZED WIDTH for better dual-player scroll
    minWidth: 280, // Ensure consistent width
  },
  playerStatsName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D6A8B',
    marginBottom: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  vsStatsDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20, // 🚀 MORE VERTICAL SPACING for scroll comfort
    paddingHorizontal: 8, // Compact horizontal space
    width: 60, // 🚀 FIXED COMPACT WIDTH for VS divider
  },
  vsStatsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1D6A8B',
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    textAlign: 'center',
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  formatItem: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  formatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D6A8B',
  },
  playersContainer: {
    marginTop: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playersList: {
    marginTop: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  groupPlayerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  directKnockoutMessage: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FEF7E6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F39C12',
    margin: 16,
  },
  directKnockoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E67E22',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  directKnockoutText: {
    fontSize: 16,
    color: '#D68910',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  directKnockoutInstruction: {
    fontSize: 14,
    color: '#B7950B',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyStateInstruction: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // 🔥 ENHANCED PLAYER STATISTICS STYLES
  statsOverviewContainer: {
    marginBottom: 20,
  },

  // 🚀 HORIZONTAL SCROLL CONTENT CONTAINER - Optimized for dual-player view
  statsScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingRight: 20, // Extra padding for scroll comfort
  },
  playerStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  // 🎯 NESTED SCORE DATA STYLES
  nestedScoreContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  nestedScoreTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D6A8B',
    marginBottom: 16,
    textAlign: 'center',
  },
  setDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setDetailHeader: {
    marginBottom: 12,
  },
  setDetailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  setDetailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D6A8B',
    marginLeft: 6,
    flex: 1,
  },
  setWinnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  setWinnerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  setDetailStatus: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  // Game Details Styles
  gamesContainer: {
    marginTop: 12,
  },
  gamesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  gameDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  gameNumberContainer: {
    backgroundColor: '#1D6A8B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
  },
  gameNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
  gameScoreContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  gameScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  gameWinnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gameWinnerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#28A745',
    marginLeft: 2,
  },
  gameStatus: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },

  // Set Summary Styles
  setSummaryContainer: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  setSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  setSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  setSummaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D6A8B',
  },

  // 🚀 UNIFIED MATCH CARD SYSTEM STYLES
  unifiedMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  unifiedMatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  unifiedMatchType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D6A8B',
    marginLeft: 6,
  },

  // 🚀 NAVIGATION SERIAL NUMBER STYLES
  serialNumberContainer: {
    backgroundColor: '#FF6400',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 8,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serialNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  unifiedStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  unifiedStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  matchInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  matchInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchInfoText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6C757D',
    marginLeft: 4,
  },
  unifiedMatchPlayers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unifiedPlayer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  unifiedPlayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  unifiedVsContainer: {
    backgroundColor: '#E9ECEF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 8,
  },
  unifiedVsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C757D',
    textAlign: 'center',
  },
  unifiedWinnerBadge: {
    position: 'absolute',
    top: -8,
    right: 0,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  unifiedWinnerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B8860B',
    marginLeft: 2,
  },
});

export default TournamentViewer;