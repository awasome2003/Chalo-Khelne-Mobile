// client/src/utils/sportTrack.js
//
// Mobile-side mirror of server/utils/sportTrackUtils.js — read-only.
// Used by mobile screens to read per-sport fields off
// `tournament.sports[]` instead of the deprecated root scalars
// (sportsType, type, matchFormat, …).
//
// No legacy synthesize fallback: after STEP 16 every tournament has
// sports[] populated. Returns null/[]/{} when track is missing, and
// call sites apply their own display defaults.

export function getSportTrack(tournament, sportId) {
  if (!tournament) return null;
  const tracks = Array.isArray(tournament.sports) ? tournament.sports : [];
  if (tracks.length === 0) return null;
  if (!sportId) return tracks[0];
  const idStr = String(sportId);
  return tracks.find((t) => String(t?.sportId) === idStr) || tracks[0];
}

export function getSportName(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.sportName || null;
}

export function getTournamentType(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.type || null;
}

export function getMatchFormat(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.matchFormat || null;
}

export function getCategories(tournament, sportId) {
  const cats = getSportTrack(tournament, sportId)?.categories;
  return Array.isArray(cats) ? cats : [];
}

export function getQualifyPerGroup(tournament, sportId) {
  const v = getSportTrack(tournament, sportId)?.qualifyPerGroup;
  return v ?? 2;
}

export function getDrawSize(tournament, sportId) {
  const v = getSportTrack(tournament, sportId)?.drawSize;
  return v ?? null;
}

export function getGroupStageFormat(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.groupStageFormat || null;
}

export function getKnockoutFormat(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.knockoutFormat || null;
}

export function getDavisCupFormatId(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.davisCupFormatId || null;
}

export function getSportRules(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.sportRules || null;
}

export function getCurrentStage(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.currentStage || null;
}

export function getStageConfig(tournament, sportId) {
  return getSportTrack(tournament, sportId)?.stageConfig || {};
}
