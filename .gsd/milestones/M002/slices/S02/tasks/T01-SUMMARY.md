---
id: T01
parent: S02
milestone: M002
provides:
  - getExerciseProgress query producing time-series chart data
  - estimateOneRepMax exported for reuse
  - testGetExerciseProgress test helper
  - verify-s02-m02.ts verification script (8/8 passing)
key_files:
  - packages/backend/convex/analytics.ts
  - packages/backend/convex/lib/prDetection.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s02-m02.ts
key_decisions:
  - Extracted computeExerciseProgress as a shared function in analytics.ts so both auth-gated query and test helper share identical logic
  - Added testPatchWorkoutCompletedAt helper to enable time-range filter testing by backdating workout completedAt timestamps
patterns_established:
  - Analytics queries follow the same traversal pattern as getPreviousPerformance — workoutExercises → workout → sets
  - computeExerciseProgress accepts db + userId directly, allowing both auth-gated and test-helper callers
observability_surfaces:
  - testGetExerciseProgress query callable via ConvexHttpClient for inspecting raw chart data without auth
  - getExerciseProgress returns empty array (not error) for exercises with no history
  - Convex function errors surface in dashboard function logs with full stack traces
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Backend query + verification script

**Built `getExerciseProgress` Convex query in `analytics.ts` that produces time-series chart data (`{ date, maxWeight, totalVolume, estimated1RM }[]`) for any exercise, with 8/8 verification checks passing.**

## What Happened

1. Exported `estimateOneRepMax` from `prDetection.ts` — changed `function` to `export function`, no logic change.

2. Created `packages/backend/convex/analytics.ts` with `getExerciseProgress` query:
   - Auth-gated via `getUserId(ctx)`
   - Traverses workoutExercises → workout → sets using the same pattern as `getPreviousPerformance`
   - Filters: user-owned, completed, completedAt defined, optional periodDays cutoff
   - Aggregates per session: maxWeight, totalVolume (weight×reps sum), estimated1RM (best Epley)
   - Skips warmup sets and sets without weight/reps
   - Skips sessions with zero qualifying sets
   - Returns sorted by date ascending
   - Core logic extracted into `computeExerciseProgress` for test helper reuse

3. Added `testGetExerciseProgress` and `testPatchWorkoutCompletedAt` to `testing.ts`:
   - `testGetExerciseProgress` calls `computeExerciseProgress` with testUserId
   - `testPatchWorkoutCompletedAt` allows backdating workout completedAt for time-range testing

4. Created `verify-s02-m02.ts` with 8 checks covering data accuracy, warmup exclusion, sorting, time filtering, and empty results.

## Verification

- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — **8/8 pass** (EP-01 through EP-08)
- `pnpm turbo typecheck --force` — **0 errors** across all 3 packages
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — **12/12 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s02.ts` — **15/15 pass** (no regression)

## Diagnostics

- Call `testGetExerciseProgress` via ConvexHttpClient with any exerciseId + testUserId to inspect raw chart data
- Run `verify-s02-m02.ts` to validate full data accuracy end-to-end
- Convex dashboard query tab can run `analytics.getExerciseProgress` directly

## Deviations

- Added `testPatchWorkoutCompletedAt` mutation (not in original plan) — needed to backdate workout timestamps for EP-07 periodDays filter testing, since `testFinishWorkout` always uses `Date.now()`

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/analytics.ts` — **new** — `getExerciseProgress` query + `computeExerciseProgress` shared logic
- `packages/backend/convex/lib/prDetection.ts` — exported `estimateOneRepMax` (was private)
- `packages/backend/convex/testing.ts` — added `testGetExerciseProgress`, `testPatchWorkoutCompletedAt`, import for `computeExerciseProgress`
- `packages/backend/scripts/verify-s02-m02.ts` — **new** — 8-check verification script
