# S04: Mobile Competitive Port

**Goal:** All leaderboard, challenge, and badge features work on the React Native mobile app with native UI components — consuming the same Convex backend with zero backend changes.
**Demo:** A user opens the mobile app, taps the "Compete" tab, sees leaderboard rankings with exercise/metric/period pickers, navigates to challenges, creates a challenge, views standings, and checks badges on their profile — all consuming the same Convex queries/mutations as the web app.

## Must-Haves

- 7th "Compete" tab in bottom tab navigator with CompeteStack containing LeaderboardScreen and ChallengesScreen
- LeaderboardScreenNative with exercise selector, metric/period pill pickers (via new generic PillSelector), ranked FlatList, My Rank callout — consuming `getLeaderboard`, `getMyRank`, `getLeaderboardExercises`
- ChallengesScreenNative with status pill filter, challenge list FlatList, create form with exercise picker — consuming `listChallenges`, `createChallenge`, `joinChallenge`, `leaveChallenge`, `cancelChallenge`
- ChallengeDetailScreenNative with standings FlatList, action buttons, winner display — consuming `getChallengeStandings`, `getChallenge`
- BadgeDisplayNative component with own `useQuery(api.badges.getUserBadges)`, loading/empty/populated states, responsive 3-column grid
- BadgeDisplayNative integrated into ProfileScreen (between profile card and stats) and OtherProfileScreen (between profile info and stats)
- Leaderboard opt-in toggle on ProfileScreen (own profile only) using `setLeaderboardOptIn` mutation
- Generic PillSelector component accepting `string` values (PeriodSelector only accepts `number | undefined`)
- TypeScript compiles with 0 new errors across all 3 packages (`packages/backend`, `apps/web`, `apps/native`)

## Proof Level

- This slice proves: integration (mobile UI consuming real Convex backend API surface)
- Real runtime required: yes — Expo runtime required for visual/UX verification, but TypeScript compilation proves type-safe API wiring
- Human/UAT required: yes — 7-tab navigation usability, date input UX for challenge creation, badge grid layout on narrow screens

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors (regression)
- `cd apps/web && npx tsc --noEmit` — 0 new errors (regression)
- `cd apps/native && npx tsc --noEmit` — 0 new errors (34 pre-existing TS2307 for convex/react tolerated)
- `grep -r "api.leaderboards" apps/native/src/` — returns hits for `getLeaderboard`, `getMyRank`, `getLeaderboardExercises`, `setLeaderboardOptIn`
- `grep -r "api.challenges" apps/native/src/` — returns hits for `listChallenges`, `createChallenge`, `joinChallenge`, `leaveChallenge`, `cancelChallenge`, `getChallengeStandings`, `getChallenge`
- `grep -r "api.badges" apps/native/src/` — returns hits for `getUserBadges`
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 7
- `ls apps/native/src/components/competitive/` — returns `PillSelectorNative.tsx`, `BadgeDisplayNative.tsx`, `LeaderboardTableNative.tsx`
- `ls apps/native/src/screens/` — includes `LeaderboardScreen.tsx`, `ChallengesScreen.tsx`, `ChallengeDetailScreen.tsx`
- Structural: `ProfileScreen.tsx` imports `BadgeDisplayNative` and uses `setLeaderboardOptIn` mutation
- Structural: `OtherProfileScreen.tsx` imports `BadgeDisplayNative`

## Observability / Diagnostics

- Runtime signals: All Convex API calls go through `useQuery`/`useMutation` hooks — errors surface as React error boundaries or console.error in component catch blocks. Challenge creation and join/leave mutations log errors via `Alert.alert` for user-facing feedback.
- Inspection surfaces: Convex dashboard logs with `[Leaderboard]`, `[Challenge]`, `[Badge]` prefixes from existing backend hooks. Native console logs with `[LeaderboardScreen]`, `[ChallengesScreen]`, `[ChallengeDetail]` prefixes for mutation failures.
- Failure visibility: Loading → error → empty state rendering chain in each screen. `useQuery` returning `undefined` = loading, `null` or empty array = empty state, data = populated. Mutation failures caught and displayed via `Alert.alert`.
- Redaction constraints: None — no secrets or PII in competitive feature UI.

## Integration Closure

- Upstream surfaces consumed:
  - `packages/backend/convex/leaderboards.ts` — `getLeaderboard`, `getMyRank`, `setLeaderboardOptIn`, `getLeaderboardExercises`
  - `packages/backend/convex/challenges.ts` — `createChallenge`, `joinChallenge`, `leaveChallenge`, `cancelChallenge`, `getChallengeStandings`, `listChallenges`, `getChallenge`
  - `packages/backend/convex/badges.ts` — `getUserBadges`
  - `apps/native/src/components/analytics/PeriodSelector.tsx` — pattern reference for new PillSelector
  - `apps/native/src/components/social/ProfileStatsNative.tsx` — pattern reference for BadgeDisplayNative
  - `apps/native/src/navigation/MainTabs.tsx` — extended with 7th Compete tab
  - `apps/native/src/screens/ProfileScreen.tsx` — modified with badge display + opt-in toggle
  - `apps/native/src/screens/OtherProfileScreen.tsx` — modified with badge display
- New wiring introduced in this slice:
  - CompeteStack navigator with 3 screens (Leaderboard, Challenges, ChallengeDetail) registered as 7th tab
  - BadgeDisplayNative wired into ProfileScreen and OtherProfileScreen
  - Leaderboard opt-in toggle wired into ProfileScreen settings area
- What remains before the milestone is truly usable end-to-end:
  - Human UAT on physical device or Expo Go to verify 7-tab usability on various screen sizes
  - Convex CLI auth resolution to run all verification scripts (S01: 12, S02: 16, S03: 12 checks)
  - Browser visual UAT of web UI (/leaderboards, /challenges, profile badges)

