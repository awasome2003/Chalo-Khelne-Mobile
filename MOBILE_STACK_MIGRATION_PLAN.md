# Chalo Khelne Mobile — Stack Modernization Plan

> Incremental migration from **what exists today** (RN 0.81 / Expo 54, plain JS, fragmented API/auth, unenforced theme) to the recommended modern stack ("the Verdict"). **No rewrite.** Every phase leaves the app shippable; phases are ordered by dependency + leverage, and several overlap.
>
> Companion to `CHALO_KHELNE_MOBILE_APP.md` (feature/flow reference). Generated 2026-07-06.

---

## Target stack ("the Verdict")

| Layer | Today | Target |
|---|---|---|
| Framework | Expo 54 / RN 0.81 | **Keep** |
| Navigation | React Navigation v7 | **Keep** |
| Language | Plain JS | **TypeScript** (incremental) |
| HTTP/auth | 4+ token mechanisms | **One axios instance + interceptor** |
| Server state | React Query installed, unused | **TanStack Query, properly** |
| Client state | Context everywhere | **Zustand** (+ Context for auth) |
| Styling | StyleSheet + hardcoded hex | **Unistyles 3** (tokens enforced) |
| Forms | manual useState + hand validation | **React Hook Form + Zod** |
| Lists | FlatList / ScrollView | **FlashList** (hot lists) |
| Payments | fake "online" | **Razorpay RN** |
| Monitoring | none | **Sentry** |

---

## Dependency order (why this sequence)

```
P0 Safety net ──┬──> P1 Unify HTTP/auth ──> P3 React Query ──┐
                │                                            ├──> P6 Forms (RHF+Zod)
                └──> P2 TypeScript (runs alongside P1–P5) ───┘
                                                             
P4 Styling ── independent, can start anytime after P0
P5 Zustand ── small, after P1
P7 FlashList ── independent, anytime
P8 Payments ── product-gated, after P1 (needs the unified client)
P9 Launch hardening ── last
```

- **P1 before P3** — React Query hooks must sit on ONE consistent client, not the current 4.
- **P2 (TypeScript) is a long-running track**, not a blocking phase — it proceeds file-by-file alongside everything else with `allowJs: true`. Start it early; it pays off in every later phase.
- **Types before data layer** — defining API response shapes once (P2) is what kills the `BOOKINGS.BY_USER`-parsed-4-ways class of bug when you build query hooks (P3).
- **P4 / P7 are independent** — assign them in parallel if you have more than one dev.
- **P8 (payments) is the only true launch blocker** and is product-gated; everything else is quality/velocity.

Rough total: **~3–4 months solo part-time**, much faster with 2+ devs. App is releasable throughout.

---

## Phase 0 — Safety net & cleanup  *(~1 week)*  — ✅ DONE (2026-07-07)

> **Status: complete.** `npm run typecheck` and `npm run lint` both pass (0 errors; 443 warnings = tracked backlog). Sentry wired (no-op until DSN). Canonical `ScreenState` skeleton added.

Set up the tooling and delete the known-broken code **before** migrating, so you never port garbage and you can see regressions.

**Do:**
1. **Sentry** (`@sentry/react-native`) — crash + error reporting live before you touch anything. This is your migration safety net.
2. **TypeScript tooling only** (no conversion yet): add `tsconfig.json` with `allowJs: true, strict: true`, add `typescript` + `@types/*`, wire a `typecheck` script into CI. Zero files converted — just the scaffold.
3. **ESLint + Prettier** with import-ordering; add a lint rule stub for "no raw hex in styles" (enable it in P4).
4. **Delete/fix the confirmed dead code & quick bugs** found in the audit:
   - `GroupChatConversationScreen.js` — orphaned, broken socket import (route already renders `ChatConversationScreen`). Delete.
   - `features/tournaments/hooks/useTournamentLeaderboard.js` — imports endpoints that don't exist on that module. Fix the import or delete.
   - `PaymentHistory.js` — turf block is fetched then discarded (commented out). Decide: wire it or remove the wasted fetch.
   - `DonationDetailScreen.js` — `DONATIONS.LISTINGS` undefined → malformed vendor-click URL.
   - `FAQS.js` — Q2/Q3/Q5 are duplicate copy-paste entries.
   - `utils/asyncStorage.js` — stale `@auth_token` key scheme (different from live `tokenStore`). Remove to prevent confusion.
