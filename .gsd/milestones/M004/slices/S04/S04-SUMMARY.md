---
id: S04
parent: M004
milestone: M004
provides:
  - 7th "Compete" tab in mobile bottom navigator with CompeteStack (Leaderboard, Challenges, ChallengeDetail screens)
  - LeaderboardScreen consuming getLeaderboard, getMyRank, getLeaderboardExercises APIs
  - ChallengesScreen consuming listChallenges, createChallenge APIs with exercise picker modal
  - ChallengeDetailScreen consuming getChallengeStandings, joinChallenge, leaveChallenge, cancelChallenge APIs
  - BadgeDisplayNative on ProfileScreen (isOwnProfile=true) and OtherProfileScreen (isOwnProfile=false)
  - Leaderboard opt-in toggle on ProfileScreen using setLeaderboardOptIn mutation
  - PillSelectorNative generic string-value pill selector reusable component
  - LeaderboardTableNative ranked entry table with current-user highlighting
requires:
  - slice: S01
    provides: getLeaderboard, getMyRank, getLeaderboardExercises, setLeaderboardOptIn queries/mutations, leaderboardOptIn profile field
  - slice: S02
    provides: listChallenges, createChallenge, joinChallenge, leaveChallenge, cancelChallenge, getChallengeStandings mutations/queries
  - slice: S03
    provides: getUserBadges query, BADGE_DEFINITIONS constant for display metadata
affects:
  - none (final slice of M004)
key_files:
  - apps/native/src/components/competitive/PillSelectorNative.tsx
  - apps/native/src/components/competitive/BadgeDisplayNative.tsx
  - apps/native/src/components/competitive/LeaderboardTableNative.tsx
  - apps/native/src/screens/LeaderboardScreen.tsx
  - apps/native/src/screens/ChallengesScreen.tsx
  - apps/native/src/screens/ChallengeDetailScreen.tsx
  - apps/native/src/navigation/MainTabs.tsx
  - apps/native/src/screens/ProfileScreen.tsx
  - apps/native/src/screens/OtherProfileScreen.tsx
key_decisions:
  - D132: Generic PillSelectorNative instead of modifying PeriodSelector
  - D133: Compete tab as 7th bottom tab with CompeteStack
  - D134: ChallengeDetailScreen as separate stack screen (not inline expansion like web D123)
  - D135: Simple exercise selector for challenge creation instead of reusing ExercisePicker
  - D136: TextInput date entry for challenge creation with YYYY-MM-DD HH:MM format
patterns_established:
  - components/competitive/ directory for competitive feature native components (extends D100 social/ pattern)
  - Self-contained data-fetching components with loading/empty/populated tri-state rendering (BadgeDisplayNative)
  - Generic type parameter components for reusable selectors (PillSelectorNative<T extends string>)
  - Optional competitive feature props on SettingsSection for conditional rendering
  - Explicit generic type parameter at PillSelectorNative call sites for TypeScript strict mode
observability_surfaces:
  - console.error with [ChallengesScreen], [ChallengeDetail], [ProfileScreen] prefixes for mutation failures
  - Alert.alert for user-facing error feedback on all mutations
  - Loading/empty/populated tri-state rendering in all screens (ActivityIndicator → empty message → data)
  - BadgeDisplayNative manages own loading/error/empty states internally via useQuery
drill_down_paths:
  - .gsd/milestones/M004/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M004/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M004/slices/S04/tasks/T03-SUMMARY.md
duration: 41 minutes
verification_result: passed
completed_at: 2026-03-11
---

# S04: Mobile Competitive Port

**All leaderboard, challenge, and badge features ported to React Native mobile app with 3 new screens, 3 reusable components, 7th Compete tab, and profile integration — consuming the same Convex backend with zero backend changes.**

## What Happened

Ported the entire M004 competitive feature set (leaderboards, challenges, badges) to the React Native mobile app in 3 tasks:

**T01 (8 min):** Created 3 reusable components in `components/competitive/`: PillSelectorNative (generic `<T extends string>` horizontal pill selector), BadgeDisplayNative (self-contained badge grid with own `useQuery(api.badges.getUserBadges)` and animated skeleton loading), and LeaderboardTableNative (ranked FlatList with current-user highlighting and "You" badge).

**T02 (25 min):** Built 3 full screens consuming all leaderboard and challenge Convex APIs. LeaderboardScreen (~250 lines) with exercise selector chips, metric/period pill pickers, ranked table, and My Rank callout. ChallengesScreen (~500 lines) with status filter pills, challenge card list, create form with exercise picker modal, and "View Leaderboards" navigation. ChallengeDetailScreen (~420 lines) with standings, winner display, and join/leave/cancel action buttons. Wired CompeteStack as 7th tab in MainTabs with trophy icon.

**T03 (8 min):** Integrated BadgeDisplayNative into ProfileScreen (between profile card and stats, `isOwnProfile=true`) and OtherProfileScreen (`isOwnProfile=false`). Added leaderboard opt-in toggle in ProfileScreen settings section calling `setLeaderboardOptIn` mutation. Extended SettingsSection with optional competitive props.

Zero backend changes — all 3 screens consume the same Convex queries/mutations as the web app.

## Verification

**TypeScript compilation (0 new errors across all 3 packages):**
- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors ✅
- `cd apps/web && npx tsc --noEmit` — only pre-existing clsx TS2307 ✅
- `cd apps/native && npx tsc --noEmit` — only pre-existing convex/react TS2307 (30 instances) ✅

