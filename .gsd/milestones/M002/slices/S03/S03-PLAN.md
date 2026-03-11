# S03: Volume Analytics, Muscle Heatmap & Summaries

**Goal:** Deliver an analytics dashboard on web with volume-by-muscle-group aggregation, a custom SVG muscle heatmap, and weekly/monthly summary cards — all powered by accurate Convex backend queries.
**Demo:** User navigates to `/analytics`, selects a time period, and sees: (1) a muscle group heatmap with color-coded body regions reflecting training volume, (2) a Recharts bar chart showing volume per muscle group, and (3) weekly/monthly summary cards with workout count, total volume, total sets, and top exercises — all matching real logged workout data.

## Must-Haves

- `getVolumeByMuscleGroup(periodDays?)` Convex query returning `{ muscleGroup, totalVolume, setCount, percentage }[]` with correct aggregation across workouts → workoutExercises → sets → exercises, including 50% secondary muscle group attribution for heatmap
- `getWeeklySummary()` and `getMonthlySummary()` Convex queries returning `{ workoutCount, totalVolume, totalSets, topExercises }` with accurate totals
- All three queries follow the `computeX` extraction pattern: shared function callable from auth-gated query and test helper
- Test helpers in `testing.ts`: `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary`
- `verify-s03-m02.ts` verification script with ≥10 checks proving aggregation accuracy, edge cases, and time-range filtering
- Custom SVG muscle heatmap component with 7 body regions (chest, back, shoulders, biceps, triceps, legs, core) plus indicators for fullBody/cardio — SVG path data extracted into a shared data file reusable by mobile in S04
- Recharts horizontal `BarChart` for volume-by-muscle-group breakdown
- `/analytics` route protected by Clerk middleware, with time period selector, heatmap, bar chart, and summary cards
- "Analytics" navigation link added to WorkoutHistory header for discoverability
- Empty state when no completed workouts: shows guidance text with link to start a workout
- Warmup sets excluded from volume calculations (consistent with S01/S02)
- Bodyweight/cardio exercises with no weight contribute to set counts but not weight-based volume

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes — Convex dev backend required for verification script and web UI
- Human/UAT required: yes — SVG heatmap visual quality and dashboard layout need human assessment

## Verification

- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — 10+ checks covering:
  - Volume by muscle group accuracy (primary attribution)
  - Secondary muscle group 50% attribution
  - Weekly summary totals correctness
  - Monthly summary totals correctness
  - Top exercises ranking by volume
  - Warmup set exclusion from volume
  - Bodyweight exercise handling (set count yes, volume no)
  - Time period filtering (periodDays on volume query)
  - Empty result for user with no completed workouts
  - Set count accuracy per muscle group
- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- All prior verification scripts pass (no regression): verify-s01-m02 (12/12), verify-s02-m02 (8/8), verify-s02 (15/15), verify-s03 (12/12), verify-s04 (6/6), verify-s05 (8/8)
- Browser: `/analytics` page renders heatmap SVG, bar chart, and summary cards with `data-analytics-*` attributes for programmatic verification

## Observability / Diagnostics

- Runtime signals: `getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary` return empty arrays/zero totals for users with no data (not errors). Convex function logs capture stack traces on query failures.
- Inspection surfaces: `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary` callable via ConvexHttpClient for inspecting raw aggregation data without auth. `verify-s03-m02.ts` is the definitive correctness check.
- Failure visibility: Volume queries return `[]` (not error) for no-data state. Convex dashboard function logs show query execution time and any errors. `data-analytics-heatmap`, `data-analytics-barchart`, `data-analytics-summary-weekly`, `data-analytics-summary-monthly` attributes on UI containers for programmatic detection.
- Redaction constraints: None — analytics data contains no secrets or PII.

## Integration Closure

- Upstream surfaces consumed: `by_userId_completedAt` index on workouts (S01), `by_workoutId` index on workoutExercises, `by_workoutExerciseId` index on sets, exercises table with `primaryMuscleGroup` and `secondaryMuscleGroups` fields (M001/S01), `computeExerciseProgress` pattern from `analytics.ts` (S02), `PeriodSelector` pattern from `/exercises/[id]` page (S02), Recharts already installed in `apps/web` (S02)
- New wiring introduced in this slice: `/analytics` route wired to Clerk middleware, WorkoutHistory header links to `/analytics`, three new Convex query subscriptions (`useQuery`) in dashboard page/components
- What remains before the milestone is truly usable end-to-end: S04 must port analytics (PR badges, charts, heatmap, summaries) to mobile

## Tasks

