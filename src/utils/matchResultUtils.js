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
  "Carrom": "single",
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
  single:  { round: "Game", subRound: null, score: "Result", result: "Result" },
};

/**
 * Read normalized match result from any match object.
 */
export function readMatchResult(match, opts = {}) {
  if (!match) return null;

  // FAST PATH: use pre-computed matchResult if available
  if (match.matchResult && match.matchResult.type) {
    return {
      ...match.matchResult,
      labels: LABELS[match.matchResult.type] || LABELS.sets,
      isSetBased: match.matchResult.type === "sets",
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

  return {
    type: scoringType,
    completed,
    player1Score: p1Score,
    player2Score: p2Score,
    winner,
    labels: LABELS[scoringType] || LABELS.sets,
    isSetBased: scoringType === "sets",
  };
}

/**
 * Get display string for match score.
 */
export function getScoreDisplay(match, opts = {}) {
  const r = readMatchResult(match, opts);
  if (!r) return "-";
  return `${r.player1Score}-${r.player2Score}`;
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
