import { useEffect, useState } from "react";
import axios from "axios";
import tournamentConfig from "../api/tournaments";

// Loads tournament.sports[] for a tournamentId. Prefers a tournament
// object passed in (e.g. from route params) when it already carries
// sports[]; otherwise fetches BY_ID.
//
// Contract:
// - `activeSportId` is null until sports[] is loaded. Callers must
//   skip per-sport fetches while it is null so the initial request
//   does NOT carry a partial / wrong sportId. Once sports arrive, the
//   first entry is selected automatically.
// - `setActiveSportId` lets the caller switch sports.
export default function useTournamentSports(tournamentId, seedTournament) {
  const [sports, setSports] = useState(() => {
    if (Array.isArray(seedTournament?.sports) && seedTournament.sports.length > 0) {
      return seedTournament.sports;
    }
    return null;
  });
  const [activeSportId, setActiveSportId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const seedFromArray = (arr) => {
      if (cancelled) return;
      setSports(arr);
      const first = arr?.[0];
      const firstId = first ? String(first.sportId || first._id || first.id || "") : "";
      setActiveSportId(firstId || null);
      setLoading(false);
    };

    if (Array.isArray(seedTournament?.sports) && seedTournament.sports.length > 0) {
      seedFromArray(seedTournament.sports);
      return () => { cancelled = true; };
    }

    if (!tournamentId) {
      setLoading(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    axios
      .get(tournamentConfig.ENDPOINTS.BY_ID(tournamentId))
      .then((res) => {
        if (cancelled) return;
        const t = res?.data?.tournament || res?.data || {};
        const arr = Array.isArray(t.sports) ? t.sports : [];
        if (arr.length > 0) {
          seedFromArray(arr);
        } else {
          // Legacy single-sport tournament — no sports[]. Strip stays
          // hidden (sports.length <= 1) and activeSportId stays null
          // so callers don't append sportId= to legacy endpoints.
          setSports([]);
          setActiveSportId(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSports([]);
        setActiveSportId(null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tournamentId, seedTournament]);

  return {
    sports: sports || [],
    activeSportId,
    setActiveSportId,
    loading,
  };
}