- [x] **T01: Backend analytics queries + verification script** `est:45m`
  - Why: Establishes the data layer for all S03 frontend work — three Convex queries with extracted `computeX` functions, test helpers, and a verification script that proves aggregation correctness
  - Files: `packages/backend/convex/analytics.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s03-m02.ts`
  - Do: Add `computeVolumeByMuscleGroup`, `computeWeeklySummary`, `computeMonthlySummary` shared functions and auth-gated queries to `analytics.ts`. Add `testGetVolumeByMuscleGroup`, `testGetWeeklySummary`, `testGetMonthlySummary` test helpers to `testing.ts`. Create `verify-s03-m02.ts` with ≥10 checks covering accuracy, edge cases, secondary attribution, warmup exclusion, bodyweight handling, time filtering, and empty state. Volume by muscle group: traverse completed workouts in period → workoutExercises → sets → batch-fetch all exercises into a Map → aggregate `weight × reps` by primary (100%) and secondary (50%) muscle groups. Warmup sets and sets without weight/reps skip volume. Weekly = last 7 days, monthly = last 30 days.
  - Verify: `npx tsx packages/backend/scripts/verify-s03-m02.ts` — all checks pass. `pnpm turbo typecheck --force` — 0 errors.
  - Done when: All verification checks pass, typecheck clean, no regression on prior scripts

- [x] **T02: SVG muscle heatmap component + shared path data** `est:40m`
  - Why: The heatmap is the novel visual for S03 — must be built before the dashboard page can assemble it. SVG path data must be extracted into a shared file for S04 mobile reuse.
  - Files: `packages/backend/data/muscle-heatmap-paths.ts`, `apps/web/src/components/analytics/MuscleHeatmap.tsx`, `apps/web/src/lib/colors.ts`
  - Do: Create shared SVG path data file with front/back body outline paths for 7 muscle regions (chest, back, shoulders, biceps, triceps, legs, core) plus region IDs. Build `MuscleHeatmap` React component consuming `{ muscleGroup: string, percentage: number }[]` — renders inline SVG with `viewBox`, `preserveAspectRatio="xMidYMid meet"`, dynamic fill colors interpolated from light gray (0%) to saturated color (max%). Add indicators/badges for fullBody and cardio (not body regions). Include `data-analytics-heatmap` attribute. Create color interpolation utility in `colors.ts`.
  - Verify: `pnpm turbo typecheck --force` — 0 errors. Component accepts data prop and renders SVG with addressable regions.
  - Done when: MuscleHeatmap renders a body outline SVG with 7 color-coded regions + 2 indicator badges, SVG paths in a shared data file

- [x] **T03: Analytics dashboard page with bar chart, summaries & navigation** `est:45m`
  - Why: Closes the slice — wires all backend queries and UI components into a real user-facing page with navigation
  - Files: `apps/web/src/app/analytics/page.tsx`, `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx`, `apps/web/src/components/analytics/WeeklySummaryCard.tsx`, `apps/web/src/components/analytics/MonthlySummaryCard.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/components/workouts/WorkoutHistory.tsx`
  - Do: Add `/analytics(.*)` to `isProtectedRoute` in middleware.ts. Create `VolumeByMuscleGroupChart` — self-fetching Recharts horizontal BarChart with `useQuery(getVolumeByMuscleGroup)`. Create `WeeklySummaryCard` and `MonthlySummaryCard` — self-fetching stat cards with `useQuery`. Build `/analytics/page.tsx` with PeriodSelector (reuse pattern from exercise detail page), 2-column grid (MuscleHeatmap left, VolumeByMuscleGroupChart right) on desktop, summary cards below. Handle loading and empty states with `data-analytics-*` attributes. Add "Analytics" link button to WorkoutHistory header alongside "Templates" and "Start Workout". Run full verification: typecheck, verify-s03-m02, all regression scripts.
  - Verify: `pnpm turbo typecheck --force` — 0 errors. All verification scripts pass. `/analytics` is protected by middleware. WorkoutHistory shows Analytics link.
  - Done when: `/analytics` page renders heatmap, bar chart, and summary cards with real Convex data; navigation link in place; all checks pass; typecheck clean

## Files Likely Touched

- `packages/backend/convex/analytics.ts`
- `packages/backend/convex/testing.ts`
- `packages/backend/scripts/verify-s03-m02.ts`
- `packages/backend/data/muscle-heatmap-paths.ts`
- `apps/web/src/components/analytics/MuscleHeatmap.tsx`
- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx`
- `apps/web/src/components/analytics/WeeklySummaryCard.tsx`
- `apps/web/src/components/analytics/MonthlySummaryCard.tsx`
- `apps/web/src/app/analytics/page.tsx`
- `apps/web/src/middleware.ts`
- `apps/web/src/components/workouts/WorkoutHistory.tsx`
- `apps/web/src/lib/colors.ts`
