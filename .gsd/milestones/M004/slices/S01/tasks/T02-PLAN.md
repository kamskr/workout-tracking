---
estimated_steps: 5
estimated_files: 3
---

# T02: Leaderboard queries + test helpers + verification script

**Slice:** S01 — Leaderboards — Backend + Web UI
**Milestone:** M004

## Description

Create the auth-gated leaderboard queries/mutations (`getLeaderboard`, `getMyRank`, `setLeaderboardOptIn`, `getLeaderboardExercises`), add comprehensive test helpers to `testing.ts`, extend `testCleanup` for leaderboard entries, and write the 12-check verification script that proves ranking correctness across 5 test users with opt-in filtering, metric accuracy, period filtering, and deletion cascade.

## Steps

1. **Create `packages/backend/convex/leaderboards.ts`** — 4 functions:
   - `getLeaderboard(exerciseId, metric, period, limit?)` — auth-gated query. Uses `.withIndex("by_exerciseId_metric_period_value", q => q.eq("exerciseId", exerciseId).eq("metric", metric).eq("period", period)).order("desc").take(limit * 3)`. Post-filters by joining each entry's userId against profiles table to check `leaderboardOptIn === true`. Returns top `limit` (default 10) entries with profile info (displayName, username). Also returns `totalEntries` (pre-filter count) for diagnostics.
   - `getMyRank(exerciseId, metric, period)` — auth-gated query. Fetches `.withIndex(...).order("desc").take(1000)`, finds caller's entry by userId, returns `{ rank, value, totalScanned }` or `{ rank: null }` if not found or not opted in.
   - `setLeaderboardOptIn(optIn: boolean)` — auth-gated mutation. Queries profile by userId, patches `leaderboardOptIn`. Throws if profile not found.
   - `getLeaderboardExercises()` — auth-gated query. Scans leaderboardEntries to collect distinct exerciseIds (take 500, deduplicate), fetches exercise docs, returns `{ _id, name, primaryMuscleGroup }[]` sorted by name.

2. **Add test helpers to `testing.ts`** — Append under a `// ── Leaderboard test helpers ──` section header:
   - `testSetLeaderboardOptIn(testUserId, optIn)` — mutation that patches profile's leaderboardOptIn field
   - `testGetLeaderboard(exerciseId, metric, period, limit?)` — query mirroring getLeaderboard but without auth
   - `testGetMyRank(testUserId, exerciseId, metric, period)` — query mirroring getMyRank but accepting testUserId
   - `testUpdateLeaderboardEntries(testUserId, workoutId)` — mutation that directly calls `updateLeaderboardEntries` for test setup without going through finishWorkout
   - `testGetLeaderboardExercises()` — query mirroring getLeaderboardExercises without auth

3. **Extend `testCleanup` in `testing.ts`** — Add leaderboardEntries deletion block: query `leaderboardEntries` by `by_userId` index for the testUserId, delete all matching entries. Place after the personalRecords cleanup and before userPreferences cleanup.

4. **Write `packages/backend/scripts/verify-s01-m04.ts`** — Follow the verify-s01-m02.ts pattern exactly (ConvexHttpClient, resolve CONVEX_URL, check() helper, cleanup→setup→checks→cleanup→summary). Use 5 test user IDs (`test-lb-user-1` through `test-lb-user-5`). Setup: create profiles for all 5, opt-in users 1-3, leave users 4-5 not opted in. Create workout + exercises + sets for each user with known weights/reps. Call `testUpdateLeaderboardEntries` for each. Then run 12 checks:
   - LB-01: Entries exist after testUpdateLeaderboardEntries call
   - LB-02: e1RM value matches Epley formula (weight × (1 + reps/30))
   - LB-03: Volume metric excludes warmup sets (compare against manual calc)
   - LB-04: Reps metric = max single-set reps for the exercise
   - LB-05: testGetLeaderboard includes opted-in users (users 1-3)
   - LB-06: testGetLeaderboard excludes non-opted-in users (users 4-5)
   - LB-07: Rankings ordered descending by value
   - LB-08: testGetMyRank returns correct position for user with known rank
   - LB-09: testGetMyRank returns null for non-opted-in user
   - LB-10: Period-filtered leaderboard (7d) shows entries with recent updatedAt
   - LB-11: After testDeleteWorkout, leaderboard entries for that workout are removed
   - LB-12: testGetLeaderboardExercises returns the exercise used in setup

5. **Verify TypeScript compilation** — `cd packages/backend && npx tsc --noEmit` passes with 0 errors.

## Must-Haves

- [ ] `getLeaderboard` query with opt-in post-filtering and profile info enrichment
- [ ] `getMyRank` query with bounded 1000-entry scan and rank computation
- [ ] `setLeaderboardOptIn` mutation patching profiles table
- [ ] `getLeaderboardExercises` query returning distinct exercises with entries
- [ ] 5 test helpers in testing.ts covering all leaderboard functions
- [ ] `testCleanup` extended with leaderboardEntries deletion
- [ ] Verification script with 12 named checks across 5 test users
- [ ] TypeScript compiles with 0 errors

## Verification

- `cd packages/backend && npx tsc --noEmit` passes with 0 errors
- `grep -c "LB-" packages/backend/scripts/verify-s01-m04.ts` shows 12+ checks
- `grep "testSetLeaderboardOptIn\|testGetLeaderboard\|testGetMyRank\|testUpdateLeaderboardEntries\|testGetLeaderboardExercises" packages/backend/convex/testing.ts | wc -l` shows 5+ test helper definitions
- `grep "leaderboardEntries" packages/backend/convex/testing.ts` shows cleanup extension
- `grep "getLeaderboard\|getMyRank\|setLeaderboardOptIn\|getLeaderboardExercises" packages/backend/convex/leaderboards.ts | head -10` shows all 4 functions defined

## Observability Impact

- Signals added/changed: `getLeaderboard` returns `totalEntries` (pre-filter count) alongside filtered results — enables diagnosing opt-in ratio issues without separate queries. `getMyRank` returns `totalScanned` showing how many entries were scanned to find rank.
- How a future agent inspects this: Call `testGetLeaderboard` with known exerciseId to verify entries exist and are correctly ranked. Check verification script output for pass/fail per check.
- Failure state exposed: Verification script prints `❌ FAIL` with detail string for each failing check. Final summary shows pass/fail counts.

## Inputs

- `packages/backend/convex/schema.ts` — leaderboardEntries table + indexes from T01
- `packages/backend/convex/lib/leaderboardCompute.ts` — updateLeaderboardEntries function from T01
- `packages/backend/convex/workouts.ts` — finishWorkout with leaderboard hook, deleteWorkout with cascade from T01
- `packages/backend/convex/testing.ts` — existing 2041-line file with established test helper patterns
- `packages/backend/scripts/verify-s01-m02.ts` — verification script template to follow

## Expected Output

- `packages/backend/convex/leaderboards.ts` — new file with 4 exported functions (~150-200 lines)
- `packages/backend/convex/testing.ts` — extended with ~200 lines of leaderboard test helpers + testCleanup update
- `packages/backend/scripts/verify-s01-m04.ts` — new file with 12-check verification script (~300-400 lines)
