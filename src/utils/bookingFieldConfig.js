/**
 * Sport-aware booking field configuration.
 * Returns dynamic form fields based on sport's scoringType.
 *
 * Usage:
 *   const fields = getBookingFieldsBySport("Cricket");
 *   // → [{ name: "teamSize", type: "number", label: "Team Size", ... }, ...]
 */

/**
 * Team vs Individual sport classification.
 * Team sports ALWAYS show team roster during booking.
 * Individual sports show single-player registration.
 *
 * isTeam: true = must register as a team (team name + roster required)
 * isTeam: false = register as individual player
 * minPlayers/maxPlayers: roster size constraints
 */
const SPORT_PLAY_MODE = {
  "Cricket":      { isTeam: true,  minPlayers: 6,  maxPlayers: 15, typical: 11, label: "Cricket Team" },
  "Football":     { isTeam: true,  minPlayers: 5,  maxPlayers: 18, typical: 11, label: "Football Team" },
  "Kabaddi":      { isTeam: true,  minPlayers: 7,  maxPlayers: 12, typical: 7,  label: "Kabaddi Team" },
  "Volleyball":   { isTeam: true,  minPlayers: 6,  maxPlayers: 12, typical: 6,  label: "Volleyball Team" },
  "Basketball":   { isTeam: true,  minPlayers: 5,  maxPlayers: 12, typical: 5,  label: "Basketball Team" },
  "Hockey":       { isTeam: true,  minPlayers: 6,  maxPlayers: 16, typical: 11, label: "Hockey Team" },
  "Table Tennis":  { isTeam: false, minPlayers: 1, maxPlayers: 1,  typical: 1,  label: "Player" },
  "Badminton":     { isTeam: false, minPlayers: 1, maxPlayers: 2,  typical: 1,  label: "Player" },
  "Tennis":        { isTeam: false, minPlayers: 1, maxPlayers: 2,  typical: 1,  label: "Player" },
  "Pickleball":    { isTeam: false, minPlayers: 1, maxPlayers: 2,  typical: 1,  label: "Player" },
  "Squash":        { isTeam: false, minPlayers: 1, maxPlayers: 1,  typical: 1,  label: "Player" },
  "Chess":         { isTeam: false, minPlayers: 1, maxPlayers: 1,  typical: 1,  label: "Player" },
  "Carrom":        { isTeam: false, minPlayers: 1, maxPlayers: 2,  typical: 1,  label: "Player" },
  "Snooker":       { isTeam: false, minPlayers: 1, maxPlayers: 1,  typical: 1,  label: "Player" },
};

/**
 * Get the play mode for a sport (team vs individual).
 * @param {string} sportName
 * @returns {{ isTeam: boolean, minPlayers: number, maxPlayers: number, typical: number, label: string }}
 */
export function getSportPlayMode(sportName) {
  if (!sportName) return { isTeam: false, minPlayers: 1, maxPlayers: 1, typical: 1, label: "Player" };
  const key = Object.keys(SPORT_PLAY_MODE).find(
    (k) => k.toLowerCase() === sportName.toLowerCase()
  );
  return SPORT_PLAY_MODE[key] || { isTeam: false, minPlayers: 1, maxPlayers: 1, typical: 1, label: "Player" };
}

