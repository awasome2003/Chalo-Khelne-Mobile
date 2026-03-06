import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, FontAwesome5, Feather, Ionicons } from '@expo/vector-icons';
import API from '../../api/tournaments';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const TournamentLeaderboardDetail = ({ route, navigation }) => {
  const { tournament, tournamentId, tournamentName, tournamentType } = route.params;

  // STATE MANAGEMENT
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [tournamentStats, setTournamentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // NEW STATE FOR REDESIGN
  const isGroupStage = tournamentType?.toLowerCase() === 'group stage';
  const [viewMode, setViewMode] = useState(isGroupStage ? 'GROUPS' : 'LEADERBOARD');
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupStandings, setGroupStandings] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [filterType, setFilterType] = useState('all');
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [highlightedPlayerId, setHighlightedPlayerId] = useState(null);
  const [highlightedPathIds, setHighlightedPathIds] = useState(new Set());

  // No changes needed to columns, keeping them for the leaderboard view mode

  // DATA FETCHING
  useEffect(() => {
    if (isGroupStage) {
      fetchGroups();
      fetchKnockoutMatches();
    }
    fetchLeaderboardData();
  }, [tournamentType, tournamentId]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const endpoint = `${API.ENDPOINTS.BOOKING_GROUPS.BY_TOURNAMENT(tournamentId)}?mobile=true`;
      const response = await axios.get(endpoint);
      const data = response.data;
      const groups = data.groups || data.data || (Array.isArray(data) ? data : []);
      setGroups(groups);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      if (!isGroupStage) setLoading(false);
    }
  };

  const fetchGroupData = async (groupId) => {
    try {
      setLoadingExtra(true);
      // Fetch Matches
      const matchesResp = await axios.get(`${API.ENDPOINTS.MATCHES.BY_GROUP(tournamentId, groupId)}?mobile=true`);
      const matchesData = matchesResp.data;

      if (matchesData.success) {
        setMatches(matchesData.matches || matchesData.data || []);
      }

      // Fetch Standings - Using BY_TOURNAMENT endpoint as preferred and filtering client-side
      try {
        const standingsResp = await axios.get(API.ENDPOINTS.TOP_PLAYERS.BY_TOURNAMENT(tournamentId));
        const standingsData = standingsResp.data;

        if (standingsData.success) {
          const allTopPlayers = standingsData.data || [];
          // Find the top players document for this specific group
          const groupData = allTopPlayers.find(item => item.groupId === groupId);
          setGroupStandings(groupData?.topPlayers || []);
        }
      } catch (sErr) {
        console.warn('Standings endpoint returned error or not found:', sErr.message);
        setGroupStandings([]);
      }

      setViewMode('MATCHES');
    } catch (err) {
      console.error('Error fetching group data:', err);
    } finally {
      setLoadingExtra(false);
    }
  };

  // Fetch knockout matches - SuperMatch objects support live-state integration
  const fetchKnockoutMatches = async () => {
    try {
      // Fetch both SuperMatch knockout matches AND Direct Knockout matches
      const [superMatchResponse, directKnockoutResponse] = await Promise.all([
        // SuperMatch knockout matches (traditional flow)
        axios.get(API.ENDPOINTS.GROUP_STAGE.KNOCKOUT_MATCHES(tournamentId))
          .catch(err => ({ data: { success: false, matches: [] } })),

        // Direct Knockout matches (new beast system!)
        axios.get(API.ENDPOINTS.PROGRESSION.DIRECT_KNOCKOUT_MATCHES(tournamentId))
          .catch(err => ({ data: { success: false, matches: [] } }))
      ]);

      let allMatches = [];

      // Process SuperMatch knockout matches
      if (superMatchResponse.data.success && superMatchResponse.data.matches?.length > 0) {
        // Enriched mapping for SuperMatches
        const enrichedSuperMatches = superMatchResponse.data.matches.map((match) => {
          let normalizedStatus = match.status;

          // If completed, ensure correct status and winner
          if (match.status === 'completed' && match.winner?.playerName) {
            normalizedStatus = 'completed';
          } else {
            normalizedStatus = match.status || 'scheduled';
          }

          return {
            ...match,
            type: 'super-knockout',
            status: normalizedStatus,
            hasScores: !!match.winner?.playerName || !!match.score?.setScores,
            winnerName: match.winner?.playerName,
          };
        });
        allMatches = [...allMatches, ...enrichedSuperMatches];
      }

      // Process Direct Knockout matches
      if (directKnockoutResponse.data.success && directKnockoutResponse.data.matches?.length > 0) {
        const enrichedDirectMatches = directKnockoutResponse.data.matches.map(match => {
          let normalizedStatus = (match.status || 'scheduled').toLowerCase();
          if (normalizedStatus === 'in_progress') normalizedStatus = 'in-progress';

          return {
            ...match,
            _id: match._id || match.matchId,
            status: normalizedStatus,
            hasScores: normalizedStatus === 'completed' || !!match.result?.winner?.playerId,
            type: 'direct-knockout',
            round: match.round,
            roundNumber: match.roundNumber,
            courtNumber: match.courtNumber, // Map courtNumber
            score: { // Map scores for unified rendering
              player1Sets: match.result?.finalScore?.player1Sets ?? match.result?.player1Sets ?? 0,
              player2Sets: match.result?.finalScore?.player2Sets ?? match.result?.player2Sets ?? 0
            },
            player1: match.player1,
            player2: match.player2,
            winnerName: match.result?.winner?.playerName || match.winner,
          };
        });
        allMatches = [...allMatches, ...enrichedDirectMatches];
      }

      // Sort all matches: first by roundNumber (ascending), then by matchNumber
      // Assuming 'pre-quarter' = 1, 'quarter-final' = 2, 'semi-final' = 3, 'final' = 4 if roundNumber exists
      // If roundNumber is missing, we might need a map or just rely on creation order
      allMatches.sort((a, b) => {
        if (a.roundNumber !== b.roundNumber) {
          return (a.roundNumber || 0) - (b.roundNumber || 0);
        }
        return (a.matchNumber || 0) - (b.matchNumber || 0);
      });

      setKnockoutMatches(allMatches);

    } catch (err) {
      console.error('Error fetching knockout matches:', err);
      setKnockoutMatches([]);
    }
  };

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      let endpoint;
      const type = tournamentType?.toLowerCase();

      if (type === 'group stage') {
        endpoint = API.ENDPOINTS.LEADERBOARD.GROUP_STAGE_PLAYERS(tournamentId);
      } else if (type === 'knockout') {
        endpoint = API.ENDPOINTS.LEADERBOARD.KNOCKOUT_TEAMS(tournamentId);
      } else {
        throw new Error('Invalid tournament type');
      }
      const response = await axios.get(endpoint);
      const data = response.data;

      if (data.success) {
        setLeaderboardData(data.leaderboard || data.data?.players || data.data?.teams || []);
        if (data.stats || data.data?.statistics) {
          setTournamentStats(data.stats || data.data?.statistics);
        }
      } else {
        setLeaderboardData([]);
        setTournamentStats(null);
        setError(data.message || 'Failed to load leaderboard data');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
      setTournamentStats(null);
      setError(error.message || 'Network request failed');
    } finally {
      setLoading(false);
    }
  };

  // REFRESH HANDLER
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const mainFetch = fetchLeaderboardData();
    const groupFetch = isGroupStage ? fetchGroups() : Promise.resolve();
    const knockoutFetch = isGroupStage ? fetchKnockoutMatches() : Promise.resolve();
    Promise.all([mainFetch, groupFetch, knockoutFetch]).finally(() => setRefreshing(false));
  }, [isGroupStage]);

  // FILTERING AND SORTING
  const filteredAndSortedData = useMemo(() => {

    let filtered = [...leaderboardData];


    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        if (tournamentType?.toLowerCase() === 'group stage') {
          return item.playerName?.toLowerCase().includes(query);
        } else {
          return item.teamName?.toLowerCase().includes(query) ||
            item.captain?.toLowerCase().includes(query);
        }
      });
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => {
        if (filterType === 'active') {
          return item.status === 'Active' || item.status === 'ACTIVE' || !item.isEliminated;
        } else if (filterType === 'eliminated') {
          return item.status === 'Eliminated' || item.status === 'ELIMINATED' || item.isEliminated;
        }
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          return (a.rank || 0) - (b.rank || 0);
        case 'points':
          return (b.performanceScore || b.totalPoints || 0) - (a.performanceScore || a.totalPoints || 0);
        case 'winRate':
          return (b.totalWinRate || b.winRate || 0) - (a.totalWinRate || a.winRate || 0);
        case 'name':
          const nameA = a.playerName || a.teamName || '';
          const nameB = b.playerName || b.teamName || '';
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [leaderboardData, searchQuery, filterType, sortBy, tournamentType]);

  // UTILITY FUNCTIONS
  const getStageColor = (stage) => {
    const stageMap = {
      'registered': '#9E9E9E',       // Gray
      'group stage': '#2196F3',      // Blue
      'league': '#2196F3',           // Blue
      'round 1': '#2196F3',          // Blue
      'top players': '#FF9800',      // Orange
      'round 2': '#FF9800',          // Orange
      'super players': '#9C27B0',    // Purple (Elite status)
      'knockout phase': '#E91E63',   // Pink
      'knockout': '#E91E63',         // Pink
      'final knockout': '#E91E63',   // Pink
      'champion': '#FFD700',         // Gold
    };
    return stageMap[stage?.toLowerCase()] || '#757575';
  };

  const getStatusColor = (item) => {
    if (item.isChampion || item.championships > 0) return '#FFD700';
    if (item.isEliminated || item.status === 'ELIMINATED') return '#F44336';
    if (item.status === 'ACTIVE' || !item.isEliminated) return '#4CAF50';
    return '#2196F3';
  };

  const getStatusText = (item) => {
    if (item.isChampion || item.championships > 0) return 'CHAMPION';
    if (item.isEliminated || item.status === 'ELIMINATED') return 'ELIMINATED';
    if (item.status === 'ACTIVE') return 'ACTIVE';
    return item.status || 'ACTIVE';
  };

  const formatCategory = (category) => {
    if (!category) return '';
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderGroups = () => (
    <View style={styles.tabContent}>
      {groups.length > 0 ? (
        <View style={styles.groupGrid}>
          {groups.map((group, index) => (
            <TouchableOpacity
              key={group._id || index}
              style={styles.groupCard}
              onPress={() => {
                setSelectedGroup(group);
                fetchGroupData(group._id);
              }}
            >
              <LinearGradient
                colors={['#F4CE74', '#FF7426']}
                style={styles.groupCardHeader}
              >
                <Text style={styles.groupCardTitle}>{group.name || group.groupName || `Group ${index + 1}`}</Text>
                <Ionicons name="people" size={20} color="white" />
              </LinearGradient>
              <View style={styles.groupCardBody}>
                <View style={styles.groupStatRow}>
                  <Text style={styles.groupStatLabel}>Players:</Text>
                  <Text style={styles.groupStatValue}>{group.players?.length || group.teams?.length || 0}</Text>
                </View>
                {group.category && (
                  <View style={styles.groupStatRow}>
                    <Text style={styles.groupStatLabel}>Category:</Text>
                    <Text style={[styles.groupStatValue, { color: '#FF6A00' }]}>{formatCategory(group.category)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.groupCardFooter}>
                <Text style={styles.viewMatchesText}>View Matches</Text>
                <Ionicons name="arrow-forward" size={16} color="#FF6A00" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.noDataBox}>
          <Ionicons name="layers-outline" size={48} color="#ddd" />
          <Text style={styles.noDataText}>No groups created yet</Text>
        </View>
      )}
    </View>
  );

  const renderMatches = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.backToGroups}
        onPress={() => setViewMode('GROUPS')}
      >
        <Ionicons name="arrow-back" size={20} color="#FF6A00" />
        <Text style={styles.backToGroupsText}>Back to Groups</Text>
      </TouchableOpacity>

      <View style={styles.matchGroupHeader}>
        <Text style={styles.matchGroupTitle}>{selectedGroup?.name || selectedGroup?.groupName}</Text>
      </View>

      {/* Group Standings Section */}
      {groupStandings.length > 0 && (
        <View style={styles.standingsContainer}>
          <View style={styles.standingsHeader}>
            <Ionicons name="podium" size={18} color="#FF6A00" />
            <Text style={styles.standingsTitle}>Top Player's</Text>
          </View>
          <View style={styles.standingsList}>
            <View style={styles.standingsLabelRow}>
              <Text style={[styles.standingLabel, { flex: 0.5 }]}>Pos</Text>
              <Text style={[styles.standingLabel, { flex: 2 }]}>Player</Text>
              <Text style={[styles.standingLabel, { flex: 1, textAlign: 'center' }]}>Pld</Text>
              <Text style={[styles.standingLabel, { flex: 1, textAlign: 'center' }]}>Pts</Text>
            </View>
            {groupStandings.map((player, pIdx) => (
              <View key={pIdx} style={[styles.standingRow, pIdx < 2 && styles.qualifierRow]}>
                <View style={[styles.posBadge, pIdx === 0 && styles.firstPos, pIdx === 1 && styles.secondPos]}>
                  <Text style={styles.posText}>{pIdx + 1}</Text>
                </View>
                <Text style={styles.standingPlayerName} numberOfLines={1}>
                  {player.name || player.playerName || 'Unknown'}
                </Text>
                <Text style={styles.standingPld}>{player.matchesPlayed || 0}</Text>
                <Text style={styles.standingPts}>{player.totalPoints || 0}</Text>
                {pIdx < 2 && (
                  <View style={styles.qualifierTag}>
                    <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.matchGroupHeader}>
        <Text style={styles.matchSubTitle}>Matches Schedule</Text>
      </View>

      {loadingExtra ? (
        <ActivityIndicator size="small" color="#FF6A00" style={{ marginTop: 20 }} />
      ) : matches.length > 0 ? (
        matches.map((match, index) => (
          <View key={match._id || index} style={styles.matchCard}>
            <View style={styles.matchMeta}>
              <Text style={styles.matchDate}>
                {match.startTime || match.scheduledTime ? new Date(match.startTime || match.scheduledTime).toLocaleDateString() : 'TBD'}
              </Text>
              <View style={[styles.matchStatusBadge, { backgroundColor: match.status === 'COMPLETED' ? '#E8F5E9' : '#FFF3E0' }]}>
                <Text style={[styles.matchStatusText, { color: match.status === 'COMPLETED' ? '#2E7D32' : '#FF8F00' }]}>
                  {match.status || 'SCHEDULED'}
                </Text>
              </View>
            </View>
            <View style={styles.matchTeams}>
              <View style={styles.matchTeam}>
                <Text style={styles.matchTeamName}>{match.player1?.userName || match.player1?.playerName || match.team1?.name || 'TBD'}</Text>
                <Text style={styles.matchScore}>
                  {match.result?.finalScore?.player1Sets ?? match.liveScore?.player1SetScore ?? 0}
                </Text>
              </View>
              <View style={styles.matchVs}>
                <Text style={styles.vsText}>{match.courtNumber ? `COURT ${match.courtNumber}` : 'VS'}</Text>
              </View>
              <View style={styles.matchTeam}>
                <Text style={styles.matchScore}>
                  {match.result?.finalScore?.player2Sets ?? match.liveScore?.player2SetScore ?? 0}
                </Text>
                <Text style={styles.matchTeamName}>{match.player2?.userName || match.player2?.playerName || match.team2?.name || 'TBD'}</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noDataBox}>
          <Ionicons name="calendar-outline" size={48} color="#ddd" />
          <Text style={styles.noDataText}>No matches found for this group</Text>
        </View>
      )}
    </View>
  );

  const renderLeaderboardMode = () => (
    <View style={styles.tabContent}>
      <View style={styles.premiumTable}>
        <View style={styles.premiumTableHeader}>
          <Text style={[styles.pHeaderCell, { flex: 0.5 }]}>#</Text>
          <Text style={[styles.pHeaderCell, { flex: 2, textAlign: 'left' }]}>NAME</Text>
          <Text style={[styles.pHeaderCell, { flex: 1 }]}>W/L</Text>
          <Text style={[styles.pHeaderCell, { flex: 1 }]}>PTS</Text>
        </View>
        {leaderboardData.map((item, index) => (
          <View key={index} style={[styles.premiumTableRow, index < 3 && styles.topThreeRow]}>
            <View style={[styles.pCell, { flex: 0.5 }]}>
              {index < 3 ? (
                <MaterialIcons name="emoji-events" size={18} color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} />
              ) : (
                <Text style={styles.rankText}>#{index + 1}</Text>
              )}
            </View>
            <Text style={[styles.pCell, { flex: 2, textAlign: 'left', fontWeight: 'bold' }]}>
              {item.playerName || item.teamName || 'Unknown'}
            </Text>
            <Text style={[styles.pCell, { flex: 1 }]}>{item.totalWins || item.matchesWon || 0}-{item.totalLosses || item.matchesLost || 0}</Text>
            <Text style={[styles.pCell, { flex: 1, color: '#FF6A00', fontWeight: '800' }]}>
              {item.performanceScore || item.totalPoints || item.winRate || 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Calculate highlighted path logic
  const handlePlayerPress = (playerId) => {
    if (!playerId) return;

    // Toggle off if already selected
    if (highlightedPlayerId === playerId) {
      setHighlightedPlayerId(null);
      setHighlightedPathIds(new Set());
      return;
    }

    setHighlightedPlayerId(playerId);

    // 1. Find all matches player actually participated in
    const playedMatches = knockoutMatches.filter(m =>
      (m.player1?.playerId?._id === playerId || m.player1?.playerId === playerId || m.player1?._id === playerId) ||
      (m.player2?.playerId?._id === playerId || m.player2?.playerId === playerId || m.player2?._id === playerId)
    );

    if (playedMatches.length === 0) return;

    // 2. Find the path forward from the last played match
    // Sort by round number to find the "latest" match they were in
    playedMatches.sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));

    const pathIds = new Set(playedMatches.map(m => m._id));

    let lastMatch = playedMatches[playedMatches.length - 1];

    // Determine max round to stop infinite loops
    const maxRound = Math.max(...knockoutMatches.map(m => m.roundNumber || 0));
    let currentRound = lastMatch.roundNumber || 0;
    let currentMatchNum = lastMatch.matchNumber || 0;

    // Project forward to the final
    while (currentRound < maxRound) {
      const nextRound = currentRound + 1;
      // Standard bracket logic: Next Match = ceil(CurrentMatch / 2)
      const nextMatchNum = Math.ceil(currentMatchNum / 2);

      const nextMatch = knockoutMatches.find(m =>
        (m.roundNumber === nextRound) && (m.matchNumber === nextMatchNum)
      );

      if (nextMatch) {
        pathIds.add(nextMatch._id);
        currentRound = nextMatch.roundNumber;
        currentMatchNum = nextMatch.matchNumber;
      } else {
        break; // path broken or data missing
      }
    }

    setHighlightedPathIds(pathIds);
  };

  const renderBracket = () => {
    // 1. Group matches by round number to determine layout
    const roundGroups = {};
    if (!knockoutMatches || knockoutMatches.length === 0) {
      return (
        <View style={styles.noDataBox}>
          <Ionicons name="trophy-outline" size={48} color="#ddd" />
          <Text style={styles.noDataText}>Knockout stage matches have not been generated yet.</Text>
        </View>
      );
    }

    knockoutMatches.forEach(match => {
      let rNum = match.roundNumber;
      if (!rNum) {
        const rName = (match.round || '').toLowerCase();
        if (rName.includes('final') && !rName.includes('semi') && !rName.includes('quarter')) rNum = 100;
        else if (rName.includes('semi')) rNum = 99;
        else if (rName.includes('quarter')) rNum = 98;
        else if (rName.includes('pre')) rNum = 97;
        else rNum = 1;
      }

      if (!roundGroups[rNum]) roundGroups[rNum] = [];
      roundGroups[rNum].push(match);
    });

    const sortedRoundKeys = Object.keys(roundGroups).sort((a, b) => a - b);

    // Constant for layout calculations
    const CARD_HEIGHT = 70; // Fixed card height
    const COLUMN_WIDTH = 220; // Fixed column width for alignment
    const COLUMN_MARGIN = 40; // Spacing between columns

    // Calculate dynamic margins for each round to ensure tree alignment
    const roundMargins = {};
    let currentMargin = 10; // Base margin for Round 1

    sortedRoundKeys.forEach((key, index) => {
      roundMargins[key] = currentMargin;
      currentMargin = (currentMargin * 2) + (CARD_HEIGHT / 2);
    });

    return (
      <View style={styles.tabContent}>
        {/* Main Horizontal ScrollView - Moves both Headers and Match Grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketContainer}>
          <View>
            {/* 1. Sticky Header Row (Round Names) */}
            <View style={styles.bracketHeaderRow}>
              {sortedRoundKeys.map((roundKey, rIndex) => {
                const matchesInRound = roundGroups[roundKey];
                const roundTitle = matchesInRound[0]?.round ? formatCategory(matchesInRound[0].round) : `Round ${rIndex + 1}`;
                return (
                  <View key={`header-${roundKey}`} style={{ width: COLUMN_WIDTH, marginRight: COLUMN_MARGIN, alignItems: 'center' }}>
                    <Text style={styles.roundTitle}>{roundTitle}</Text>
                  </View>
                );
              })}
            </View>

            {/* 2. Vertically Scrollable Match Grid */}
            {/* nestedScrollEnabled is crucial if parent is also a scrollview */}
            <ScrollView
              style={{ maxHeight: 600 }}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row' }}>
                {/* Add ability to reset selection by clicking background */}
                <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={() => {
                  if (highlightedPlayerId) {
                    setHighlightedPlayerId(null);
                    setHighlightedPathIds(new Set());
                  }
                }} />

                {sortedRoundKeys.map((roundKey, rIndex) => {
                  const matchesInRound = roundGroups[roundKey];
                  matchesInRound.sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

                  // Calculate connector height for this round
                  const myMargin = roundMargins[roundKey];
                  const nextRoundKey = sortedRoundKeys[rIndex + 1];
                  const nextMargin = nextRoundKey ? roundMargins[nextRoundKey] : 0;
                  const connectorHeight = nextMargin ? (nextMargin - myMargin) : 0;

                  return (
                    <View key={roundKey} style={{ width: COLUMN_WIDTH, marginRight: COLUMN_MARGIN }} pointerEvents="box-none">
                      <View style={styles.roundMatchesContainer} pointerEvents="box-none">
                        {matchesInRound.map((match, mIndex) => {
                          const p1Name = match.player1?.playerName || match.player1?.playerId?.name || match.player1?.name || ((match.player1 || match.player1?.playerId) ? 'TBD' : 'Bye');
                          const p2Name = match.player2?.playerName || match.player2?.playerId?.name || match.player2?.name || ((match.player2 || match.player2?.playerId) ? 'TBD' : 'Bye');

                          // Extract IDs for interaction
                          const p1Id = match.player1?.playerId?._id || match.player1?.playerId || match.player1?._id;
                          const p2Id = match.player2?.playerId?._id || match.player2?.playerId || match.player2?._id;

                          const p1Score = match.score?.player1Sets ?? match.result?.finalScore?.player1Sets ?? match.result?.player1Sets ?? 0;
                          const p2Score = match.score?.player2Sets ?? match.result?.finalScore?.player2Sets ?? match.result?.player2Sets ?? 0;

                          const isLive = match.status === 'in-progress';
                          const isCompleted = match.status === 'completed';

                          // Highlighting Logic
                          const isHighlighted = highlightedPathIds.has(match._id);
                          const isDimmed = highlightedPlayerId && !isHighlighted;

                          // Specific player highlights within the card
                          const p1IsSelected = highlightedPlayerId && (p1Id === highlightedPlayerId);
                          const p2IsSelected = highlightedPlayerId && (p2Id === highlightedPlayerId);

                          return (
                            <View key={match._id || mIndex} style={[styles.bracketMatchWrapper, { marginVertical: myMargin, width: '100%' }]} pointerEvents="box-none">
                              {/* Left Connector (Receive from previous) */}
                              {rIndex > 0 && <View style={[styles.connectorLeft, isDimmed && { opacity: 0.1 }]} />}

                              <View style={[
                                styles.bracketCard,
                                { height: CARD_HEIGHT, width: 180 },
                                isDimmed && { opacity: 0.3, borderColor: '#eee' },
                                isHighlighted && { borderColor: '#004E93', borderWidth: 2, elevation: 4 }
                              ]}>
                                <TouchableOpacity
                                  style={styles.bracketRow}
                                  onPress={() => handlePlayerPress(p1Id)}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.bracketName,
                                      match.winnerName === p1Name && styles.bracketWinner,
                                      p1IsSelected && { color: '#004E93', fontWeight: 'bold' }
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {p1Name}
                                  </Text>
                                  <Text style={[styles.bracketScore, isLive && styles.liveScoreText]}>{p1Score}</Text>
                                </TouchableOpacity>

                                <View style={styles.bracketDivider} />

                                <TouchableOpacity
                                  style={styles.bracketRow}
                                  onPress={() => handlePlayerPress(p2Id)}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.bracketName,
                                      match.winnerName === p2Name && styles.bracketWinner,
                                      p2IsSelected && { color: '#004E93', fontWeight: 'bold' }
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {p2Name}
                                  </Text>
                                  <Text style={[styles.bracketScore, isLive && styles.liveScoreText]}>{p2Score}</Text>
                                </TouchableOpacity>

                                {match.status && (
                                  <View style={[styles.bracketStatusIndicator,
                                  { backgroundColor: isCompleted ? '#4CAF50' : isLive ? '#2196F3' : '#FF9800' }
                                  ]} />
                                )}
                              </View>

                              {/* Right Connectors (Feed to next) */}
                              {rIndex < sortedRoundKeys.length - 1 && (
                                <View style={[styles.connectorRightContainer, isDimmed && { opacity: 0.1 }]}>
                                  {/* Horizontal stub from card */}
                                  <View style={styles.connectorRightLine} />

                                  {/* Vertical Forks */}
                                  {mIndex % 2 === 0 ? (
                                    // Even index: Fork DOWN
                                    <View style={[styles.connectorRightDown, { height: connectorHeight + 1 }]} /> // +1 for overlap
                                  ) : (
                                    // Odd index: Fork UP
                                    <View style={[styles.connectorRightUp, { height: connectorHeight + 1 }]} />
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'GROUPS': return renderGroups();
      case 'MATCHES': return renderMatches();
      case 'LEADERBOARD': return renderLeaderboardMode();
      case 'KNOCKOUT': return renderBracket();
      default: return renderLeaderboardMode();
    }
  };

  return (
    <View style={styles.container}>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6A00']} />
        }
      >
        {/* Tournament Stats Card (Small) */}
        <View style={styles.tournamentSummaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{tournamentStats?.totalMatches || 0}</Text>
            <Text style={styles.summaryLbl}>Matches</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{tournamentStats?.completedMatches || 0}</Text>
            <Text style={styles.summaryLbl}>Finished</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{groups.length || '-'}</Text>
            <Text style={styles.summaryLbl}>Groups</Text>
          </View>
        </View>

        {/* Tab System for Group Stage */}
        {isGroupStage && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, (viewMode === 'GROUPS' || viewMode === 'MATCHES') && styles.activeTabItem]}
              onPress={() => setViewMode(selectedGroup ? 'MATCHES' : 'GROUPS')}
            >
              <Text style={[styles.tabText, (viewMode === 'GROUPS' || viewMode === 'MATCHES') && styles.activeTabText]}>Groups</Text>
            </TouchableOpacity>

            {knockoutMatches.length > 0 && (
              <TouchableOpacity
                style={[styles.tabItem, viewMode === 'KNOCKOUT' && styles.activeTabItem]}
                onPress={() => setViewMode('KNOCKOUT')}
              >
                <Text style={[styles.tabText, viewMode === 'KNOCKOUT' && styles.activeTabText]}>Knockout</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tabItem, viewMode === 'LEADERBOARD' && styles.activeTabItem]}
              onPress={() => setViewMode('LEADERBOARD')}
            >
              <Text style={[styles.tabText, viewMode === 'LEADERBOARD' && styles.activeTabText]}>Full Standings</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#FF6A00" style={{ marginTop: 50 }} />
        ) : (
          renderContent()
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  tournamentSummaryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 15,
    borderRadius: 20,
    justifyContent: 'space-between',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLbl: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: 'white',
    elevation: 2,
    shadowOpacity: 0.1,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FF6A00',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  groupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  groupCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowOpacity: 0.1,
  },
  groupCardHeader: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupCardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  groupCardBody: {
    padding: 12,
  },
  groupStatRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  groupStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  groupStatValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  groupStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  groupStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  groupCardFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewMatchesText: {
    fontSize: 12,
    color: '#FF6A00',
    fontWeight: '600',
  },
  backToGroups: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToGroupsText: {
    color: '#FF6A00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  matchGroupHeader: {
    marginBottom: 16,
  },
  matchGroupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  matchSubTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
  },
  standingsContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  standingsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  standingsList: {
    width: '100%',
  },
  standingsLabelRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  standingLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    textTransform: 'uppercase',
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  qualifierRow: {
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  posBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flex: 0.5,
  },
  firstPos: {
    backgroundColor: '#FFD700',
  },
  secondPos: {
    backgroundColor: '#C0C0C0',
  },
  posText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  standingPlayerName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  standingPld: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  standingPts: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6A00',
    textAlign: 'center',
  },
  qualifierTag: {
    position: 'absolute',
    right: 4,
    top: 14,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOpacity: 0.05,
  },
  matchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  matchDate: {
    fontSize: 12,
    color: '#666',
  },
  matchStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  matchRound: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF6A00',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchTeam: {
    flex: 1,
    alignItems: 'center',
  },
  matchTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  matchScore: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6A00',
    marginVertical: 4,
  },
  // matchVs: {
  //   paddingHorizontal: 10,
  // },
  vsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
    textAlign: 'center',
  },
  matchCourt: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  roundBadge: {
    flex: 1,
  },
  matchWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  winnerLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  winnerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: '#FFEBEE',
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D32F2F',
    letterSpacing: 0.5,
  },
  liveScoreText: {
    color: '#D32F2F',
    fontWeight: '900',
  },
  premiumTable: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowOpacity: 0.1,
  },
  premiumTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    padding: 12,
  },
  pHeaderCell: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  premiumTableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  topThreeRow: {
    backgroundColor: '#FFF9F2',
  },
  pCell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  noDataBox: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  noDataText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  // Bracket Styles
  bracketContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  bracketHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  roundColumn: {
    // Replaced by inline width
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004E93',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  roundMatchesContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  bracketMatchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'start', // Center card in wrapper
  },
  bracketCard: {
    width: 160,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 10,
  },
  bracketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  bracketName: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  bracketWinner: {
    fontWeight: 'bold',
    color: '#000',
  },
  bracketScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  bracketDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 2,
  },
  bracketStatusIndicator: {
    position: 'absolute',
    top: 4,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Connectors
  connectorLeft: {
    position: 'absolute',
    left: -20,
    top: '50%',
    width: 20,
    height: 1,
    backgroundColor: '#999',
  },
  connectorRightContainer: {
    position: 'absolute',
    right: -30,
    top: 0,
    bottom: 0,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectorRightLine: {
    position: 'absolute',
    left: -20, // Start inside the wrapper (at card edge)
    top: '50%',
    width: 20,
    height: 1,
    backgroundColor: '#999',
  },
  connectorRightDown: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: 1,
    height: 40, // Fixed height for visual structure
    backgroundColor: '#999',
  },
  connectorRightUp: {
    position: 'absolute',
    left: 0,
    bottom: '50%',
    width: 1,
    height: 40, // Fixed height for visual structure
    backgroundColor: '#999',
  },
});

export default TournamentLeaderboardDetail;