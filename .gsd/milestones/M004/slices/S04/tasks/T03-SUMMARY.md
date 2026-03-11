---
id: T03
parent: S04
milestone: M004
provides:
  - BadgeDisplayNative integrated into ProfileScreen with isOwnProfile=true
  - BadgeDisplayNative integrated into OtherProfileScreen with isOwnProfile=false
  - Leaderboard opt-in toggle in ProfileScreen Settings calling setLeaderboardOptIn mutation
  - Full S04 slice complete — all competitive features ported to mobile at TypeScript level
key_files:
  - apps/native/src/screens/ProfileScreen.tsx
  - apps/native/src/screens/OtherProfileScreen.tsx
key_decisions:
  - Leaderboard opt-in toggle uses optional props on SettingsSection so it only renders when profile exists (no toggle on setup prompt view or OtherProfileScreen)
  - Opted-in state uses accent-filled button, opt-in state uses accent-outlined button (matching web pattern)
patterns_established:
  - Optional competitive feature props on SettingsSection — pass leaderboardOptIn + handler only from profile-exists branch
observability_surfaces:
  - "[ProfileScreen] setLeaderboardOptIn failed:" console.error on opt-in mutation failure
  - BadgeDisplayNative handles its own loading/error/empty states internally via useQuery
duration: 8min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Integrate BadgeDisplayNative + leaderboard opt-in into ProfileScreen and OtherProfileScreen, verify full compilation

**Integrated BadgeDisplayNative badge grid and leaderboard opt-in toggle into both profile screens, completing the S04 mobile competitive feature port with zero TypeScript regressions.**

## What Happened

Added BadgeDisplayNative component (from T01) to both ProfileScreen and OtherProfileScreen, placed between the profile card and Workout Stats section per D131 layout. On ProfileScreen, added a leaderboard opt-in toggle in the Settings section between the weight unit toggle and default rest timer. The toggle calls `api.leaderboards.setLeaderboardOptIn` mutation with error logging. OtherProfileScreen gets badges only — no opt-in toggle (own profile only). The SettingsSection component was extended with optional `leaderboardOptIn` and `onLeaderboardOptInToggle` props so the toggle only renders when a profile exists.

## Verification

All checks passed:

**TypeScript compilation (0 new errors across all 3 packages):**
- `cd packages/backend && ./node_modules/.bin/tsc --noEmit -p convex` — 0 errors ✅
- `cd apps/web && ./node_modules/.bin/tsc --noEmit` — only pre-existing clsx TS2307 ✅
- `cd apps/native && ./node_modules/.bin/tsc --noEmit` — only pre-existing convex/react TS2307 (30 instances) ✅

**Structural grep checks:**
- `grep "BadgeDisplayNative" apps/native/src/screens/ProfileScreen.tsx` — hit (import + usage) ✅
- `grep "BadgeDisplayNative" apps/native/src/screens/OtherProfileScreen.tsx` — hit (import + usage) ✅
- `grep "setLeaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` — hit (mutation + call + error log) ✅
- `grep -r "api.badges" apps/native/src/` — getUserBadges consumed ✅
- `grep -r "api.leaderboards" apps/native/src/` — all 4 APIs consumed (getLeaderboard, getMyRank, getLeaderboardExercises, setLeaderboardOptIn) ✅
- `grep -r "api.challenges" apps/native/src/` — 6 user-facing APIs consumed ✅
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 7 ✅

**Slice-level verification (all passing — final task):**
- 3 competitive components exist in `apps/native/src/components/competitive/` ✅
- 3 competitive screens exist (`LeaderboardScreen`, `ChallengesScreen`, `ChallengeDetailScreen`) ✅
- ProfileScreen imports BadgeDisplayNative and uses setLeaderboardOptIn ✅
- OtherProfileScreen imports BadgeDisplayNative ✅

## Diagnostics

- `grep "leaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` — confirms opt-in toggle wired
- `grep "BadgeDisplayNative" apps/native/src/screens/` — confirms badge grid on both profile screens
- Opt-in mutation failures logged via `console.error("[ProfileScreen] setLeaderboardOptIn failed:", err)` — visible in Expo dev console
- BadgeDisplayNative manages its own data fetching, loading, and empty states internally

## Deviations

- Plan stated "7 challenge APIs consumed" but only 6 user-facing challenge APIs are used — `getChallenge` is not consumed because ChallengeDetailScreen receives challenge data via navigation route params instead of querying separately. The 3 remaining exports (`completeChallenge`, `activateChallenge`, `checkDeadlines`) are internal mutations not meant for client use. All user-facing functionality is fully covered.

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/screens/ProfileScreen.tsx` — Added BadgeDisplayNative import + badges section, setLeaderboardOptIn mutation + toggle in SettingsSection, optional leaderboard opt-in props on SettingsSection, opt-in outline button styles (~35 lines added)
- `apps/native/src/screens/OtherProfileScreen.tsx` — Added BadgeDisplayNative import + badges section between profile card and Workout Stats (~8 lines added)
