import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import API from "../../api/tournaments";
import { scoreErrorMessage } from "../../utils/scoreError";

/**
 * Mobile carrom (board) scorer. Hydrates from match.liveScore and submits each
 * board to the carrom endpoint; the match auto-completes at boardsToWin.
 *
 * Props: { matchId, match, authConfig, onRefresh, onBack, insets, p1Name, p2Name }
 */
export default function CarromScorer({ matchId, match, authConfig, onRefresh, onBack, insets, p1Name, p2Name }) {
  const [busy, setBusy] = useState(false);
  const [winner, setWinner] = useState("player1");
  const [points, setPoints] = useState("");
  const [queen, setQueen] = useState(false);

  const live = match?.liveScore || {};
  const fmt = match?.matchFormat || {};
  const queenBonus = fmt.queenValue ?? 3;
  const boardsToWin = fmt.boardsToWin || 2;
  const boards = live.boards || [];
  const sideName = (s) => (s === "player1" ? p1Name : p2Name);

  const submitBoard = async () => {
    const pts = parseInt(points, 10);
    if (isNaN(pts) || pts < 0) { Alert.alert("Enter points", "Enter the winner's pocketed-coin points"); return; }
    setBusy(true);
    try {
      await axios.post(
        API.ENDPOINTS.LIVE_SCORING.CARROM_BOARD(matchId),
        { boardNumber: boards.length + 1, winner, points: pts, queenPocketed: queen, queenBonus },
        authConfig
      );
      setPoints(""); setQueen(false);
      await onRefresh();
    } catch (e) {
      Alert.alert("Cannot record board", scoreErrorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#92400E", "#B45309"]} style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎯 Carrom — first to {boardsToWin} boards</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.scoreRow}>
          {["player1", "player2"].map((s) => (
            <View key={s} style={styles.box}>
              <Text style={styles.boxName}>{sideName(s)?.split(" ")[0]}</Text>
              <Text style={styles.boxBoards}>{s === "player1" ? (live.player1Boards ?? 0) : (live.player2Boards ?? 0)}</Text>
              <Text style={styles.boxPts}>{s === "player1" ? (live.player1Points ?? 0) : (live.player2Points ?? 0)} pts</Text>
            </View>
          ))}
        </View>

        {boards.length > 0 && (
          <View style={styles.history}>
            {boards.map((b, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>
                  B{b.boardNumber || i + 1}: {sideName(b.winner)?.split(" ")[0]} +{b.winner === "player1" ? b.player1Points : b.player2Points}
                </Text>
                {b.queenPocketedBy ? <MaterialCommunityIcons name="crown" size={12} color="#FBBF24" /> : null}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.label}>Board {boards.length + 1} winner</Text>
        <View style={styles.winnerRow}>
          {["player1", "player2"].map((s) => (
            <TouchableOpacity key={s} onPress={() => setWinner(s)}
              style={[styles.winBtn, winner === s && styles.winBtnActive]}>
              <Text style={[styles.winText, winner === s && styles.winTextActive]}>{sideName(s)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.entryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallLabel}>Pocketed-coin points</Text>
            <TextInput
              style={styles.input} keyboardType="number-pad" value={points}
              onChangeText={setPoints} placeholder="e.g. 5" placeholderTextColor="#6B7280"
            />
          </View>
          <TouchableOpacity onPress={() => setQueen((q) => !q)} style={styles.queenBtn}>
            <MaterialCommunityIcons name={queen ? "crown" : "crown-outline"} size={20} color={queen ? "#FBBF24" : "#9CA3AF"} />
            <Text style={styles.queenText}>Queen +{queenBonus}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity disabled={busy} onPress={submitBoard} style={styles.submit}>
          <Text style={styles.submitText}>Submit Board</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 14, flex: 1 },
  body: { padding: 16 },
  scoreRow: { flexDirection: "row", backgroundColor: "#111827", borderRadius: 14, padding: 16 },
  box: { flex: 1, alignItems: "center" },
  boxName: { color: "#9CA3AF", fontWeight: "700", fontSize: 12 },
  boxBoards: { color: "#fff", fontWeight: "900", fontSize: 32, marginTop: 2 },
  boxPts: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  history: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", backgroundColor: "#1F2937", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  chipText: { color: "#A7F3D0", fontSize: 11, fontWeight: "700", marginRight: 3 },
  label: { color: "#9CA3AF", fontWeight: "700", fontSize: 12, marginTop: 16, marginBottom: 8 },
  winnerRow: { flexDirection: "row" },
  winBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#1A2744", alignItems: "center", marginRight: 8 },
  winBtnActive: { backgroundColor: "#FF6A00" },
  winText: { color: "#9CA3AF", fontWeight: "800" },
  winTextActive: { color: "#fff" },
  entryRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 14 },
  smallLabel: { color: "#9CA3AF", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  input: { backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, height: 44, color: "#fff", fontSize: 16 },
  queenBtn: { flexDirection: "row", alignItems: "center", marginLeft: 12, paddingVertical: 12 },
  queenText: { color: "#E5E7EB", fontWeight: "700", marginLeft: 6, fontSize: 13 },
  submit: { backgroundColor: "#FF6A00", paddingVertical: 15, borderRadius: 12, alignItems: "center", marginTop: 18 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
