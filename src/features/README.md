# Mobile `features/` (Phase 6)

Mirrors the web app's `sports_app/src/features/` organization. Today the mobile
app is `screens/`-heavy (64% of code) with Context-only state and no server-state
cache. We migrate **incrementally**, feature by feature — not a big-bang move.

## Convention (per feature)

```
features/
  <feature>/
    hooks/        TanStack Query hooks + feature logic (e.g. useTournamentLeaderboard)
    components/   focused, reusable UI (decomposed from god-screens)
    api/          (optional) endpoint wrappers for this feature
    index.js      public surface of the feature
```

Screens stay in `screens/` and become **thin** — they compose feature hooks +
components instead of holding fetch logic + 5,000 lines of UI.

## First 3 feature modules to migrate (highest value / most reused)

| # | Feature | Why first | God-screens it absorbs |
|---|---|---|---|
| 1 | **tournaments** ✅ started | biggest screens, most traffic | `TournamentLeaderboardDetail` (5,554), `TournamentViewer` (2,602), `TournamentDetails` (1,510) |
| 2 | **social** | reused across roles | `SocialScreen` (1,806) |
| 3 | **profile / jobs** | self-contained, reused | `CreateProfessionalProfileScreen` (1,875), `BrowseJobs` (3,315) |

## Proof of concept (done)

`features/tournaments/hooks/useTournamentLeaderboard.js` — extracts the
leaderboard data-fetching (groups + top players + per-group completion) out of
the 5,554-line `TournamentLeaderboardDetail.js` into a cached TanStack Query
hook. The screen adopts it by deleting its `fetchGroups` / `fetchAllGroupTopPlayers`
/ `fetchGroupCompletion` + their `useState`/`useEffect` and calling:

```js
const { groups, topPlayersByGroup, completionByGroup, isLoading, refetch } =
  useTournamentLeaderboard(tournamentId, activeSportId);
```
