---
id: S03
parent: M002
milestone: M002
provides:
  - computeVolumeByMuscleGroup shared function + getVolumeByMuscleGroup auth-gated query
  - computePeriodSummary shared function + getWeeklySummary/getMonthlySummary auth-gated queries
  - testGetVolumeByMuscleGroup, testGetWeeklySummary, testGetMonthlySummary test helpers
  - verify-s03-m02.ts verification script with 11 checks
  - MuscleHeatmap React component with front+back body views and 7 color-coded SVG regions
  - Framework-agnostic SVG path data file (MUSCLE_REGIONS, BODY_OUTLINE_FRONT/BACK, VIEWBOX)
  - interpolateHeatmapColor color utility
  - VolumeByMuscleGroupChart self-fetching Recharts horizontal BarChart
  - WeeklySummaryCard and MonthlySummaryCard self-fetching stat cards
  - /analytics dashboard page with period selector, heatmap, bar chart, and summary cards
  - /analytics route protected by Clerk middleware
  - Analytics navigation link in WorkoutHistory header
requires:
  - slice: S01
    provides: by_userId_completedAt index on workouts table, PR detection patterns, time-range query patterns
  - slice: S02
    provides: computeExerciseProgress pattern in analytics.ts, PeriodSelector pattern, Recharts dependency
affects:
  - S04
key_files:
  - packages/backend/convex/analytics.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03-m02.ts
  - packages/backend/data/muscle-heatmap-paths.ts
  - apps/web/src/components/analytics/MuscleHeatmap.tsx
  - apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx
  - apps/web/src/components/analytics/WeeklySummaryCard.tsx
  - apps/web/src/components/analytics/MonthlySummaryCard.tsx
  - apps/web/src/app/analytics/page.tsx
  - apps/web/src/lib/colors.ts
  - apps/web/src/middleware.ts
  - apps/web/src/components/workouts/WorkoutHistory.tsx