## Tasks

- [x] **T01: Add PillSelector, BadgeDisplayNative, and LeaderboardTableNative reusable components** `est:25m`
  - Why: Competitive screens need a generic string-value pill selector (existing PeriodSelector only accepts `number | undefined`), a badge grid component, and a leaderboard ranking table. Creating these first gives T02 and T03 building blocks.
  - Files: `apps/native/src/components/competitive/PillSelectorNative.tsx`, `apps/native/src/components/competitive/BadgeDisplayNative.tsx`, `apps/native/src/components/competitive/LeaderboardTableNative.tsx`
  - Do: Create `PillSelectorNative<T extends string>` generic pill component with horizontal ScrollView, selected/unselected styling (matching PeriodSelector). Create `BadgeDisplayNative` with own `useQuery(api.badges.getUserBadges)`, loading skeleton (6 animated placeholders), empty state (contextual for own vs other profile), and 3-column grid of badge cards (emoji + name + description). Create `LeaderboardTableNative` accepting ranked entries and current userId for highlighting. Follow D007 theme, D067 Native suffix, D100 subdirectory pattern.
  - Verify: `cd apps/native && npx tsc --noEmit` — 0 new errors. `ls apps/native/src/components/competitive/` contains 3 files.
  - Done when: All 3 components compile, follow theme conventions, and are importable.

- [x] **T02: Build LeaderboardScreen + ChallengesScreen + ChallengeDetailScreen and wire CompeteStack tab** `est:40m`
  - Why: The core mobile UI for competitive features — 3 screens consuming all leaderboard and challenge Convex APIs, registered as the 7th "Compete" tab.
  - Files: `apps/native/src/screens/LeaderboardScreen.tsx`, `apps/native/src/screens/ChallengesScreen.tsx`, `apps/native/src/screens/ChallengeDetailScreen.tsx`, `apps/native/src/navigation/MainTabs.tsx`
  - Do: Build LeaderboardScreen (~350 lines): exercise selector dropdown (ScrollView of exercise cards from `getLeaderboardExercises`), PillSelectorNative for metric (Est. 1RM / Total Volume / Max Reps) and period (7 Days / 30 Days / All Time), LeaderboardTableNative consuming `getLeaderboard`, My Rank callout card from `getMyRank`. Build ChallengesScreen (~400 lines): PillSelectorNative for status filter (Active / Completed / My Challenges), FlatList of challenge cards from `listChallenges`, inline create form with TextInput fields, type picker, and exercise selection via modal. Build ChallengeDetailScreen (~300 lines): challenge info header, PillSelectorNative for standings, FlatList of participants from `getChallengeStandings`, join/leave/cancel action buttons with `Alert.alert` for error feedback. Add CompeteStack to MainTabs with trophy icon, register as 7th tab. Add CompeteStackParamList type export. Use "skip" pattern for conditional queries (D085).
  - Verify: `cd apps/native && npx tsc --noEmit` — 0 new errors. `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` returns 7. `grep -r "api.leaderboards" apps/native/src/` shows all 4 API calls. `grep -r "api.challenges" apps/native/src/` shows all 7 API calls.
  - Done when: All 3 screens compile with type-safe Convex API bindings, CompeteStack registered as 7th tab in MainTabs, navigation between screens works (CompeteMain → ChallengeDetail stack push).

- [x] **T03: Integrate BadgeDisplayNative + leaderboard opt-in into ProfileScreen and OtherProfileScreen, verify full compilation** `est:20m`
  - Why: Badges and leaderboard opt-in must appear on profile screens to complete the competitive feature set on mobile. This is the final integration + regression task.
  - Files: `apps/native/src/screens/ProfileScreen.tsx`, `apps/native/src/screens/OtherProfileScreen.tsx`
  - Do: In ProfileScreen: add `setLeaderboardOptIn` mutation import and opt-in toggle (TouchableOpacity switch-style button in Settings section, between unit toggle and rest timer). Add `BadgeDisplayNative` import and render between profile card and Workout Stats section (matching D131 placement). Pass `isOwnProfile={true}`. In OtherProfileScreen: add `BadgeDisplayNative` import and render between profile info card and Workout Stats section. Pass `isOwnProfile={false}` and `userId={profile.userId}`. Run full TypeScript compilation across all 3 packages for regression. Verify all API surfaces are wired.
  - Verify: `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors. `cd apps/web && npx tsc --noEmit` — 0 new errors. `cd apps/native && npx tsc --noEmit` — 0 new errors. `grep "BadgeDisplayNative" apps/native/src/screens/ProfileScreen.tsx` and `grep "BadgeDisplayNative" apps/native/src/screens/OtherProfileScreen.tsx` both return hits. `grep "setLeaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` returns a hit.
  - Done when: BadgeDisplayNative renders on both profile screens, leaderboard opt-in toggle works on own profile, all 3 packages compile clean, and all structural grep checks pass.

## Files Likely Touched

- `apps/native/src/components/competitive/PillSelectorNative.tsx` — New
- `apps/native/src/components/competitive/BadgeDisplayNative.tsx` — New
- `apps/native/src/components/competitive/LeaderboardTableNative.tsx` — New
- `apps/native/src/screens/LeaderboardScreen.tsx` — New
- `apps/native/src/screens/ChallengesScreen.tsx` — New
- `apps/native/src/screens/ChallengeDetailScreen.tsx` — New
- `apps/native/src/navigation/MainTabs.tsx` — Modified (7th Compete tab)
- `apps/native/src/screens/ProfileScreen.tsx` — Modified (badges + opt-in toggle)
- `apps/native/src/screens/OtherProfileScreen.tsx` — Modified (badges)
