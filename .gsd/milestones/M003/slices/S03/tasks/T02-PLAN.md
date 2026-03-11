---
estimated_steps: 4
estimated_files: 1
---

# T02: Write and structure verify-s03-m03.ts verification script

**Slice:** S03 — Workout Sharing & Privacy
**Milestone:** M003

## Description

Write the authoritative 15-check verification script that proves the entire privacy and sharing contract. This script is the objective stopping condition for S03 — if all 15 checks pass, the backend contract is proven. Uses 3 test users to exercise multi-user sharing, privacy gating, clone flows, and block filtering.

The script follows the established pattern from `verify-s02-m03.ts`: ConvexHttpClient, check/report helper, cleanup on entry/exit, 3 test user IDs.

## Steps

1. **Set up script scaffolding:** Create `verify-s03-m03.ts` following the established pattern — ConvexHttpClient setup from env/`.env.local`, CheckResult type, check/report helper, results array, 3 test users (USER_A = "test-m03-s03-user-a" as workout author, USER_B = "test-m03-s03-user-b" as follower/cloner, USER_C = "test-m03-s03-user-c" as block target). Cleanup all 3 users on entry and exit.

2. **Write data setup phase:** Create profiles for all 3 users. USER_B follows USER_A. Create a seed exercise for workout creation. Create a public workout for USER_A (with exercise + sets), finish it. Create a private workout for USER_A (with `isPublic: false`, exercise + sets), finish it.

3. **Write 15 checks:**
   - SH-01: After finishing public workout, feed item created with `isPublic: true` — query feedItems by workoutId via testGetFeed
   - SH-02: After finishing private workout, feed item created with `isPublic: false` — verify via testGetFeed that it's excluded from USER_B's feed
   - SH-03: USER_B's feed excludes private workout feed item (already covered by SH-02, verify count)
   - SH-04: USER_B's feed includes public workout feed item — verify presence
   - SH-05: `testShareWorkout` for public workout creates `workout_shared` feedItem, returns feedItemId
   - SH-06: `testGetSharedWorkout` with the share feedItemId returns full workout detail (exercises, sets, author info)
   - SH-07: `testGetSharedWorkout` for private workout's feedItem returns null (privacy rejection)
   - SH-08: `testCloneAsTemplate` by USER_B creates template owned by USER_B with correct exercise count, targetSets/targetReps matching source workout's sets
   - SH-09: `testCloneAsTemplate` for private workout rejects (throws or returns error)
   - SH-10: `testToggleWorkoutPrivacy` flips public workout to private — verify workout.isPublic changed AND feed item isPublic updated
   - SH-11: Profile stats for USER_A with includePrivate=false (via testGetProfileStats) exclude private workout from workoutCount and totalVolume
   - SH-12: Analytics summary for USER_A (via testGetWeeklySummary/testGetMonthlySummary) still includes ALL workouts (private + public)
   - SH-13: USER_A blocks USER_C, then USER_C calls testGetSharedWorkout for USER_A's shared workout — returns null (block filtering)
   - SH-14: testGetSharedWorkout with a fabricated/nonexistent feedItemId returns null gracefully
   - SH-15: Clone preserves exercise order — cloned template exercises match source workout exercise order

4. **Write report and exit:** Print all results, exit with appropriate code.

## Must-Haves

- [ ] 15 checks (SH-01 through SH-15) covering all privacy gates and sharing flows
- [ ] 3 test users with distinct roles
- [ ] Cleanup on entry and exit
- [ ] Script follows established verify-s0N-m03.ts pattern
- [ ] All imports from T01's new test helpers compile
- [ ] Requirement tag: R017

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — script imports compile (sharing module, new test helpers)
- Script has exactly 15 `check(` calls
- Script has cleanup calls for all 3 test users at entry and exit
- Script follows `verify-s02-m03.ts` structural pattern

## Observability Impact

- Signals added/changed: None — this is a verification artifact, not a runtime change
- How a future agent inspects this: Run `npx tsx packages/backend/scripts/verify-s03-m03.ts` — prints PASS/FAIL for each check with detail strings
- Failure state exposed: Each failed check prints the check name, requirement tag, and a descriptive detail message explaining what went wrong

## Inputs

- `packages/backend/convex/sharing.ts` — T01's new sharing module with shareWorkout, getSharedWorkout, etc.
- `packages/backend/convex/testing.ts` — T01's new test helpers (testShareWorkout, testGetSharedWorkout, testCloneAsTemplate, testCreateWorkoutWithPrivacy, testToggleWorkoutPrivacy)
- `packages/backend/convex/_generated/api.d.ts` — Updated with sharing module
- `packages/backend/scripts/verify-s02-m03.ts` — Structural pattern reference (ConvexHttpClient setup, check helper, 3 test users)

## Expected Output

- `packages/backend/scripts/verify-s03-m03.ts` — NEW: 15-check verification script, ~400-500 lines, covering complete privacy and sharing contract for R017