key_decisions:
  - D062: 50% secondary muscle group volume attribution for heatmap
  - D063: SVG path data in packages/backend/data/ for cross-platform sharing
  - D064: data-analytics-* attributes on all dashboard sections
  - D065: computePeriodSummary shared between weekly and monthly queries
  - D066: Analytics dashboard uses 7d/30d/90d/All Time (different from exercise detail's periods)
patterns_established:
  - computeX extraction pattern extended to volume and summary queries
  - Self-fetching analytics components with useQuery, handling loading/empty states
  - Dashboard assembly — page owns shared state (periodDays), passes to child components
  - SVG path data extraction pattern — pure-data TS file consumable by any framework
observability_surfaces:
  - data-analytics-heatmap, data-analytics-barchart, data-analytics-summary-weekly, data-analytics-summary-monthly CSS selectors
  - data-muscle-group attributes on individual SVG path elements
  - testGetVolumeByMuscleGroup, testGetWeeklySummary, testGetMonthlySummary callable via ConvexHttpClient
  - verify-s03-m02.ts is the definitive correctness check (11 checks)
  - Queries return empty arrays/zero totals for no-data users (graceful degradation)
drill_down_paths:
  - .gsd/milestones/M002/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S03/tasks/T03-SUMMARY.md
duration: 42m
verification_result: passed
completed_at: 2026-03-11
---

# S03: Volume Analytics, Muscle Heatmap & Summaries

**Analytics dashboard at `/analytics` with volume-by-muscle-group aggregation, custom SVG muscle heatmap, Recharts bar chart, and weekly/monthly summary cards — all powered by verified Convex backend queries (11/11 checks).**

## What Happened

Three tasks delivered the full slice:

**T01 — Backend queries + verification** added three compute functions to `analytics.ts`: `computeVolumeByMuscleGroup` traverses completed workouts → workoutExercises → sets, batch-fetches exercises into a Map, and attributes 100% volume to primary muscle groups and 50% to each secondary. `computePeriodSummary` aggregates workoutCount, totalVolume, totalSets, and topExercises for a time window. Auth-gated queries wrap these for client use; test helpers expose them without auth for programmatic verification. The 11-check verification script covers primary/secondary attribution accuracy, warmup exclusion, bodyweight handling, time filtering, weekly/monthly totals, top exercises ranking, and empty state. Fixed TypeScript downlevelIteration errors by using `Array.from()` for Set/Map iteration.

**T02 — SVG muscle heatmap** created a framework-agnostic SVG path data file (`packages/backend/data/muscle-heatmap-paths.ts`) with 7 muscle regions across front and back body views. The `MuscleHeatmap` React component renders inline SVG with dynamic fill colors interpolated from light gray (0%) to saturated blue (max%). Includes body outline silhouettes, a color legend, and fullBody/cardio indicator badges. The color utility (`interpolateHeatmapColor`) uses a 5-stop gradient.

**T03 — Dashboard page + navigation** assembled everything into `/analytics`: period selector controlling heatmap and bar chart, 2-column desktop grid (heatmap left, bar chart right), and summary cards below. `VolumeByMuscleGroupChart` self-fetches via `useQuery` and renders a Recharts horizontal BarChart with per-muscle-group colors. `WeeklySummaryCard` and `MonthlySummaryCard` display workout count, total volume, total sets, and top 3 exercises. Middleware updated to protect `/analytics(.*)`. "Analytics" link added to WorkoutHistory header.

## Verification

- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — **11/11 checks pass**
- `pnpm turbo typecheck --force` — **0 errors across all 3 packages**
- All regression scripts pass:
  - verify-s01-m02: 12/12 ✅
  - verify-s02-m02: 8/8 ✅
  - verify-s02: 15/15 ✅
  - verify-s03: 12/12 ✅
  - verify-s04: 6/6 ✅
  - verify-s05: 8/8 ✅
- **Total: 72/72 backend checks pass**
- All `data-analytics-*` attributes present on dashboard sections
- `/analytics(.*)` in Clerk middleware `isProtectedRoute`
- "Analytics" link in WorkoutHistory header

## Requirements Advanced

- R014 (Volume Analytics and Muscle Group Heatmaps) — fully implemented: volume-by-muscle-group aggregation, SVG heatmap, bar chart, weekly/monthly summaries on web

## Requirements Validated

- R014 — 11/11 backend checks prove aggregation accuracy (primary + secondary attribution, warmup exclusion, bodyweight handling, time filtering, summary totals, empty state). Web dashboard renders all 4 sections with real Convex data. Mobile port remains for S04.

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- Analytics dashboard period options (7d/30d/90d/All Time) differ from D048's original spec (30d/90d/6mo/1yr/all-time). Recorded as D066 — dashboard benefits from shorter windows for weekly cadence visibility.

## Known Limitations

- Mobile analytics not yet available — S04 must port heatmap (react-native-svg), charts (Victory Native XL), and summary cards to React Native
- Heatmap visual quality and dashboard layout need human UAT assessment (SVG body proportions, color gradient readability)
- Bar chart shows primary-only muscle group volume (secondary attribution is heatmap-only per D062)

## Follow-ups

- S04: Port all analytics features to mobile — consume shared SVG path data from `packages/backend/data/muscle-heatmap-paths.ts`, implement Victory Native XL charts, render summary cards in React Native
- Human UAT needed for heatmap visual quality (body outline proportions, color gradient readability, responsive layout)

## Files Created/Modified

- `packages/backend/convex/analytics.ts` — added computeVolumeByMuscleGroup, computePeriodSummary, auth-gated queries
- `packages/backend/convex/testing.ts` — added test helpers for volume/weekly/monthly queries
- `packages/backend/scripts/verify-s03-m02.ts` — 11-check verification script
- `packages/backend/data/muscle-heatmap-paths.ts` — framework-agnostic SVG path data (7 regions, body outlines)
- `apps/web/src/lib/colors.ts` — interpolateHeatmapColor gradient utility
- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — SVG heatmap component with front/back views
- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx` — self-fetching Recharts horizontal BarChart
- `apps/web/src/components/analytics/WeeklySummaryCard.tsx` — self-fetching weekly summary card
- `apps/web/src/components/analytics/MonthlySummaryCard.tsx` — self-fetching monthly summary card
- `apps/web/src/app/analytics/page.tsx` — analytics dashboard page
- `apps/web/src/middleware.ts` — added /analytics to Clerk protected routes
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — added Analytics link button

## Forward Intelligence

### What the next slice should know
- SVG path data is at `packages/backend/data/muscle-heatmap-paths.ts` — import from `@packages/backend/data/muscle-heatmap-paths`. It's pure TypeScript, no React/JSX — ready for react-native-svg consumption in S04.
- The data shape contract for all three analytics queries is established and verified. Mobile components should call the same queries and receive the same shapes.
- `interpolateHeatmapColor` in `apps/web/src/lib/colors.ts` is web-specific (returns hex strings) — mobile may need a separate color utility or can reuse hex strings directly with react-native-svg fill.

### What's fragile
- SVG body outline paths are hand-drawn approximations — proportions may look off at extreme aspect ratios or very small screens. Test on mobile screen sizes.
- The `Array.from()` pattern in analytics.ts works around TypeScript downlevelIteration — if tsconfig target changes, this could become unnecessary boilerplate.

### Authoritative diagnostics
- `verify-s03-m02.ts` is the definitive correctness check for all analytics aggregation — 11 checks covering every edge case. Run this first if analytics data looks wrong.
- `data-analytics-*` CSS selectors detect all dashboard sections in the browser for programmatic verification.

### What assumptions changed
- D048 assumed analytics would use the same period options as exercise detail — actual implementation uses shorter windows (7d/30d/90d) for better weekly cadence visibility. Recorded as D066.
