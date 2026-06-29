/**
 * Mobile match result abstraction.
 * Normalizes match data for sport-aware display.
 *
 * Usage:
 *   import { readMatchResult, getScoreDisplay, getResultLabels } from '../utils/matchResultUtils';
 *   const result = readMatchResult(match);
 *   // result.type → "sets" | "time" | "innings" | "single"
 *   // result.player1Score, result.player2Score
 *   // result.labels → { round, score, result }
 */

const SPORT_SCORING_TYPES = {
  "Table Tennis": "sets",
  "Badminton": "sets",
  "Tennis": "sets",
  "Pickleball": "sets",
  "Volleyball": "sets",
  "Squash": "sets",
  "Cricket": "innings",
  "Football": "time",
  "Basketball": "time",
  "Hockey": "time",
  "Kabaddi": "time",
  "Chess": "single",
  "Carrom": "board",
  "Snooker": "single",
  "Turf Games": "single",
  "Cricket Nets": "single",
};

export function getScoringType(sportName) {
  if (!sportName) return null;
  const key = Object.keys(SPORT_SCORING_TYPES).find(
    (k) => k.toLowerCase() === sportName.toLowerCase()
  );
  return SPORT_SCORING_TYPES[key] || null;
}

const LABELS = {
  sets:    { round: "Set", subRound: "Game", score: "Points", result: "Sets" },
  time:    { round: "Period", subRound: null, score: "Goals", result: "Score" },
  innings: { round: "Innings", subRound: "Over", score: "Runs", result: "Score" },
  board:   { round: "Board", subRound: null, score: "Points", result: "Boards" },
  single:  { round: "Game", subRound: null, score: "Result", result: "Result" },
};

/**
 * Read normalized match result from any match object.
 */
export function readMatchResult(match, opts = {}) {
  if (!match) return null;

  // FAST PATH: use pre-computed matchResult if available
  if (match.matchResult && match.matchResult.type) {
    const t = match.matchResult.type;
    return {
      ...match.matchResult,
      labels: LABELS[t] || LABELS.sets,
      isSetBased: t === "sets",
      // Per-sport detail: cricket innings / carrom boards (from the backend
      // matchResult.details), falling back to the raw result/live blocks.
      cricketResult: match.matchResult.cricketResult || match.result?.cricketResult || null,
      details: match.matchResult.details
        || (t === "innings" ? (match.result?.innings || match.liveScore?.innings) : null)
        || (t === "board" ? (match.result?.boards || match.liveScore?.boards) : null)
        || [],
    };
  }

  // LEGACY PATH: extract from old schema fields.
  // STEP 13: prefer denormalized `match.sportName` (populated by
  // MatchFactory._stamp on every match); legacy `sportsType`/`sport`
  // retained for matches created before STEP 9a stamping landed.
  const scoringType = match.matchFormat?.scoringType
    || getScoringType(match.sportName || match.sportsType || match.sport || opts.sportName)
    || "sets";

  const completed = (match.status || "").toUpperCase() === "COMPLETED";

  let p1Score = 0, p2Score = 0;

  if (match.result?.finalScore) {
    p1Score = match.result.finalScore.player1Sets || 0;
    p2Score = match.result.finalScore.player2Sets || 0;
  } else if (match.score) {
    p1Score = match.score.player1Sets || 0;
    p2Score = match.score.player2Sets || 0;
  } else if (match.setsWon) {
    p1Score = match.setsWon.home || 0;
    p2Score = match.setsWon.away || 0;
  }

  let winner = null;
  if (match.result?.winner) winner = match.result.winner;
  else if (match.winner) winner = match.winner;

  // Per-sport detail for rich display (cricket innings / carrom boards / sets).
  let details = [];
  if (scoringType === "innings") details = match.result?.innings || match.liveScore?.innings || [];
  else if (scoringType === "board") details = match.result?.boards || match.liveScore?.boards || [];
  else details = match.sets || [];

  return {
    type: scoringType,
    completed,
    player1Score: p1Score,
    player2Score: p2Score,
    winner,
    details,
    cricketResult: match.result?.cricketResult || null,
    labels: LABELS[scoringType] || LABELS.sets,
    isSetBased: scoringType === "sets",
  };
}

/**
 * Find a cricket innings for a given side ("player1"/"player2") from details.
 */
function _inningsFor(details, side) {
  return (details || []).find((i) => i.battingSide === side) || null;
}

/**
 * Format a single cricket innings as "154/6 (20.0)".
 */
function formatInnings(inn) {
  if (!inn) return "–";
  const overs = inn.overs != null ? ` (${inn.overs})`
    : (inn.oversBowled != null ? ` (${inn.oversBowled}.${inn.ballsBowled || 0})` : "");
  return `${inn.runs ?? 0}/${inn.wickets ?? 0}${overs}`;
}

/**
 * Sport-aware one-line score string for cards/lists. Examples:
 *   cricket  → "154/6 (20.0)  vs  150/8 (20.0)"
 *   sets     → "3 - 1"
 *   board    → "2 - 1 boards"
 *   single   → "1 - 0" / "½ - ½ (draw)" / winner name
 *   time     → "2 - 1"
 */
