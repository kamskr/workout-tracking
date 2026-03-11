---
estimated_steps: 6
estimated_files: 4
---

# T02: Build LeaderboardScreen + ChallengesScreen + ChallengeDetailScreen and wire CompeteStack tab

**Slice:** S04 — Mobile Competitive Port
**Milestone:** M004

## Description

Build the 3 competitive screens and wire them into the navigation as the 7th "Compete" tab. LeaderboardScreen consumes 4 leaderboard API functions with exercise selector, metric/period pickers, and ranked table. ChallengesScreen consumes `listChallenges` and `createChallenge` with status filter pills and inline create form. ChallengeDetailScreen consumes `getChallengeStandings` with standings FlatList and action buttons. All screens push into a CompeteStack navigator registered as the 7th bottom tab.

## Steps

1. Create `apps/native/src/screens/LeaderboardScreen.tsx` (~350 lines):
   - SafeAreaView with ScrollView layout
   - Exercise selector: `useQuery(api.leaderboards.getLeaderboardExercises)` → horizontal ScrollView of exercise name chips, auto-select first exercise via `useEffect`
   - PillSelectorNative for metric: `[{ label: "Est. 1RM", value: "e1rm" }, { label: "Total Volume", value: "volume" }, { label: "Max Reps", value: "reps" }]`
   - PillSelectorNative for period: `[{ label: "7 Days", value: "7d" }, { label: "30 Days", value: "30d" }, { label: "All Time", value: "allTime" }]`
   - LeaderboardTableNative consuming `useQuery(api.leaderboards.getLeaderboard, selectedExerciseId ? { exerciseId, metric, period: "allTime" } : "skip")` (D085 skip pattern)
   - My Rank callout card: `useQuery(api.leaderboards.getMyRank, selectedExerciseId ? { exerciseId, metric, period: "allTime" } : "skip")` — shows rank/value or "Not ranked" or "Opt in on your profile"
   - Loading/empty states for each section
   - `formatValue(value, metric)` helper: reps → "N reps", others → "N.N kg"
   - Period picker is UI-only (matches web — always passes "allTime" to backend)

2. Create `apps/native/src/screens/ChallengesScreen.tsx` (~400 lines):
   - SafeAreaView + ScrollView with FlatList for challenge cards
   - PillSelectorNative for status: `[{ label: "Active", value: "active" }, { label: "Completed", value: "completed" }, { label: "My Challenges", value: "my" }]`
   - Challenge list: `useQuery(api.challenges.listChallenges, statusArgs)` where "active"→`{ status: "active" }`, "completed"→`{ status: "completed" }`, "my"→`{ myOnly: true }`
   - Challenge card items: title, type badge (color-coded), participant count, time remaining (for active), winner (for completed)
   - Navigation to ChallengeDetailScreen via `navigation.navigate("ChallengeDetail", { challengeId })` on card press
   - "Create Challenge" section (togglable via button):
     - TextInput for title
     - PillSelectorNative for challenge type (Total Reps / Total Volume / Workout Count / Max Weight)
     - Exercise picker: when type ≠ workoutCount, show a "Select Exercise" button that opens the existing `ExercisePicker` modal — but ExercisePicker is coupled to workoutId. Instead, use a simpler approach: `useQuery(api.exercises.listExercises, {})` → ScrollView of exercise name options inside a Modal. Store selected exercise name + ID.
     - TextInput for start date and end date (placeholder "YYYY-MM-DD HH:MM", parse with `new Date()`)
     - Submit button calls `createChallenge` mutation with parsed timestamps
     - Error display via `Alert.alert` on validation/mutation failure
   - `formatTimeRemaining(endAt)` and `formatDate(ts)` helpers (port from web page)

3. Create `apps/native/src/screens/ChallengeDetailScreen.tsx` (~300 lines):
   - Receives `{ challengeId }` via route params
   - `useQuery(api.challenges.getChallengeStandings, { challengeId })` → challenge info + participant standings
   - Challenge info header: title, type badge, status badge, time remaining or completion date
   - Standings FlatList: rank number, display name, username, formatted score, winner crown emoji for #1 in completed challenges
   - Action buttons (conditionally shown):
     - "Join" if user is not a participant and challenge is pending/active → `joinChallenge` mutation
     - "Leave" if user is a participant and not the creator → `leaveChallenge` mutation
     - "Cancel" if user is the creator and challenge is pending/active → `cancelChallenge` mutation with confirmation Alert
   - Current user highlighting in standings (accent background + "You" badge)
   - Loading/error states
   - Back button in header (stack navigation goBack)

