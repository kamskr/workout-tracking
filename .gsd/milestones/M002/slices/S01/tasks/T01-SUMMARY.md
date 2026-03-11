---
id: T01
parent: S01
milestone: M002
provides:
  - personalRecords table in Convex schema with by_userId_exerciseId and by_workoutId indexes
  - by_userId_completedAt composite index on workouts table (S02/S03 dependency)
  - testGetWorkoutPRs and testGetPersonalRecords query helpers in testing.ts
  - testCleanup cascade-deletes personalRecords for test user
  - verify-s01-m02.ts verification script with 12 checks (3 pass, 9 fail pending T02 PR detection)
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s01-m02.ts
key_decisions:
  - prType validator uses v.union(v.literal("weight"), v.literal("volume"), v.literal("reps")) matching D049
  - testCleanup deletes PRs via both by_workoutId and by_userId_exerciseId sweeps for full coverage
  - Verify script uses separate TEST_USER_ID (test-user-verify-s01-m02) to avoid collisions with M001 scripts
patterns_established:
  - PR test helpers follow same query/mutation pattern as existing workout/template helpers
  - Verify script follows verify-s05.ts pattern exactly (ConvexHttpClient, check(), cleanup)
observability_surfaces:
  - testGetPersonalRecords provides programmatic PR inspection per exercise
  - testGetWorkoutPRs provides programmatic PR inspection per workout
  - personalRecords table inspectable in Convex dashboard
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add personalRecords schema, test helpers, and verification script skeleton

**Added personalRecords table to Convex schema with indexes, extended testing.ts with PR query helpers and cleanup cascade, created verify-s01-m02.ts with 12 checks.**

## What Happened

1. Added `personalRecords` table to `schema.ts` with fields: `userId`, `exerciseId`, `type` (weight/volume/reps), `value`, `setId`, `workoutId`, `achievedAt`. Created `by_userId_exerciseId` compound index and `by_workoutId` index. Also added `prType` validator using `v.union(v.literal(...))` for the three PR types.

2. Added `by_userId_completedAt` composite index to the `workouts` table — this is a roadmap boundary deliverable for S02/S03 analytics queries.

3. Extended `testing.ts` with two new query helpers: `testGetWorkoutPRs` (reads PRs by `by_workoutId` index, joins exercise names) and `testGetPersonalRecords` (reads PRs by `by_userId_exerciseId` index). Updated `testCleanup` to cascade-delete all `personalRecords` for the test user using both the `by_workoutId` sweep (per-workout) and a `by_userId_exerciseId` sweep (catches any orphans).

4. Deployed schema to local Convex dev — all 3 new indexes created successfully.

5. Created `verify-s01-m02.ts` with 12 checks covering all required PR detection scenarios. The script runs end-to-end: 3 checks pass (negative cases — warmup skip, missing weight skip, empty workout PRs), 9 fail as expected since PR detection logic isn't implemented yet.

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- `npx convex dev --once` — schema deployed, 3 new indexes added (personalRecords.by_userId_exerciseId, personalRecords.by_workoutId, workouts.by_userId_completedAt)
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — runs without crashes, 12 checks: 3 pass / 9 fail (expected)
- `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8 pass (no regression)

## Diagnostics

- `testGetPersonalRecords(testUserId, exerciseId)` — query all stored PRs for an exercise
- `testGetWorkoutPRs(testUserId, workoutId)` — query all PRs achieved during a specific workout
- `personalRecords` table is directly queryable in Convex dashboard at http://127.0.0.1:6790

## Deviations

- Script has 12 checks instead of the minimum 10 — added PR-08b (empty workout returns no PRs) and PR-11 (volume covers all session sets) for better coverage.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added `prType` validator, `personalRecords` table with 2 indexes, `by_userId_completedAt` index on `workouts`
- `packages/backend/convex/testing.ts` — Added `testGetWorkoutPRs`, `testGetPersonalRecords` queries; updated `testCleanup` with PR cascade delete
- `packages/backend/scripts/verify-s01-m02.ts` — New verification script with 12 checks for PR detection
