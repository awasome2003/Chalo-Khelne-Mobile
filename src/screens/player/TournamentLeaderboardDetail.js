import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { MaterialIcons, FontAwesome5, Feather, Ionicons } from '@expo/vector-icons';
import API from '../../api/tournaments';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Detects whether the match format uses nested games (Tennis) or flat sets (TT, Badminton).
 * Mirror of server/factories/MatchFactory.js → hasNestedGames.
 * Flat-set sports (TT, Badminton) render each set as one "Game" row — no set tabs.
 * Nested sports (Tennis) render set tabs with multi-game grid per set.
 */
function hasNestedGames(fmt) {
  if (!fmt || typeof fmt !== 'object') return false;
  if (fmt.gamesPerSet != null && Number(fmt.gamesPerSet) > 0) return true;
  const tg = Number(fmt.totalGames);
  const ts = Number(fmt.totalSets);
  if (Number.isFinite(tg) && Number.isFinite(ts) && tg > 1 && tg !== ts) return true;
  return false;
}

const TournamentLeaderboardDetail = ({ route, navigation }) => {
  const { tournament, tournamentId, tournamentName, tournamentType } = route.params;
  const { user, token } = useAuth();
  const userId = user?.id || user?._id;

  // STATE MANAGEMENT
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [tournamentStats, setTournamentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // NEW STATE FOR REDESIGN
  const isGroupStage = tournamentType?.toLowerCase().includes('group stage');
  // Knockout flavor detection. tournamentType (string label) is too coarse to
  // distinguish singles vs team — both can return "knockout". Team knockouts
  // are identified by the per-sport knockoutFormat field (e.g. "Davis Cup").
  // The route param `tournament` carries sports[] so we can read knockoutFormat
  // directly without an extra fetch.
  const _typeLower = tournamentType?.toLowerCase() || '';
  const _knockoutFormat = (tournament?.sports?.[0]?.knockoutFormat || '').toLowerCase();
  const isAnyKnockout =
    _typeLower.includes('knockout') && !_typeLower.includes('group stage');
  const isTeamKnockout =
    isAnyKnockout &&
    (_knockoutFormat.includes('davis cup') || _knockoutFormat.includes('team'));
  const isSinglesKnockout = isAnyKnockout && !isTeamKnockout;
  // Initial tab:
  //  - team knockout → Round Robin (the first phase a viewer sees in time)
  //  - singles knockout → Bracket
  //  - everything else → Full Standings
  const [viewMode, setViewMode] = useState(
    isTeamKnockout ? 'ROUND_ROBIN'
      : isSinglesKnockout ? 'KNOCKOUT'
      : 'LEADERBOARD'
  );
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupStandings, setGroupStandings] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rank');
  const [filterType, setFilterType] = useState('all');
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  // PDF download state — disables the download button + shows a spinner
  // while the bracket PDF is being generated and shared.
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  // Share state for the View Results popup — captures the results card as
  // a PNG and opens the native share sheet (Instagram / WhatsApp / etc).
  const [sharingResults, setSharingResults] = useState(false);
  const resultsCaptureRef = useRef(null);
  // Round-robin standings — only populated for team knockout (Davis Cup) flows.
  // Sourced from /team-knockout/round-robin/standings/:tournamentId.
  const [roundRobinStandings, setRoundRobinStandings] = useState([]);
  // Round-robin match fixtures (Team A vs Team B) — round=0 entries from
  // TeamKnockoutMatches normalized to the same player1/player2 shape used
  // elsewhere. Drives the "Round Robin" tab's match list.
  const [roundRobinMatches, setRoundRobinMatches] = useState([]);
  const [highlightedPlayerId, setHighlightedPlayerId] = useState(null);
  const [highlightedPathIds, setHighlightedPathIds] = useState(new Set());
  const [topPlayersByGroup, setTopPlayersByGroup] = useState({}); // { groupId: [players] }
  const [groupCategoryFilter, setGroupCategoryFilter] = useState('all');
  const [groupCompletion, setGroupCompletion] = useState({}); // { groupId: { total, completed, allDone } }
  const [knockoutCategoryFilter, setKnockoutCategoryFilter] = useState('all');
  const [showResultsModal, setShowResultsModal] = useState(false);

  // Match details modal state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [activeSetIndex, setActiveSetIndex] = useState(0);

  // Phase 4e: umpire authorization summary for this tournament (null = not yet fetched)
  const [umpireAuth, setUmpireAuth] = useState(null);

  // Reset active set when a new match opens
  useEffect(() => {
    if (selectedMatch) setActiveSetIndex(0);
  }, [selectedMatch]);

  // Phase 4e: fetch the caller's umpire authorization summary.
  // Non-umpires fall through to hasAnyGrant=false; the helpers below gate UI accordingly.
  useEffect(() => {
    if (!userId || !tournamentId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(
          `${API.BASE_URL}/referee/my-authorizations/${userId}/${tournamentId}`
        );
        if (!cancelled) setUmpireAuth(res.data);
      } catch (err) {
        // 4xx or network issue → treat as no grants (user just won't get tap-to-score).
        if (!cancelled) setUmpireAuth({ hasAnyGrant: false, stages: [], matchIds: [] });
      }
    })();
    return () => { cancelled = true; };
  }, [userId, tournamentId]);

  // Phase 4e: stage derivation (matches server/utils/umpireAuth.js → getMatchStage)
  const getMatchStage = (match) => (match?.groupId ? 'group-stage' : 'knockout');

  // Phase 4e: whether the current user can score this match.
  // True if user has a match-level grant OR a stage-level grant covering this match's stage,
  // AND their currently active profile role is Referee. The role check covers the
  // role-switcher case: a user who was once granted umpire access but is now using
  // the app in Player mode shouldn't get the scorer route — they should see the
  // read-only match modal like any other player. Backend authorization stays the
  // source of truth for permissions; this gate keys off the *active* role.
  const isUmpireRole = (user?.role || '').toLowerCase() === 'referee';
  const isAuthorizedForMatch = (match) => {
    if (!isUmpireRole) return false;
    if (!umpireAuth || !umpireAuth.hasAnyGrant) return false;
    const matchIdStr = match?._id?.toString?.() || match?._id;
    if (Array.isArray(umpireAuth.matchIds) && matchIdStr && umpireAuth.matchIds.includes(matchIdStr)) {
      return true;
    }
    const stage = getMatchStage(match);
    return Array.isArray(umpireAuth.stages) && umpireAuth.stages.includes(stage);
  };

  // ────────────────────────────────────────────────────────────────────────
  // Manual / Auto Scoreboard (umpire only)
  // Port of Old_Version/sports_app/src/Manager/MGroupStageScoreBoard.jsx →
  // opened as a full-screen modal from the match-details modal.
  // ────────────────────────────────────────────────────────────────────────
  const [scoreboardVisible, setScoreboardVisible] = useState(false);
  // Snapshot of the match we're scoring: { matchId, playerAName, playerBName, playerAId, playerBId }
  const [scoreboardMatch, setScoreboardMatch] = useState(null);
  const [sbLoading, setSbLoading] = useState(false);
  const [sbMatchData, setSbMatchData] = useState(null);
  const [sbMatchStatus, setSbMatchStatus] = useState(null);
  const [sbIsEnabled, setSbIsEnabled] = useState(false); // false = Manual, true = Auto
  const [sbMatchFormat, setSbMatchFormat] = useState(null);
  const [sbPlayerAPoints, setSbPlayerAPoints] = useState(0);
  const [sbPlayerBPoints, setSbPlayerBPoints] = useState(0);
  const [sbPlayerASetWins, setSbPlayerASetWins] = useState(0);
  const [sbPlayerBSetWins, setSbPlayerBSetWins] = useState(0);
  const [sbCurrentSetNumber, setSbCurrentSetNumber] = useState(1);
  const [sbCurrentGameNumber, setSbCurrentGameNumber] = useState(1);
  const [sbCurrentSetGames, setSbCurrentSetGames] = useState({ playerA: 0, playerB: 0 });
  const [sbCompletedSets, setSbCompletedSets] = useState([]);
  const [sbAllSetsGames, setSbAllSetsGames] = useState([]);
  const [sbWinner, setSbWinner] = useState(null);
  const [sbButtonDisabled, setSbButtonDisabled] = useState(false);
  const [sbTapCooldown, setSbTapCooldown] = useState(false);
  const [sbMessage, setSbMessage] = useState('');
  const [sbManualGames, setSbManualGames] = useState([]);

  const sbAuthConfig = useMemo(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    [token]
  );

  const sbShowAlert = (title, message) => Alert.alert(title, message);

  const openScoreboard = (m) => {
    const p1Name = m.player1?.playerName || m.player1?.playerId?.name || m.player1?.name || 'Player A';
    const p2Name = m.player2?.playerName || m.player2?.playerId?.name || m.player2?.name || 'Player B';
    const p1Id = m.player1?.playerId?._id || m.player1?.playerId || m.player1?._id;
    const p2Id = m.player2?.playerId?._id || m.player2?.playerId || m.player2?._id;
    setScoreboardMatch({
      matchId: m._id,
      playerAName: p1Name,
      playerBName: p2Name,
      playerAId: p1Id,
      playerBId: p2Id,
    });
    // Reset transient state so a fresh open never shows stale data
    setSbPlayerAPoints(0);
    setSbPlayerBPoints(0);
    setSbWinner(null);
    setSbButtonDisabled(false);
    setSbMessage('');
    setSbCompletedSets([]);
    setSbAllSetsGames([]);
    setSbCurrentSetGames({ playerA: 0, playerB: 0 });
    setSbPlayerASetWins(0);
    setSbPlayerBSetWins(0);
    setSbMatchFormat(null);
    setScoreboardVisible(true);
  };

  const closeScoreboard = () => {
    setScoreboardVisible(false);
    setScoreboardMatch(null);
  };

  const sbCalculateSetWins = (sets) => {
    let a = 0;
    let b = 0;
    sets.forEach((s) => {
      if (s && Array.isArray(s) && s.length === 2) {
        if (s[0] > s[1]) a++;
        else if (s[1] > s[0]) b++;
      }
    });
    setSbPlayerASetWins(a);
    setSbPlayerBSetWins(b);
  };

  const sbInitializeMatch = useCallback(async () => {
    if (!scoreboardMatch?.matchId) return;
    const { matchId, playerAId, playerBId, playerAName, playerBName } = scoreboardMatch;
    try {
      setSbLoading(true);
      const response = await axios.get(
        `${API.BASE_URL}/tournaments/matches/${matchId}/live-state?autoInit=false`,
        sbAuthConfig
      );
      const data = response.data;
      const match = data?.match;
      if (!match) return;

      const fmt = match.matchFormat || {};
      setSbMatchFormat({
        totalSets: fmt.maxSets || fmt.totalSets || 5,
        setsToWin: fmt.setsToWin || Math.ceil((fmt.maxSets || fmt.totalSets || 5) / 2),
        maxSets: fmt.maxSets || fmt.totalSets || 5,
        totalGames: fmt.maxGames || fmt.totalGames || 5,
        gamesToWin: fmt.gamesToWin || Math.ceil((fmt.maxGames || fmt.totalGames || 5) / 2),
        maxGames: fmt.maxGames || fmt.totalGames || 5,
        pointsToWinGame: fmt.pointsToWinGame || null,
        marginToWin: fmt.marginToWin ?? null,
        deuceRule: fmt.deuceRule !== undefined ? fmt.deuceRule : false,
        maxPointsPerGame: fmt.maxPointsPerGame || null,
        scoringType: fmt.scoringType,
        serviceRule: {
          pointsPerService: fmt.serviceRule?.pointsPerService || 2,
          deuceServicePoints: fmt.serviceRule?.deuceServicePoints || 1,
        },
      });

      if (match.liveScore) {
        setSbPlayerAPoints(match.liveScore.player1Points || 0);
        setSbPlayerBPoints(match.liveScore.player2Points || 0);
      }
      setSbCurrentSetNumber(match.currentSet || 1);

      if (match.sets && Array.isArray(match.sets)) {
        const playerGamesWon = (set, isPlayerA) => {
          const targetId = isPlayerA ? playerAId : playerBId;
          const targetName = isPlayerA ? playerAName : playerBName;
          return set.games.filter((g) => {
            if (g.status !== 'COMPLETED' || !g.winner) return false;
            const idMatch =
              g.winner.playerId && targetId &&
              g.winner.playerId.toString() === targetId.toString();
            const nameMatch = g.winner.playerName === targetName;
            return idMatch || nameMatch;
          }).length;
        };

        const currentSet = match.sets.find((s) => s.setNumber === match.currentSet);
        if (currentSet && currentSet.games) {
          setSbCurrentGameNumber(currentSet.games.filter((g) => g.status === 'COMPLETED').length + 1);
        }

        const completedSetsData = match.sets
          .filter((s) => s.status === 'COMPLETED')
          .map((s) => [playerGamesWon(s, true), playerGamesWon(s, false)]);

        const allSetsGamesData = match.sets.map((s) => ({
          setNumber: s.setNumber,
          games: [playerGamesWon(s, true), playerGamesWon(s, false)],
          status: s.status,
        }));

        const totalA = allSetsGamesData.reduce((t, s) => t + s.games[0], 0);
        const totalB = allSetsGamesData.reduce((t, s) => t + s.games[1], 0);
        setSbCurrentSetGames({ playerA: totalA, playerB: totalB });
        setSbCompletedSets(completedSetsData);
        setSbAllSetsGames(allSetsGamesData);
        sbCalculateSetWins(completedSetsData);
      }

      setSbMatchData(match);
      setSbMatchStatus(match.status);
      if (match.status === 'COMPLETED' && match.result?.winner?.playerName) {
        setSbWinner(match.result.winner.playerName);
      }
    } catch (err) {
      console.error('Error initializing scoreboard match:', err);
      setSbMatchStatus('ERROR');
      setSbMessage('Failed to load match data');
    } finally {
      setSbLoading(false);
    }
  }, [scoreboardMatch, sbAuthConfig]);

  const sbUpdateLiveScore = async (a, b, autoCheck = true) => {
    if (!scoreboardMatch?.matchId) return;
    try {
      await axios.put(
        `${API.BASE_URL}/tournaments/matches/${scoreboardMatch.matchId}/live-score`,
        { player1Points: a, player2Points: b },
        sbAuthConfig
      );
      if (autoCheck) sbCheckGameCompletion(a, b);
    } catch (err) {
      console.error('Error updating live score:', err);
      throw err;
    }
  };

  const sbResetPoints = async () => {
    if (sbWinner || sbButtonDisabled) return;
    setSbButtonDisabled(true);
    setSbMessage('Resetting scores...');
    try {
      setSbPlayerAPoints(0);
      setSbPlayerBPoints(0);
      await sbUpdateLiveScore(0, 0, false);
    } catch (err) {
      console.error('Error resetting scores:', err);
      sbShowAlert('Error', 'Failed to reset scores');
    } finally {
      setSbButtonDisabled(false);
      setSbMessage('');
    }
  };

  const sbCheckGameCompletion = (a, b) => {
    if (!sbMatchFormat) return;
    const { pointsToWinGame, marginToWin, deuceRule, maxPointsPerGame } = sbMatchFormat;
    const maxPts = Math.max(a, b);
    const diff = Math.abs(a - b);

    if (maxPointsPerGame && maxPts >= maxPointsPerGame) {
      sbCompleteCurrentGame(a, b);
      return;
    }
    if (pointsToWinGame && maxPts >= pointsToWinGame) {
      if (deuceRule) {
        if (diff >= (marginToWin || 2)) sbCompleteCurrentGame(a, b);
      } else {
        sbCompleteCurrentGame(a, b);
      }
    }
  };

  const sbCompleteCurrentGame = async (a, b) => {
    if (!scoreboardMatch?.matchId) return;
    try {
      const res = await axios.post(
        `${API.BASE_URL}/tournaments/matches/${scoreboardMatch.matchId}/complete-game`,
        { finalPlayer1Points: a, finalPlayer2Points: b },
        sbAuthConfig
      );
      const data = res.data;
      setSbPlayerAPoints(0);
      setSbPlayerBPoints(0);

      if (data.match) {
        setSbCurrentSetNumber(data.match.currentSet || sbCurrentSetNumber);

        if (Array.isArray(data.match.sets)) {
          const player1Id = data.match.player1?.playerId;
          const player2Id = data.match.player2?.playerId;
          const player1Name = data.match.player1?.playerName || data.match.player1?.userName;
          const player2Name = data.match.player2?.playerName || data.match.player2?.userName;

          const gamesWonInSet = (set, isP1) => set.games.filter((g) => {
            if (g.status !== 'COMPLETED') return false;
            const targetId = isP1 ? player1Id : player2Id;
            const targetName = isP1 ? player1Name : player2Name;
            if (targetId && g.winner?.playerId) {
              return g.winner.playerId.toString() === targetId.toString();
            }
            return g.winner?.playerName === targetName;
          }).length;

          const currentSet = data.match.sets.find((s) => s.setNumber === data.match.currentSet);
          if (currentSet && currentSet.games) {
            setSbCurrentSetGames({
              playerA: gamesWonInSet(currentSet, true),
              playerB: gamesWonInSet(currentSet, false),
            });
            setSbCurrentGameNumber(currentSet.games.filter((g) => g.status === 'COMPLETED').length + 1);
          }

          const completedSetsData = data.match.sets
            .filter((s) => s.status === 'COMPLETED')
            .map((s) => [gamesWonInSet(s, true), gamesWonInSet(s, false)]);

          const allSetsGamesData = data.match.sets.map((s) => ({
            setNumber: s.setNumber,
            games: [gamesWonInSet(s, true), gamesWonInSet(s, false)],
            status: s.status,
          }));

          setSbCompletedSets(completedSetsData);
          setSbAllSetsGames(allSetsGamesData);
          sbCalculateSetWins(completedSetsData);
        }
      }

      if (data.matchCompleted) {
        const winnerName =
          data.match?.winner?.playerName ||
          data.match?.result?.winner?.playerName ||
          null;
        if (winnerName) {
          setSbWinner(winnerName);
          setSbMatchStatus('COMPLETED');
          sbShowAlert('Match Completed!', `${winnerName} wins the match!`);
          sbSyncScoreToPointsTable();
        }
      } else if (data.setCompleted) {
        sbShowAlert('Set Completed!', `Set ${data.currentSet - 1} completed!`);
        sbSyncScoreToPointsTable();
      } else {
        sbShowAlert('Game Won!', 'Game completed! Next game starting...');
        sbSyncScoreToPointsTable();
      }
    } catch (err) {
      console.error('Error completing game:', err);
      sbShowAlert('Error', err?.response?.data?.message || err.message || 'Failed to complete game');
    }
  };

  const sbIncrementPlayer = async (isA) => {
    if (sbWinner || sbButtonDisabled || sbTapCooldown) return;
    setSbTapCooldown(true);
    setSbButtonDisabled(true);
    setSbMessage('Please wait...');
    try {
      const newA = isA ? sbPlayerAPoints + 1 : sbPlayerAPoints;
      const newB = isA ? sbPlayerBPoints : sbPlayerBPoints + 1;
      if (isA) setSbPlayerAPoints(newA);
      else setSbPlayerBPoints(newB);
      await sbUpdateLiveScore(newA, newB);
    } catch (err) {
      console.error('Error incrementing player:', err);
      sbShowAlert('Error', 'Failed to update score');
    } finally {
      setTimeout(() => {
        setSbTapCooldown(false);
        setSbButtonDisabled(false);
        setSbMessage('');
      }, 800);
    }
  };

  const sbDecrementPlayer = async (isA) => {
    if (isA && sbPlayerAPoints > 0) {
      const newA = sbPlayerAPoints - 1;
      setSbPlayerAPoints(newA);
      await sbUpdateLiveScore(newA, sbPlayerBPoints, false);
    } else if (!isA && sbPlayerBPoints > 0) {
      const newB = sbPlayerBPoints - 1;
      setSbPlayerBPoints(newB);
      await sbUpdateLiveScore(sbPlayerAPoints, newB, false);
    }
  };

  const sbSyncScoreToPointsTable = async () => {
    try {
      if (
        sbMatchData?.round &&
        ['pre-quarter', 'quarter-final', 'semi-final', 'final'].includes(sbMatchData.round)
      ) {
        return; // skip knockout
      }
      await axios.post(
        `${API.BASE_URL}/tournaments/matches/${scoreboardMatch.matchId}/sync-scores`,
        {},
        sbAuthConfig
      );
    } catch (err) {
      console.error('Error syncing match score:', err?.message);
    }
  };

  const sbHandleManualGameChange = (index, key, value) => {
    setSbManualGames((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const sbSubmitBulkManualScores = async () => {
    if (sbWinner || sbButtonDisabled) return;
    const games = sbManualGames.filter((g) => g.a !== '' && g.b !== '');
    if (games.length === 0) {
      sbShowAlert('Validation Error', 'Please enter at least one game score.');
      return;
    }
    setSbButtonDisabled(true);
    setSbMessage('Submitting all game scores...');
    try {
      for (let i = 0; i < games.length; i++) {
        const g = games[i];
        const a = parseInt(g.a, 10);
        const b = parseInt(g.b, 10);
        if (Number.isNaN(a) || Number.isNaN(b)) continue;
        setSbMessage(`Submitting game ${i + 1} of ${games.length}...`);
        await axios.post(
          `${API.BASE_URL}/tournaments/matches/${scoreboardMatch.matchId}/complete-game`,
          { finalPlayer1Points: a, finalPlayer2Points: b },
          sbAuthConfig
        );
        await new Promise((r) => setTimeout(r, 500));
      }
      await sbInitializeMatch();
      await sbSyncScoreToPointsTable();
      const totalSets = sbMatchFormat?.totalSets || 5;
      setSbManualGames(Array(totalSets).fill().map(() => ({ a: '', b: '' })));
      sbShowAlert('Success', 'All game scores submitted successfully!');
    } catch (err) {
      console.error('Bulk submission error:', err);
      sbShowAlert('Error', err?.response?.data?.message || err.message || 'Failed to submit some scores.');
      await sbInitializeMatch();
    } finally {
      setSbButtonDisabled(false);
      setSbMessage('');
    }
  };

  // Re-seed the manual-games input grid whenever format loads/changes
  useEffect(() => {
    if (sbMatchFormat) {
      const total = sbMatchFormat.totalSets || 5;
      setSbManualGames(Array(total).fill().map(() => ({ a: '', b: '' })));
    }
  }, [sbMatchFormat]);

  // Fetch live state whenever the scoreboard opens for a new match
  useEffect(() => {
    if (scoreboardVisible && scoreboardMatch?.matchId) {
      sbInitializeMatch();
    }
  }, [scoreboardVisible, scoreboardMatch?.matchId, sbInitializeMatch]);

  // Lock orientation: Auto mode = landscape (side-by-side tap zones), Manual mode = portrait (stacked cards).
  // Restore portrait when the modal closes or component unmounts.
  useEffect(() => {
    if (!scoreboardVisible) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      return;
    }
    const target = sbIsEnabled
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP;
    ScreenOrientation.lockAsync(target).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [scoreboardVisible, sbIsEnabled]);

  // No changes needed to columns, keeping them for the leaderboard view mode

  // DATA FETCHING
  useEffect(() => {
    if (isGroupStage) {
      fetchGroups();
      fetchKnockoutMatches();
      fetchAllGroupTopPlayers();
    } else if (isSinglesKnockout || isTeamKnockout) {
      // Pure-knockout tournaments (singles or team) have no group standings
      // to render. fetchKnockoutMatches pulls from all 3 collections
      // (SuperMatch, DirectKnockoutMatch, TeamKnockoutMatches) and unifies
      // them into one bracket array.
      fetchKnockoutMatches();
      // Team knockouts (Davis Cup) also have a Round Robin pre-phase.
      // Standings come from a separate endpoint backed by round=0 matches.
      if (isTeamKnockout) {
        fetchRoundRobinStandings();
      }
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
      // Chain: compute per-group match completion map once groups are known
      fetchGroupCompletion(groups);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      if (!isGroupStage) setLoading(false);
    }
  };

  // Fetch top players for ALL groups in one request — used for group cards preview
  const fetchAllGroupTopPlayers = async () => {
    try {
      const resp = await axios.get(API.ENDPOINTS.TOP_PLAYERS.BY_TOURNAMENT(tournamentId));
      // Response: { success: true, topPlayers: [{ playerName, points, groupId, ... }] }
      const flatPlayers = resp.data?.topPlayers || [];
      const map = {};
      flatPlayers.forEach(player => {
        const gid = player.groupId?.toString?.() || player.groupId;
        if (!gid) return;
        if (!map[gid]) map[gid] = [];
        map[gid].push(player);
      });
      // Sort each group's players by points (descending)
      Object.keys(map).forEach(gid => {
        map[gid].sort((a, b) => (b.points || 0) - (a.points || 0));
      });
      setTopPlayersByGroup(map);
    } catch (err) {
      // Silent — top players may not be generated yet
    }
  };

  // Compute per-group match completion map (used to green-tint finished group cards).
  // No server endpoint returns all group-stage matches at once, so we fan out per group.
  const fetchGroupCompletion = async (groupList) => {
    try {
      const list = Array.isArray(groupList) ? groupList : [];
      if (list.length === 0) return;
      const results = await Promise.all(
        list.map(async (g) => {
          const gid = g?._id;
          if (!gid) return null;
          try {
            const resp = await axios.get(
              `${API.ENDPOINTS.MATCHES.BY_GROUP(tournamentId, gid)}?mobile=true`
            );
            const data = resp.data;
            const matches = data?.matches || data?.data || (Array.isArray(data) ? data : []);
            const total = matches.length;
            const completed = matches.filter(
              (m) => String(m?.status || '').toUpperCase() === 'COMPLETED'
            ).length;
            return [gid.toString(), { total, completed, allDone: total > 0 && completed === total }];
          } catch {
            return null;
          }
        })
      );
      const map = {};
      results.forEach((entry) => {
        if (entry) map[entry[0]] = entry[1];
      });
      setGroupCompletion(map);
    } catch (err) {
      // Silent — completion tint is a progressive enhancement
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

  // Fetch Round Robin standings for team knockouts. RR matches are stored in
  // TeamKnockoutMatches with round=0; this endpoint returns the per-team
  // points table aggregated from completed RR matches. No-op for non-team
  // tournaments (the endpoint returns empty teams).
  const fetchRoundRobinStandings = async () => {
    try {
      const res = await axios.get(API.ENDPOINTS.TEAM_KNOCKOUT.ROUND_ROBIN_STANDINGS(tournamentId));
      const arr = res?.data?.data?.standings || res?.data?.standings || [];
      // Sort by points desc, then by setsWon desc as a tiebreak.
      arr.sort((a, b) => {
        const dp = (b.points || 0) - (a.points || 0);
        if (dp !== 0) return dp;
        return (b.setsWon || b.roundsWon || 0) - (a.setsWon || a.roundsWon || 0);
      });
      setRoundRobinStandings(arr);
    } catch (err) {
      console.warn('Round robin standings fetch failed:', err?.message);
      setRoundRobinStandings([]);
    }
  };

  // Fetch knockout matches - unified across all 3 collections so the bracket
  // tab works regardless of tournament flavor:
  //   - SuperMatch:           group stage → knockout final phase
  //   - DirectKnockoutMatch:  singles knockout (player vs player)
  //   - TeamKnockoutMatches:  team knockout / Davis Cup (team vs team, populated)
  const fetchKnockoutMatches = async () => {
    try {
      const [superMatchResponse, directKnockoutResponse, teamKnockoutResponse] = await Promise.all([
        axios.get(API.ENDPOINTS.GROUP_STAGE.KNOCKOUT_MATCHES(tournamentId))
          .catch(() => ({ data: { success: false, matches: [] } })),
        axios.get(API.ENDPOINTS.PROGRESSION.DIRECT_KNOCKOUT_MATCHES(tournamentId))
          .catch(() => ({ data: { success: false, matches: [] } })),
        // Team knockout endpoint populates team1Id / team2Id / winnerId so
        // we can read team names directly without a second fetch.
        axios.get(API.ENDPOINTS.TEAM_KNOCKOUT.BY_TOURNAMENT(tournamentId))
          .catch(() => ({ data: { success: false, matches: [] } })),
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

      // Process Team Knockout matches (Davis Cup style). Server populates
      // team1Id/team2Id/winnerId; we shape them into the unified
      // {player1, player2, score, ...} format so the existing renderBracket
      // can render team brackets without a separate code path.
      //
      // IMPORTANT: round=0 are Round Robin matches (precede the bracket).
      // We filter them OUT of the bracket array and surface them via the
      // dedicated Round Robin tab (renderRoundRobin) using the standings
      // endpoint. Only round>=1 matches feed into the bracket.
      if (teamKnockoutResponse.data.success && teamKnockoutResponse.data.matches?.length > 0) {
        const teamName = (t) => {
          if (!t) return 'TBD';
          if (typeof t === 'string') return 'TBD';
          return t.teamName || t.userName || t.name || 'TBD';
        };
        // Shared normalizer for both RR (round=0) and bracket (round>=1).
        const enrichTeamMatch = (match) => {
          const t1 = match.team1Id;
          const t2 = match.team2Id;
          const w = match.winnerId;
          const setsHome = match.setsWon?.home ?? 0;
          const setsAway = match.setsWon?.away ?? 0;
          const isCompleted = (match.status || '').toLowerCase() === 'completed' || !!w;
          const normalizedStatus = match.isBye
            ? 'completed'
            : (match.status || 'scheduled').toLowerCase();
          const roundNumber = typeof match.round === 'number' ? match.round : parseInt(match.round, 10);
          return {
            ...match,
            _id: match._id,
            type: 'team-knockout',
            status: normalizedStatus,
            hasScores: isCompleted,
            round: `round-${roundNumber}`,
            roundNumber,
            matchNumber: match.bracketPosition,
            courtNumber: match.courtNumber,
            matchDate: match.matchDate,
            score: { player1Sets: setsHome, player2Sets: setsAway },
            player1: { playerName: teamName(t1), playerId: t1?._id || t1 },
            player2: { playerName: match.isBye ? 'BYE' : teamName(t2), playerId: t2?._id || t2 },
            winner: w ? { playerName: teamName(w), playerId: w?._id || w } : null,
            winnerName: w ? teamName(w) : null,
          };
        };
        // Split round=0 (Round Robin) from round>=1 (Bracket).
        const rrRaw = [];
        const koRaw = [];
        for (const m of teamKnockoutResponse.data.matches) {
          const r = typeof m.round === 'number' ? m.round : parseInt(m.round, 10);
          if (Number.isFinite(r) && r >= 1) koRaw.push(m);
          else rrRaw.push(m);
        }
        const enrichedRR = rrRaw.map(enrichTeamMatch);
        const enrichedKO = koRaw.map(enrichTeamMatch);
        // RR matches go to their own state for the Round Robin tab; bracket
        // matches join the unified knockout array.
        setRoundRobinMatches(enrichedRR);
        allMatches = [...allMatches, ...enrichedKO];
      } else {
        // No team-knockout matches at all — clear stale RR state
        setRoundRobinMatches([]);
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

      if (type?.includes('group stage')) {
        endpoint = API.ENDPOINTS.LEADERBOARD.GROUP_STAGE_PLAYERS(tournamentId);
      } else if (type?.includes('knockout')) {
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
    // Knockout fetch fires for any tournament flavor that has a bracket:
    // group-stage finals, singles knockout, and team knockout (Davis Cup).
    const knockoutFetch =
      (isGroupStage || isSinglesKnockout || isTeamKnockout)
        ? fetchKnockoutMatches()
        : Promise.resolve();
    const topPlayersFetch = isGroupStage ? fetchAllGroupTopPlayers() : Promise.resolve();
    const rrFetch = isTeamKnockout ? fetchRoundRobinStandings() : Promise.resolve();
    Promise.all([mainFetch, groupFetch, knockoutFetch, topPlayersFetch, rrFetch]).finally(() => setRefreshing(false));
  }, [isGroupStage, isSinglesKnockout, isTeamKnockout]);

  // FILTERING AND SORTING
  const filteredAndSortedData = useMemo(() => {

    let filtered = [...leaderboardData];


    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        if (tournamentType?.toLowerCase().includes('group stage')) {
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

  const renderGroups = () => {
    // Derive unique categories from groups
    const categories = Array.from(
      new Set(groups.map(g => g.category).filter(Boolean))
    );

    // Apply category filter
    const filteredGroups = groupCategoryFilter === 'all'
      ? groups
      : groups.filter(g => g.category === groupCategoryFilter);

    return (
    <View style={styles.tabContent}>
      {/* Category Filter */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterRow}
          style={{ marginBottom: 14 }}
        >
          <TouchableOpacity
            onPress={() => setGroupCategoryFilter('all')}
            style={[
              styles.categoryChip,
              groupCategoryFilter === 'all' && styles.categoryChipActive,
            ]}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.categoryChipText,
              groupCategoryFilter === 'all' && styles.categoryChipTextActive,
            ]}>
              All ({groups.length})
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => {
            const count = groups.filter(g => g.category === cat).length;
            const isActive = groupCategoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setGroupCategoryFilter(cat)}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.categoryChipText,
                  isActive && styles.categoryChipTextActive,
                ]}>
                  {formatCategory(cat)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {filteredGroups.length > 0 ? (
        <View style={styles.groupGrid}>
          {filteredGroups.map((group, index) => {
            const groupTopPlayers = (topPlayersByGroup[group._id] || []).slice(0, 3);
            const completion = groupCompletion[group._id?.toString?.() || group._id];
            const allDone = !!completion?.allDone;
            return (
              <TouchableOpacity
                key={group._id || index}
                style={styles.groupCard}
                onPress={() => {
                  setSelectedGroup(group);
                  fetchGroupData(group._id);
                }}
              >
                <LinearGradient
                  colors={allDone ? ['#10B981', '#059669'] : ['#F4CE74', '#FF7426']}
                  style={styles.groupCardHeader}
                >
                  <Text style={styles.groupCardTitle}>{group.name || group.groupName || `Group ${index + 1}`}</Text>
                  <Ionicons name={allDone ? 'checkmark-circle' : 'people'} size={20} color="white" />
                </LinearGradient>
                <View style={styles.groupCardBody}>
                  <View style={styles.groupStatRow}>
                    <Text style={styles.groupStatLabel}>Players:</Text>
                    <Text style={styles.groupStatValue}>{group.players?.length || group.teams?.length || 0}</Text>
                  </View>
                  {group.category && (
                    <View style={styles.groupStatRow}>
                      <Text style={styles.groupStatLabel}>Category:</Text>
                      <Text style={[styles.groupStatValue, { color: '#15A765' }]}>{formatCategory(group.category)}</Text>
                    </View>
                  )}

                  {/* Top Players Preview */}
                  {groupTopPlayers.length > 0 && (
                    <View style={styles.groupTopPlayersBox}>
                      <View style={styles.groupTopPlayersHeader}>
                        <Ionicons name="trophy" size={11} color="#15A765" />
                        <Text style={styles.groupTopPlayersTitle}>Top Players</Text>
                      </View>
                      {groupTopPlayers.map((player, pIdx) => {
                        const medal = pIdx === 0 ? '#FFD700' : pIdx === 1 ? '#C0C0C0' : '#CD7F32';
                        return (
                          <View key={pIdx} style={styles.groupTopPlayerRow}>
                            <View style={[styles.groupTopPlayerRank, { backgroundColor: medal }]}>
                              <Text style={styles.groupTopPlayerRankText}>{pIdx + 1}</Text>
                            </View>
                            <Text style={styles.groupTopPlayerName} numberOfLines={1}>
                              {player.playerName || player.userName || player.name || 'Unknown'}
                            </Text>
                            <Text style={styles.groupTopPlayerPts}>{player.points ?? player.totalPoints ?? 0}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
                <View style={styles.groupCardFooter}>
                  <Text style={styles.viewMatchesText}>View Matches</Text>
                  <Ionicons name="arrow-forward" size={16} color="#15A765" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.noDataBox}>
          <Ionicons name="layers-outline" size={48} color="#ddd" />
          <Text style={styles.noDataText}>
            {groupCategoryFilter === 'all' ? 'No groups created yet' : 'No groups in this category'}
          </Text>
        </View>
      )}
    </View>
    );
  };

  const renderMatches = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity
        style={styles.backToGroups}
        onPress={() => setViewMode('GROUPS')}
      >
        <Ionicons name="arrow-back" size={20} color="#15A765" />
        <Text style={styles.backToGroupsText}>Back to Groups</Text>
      </TouchableOpacity>

      <View style={styles.matchGroupHeader}>
        <Text style={styles.matchGroupTitle}>{selectedGroup?.name || selectedGroup?.groupName}</Text>
      </View>

      {/* Group Standings Section */}
      {groupStandings.length > 0 && (
        <View style={styles.standingsContainer}>
          <View style={styles.standingsHeader}>
            <Ionicons name="podium" size={18} color="#15A765" />
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
        <ActivityIndicator size="small" color="#15A765" style={{ marginTop: 20 }} />
      ) : matches.length > 0 ? (
        matches.map((match, index) => {
          // Phase 4e: umpire tap-to-score gating. Authorized umpires open the
          // scorer screen; everyone else (players, viewers, unauthorized
          // umpires) opens the read-only match details modal — same pattern
          // as the knockout bracket cards (~line 1791).
          const canScore = isAuthorizedForMatch(match);
          const isCompleted = match.status === 'COMPLETED' || match.status === 'completed';
          const canOpenScorer = canScore && !isCompleted;
          const matchLabel = match.matchNumber
            ? `M${match.matchNumber} • ${(match.player1?.userName || match.player1?.playerName || 'P1')} vs ${(match.player2?.userName || match.player2?.playerName || 'P2')}`
            : (tournamentName || 'Match');
          return (
            <TouchableOpacity
              key={match._id || index}
              style={styles.matchCard}
              activeOpacity={0.85}
              onPress={() => {
                if (canOpenScorer) {
                  openScoreboard(match);
                } else {
                  setSelectedMatch(match);
                }
              }}
            >
              <View style={styles.matchMeta}>
                <Text style={styles.matchDate}>
                  {match.startTime || match.scheduledTime ? new Date(match.startTime || match.scheduledTime).toLocaleDateString() : 'TBD'}
                </Text>
                <View style={[styles.matchStatusBadge, { backgroundColor: match.status === 'COMPLETED' ? '#E8F5E9' : '#DCFCE7' }]}>
                  <Text style={[styles.matchStatusText, { color: match.status === 'COMPLETED' ? '#2E7D32' : '#FF8F00' }]}>
                    {match.status || 'SCHEDULED'}
                  </Text>
                </View>
              </View>
              <View style={styles.matchTeams}>
                <View style={styles.matchTeam}>
                  <Text style={styles.matchTeamName}>{match.player1?.userName || match.player1?.playerName || match.team1?.name || 'TBD'}</Text>
                  <Text style={styles.matchScore}>
                    {(() => { const r = require('../../utils/matchResultUtils').readMatchResult(match); return r?.player1Score ?? 0; })()}
                  </Text>
                </View>
                <View style={styles.matchVs}>
                  <Text style={styles.vsText}>{match.courtNumber ? `COURT ${match.courtNumber}` : 'VS'}</Text>
                </View>
                <View style={styles.matchTeam}>
                  <Text style={styles.matchScore}>
                    {(() => { const r = require('../../utils/matchResultUtils').readMatchResult(match); return r?.player2Score ?? 0; })()}
                  </Text>
                  <Text style={styles.matchTeamName}>{match.player2?.userName || match.player2?.playerName || match.team2?.name || 'TBD'}</Text>
                </View>
              </View>
              {canOpenScorer && (
                <View style={styles.tapScoreHint}>
                  <MaterialIcons name="edit" size={12} color="#15A765" />
                  <Text style={styles.tapScoreHintText}>Tap to score</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
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
            <Text style={[styles.pCell, { flex: 1, color: '#15A765', fontWeight: '800' }]}>
              {item.performanceScore || item.totalPoints || item.winRate || 0}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Single match-card renderer used by the FlatList below. Pulled out of
  // renderRoundRobin so it can be referenced as FlatList renderItem without
  // closure-over-list bugs and so the parent component doesn't recompute the
  // card JSX for items that aren't visible.
  const renderRRMatchCard = useCallback(({ item: match, index: idx }) => {
    const isCompleted = (match.status || '').toLowerCase() === 'completed';
    const isLive =
      (match.status || '').toLowerCase() === 'in-progress' ||
      (match.status || '').toLowerCase() === 'in_progress';
    const t1Name = match.player1?.playerName || 'TBD';
    const t2Name = match.player2?.playerName || 'TBD';
    const t1Sets = match.score?.player1Sets ?? 0;
    const t2Sets = match.score?.player2Sets ?? 0;
    const winnerName = match.winnerName;
    const t1Won = isCompleted && winnerName === t1Name;
    const t2Won = isCompleted && winnerName === t2Name;
    const matchTime = match.matchDate
      ? new Date(match.matchDate).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    const statusColor = isCompleted ? '#16A34A' : isLive ? '#F59E0B' : '#9CA3AF';
    const statusLabel = isCompleted ? 'COMPLETED' : isLive ? 'LIVE' : 'SCHEDULED';

    return (
      <TouchableOpacity
        style={rrStyles.matchCard}
        activeOpacity={0.7}
        onPress={() => setSelectedMatch(match)}
      >
        <View style={rrStyles.matchHeader}>
          <Text style={rrStyles.matchNumber}>RR · M{match.matchNumber || idx + 1}</Text>
          <View style={[rrStyles.matchStatusPill, { backgroundColor: statusColor }]}>
            {isLive && <View style={rrStyles.liveDot} />}
            <Text style={rrStyles.matchStatusText}>{statusLabel}</Text>
          </View>
        </View>
        <View style={rrStyles.vsRow}>
          <View style={[rrStyles.teamSide, t1Won && rrStyles.teamSideWon]}>
            <Text
              style={[
                rrStyles.teamSideName,
                t1Won && rrStyles.teamSideNameWon,
                isCompleted && !t1Won && rrStyles.teamSideNameLost,
              ]}
              numberOfLines={2}
            >
              {t1Name}
            </Text>
            {(isCompleted || isLive) && (
              <Text style={[rrStyles.teamSideScore, t1Won && rrStyles.teamSideScoreWon]}>
                {t1Sets}
              </Text>
            )}
          </View>
          <View style={rrStyles.vsCenter}>
            <Text style={rrStyles.vsLabel}>VS</Text>
          </View>
          <View style={[rrStyles.teamSide, t2Won && rrStyles.teamSideWon]}>
            <Text
              style={[
                rrStyles.teamSideName,
                t2Won && rrStyles.teamSideNameWon,
                isCompleted && !t2Won && rrStyles.teamSideNameLost,
              ]}
              numberOfLines={2}
            >
              {t2Name}
            </Text>
            {(isCompleted || isLive) && (
              <Text style={[rrStyles.teamSideScore, t2Won && rrStyles.teamSideScoreWon]}>
                {t2Sets}
              </Text>
            )}
          </View>
        </View>
        {(match.courtNumber || matchTime) && (
          <View style={rrStyles.matchFooter}>
            {match.courtNumber && (
              <View style={rrStyles.matchFooterItem}>
                <Ionicons name="location-outline" size={12} color="#6B7280" />
                <Text style={rrStyles.matchFooterText}>{match.courtNumber}</Text>
              </View>
            )}
            {matchTime && (
              <View style={rrStyles.matchFooterItem}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text style={rrStyles.matchFooterText}>{matchTime}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, []);

  // Banner shown above the FlatList (as ListHeaderComponent). Memoized so it
  // doesn't re-render on every item viewport change.
  const renderRRListHeader = useCallback(() => {
    const completed = roundRobinMatches.filter(
      (m) => (m.status || '').toLowerCase() === 'completed'
    ).length;
    const total = roundRobinMatches.length;
    return (
      <View style={rrStyles.banner}>
        <View style={rrStyles.bannerIconWrap}>
          <Ionicons name="grid" size={18} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rrStyles.bannerTitle}>Round Robin Phase</Text>
          <Text style={rrStyles.bannerSubtitle}>
            Every team plays every other team
          </Text>
        </View>
        <View style={rrStyles.bannerCount}>
          <Text style={rrStyles.bannerCountText}>
            {completed}
            <Text style={rrStyles.bannerCountSep}>/</Text>
            {total}
          </Text>
          <Text style={rrStyles.bannerCountLabel}>DONE</Text>
        </View>
      </View>
    );
  }, [roundRobinMatches]);

  // Round Robin tab — empty state delegated to renderContent's switch.
  // The actual list is rendered by the dedicated FlatList in the return JSX
  // (see RR_LIST_BRANCH below) so 5000+ items virtualize properly. This
  // function only handles the empty-state branch.
  const renderRoundRobin = () => {
    if (!roundRobinMatches || roundRobinMatches.length === 0) {
      return (
        <View style={styles.noDataBox}>
          <Ionicons name="grid-outline" size={48} color="#ddd" />
          <Text style={styles.noDataText}>
            Round robin matches will appear here once they're generated.
          </Text>
        </View>
      );
    }
    // Non-empty case is rendered by the FlatList branch in the return JSX.
    // Returning null here means the ScrollView path doesn't try to render
    // thousands of cards — only the FlatList does.
    return null;
  };

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

  // ──────────────────────────────────────────────────────────────────────
  // Share — captures the View Results card as a PNG and opens the native
  // share sheet so users can post to Instagram / WhatsApp / Twitter / etc.
  // expo-sharing routes the file through the OS share sheet, which lists
  // every app that accepts image/png. No app-specific deep link needed.
  // ──────────────────────────────────────────────────────────────────────
  const shareResults = async () => {
    if (sharingResults) return;
    if (!resultsCaptureRef.current) {
      Alert.alert('Error', 'Could not prepare results to share.');
      return;
    }
    try {
      setSharingResults(true);

      // Capture the card as PNG. Use higher result quality (2x) so the
      // image stays crisp when reposted to high-DPI feeds.
      const tempUri = await captureRef(resultsCaptureRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      // Rename to a descriptive filename so the share sheet shows it nicely.
      const slugify = (s) =>
        String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const tName = tournamentName || tournament?.title || tournament?.name || 'tournament';
      const today = new Date().toISOString().split('T')[0];
      const filename = `${slugify(tName) || 'tournament'}-results-${today}.png`;

      let shareUri = tempUri;
      try {
        const target = `${FileSystem.cacheDirectory || ''}${filename}`;
        if (target && target !== tempUri) {
          await FileSystem.copyAsync({ from: tempUri, to: target });
          shareUri = target;
        }
      } catch (renameErr) {
        // Fall back to the temp uri if rename fails — sharing still works
        console.warn('Share image rename failed, using temp uri:', renameErr?.message);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Tournament Results',
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Saved', `Results image saved at:\n${shareUri}`);
      }
    } catch (err) {
      console.error('Share results failed:', err);
      Alert.alert('Error', err?.message || 'Could not share results');
    } finally {
      setSharingResults(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // PDF download — bracket export (Option A: expo-print HTML→PDF).
  // Mirrors the on-screen tree layout (rounds left-to-right, three-row
  // cards with player1 / date·time·court / player2). A3 landscape so wide
  // brackets fit. Filename is auto-generated as
  // <tournament>-bracket-<sport>-<YYYY-MM-DD>.pdf.
  // ──────────────────────────────────────────────────────────────────────
  const downloadBracketPDF = async () => {
    if (downloadingPDF) return;
    if (!knockoutMatches || knockoutMatches.length === 0) {
      Alert.alert('No bracket', 'There are no knockout matches to export yet.');
      return;
    }
    try {
      setDownloadingPDF(true);

      // Pull the same filtered + grouped data the on-screen renderBracket uses.
      // Reuse the same logic so the PDF matches what's rendered.
      const escapeHtml = (s) =>
        String(s ?? '').replace(/[&<>"']/g, (c) => (
          { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));

      // Re-derive category for each match exactly like renderBracket does.
      const nameToCategory = {};
      const idToCategory = {};
      Object.values(topPlayersByGroup).forEach((players) => {
        if (!Array.isArray(players)) return;
        players.forEach((p) => {
          const cat = p?.category;
          if (!cat) return;
          const nm = p?.playerName || p?.userName || p?.name;
          if (nm) nameToCategory[nm] = cat;
          const pid = p?.playerId?.toString?.() || p?.playerId;
          if (pid) idToCategory[pid] = cat;
        });
      });
      groups.forEach((g) => {
        if (!g?.category) return;
        (g.players || []).forEach((p) => {
          const nm = p?.userName || p?.playerName || p?.name;
          if (nm && !nameToCategory[nm]) nameToCategory[nm] = g.category;
          const pid = p?.playerId?.toString?.() || p?.playerId;
          if (pid && !idToCategory[pid]) idToCategory[pid] = g.category;
        });
      });
      const deriveCat = (m) => {
        if (m?.category) return m.category;
        const fromGroup = m?.player1?.fromGroup || m?.player2?.fromGroup;
        if (fromGroup) {
          const g = groups.find(
            (gr) => gr?.name === fromGroup || gr?.groupName === fromGroup
          );
          if (g?.category) return g.category;
        }
        const p1Id = m?.player1?.playerId?._id?.toString?.() || m?.player1?.playerId?.toString?.();
        const p2Id = m?.player2?.playerId?._id?.toString?.() || m?.player2?.playerId?.toString?.();
        const p1n = m?.player1?.playerName || m?.player1?.playerId?.name;
        const p2n = m?.player2?.playerName || m?.player2?.playerId?.name;
        return idToCategory[p1Id] || idToCategory[p2Id] || nameToCategory[p1n] || nameToCategory[p2n] || null;
      };

      const filteredKO = knockoutCategoryFilter === 'all'
        ? knockoutMatches
        : knockoutMatches.filter((m) => deriveCat(m) === knockoutCategoryFilter);

      const roundGroups = {};
      filteredKO.forEach((m) => {
        let rNum = m.roundNumber;
        if (!rNum) {
          const rName = (m.round || '').toLowerCase();
          if (rName.includes('final') && !rName.includes('semi') && !rName.includes('quarter')) rNum = 100;
          else if (rName.includes('semi')) rNum = 99;
          else if (rName.includes('quarter')) rNum = 98;
          else if (rName.includes('pre')) rNum = 97;
          else rNum = 1;
        }
        if (!roundGroups[rNum]) roundGroups[rNum] = [];
        roundGroups[rNum].push(m);
      });
      const sortedKeys = Object.keys(roundGroups).sort((a, b) => Number(a) - Number(b));
      if (sortedKeys.length === 0) {
        Alert.alert('No matches', 'No matches to export in the current category filter.');
        setDownloadingPDF(false);
        return;
      }

      // PDF uses a COMPACT layout — fixed gap between cards, no tree-margin
      // doubling. Why: the on-screen tree algorithm generates huge per-round
      // margins (R7 = 3790px) which inflates page height to ~10000px and
      // makes PDF rendering slow + multi-MB on large brackets. Stacking cards
      // tightly is faster, fits on A3, and still reads clearly because rounds
      // are still laid out left-to-right by column.
      const PDF_CARD_HEIGHT = 100;
      const PDF_COLUMN_WIDTH = 220;
      const PDF_COLUMN_GAP = 40;
      const PDF_CARD_GAP = 10; // vertical spacing between cards within a round

      // Round-name helper (mirrors formatCategory but handles dashes too).
      const roundLabel = (raw, fallbackIndex) => {
        if (!raw) return `Round ${fallbackIndex + 1}`;
        return String(raw)
          .replace(/[-_]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      };

      // Local time formatters — same shape as the on-screen middle row.
      const fmtDate = (iso) => {
        if (!iso) return '';
        try {
          const d = new Date(iso);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '-');
        } catch { return ''; }
      };
      const fmtTime = (iso) => {
        if (!iso) return '';
        try {
          const d = new Date(iso);
          if (isNaN(d.getTime())) return '';
          return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
        } catch { return ''; }
      };

      let columnsHTML = '';
      sortedKeys.forEach((key, rIdx) => {
        const matchesInRound = [...roundGroups[key]].sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));
        const titleSrc = matchesInRound[0]?.round || matchesInRound[0]?.roundName;
        const title = roundLabel(titleSrc, rIdx);

        let cardsHTML = '';
        matchesInRound.forEach((match) => {
          const p1Name = match.player1?.playerName || match.player1?.playerId?.name || match.player1?.name || (match.player1 ? 'TBD' : 'Bye');
          const p2Name = match.player2?.playerName || match.player2?.playerId?.name || match.player2?.name || (match.player2 ? 'TBD' : 'Bye');
          const p1Score = match.score?.player1Sets ?? match.result?.finalScore?.player1Sets ?? 0;
          const p2Score = match.score?.player2Sets ?? match.result?.finalScore?.player2Sets ?? 0;
          const isCompleted = match.status === 'completed' || match.status === 'COMPLETED';
          const winnerName =
            match.winnerName ||
            match.winner?.playerName ||
            match.result?.winner?.playerName ||
            null;
          const p1Won = isCompleted && ((winnerName && winnerName === p1Name) || (!winnerName && p1Score > p2Score));
          const p2Won = isCompleted && ((winnerName && winnerName === p2Name) || (!winnerName && p2Score > p1Score));

          const _iso = match.matchStartTime || match.startTime || match.matchDate;
          const _date = fmtDate(_iso);
          const _time = fmtTime(_iso);
          const _court = match.courtNumber || '';
          const hasInfo = _date || _time || _court;

          const infoInner = hasInfo
            ? `${_date ? `<span>${escapeHtml(_date)}</span>` : ''}${_time ? `<span>${escapeHtml(_time)}</span>` : ''}${_court ? `<span class="court">${escapeHtml(_court)}</span>` : ''}`
            : `<span class="tbd">TBD</span>`;

          cardsHTML += `<div class="card">
  <div class="row${p1Won ? ' won' : ''}">
    <span class="name">${escapeHtml(p1Name)}</span>
    <span class="score">${escapeHtml(p1Score)}</span>
  </div>
  <div class="info-row">${infoInner}</div>
  <div class="row${p2Won ? ' won' : ''}">
    <span class="name">${escapeHtml(p2Name)}</span>
    <span class="score">${escapeHtml(p2Score)}</span>
  </div>
</div>`;
        });

        columnsHTML += `<div class="round-col">
  <div class="round-title">${escapeHtml(title)}</div>
  ${cardsHTML}
</div>`;
      });

      const tName = tournamentName || tournament?.title || tournament?.name || 'Tournament';
      const sName = (() => {
        const sportsArr = tournament?.sports || tournament?.rawData?.sports || [];
        if (Array.isArray(sportsArr) && sportsArr.length > 0) {
          return sportsArr[0]?.sportName || sportsArr[0]?.name || '';
        }
        return tournamentType || '';
      })();
      const catLabel = knockoutCategoryFilter && knockoutCategoryFilter !== 'all'
        ? formatCategory(knockoutCategoryFilter)
        : '';
      const generatedAt = new Date().toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A3 landscape; margin: 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937; margin: 0; }
  .header { padding-bottom: 12px; margin-bottom: 16px; border-bottom: 2px solid #15A765; }
  .header h1 { margin: 0; font-size: 22px; color: #1F2937; font-weight: 800; }
  .header .meta { font-size: 11px; color: #6B7280; margin-top: 4px; }
  .bracket { display: flex; flex-direction: row; gap: ${PDF_COLUMN_GAP}px; align-items: flex-start; }
  .round-col { width: ${PDF_COLUMN_WIDTH}px; flex-shrink: 0; }
  .round-title { font-size: 12px; font-weight: 800; color: #004E93; text-transform: uppercase; text-align: center; margin-bottom: 16px; letter-spacing: 0.6px; padding-bottom: 8px; border-bottom: 1px solid #ECEFF1; }
  .card { width: 180px; background: #fff; border: 1px solid #E0E0E0; border-radius: 8px; padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); margin-bottom: ${PDF_CARD_GAP}px; page-break-inside: avoid; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 6px; margin: 0 -6px; border-radius: 4px; }
  .row.won { background: #E8F5E9; }
  .row .name { font-size: 12px; font-weight: 600; color: #1F2937; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row.won .name { color: #1B5E20; font-weight: 800; }
  .row .score { font-size: 13px; font-weight: 800; color: #6B7280; margin-left: 8px; }
  .row.won .score { color: #1B5E20; }
  .info-row { display: flex; justify-content: space-around; align-items: center; padding: 5px 6px; background: #F5F7FA; border-top: 1px solid #ECEFF1; border-bottom: 1px solid #ECEFF1; margin: 0 -6px; }
  .info-row span { font-size: 10px; font-weight: 700; color: #37474F; }
  .info-row span.court { color: #1F2937; font-weight: 900; }
  .info-row span.tbd { color: #9E9E9E; font-style: italic; }
  .footer { margin-top: 24px; font-size: 10px; color: #9CA3AF; text-align: center; }
</style></head>
<body>
  <div class="header">
    <h1>${escapeHtml(tName)}</h1>
    <div class="meta">${escapeHtml(sName)}${catLabel ? ' · ' + escapeHtml(catLabel) : ''} · Generated ${escapeHtml(generatedAt)}</div>
  </div>
  <div class="bracket">${columnsHTML}</div>
  <div class="footer">Knockout Bracket · ChaloKhelne</div>
</body></html>`;

      // A3 landscape: 1190 × 842 points (1 pt = 1/72 inch)
      const { uri: tempUri } = await Print.printToFileAsync({
        html,
        width: 1190,
        height: 842,
        base64: false,
      });

      // Rename to a meaningful filename so the share sheet shows it nicely.
      const slugify = (s) =>
        String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const today = new Date().toISOString().split('T')[0];
      const filename =
        `${slugify(tName) || 'tournament'}-bracket-${slugify(sName) || 'sport'}-${today}.pdf`;

      let shareUri = tempUri;
      try {
        const target = `${FileSystem.cacheDirectory || ''}${filename}`;
        if (target && target !== tempUri) {
          // Best-effort rename — fall back to the temp uri on any failure
          await FileSystem.copyAsync({ from: tempUri, to: target });
          shareUri = target;
        }
      } catch (renameErr) {
        console.warn('PDF rename failed, using temp uri:', renameErr?.message);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save bracket PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF saved', `File saved at:\n${shareUri}`);
      }
    } catch (err) {
      console.error('PDF generation failed:', err);
      Alert.alert('Error', err?.message || 'Could not generate PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const renderBracket = () => {
    if (!knockoutMatches || knockoutMatches.length === 0) {
      return (
        <View style={styles.noDataBox}>
          <Ionicons name="trophy-outline" size={48} color="#ddd" />
          <Text style={styles.noDataText}>Knockout stage matches have not been generated yet.</Text>
        </View>
      );
    }

    // Derive category per match. Build a playerName/playerId → category lookup
    // from every available source: topPlayersByGroup (has category per player),
    // the groups array (players[] with category inherited from group.category).
    const nameToCategory = {};
    const idToCategory = {};
    Object.values(topPlayersByGroup).forEach((players) => {
      if (!Array.isArray(players)) return;
      players.forEach((p) => {
        const cat = p?.category;
        if (!cat) return;
        const nm = p?.playerName || p?.userName || p?.name;
        if (nm) nameToCategory[nm] = cat;
        const pid = p?.playerId?.toString?.() || p?.playerId;
        if (pid) idToCategory[pid] = cat;
      });
    });
    groups.forEach((g) => {
      if (!g?.category) return;
      (g.players || []).forEach((p) => {
        const nm = p?.userName || p?.playerName || p?.name;
        if (nm && !nameToCategory[nm]) nameToCategory[nm] = g.category;
        const pid = p?.playerId?.toString?.() || p?.playerId;
        if (pid && !idToCategory[pid]) idToCategory[pid] = g.category;
      });
    });

    const deriveCategory = (m) => {
      if (m?.category) return m.category;
      const fromGroup = m?.player1?.fromGroup || m?.player2?.fromGroup;
      if (fromGroup) {
        const g = groups.find(
          (gr) => gr?.name === fromGroup || gr?.groupName === fromGroup
        );
        if (g?.category) return g.category;
      }
      const p1Id = m?.player1?.playerId?._id?.toString?.() || m?.player1?.playerId?.toString?.();
      const p2Id = m?.player2?.playerId?._id?.toString?.() || m?.player2?.playerId?.toString?.();
      const p1n = m?.player1?.playerName || m?.player1?.playerId?.name;
      const p2n = m?.player2?.playerName || m?.player2?.playerId?.name;
      return (
        idToCategory[p1Id] ||
        idToCategory[p2Id] ||
        nameToCategory[p1n] ||
        nameToCategory[p2n] ||
        null
      );
    };

    const knockoutCategories = Array.from(
      new Set(knockoutMatches.map(deriveCategory).filter(Boolean))
    );
    const filteredKnockoutMatches = knockoutCategoryFilter === 'all'
      ? knockoutMatches
      : knockoutMatches.filter((m) => deriveCategory(m) === knockoutCategoryFilter);

    // 1. Group matches by round number to determine layout
    const roundGroups = {};
    filteredKnockoutMatches.forEach(match => {
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

    // Build a top-4 podium from the filtered matches.
    // Champion + Runner-up = final match. Semi-finalists = losers of semi round.
    // Quarter Final winners = the 4 players who advanced from QF to SF (one per
    // QF match). Useful as an explicit results section even though those names
    // also appear in the Champion / Runner-up / Semi rows above.
    const podium = (() => {
      const getWinnerName = (m) =>
        m.winnerName ||
        m.winner?.playerName ||
        m.result?.winner?.playerName ||
        m.matchResult?.winner?.playerName ||
        null;
      const getP1 = (m) => m.player1?.playerName || m.player1?.playerId?.name || null;
      const getP2 = (m) => m.player2?.playerName || m.player2?.playerId?.name || null;
      const isCompleted = (m) => String(m.status).toLowerCase() === 'completed';

      const finals = filteredKnockoutMatches.filter((m) => {
        const r = String(m.round || '').toLowerCase();
        return r === 'final' || (r.includes('final') && !r.includes('semi') && !r.includes('quarter') && !r.includes('pre'));
      });
      const finalMatch = finals.find(isCompleted);
      if (!finalMatch) return null;

      const championName = getWinnerName(finalMatch);
      if (!championName) return null;
      const runnerUpName = championName === getP1(finalMatch) ? getP2(finalMatch) : getP1(finalMatch);

      const semis = filteredKnockoutMatches.filter((m) => {
        const r = String(m.round || '').toLowerCase();
        return r.includes('semi');
      });
      const semiLosers = semis
        .filter(isCompleted)
        .map((m) => {
          const w = getWinnerName(m);
          return w === getP1(m) ? getP2(m) : getP1(m);
        })
        .filter(Boolean);

      // Quarter Final results: winner + loser of each completed QF match.
      // Listed in matchNumber order so the bracket reads top to bottom.
      const quarters = filteredKnockoutMatches
        .filter((m) => {
          const r = String(m.round || '').toLowerCase();
          // "quarter-final", "quarter final", "quarterfinal" — and exclude
          // anything containing "pre-quarter" so a pre-QF round isn't picked up.
          return r.includes('quarter') && !r.includes('pre');
        })
        .filter(isCompleted)
        .sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0))
        .map((m) => {
          const w = getWinnerName(m);
          const p1 = getP1(m);
          const p2 = getP2(m);
          if (!w) return null;
          const loser = w === p1 ? p2 : p1;
          return { winner: w, loser, matchNumber: m.matchNumber };
        })
        .filter(Boolean);

      return { championName, runnerUpName, semiLosers, quarters };
    })();

    const hasResults = !!podium;

    // Constant for layout calculations.
    // CARD_HEIGHT bumped from 70 → 100 to accommodate the middle info row
    // (date · time · court) inserted between Player 1 and Player 2.
    // Tree connector math at line ~1226 derives from CARD_HEIGHT so the
    // round-to-round spacing scales automatically.
    const CARD_HEIGHT = 100;
    const COLUMN_WIDTH = 220; // Fixed column width for alignment
    const COLUMN_MARGIN = 40; // Spacing between columns

    // Formatting helpers for the middle info row. Falls back gracefully when
    // a match has no schedule yet (TBD slots in later rounds).
    const fmtBracketDate = (iso) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '-');
      } catch { return ''; }
    };
    const fmtBracketTime = (iso) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase().replace(' ', '');
      } catch { return ''; }
    };

    // Calculate dynamic margins for each round to ensure tree alignment
    const roundMargins = {};
    let currentMargin = 10; // Base margin for Round 1

    sortedRoundKeys.forEach((key, index) => {
      roundMargins[key] = currentMargin;
      currentMargin = (currentMargin * 2) + (CARD_HEIGHT / 2);
    });

    return (
      <View style={styles.tabContent}>
        {/* Action row — Results (when final completed) + Download PDF */}
        <View style={styles.bracketActionRow}>
          {hasResults && (
            <TouchableOpacity
              style={styles.resultsBtn}
              onPress={() => setShowResultsModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trophy" size={16} color="#fff" />
              <Text style={styles.resultsBtnText}>View Results</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.downloadBtn, downloadingPDF && { opacity: 0.6 }]}
            onPress={downloadBracketPDF}
            activeOpacity={0.85}
            disabled={downloadingPDF}
          >
            {downloadingPDF ? (
              <ActivityIndicator size="small" color="#15A765" />
            ) : (
              <Feather name="download" size={16} color="#15A765" />
            )}
            <Text style={styles.downloadBtnText}>
              {downloadingPDF ? 'Generating…' : 'Download PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter — which categories are playing this knockout */}
        {knockoutCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}
            style={{ marginBottom: 14 }}
          >
            <TouchableOpacity
              onPress={() => setKnockoutCategoryFilter('all')}
              style={[
                styles.categoryChip,
                knockoutCategoryFilter === 'all' && styles.categoryChipActive,
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryChipText,
                knockoutCategoryFilter === 'all' && styles.categoryChipTextActive,
              ]}>
                All ({knockoutMatches.length})
              </Text>
            </TouchableOpacity>
            {knockoutCategories.map((cat) => {
              const count = knockoutMatches.filter((m) => deriveCategory(m) === cat).length;
              const isActive = knockoutCategoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setKnockoutCategoryFilter(cat)}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.categoryChipText,
                    isActive && styles.categoryChipTextActive,
                  ]}>
                    {formatCategory(cat)} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {filteredKnockoutMatches.length === 0 ? (
          <View style={styles.noDataBox}>
            <Ionicons name="trophy-outline" size={48} color="#ddd" />
            <Text style={styles.noDataText}>No knockout matches in this category.</Text>
          </View>
        ) : null}

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

                          // Winner detection — try multiple fields, fall back to score compare
                          const winnerName =
                            match.winnerName ||
                            match.winner?.playerName ||
                            match.result?.winner?.playerName ||
                            match.matchResult?.winner?.playerName ||
                            null;
                          const p1Won = isCompleted && (
                            (winnerName && winnerName === p1Name) ||
                            (!winnerName && p1Score > p2Score)
                          );
                          const p2Won = isCompleted && (
                            (winnerName && winnerName === p2Name) ||
                            (!winnerName && p2Score > p1Score)
                          );

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

                              <TouchableOpacity
                                onLongPress={() => {
                                  // Long-press a player to highlight their bracket path
                                  if (p1Id || p2Id) handlePlayerPress(p1Id || p2Id);
                                }}
                                onPress={() => {
                                  // Authorized umpires open the in-screen scoreboard modal; everyone else opens the read-only modal.
                                  if (isAuthorizedForMatch(match) && !isCompleted) {
                                    openScoreboard(match);
                                  } else {
                                    setSelectedMatch(match);
                                  }
                                }}
                                activeOpacity={0.85}
                                style={[
                                  styles.bracketCard,
                                  { height: CARD_HEIGHT, width: 180 },
                                  isDimmed && { opacity: 0.3, borderColor: '#eee' },
                                  isHighlighted && { borderColor: '#004E93', borderWidth: 2, elevation: 4 }
                                ]}
                              >
                                <View style={[styles.bracketRow, p1Won && styles.bracketRowWon]}>
                                  <Text
                                    style={[
                                      styles.bracketName,
                                      p1Won && styles.bracketWinner,
                                      p1IsSelected && { color: '#004E93', fontWeight: 'bold' }
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {p1Name}
                                  </Text>
                                  <Text style={[styles.bracketScore, isLive && styles.liveScoreText]}>{p1Score}</Text>
                                </View>

                                {/* Middle info row — date · time · court.
                                    Pulls from any of the time fields the
                                    server might use (matchStartTime, startTime,
                                    matchDate). Court rendered as-is from
                                    courtNumber (free-string in the catalog). */}
                                {(() => {
                                  const _iso = match.matchStartTime || match.startTime || match.matchDate;
                                  const _date = fmtBracketDate(_iso);
                                  const _time = fmtBracketTime(_iso);
                                  const _court = match.courtNumber;
                                  const hasAny = _date || _time || _court;
                                  return (
                                    <View style={styles.bracketInfoRow}>
                                      {hasAny ? (
                                        <>
                                          {!!_date && <Text style={styles.bracketInfoText}>{_date}</Text>}
                                          {!!_time && <Text style={styles.bracketInfoText}>{_time}</Text>}
                                          {!!_court && (
                                            <Text style={[styles.bracketInfoText, styles.bracketInfoCourt]}>
                                              {_court}
                                            </Text>
                                          )}
                                        </>
                                      ) : (
                                        <Text style={[styles.bracketInfoText, { color: '#9E9E9E' }]}>TBD</Text>
                                      )}
                                    </View>
                                  );
                                })()}

                                <View style={[styles.bracketRow, p2Won && styles.bracketRowWon]}>
                                  <Text
                                    style={[
                                      styles.bracketName,
                                      p2Won && styles.bracketWinner,
                                      p2IsSelected && { color: '#004E93', fontWeight: 'bold' }
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {p2Name}
                                  </Text>
                                  <Text style={[styles.bracketScore, isLive && styles.liveScoreText]}>{p2Score}</Text>
                                </View>

                                {match.status && !isCompleted && (
                                  <View style={[styles.bracketStatusIndicator,
                                  { backgroundColor: isLive ? '#2196F3' : '#FF9800' }
                                  ]} />
                                )}
                              </TouchableOpacity>

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

        {/* Results Modal — podium view (top 4) */}
        <Modal
          visible={showResultsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowResultsModal(false)}
        >
          <View style={styles.resultsOverlay}>
            <View style={styles.resultsCard}>
              {/* Capture region — header + body get serialized to PNG when
                  the user taps Share. Action buttons (Share/Close) live
                  outside this view so they don't show up in the image. */}
              <View ref={resultsCaptureRef} collapsable={false} style={styles.resultsCaptureBox}>
              <LinearGradient
                colors={['#F4CE74', '#FF7426']}
                style={styles.resultsHeader}
              >
                <Ionicons name="trophy" size={28} color="#fff" />
                <Text style={styles.resultsTitle}>
                  {knockoutCategoryFilter === 'all'
                    ? 'Tournament Results'
                    : `${formatCategory(knockoutCategoryFilter)} — Results`}
                </Text>
              </LinearGradient>

              {hasResults && (
                <View style={styles.resultsBody}>
                  <View style={[styles.podiumRow, styles.podiumChampion]}>
                    <View style={[styles.podiumMedal, { backgroundColor: '#FFD700' }]}>
                      <Text style={styles.podiumRank}>1</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.podiumLabel}>Champion</Text>
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {podium.championName}
                      </Text>
                    </View>
                    <Ionicons name="trophy" size={22} color="#FFB300" />
                  </View>

                  {podium.runnerUpName && (
                    <View style={styles.podiumRow}>
                      <View style={[styles.podiumMedal, { backgroundColor: '#C0C0C0' }]}>
                        <Text style={styles.podiumRank}>2</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.podiumLabel}>Runner-up</Text>
                        <Text style={styles.podiumName} numberOfLines={1}>
                          {podium.runnerUpName}
                        </Text>
                      </View>
                    </View>
                  )}

                  {podium.semiLosers.length > 0 && (
                    <>
                      <Text style={styles.podiumSectionLabel}>Semi-finalists</Text>
                      {podium.semiLosers.map((name, i) => (
                        <View key={`semi-${i}`} style={styles.podiumRow}>
                          <View style={[styles.podiumMedal, { backgroundColor: '#CD7F32' }]}>
                            <Text style={styles.podiumRank}>{3}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.podiumName} numberOfLines={1}>
                              {name}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {/* Quarter Finals — same row template as Champion / Runner-up
                      / Semi rows so the popup reads consistently. Badge color
                      shifts to indigo to differentiate from gold/silver/bronze
                      and the badge text shows QF1..QF4 instead of a rank. */}
                  {podium.quarters && podium.quarters.length > 0 && (
                    <>
                      <Text style={styles.podiumSectionLabel}>Quarter Finals</Text>
                      {podium.quarters.map((q, i) => (
                        <View key={`qf-${i}`} style={styles.podiumRow}>
                          <View style={[styles.podiumMedal, { backgroundColor: '#5E6AD2' }]}>
                            <Text style={[styles.podiumRank, styles.podiumRankSmall]}>
                              QF{q.matchNumber || i + 1}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.podiumLabel}>Quarter Final Winner</Text>
                            <Text style={styles.podiumName} numberOfLines={1}>
                              {q.winner}
                            </Text>
                            {q.loser && (
                              <Text style={styles.podiumSubtitle} numberOfLines={1}>
                                defeated {q.loser}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}
              </View>
              {/* End capture region. Footer below stays out of the shared PNG. */}

              <View style={styles.resultsActionRow}>
                <TouchableOpacity
                  style={[styles.resultsShareBtn, sharingResults && { opacity: 0.6 }]}
                  onPress={shareResults}
                  activeOpacity={0.85}
                  disabled={sharingResults}
                >
                  {sharingResults ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Feather name="share-2" size={16} color="#FFF" />
                  )}
                  <Text style={styles.resultsShareText}>
                    {sharingResults ? 'Preparing…' : 'Share'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resultsCloseBtn}
                  onPress={() => setShowResultsModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resultsCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'GROUPS': return renderGroups();
      case 'MATCHES': return renderMatches();
      case 'LEADERBOARD': return renderLeaderboardMode();
      case 'KNOCKOUT': return renderBracket();
      case 'ROUND_ROBIN': return renderRoundRobin();
      default: return renderLeaderboardMode();
    }
  };

  // Detect the high-volume Round Robin path. When this flag is on we render
  // a virtualized FlatList instead of the regular ScrollView so 5000+ team
  // matches don't lock up the JS thread on entry. Empty RR state still goes
  // through the regular ScrollView (no virtualization needed for 0 items).
  const useRRListBranch =
    viewMode === 'ROUND_ROBIN' &&
    isTeamKnockout &&
    !loading &&
    Array.isArray(roundRobinMatches) &&
    roundRobinMatches.length > 0;

  // Header block reused by both branches — keeps the summary card + tab bar
  // identical between the ScrollView and FlatList layouts.
  const renderTopChrome = () => (
    <>
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

      {isGroupStage && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, viewMode === 'LEADERBOARD' && styles.activeTabItem]}
            onPress={() => setViewMode('LEADERBOARD')}
          >
            <Text style={[styles.tabText, viewMode === 'LEADERBOARD' && styles.activeTabText]}>Full Standings</Text>
          </TouchableOpacity>
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
        </View>
      )}

      {(isSinglesKnockout || isTeamKnockout) && (
        <View style={styles.tabBar}>
          {isTeamKnockout && (
            <TouchableOpacity
              style={[styles.tabItem, viewMode === 'ROUND_ROBIN' && styles.activeTabItem]}
              onPress={() => setViewMode('ROUND_ROBIN')}
            >
              <Text style={[styles.tabText, viewMode === 'ROUND_ROBIN' && styles.activeTabText]}>Round Robin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.tabItem, viewMode === 'KNOCKOUT' && styles.activeTabItem]}
            onPress={() => setViewMode('KNOCKOUT')}
          >
            <Text style={[styles.tabText, viewMode === 'KNOCKOUT' && styles.activeTabText]}>Bracket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, viewMode === 'LEADERBOARD' && styles.activeTabItem]}
            onPress={() => setViewMode('LEADERBOARD')}
          >
            <Text style={[styles.tabText, viewMode === 'LEADERBOARD' && styles.activeTabText]}>Full Standings</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {useRRListBranch ? (
        // RR_LIST_BRANCH — virtualized list path for high-volume team RR
        // matches. Replaces the ScrollView only — the rich match modal below
        // is shared with the regular path.
        <FlatList
          data={roundRobinMatches}
          keyExtractor={(item, idx) => (item._id?.toString?.() || `rr-${idx}`)}
          renderItem={renderRRMatchCard}
          ListHeaderComponent={
            <View>
              {renderTopChrome()}
              <View style={{ paddingTop: 8 }}>
                {renderRRListHeader()}
              </View>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15A765']} />
          }
          // Virtualization tuning — keeps initial render under control even
          // when the list has 5000+ items.
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews
        />
      ) : (
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15A765']} />
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
              style={[styles.tabItem, viewMode === 'LEADERBOARD' && styles.activeTabItem]}
              onPress={() => setViewMode('LEADERBOARD')}
            >
              <Text style={[styles.tabText, viewMode === 'LEADERBOARD' && styles.activeTabText]}>Full Standings</Text>
            </TouchableOpacity>

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
          </View>
        )}

        {/* Tab System for pure-knockout tournaments. Singles knockout: 2 tabs
            (Bracket / Full Standings). Team knockout (Davis Cup): 3 tabs with
            an extra Round Robin tab for the pre-bracket points table. */}
        {(isSinglesKnockout || isTeamKnockout) && (
          <View style={styles.tabBar}>
            {isTeamKnockout && (
              <TouchableOpacity
                style={[styles.tabItem, viewMode === 'ROUND_ROBIN' && styles.activeTabItem]}
                onPress={() => setViewMode('ROUND_ROBIN')}
              >
                <Text style={[styles.tabText, viewMode === 'ROUND_ROBIN' && styles.activeTabText]}>Round Robin</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.tabItem, viewMode === 'KNOCKOUT' && styles.activeTabItem]}
              onPress={() => setViewMode('KNOCKOUT')}
            >
              <Text style={[styles.tabText, viewMode === 'KNOCKOUT' && styles.activeTabText]}>Bracket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, viewMode === 'LEADERBOARD' && styles.activeTabItem]}
              onPress={() => setViewMode('LEADERBOARD')}
            >
              <Text style={[styles.tabText, viewMode === 'LEADERBOARD' && styles.activeTabText]}>Full Standings</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#15A765" style={{ marginTop: 50 }} />
        ) : (
          renderContent()
        )}
      </ScrollView>
      )}

      {/* Match Details Modal */}
      <Modal
        visible={!!selectedMatch}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMatch(null)}
      >
        <View style={styles.matchModalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedMatch(null)} />
          <View style={styles.matchModalSheet}>
            <View style={styles.matchModalHandle} />

            {selectedMatch && (() => {
              const m = selectedMatch;
              const p1Name = m.player1?.playerName || m.player1?.playerId?.name || m.player1?.name || 'TBD';
              const p2Name = m.player2?.playerName || m.player2?.playerId?.name || m.player2?.name || 'TBD';
              const p1Sets = m.score?.player1Sets ?? m.result?.finalScore?.player1Sets ?? 0;
              const p2Sets = m.score?.player2Sets ?? m.result?.finalScore?.player2Sets ?? 0;
              const winnerName = m.winnerName || m.result?.winner?.playerName || m.winner?.playerName;
              const sets = Array.isArray(m.sets) ? m.sets : [];
              const courtNumber = m.courtNumber;
              const roundLabel = m.round ? formatCategory(m.round) : `Round ${m.roundNumber || ''}`;
              const isCompleted = m.status === 'completed' || m.status === 'COMPLETED';
              const isLive = m.status === 'in-progress';

              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={styles.matchModalHeader}>
                    <View>
                      <Text style={styles.matchModalRound}>{roundLabel}</Text>
                      {courtNumber && <Text style={styles.matchModalCourt}>Court {courtNumber}</Text>}
                    </View>
                    <View style={[styles.matchModalStatusBadge, {
                      backgroundColor: isCompleted ? '#E8F5E9' : isLive ? '#FFEBEE' : '#DCFCE7',
                    }]}>
                      {isLive && <View style={styles.matchModalLiveDot} />}
                      <Text style={[styles.matchModalStatusText, {
                        color: isCompleted ? '#2E7D32' : isLive ? '#D32F2F' : '#FF8F00',
                      }]}>
                        {isCompleted ? 'COMPLETED' : isLive ? 'LIVE' : 'SCHEDULED'}
                      </Text>
                    </View>
                  </View>

                  {/* Players + final set score */}
                  <View style={styles.matchModalScoreboard}>
                    <View style={styles.matchModalPlayerCol}>
                      <Text style={[
                        styles.matchModalPlayerName,
                        winnerName === p1Name && styles.matchModalWinnerName,
                      ]} numberOfLines={2}>
                        {p1Name}
                      </Text>
                      {winnerName === p1Name && (
                        <View style={styles.matchModalWinnerChip}>
                          <Ionicons name="trophy" size={11} color="#FFB300" />
                          <Text style={styles.matchModalWinnerChipText}>Winner</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.matchModalScoreCol}>
                      <Text style={styles.matchModalScoreBig}>{p1Sets}</Text>
                      <Text style={styles.matchModalScoreSep}>:</Text>
                      <Text style={styles.matchModalScoreBig}>{p2Sets}</Text>
                    </View>
                    <View style={styles.matchModalPlayerCol}>
                      <Text style={[
                        styles.matchModalPlayerName,
                        winnerName === p2Name && styles.matchModalWinnerName,
                      ]} numberOfLines={2}>
                        {p2Name}
                      </Text>
                      {winnerName === p2Name && (
                        <View style={styles.matchModalWinnerChip}>
                          <Ionicons name="trophy" size={11} color="#FFB300" />
                          <Text style={styles.matchModalWinnerChipText}>Winner</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Score breakdown — shape-aware */}
                  {sets.length > 0 ? (
                    hasNestedGames(m.matchFormat) ? (
                      // ─── NESTED (Tennis): set tabs + per-set game grid ───
                      <View style={styles.matchModalSection}>
                        <Text style={styles.matchModalSectionTitle}>Set-by-Set Scores</Text>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.matchModalSetTabs}
                        >
                          {sets.map((set, idx) => {
                            const isActive = idx === activeSetIndex;
                            const setWon = !!set.winner?.playerName;
                            return (
                              <TouchableOpacity
                                key={idx}
                                activeOpacity={0.8}
                                onPress={() => setActiveSetIndex(idx)}
                                style={[
                                  styles.matchModalSetTab,
                                  isActive && styles.matchModalSetTabActive,
                                ]}
                              >
                                <Text style={[
                                  styles.matchModalSetTabText,
                                  isActive && styles.matchModalSetTabTextActive,
                                ]}>
                                  Set {set.setNumber || idx + 1}
                                </Text>
                                {setWon && (
                                  <View style={[
                                    styles.matchModalSetTabDot,
                                    isActive && { backgroundColor: '#fff' },
                                  ]} />
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        {(() => {
                          const set = sets[activeSetIndex];
                          if (!set) return null;
                          const games = Array.isArray(set.games) ? set.games : [];
                          const setWinner = set.winner?.playerName;
                          return (
                            <View style={styles.matchModalSetCard}>
                              {setWinner && (
                                <View style={styles.matchModalSetHeader}>
                                  <Text style={styles.matchModalSetWinner}>
                                    Won by <Text style={{ fontWeight: '800', color: '#15A765' }}>{setWinner}</Text>
                                  </Text>
                                </View>
                              )}
                              {games.length > 0 ? (
                                <View style={styles.matchModalGameGrid}>
                                  <View style={styles.matchModalGameRow}>
                                    <Text style={styles.matchModalGameLabelHeader}>Game</Text>
                                    <Text style={styles.matchModalGameScoreHeader} numberOfLines={1}>{p1Name}</Text>
                                    <Text style={styles.matchModalGameScoreHeader} numberOfLines={1}>{p2Name}</Text>
                                  </View>
                                  {games.map((g, gi) => {
                                    const s1 = g.finalScore?.player1 ?? 0;
                                    const s2 = g.finalScore?.player2 ?? 0;
                                    const gameWinner = g.winner?.playerName;
                                    return (
                                      <View key={gi} style={styles.matchModalGameRow}>
                                        <Text style={styles.matchModalGameLabel}>Game {g.gameNumber || gi + 1}</Text>
                                        <Text style={[
                                          styles.matchModalGameScore,
                                          gameWinner === p1Name && styles.matchModalGameScoreWin,
                                        ]}>{s1}</Text>
                                        <Text style={[
                                          styles.matchModalGameScore,
                                          gameWinner === p2Name && styles.matchModalGameScoreWin,
                                        ]}>{s2}</Text>
                                      </View>
                                    );
                                  })}
                                </View>
                              ) : (
                                <Text style={styles.matchModalNoGames}>No game-level data for this set</Text>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    ) : (
                      // ─── FLAT (Table Tennis / Badminton): no tabs, one Game row per set ───
                      <View style={styles.matchModalSection}>
                        <Text style={styles.matchModalSectionTitle}>Game-by-Game Scores</Text>
                        <View style={styles.matchModalGameGrid}>
                          <View style={styles.matchModalGameRow}>
                            <Text style={styles.matchModalGameLabelHeader}>Game</Text>
                            <Text style={styles.matchModalGameScoreHeader} numberOfLines={1}>{p1Name}</Text>
                            <Text style={styles.matchModalGameScoreHeader} numberOfLines={1}>{p2Name}</Text>
                          </View>
                          {sets.map((set, idx) => {
                            const g = (Array.isArray(set.games) && set.games[0]) || {};
                            const s1 = g.finalScore?.player1 ?? 0;
                            const s2 = g.finalScore?.player2 ?? 0;
                            const gameWinner = g.winner?.playerName || set.winner?.playerName;
                            return (
                              <View key={idx} style={styles.matchModalGameRow}>
                                <Text style={styles.matchModalGameLabel}>Game {set.setNumber || idx + 1}</Text>
                                <Text style={[
                                  styles.matchModalGameScore,
                                  gameWinner === p1Name && styles.matchModalGameScoreWin,
                                ]}>{s1}</Text>
                                <Text style={[
                                  styles.matchModalGameScore,
                                  gameWinner === p2Name && styles.matchModalGameScoreWin,
                                ]}>{s2}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )
                  ) : isCompleted ? (
                    <View style={styles.matchModalEmptyBox}>
                      <Ionicons name="information-circle-outline" size={28} color="#CFD8DC" />
                      <Text style={styles.matchModalEmptyText}>Detailed set scores not available</Text>
                    </View>
                  ) : (
                    <View style={styles.matchModalEmptyBox}>
                      <Ionicons name="time-outline" size={28} color="#CFD8DC" />
                      <Text style={styles.matchModalEmptyText}>Match has not started yet</Text>
                    </View>
                  )}

                  {isAuthorizedForMatch(m) && !isCompleted && (
                    <TouchableOpacity
                      style={styles.scoreMatchBtn}
                      onPress={() => {
                        setSelectedMatch(null);
                        openScoreboard(m);
                      }}
                    >
                      <Ionicons name="football" size={18} color="#fff" />
                      <Text style={styles.scoreMatchBtnText}>Score This Match</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.matchModalCloseBtn}
                    onPress={() => setSelectedMatch(null)}
                  >
                    <Text style={styles.matchModalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────
          Full-screen Scoreboard Modal (umpire-only)
          Port of Manager/MGroupStageScoreBoard.jsx — Manual + Auto modes.
          ───────────────────────────────────────────────────────────────── */}
      <Modal
        visible={scoreboardVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeScoreboard}
      >
        <View style={styles.sbRoot}>
          {/* Header */}
          <View style={styles.sbHeader}>
            <TouchableOpacity onPress={closeScoreboard} style={styles.sbHeaderClose}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.sbHeaderCenter}>
              <Text style={styles.sbHeaderTitle}>
                Set {sbCurrentSetNumber} • Game {sbCurrentGameNumber}
              </Text>
              {sbMatchFormat && (
                <Text style={styles.sbHeaderSubtitle}>
                  {sbMatchFormat?.scoringType === 'sets'
                    ? `Best of ${sbMatchFormat?.totalSets || 5}`
                    : (sbMatchFormat?.scoringType || 'Match')}
                  {sbMatchFormat?.pointsToWinGame ? ` • ${sbMatchFormat.pointsToWinGame} pts/game` : ''}
                  {sbMatchFormat?.deuceRule ? ` • Win by ${sbMatchFormat?.marginToWin || '—'}+` : ''}
                </Text>
              )}
            </View>
            <View style={styles.sbHeaderToggle}>
              <Text style={styles.sbHeaderToggleLabel}>{sbIsEnabled ? 'Auto' : 'Manual'}</Text>
              <Switch
                value={sbIsEnabled}
                onValueChange={setSbIsEnabled}
                trackColor={{ false: '#444', true: '#15A765' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {sbLoading ? (
            <View style={styles.sbLoadingBox}>
              <ActivityIndicator size="large" color="#15A765" />
              <Text style={styles.sbLoadingText}>Loading match...</Text>
            </View>
          ) : sbIsEnabled ? (
            // ─── AUTO MODE — tap-to-score zones ───
            <View style={styles.sbAutoBody}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={sbTapCooldown}
                onPress={() => sbIncrementPlayer(true)}
                style={[styles.sbAutoSide, { backgroundColor: '#F97316' }, sbTapCooldown && { opacity: 0.5 }]}
              >
                <View style={styles.sbAutoStatsBox}>
                  <View style={styles.sbAutoStatsRow}>
                    <View style={styles.sbAutoStatItem}>
                      <Text style={styles.sbAutoStatLabel}>Sets</Text>
                      <Text style={styles.sbAutoStatValue}>
                        {sbPlayerASetWins}/{sbMatchFormat?.setsToWin || '?'}
                      </Text>
                    </View>
                    <View style={styles.sbAutoStatItem}>
                      <Text style={styles.sbAutoStatLabel}>Games</Text>
                      <Text style={styles.sbAutoStatValue}>
                        {sbCurrentSetGames.playerA}/{sbMatchFormat?.gamesToWin || '?'}
                      </Text>
                    </View>
                  </View>
                  {(sbWinner === scoreboardMatch?.playerAName || sbPlayerASetWins > sbPlayerBSetWins) && (
                    <View style={styles.sbAutoWinnerRow}>
                      <Ionicons name="trophy" size={16} color="#FFD700" />
                      <Text style={styles.sbAutoWinnerText}>Winner</Text>
                    </View>
                  )}
                </View>

                <View style={styles.sbAutoScoreWrap}>
                  <Text style={styles.sbAutoGameLabel}>Game {sbCurrentGameNumber}</Text>
                  <Text style={styles.sbAutoScoreBig}>
                    {sbPlayerAPoints < 10 ? `0${sbPlayerAPoints}` : sbPlayerAPoints}
                  </Text>
                </View>

                <Text style={styles.sbAutoPlayerName} numberOfLines={1}>
                  {scoreboardMatch?.playerAName}
                </Text>

                <View style={styles.sbAutoBottomRow}>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); if (!sbTapCooldown) sbDecrementPlayer(true); }}
                    disabled={sbTapCooldown}
                    style={styles.sbAutoMinusBtn}
                  >
                    <Ionicons name="remove" size={22} color="#fff" />
                  </TouchableOpacity>
                  <View style={styles.sbAutoSetHistRow}>
                    {sbCompletedSets.map((s, i) => (
                      <View key={i} style={styles.sbAutoSetChip}>
                        <Text style={styles.sbAutoSetChipScore}>{s[0]}</Text>
                        <Text style={styles.sbAutoSetChipLabel}>S{i + 1}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Center pill — current score */}
              <View pointerEvents="none" style={styles.sbAutoCenter}>
                <View style={styles.sbAutoCenterPill}>
                  <Text style={styles.sbAutoCenterScore}>
                    <Text style={{ color: '#F97316' }}>{sbPlayerAPoints}</Text>
                    <Text style={{ color: '#999' }}>  -  </Text>
                    <Text style={{ color: '#EF4444' }}>{sbPlayerBPoints}</Text>
                  </Text>
                  <View style={styles.sbAutoCenterMeta}>
                    <Text style={styles.sbAutoCenterMetaText}>
                      Games {sbCurrentSetGames.playerA} - {sbCurrentSetGames.playerB}
                    </Text>
                    <Text style={styles.sbAutoCenterMetaText}>
                      Sets {sbPlayerASetWins} - {sbPlayerBSetWins}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={sbTapCooldown}
                onPress={() => sbIncrementPlayer(false)}
                style={[styles.sbAutoSide, { backgroundColor: '#EF4444' }, sbTapCooldown && { opacity: 0.5 }]}
              >
                <View style={styles.sbAutoStatsBox}>
                  <View style={styles.sbAutoStatsRow}>
                    <View style={styles.sbAutoStatItem}>
                      <Text style={styles.sbAutoStatLabel}>Games</Text>
                      <Text style={styles.sbAutoStatValue}>
                        {sbCurrentSetGames.playerB}/{sbMatchFormat?.gamesToWin || '?'}
                      </Text>
                    </View>
                    <View style={styles.sbAutoStatItem}>
                      <Text style={styles.sbAutoStatLabel}>Sets</Text>
                      <Text style={styles.sbAutoStatValue}>
                        {sbPlayerBSetWins}/{sbMatchFormat?.setsToWin || '?'}
                      </Text>
                    </View>
                  </View>
                  {(sbWinner === scoreboardMatch?.playerBName || sbPlayerBSetWins > sbPlayerASetWins) && (
                    <View style={styles.sbAutoWinnerRow}>
                      <Ionicons name="trophy" size={16} color="#FFD700" />
                      <Text style={styles.sbAutoWinnerText}>Winner</Text>
                    </View>
                  )}
                </View>

                <View style={styles.sbAutoScoreWrap}>
                  <Text style={styles.sbAutoGameLabel}>Game {sbCurrentGameNumber}</Text>
                  <Text style={styles.sbAutoScoreBig}>
                    {sbPlayerBPoints < 10 ? `0${sbPlayerBPoints}` : sbPlayerBPoints}
                  </Text>
                </View>

                <Text style={styles.sbAutoPlayerName} numberOfLines={1}>
                  {scoreboardMatch?.playerBName}
                </Text>

                <View style={styles.sbAutoBottomRow}>
                  <View style={styles.sbAutoSetHistRow}>
                    {sbCompletedSets.map((s, i) => (
                      <View key={i} style={styles.sbAutoSetChip}>
                        <Text style={styles.sbAutoSetChipScore}>{s[1]}</Text>
                        <Text style={styles.sbAutoSetChipLabel}>S{i + 1}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); if (!sbTapCooldown) sbDecrementPlayer(false); }}
                    disabled={sbTapCooldown}
                    style={styles.sbAutoMinusBtn}
                  >
                    <Ionicons name="remove" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {/* Auto-mode controls */}
              <View style={styles.sbAutoControls}>
                <TouchableOpacity
                  onPress={() => sbCompleteCurrentGame(sbPlayerAPoints, sbPlayerBPoints)}
                  disabled={sbButtonDisabled || !!sbWinner}
                  style={[styles.sbAutoCtrlBtn, { backgroundColor: '#EA580C' }, (sbButtonDisabled || sbWinner) && { opacity: 0.5 }]}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.sbAutoCtrlBtnText}>End Game</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={sbResetPoints}
                  disabled={sbButtonDisabled || !!sbWinner}
                  style={[styles.sbAutoCtrlBtn, { backgroundColor: '#525252' }, (sbButtonDisabled || sbWinner) && { opacity: 0.5 }]}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.sbAutoCtrlBtnText}>Reset</Text>
                </TouchableOpacity>
              </View>

              {!!sbMessage && (
                <View style={styles.sbStatusToast}>
                  <Text style={styles.sbStatusToastText}>{sbMessage}</Text>
                </View>
              )}
            </View>
          ) : (
            // ─── MANUAL MODE — bulk game-score entry ───
            <ScrollView style={styles.sbManualScroll} contentContainerStyle={styles.sbManualContent}>
              <View style={styles.sbManualCard}>
                <Text style={styles.sbManualTitle}>Manual Scoreboard</Text>

                {/* Game Scores card */}
                <View style={styles.sbManualBox}>
                  <View style={styles.sbManualBoxHead}>
                    <Text style={styles.sbManualBoxTitle}>Game Scores</Text>
                    <Text style={styles.sbManualBoxSub}>Set {sbCurrentSetNumber}</Text>
                  </View>

                  <View style={styles.sbManualHeaderRow}>
                    <Text style={styles.sbManualHeaderHash}>#</Text>
                    <Text style={styles.sbManualHeaderName} numberOfLines={1}>
                      {scoreboardMatch?.playerAName}
                    </Text>
                    <Text style={styles.sbManualHeaderName} numberOfLines={1}>
                      {scoreboardMatch?.playerBName}
                    </Text>
                  </View>

                  {sbManualGames.map((game, index) => (
                    <View key={index} style={styles.sbManualGameRow}>
                      <Text style={styles.sbManualGameLabel}>G{index + 1}</Text>
                      <TextInput
                        style={[styles.sbManualInput, { borderColor: '#F97316' }]}
                        placeholder="Points"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={game.a}
                        onChangeText={(t) => sbHandleManualGameChange(index, 'a', t)}
                        editable={!sbWinner && !sbButtonDisabled}
                      />
                      <TextInput
                        style={[styles.sbManualInput, { borderColor: '#EF4444' }]}
                        placeholder="Points"
                        placeholderTextColor="#666"
                        keyboardType="numeric"
                        value={game.b}
                        onChangeText={(t) => sbHandleManualGameChange(index, 'b', t)}
                        editable={!sbWinner && !sbButtonDisabled}
                      />
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={sbSubmitBulkManualScores}
                    disabled={sbButtonDisabled || !!sbWinner}
                    style={[styles.sbManualSubmit, (sbButtonDisabled || sbWinner) && { opacity: 0.5 }]}
                  >
                    {sbButtonDisabled ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.sbManualSubmitText}>SUBMIT ALL GAMES</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Match Status card */}
                <View style={styles.sbManualBox}>
                  <View style={styles.sbManualBoxHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="trophy" size={16} color="#34D399" />
                      <Text style={[styles.sbManualBoxTitle, { color: '#34D399' }]}>Match Status</Text>
                    </View>
                  </View>

                  <View style={styles.sbStatusVsRow}>
                    <View style={styles.sbStatusVsSide}>
                      <Text style={styles.sbStatusVsLabel}>Score</Text>
                      <Text style={[styles.sbStatusVsScore, { color: '#F97316' }]}>{sbPlayerASetWins}</Text>
                      <Text style={styles.sbStatusVsName} numberOfLines={1}>
                        {scoreboardMatch?.playerAName}
                      </Text>
                    </View>
                    <Text style={styles.sbStatusVsSep}>VS</Text>
                    <View style={styles.sbStatusVsSide}>
                      <Text style={styles.sbStatusVsLabel}>Score</Text>
                      <Text style={[styles.sbStatusVsScore, { color: '#EF4444' }]}>{sbPlayerBSetWins}</Text>
                      <Text style={styles.sbStatusVsName} numberOfLines={1}>
                        {scoreboardMatch?.playerBName}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sbStatusGrid}>
                    <View style={styles.sbStatusGridCell}>
                      <Text style={styles.sbStatusGridLabel}>Format</Text>
                      <Text style={styles.sbStatusGridValue}>
                        {sbMatchFormat?.scoringType === 'sets'
                          ? `Best of ${sbMatchFormat?.totalSets || 5}`
                          : (sbMatchFormat?.scoringType || 'Match')}
                      </Text>
                    </View>
                    <View style={styles.sbStatusGridCell}>
                      <Text style={styles.sbStatusGridLabel}>Set Score</Text>
                      <Text style={styles.sbStatusGridValue}>
                        {sbCurrentSetGames.playerA} - {sbCurrentSetGames.playerB}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Set History card */}
                <View style={styles.sbManualBox}>
                  <View style={styles.sbManualBoxHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="refresh" size={16} color="#4ADE80" />
                      <Text style={[styles.sbManualBoxTitle, { color: '#4ADE80' }]}>Set History</Text>
                    </View>
                  </View>
                  {sbCompletedSets.length > 0 ? (
                    <View style={styles.sbSetHistWrap}>
                      {sbCompletedSets.map((s, i) => (
                        <View key={i} style={styles.sbSetHistChip}>
                          <Text style={styles.sbSetHistLabel}>Set {i + 1}</Text>
                          <Text style={styles.sbSetHistScore}>
                            <Text style={{ color: '#F97316' }}>{s[0]}</Text>
                            <Text style={{ color: '#666' }}> - </Text>
                            <Text style={{ color: '#EF4444' }}>{s[1]}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.sbSetHistEmpty}>No completed sets yet</Text>
                  )}
                  {!sbWinner && (
                    <TouchableOpacity onPress={sbResetPoints} style={styles.sbResetPointsBtn}>
                      <Ionicons name="refresh" size={14} color="#9CA3AF" />
                      <Text style={styles.sbResetPointsText}>Reset Current Points</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {!!sbWinner && (
                  <View style={styles.sbWinnerBanner}>
                    <Ionicons name="trophy" size={22} color="#FFD700" />
                    <Text style={styles.sbWinnerBannerText}>WINNER: {sbWinner}</Text>
                    <Ionicons name="trophy" size={22} color="#FFD700" />
                  </View>
                )}

                {!!sbMessage && (
                  <View style={styles.sbManualMessage}>
                    <Text style={styles.sbManualMessageText}>{sbMessage}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollView: {
    flex: 1,
  },

  // ─── Summary stat strip ───
  tournamentSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF1FA',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },
  summaryLbl: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
    backgroundColor: '#EEF1FA',
  },

  // ─── Tab bar — underline style ───
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 0,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1FA',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  activeTabItem: {
    borderBottomColor: '#15A765',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#15A765',
    fontWeight: '900',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF1FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
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
    color: '#15A765',
    fontWeight: '600',
  },
  groupTopPlayersBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  groupTopPlayersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  groupTopPlayersTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15A765',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupTopPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  groupTopPlayerRank: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTopPlayerRankText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  groupTopPlayerName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#37474F',
  },
  groupTopPlayerPts: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15A765',
  },
  categoryFilterRow: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#15A765',
    borderColor: '#15A765',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#546E7A',
    letterSpacing: 0.3,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  backToGroups: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backToGroupsText: {
    color: '#15A765',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  matchGroupHeader: {
    marginBottom: 16,
  },
  matchGroupTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },
  matchSubTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 10,
  },
  standingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EEF1FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1FA',
    paddingBottom: 10,
  },
  standingsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F2937',
    marginLeft: 8,
  },
  standingsList: {
    width: '100%',
  },
  standingsLabelRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  standingLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  qualifierRow: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  posBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
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
    fontWeight: '900',
    color: '#1F2937',
  },
  standingPlayerName: {
    flex: 2,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  standingPld: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  standingPts: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#15A765',
    textAlign: 'center',
  },
  qualifierTag: {
    position: 'absolute',
    right: 4,
    top: 14,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF1FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tapScoreHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  tapScoreHintText: {
    color: '#15A765',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  matchMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  matchDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  matchStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  matchStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  matchRound: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15A765',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.3,
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
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  matchScore: {
    fontSize: 22,
    fontWeight: '900',
    color: '#15A765',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF1FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  premiumTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    padding: 12,
  },
  pHeaderCell: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  premiumTableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  topThreeRow: {
    backgroundColor: '#DCFCE7',
  },
  pCell: {
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataBox: {
    alignItems: 'center',
    padding: 40,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF1FA',
  },
  noDataText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
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
    paddingHorizontal: 6,
    marginHorizontal: -6,
    borderRadius: 4,
  },
  bracketRowWon: {
    backgroundColor: '#E8F5E9',
  },
  // Middle info row — date · time · court. Sits between the two player rows.
  // Top/bottom borders separate it cleanly from the player rows; subtle gray
  // background marks it as metadata vs the player names.
  bracketInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginHorizontal: -6,
    backgroundColor: '#F5F7FA',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ECEFF1',
  },
  bracketInfoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#37474F',
  },
  bracketInfoCourt: {
    color: '#1F2937',
    fontWeight: '900',
  },
  resultsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#15A765',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  resultsBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  // Action row at the top of the Bracket tab — holds Results (when applicable)
  // and the Download PDF button side by side.
  bracketActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#15A765',
  },
  downloadBtnText: {
    color: '#15A765',
    fontWeight: '800',
    fontSize: 13,
  },
  resultsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultsCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultsHeader: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  resultsBody: {
    padding: 14,
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  podiumChampion: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  podiumMedal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumRank: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  podiumLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  podiumName: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  podiumSectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  // QF rows reuse podiumRow / podiumMedal / podiumLabel / podiumName for
  // visual consistency with the Champion / Runner-up / Semi-finalist rows.
  // These two extras tweak the medal text (QF1..QF4 needs smaller font than
  // the single-digit rank) and add a "defeated X" subtitle below the name.
  podiumRankSmall: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  podiumSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  // Capture region — wraps the gradient header + body. Action buttons live
  // outside this so Share/Close don't end up in the captured PNG.
  resultsCaptureBox: {
    backgroundColor: '#FFF',
  },
  // Footer row holding Share + Close buttons side by side.
  resultsActionRow: {
    flexDirection: 'row',
  },
  resultsShareBtn: {
    flex: 1,
    backgroundColor: '#15A765',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resultsShareText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  resultsCloseBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsCloseText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
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

  // Match Details Modal
  matchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  matchModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  matchModalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ECEFF1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  matchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  matchModalRound: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  matchModalCourt: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
    marginTop: 3,
  },
  matchModalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  matchModalStatusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  matchModalLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D32F2F',
  },
  matchModalScoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  matchModalPlayerCol: {
    flex: 1,
    alignItems: 'center',
  },
  matchModalPlayerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  matchModalWinnerName: {
    color: '#0F2439',
    fontWeight: '900',
  },
  matchModalWinnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    gap: 3,
  },
  matchModalWinnerChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFA000',
  },
  matchModalScoreCol: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  matchModalScoreBig: {
    fontSize: 36,
    fontWeight: '900',
    color: '#15A765',
  },
  matchModalScoreSep: {
    fontSize: 28,
    fontWeight: '700',
    color: '#CFD8DC',
  },
  matchModalSection: {
    marginBottom: 14,
  },
  matchModalSectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  matchModalSetTabs: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 8,
    marginBottom: 12,
  },
  matchModalSetTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#EEF1FA',
    gap: 6,
    marginRight: 8,
  },
  matchModalSetTabActive: {
    backgroundColor: '#15A765',
    borderColor: '#15A765',
  },
  matchModalSetTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  matchModalSetTabTextActive: {
    color: '#fff',
  },
  matchModalSetTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#15A765',
  },
  matchModalSetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF1FA',
  },
  matchModalSetHeader: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  matchModalSetTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1F2937',
  },
  matchModalSetWinner: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  matchModalGameGrid: {
    gap: 4,
  },
  matchModalGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  matchModalGameLabelHeader: {
    flex: 1.2,
    fontSize: 11,
    fontWeight: '700',
    color: '#B0BEC5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchModalGameScoreHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#B0BEC5',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchModalGameLabel: {
    flex: 1.2,
    fontSize: 13,
    fontWeight: '600',
    color: '#546E7A',
  },
  matchModalGameScore: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#455A64',
    textAlign: 'center',
  },
  matchModalGameScoreWin: {
    color: '#15A765',
    fontWeight: '900',
  },
  matchModalNoGames: {
    fontSize: 12,
    color: '#B0BEC5',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  matchModalEmptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  matchModalEmptyText: {
    fontSize: 13,
    color: '#90A4AE',
    fontWeight: '500',
  },
  matchModalCloseBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  matchModalCloseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ─── "Score This Match" trigger button (inside match details modal) ───
  scoreMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15A765',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  scoreMatchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ─── Scoreboard Modal — shared ───
  sbRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  sbHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 44,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  sbHeaderClose: {
    padding: 6,
  },
  sbHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sbHeaderTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sbHeaderSubtitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  sbHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sbHeaderToggleLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sbLoadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  sbLoadingText: {
    color: '#fff',
    fontSize: 16,
  },

  // ─── Auto Mode (tap-to-score) ───
  sbAutoBody: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  sbAutoSide: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 92,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  sbAutoStatsBox: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sbAutoStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sbAutoStatItem: {
    alignItems: 'center',
  },
  sbAutoStatLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginBottom: 2,
  },
  sbAutoStatValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  sbAutoWinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  sbAutoWinnerText: {
    color: '#FFD700',
    fontWeight: '800',
  },
  sbAutoScoreWrap: {
    alignItems: 'center',
  },
  sbAutoGameLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sbAutoScoreBig: {
    color: '#fff',
    fontSize: 88,
    fontWeight: '900',
    lineHeight: 92,
  },
  sbAutoPlayerName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  sbAutoBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sbAutoMinusBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sbAutoSetHistRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'center',
  },
  sbAutoSetChip: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
  },
  sbAutoSetChipScore: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sbAutoSetChipLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
  },
  sbAutoCenter: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -52,
    zIndex: 10,
    elevation: 10,
  },
  sbAutoCenterPill: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 200,
    alignItems: 'center',
  },
  sbAutoCenterScore: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 6,
  },
  sbAutoCenterMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  sbAutoCenterMetaText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sbAutoControls: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  sbAutoCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sbAutoCtrlBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sbStatusToast: {
    position: 'absolute',
    bottom: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sbStatusToastText: {
    color: '#fff',
    fontSize: 12,
  },

  // ─── Manual Mode ───
  sbManualScroll: {
    flex: 1,
    backgroundColor: '#000',
  },
  sbManualContent: {
    paddingHorizontal: 14,
    paddingTop: 92,
    paddingBottom: 40,
  },
  sbManualCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 14,
  },
  sbManualTwoCol: {
    flexDirection: 'row',
    gap: 14,
  },
  sbManualCol: {
    flex: 1,
  },
  sbManualTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  sbManualBox: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 14,
  },
  sbManualBoxHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sbManualBoxTitle: {
    color: '#FB923C',
    fontSize: 15,
    fontWeight: '700',
  },
  sbManualBoxSub: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  sbManualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  sbManualHeaderHash: {
    width: 36,
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sbManualHeaderName: {
    flex: 1,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sbManualGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.5)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.5)',
    marginBottom: 8,
    gap: 8,
  },
  sbManualGameLabel: {
    width: 36,
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '800',
  },
  sbManualInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    color: '#fff',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  sbManualSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  sbManualSubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // Match status card
  sbStatusVsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.5)',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  sbStatusVsSide: {
    flex: 1,
    alignItems: 'center',
  },
  sbStatusVsLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  sbStatusVsScore: {
    fontSize: 28,
    fontWeight: '900',
  },
  sbStatusVsName: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 4,
  },
  sbStatusVsSep: {
    color: '#4B5563',
    fontWeight: '800',
    fontSize: 18,
    paddingHorizontal: 8,
  },
  sbStatusGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sbStatusGridCell: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  sbStatusGridLabel: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sbStatusGridValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Set history card
  sbSetHistWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sbSetHistChip: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    minWidth: 70,
  },
  sbSetHistLabel: {
    color: '#6B7280',
    fontSize: 10,
    marginBottom: 2,
  },
  sbSetHistScore: {
    fontSize: 16,
    fontWeight: '800',
  },
  sbSetHistEmpty: {
    color: '#6B7280',
    fontStyle: 'italic',
    fontSize: 13,
    paddingVertical: 4,
  },
  sbResetPointsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  sbResetPointsText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  sbWinnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.5)',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  sbWinnerBannerText: {
    color: '#FACC15',
    fontWeight: '900',
    fontSize: 18,
  },
  sbManualMessage: {
    marginTop: 10,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.5)',
    borderRadius: 8,
    padding: 10,
  },
  sbManualMessageText: {
    color: '#FB923C',
    textAlign: 'center',
    fontSize: 13,
  },
});

// ────────────────────────────────────────────────────────────────────────────
// Round Robin standings — card-based styles, intentionally distinct from the
// table-style premiumTable used by Full Standings. Kept in a separate
// StyleSheet.create so the section reads as a self-contained UI module.
// ────────────────────────────────────────────────────────────────────────────
const rrStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  bannerCount: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  bannerCountText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
  },
  bannerCountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    position: 'relative',
  },
  cardQualified: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  qualifyStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  rankCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  rankCircleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6B7280',
  },

  teamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statPillWin: { backgroundColor: '#DCFCE7' },
  statPillLoss: { backgroundColor: '#FEE2E2' },
  statPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
  },
  setsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  setsPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  setsPillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },

  pointsBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#15A765',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  pointsBadgeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    lineHeight: 24,
  },
  pointsBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },

  bannerCountSep: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
  },

  // Match fixture card (Team A vs Team B)
  matchCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  matchNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E3A8A',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  matchStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  matchStatusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 0.5,
  },

  vsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  teamSide: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 64,
    justifyContent: 'center',
  },
  teamSideWon: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  teamSideName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  teamSideNameWon: {
    color: '#15803D',
    fontWeight: '900',
  },
  teamSideNameLost: {
    color: '#9CA3AF',
  },
  teamSideScore: {
    fontSize: 24,
    fontWeight: '900',
    color: '#9CA3AF',
  },
  teamSideScoreWon: {
    color: '#15803D',
  },
  vsCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  vsLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1,
  },

  matchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  matchFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchFooterText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
});

export default TournamentLeaderboardDetail;