**Structural grep checks (all passing):**
- `grep -r "api.leaderboards" apps/native/src/` — getLeaderboard, getMyRank, getLeaderboardExercises, setLeaderboardOptIn ✅
- `grep -r "api.challenges" apps/native/src/` — listChallenges, createChallenge, joinChallenge, leaveChallenge, cancelChallenge, getChallengeStandings ✅
- `grep -r "api.badges" apps/native/src/` — getUserBadges ✅
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 7 ✅
- `ls apps/native/src/components/competitive/` — PillSelectorNative.tsx, BadgeDisplayNative.tsx, LeaderboardTableNative.tsx ✅
- `ls apps/native/src/screens/` — LeaderboardScreen.tsx, ChallengesScreen.tsx, ChallengeDetailScreen.tsx ✅
- `grep "BadgeDisplayNative" apps/native/src/screens/ProfileScreen.tsx` — import + usage ✅
- `grep "BadgeDisplayNative" apps/native/src/screens/OtherProfileScreen.tsx` — import + usage ✅
- `grep "setLeaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` — mutation + call + error log ✅

## Requirements Advanced

- R011 (Cross-Platform UI) — Extended with competitive features on mobile: leaderboards, challenges, and badges now work on both web and mobile consuming the same Convex backend
- R018 (Leaderboards) — Mobile delivery: LeaderboardScreen with exercise/metric/period selectors and ranked table, opt-in toggle on ProfileScreen
- R019 (Group Challenges) — Mobile delivery: ChallengesScreen with status filtering and creation, ChallengeDetailScreen with standings and actions
- R020 (Achievements and Badges) — Mobile delivery: BadgeDisplayNative on both ProfileScreen and OtherProfileScreen

## Requirements Validated

- None moved to validated — R018, R019, R020 remain active pending live Convex backend verification script execution (12 + 16 + 12 = 40 checks). R011 cross-platform aspect proven at TypeScript level but requires Expo runtime UAT.

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- **6 challenge APIs instead of 7:** `api.challenges.getChallenge` is not consumed from mobile because ChallengeDetailScreen receives challenge data via navigation route params instead of querying separately. The 3 remaining exports (`completeChallenge`, `activateChallenge`, `checkDeadlines`) are internal mutations not meant for client use. All user-facing challenge functionality is fully covered.
- **Explicit generic type parameters required:** PillSelectorNative required explicit generic type parameters at call sites (`PillSelectorNative<Metric>`) to satisfy TypeScript strict generic inference — minor implementation detail not anticipated in the plan.

## Known Limitations

- **No runtime verification:** All verification is structural (TypeScript compilation + grep). Expo runtime testing on device/simulator required for visual UX validation (7-tab navigation, date input for challenges, badge grid layout on narrow screens).
- **Date input via TextInput (D136):** Challenge creation uses freeform text input for dates rather than a native date picker. Usable but not ideal UX.
- **getChallenge API unused on mobile:** Challenge data passed via navigation params. Deep linking to a specific challenge would need this API call added.
- **7 tabs is at the navigation usability ceiling:** 7 bottom tabs may feel crowded on smaller devices. Human UAT needed to assess.

## Follow-ups

- Human UAT on physical device or Expo Go to verify 7-tab navigation usability on various screen sizes
- Convex CLI auth resolution to run all M004 verification scripts (40 checks: S01=12, S02=16, S03=12)
- Consider adding `@react-native-community/datetimepicker` for improved challenge date input UX if user friction is observed

## Files Created/Modified

- `apps/native/src/components/competitive/PillSelectorNative.tsx` — New: generic string-value pill selector with horizontal ScrollView
- `apps/native/src/components/competitive/BadgeDisplayNative.tsx` — New: self-contained badge grid with own Convex data fetching, animated skeleton loading
- `apps/native/src/components/competitive/LeaderboardTableNative.tsx` — New: ranked leaderboard table with current-user highlighting
- `apps/native/src/screens/LeaderboardScreen.tsx` — New: leaderboard screen with exercise/metric/period selectors and ranked table
- `apps/native/src/screens/ChallengesScreen.tsx` — New: challenges list with status filter, create form, exercise picker modal
- `apps/native/src/screens/ChallengeDetailScreen.tsx` — New: challenge detail with standings and join/leave/cancel actions
- `apps/native/src/navigation/MainTabs.tsx` — Modified: added CompeteStack as 7th tab with trophy icon
- `apps/native/src/screens/ProfileScreen.tsx` — Modified: added BadgeDisplayNative + leaderboard opt-in toggle in settings
- `apps/native/src/screens/OtherProfileScreen.tsx` — Modified: added BadgeDisplayNative between profile card and stats

## Forward Intelligence

### What the next slice should know
- All competitive Convex APIs are now consumed from both web and mobile — any backend API changes must consider both clients
- M004 is complete at the TypeScript/structural level; 40 backend verification checks remain blocked on Convex CLI auth
- The `components/competitive/` directory pattern is established alongside `components/social/` and `components/analytics/`

### What's fragile
- 7-tab bottom navigation is at the usability ceiling (D133) — adding an 8th tab would require grouping or drawer navigation
- TextInput date entry for challenges (D136) — users may enter malformed dates; `new Date()` parsing is lenient but UX is poor
- Challenge creation exercise picker modal (D135) — loads full exercise list; could be slow with 144+ exercises on low-end devices

### Authoritative diagnostics
- `npx tsc --noEmit` across all 3 packages — canonical compilation health check
- `grep -r "api.leaderboards\|api.challenges\|api.badges" apps/native/src/` — confirms all API surface wiring
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — confirms tab count

### What assumptions changed
- Plan listed 7 challenge APIs to consume — only 6 user-facing APIs are needed; `getChallenge` is superseded by navigation params on mobile (D134)
- PillSelectorNative required explicit type parameter at call sites — TypeScript strict mode doesn't infer generic `T` from `options` array alone
