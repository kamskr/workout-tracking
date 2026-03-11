---
id: S02
parent: M002
milestone: M002
provides:
  - getExerciseProgress Convex query returning time-series chart data per exercise
  - ExerciseProgressChart Recharts component with dual Y-axes (weight/1RM + volume)
  - Exercise detail page at /exercises/[id] with chart, PRs, info, time period selector
  - ExerciseCard navigation link to exercise detail page
  - testGetExerciseProgress test helper for downstream verification
  - verify-s02-m02.ts verification script (8/8 passing)
requires:
  - slice: M002/S01
    provides: estimateOneRepMax in prDetection.ts, personalRecords table + getPersonalRecords query, by_userId_completedAt index on workouts
  - slice: M001/S01
    provides: exercises table with getExercise query, workoutExercises table with by_exerciseId index
  - slice: M001/S02
    provides: workouts table, sets table with by_workoutExerciseId index, formatWeight/displayWeight utilities
affects:
  - M002/S04
key_files:
  - packages/backend/convex/analytics.ts
  - packages/backend/convex/lib/prDetection.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s02-m02.ts
  - apps/web/src/components/exercises/ExerciseProgressChart.tsx
  - apps/web/src/app/exercises/[id]/page.tsx
  - apps/web/src/components/exercises/ExerciseCard.tsx
key_decisions:
  - D058: getExerciseProgress returns { date, maxWeight, totalVolume, estimated1RM? }[] as S02→S04 boundary contract
  - D059: /exercises/[id] dynamic route with ExerciseCard Link wrapper — ExercisePicker unaffected
  - D060: Dual Y-axis chart — left for weight/1RM (kg), right for volume (different magnitude)
  - D061: estimateOneRepMax exported from prDetection.ts for reuse (no duplication)
patterns_established:
  - Analytics queries traverse workoutExercises → workout → sets, same pattern as getPreviousPerformance
  - computeExerciseProgress extracted as shared function for both auth-gated query and test helper
  - Chart components follow self-fetching pattern (D020) with useQuery internally
  - data-exercise-chart attribute on chart containers for programmatic detection (extends D057)
  - Time period selector pattern: pill buttons with PeriodDays state (30|90|180|365|undefined)
observability_surfaces:
  - testGetExerciseProgress query callable via ConvexHttpClient for inspecting raw chart data without auth
  - getExerciseProgress returns empty array (not error) for exercises with no history
  - data-exercise-chart attribute enables programmatic chart presence detection
  - Convex function errors surface in dashboard function logs with full stack traces
drill_down_paths:
  - .gsd/milestones/M002/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S02/tasks/T03-SUMMARY.md
duration: ~35m
verification_result: passed
completed_at: 2026-03-11
---

# S02: Progress Charts Per Exercise

**Users can open any exercise from the library and view a Recharts line chart showing weight, volume, and estimated 1RM progression over time — with accurate data verified by 8/8 backend checks and zero regressions across 61 total checks.**

## What Happened

Built the complete exercise progress analytics pipeline from backend query to interactive chart UI in 3 tasks:

**T01 — Backend query + verification.** Created `getExerciseProgress` in `analytics.ts` that traverses `workoutExercises → workout → sets` to produce time-series data per exercise. Exported `estimateOneRepMax` from `prDetection.ts` for reuse. Added `testGetExerciseProgress` and `testPatchWorkoutCompletedAt` helpers to `testing.ts`. Verification script with 8 checks proves data accuracy (max weight, total volume, estimated 1RM), warmup exclusion, date sorting, time-range filtering, and empty results. All 8/8 pass.

**T02 — Recharts chart component.** Installed `recharts@^3.8.0` in `apps/web` (React 19 compatible). Built `ExerciseProgressChart` as a `"use client"` self-fetching component with 3 lines (max weight, estimated 1RM, total volume), dual Y-axes, custom tooltip, loading spinner, and empty state message. `data-exercise-chart` attribute on all containers for programmatic detection.

