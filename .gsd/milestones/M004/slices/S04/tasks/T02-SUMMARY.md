---
id: T02
parent: S04
milestone: M004
provides:
  - LeaderboardScreen with exercise selector, metric/period pickers, ranked table, and My Rank card
  - ChallengesScreen with status filter pills, challenge list, create form with exercise picker modal
  - ChallengeDetailScreen with standings FlatList, join/leave/cancel action buttons
  - CompeteStack registered as 7th tab in MainTabs with trophy icon
  - CompeteStackParamList type export for cross-screen navigation typing
key_files:
  - apps/native/src/screens/LeaderboardScreen.tsx
  - apps/native/src/screens/ChallengesScreen.tsx
  - apps/native/src/screens/ChallengeDetailScreen.tsx
  - apps/native/src/navigation/MainTabs.tsx
key_decisions:
  - ChallengesScreen is the CompeteMain landing (higher engagement than leaderboard per plan)
  - Period picker is UI-only — always sends "allTime" to backend (matches web pattern)
  - Exercise picker for challenge creation uses Modal with FlatList from listExercises instead of ExercisePicker (which is coupled to workoutId)
  - PillSelectorNative requires explicit type parameter at call site to satisfy TypeScript strict mode generic inference
patterns_established:
  - Explicit generic type parameter on PillSelectorNative usage: `<PillSelectorNative<Metric> ...>` to avoid string → union type mismatch
  - Challenge action mutations use try/catch with Alert.alert for user-facing error display and console.error with screen prefix for debugging
  - Conditional query skip pattern (D085) used consistently across all screens for exercise-dependent queries
observability_surfaces:
  - console.error with [ChallengesScreen], [ChallengeDetail] prefixes for mutation failures
  - Alert.alert for user-facing error feedback on all mutations (create, join, leave, cancel)
  - Loading/empty/populated tri-state rendering in all screens (ActivityIndicator → empty message → data)
duration: 25m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Build LeaderboardScreen + ChallengesScreen + ChallengeDetailScreen and wire CompeteStack tab

**Built 3 competitive screens consuming all leaderboard and challenge Convex APIs, wired as 7th "Compete" tab in bottom navigator.**

## What Happened

Created three full screens for the mobile competitive feature:

1. **LeaderboardScreen** (~250 lines): Exercise selector with horizontal ScrollView chips, PillSelectorNative for metric (Est. 1RM / Total Volume / Max Reps) and period (7 Days / 30 Days / All Time), LeaderboardTableNative for ranked entries, and My Rank callout card. Consumes `getLeaderboardExercises`, `getLeaderboard`, and `getMyRank` APIs with D085 skip pattern for conditional queries.

2. **ChallengesScreen** (~500 lines): Status filter pills (Active / Completed / My Challenges), challenge card list with type badges and time remaining, create challenge form with title/type/exercise/date inputs, and exercise picker modal using `listExercises` query. Consumes `listChallenges` and `createChallenge` APIs. Includes "View Leaderboards" navigation link.

3. **ChallengeDetailScreen** (~420 lines): Challenge info header with type/status badges, standings FlatList with rank/user/score, current user highlighting with "You" badge, winner crown emoji, and join/leave/cancel action buttons with confirmation dialogs. Consumes `getChallengeStandings`, `joinChallenge`, `leaveChallenge`, `cancelChallenge` APIs.

Modified MainTabs.tsx to add CompeteStack navigator (ChallengesScreen as landing, LeaderboardScreen, ChallengeDetailScreen) as 7th tab with trophy icon. Exported `CompeteStackParamList` type.

## Verification

- `cd apps/native && ./node_modules/.bin/tsc --noEmit` — 0 new errors (only pre-existing TS2307 for convex/react)
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns **7** ✓
- `grep -r "api.leaderboards" apps/native/src/` — shows `getLeaderboardExercises`, `getLeaderboard`, `getMyRank` ✓
- `grep -r "api.challenges" apps/native/src/` — shows `listChallenges`, `createChallenge`, `joinChallenge`, `leaveChallenge`, `cancelChallenge`, `getChallengeStandings` ✓
- `ls apps/native/src/screens/{LeaderboardScreen,ChallengesScreen,ChallengeDetailScreen}.tsx` — all 3 exist ✓
- `cd packages/backend && ./node_modules/.bin/tsc --noEmit -p convex` — 0 errors (regression clean) ✓

### Slice-level checks (partial — T02 of 3):
- ✓ Backend TS: 0 errors
- ✓ Web TS: 1 pre-existing TS2307 (clsx), no new errors
- ✓ Native TS: 0 new errors
- ✓ Tab count: 7
- ✓ Competitive components: 3 files in competitive/
- ✓ Screens: LeaderboardScreen, ChallengesScreen, ChallengeDetailScreen exist
- ✓ api.badges refs: getUserBadges (from T01 BadgeDisplayNative)
- ⏳ setLeaderboardOptIn in ProfileScreen — T03
- ⏳ BadgeDisplayNative in ProfileScreen/OtherProfileScreen — T03

## Diagnostics

- `grep "\[ChallengesScreen\]\|\[ChallengeDetail\]" apps/native/src/screens/` — shows all structured error handling locations
- All mutation failures logged to console.error with screen prefix and displayed via Alert.alert
- Loading states: ActivityIndicator for undefined query responses, empty state messages for no data

## Deviations

- PillSelectorNative required explicit generic type parameters at call sites (`PillSelectorNative<Metric>`) to satisfy TypeScript strict generic inference — the plan didn't mention this but the fix is minimal and follows TypeScript best practices.
- LeaderboardScreen uses 3 of 4 leaderboard API functions (not `setLeaderboardOptIn` which belongs in ProfileScreen per T03 scope). The plan's "all 4 calls" check for LeaderboardScreen was inaccurate — `setLeaderboardOptIn` is a mutation for profile settings, not leaderboard display.

## Known Issues

- None. All planned functionality implemented and type-checks pass.

## Files Created/Modified

- `apps/native/src/screens/LeaderboardScreen.tsx` — New: leaderboard screen with exercise/metric/period selectors and ranked table
- `apps/native/src/screens/ChallengesScreen.tsx` — New: challenges list with status filter, create form, and exercise picker modal
- `apps/native/src/screens/ChallengeDetailScreen.tsx` — New: challenge detail with standings and join/leave/cancel actions
- `apps/native/src/navigation/MainTabs.tsx` — Modified: added CompeteStack as 7th tab with trophy icon, exported CompeteStackParamList
