import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { readMatchResult, getMatchSummaryLine } from "../utils/matchResultUtils";

/**
 * CricketScoreDetail — Cricbuzz-style read-only cricket scoreboard for the
 * match-details popup. Shows the innings summary, run-rate rail (live) and a
 * full OVER-BY-OVER, BALL-BY-BALL breakdown for each innings, plus extras and
 * fall of wickets.
 *
 * Per-batsman / per-bowler tables are omitted until the backend captures
 * per-ball striker/bowler data (the scorer's "Phase 2").
 *
 * Props: match (raw match object with player1/player2/liveScore/result)
 */
export default function CricketScoreDetail({ match }) {
  const r = readMatchResult(match);
  if (!r || r.type !== "innings") return null;

  const isLive = String(match?.status || "").toUpperCase() === "IN_PROGRESS";
  const live = match?.liveScore || null;
  const innings = r.details || [];

  const sideName = (s) =>
    (s === "player1"
      ? match?.player1?.userName || match?.player1?.playerName
      : match?.player2?.userName || match?.player2?.playerName) ||
    (s === "player1" ? "Team A" : "Team B");

  const oversOf = (inn) =>
    inn?.overs != null ? inn.overs : `${inn?.oversBowled ?? 0}.${inn?.ballsBowled ?? 0}`;

  const currentNo = live?.currentInnings || innings[innings.length - 1]?.inningsNumber;
  const summary = getMatchSummaryLine(match);

  return (
    <View style={styles.wrap}>
      {/* Status / result line */}
      {isLive ? (
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
          {currentNo ? <Text style={styles.liveInn}> · Innings {currentNo}</Text> : null}
        </View>
      ) : summary ? (
        <Text style={styles.resultLine}>{summary}</Text>
      ) : null}

      {/* Innings summary rows */}
      <View style={styles.card}>
        {innings.map((inn, i) => {
          const batting = isLive && inn.inningsNumber === currentNo;
          return (
            <View key={i} style={[styles.innRow, i > 0 && styles.innRowBorder]}>
              <View style={styles.innLeft}>
                <Text style={styles.innName} numberOfLines={1}>{sideName(inn.battingSide)}</Text>
                {batting ? (
                  <View style={styles.batBadge}><Text style={styles.batBadgeText}>BATTING</Text></View>
                ) : null}
              </View>
              <View style={styles.innRight}>
                <Text style={styles.innScore}>{inn.runs ?? 0}/{inn.wickets ?? 0}</Text>
                <Text style={styles.innOvers}>({oversOf(inn)} ov)</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Run-rate rail (live) */}
      {isLive && live ? (
        <View style={styles.rail}>
          <Rail label="CRR" value={live.currentRunRate ?? "0.00"} />
          <Rail label="RRR" value={live.requiredRate ?? "—"} accent="#EA580C" />
          <Rail label="Target" value={live.target ?? "—"} accent="#15A765" />
        </View>
      ) : null}

      {/* Over-by-over, ball-by-ball breakdown for every innings */}
      {innings.map((inn, i) =>
        (inn.deliveries && inn.deliveries.length) ? (
          <InningsBreakdown
            key={`bd-${i}`}
            inn={inn}
            title={sideName(inn.battingSide)}
            live={isLive && inn.inningsNumber === currentNo}
          />
        ) : null
      )}
    </View>
  );
}

/* Split a flat deliveries log into overs (6 legal balls per over). */
function splitOvers(dels) {
  const overs = [];
  let cur = [];
  let legal = 0;
  for (const d of dels || []) {
    cur.push(d);
    if (d.legalDelivery !== false) {
      legal++;
      if (legal % 6 === 0) { overs.push(cur); cur = []; }
    }
  }
  if (cur.length) overs.push(cur);
  return overs;
}

function ballRuns(d) {
  return (Number(d.runs) || 0) + (Number(d.extraRuns) || 0);
}

// Per-batsman / per-bowler scorecards from the per-ball striker/bowler.
function aggregateBatting(deliveries) {
  const map = new Map();
  const order = [];
  for (const d of deliveries || []) {
    const name = d.striker;
    if (!name) continue;
    if (!map.has(name)) { map.set(name, { name, r: 0, b: 0, f: 0, sx: 0, out: false }); order.push(name); }
    const s = map.get(name);
    const off = Number(d.runs) || 0;
    s.r += off;
    if (d.legalDelivery !== false) s.b += 1;
    if (off === 4) s.f += 1;
    if (off === 6) s.sx += 1;
    if (d.isWicket) s.out = true;
  }
  return order.map((n) => { const s = map.get(n); return { ...s, sr: s.b ? ((s.r / s.b) * 100).toFixed(1) : "0.0" }; });
}
function aggregateBowling(deliveries) {
  const map = new Map();
  const order = [];
  for (const d of deliveries || []) {
    const name = d.bowler;
    if (!name) continue;
    if (!map.has(name)) { map.set(name, { name, runs: 0, wk: 0, legal: 0 }); order.push(name); }
    const s = map.get(name);
    s.runs += (Number(d.runs) || 0) + (Number(d.extraRuns) || 0);
    if (d.isWicket) s.wk += 1;
    if (d.legalDelivery !== false) s.legal += 1;
  }
  return order.map((n) => {
    const s = map.get(n);
    return { name: n, ov: `${Math.floor(s.legal / 6)}.${s.legal % 6}`, runs: s.runs, wk: s.wk, econ: s.legal ? (s.runs / (s.legal / 6)).toFixed(1) : "0.0" };
  });
}

function InningsBreakdown({ inn, title, live }) {
  const overs = splitOvers(inn.deliveries);
  const ex = inn.extras || {};
  const extrasTotal = (ex.wides || 0) + (ex.noBalls || 0) + (ex.byes || 0) + (ex.legByes || 0);
  const fow = inn.fallOfWickets || [];
  const batting = aggregateBatting(inn.deliveries);
  const bowling = aggregateBowling(inn.deliveries);

  return (
    <View style={styles.bd}>
      <View style={styles.bdHead}>
        <Text style={styles.bdTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.bdScore}>
          {inn.runs ?? 0}/{inn.wickets ?? 0}
          <Text style={styles.bdOvers}>  ({inn.overs != null ? inn.overs : `${inn.oversBowled ?? 0}.${inn.ballsBowled ?? 0}`} ov)</Text>
        </Text>
      </View>

      {/* Batting scorecard */}
      {batting.length > 0 ? (
        <View style={styles.scTable}>
          <View style={styles.scHeadRow}>
            <Text style={[styles.scH, styles.scNameCol]}>BATTER</Text>
            <Text style={styles.scH}>R</Text><Text style={styles.scH}>B</Text>
            <Text style={styles.scH}>4s</Text><Text style={styles.scH}>6s</Text><Text style={[styles.scH, styles.scSrCol]}>SR</Text>
          </View>
          {batting.map((b, i) => (
            <View key={i} style={styles.scRow}>
              <Text style={[styles.scName, styles.scNameCol]} numberOfLines={1}>{b.name}{b.out ? "" : " *"}</Text>
              <Text style={styles.scV}>{b.r}</Text><Text style={styles.scV}>{b.b}</Text>
              <Text style={styles.scV}>{b.f}</Text><Text style={styles.scV}>{b.sx}</Text><Text style={[styles.scV, styles.scSrCol]}>{b.sr}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Bowling scorecard */}
      {bowling.length > 0 ? (
        <View style={styles.scTable}>
          <View style={styles.scHeadRow}>
            <Text style={[styles.scH, styles.scNameCol]}>BOWLER</Text>
            <Text style={styles.scH}>O</Text><Text style={styles.scH}>R</Text>
            <Text style={styles.scH}>W</Text><Text style={[styles.scH, styles.scSrCol]}>ECON</Text>
          </View>
          {bowling.map((b, i) => (
            <View key={i} style={styles.scRow}>
              <Text style={[styles.scName, styles.scNameCol]} numberOfLines={1}>{b.name}</Text>
              <Text style={styles.scV}>{b.ov}</Text><Text style={styles.scV}>{b.runs}</Text>
              <Text style={styles.scV}>{b.wk}</Text><Text style={[styles.scV, styles.scSrCol]}>{b.econ}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {overs.map((balls, oi) => {
        const runs = balls.reduce((a, d) => a + ballRuns(d), 0);
        const isCurrent = live && oi === overs.length - 1;
        return (
          <View key={oi} style={[styles.overRow, isCurrent && styles.overRowCurrent]}>
            <Text style={styles.overLabel}>Ov {oi + 1}</Text>
            <View style={styles.overPills}>
              {balls.map((d, bi) => <BallPill key={bi} d={d} />)}
            </View>
            <Text style={styles.overRuns}>{runs}</Text>
          </View>
        );
      })}

      <View style={styles.bdFooter}>
        <Text style={styles.bdMeta}>
          Extras {extrasTotal} (b {ex.byes || 0}, lb {ex.legByes || 0}, w {ex.wides || 0}, nb {ex.noBalls || 0})
        </Text>
        {fow.length ? (
          <Text style={styles.bdMeta} numberOfLines={2}>
            FoW: {fow.map((f) => `${f.wicket}-${f.runs} (${f.over})`).join(",  ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Rail({ label, value, accent = "#1F2937" }) {
  return (
    <View style={styles.railItem}>
      <Text style={styles.railLabel}>{label}</Text>
      <Text style={[styles.railValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function BallPill({ d }) {
  let t = "0";
  let bg = "#EEF0F3";
  let fg = "#374151";
  if (d.isWicket) { t = "W"; bg = "#DC2626"; fg = "#fff"; }
  else if (d.extra === "wide") { t = "WD"; bg = "#F59E0B"; fg = "#fff"; }
  else if (d.extra === "no-ball") { t = "NB"; bg = "#8B5CF6"; fg = "#fff"; }
  else if (d.extra === "bye") { t = `${ballRuns(d)}B`; bg = "#0EA5E9"; fg = "#fff"; }
  else if (d.extra === "leg-bye") { t = `${ballRuns(d)}LB`; bg = "#14B8A6"; fg = "#fff"; }
  else {
    const runs = ballRuns(d);
    t = String(runs);
    if (runs === 4) { bg = "#2563EB"; fg = "#fff"; }
    else if (runs === 6) { bg = "#15A765"; fg = "#fff"; }
  }
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{t}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  liveRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#DC2626", marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: "800", color: "#DC2626", letterSpacing: 0.5 },
  liveInn: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  resultLine: { fontSize: 14, fontWeight: "700", color: "#15A765", marginBottom: 8, textAlign: "center" },

  card: { backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", paddingHorizontal: 14 },
  innRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  innRowBorder: { borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  innLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0, gap: 8 },
  innName: { fontSize: 15, fontWeight: "700", color: "#1F2937", flexShrink: 1 },
  batBadge: { backgroundColor: "rgba(21,167,101,0.12)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  batBadgeText: { fontSize: 9, fontWeight: "800", color: "#15A765", letterSpacing: 0.4 },
  innRight: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  innScore: { fontSize: 20, fontWeight: "900", color: "#1F2937" },
  innOvers: { fontSize: 12, color: "#6B7280", fontWeight: "600" },

  // Batting / bowling scorecards
  scTable: { borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  scHeadRow: { flexDirection: "row", alignItems: "center", paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  scRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  scNameCol: { flex: 1, textAlign: "left" },
  scSrCol: { width: 46 },
  scH: { width: 34, textAlign: "right", fontSize: 10, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.3 },
  scV: { width: 34, textAlign: "right", fontSize: 13, fontWeight: "600", color: "#374151" },
  scName: { fontSize: 13, fontWeight: "700", color: "#1F2937" },

  rail: { flexDirection: "row", marginTop: 10, backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  railItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  railLabel: { fontSize: 10, fontWeight: "800", color: "#9CA3AF", letterSpacing: 0.5 },
  railValue: { fontSize: 18, fontWeight: "900", marginTop: 2 },

  // Over-by-over breakdown
  bd: { marginTop: 12, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, overflow: "hidden" },
  bdHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#0F2A1E", paddingHorizontal: 12, paddingVertical: 10 },
  bdTitle: { fontSize: 14, fontWeight: "800", color: "#fff", flexShrink: 1 },
  bdScore: { fontSize: 16, fontWeight: "900", color: "#22C55E" },
  bdOvers: { fontSize: 11, fontWeight: "600", color: "#9CA3AF" },
  overRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  overRowCurrent: { backgroundColor: "rgba(21,167,101,0.06)" },
  overLabel: { width: 42, fontSize: 12, fontWeight: "800", color: "#6B7280" },
  overPills: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 5 },
  overRuns: { width: 34, textAlign: "right", fontSize: 14, fontWeight: "900", color: "#1F2937" },
  pill: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  pillText: { fontSize: 12, fontWeight: "800" },
  bdFooter: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9", backgroundColor: "#F8FAFC", gap: 2 },
  bdMeta: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
});