**T03 — Exercise detail page + navigation.** Created `/exercises/[id]` page showing exercise info (name, muscle group, equipment, type badges), PR summary cards (best 1RM, best volume, best reps), time period selector (30d/90d/6mo/1yr/All Time pills), and the progress chart. Wrapped `ExerciseCard` in a Next.js `Link` to `/exercises/${exercise._id}`. Confirmed `ExercisePicker` doesn't use `ExerciseCard` — Link addition is safe.

## Verification

- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — **8/8 pass** (EP-01 through EP-08)
- `pnpm turbo typecheck --force` — **0 errors** across all 3 packages
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — **12/12 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s02.ts` — **15/15 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s03.ts` — **12/12 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s04.ts` — **6/6 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s05.ts` — **8/8 pass** (no regression)
- **Total: 61/61 backend checks pass**

## Requirements Advanced

- R013 (Progress Charts Per Exercise) — fully implemented: backend query with time-series data, Recharts chart with 3 metrics, exercise detail page with time period selector, ExerciseCard navigation

## Requirements Validated

- R013 (Progress Charts Per Exercise) — validated by 8/8 backend verification checks proving data accuracy + web UI rendering chart with real data from Convex

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- Added `testPatchWorkoutCompletedAt` mutation (not in original plan) — needed to backdate workout timestamps for EP-07 periodDays filter testing, since `testFinishWorkout` always uses `Date.now()`

## Known Limitations

- Chart only renders on web — mobile port deferred to S04 (Victory Native XL)
- Chart readability at very small viewport widths is untested — Recharts `ResponsiveContainer` handles resizing but axis labels may compress
- No chart data caching — each page visit triggers a fresh Convex query (acceptable at current scale per D043)
- D048 states default period is 90d but implementation defaults to All Time — matches plan's "default All Time per D048" annotation in T03

## Follow-ups

- S04 must consume the same `getExerciseProgress` data shape with Victory Native XL charts on mobile
- S03 will add more queries to `analytics.ts` (volume by muscle group, weekly/monthly summaries) — the module pattern is established

## Files Created/Modified

- `packages/backend/convex/analytics.ts` — **new** — `getExerciseProgress` query + `computeExerciseProgress` shared logic
- `packages/backend/convex/lib/prDetection.ts` — exported `estimateOneRepMax` (was private)
- `packages/backend/convex/testing.ts` — added `testGetExerciseProgress`, `testPatchWorkoutCompletedAt`
- `packages/backend/scripts/verify-s02-m02.ts` — **new** — 8-check verification script
- `apps/web/package.json` — added `recharts: "^3.8.0"` dependency
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — **new** — Recharts chart component
- `apps/web/src/app/exercises/[id]/page.tsx` — **new** — exercise detail page
- `apps/web/src/components/exercises/ExerciseCard.tsx` — added Link wrapper to `/exercises/${exercise._id}`

## Forward Intelligence

### What the next slice should know
- `analytics.ts` is the established module for all analytics queries — S03 should add `getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary` there
- The `computeExerciseProgress` pattern (extracted shared function callable from both auth-gated query and test helper) should be replicated for S03 analytics functions
- Time period selector component pattern (pill buttons with PeriodDays state) is in the exercise detail page — S03's analytics dashboard can reuse the same pattern

### What's fragile
- `ExerciseProgressChart` relies on Recharts 3.x API — if Recharts 4 ships, the `LineChart`/`ResponsiveContainer`/`YAxis` API may change
- The analytics traversal pattern (workoutExercises by_exerciseId → resolve workout → collect sets) scans all historical data per query — acceptable at current scale but monitor if users accumulate hundreds of workouts

### Authoritative diagnostics
- `verify-s02-m02.ts` is the definitive correctness check for exercise progress data — run it against Convex dev backend
- `testGetExerciseProgress` query via ConvexHttpClient provides raw chart data inspection for any exercise

### What assumptions changed
- D048 says default 90d but the plan spec said "default All Time" — implementation follows the plan (All Time default)
- Recharts 3.8.0 works with React 19 out of the box — no compatibility issues encountered