5. **Reference "screen skeleton"** — one canonical loading / error / empty / retry pattern (you already have `LoadingScreen`, `EmptyState`, `ErrorBanner`) to copy as screens get migrated.

**Exit:** Sentry reporting; CI runs `tsc` (0 converted files, passes); dead code gone; lint/format enforced.

---

## Phase 1 — Unify the HTTP / auth layer  *(~1–1.5 weeks)*  — ✅ DONE (2026-07-07)

> **Status: complete** (static verification: typecheck + lint green, expo config resolves; runtime login/refresh not exercised — no device in this env). New `src/services/http.js` owns the shared axios client + interceptors + single-flight refresh (extracted from AuthContext). Deleted dead `apiClient.js`, `PlayerPaymentServices.js` (0 consumers), `config/env.js` (0 consumers). `api/api.js` is now env-driven via `EXPO_PUBLIC_ENV` / `EXPO_PUBLIC_SERVER_URL` (comment-toggle removed; export shape preserved for all 61 consumers). `authFetch` (26 consumers) intentionally kept — it reads the same token source; converting it is deferred.

Collapse the 4+ token-attachment mechanisms into **one** client. This is the foundation React Query sits on.

**Do:**
1. **One axios instance** (`services/http`) owning: base URL, timeout, the request interceptor (attach live token), and the single-flight 401 refresh-and-retry (lift the good logic already in `AuthContext`).
2. **Delete the bypasses:** `services/apiClient.js` (has no refresh — silently logs out on 401), `services/PlayerPaymentServices.js` (per-instance token), `authFetch.js` (fetch wrapper), and manual `authHeaders()`. Everything routes through `services/http`.
3. **One config, real env switching:** merge `config/env.js` + `api/api.js` into a single module driven by `EXPO_PUBLIC_*` env vars / `app.config.js` — **kills the "uncomment the prod URL line before shipping" trap.**
4. Keep `tokenStore` as-is (it's solid) — it stays the secure-storage + multi-account source of truth.

**Exit:** `grep` shows a single axios import path; dev/prod switch is env-driven, not comment-toggled; a forced 401 refreshes-and-retries everywhere (no accidental logouts).

---

## Phase 2 — TypeScript, leaf-inward  *(long-running, ~3–4 weeks of effort, parallel to P1–P6)*

Incremental, `allowJs: true`, app never stops. Convert in dependency order so types flow outward.

**Order:**
1. `types/` — domain models: `Tournament`, `Booking`, `TurfBooking`, `Listing`, `Story`, `JobPosting`, `PlayerStats`, plus **the API response envelope(s)** (`{ success, data }` etc.) defined **once**.
2. `api/` endpoint modules → `utils/` → `hooks/` → `components/` (shared, high-reuse first) → **screens** (highest-traffic first: PlayerHome, TournamentDetails, Booking, Turf flow, Social).
3. Leave the 205KB `TournamentLeaderboardDetail.js` for last / consider splitting it during conversion.

**Why it matters:** compile-time catches for exactly the bugs the audit found (response parsed 4 ways, undefined endpoint refs, wrong payment-provider strings).

**Exit (of the *blocking* part):** `api/`, `utils/`, `components/` fully typed; screen conversion continues opportunistically ("touch it, type it").

---

## Phase 3 — TanStack Query as the real data layer  *(~2–3 weeks, overlaps P2)*

React Query is installed but most screens still `useEffect + useState + axios`. Move reads into hooks.

**Do:**
1. Query/mutation hooks under `features/<domain>/hooks` (finally realizes the abandoned `features/` migration).
2. Convert reads **screen-by-screen** — caching, loading/error/retry come for free; deletes the hand-rolled fetch boilerplate.
3. **Fix the N+1s** (`MyBookings` fetches one turf/tournament per booking) with proper query design or a batch endpoint.
4. Standardize on the response envelope typed in P2 so every hook parses identically.

**Exit:** all list/detail reads go through `useQuery`; converted screens have no manual fetch/loading state.

---

## Phase 4 — Styling system + theme enforcement  *(~2–3 weeks, independent)*

You built `src/theme/` tokens then ignored them (green `#15A765` / blue `#3B4DFD` / indigo `#4F46E5` hardcoded per file).

**Do:**
1. Adopt **Unistyles 3** — StyleSheet-compatible API (low churn on an existing StyleSheet codebase), keeps `src/theme` tokens, C++ engine, dark-mode-ready. *(Alt: NativeWind/Tailwind if the team prefers utility classes — bigger rewrite.)*
2. Migrate screens to tokens; **turn on the "no raw hex" lint rule** from P0 to stop drift.
3. **Product decision needed:** pick ONE brand direction (resolve green vs blue vs indigo per role, or commit to a single palette). Deprecate the `config/colors.js` + `config/theme.js` shims once done.

**Exit:** no hardcoded hex in styles; single enforced theme; optional dark mode unlocked.

---

## Phase 5 — Client state with Zustand  *(~0.5 week, after P1)*

**Do:** move genuinely-shared client state out of ad-hoc storage/Context into small typed Zustand stores — chiefly the **cart** (currently raw AsyncStorage `store_cart_v1`) and cross-screen UI flags. Auth stays in Context.

**Exit:** cart + shared UI state in typed Zustand stores; no ad-hoc AsyncStorage reads for UI state.

---

## Phase 6 — Forms: React Hook Form + Zod  *(~1.5–2 weeks, after P2 types)*

**Do:** convert the heavy forms — `BookingScreen`, the Sell wizard, `CreateProfessionalProfile`, `EditPlayerProfile`, `TrainerCreateBatch/Session`. Zod schemas **shared with the P2 API types**.

**Why:** eliminates the manual-validation drift *and* the keyboard-drop-on-remount class of bug (RHF's uncontrolled inputs sidestep the "field component re-created each keystroke" problem noted in your memory).

**Exit:** heavy forms on RHF; validation via shared Zod schemas.

---

## Phase 7 — Performance: FlashList  *(~0.5–1 week, independent)*

**Do:** swap FlatList/ScrollView → **FlashList** on the hot lists: Social feed, chat threads, leaderboard, tournament/turf lists.

**Exit:** long lists on FlashList; measured scroll improvement on low-end Android.

---

## Phase 8 — Payments: Razorpay  *(~1.5–2 weeks, product-gated — the real launch blocker)*

Today both tournament and turf "online" payment just record `paymentMethod: "online"` and create the booking; the "upload screenshot proof" UI only sends a text transaction ID.

**Do:** integrate **Razorpay RN SDK** (UPI/card, India), replace the fake online path across tournament + turf + store, and wire server-side verification (needs backend coordination — out of frontend scope but the frontend contract is defined here). Keep offline/cash + pay-at-venue as-is.

**Exit:** real gateway payment on all three flows; the screenshot-proof path retired.

---

## Phase 9 — Launch hardening  *(~1 week)*

**Do:**
1. Remove/wire remaining **mock & stub data**: viewer trainer availability (`Math.random()`), order-tracking timelines (fabricated from elapsed days), `RoleHub` roles that never verify (scorer/cameraman/commentator/staff), viewer `EventDetails.handleRegister` + "Report Post" stubs, `PlayerNotifications` vs `NotificationsScreen` duplication.
2. E2E smoke tests with **Maestro** on the critical flows (login, book tournament, book turf, buy gear).
3. Verify EAS build/submit config; confirm `ACTIVE_ENV=production` (now env-driven from P1); one full prod dry-run.

**Exit:** no mock data in production paths; store-ready build; critical flows smoke-tested.

---

## Decisions needed from you (blocking specific phases)

1. **P4** — brand direction: one palette, or keep per-role accents (green player / blue viewer / purple trainer)?
2. **P4** — Unistyles 3 (low churn, my recommendation) vs NativeWind (Tailwind, bigger rewrite)?
3. **P8** — is a real payment gateway in scope now, or stay manual-verification for launch? (Razorpay assumes India/UPI — confirm.)
4. **Team size / timeline** — solo vs multi-dev changes how much of P2/P4/P7 runs in parallel.