const SCORING_TYPES = {
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

/**
 * Field definitions per scoring type.
 * Each field: { name, type, label, required, defaultValue, options?, hint? }
 */
const FIELD_CONFIGS = {
  // ─── Set-based sports (TT, Badminton, Tennis, Pickleball, Volleyball) ───
  sets: [
    {
      name: "matchFormat",
      type: "select",
      label: "Match Format",
      required: false,
      defaultValue: "bo3",
      options: [
        { value: "bo3", label: "Best of 3" },
        { value: "bo5", label: "Best of 5" },
        { value: "bo7", label: "Best of 7" },
      ],
      hint: "Number of sets to play",
    },
    {
      name: "seeding",
      type: "number",
      label: "Player Seeding",
      required: false,
      defaultValue: null,
      hint: "Optional — ranking/seed number",
    },
  ],

  // ─── Innings-based (Cricket) ───
  innings: [
    {
      name: "teamSize",
      type: "number",
      label: "Team Size",
      required: true,
      defaultValue: 11,
      hint: "Number of players per team",
    },
    {
      name: "oversCount",
      type: "select",
      label: "Overs Per Innings",
      required: true,
      defaultValue: "20",
      options: [
        { value: "5", label: "5 Overs" },
        { value: "10", label: "10 Overs" },
        { value: "15", label: "15 Overs" },
        { value: "20", label: "20 Overs (T20)" },
        { value: "50", label: "50 Overs (ODI)" },
      ],
    },
    {
      name: "inningsType",
      type: "select",
      label: "Innings",
      required: false,
      defaultValue: "2",
      options: [
        { value: "1", label: "1 Innings" },
        { value: "2", label: "2 Innings" },
      ],
    },
    {
      name: "tossPreference",
      type: "select",
      label: "Toss Preference",
      required: false,
      defaultValue: null,
      options: [
        { value: "bat", label: "Bat First" },
        { value: "bowl", label: "Bowl First" },
        { value: "none", label: "No Preference" },
      ],
    },
  ],

  // ─── Time-based (Football, Basketball, Hockey, Kabaddi) ───
  time: [
    {
      name: "teamSize",
      type: "number",
      label: "Team Size",
      required: true,
      defaultValue: 11,
      hint: "Number of players per team",
    },
    {
      name: "matchDuration",
      type: "select",
      label: "Match Duration",
      required: false,
      defaultValue: null,
      options: [
        { value: "20", label: "20 min" },
        { value: "40", label: "40 min" },
        { value: "60", label: "60 min" },
        { value: "90", label: "90 min" },
      ],
      hint: "Total match duration in minutes",
    },
    {
      name: "substitutions",
      type: "number",
      label: "Substitutions Allowed",
      required: false,
      defaultValue: 3,
    },
  ],

  // ─── Single-result (Chess, Carrom, Snooker) ───
  single: [
    {
      name: "rounds",
      type: "select",
      label: "Rounds",
      required: false,
      defaultValue: "1",
      options: [
        { value: "1", label: "Single Game" },
        { value: "3", label: "Best of 3" },
        { value: "5", label: "Best of 5" },
      ],
    },
    {
      name: "tiebreakRule",
      type: "select",
      label: "Tiebreak Rule",
      required: false,
      defaultValue: "none",
      options: [
        { value: "none", label: "No Tiebreak" },
        { value: "armageddon", label: "Armageddon" },
        { value: "blitz", label: "Blitz Playoff" },
      ],
      hint: "How to handle draws",
    },
  ],
};

/**
 * Get sport-specific booking fields.
 * @param {string} sportName - e.g., "Cricket", "Football"
 * @returns {{ scoringType: string, fields: Array }} fields array for the sport
 */
export function getBookingFieldsBySport(sportName) {
  if (!sportName) return { scoringType: null, fields: [] };

  const key = Object.keys(SCORING_TYPES).find(
    (k) => k.toLowerCase() === sportName.toLowerCase()
  );
  const scoringType = SCORING_TYPES[key] || "sets";
  const fields = FIELD_CONFIGS[scoringType] || FIELD_CONFIGS.sets;

  return { scoringType, fields };
}

/**
 * Validate booking custom fields against sport type.
 * @param {string} sportName
 * @param {object} values - form values keyed by field name
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookingFields(sportName, values) {
  const { fields } = getBookingFieldsBySport(sportName);
  const errors = [];

  for (const field of fields) {
    if (field.required && (values[field.name] === undefined || values[field.name] === null || values[field.name] === "")) {
      errors.push(`${field.label} is required`);
    }
    if (field.type === "number" && values[field.name] !== undefined && values[field.name] !== null) {
      const num = Number(values[field.name]);
      if (isNaN(num) || num < 0) {
        errors.push(`${field.label} must be a valid positive number`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export default { getBookingFieldsBySport, validateBookingFields, getSportPlayMode };
