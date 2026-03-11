---
estimated_steps: 5
estimated_files: 4
---

# T01: Backend query + verification script

**Slice:** S02 — Progress Charts Per Exercise
**Milestone:** M002

## Description

Create the `getExerciseProgress` Convex query in `analytics.ts` that traverses the workout graph to produce time-series chart data for any exercise. Export `estimateOneRepMax` from `prDetection.ts` for reuse. Add `testGetExerciseProgress` to `testing.ts`. Write the `verify-s02-m02.ts` verification script with 8 checks proving data accuracy. All checks should pass by the end of this task — the query is fully implemented here, not deferred.

## Steps

1. **Export `estimateOneRepMax` from `prDetection.ts`** — Change the function from private to exported. No logic change, just add `export` keyword. Verify existing imports still work (only internal callers).

2. **Create `packages/backend/convex/analytics.ts`** with `getExerciseProgress` query:
   - Args: `exerciseId: v.id("exercises")`, `periodDays: v.optional(v.number())`
   - Auth-gated via `getUserId(ctx)`
   - Traversal pattern (adapted from `getPreviousPerformance` in `sets.ts`):
     1. Query `workoutExercises` via `by_exerciseId` index
     2. For each, resolve parent workout — filter: `workout.userId === userId`, `workout.status === "completed"`, `workout.completedAt` defined
     3. If `periodDays` provided, filter: `workout.completedAt >= cutoff` where `cutoff = Date.now() - periodDays * 86400000`
     4. For each qualifying workout, collect sets via `by_workoutExerciseId` index
     5. Aggregate per workout session (skip warmup sets, skip sets without weight or reps):
        - `date`: `workout.completedAt`
        - `maxWeight`: max `set.weight` across working sets
        - `totalVolume`: sum of `set.weight × set.reps` across working sets
        - `estimated1RM`: max `estimateOneRepMax(set.weight, set.reps)` across working sets (imported from `prDetection.ts`)
     6. Skip sessions with zero qualifying working sets
     7. Sort by date ascending
     8. Return typed array

3. **Add `testGetExerciseProgress` query to `testing.ts`** — Same logic as `getExerciseProgress` but accepts `testUserId` arg instead of auth. Follows the same test helper pattern as `testGetPreviousPerformance`.

4. **Write `packages/backend/scripts/verify-s02-m02.ts`** — 8-check verification script:
   - Setup: create 3 workouts for the same exercise over time with known set data; create 1 workout for a different exercise; include warmup sets and bodyweight-only sets
   - EP-01: Correct data point count (one per completed workout containing the exercise)
   - EP-02: maxWeight is highest working set weight per session
   - EP-03: totalVolume is sum of weight×reps for working sets per session
   - EP-04: estimated1RM matches Epley for best set in session
   - EP-05: Warmup sets excluded from all metrics
   - EP-06: Data points sorted by date ascending
   - EP-07: periodDays filter returns only recent workouts (create old + new, filter)
   - EP-08: Exercise with no completed workouts returns empty array
   - Cleanup at end using `testCleanup`

5. **Run verification** — Execute the script and confirm 8/8 pass. Run typecheck to confirm 0 errors.

## Must-Haves

- [ ] `estimateOneRepMax` exported from `prDetection.ts` (not duplicated)
- [ ] `getExerciseProgress` auth-gated query in `analytics.ts`
- [ ] Warmup sets excluded from all 3 metrics
- [ ] Sets with missing weight or reps skipped gracefully
- [ ] Sessions with zero qualifying sets excluded from results
- [ ] `periodDays` time-range filter works server-side
- [ ] Results sorted by date ascending
- [ ] `testGetExerciseProgress` test helper in `testing.ts`
- [ ] `verify-s02-m02.ts` with 8 passing checks

## Verification

- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8/8 pass
- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- All M001+S01 verify scripts still pass (spot check: `npx tsx packages/backend/scripts/verify-s01-m02.ts`)

## Observability Impact

- Signals added/changed: `getExerciseProgress` returns empty array for exercises with no history (not an error). Convex function errors surface in dashboard logs with full stack traces.
- How a future agent inspects this: Call `testGetExerciseProgress` via ConvexHttpClient with any exerciseId + testUserId. Run `verify-s02-m02.ts` to validate full data accuracy.
- Failure state exposed: Convex query timeout (10s) or doc read limit (16,384) errors visible in function logs if data scale exceeds expectations.

## Inputs

- `packages/backend/convex/sets.ts` → `getPreviousPerformance` — traversal pattern to adapt
- `packages/backend/convex/lib/prDetection.ts` → `estimateOneRepMax` — 1RM calculation to export
- `packages/backend/convex/testing.ts` → existing test helper patterns
- `packages/backend/scripts/verify-s01-m02.ts` → verification script pattern to follow
- S01-SUMMARY forward intelligence: `by_userId_exerciseId` index on personalRecords, `by_userId_completedAt` on workouts ready for use

## Expected Output

- `packages/backend/convex/analytics.ts` — **new** — `getExerciseProgress` query producing `{ date, maxWeight, totalVolume, estimated1RM }[]`
- `packages/backend/convex/lib/prDetection.ts` — `estimateOneRepMax` now exported
- `packages/backend/convex/testing.ts` — `testGetExerciseProgress` query added
- `packages/backend/scripts/verify-s02-m02.ts` — **new** — 8-check script, all passing