export function getScoreDisplay(match, opts = {}) {
  const r = readMatchResult(match, opts);
  if (!r) return "-";
  const completed = r.completed || (match?.status || "").toUpperCase() === "COMPLETED";

  if (r.type === "innings") {
    const i1 = _inningsFor(r.details, "player1");
    const i2 = _inningsFor(r.details, "player2");
    if (i1 || i2) return `${formatInnings(i1)}  vs  ${formatInnings(i2)}`;
    return completed ? `${r.player1Score} - ${r.player2Score}` : "Yet to bat";
  }

  if (r.type === "board") {
    return `${r.player1Score} - ${r.player2Score} boards`;
  }

  if (r.type === "single") {
    if (!completed) return "vs";
    const w = r.winner;
    const isDraw = !w || (!w.playerId && !w.playerName);
    if (isDraw) return "½ - ½ (draw)";
    return w.playerName ? `${w.playerName} won` : "Decided";
  }

  // sets / time
  return `${r.player1Score} - ${r.player2Score}`;
}

/**
 * Sport-specific one-line summary for a completed match card. Each sport reads
 * in its OWN format — never a generic "1-0":
 *   cricket → "omkar won by 10 runs"  /  "...by 4 wkts"
 *   sets    → "21-18, 19-21, 21-16"   (set-by-set)
 *   board   → "won 2-1 boards"
 *   single  → "White won" / "Match drawn"
 */
export function getMatchSummaryLine(match, opts = {}) {
  const r = readMatchResult(match, opts);
  if (!r) return "";
  const completed = r.completed || (match?.status || "").toUpperCase() === "COMPLETED";
  if (!completed) return "";
  const wname = r.winner?.playerName || "Winner";

  if (r.type === "innings") {
    const cr = r.cricketResult;
    if (cr?.isTie) return "Match tied";
    if (cr?.marginType === "wickets") return `${wname} won by ${cr.marginValue} wkts`;
    if (cr?.marginType === "runs") return `${wname} won by ${cr.marginValue} runs`;
    const i1 = (r.details || []).find((i) => i.battingSide === "player1");
    const i2 = (r.details || []).find((i) => i.battingSide === "player2");
    if (i1 && i2) return `${wname} won by ${Math.abs((i1.runs || 0) - (i2.runs || 0))} runs`;
    return `${wname} won`;
  }

  if (r.type === "sets") {
    const scores = (r.details || [])
      .map((s) => {
        const g = (s.subRounds && s.subRounds[0]) || (s.games && s.games[0]?.finalScore) || null;
        if (!g) return null;
        const a = g.player1Score ?? g.player1;
        const b = g.player2Score ?? g.player2;
        return (a == null && b == null) ? null : `${a ?? 0}-${b ?? 0}`;
      })
      .filter(Boolean)
      .join(", ");
    return scores || (r.winner?.playerName ? `${wname} won ${r.player1Score}-${r.player2Score}` : "");
  }

  if (r.type === "board") {
    return `${wname} won ${r.player1Score}-${r.player2Score} boards`;
  }

  if (r.type === "single") {
    const isDraw = !r.winner || (!r.winner.playerId && !r.winner.playerName);
    return isDraw ? "Match drawn" : `${wname} won`;
  }
  return "";
}

/**
 * Per-side score cell for two-column match layouts (player1 | VS | player2).
 *   cricket → "150/6"   sets/board → sets/boards won   chess → "1" / "½"
 */
export function getSideDisplay(match, side, opts = {}) {
  const r = readMatchResult(match, opts);
  if (!r) return "0";
  if (r.type === "innings") {
    const inn = (r.details || []).find((i) => i.battingSide === side);
    return inn ? `${inn.runs ?? 0}/${inn.wickets ?? 0}` : "–";
  }
  if (r.type === "single") {
    const isDraw = r.completed && (!r.winner || (!r.winner.playerId && !r.winner.playerName));
    if (isDraw) return "½";
  }
  return String(side === "player1" ? (r.player1Score ?? 0) : (r.player2Score ?? 0));
}

/**
 * Get sport-appropriate label for the "current period" indicator.
 * E.g., "Set 2, Game 3" for TT, "Period 1" for Football, "Innings 1" for Cricket
 */
export function getLiveLabel(match, opts = {}) {
  const r = readMatchResult(match, opts);
  if (!r) return "";

  const currentSet = match.currentSet || 1;
  const currentGame = match.currentGame || 1;

  switch (r.type) {
    case "sets":
      return `${r.labels.round} ${currentSet}, ${r.labels.subRound} ${currentGame}`;
    case "time":
      return `${r.labels.round} ${currentSet}`;
    case "innings":
      return `${r.labels.round} ${currentSet}`;
    case "board":
      return `${r.labels.round} ${(match.liveScore?.boards?.length || 0) + 1}`;
    case "single":
      return r.labels.round;
    default:
      return `Round ${currentSet}`;
  }
}

/**
 * Get labels for a sport.
 */
export function getResultLabels(sportNameOrType) {
  const st = LABELS[sportNameOrType]
    ? sportNameOrType
    : getScoringType(sportNameOrType) || "sets";
  return LABELS[st] || LABELS.sets;
}