4. Modify `apps/native/src/navigation/MainTabs.tsx`:
   - Import all 3 new screens
   - Create `CompeteStackParamList` type: `{ CompeteMain: undefined; Leaderboard: undefined; ChallengeDetail: { challengeId: string } }`
   - Create `CompeteStack` using `createNativeStackNavigator<CompeteStackParamList>()`
   - Create `CompeteTab` function: CompeteStack.Navigator with 3 screens — `CompeteMain` (ChallengesScreen as default landing, higher engagement), `Leaderboard` (LeaderboardScreen), `ChallengeDetail` (ChallengeDetailScreen)
   - Add "Compete" to `TAB_ICONS`: `{ active: "trophy", inactive: "trophy-outline" }`
   - Add 7th `Tab.Screen name="Compete" component={CompeteTab}` after Feed, before Profile
   - Export `CompeteStackParamList` type

5. Add navigation from ChallengesScreen to LeaderboardScreen: a "View Leaderboards" button/link at the top of ChallengesScreen that navigates to the Leaderboard screen in the same stack.

6. Verify compilation and structural checks:
   - `cd apps/native && npx tsc --noEmit` — 0 new errors
   - `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 7
   - `grep -r "api.leaderboards" apps/native/src/screens/LeaderboardScreen.tsx` — shows all 4 calls
   - `grep -r "api.challenges" apps/native/src/screens/ChallengesScreen.tsx` — shows createChallenge, listChallenges
   - `grep -r "api.challenges" apps/native/src/screens/ChallengeDetailScreen.tsx` — shows getChallengeStandings, joinChallenge, leaveChallenge, cancelChallenge

## Must-Haves

- [ ] LeaderboardScreen consumes `getLeaderboard`, `getMyRank`, `getLeaderboardExercises`, and uses PillSelectorNative for metric and period
- [ ] ChallengesScreen consumes `listChallenges` and `createChallenge` with status filter pills and create form
- [ ] ChallengeDetailScreen consumes `getChallengeStandings` with standings and action buttons (join/leave/cancel)
- [ ] CompeteStack registered as 7th tab in MainTabs with trophy icon
- [ ] All screens use D085 conditional query skip pattern
- [ ] Challenge create form validates inputs and calls mutation with parsed timestamps
- [ ] ChallengeDetailScreen navigates back via stack (not tab switch)
- [ ] All screens use D007 theme constants

## Verification

- `cd apps/native && npx tsc --noEmit` — 0 new errors beyond pre-existing TS2307
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 7
- `grep -r "api.leaderboards" apps/native/src/` — shows all 4 leaderboard API calls across screens
- `grep -r "api.challenges" apps/native/src/` — shows all 7 challenge API calls across screens
- `ls apps/native/src/screens/LeaderboardScreen.tsx apps/native/src/screens/ChallengesScreen.tsx apps/native/src/screens/ChallengeDetailScreen.tsx` — all 3 exist

## Observability Impact

- Signals added/changed: Each screen logs mutation failures with `[ScreenName]` prefix to console.error. Challenge actions use `Alert.alert` for user-facing error display.
- How a future agent inspects this: `grep "\[LeaderboardScreen\]\|\[ChallengesScreen\]\|\[ChallengeDetail\]" apps/native/src/screens/` — shows all structured error handling locations.
- Failure state exposed: Loading spinners for undefined query state, empty state messages for no data, Alert.alert for mutation failures.

## Inputs

- `apps/native/src/components/competitive/PillSelectorNative.tsx` — From T01, generic pill selector
- `apps/native/src/components/competitive/LeaderboardTableNative.tsx` — From T01, ranked entry table
- `packages/backend/convex/leaderboards.ts` — 4 API functions: getLeaderboard, getMyRank, setLeaderboardOptIn, getLeaderboardExercises
- `packages/backend/convex/challenges.ts` — 7 API functions: createChallenge, joinChallenge, leaveChallenge, cancelChallenge, getChallengeStandings, listChallenges, getChallenge
- `apps/web/src/app/leaderboards/page.tsx` — Web leaderboard page for UX flow reference
- `apps/web/src/app/challenges/page.tsx` — Web challenges page for UX flow reference
- `apps/native/src/navigation/MainTabs.tsx` — Existing 6-tab navigator to extend
- `apps/native/src/screens/FeedScreen.tsx` — FlatList + query pattern reference

## Expected Output

- `apps/native/src/screens/LeaderboardScreen.tsx` — New: leaderboard screen (~350 lines)
- `apps/native/src/screens/ChallengesScreen.tsx` — New: challenges screen with list + create form (~400 lines)
- `apps/native/src/screens/ChallengeDetailScreen.tsx` — New: challenge detail with standings + actions (~300 lines)
- `apps/native/src/navigation/MainTabs.tsx` — Modified: 7th Compete tab with CompeteStack, CompeteStackParamList export
