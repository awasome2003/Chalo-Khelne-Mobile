import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import axios from "axios";
import API from "../../api/tournaments";
import { useAuth } from "../../context/AuthContext";

/**
 * Detects whether match format uses nested games (Tennis) or flat sets (TT, Badminton).
 * Mirror of server/factories/MatchFactory.js → hasNestedGames.
 */
function hasNestedGames(fmt) {
  if (!fmt || typeof fmt !== "object") return false;
  if (fmt.gamesPerSet != null && Number(fmt.gamesPerSet) > 0) return true;
  const tg = Number(fmt.totalGames);
  const ts = Number(fmt.totalSets);
  if (Number.isFinite(tg) && Number.isFinite(ts) && tg > 1 && tg !== ts) return true;
  return false;
}

/**
 * RefereeMatchScorer — manual-mode match scoring screen for umpires (Phase 3).
 * Receives route params: { matchId, matchLabel }.
 * Fetches live match state, lets umpire enter set/game scores one at a time,
 * POSTs complete-game after confirmation, refetches to advance the UI.
 */
export default function RefereeMatchScorer() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { matchId, matchLabel } = route.params || {};

  // Attach Bearer token to scoring API calls (required after Phase 4b-2 backend guard).
  const authConfig = useMemo(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    [token]
  );

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Phase 4f/4g: unified score state shared by Final and Live Tap modes.
  const [mode, setMode] = useState("final"); // "final" | "live"
  const [liveP1, setLiveP1] = useState(0);
  const [liveP2, setLiveP2] = useState(0);
  const [history, setHistory] = useState([]); // [{ type: "inc" | "dec", p: 1 | 2 }, ...]

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      setError(null);
      const res = await axios.get(API.ENDPOINTS.LIVE_SCORING.LIVE_STATE(matchId), authConfig);
      const data = res.data?.match || res.data;
      setMatch(data);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Failed to load match.");
    } finally {
      setLoading(false);
    }
  }, [matchId, authConfig]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchMatch();
    }, [fetchMatch])
  );

  // Lock to landscape while this screen is focused; relock portrait on blur.
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      ).catch(() => {});
      return () => {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        ).catch(() => {});
      };
    }, [])
  );

  const submit = async () => {
    if (!Number.isFinite(liveP1) || !Number.isFinite(liveP2) || liveP1 < 0 || liveP2 < 0) {
      setError("Score values must be non-negative.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(
        API.ENDPOINTS.LIVE_SCORING.COMPLETE_GAME(matchId),
        { finalPlayer1Points: liveP1, finalPlayer2Points: liveP2 },
        authConfig
      );
      setLiveP1(0);
      setLiveP2(0);
      setHistory([]);
      await fetchMatch();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAndSubmit = () => {
    if (!Number.isFinite(liveP1) || !Number.isFinite(liveP2)) {
      setError("Score values must be non-negative.");
      return;
    }
    const nested = hasNestedGames(match?.matchFormat);
    const unit = nested ? "game" : "set";
    Alert.alert(
      "Submit score?",
      `This will close the current ${unit} with score ${liveP1}–${liveP2}. Action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", style: "default", onPress: submit },
      ]
    );
  };

  // ──────────────── Phase 4f: Live Tap mode ────────────────

  // Mirror of backend isGameWon. Used to auto-detect set completion as umpire taps.
  const isGameWonLocal = (p1, p2, fmt) => {
    const pointsToWin = fmt?.pointsToWinGame;
    if (!pointsToWin) return false;
    const maxCap = fmt?.maxPointsPerGame;
    const margin = fmt?.marginToWin || 1;
    const deuce = !!fmt?.deuceRule;
    const max = Math.max(p1, p2);
    const diff = Math.abs(p1 - p2);
    if (maxCap && max >= maxCap) return true;
    if (max >= pointsToWin) {
      if (deuce) return diff >= margin;
      return true;
    }
    return false;
  };

  const tapPoint = (player) => {
    if (player === 1) setLiveP1((v) => v + 1);
    else setLiveP2((v) => v + 1);
    setHistory((h) => [...h, { type: "inc", p: player }]);
  };

  const decrementPoint = (player) => {
    if (player === 1) setLiveP1((v) => Math.max(0, v - 1));
    else setLiveP2((v) => Math.max(0, v - 1));
    setHistory((h) => [...h, { type: "dec", p: player }]);
  };

  const undoLast = () => {
    setHistory((h) => {
      const last = h[h.length - 1];
      if (!last) return h;
      if (last.type === "dec") {
        // Reverse a decrement → restore the point.
        if (last.p === 1) setLiveP1((v) => v + 1);
        else setLiveP2((v) => v + 1);
      } else {
        // Default (type === "inc" or legacy undefined) → remove the point.
        if (last.p === 1) setLiveP1((v) => Math.max(0, v - 1));
        else setLiveP2((v) => Math.max(0, v - 1));
      }
      return h.slice(0, -1);
    });
  };

  // Auto-detect game-won after every point and prompt to close the set.
  useEffect(() => {
    if (mode !== "live") return;
    if (submitting) return;
    const won = isGameWonLocal(liveP1, liveP2, match?.matchFormat);
    if (!won) return;
    const p1n =
      match?.player1?.playerName ||
      match?.player1?.playerId?.name ||
      match?.player1?.userName ||
      "Player 1";
    const p2n =
      match?.player2?.playerName ||
      match?.player2?.playerId?.name ||
      match?.player2?.userName ||
      "Player 2";
    const winnerName = liveP1 > liveP2 ? p1n : p2n;
    Alert.alert(
      "Set won",
      `${winnerName} wins this set ${liveP1}–${liveP2}. Close set?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: submit },
      ]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveP1, liveP2]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF6A00" />
        <Text style={styles.dim}>Loading match…</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error || "Match not found"}</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeBtnText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p1Name =
    match.player1?.playerName ||
    match.player1?.playerId?.name ||
    match.player1?.userName ||
    "Player 1";
  const p2Name =
    match.player2?.playerName ||
    match.player2?.playerId?.name ||
    match.player2?.userName ||
    "Player 2";
  const p1Short = (p1Name || "").split(" ")[0] || "P1";
  const p2Short = (p2Name || "").split(" ")[0] || "P2";
  const sets = Array.isArray(match.sets) ? match.sets : [];
  const p1SetsWon = sets.filter(
    (s) => s.status === "COMPLETED" && s.winner?.playerName === p1Name
  ).length;
  const p2SetsWon = sets.filter(
    (s) => s.status === "COMPLETED" && s.winner?.playerName === p2Name
  ).length;
  const nested = hasNestedGames(match.matchFormat);
  const isCompleted = match.status === "COMPLETED" || match.status === "completed";
  const currentSet = match.currentSet || sets.length || 1;
  const currentGame = match.currentGame || 1;
  const pointsToWin = match.matchFormat?.pointsToWinGame;
  const marginToWin = match.matchFormat?.marginToWin;

  const winnerName =
    match.result?.winner?.playerName ||
    match.matchResult?.winner?.playerName ||
    (p1SetsWon > p2SetsWon
      ? p1Name
      : p2SetsWon > p1SetsWon
      ? p2Name
      : null);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#FF6A00", "#FF8A3D"]} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.headerTitle}>Match Scoring</Text>
            {!!matchLabel && <Text style={styles.headerSub}>{matchLabel}</Text>}
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Score Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.playerCol}>
                <Text
                  style={[
                    styles.playerName,
                    winnerName === p1Name && styles.winnerName,
                  ]}
                  numberOfLines={2}
                >
                  {p1Name}
                </Text>
              </View>
              <View style={styles.scoreCol}>
                <Text style={styles.scoreBig}>{p1SetsWon}</Text>
                <Text style={styles.scoreSep}>:</Text>
                <Text style={styles.scoreBig}>{p2SetsWon}</Text>
              </View>
              <View style={styles.playerCol}>
                <Text
                  style={[
                    styles.playerName,
                    winnerName === p2Name && styles.winnerName,
                  ]}
                  numberOfLines={2}
                >
                  {p2Name}
                </Text>
              </View>
            </View>

            {isCompleted && (
              <View style={styles.completeBanner}>
                <Ionicons name="trophy" size={16} color="#FFB300" />
                <Text style={styles.completeBannerText}>
                  {winnerName ? `${winnerName} wins!` : "Match complete"}
                </Text>
              </View>
            )}
          </View>

          {/* Sets so far */}
          {sets.filter((s) => s.status === "COMPLETED").length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sets so far</Text>
              {sets
                .filter((s) => s.status === "COMPLETED")
                .map((set, idx) => {
                  const games = Array.isArray(set.games) ? set.games : [];
                  const firstGame = games[0];
                  const s1 = firstGame?.finalScore?.player1 ?? 0;
                  const s2 = firstGame?.finalScore?.player2 ?? 0;
                  const setWinner = set.winner?.playerName;
                  return (
                    <View key={idx} style={styles.setRow}>
                      <Text style={styles.setLabel}>Set {set.setNumber || idx + 1}</Text>
                      <Text style={styles.setScore}>
                        {s1} – {s2}
                      </Text>
                      {setWinner && (
                        <Text style={styles.setWinner} numberOfLines={1}>
                          ✓ {setWinner}
                        </Text>
                      )}
                    </View>
                  );
                })}
            </View>
          )}

          {/* Input form — hidden when match completed */}
          {!isCompleted && (
            <View style={styles.card}>
              {/* Phase 4f: mode toggle */}
              <View style={styles.modeToggleRow}>
                {[
                  { key: "final", label: "Final" },
                  { key: "live", label: "Live Tap" },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setMode(m.key)}
                    style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
                    activeOpacity={0.8}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.modeChipText,
                        mode === m.key && styles.modeChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.cardTitle}>
                {mode === "live"
                  ? nested
                    ? `Set ${currentSet}, Game ${currentGame} — Live`
                    : `Set ${currentSet} — Live scoring`
                  : nested
                  ? `Set ${currentSet}, Game ${currentGame} — enter score`
                  : `Set ${currentSet} — enter final score`}
              </Text>
              {!!pointsToWin && (
                <Text style={styles.hint}>
                  {pointsToWin} points to win
                  {marginToWin ? `, win by ${marginToWin}` : ""}
                </Text>
              )}

              {/* Per-player stepper rows — side-by-side in landscape */}
              <View style={styles.stepperDuo}>
                <View style={styles.stepperRow}>
                  <Text style={styles.stepperName} numberOfLines={1}>
                    {p1Name}
                  </Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepperMinus}
                      onPress={() => decrementPoint(1)}
                      disabled={submitting || liveP1 <= 0}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.stepperMinusText}>−1</Text>
                    </TouchableOpacity>
                    <View style={styles.stepperScoreBox}>
                      {mode === "final" ? (
                        <TextInput
                          value={String(liveP1)}
                          onChangeText={(t) => {
                            const n = parseInt(t, 10);
                            setLiveP1(Number.isFinite(n) ? Math.max(0, n) : 0);
                          }}
                          placeholder="0"
                          keyboardType="number-pad"
                          style={styles.stepperInput}
                          editable={!submitting}
                          selectTextOnFocus
                        />
                      ) : (
                        <Text style={styles.stepperScoreText}>{liveP1}</Text>
                      )}
                    </View>
                    {mode === "live" && (
                      <TouchableOpacity
                        style={[styles.stepperPlus, styles.stepperPlusP1]}
                        onPress={() => tapPoint(1)}
                        disabled={submitting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.stepperPlusText}>+1</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.stepperRow}>
                  <Text style={styles.stepperName} numberOfLines={1}>
                    {p2Name}
                  </Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepperMinus}
                      onPress={() => decrementPoint(2)}
                      disabled={submitting || liveP2 <= 0}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.stepperMinusText}>−1</Text>
                    </TouchableOpacity>
                    <View style={styles.stepperScoreBox}>
                      {mode === "final" ? (
                        <TextInput
                          value={String(liveP2)}
                          onChangeText={(t) => {
                            const n = parseInt(t, 10);
                            setLiveP2(Number.isFinite(n) ? Math.max(0, n) : 0);
                          }}
                          placeholder="0"
                          keyboardType="number-pad"
                          style={styles.stepperInput}
                          editable={!submitting}
                          selectTextOnFocus
                        />
                      ) : (
                        <Text style={styles.stepperScoreText}>{liveP2}</Text>
                      )}
                    </View>
                    {mode === "live" && (
                      <TouchableOpacity
                        style={[styles.stepperPlus, styles.stepperPlusP2]}
                        onPress={() => tapPoint(2)}
                        disabled={submitting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.stepperPlusText}>+1</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {mode === "live" && history.length > 0 && (
                <TouchableOpacity
                  style={styles.undoBtn}
                  onPress={undoLast}
                  disabled={submitting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-undo" size={14} color="#475569" />
                  <Text style={styles.undoBtnText}>Undo last point</Text>
                </TouchableOpacity>
              )}

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
                  <Text style={styles.errorBoxText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={confirmAndSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-bold" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Score</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Close button when completed */}
          {isCompleted && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  center: { alignItems: "center", justifyContent: "center" },
  dim: { color: "#64748B", marginTop: 8 },
  errorText: {
    color: "#B91C1C",
    textAlign: "center",
    paddingHorizontal: 30,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  scroll: { padding: 12, paddingBottom: 24 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerCol: { flex: 1, alignItems: "center" },
  playerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  winnerName: { color: "#10B981" },
  scoreCol: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  scoreBig: { fontSize: 36, fontWeight: "900", color: "#1E293B" },
  scoreSep: { fontSize: 28, color: "#94A3B8", marginHorizontal: 6 },
  completeBanner: {
    marginTop: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  completeBannerText: { color: "#065F46", fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  hint: { fontSize: 12, color: "#64748B", marginBottom: 10 },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  setLabel: { color: "#64748B", fontSize: 13, fontWeight: "600", flex: 0.8 },
  setScore: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
  },
  setWinner: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "700",
    flex: 1.2,
    textAlign: "right",
  },
  // Phase 4f — mode toggle
  modeToggleRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  modeChipActive: { backgroundColor: "#FF6A00", borderColor: "#FF6A00" },
  modeChipText: { color: "#475569", fontWeight: "700", fontSize: 13 },
  modeChipTextActive: { color: "#fff" },
  // Phase 4g — per-player stepper rows (shared across Final + Live Tap)
  stepperDuo: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  stepperRow: { flex: 1, marginTop: 2 },
  stepperName: {
    color: "#1E293B",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "stretch",
    height: 88,
    gap: 10,
  },
  stepperMinus: {
    width: 72,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperMinusText: { color: "#B91C1C", fontWeight: "800", fontSize: 22 },
  stepperScoreBox: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  stepperScoreText: { fontSize: 48, fontWeight: "900", color: "#1E293B" },
  stepperInput: {
    width: "100%",
    textAlign: "center",
    fontSize: 40,
    fontWeight: "900",
    color: "#1E293B",
    paddingVertical: 0,
  },
  stepperPlus: {
    width: 110,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperPlusP1: { backgroundColor: "#3B82F6" },
  stepperPlusP2: { backgroundColor: "#10B981" },
  stepperPlusText: { color: "#fff", fontWeight: "900", fontSize: 22 },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
  },
  undoBtnText: { color: "#475569", fontWeight: "700", fontSize: 13 },
  errorBox: {
    marginTop: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorBoxText: { color: "#B91C1C", fontSize: 12, flex: 1 },
  submitBtn: {
    marginTop: 14,
    backgroundColor: "#FF6A00",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  closeBtn: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  closeBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
