---
estimated_steps: 5
estimated_files: 3
---

# T01: Backend analytics queries + verification script

**Slice:** S03 — Volume Analytics, Muscle Heatmap & Summaries
**Milestone:** M002

## Description

Build the three backend analytics queries that power the S03 dashboard: `getVolumeByMuscleGroup`, `getWeeklySummary`, and `getMonthlySummary`. Each follows the established `computeX` extraction pattern from S02 — shared function callable from both an auth-gated Convex query and a test helper. Create test helpers in `testing.ts` and a verification script (`verify-s03-m02.ts`) with ≥10 checks proving aggregation accuracy, edge cases (warmup exclusion, bodyweight handling, secondary muscle groups), time-range filtering, and empty states.

## Steps

1. **Add `computeVolumeByMuscleGroup` to `analytics.ts`.**
   - Args: `db`, `userId`, `periodDays?`
   - Traverse completed workouts using `by_userId_completedAt` index (filter by period cutoff if provided, `.take(500)` guard)
   - For each workout, collect workoutExercises via `by_workoutId`, then sets via `by_workoutExerciseId`
   - Batch-fetch all exercises once into a `Map<Id, Exercise>` at the start (up to 144 exercises)
   - For each working set (skip `isWarmup === true`, skip sets without weight/reps > 0): add `weight × reps` to primary muscle group (100%) and each secondary muscle group (50%)
   - Return `{ muscleGroup: string, totalVolume: number, setCount: number, percentage: number }[]` sorted by volume desc, where percentage = (group volume / total volume) × 100
   - Add auth-gated `getVolumeByMuscleGroup` query wrapping the compute function

2. **Add `computeWeeklySummary` and `computeMonthlySummary` to `analytics.ts`.**
   - Both share a `computePeriodSummary(db, userId, periodDays)` helper
   - Traverse completed workouts in the period → workoutExercises → sets
   - Aggregate: `workoutCount`, `totalVolume` (weight × reps, working sets only), `totalSets` (all non-warmup sets with weight+reps), `topExercises` (top 3 by volume, with exercise name resolved from batch-fetch Map)
   - Weekly = last 7 days, Monthly = last 30 days
   - Add auth-gated `getWeeklySummary` and `getMonthlySummary` queries

3. **Add test helpers to `testing.ts`.**
   - `testGetVolumeByMuscleGroup(testUserId, periodDays?)` — calls `computeVolumeByMuscleGroup`
   - `testGetWeeklySummary(testUserId)` — calls `computePeriodSummary` with 7 days
   - `testGetMonthlySummary(testUserId)` — calls `computePeriodSummary` with 30 days

4. **Create `verify-s03-m02.ts` verification script.**
   - Follow the S02-M02 pattern: ConvexHttpClient, testUserId, setup → checks → cleanup
   - Setup: create 3 completed workouts with known exercises spanning different muscle groups, including warmup sets, bodyweight sets, and exercises with secondary muscle groups. Backdate 1 workout beyond 7 days but within 30 days.
   - Checks (≥10):
     - VM-01: Volume by muscle group returns correct primary volume totals
     - VM-02: Secondary muscle groups attributed at 50%
     - VM-03: Warmup sets excluded from volume
     - VM-04: Bodyweight sets (no weight) excluded from volume but included in set count
     - VM-05: Percentages sum to ~100%
     - VM-06: periodDays filter narrows results correctly
     - VM-07: Weekly summary workoutCount is correct
     - VM-08: Weekly summary totalVolume matches manual calculation
     - VM-09: Monthly summary includes workouts beyond 7 days
     - VM-10: topExercises returns top 3 by volume with correct names
     - VM-11: Empty result for user with no completed workouts

5. **Run verification and typecheck.**
   - `npx tsx packages/backend/scripts/verify-s03-m02.ts` — all checks pass
   - `pnpm turbo typecheck --force` — 0 errors
   - Run prior verify scripts to confirm no regression

## Must-Haves

- [ ] `computeVolumeByMuscleGroup` correctly aggregates volume across workouts → workoutExercises → sets → exercises, with primary (100%) and secondary (50%) attribution
- [ ] `computePeriodSummary` produces accurate workoutCount, totalVolume, totalSets, topExercises
- [ ] Warmup sets and sets without weight/reps are excluded from volume calculations
- [ ] Time period filtering works via `by_userId_completedAt` index with cutoff
- [ ] All ≥10 verification checks pass
- [ ] Typecheck clean across all 3 packages

## Verification

- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — all checks pass
- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — 12/12 (no regression)
- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8/8 (no regression)

## Observability Impact

- Signals added/changed: Three new Convex queries (`getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary`) visible in Convex dashboard function logs with execution time
- How a future agent inspects this: `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary` callable via ConvexHttpClient for raw data inspection. `verify-s03-m02.ts` is the definitive correctness check.
- Failure state exposed: Queries return empty arrays/zero totals for users with no data (not errors). Convex function logs show stack traces on failures.

## Inputs

- `packages/backend/convex/analytics.ts` — existing module with `computeExerciseProgress` pattern to follow
- `packages/backend/convex/testing.ts` — existing test helpers to extend
- `packages/backend/convex/schema.ts` — `by_userId_completedAt` index on workouts, exercises with `primaryMuscleGroup`/`secondaryMuscleGroups`
- `packages/backend/scripts/verify-s02-m02.ts` — script pattern to follow
- S02 forward intelligence: `computeX` extraction pattern, `testPatchWorkoutCompletedAt` for backdating

## Expected Output

- `packages/backend/convex/analytics.ts` — extended with `getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary` queries + shared compute functions
- `packages/backend/convex/testing.ts` — extended with `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary`
- `packages/backend/scripts/verify-s03-m02.ts` — **new** — ≥10-check verification script, all passing
