# Chalo Khelne — Mobile Application Reference

> Complete feature & flow documentation for the Chalo Khelne React Native / Expo mobile app (`client/`).
> Generated 2026‑07‑01 from a full source sweep of `client/src`. Covers every role, screen, user flow, and API.

---

## Table of Contents

1. [What the app is](#1-what-the-app-is)
2. [Tech stack](#2-tech-stack)
3. [Architecture & role-based navigation](#3-architecture--role-based-navigation)
4. [Authentication](#4-authentication)
5. [Onboarding](#5-onboarding)
6. [Global state (Contexts)](#6-global-state-contexts)
7. [PLAYER role — features & flows](#7-player-role--features--flows)
8. [REFEREE role](#8-referee-role)
9. [TRAINER / COACH role](#9-trainer--coach-role)
10. [VIEWER (guest) role](#10-viewer-guest-role)
11. [Feature matrix by role](#11-feature-matrix-by-role)
12. [API reference](#12-api-reference)
13. [Screen index](#13-screen-index)
14. [Key data models](#14-key-data-models)

---

## 1. What the app is

Chalo Khelne is a **multi-role sports platform** for players, clubs/academies, coaches and match officials. A single app serves four experiences, selected by the logged-in user's role:

- **Player** — the primary, full-featured experience: discover & join tournaments, book turfs, buy/sell gear, apply for sports jobs, social feed & chat, personal stats, and a coaching console.
- **Referee** — accept match assignments and score matches on mobile (cricket, carrom, and generic set/point sports).
- **Trainer / Coach** — a club-staff console (attendance, syllabus, student star-progress, schedule) plus a player-side coaching business console (batches, sessions, requests, earnings).
- **Viewer (guest)** — unauthenticated, read-only discovery of events, venues, trainers, and the community feed.

Supported sports include **Cricket, Football, Tennis, Badminton, Table Tennis, Carrom, Chess** (and more via the sports library).

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Framework | **React Native `0.81.5`** + **Expo `~54`** (React `19.1`) |
| Navigation | `@react-navigation` v7 (native-stack, stack, bottom-tabs) |
| Server state | **TanStack React Query** v5 (30s staleTime, no refetch-on-focus) |
| Global state | React **Context API** (Auth, Chat, Notification, Onboarding) — no Redux |
| HTTP | **axios** (global auth interceptor) + `fetch` (for token refresh) |
| Real-time | **socket.io-client** v4 (chat + notifications, WebSocket w/ polling fallback) |
| Secure storage | `expo-secure-store` (tokens), `AsyncStorage` (user JSON), custom multi-account `tokenStore` |
| Auth extras | Google Sign-In (`@react-native-google-signin`), `expo-auth-session` |
| Media | `expo-image-picker`, `react-native-view-shot`, `expo-print` (PDF reports) |
| Notifications | `expo-notifications` |
| UI | `@expo/vector-icons`, `expo-linear-gradient`, `react-native-reanimated`, flash-message/toast, `react-native-calendars`, `react-native-chart-kit` |

**API base URL** (`src/config/api.js`): production `https://chalokhelne.com`; dev auto-detects LAN IP (fallback `192.168.1.65:3003`). All endpoints live under `{BASE_URL}/api`.

**Theme** (`src/theme/`): single source of truth. Brand primary `#004E93`, secondary/orange `#FF6A00`, player-tab green accent `#15A765`; role accents — trainer `#7C3AED`, referee `#059669`. (`src/config/colors.js` & `theme.js` are deprecated shims.)

---

## 3. Architecture & role-based navigation

**Provider tree** (`App.js`):
`SafeAreaProvider → QueryClientProvider → AuthProvider → NotificationProvider → ChatProvider → OnboardingProvider → NavigationContainer (deep-link `chalokhelne://`) → AppNavigator`.

**`AppNavigator` routing logic:**
1. Check onboarding status (`GET /onboarding/status`). If incomplete → **OnboardingNavigator**.
2. Else if authenticated, route by `user.role`:
   - `Player` → **PlayerNavigator**
   - `Manager` w/ staffRole `trainer`/`coach`, or `Substitute` → **TrainerStaffNavigator**
   - fallback → PlayerNavigator
3. Else (not authenticated) → **ViewerNavigator**.

### Navigator trees

**PlayerNavigator** — custom green pill bottom bar, 5 visible + 2 hidden tabs:

| Tab | Stack root | Notable screens |
|---|---|---|
| **Home** | PlayerHome | Profile, MyBookings, FavoriteVenue, MyEvents, SportsLibrary, PaymentHistory, Planner, Trainer* (coaching console), RoleHub, Jobs |
| **Events** | EventScreen | TournamentDetails, RegistrationDetails, GroupStage, TeamKnockouts, InvitePlayer, BookingWizard, Payment, Leaderboard, RefereeMatchScorer |
| **Social** | SocialHome | SocialProfile, NewsList, NewsDetail |
| **Turf** | PlayerVenue | TurfDetails, TurfBooking, Preview, PaymentMethod, Confirmation, MyBookings |
| **Store** | EquipmentHub | DonationList/Detail, Cart, Payment, OrderConfirmation, TrackOrder, Sell* flow, MyListings, MyClaims |
| Chat *(hidden)* | ChatList | ChatConversation, ChatSearch, GroupChatList/Conversation |
| Profile *(hidden)* | PlayerProfile | EditProfile, TournamentHistory, RoleHub, Referee screens, Invitations |

**TrainerStaffNavigator** — 6 tabs: Home, Schedule, Syllabus, Progress, Attendance, Profile.

**ViewerNavigator** — 4 tabs (blue accent): Home, Event (+ EventDetails), Social, Account (→ Auth stack). Venue/Trainer tabs exist but are currently commented out.

**AuthNavigator**: Login · Register · ForgotPassword.
**OnboardingNavigator**: Welcome · Features · Completion.

---

## 4. Authentication

Files: `context/AuthContext.js`, `api/auth.js`, `screens/auth/*`.

**Roles a mobile user can hold:** `Player` (primary), `Manager` (+ staffRole coach/trainer) / `Substitute` → staff app. `Trainer`, `Referee` are backend-supported and re-enableable in `RoleSelector` (currently only **Player** is exposed at signup). A user can also hold multiple **service roles** (Referee, Scorer, etc.) managed via RoleHub.

**Register** (`RegisterScreen`): name, email, mobile (10-digit), password (min 6), role, DOB (13+ enforced — Families Policy). `POST /register`. No auto-login → redirect to Login. Accounts may require approval.

**Login** (`LoginScreen`):
- Email/password → `POST /login` → `{ token, refreshToken, user }`.
- **Google Sign-In** → `POST /google-login`.
- Access JWT (1h) + refresh token stored in **SecureStore**; user JSON in AsyncStorage; mirrored to context.
- **Multi-account**: each login saved to a session list; switch accounts 1-tap without re-login; on logout, falls back to next remembered account.

**Token management** (global axios interceptor):
- Request: injects live token on every call.
- Response 401: single-flight refresh via `POST /auth/refresh` (queues concurrent 401s), retries original; on failure → logout. Auth endpoints skip refresh.

**Forgot password** (`ForgotPasswordScreen`) — OTP based:
1. `POST /email/forgot-password/send-otp` (5-min expiry, 60s resend cooldown).
2. `POST /email/forgot-password/verify-otp`.
3. `POST /email/forgot-password/reset`.

**`useAuth()`** exposes: `user, token, isAuthenticated, isInitializing, isPlayer/isTrainer/isReferee`, and methods `register, login, googleLogin, logout, updateProfile, forgotPassword, resetPassword, updateUser, switchAccount, addAccount`.

---

## 5. Onboarding

Files: `context/OnboardingContext.js`, `screens/onboarding/*`.

Status is checked on every launch via `GET /onboarding/status?deviceId=&userId=` (fail-open on network error). Three-screen stack:
1. **Welcome** — intro + Get Started / Skip.
2. **Features Carousel** — 4 cards (Find Tournaments, Track Performance, Connect with Players, Live Updates).
3. **Completion** — checklist + `POST /onboarding/complete` (deviceId + platform/appVersion).

Analytics: per-screen view timers + step tracking (`/onboarding/track-screen`, `/update-step`, `/update-preferences`, `/skip`), all non-blocking (5s timeout). Device ID always sent (works for unauthenticated users).

---

## 6. Global state (Contexts)

- **AuthContext** — user/token/roles, hybrid SecureStore+AsyncStorage persistence, transparent refresh, multi-account switcher, push-token registration, role helper flags.
- **ChatContext** — socket.io connection, `unreadTotal`, `message:new` events, auto-reconnect on foreground, `getSocket/decrementUnread/fetchUnreadTotal`.
- **NotificationContext** — `notifications[]`, `unreadCount`, `notification:new` socket event + 60s polling fallback; active only for authenticated Player users (staff skipped).
- **OnboardingContext** — step, preferences, screen-timing analytics, completion flags.

---

## 7. PLAYER role — features & flows

The player experience spans 12 feature areas.

### 7.1 Home Hub (`PlayerHomeScreen`, `RoleHub`)
Main aggregated feed. Header avatar + **role switcher** (RoleSwitcher → RoleHub). Hamburger **sidebar** (Profile, Bookings, News, Sports Library, Trainers, Jobs, Orders, Sales, Sell, Invitations). **Debounced search** (500ms) across Turfs/Tournaments/Players/Trainers (`GET /search`). Sections: Quick Actions (Play Now / Book Turf), Explore Sports, Popular Turfs (`GET /turfs`), Popular Events (`GET /tournaments`, upcoming), promo banners. Right-side **notifications panel** (bell).

**RoleHub ("My Services")** — manage professional roles: Trainer, Referee, Scorer, Cameraman, Commentator, Ground Staff. Shows active vs available; tap → ServiceProfileSetup or (Referee) an action menu (Assignments / Browse Jobs / Edit). CTA → BrowseTournamentJobs.

### 7.2 Tournaments & competition
Screens: AllTournaments, TournamentDetails, TournamentBookingWizard, BookingScreen, TournamentFeeSummary, GroupStage, Groups, TeamKnockouts, LeaderboardScreen, TournamentLeaderboardDetail, TournamentViewer, MyEvents, MyEventDetails, TournamentHistory, InvitePlayer, Invitations, PlayersManager.

**Discovery** (`AllTournamentsScreen`): browse cards (name, location, date, format, fee), "Registered"/"Completed" badges, pull-to-refresh, direct nav to Groups/Knockouts. `GET /tournaments`, `GET /tournaments/bookings/user/{userId}`.

**Registration & payment flow:**
1. **TournamentDetails** — hero, venue (Google Maps link), about, **categories table** (sport → format → category with fee + age/gender eligibility), amenities, rules, corporate badge.
2. **Corporate whitelist** (if present) — Employee ID verification modal (matches whitelist by ID or last-10 phone).
3. **Age/Gender gate** (`DOBGateModal`) — fills missing DOB/gender.
4. **TournamentBookingWizard** — 4 steps: Sport → Format(s) → Categor(ies) (ineligible ones locked with reason) → Terms. Live fee total.
5. **BookingScreen** — Solo vs **Team** mode (team name, auto-sized player slots by sport, substitutes, player search); review + terms.
6. **TournamentFeeSummary** — payment method: **Offline (cash to admin)** or **QR/online** (screenshot proof, 1–2h verification). Free tournaments skip payment ("Create Booking").
7. `POST /tournaments/bookings/create` → "Registration Confirmed" → Events tab.

**Team & invitations** (`InvitePlayerScreen`): 4-step invite (type: Play-with-me / Turf match / Sports event → search & multi-select players → customize title/sport/date/time/location/note → review & send). `GET/POST /invitations/*`.

**Fixtures, groups & knockouts** (`Groups`, `GroupStage`, `TeamKnockouts`):
- **League tab** — group pills, roster, match cards, **Points Table** modal (P/W/L/PTS).
- **Ranking tab** — top players per group with medals + stats.
- **Knockout tab** — bracket by round (QF/SF/Final).
- **Team Knockouts** — Teams tab (multi-select → **Generate Round Robin**), Matches tab (grouped by round, live dot), team & match detail modals, **detailed scorecard** with **Captain's Pick** (doubles pairing selection).
- Match cards are **sport-aware**: sets (`2-1`), cricket innings (`154/6 (20.0) vs 150/8`), carrom/chess (winner).

**Live scoring / leaderboard** (`TournamentLeaderboardDetail`, `LeaderboardScreen`, `TournamentViewer`): Standings vs Groups master tabs; per-sport pill tabs; sub-tabs Players / Top Rank / Super 16 / Round 2 / Brackets; live match stream + pull-to-refresh. Endpoints under `/tournaments/...` and `/mobile/tournaments/...`.

**My Events / History**: Upcoming vs Past tabs; event cards; MyEventDetails quick actions (View Details / Standings / Leaderboard) + registration & team info.

### 7.3 Venue / Turf booking
Screens: PlayerVenue, PlayerVenueDetails, VenueBookingScreen, TurfBookingPreview, TurfPaymentMethod, VenueBookingConfirmation, MyBookings, FavoriteVenue, PaymentHistory.

**Flow:** Browse turfs (search, sport filter, favorite) → turf details (images, sports, amenities, rules) → pick date (31-day) + **multi-slot** (AM/PM 60-min grid) + court → preview + **coupon** + terms → payment (**UPI / Card / Wallet / Pay-at-Venue**; free slots skip) → ticket-style **confirmation** (share, cancel, support). Manage bookings (upcoming/past), favorites, and payment history (filterable).
APIs: `GET /turfs`, `/turfs/{id}`, `/turfs/availability/today`, `POST /turf-bookings/create`, `/turf-bookings/{id}/cancel`, `POST /user/toggle-favorite`, `/player-payment/*`.

### 7.4 Store / Equipment marketplace
Screens: EquipmentHub, DonationList/Detail, Cart, EquipmentPaymentMethod, EquipmentOrderConfirmation, TrackOrder, and the **Sell** flow (GearIntro → AddProduct → UploadImages → SellerDetails → Review → ListingSuccess → ProductStatus), MyListings, MyClaims.

**Buy flow:** browse listings (search, sport chips) → listing detail (image carousel, price, condition, seller) → **Add to Cart** or **Claim** (free donations) → Cart (qty +/-, delivery fee, coupon) → payment (UPI/Card/Wallet/COD) → order confirmation → **Track Order** (ordered → packed → shipped → delivered).
**Sell flow:** intro → create listing (sport, name, category, condition, original/asking price, donation toggle) → upload multiple images → seller details → review → publish → status (views, claims/offers).
Cart persists in **localStorage** (`store_cart_v1`). APIs: `/donations/listings`, `/donations/list`, `/donations/my-listings`, `/donations/my-claims`, `/donations/claim/{id}[/pay|/verify]`.

### 7.5 Jobs marketplace
Screens: BrowseJobs, BrowseTournamentJobs, JobDetails, HireProfessional, CreateProfessionalProfile, ServiceProfileSetup, MyClaims.

**Apply flow:** browse jobs (role/sport filters — referee, coach, scorer, cameraman…) → job details (schedule, requirements, benefits) → **Apply** → track status (Pending/Shortlisted/Accepted/Rejected).
**Hire flow:** create professional profile + credentials (sport, experience, hourly rate) → browse professionals → **Send Hire Request** → respond (accept/reject/negotiate). Payment typically offline. APIs under `/jobs/*` (postings, applications, professionals, profiles, hire-requests, dashboard).

### 7.6 Social feed & stories
Screens: SocialScreen, SocialProfile, PlayerPublicProfile.

**Feed:** stories bar (your story + others', 5s auto-advance viewer with progress bars, image or text stories) + posts (avatar, caption, sport tags, media, **like/comment/share/save**, double-tap-to-like). **Comment modal** (add/delete own). **Text story creator** (8 gradient bgs, font cycle, emoji picker, 200-char). **Profiles**: own (posts grid + Saved tab, stats) and public (Follow/Following button). APIs: `/posts/*` (like/save/comments), `/stories/*`, `/follows/{id}/status|toggle`.

### 7.7 Messaging (DMs & group chats)
Screens: ChatList, ChatConversation, ChatSearch, GroupChatList, GroupChatConversation.

**DMs & Groups** in one list (filters All/Chats/Groups, unread badges, last-message preview). **ChatConversation** handles both: DM (typing indicator, read receipts) and Group (owner controls: rename, add/remove members, delete; attachments). Messages grouped by date, own vs others' bubbles, sender+role in groups. **ChatSearch** to start a DM by player name.
Socket events: `join/leave:conversation`, `message:new`, `user:typing`, `join/leave:gchat`, `gchat:message`, `gchat:updated`. APIs: `/chat/*`, `/group-chat/*`.

### 7.8 News
Screens: NewsList, NewsDetail. Sport filter chips, **Trending** (top by views) + **Highlights** list, search. Detail: hero image, body, views counter, tags, related-by-sport, native share. APIs: `/news/active`, `/news/by-sport/{sport}`, `/news/{id}`.

### 7.9 Notifications
Screens: NotificationsScreen + in-home panel. Typed, color-coded (tournament, booking, registration, chat, invitation, general) with deep-nav on tap; Mark-all-read; unread bar; pull-to-refresh. Real-time via `notification:new` + 60s poll. APIs: `/notifications/player/{userId}[/unread-count|/read|/read-all]`.

### 7.10 Player profile
Screens: PlayerProfileScreen, EditPlayerProfileScreen, PlayerPublicProfile. Cover + avatar, bio, stats (posts/followers/following), **role chips** (switch/add), **Performance card** (per-sport win/lose/draw + win-rate from `/player-stats/{userId}/career`), basic details, **account switcher** + logout. Edit: avatar upload, basic/contact/achievements; `PUT /auth/user/{userId}/profile`.

### 7.11 Sports Library
Screens: SportsLibrary, SportDetails. Browse sport cards (icon, type, description, events/players counts, popularity bar). Detail: quick-stat grid (events/coaches/turfs/my-performance with CTAs) + tabs **About / Rules / Court Info / Beginner Tips** + "Ready to Play?" CTA. APIs: `/sports-library`, `/sports-library/{id}`.

### 7.12 Coaching console (player-side "Trainer" — see §9B)
Reached from the Home stack; lets a player who is a trainer run a coaching business (dashboard, batches, sessions, requests, earnings, find clubs).

### 7.13 Safety / age-gating
`DOBGateModal` enforces 13+ before sensitive features; under-13 shows parental-consent messaging (Families Policy). Public profiles hide personal fields.

---

## 8. REFEREE role

Screens (`screens/referee/`): RefereeAssignmentsScreen, RefereeMatchScorer, CricketScorer, CarromScorer.

**Assignments:** Active (pending/accepted) vs Completed tabs; Accept/Decline; "Open Scorer". APIs `GET /referee/assignments/{userId}[/completed]`, `PUT …/{assignmentId}/accept|decline`.

**RefereeMatchScorer** = router by `scoringType`: `innings` → CricketScorer, `board` → CarromScorer, else inline **set/points scorer** (Final entry or Live-tap +1 with auto win-detection mirroring backend `isGameWon`; landscape lock; sets history; winner banner). `GET /matches/{id}/live-state`, `POST /matches/{id}/complete-game`.

**CricketScorer** (dark, delivery-by-delivery): setup (batting-first, overs, batting/bowling orders auto-loaded from squad) → live (runs 0/1/2/3/4/6, extras W/NB/B/LB, wicket, **strike rotation** + over/bowler rotation, live striker/non-striker/bowler stats, mid-match lineup editor, Undo, Switch-innings, Finish + super-over). APIs `/cricket/setup|ball|undo|switch-innings|lineup|finish`.

**CarromScorer** (dark, board-by-board): winner + points + **queen bonus**, board history chips, auto-complete at `boardsToWin`. `POST /matches/{id}/carrom/board`.

---

## 9. TRAINER / COACH role

Split across two surfaces.

### 9A. Staff console (`screens/trainerStaff/`)
For club coaches/substitutes (a coach can request **one** substitute who is remapped to the coach's data server-side).

- **TrainerStaffHome** — greeting, role badge, **substitute request** flow (request/pending/active/rejected), "My Sports". `/club-sports/mine`, `/substitutes/*`.
- **TrainerAttendance** — date nav → session chips (by weekday) → mark **self** (present/absent+reason) + **students** (present/absent, "mark all present"). `/attendance[/students|/history]`.
- **TrainerSyllabus** — read-only week-by-week curriculum (Week/Topic/Objective/Drills/Equipment) per sport·standard. `/syllabus/mine`.
- **TrainerProgress** — **1–5 star rating** per syllabus topic per student. Tabs **Rate** (star matrix + per-student notes; Submit freezes a snapshot), **Reports** (per-student report card with averages, trends, per-sport topic table, **PDF export** via expo-print), **History** (frozen read-only snapshots). `/progress/matrix|rate|submit|students|student/{id}|history`.
- **TrainerSchedule** — merged **calendar** (Sessions/Batches/Training-schedule/Notes, color-coded multi-dot) + list view. `/trainer-console/calendar/{userId}`.
- **TrainerProfile** — edit name/email, change password, attendance history, account switcher.

### 9B. Player-side coaching console (`screens/player/Trainer*`)
For an independent trainer running a business:
- **TrainerDashboard** — stat grid (upcoming sessions, active players, pending requests, monthly earnings), quick actions, today's sessions, recent requests (accept/reject). `/trainer-console/dashboard/{userId}`.
- **TrainerBatches** + **TrainerCreateBatch** — recurring classes (name, sport, level, capacity, weekly days, time, venue, monthly fee). `/trainer-console/batches`.
- **TrainerCreateSession** + **TrainerMySessions** — one-off sessions (Personal/Group/Academy) with status tabs (All/Upcoming/Live/Completed). `/trainer-console/sessions`.
- **TrainerRequests** — inbox (Player/Club/Event tabs) with accept/reject. `/trainer-console/requests/{userId}` + `…/respond`.
- **TrainerEarnings** — earnings breakdown; **TrainerFindClubs** — discover & apply to clubs (`/trainer-console/clubs`, `/clubs/apply`).

---

## 10. VIEWER (guest) role

Screens (`screens/viewer/`): HomeScreen, EventsScreen, EventDetails, VenueScreen, VenueDetailsScreen, TrainerScreen, SocialScreen. Read-only discovery:
- **Home** — featured tournament carousel + sports categories (`GET /tournaments`).
- **Events** — searchable/filterable tournament list → details.
- **Venues** — Favourite/History/All tabs, search, sport filter (`GET /turfs`).
- **Trainers** — featured + searchable trainers, session-type/date/time/location selection, certificates viewer, book (auth required). `/trainer/*`.
- **Social** — community feed, like, comment-on-auth.
Booking/participation requires signing in (routes to Auth stack).

---

## 11. Feature matrix by role

| Feature | Player | Referee | Coach (staff) | Trainer (player) | Viewer |
|---|:--:|:--:|:--:|:--:|:--:|
| Join tournaments / pay | ✓ | — | — | — | (browse) |
| Book turf | ✓ | — | — | — | (browse) |
| Buy / sell gear | ✓ | — | — | — | — |
| Jobs: apply / hire | ✓ | (apply) | — | — | — |
| Social feed / stories | ✓ | — | — | — | (read) |
| Messaging (DM/group) | ✓ | — | — | — | — |
| Score matches | (if assigned) | ✓ | — | — | — |
| Mark attendance | — | — | ✓ | — | — |
| Star-rate students | — | — | ✓ | — | — |
| Syllabus / schedule | — | — | ✓ | ✓ | — |
| Create batches / sessions | — | — | — | ✓ | — |
| Earnings / find clubs | — | — | — | ✓ | — |
| Browse events/venues/trainers | ✓ | — | — | — | ✓ |

---

## 12. API reference

All under `{BASE_URL}/api`. Representative endpoints as used by the app.

**Auth / user:** `POST /register`, `/login`, `/google-login`, `/auth/refresh`, `/auth/logout`; `GET /auth/current-user`; `PUT /auth/user/{id}/profile`; `POST /auth/user/{id}/upload-image`; `POST /email/forgot-password/{send-otp|verify-otp|reset}`.

**Onboarding:** `GET /onboarding/status`; `POST /onboarding/{complete|skip|track-screen|update-step|update-preferences}`.

**Tournaments:** `GET /tournaments`, `/tournaments/{id}`; `POST /tournaments/bookings/create`; `GET /tournaments/bookings/user/{userId}`; `GET /tournaments/bookinggroups/tournament/{id}`; `GET /tournaments/matches/{tId}/{groupId}`; `GET /tournaments/topplayers/{tId}/{groupId}`; `GET /tournaments/leaderboard/{id}/players`; `/tournaments/round2/status/{id}`; `/tournaments/superplayers/{id}`; `/tournaments/direct-knockout/{id}/matches`; team-KO: `/players/bookings/tournament-teams/{id}`, `POST /tournaments/team-knockout/round-robin/generate`, `POST /tournaments/team-knockout/matches/{id}/select-pairing`.

**Live scoring:** `GET /tournaments/matches/{id}/live-state`; `POST /tournaments/matches/{id}/complete-game`; cricket `/cricket/{setup|ball|undo|switch-innings|lineup|finish}`; carrom `/carrom/board`.

**Invitations:** `GET /invitations/{sent|received}/{userId}`; `POST /invitations/create`.

**Venues:** `GET /turfs`, `/turfs/{id}`, `/turfs/availability/today`; `POST /turf-bookings/create`, `/turf-bookings/{id}/cancel`; `POST /user/toggle-favorite`; `/player-payment/*`.

**Store:** `GET /donations/listings[/ {id}]`; `POST /donations/list`, `/donations/claim/{id}[/pay|/verify]`; `GET /donations/{my-listings|my-claims}`.

**Jobs:** `GET/POST /jobs/postings`, `/jobs/applications`, `/jobs/professionals`, `/jobs/profiles`, `/jobs/hire-requests`, `GET /jobs/dashboard/{userId}`.

**Social/chat/news/notifications:** `/posts/*`, `/stories/*`, `/follows/{id}/{status|toggle}`; `/chat/*`, `/group-chat/*`; `/news/{active|by-sport/{s}|{id}}`; `/notifications/player/{userId}/*`.

**Sports library / stats:** `/sports-library[/ {id}]`; `/player-stats/{userId}/career`.

**Referee:** `/referee/assignments/{userId}[/completed]`, `PUT …/{id}/{accept|decline}`.

**Trainer console:** `/trainer-console/{me|dashboard|earnings|sessions|batches|requests|clubs|calendar}/…`; staff `/attendance/*`, `/progress/*`, `/syllabus/mine`, `/club-sports/mine`, `/substitutes/*`.

---

## 13. Screen index

- **auth/** (4): Login, Register, RoleSelector, ForgotPassword
- **onboarding/** (3): Welcome, FeaturesCarousel, Completion
- **player/** (95): Home/Profile/Hub (PlayerHome, PlayerProfile, EditPlayerProfile, RoleHub, PlayerPublicProfile); Tournaments (AllTournaments, TournamentDetails, TournamentBookingWizard, BookingScreen, TournamentFeeSummary, GroupStage, Groups, TeamKnockouts, Leaderboard, TournamentLeaderboardDetail, TournamentViewer, MyEvents, MyEventDetails, TournamentHistory, RegistrationDetails, InvitePlayer, Invitations, PlayersManager); Venue (PlayerVenue, PlayerVenueDetails, VenueBookingScreen, TurfBookingPreview, TurfPaymentMethod, VenueBookingConfirmation, BookingConfirmation, MyBookings, FavoriteVenue, PaymentHistory, PlayerPaymentScreen); Store (EquipmentHub, Cart, EquipmentPaymentMethod, EquipmentOrderConfirmation, TrackOrder, DonationList, DonationDetail, CreateListing, MyListings, Sell{GearIntro,AddProduct,UploadImages,SellerDetails,Review,ListingSuccess,ProductStatus}, MyClaims); Jobs (BrowseJobs, BrowseTournamentJobs, JobDetails, HireProfessional, CreateProfessionalProfile, ServiceProfileSetup); Social/Chat/News (SocialScreen, SocialProfile, ChatList, ChatConversation, ChatSearch, GroupChatList, GroupChatConversation, NewsList, NewsDetail); Notifications (NotificationsScreen, PlayerNotifications); Library (SportsLibrary, SportDetails, SportsModal, SportSelectionModal); Coaching (TrainerDashboard, TrainerBatches, TrainerCreateBatch, TrainerCreateSession, TrainerMySessions, TrainerRequests, TrainerEarnings, TrainerFindClubs); Planner (Planner, DaySchedule, AddNote, Upcoming, Event); Misc (RoleHub, DOBGateModal, FAQS, PrivacyPolicy, TermsConditions, ComingSoonScreen)
- **referee/** (4): RefereeAssignments, RefereeMatchScorer, CricketScorer, CarromScorer
- **trainerStaff/** (6): TrainerStaffHome, TrainerAttendance, TrainerProfile, TrainerProgress, TrainerSchedule, TrainerSyllabus
- **viewer/** (7): Home, Events, EventDetails, Venue, VenueDetails, Trainer, Social

---

## 14. Key data models

- **Turf** `{ name, address{area,city,coordinates}, images[], sports[{name,pricePerHour}], facilities{}, courts, rules }`
- **TurfBooking** `{ userId, turfId, date, timeSlot, sport, amount, paymentMethod, court, status }`
- **Tournament** `{ title, sports[{sportId,sportName,type,categories[{name,fee,minAge,maxAge,gender}]}], whitelist[], courts[], startDate, endDate }`
- **TournamentBooking** `{ userId, tournamentId, paymentAmount, paymentMethod, status, team, selectedCategories, sportSelections, totalFee, employeeId }`
- **Match (result)** — sport-aware: `sets[]` (sets), `result.innings[]` (cricket runs/wickets/overs/extras/FoW + cricketResult), `result.boards[]` (carrom), `finalScore{player1Sets,player2Sets}`.
- **Listing** `{ userId, sport, itemName, category, condition, originalPrice, askingPrice, images[], status }`
- **JobPosting / Application / ProfessionalProfile / HireRequest** (jobs module)
- **Story** `{ user, image?|text?, bgColor?, fontFamily?, createdAt }`
- **Batch / Session** `{ name, sport, level|type, capacity, scheduleDays[], time, location, fee }`
- **StudentProgress** — per syllabus topic 1–5 stars + remark; frozen snapshots in history.
- **PlayerStats** `{ sportStats[{sport,matches,wins,losses,draws,winRate}] }`

---

*End of document. Scope: `client/src` — 119 screens across auth / onboarding / player / referee / trainerStaff / viewer.*
