/**
 * useTournamentLeaderboard — TanStack Query hook for the tournament leaderboard.
 *
 * Phase 6: extracts the data-fetching that lived inline in the 5,554-line
 * TournamentLeaderboardDetail.js (fetchGroups + fetchAllGroupTopPlayers +
 * fetchGroupCompletion + their useState/useEffect plumbing) into a cached,
 * deduped, reusable hook. The screen adopts it incrementally — replace those
 * three fetchers + their state with one call to this hook. Behavior preserved.
 *
 * Mobile has no shared axios client (the auth interceptor is global, in
 * AuthContext), so this uses axios directly like the rest of the app.
 */
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import API from "../../../api/api";

async function fetchGroups(tournamentId, activeSportId) {
  let endpoint = `${API.ENDPOINTS.BOOKING_GROUPS.BY_TOURNAMENT(tournamentId)}?mobile=true`;
  if (activeSportId) endpoint += `&sportId=${activeSportId}`;
  const { data } = await axios.get(endpoint);
  return data.groups || data.data || (Array.isArray(data) ? data : []);
}

async function fetchTopPlayersByGroup(tournamentId) {
  const { data } = await axios.get(API.ENDPOINTS.TOP_PLAYERS.BY_TOURNAMENT(tournamentId));
  const map = {};
  (data?.topPlayers || []).forEach((p) => {
    const gid = p.groupId?.toString?.() || p.groupId;
    if (!gid) return;
    (map[gid] = map[gid] || []).push(p);
  });
  Object.values(map).forEach((arr) => arr.sort((a, b) => (b.points || 0) - (a.points || 0)));
  return map;
}

async function fetchCompletionByGroup(tournamentId, groups) {
  const entries = await Promise.all(
    (groups || []).map(async (g) => {
      const gid = g?._id;
      if (!gid) return null;
      try {
        const { data } = await axios.get(
          `${API.ENDPOINTS.MATCHES.BY_GROUP(tournamentId, gid)}?mobile=true`
        );
        const matches = data?.matches || data?.data || (Array.isArray(data) ? data : []);
        const total = matches.length;
        const completed = matches.filter(
          (m) => String(m?.status || "").toUpperCase() === "COMPLETED"
        ).length;
        return [gid.toString(), { total, completed, allDone: total > 0 && completed === total }];
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter(Boolean));
}

export function useTournamentLeaderboard(tournamentId, activeSportId) {
  const groupsQ = useQuery({
    queryKey: ["lb-groups", tournamentId, activeSportId || null],
    queryFn: () => fetchGroups(tournamentId, activeSportId),
    enabled: !!tournamentId,
  });

  const topPlayersQ = useQuery({
    queryKey: ["lb-top-players", tournamentId],
    queryFn: () => fetchTopPlayersByGroup(tournamentId),
    enabled: !!tournamentId,
  });

  const groupIds = (groupsQ.data || []).map((g) => g._id).join(",");
  const completionQ = useQuery({
    queryKey: ["lb-completion", tournamentId, groupIds],
    queryFn: () => fetchCompletionByGroup(tournamentId, groupsQ.data),
    enabled: !!tournamentId && (groupsQ.data || []).length > 0,
  });

  return {
    groups: groupsQ.data ?? [],
    topPlayersByGroup: topPlayersQ.data ?? {},
    completionByGroup: completionQ.data ?? {},
    isLoading: groupsQ.isLoading || topPlayersQ.isLoading,
    refetch: () => {
      groupsQ.refetch();
      topPlayersQ.refetch();
      completionQ.refetch();
    },
  };
}
