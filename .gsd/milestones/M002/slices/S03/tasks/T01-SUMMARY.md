---
id: T01
parent: S03
milestone: M002
provides:
  - computeVolumeByMuscleGroup shared function + getVolumeByMuscleGroup auth-gated query
  - computePeriodSummary shared function + getWeeklySummary/getMonthlySummary auth-gated queries
  - testGetVolumeByMuscleGroup, testGetWeeklySummary, testGetMonthlySummary test helpers
  - verify-s03-m02.ts verification script with 11 checks
key_files:
  - packages/backend/convex/analytics.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03-m02.ts
key_decisions:
  - Used Array.from() for Set/Map iteration to avoid downlevelIteration TS errors in web-app tsconfig
patterns_established:
  - computeVolumeByMuscleGroup follows same computeX extraction pattern from S02
  - computePeriodSummary shared between weekly (7d) and monthly (30d) queries
observability_surfaces:
  - testGetVolumeByMuscleGroup, testGetWeeklySummary, testGetMonthlySummary callable via ConvexHttpClient
  - verify-s03-m02.ts is the definitive correctness check (11 checks)
  - Queries return empty arrays/zero totals for users with no data (not errors)
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Backend analytics queries + verification script

**Added volume-by-muscle-group aggregation, weekly/monthly summary queries, test helpers, and 11-check verification script — all passing.**

## What Happened

The analytics queries, test helpers, and verification script were already implemented from a prior session. This task validated them, fixed TypeScript iteration errors, and confirmed all checks pass.

The three compute functions in `analytics.ts`:
- `computeVolumeByMuscleGroup(db, userId, periodDays?)` — traverses completed workouts → workoutExercises → sets, batch-fetches exercises, attributes 100% volume to primary muscle group and 50% to each secondary. Excludes warmup sets, handles bodyweight (set count only).
- `computePeriodSummary(db, userId, periodDays)` — aggregates workoutCount, totalVolume, totalSets, topExercises (top 3 by volume) for a time period.
- Auth-gated queries: `getVolumeByMuscleGroup`, `getWeeklySummary` (7d), `getMonthlySummary` (30d).

Test helpers in `testing.ts`: `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary`.

Fixed TypeScript `downlevelIteration` errors by converting `Set`/`Map` iteration to use `Array.from()` — the web-app tsconfig targets below ES2015 and spread on iterators fails.

## Verification

- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — **11/11 checks pass**:
  - VM-01: Primary volume totals correct (chest=2115, back=3090)
  - VM-02: Secondary muscle groups at 50% (triceps=1057.5, shoulders=1057.5, biceps=1545)
  - VM-03: Warmup sets excluded from volume
  - VM-04: Bodyweight sets: 0 volume, 2 sets counted
  - VM-05: Percentages sum to ~100%
  - VM-06: periodDays=7 filter narrows results correctly
  - VM-07: Weekly summary workoutCount = 2
  - VM-08: Weekly summary totalVolume = 3415
  - VM-09: Monthly summary includes workouts beyond 7 days (3 workouts, 5205 volume)
  - VM-10: topExercises ranked correctly (Row=3090, Bench=2115)
  - VM-11: Empty result for user with no completed workouts
- `pnpm turbo typecheck --force` — **0 errors across all 3 packages**
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — **12/12 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — **8/8 pass** (no regression)

## Diagnostics

- `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary` in testing.ts — callable via ConvexHttpClient for raw data inspection without auth
- `verify-s03-m02.ts` is the definitive correctness check — creates known workout data, asserts exact aggregation results, cleans up
- Queries return empty arrays/zero totals for no-data users (graceful degradation, not errors)

## Deviations

- Fixed Set/Map iteration patterns to use `Array.from()` to resolve TypeScript downlevelIteration errors in web-app package. Not a plan deviation — just a TS compatibility fix discovered during typecheck.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/analytics.ts` — Fixed Set/Map iteration for TS compat; contains computeVolumeByMuscleGroup, computePeriodSummary, and auth-gated queries
- `packages/backend/convex/testing.ts` — Already contained test helpers (no changes needed)
- `packages/backend/scripts/verify-s03-m02.ts` — Already contained 11-check verification script (no changes needed)
