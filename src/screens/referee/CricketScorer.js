import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import API from "../../api/tournaments";
import { scoreErrorMessage } from "../../utils/scoreError";

/**
 * Mobile cricket (innings) scorer — touch-first.
 * Setup: overs + batting/bowling order (loaded from each team's squad, then
 * reordered). Live: striker / non-striker / bowler with strike rotation; the
 * lineup or live roles can be changed mid-match. Each delivery posts to the
 * incremental cricket endpoints, then onRefresh().
 *
 * Props: { matchId, match, authConfig, onRefresh, onBack, insets, p1Name, p2Name }
 */
export default function CricketScorer({ matchId, match, authConfig, onRefresh, onBack, insets, p1Name, p2Name }) {
  const [busy, setBusy] = useState(false);
  const [firstBatting, setFirstBatting] = useState("player1");
  const [oversInput, setOversInput] = useState("");
  const [batList, setBatList] = useState([]);
  const [bowlList, setBowlList] = useState([]);
  const [showLineup, setShowLineup] = useState(false);

  const live = match?.liveScore || {};
  const innings = live.innings || [];
  const currentInnings = live.currentInnings || 1;
  const fmt = match?.matchFormat || {};

  const inn1 = innings.find((i) => i.inningsNumber === 1) || null;
  const inn2 = innings.find((i) => i.inningsNumber === 2) || null;
  const currentInn = innings.find((i) => i.inningsNumber === currentInnings) || null;
  const battingSide =
    currentInn?.battingSide ||
    (currentInnings === 1 ? firstBatting : firstBatting === "player1" ? "player2" : "player1");
  const sideName = (s) => (s === "player1" ? p1Name : p2Name);

  const maxOvers = currentInn?.maxOvers || fmt.oversCount || 20;
  const battingOrder = currentInn?.battingOrder || [];
  const bowlingOrder = currentInn?.bowlingOrder || [];
  const striker = currentInn?.striker || null;
  const nonStriker = currentInn?.nonStriker || null;
  const bowler = currentInn?.currentBowler || null;
  const isSetup = !!(currentInn?.striker || battingOrder.length > 0 || (currentInn?.deliveries || []).length > 0);

  // Team rosters → ordered names (batting team bats; the other bowls).
  const squadNames = (sq) =>
    (sq || []).slice().sort((a, b) => (a.battingOrder || 999) - (b.battingOrder || 999)).map((p) => p.name).filter(Boolean);
  const p1Squad = match?.player1?.squad || [];
  const p2Squad = match?.player2?.squad || [];
  const batSquad = squadNames(battingSide === "player1" ? p1Squad : p2Squad);
  const bowlSquad = squadNames(battingSide === "player1" ? p2Squad : p1Squad);

  useEffect(() => {
    setBatList(batSquad.length ? batSquad : ["", ""]);
    setBowlList(bowlSquad.length ? bowlSquad : [""]);
    if (!oversInput) setOversInput(String(fmt.oversCount || 20));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battingSide, p1Squad.length, p2Squad.length]);

  const post = async (url, body) => {
    setBusy(true);
    try {
      const res = await axios.post(url, body, authConfig);
      await onRefresh();
      return res;
    } catch (e) {
      Alert.alert("Cannot record", scoreErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // ── delivery with strike rotation ──
  const ball = (payload) => {
    const legalBefore = (currentInn?.oversBowled || 0) * 6 + (currentInn?.ballsBowled || 0);
    const isLegal = payload.legalDelivery !== false;
    const legalAfter = legalBefore + (isLegal ? 1 : 0);
    const off = Number(payload.runs) || 0;
    let s = striker, ns = nonStriker, b = bowler;
    if (payload.isWicket) { const nw = (currentInn?.wickets || 0) + 1; s = battingOrder[nw + 1] || null; }
    if (isLegal && off % 2 === 1) { const t = s; s = ns; ns = t; }
    if (isLegal && legalAfter > 0 && legalAfter % 6 === 0) {
      const t = s; s = ns; ns = t;
      if (bowlingOrder.length > 1) { const idx = bowlingOrder.indexOf(b); b = bowlingOrder[(idx + 1) % bowlingOrder.length]; }
    }
    return post(API.ENDPOINTS.LIVE_SCORING.CRICKET_BALL(matchId), {
      innings: currentInnings, battingPlayer: battingSide,
      striker, bowler, nextStriker: s, nextNonStriker: ns, nextBowler: b, ...payload,
    });
  };
  const addRuns = (v) => ball({ runs: v, legalDelivery: true });
  const addWicket = () => ball({ runs: 0, isWicket: true, legalDelivery: true });
  const addExtra = (e) => ball({ runs: 0, extra: e, extraRuns: 1, legalDelivery: !(e === "wide" || e === "no-ball") });
  const undo = () => post(API.ENDPOINTS.LIVE_SCORING.CRICKET_UNDO(matchId), {});
  const switchInnings = () => post(API.ENDPOINTS.LIVE_SCORING.CRICKET_INNINGS_SWITCH(matchId), {});
  const updateLineup = (body) => post(API.ENDPOINTS.LIVE_SCORING.CRICKET_LINEUP(matchId), { innings: currentInnings, ...body });

  const finish = () => {
    Alert.alert("Finish match?", "End the match and compute the result?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Finish",
        onPress: async () => {
          setBusy(true);
          try {
            const res = await axios.post(API.ENDPOINTS.LIVE_SCORING.CRICKET_FINISH(matchId), {}, authConfig);
            if (res.data?.winnerSide === null) {
              Alert.alert("Match tied — Super Over winner", "", [
                { text: p1Name, onPress: () => superOver("player1") },
                { text: p2Name, onPress: () => superOver("player2") },
              ]);
            } else { await onRefresh(); }
          } catch (e) {
            Alert.alert("Cannot finish match", scoreErrorMessage(e));
          } finally { setBusy(false); }
        },
      },
    ]);
  };
  const superOver = (winner) =>
    post(API.ENDPOINTS.LIVE_SCORING.CRICKET_FINISH(matchId), { result: "super_over", winner });

  // ── setup submit ──
  const startInnings = () => {
    const bo = batList.map((s) => s.trim()).filter(Boolean);
    const wo = bowlList.map((s) => s.trim()).filter(Boolean);
    if (bo.length < 2) return Alert.alert("Add batsmen", "At least 2 batsmen are required.");
    if (wo.length < 1) return Alert.alert("Add bowlers", "At least 1 bowler is required.");
    const ov = Math.max(1, parseInt(oversInput, 10) || 0);
    post(API.ENDPOINTS.LIVE_SCORING.CRICKET_SETUP(matchId), {
      innings: currentInnings, battingPlayer: battingSide, maxOvers: ov,
      battingOrder: bo, bowlingOrder: wo, striker: bo[0], nonStriker: bo[1], currentBowler: wo[0],
    });
  };

  // ── role change via a quick picker ──
  const pickRole = (label, options, field) => {
    const opts = (options || []).filter(Boolean);
    if (!opts.length) return Alert.alert("No players", "Set up the lineup first.");
    Alert.alert(label, "", [
      ...opts.map((name) => ({ text: name, onPress: () => updateLineup({ [field]: name }) })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // ── per-player quick stats from per-ball striker/bowler ──
  const dels = currentInn?.deliveries || [];
  const batLine = (name) => {
    if (!name) return "";
    let r = 0, b = 0;
    for (const d of dels) { if (d.striker !== name) continue; r += Number(d.runs) || 0; if (d.legalDelivery !== false) b += 1; }
    return `${r} (${b})`;
  };
  const bowlLine = (name) => {
    if (!name) return "";
    let runs = 0, wk = 0, legal = 0;
    for (const d of dels) { if (d.bowler !== name) continue; runs += (Number(d.runs) || 0) + (Number(d.extraRuns) || 0); if (d.isWicket) wk += 1; if (d.legalDelivery !== false) legal += 1; }
    return `${Math.floor(legal / 6)}.${legal % 6}-${runs}-${wk}`;
  };

  const innBox = (inn, side) => (
    <View style={[styles.innBox, currentInn?.battingSide === side && currentInn?.status !== "COMPLETED" ? null : styles.dimBox]}>
      <Text style={styles.innName}>{sideName(side)?.split(" ")[0]}</Text>
      <Text style={styles.innScore}>{inn?.runs ?? 0}/{inn?.wickets ?? 0}</Text>
      <Text style={styles.innOvers}>({inn?.oversBowled ?? 0}.{inn?.ballsBowled ?? 0} ov)</Text>
    </View>
  );

  const ballValues = [0, 1, 2, 3, 4, 6];

  // ── SETUP SCREEN ──
  if (!isSetup) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#1D6A8B", "#2A88B0"]} style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Set up Innings {currentInnings}</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.body}>
          {currentInnings === 1 && (
            <View style={styles.row}>
              <Text style={styles.label}>Batting first:</Text>
              {["player1", "player2"].map((s) => (
                <TouchableOpacity key={s} onPress={() => setFirstBatting(s)} style={[styles.pill, firstBatting === s && styles.pillActive]}>
                  <Text style={[styles.pillText, firstBatting === s && styles.pillTextActive]}>{sideName(s)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Overs:</Text>
            <TextInput value={oversInput} onChangeText={setOversInput} keyboardType="number-pad" style={styles.oversInput} />
          </View>

          <NameRows title={`Batting order — ${sideName(battingSide)}`} list={batList} setList={setBatList}
            hint={batSquad.length ? "Loaded from the team — reorder then start." : "No squad — add players."} />
          <NameRows title={`Bowling order — ${sideName(battingSide === "player1" ? "player2" : "player1")}`} list={bowlList} setList={setBowlList}
            hint={bowlSquad.length ? "Loaded from the team — reorder as needed." : "No squad — add players."} />

          <TouchableOpacity disabled={busy} onPress={startInnings} style={[styles.action, styles.finish]}>
            <Text style={styles.actionText}>Start Innings {currentInnings}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1D6A8B", "#2A88B0"]} style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={22} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>🏏 Innings {currentInnings} — {sideName(battingSide)} batting</Text>
        <Text style={styles.headerSub}>{maxOvers} ov</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.scoreRow}>
          {innBox(inn1, "player1")}
          {innBox(inn2, "player2")}
        </View>
        {currentInnings === 2 && live.target != null && (
          <Text style={styles.chase}>Target {live.target} · Need {live.required} off {live.ballsRemaining} · RRR {live.requiredRate ?? "—"}</Text>
        )}
        <Text style={styles.crr}>CRR {live.currentRunRate ?? "0.00"}</Text>

        {/* Live roles */}
        <View style={styles.roles}>
          <TouchableOpacity style={styles.roleCell} onPress={() => pickRole("Striker", battingOrder, "striker")}>
            <Text style={styles.roleLabel}>★ Striker</Text>
            <Text style={styles.roleName} numberOfLines={1}>{striker || "—"}</Text>
            <Text style={styles.roleStat}>{batLine(striker)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roleCell} onPress={() => pickRole("Non-striker", battingOrder, "nonStriker")}>
            <Text style={styles.roleLabel}>Non-striker</Text>
            <Text style={styles.roleName} numberOfLines={1}>{nonStriker || "—"}</Text>
            <Text style={styles.roleStat}>{batLine(nonStriker)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roleCell} onPress={() => pickRole("Bowler", bowlingOrder, "currentBowler")}>
            <Text style={styles.roleLabel}>Bowler</Text>
            <Text style={styles.roleName} numberOfLines={1}>{bowler || "—"}</Text>
            <Text style={styles.roleStat}>{bowlLine(bowler)}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => updateLineup({ striker: nonStriker, nonStriker: striker })} style={styles.swapBtn}>
          <Ionicons name="swap-horizontal" size={14} color="#93C5FD" />
          <Text style={styles.swapText}>Swap strike</Text>
        </TouchableOpacity>

        <View style={styles.runs}>
          {ballValues.map((v) => (
            <TouchableOpacity key={v} disabled={busy} onPress={() => addRuns(v)} style={styles.runBtn}>
              <Text style={styles.runBtnText}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.extras}>
          <TouchableOpacity disabled={busy} onPress={addWicket} style={[styles.exBtn, styles.wicket]}>
            <Text style={styles.wicketText}>Wicket</Text>
          </TouchableOpacity>
          {["wide", "no-ball", "bye", "leg-bye"].map((e) => (
            <TouchableOpacity key={e} disabled={busy} onPress={() => addExtra(e)} style={styles.exBtn}>
              <Text style={styles.exText}>{e}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity disabled={busy} onPress={undo} style={[styles.exBtn, styles.undo]}>
            <Text style={styles.exText}>Undo</Text>
          </TouchableOpacity>
        </View>

        {/* Lineup editor */}
        <TouchableOpacity onPress={() => setShowLineup((v) => !v)} style={styles.lineupToggle}>
          <Ionicons name="people" size={16} color="#9CA3AF" />
          <Text style={styles.lineupToggleText}>{showLineup ? "Hide lineups" : "Edit lineups / order"}</Text>
        </TouchableOpacity>
        {showLineup && (
          <View style={styles.lineupBox}>
            <LineupRows title="Batting order" list={battingOrder} onSave={(arr) => updateLineup({ battingOrder: arr })} />
            <LineupRows title="Bowling order" list={bowlingOrder} onSave={(arr) => updateLineup({ bowlingOrder: arr })} />
          </View>
        )}

        <View style={styles.actions}>
          {currentInnings === 1 && (
            <TouchableOpacity disabled={busy} onPress={switchInnings} style={[styles.action, styles.switch]}>
              <Text style={styles.actionText}>End Innings 1 → Switch</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity disabled={busy} onPress={finish} style={[styles.action, styles.finish]}>
            <Text style={styles.actionText}>Finish Match</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* ── reorderable name rows (setup) ── */
function NameRows({ title, list, setList, hint }) {
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const n = [...list];
    [n[i], n[j]] = [n[j], n[i]];
    setList(n);
  };
  const setAt = (i, v) => setList(list.map((x, idx) => (idx === i ? v : x)));
  const removeAt = (i) => setList(list.filter((_, idx) => idx !== i));
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {list.map((n, i) => (
        <View key={i} style={styles.nameRow}>
          <Text style={styles.nameIdx}>{i + 1}.</Text>
          <TextInput value={n} onChangeText={(v) => setAt(i, v)} placeholder={`Player ${i + 1}`} placeholderTextColor="#5B6678" style={styles.nameInput} />
          <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0} style={[styles.miniBtn, i === 0 && styles.miniDisabled]}><Ionicons name="chevron-up" size={16} color="#cbd5e1" /></TouchableOpacity>
          <TouchableOpacity onPress={() => move(i, 1)} disabled={i === list.length - 1} style={[styles.miniBtn, i === list.length - 1 && styles.miniDisabled]}><Ionicons name="chevron-down" size={16} color="#cbd5e1" /></TouchableOpacity>
          <TouchableOpacity onPress={() => removeAt(i)} style={styles.miniBtn}><Ionicons name="close" size={16} color="#9CA3AF" /></TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => setList([...list, ""])} style={styles.addRow}>
        <Ionicons name="add" size={16} color="#34D399" />
        <Text style={styles.addText}>Add player</Text>
      </TouchableOpacity>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/* ── lineup reorder during the match (local edit + save) ── */
function LineupRows({ title, list, onSave }) {
  const [items, setItems] = useState(list);
  useEffect(() => { setItems(list); }, [list]);
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    setItems(n);
  };
  const setAt = (i, v) => setItems(items.map((x, idx) => (idx === i ? v : x)));
  const removeAt = (i) => setItems(items.filter((_, idx) => idx !== i));
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {items.map((n, i) => (
        <View key={i} style={styles.nameRow}>
          <Text style={styles.nameIdx}>{i + 1}.</Text>
          <TextInput value={n} onChangeText={(v) => setAt(i, v)} style={styles.nameInput} placeholderTextColor="#5B6678" />
          <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0} style={[styles.miniBtn, i === 0 && styles.miniDisabled]}><Ionicons name="chevron-up" size={16} color="#cbd5e1" /></TouchableOpacity>
          <TouchableOpacity onPress={() => move(i, 1)} disabled={i === items.length - 1} style={[styles.miniBtn, i === items.length - 1 && styles.miniDisabled]}><Ionicons name="chevron-down" size={16} color="#cbd5e1" /></TouchableOpacity>
          <TouchableOpacity onPress={() => removeAt(i)} style={styles.miniBtn}><Ionicons name="close" size={16} color="#9CA3AF" /></TouchableOpacity>
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <TouchableOpacity onPress={() => setItems([...items, ""])} style={styles.addRow}>
          <Ionicons name="add" size={16} color="#34D399" /><Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSave(items.map((s) => s.trim()).filter(Boolean))} style={styles.saveBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B1220" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { color: "#fff", fontWeight: "800", fontSize: 14, flex: 1 },
  headerSub: { color: "#ffffffaa", fontSize: 12 },
  body: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  label: { color: "#9CA3AF", fontWeight: "700", fontSize: 12, marginRight: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#1A2744", marginRight: 8 },
  pillActive: { backgroundColor: "#FF6A00" },
  pillText: { color: "#9CA3AF", fontWeight: "700", fontSize: 13 },
  pillTextActive: { color: "#fff" },
  oversInput: { backgroundColor: "#1F2937", color: "#fff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, fontWeight: "800", minWidth: 70, textAlign: "center" },
  sectionLabel: { color: "#9CA3AF", fontWeight: "800", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  nameIdx: { color: "#6B7280", fontSize: 12, width: 22 },
  nameInput: { flex: 1, backgroundColor: "#1F2937", color: "#fff", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginRight: 6 },
  miniBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: "#1A2744", alignItems: "center", justifyContent: "center", marginLeft: 4 },
  miniDisabled: { opacity: 0.3 },
  addRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  addText: { color: "#34D399", fontWeight: "800", fontSize: 12, marginLeft: 4 },
  hint: { color: "#5B6678", fontStyle: "italic", fontSize: 11, marginTop: 4 },
  scoreRow: { flexDirection: "row", backgroundColor: "#111827", borderRadius: 14, padding: 16 },
  innBox: { flex: 1, alignItems: "center" },
  dimBox: { opacity: 0.5 },
  innName: { color: "#9CA3AF", fontWeight: "700", fontSize: 12 },
  innScore: { color: "#fff", fontWeight: "900", fontSize: 30, marginTop: 2 },
  innOvers: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  chase: { color: "#FDE047", fontWeight: "700", textAlign: "center", marginTop: 10 },
  crr: { color: "#9CA3AF", fontSize: 12, textAlign: "center", marginTop: 6, marginBottom: 12 },
  roles: { flexDirection: "row", backgroundColor: "#111827", borderRadius: 12, padding: 10, gap: 8 },
  roleCell: { flex: 1, alignItems: "center", paddingVertical: 4 },
  roleLabel: { color: "#6B7280", fontWeight: "800", fontSize: 10, textTransform: "uppercase" },
  roleName: { color: "#fff", fontWeight: "800", fontSize: 13, marginTop: 3 },
  roleStat: { color: "#34D399", fontWeight: "700", fontSize: 12, marginTop: 2 },
  swapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8, marginTop: 6 },
  swapText: { color: "#93C5FD", fontWeight: "700", fontSize: 12 },
  runs: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 },
  runBtn: { width: "15%", aspectRatio: 1, borderRadius: 12, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  runBtnText: { color: "#fff", fontWeight: "900", fontSize: 20 },
  extras: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  exBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: "#374151", marginRight: 8, marginBottom: 8 },
  exText: { color: "#fff", fontWeight: "700", fontSize: 13, textTransform: "capitalize" },
  wicket: { backgroundColor: "#7F1D1D" },
  wicketText: { color: "#FECACA", fontWeight: "800", fontSize: 13 },
  undo: { backgroundColor: "#4B5563" },
  lineupToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, marginTop: 4 },
  lineupToggleText: { color: "#9CA3AF", fontWeight: "700", fontSize: 13 },
  lineupBox: { backgroundColor: "#111827", borderRadius: 12, padding: 12, marginBottom: 6 },
  saveBtn: { backgroundColor: "#059669", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  actions: { marginTop: 12 },
  action: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 10 },
  switch: { backgroundColor: "#FF6A00" },
  finish: { backgroundColor: "#059669" },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
