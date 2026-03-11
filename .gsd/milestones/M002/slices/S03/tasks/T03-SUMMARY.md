---
id: T03
parent: S03
milestone: M002
provides:
  - /analytics dashboard page assembling heatmap, bar chart, and summary cards with period selector
  - VolumeByMuscleGroupChart self-fetching Recharts horizontal BarChart component
  - WeeklySummaryCard and MonthlySummaryCard self-fetching stat card components
  - /analytics route protected by Clerk middleware
  - Analytics navigation link in WorkoutHistory header
key_files:
  - apps/web/src/app/analytics/page.tsx
  - apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx
  - apps/web/src/components/analytics/WeeklySummaryCard.tsx
  - apps/web/src/components/analytics/MonthlySummaryCard.tsx
  - apps/web/src/middleware.ts
  - apps/web/src/components/workouts/WorkoutHistory.tsx
key_decisions:
  - Defined analytics-specific period selector with 7d/30d/90d/All Time options (different from exercise detail's 30d/90d/6mo/1yr/All Time) since analytics benefits from shorter default windows
  - Bar chart height dynamically scales based on muscle group count (45px per bar + 40px padding) for responsive rendering
  - Summary cards accept weightUnit prop from parent page rather than self-fetching preferences, to avoid redundant queries since the page already fetches preferences
patterns_established:
  - Self-fetching analytics components pattern — each component accepts minimal props, calls useQuery internally, handles loading/empty states with data-analytics-* attributes
  - Dashboard assembly pattern — page owns shared state (periodDays) and preference queries, passes to child components; self-fetching components own their own query subscriptions
observability_surfaces:
  - CSS selectors [data-analytics-barchart], [data-analytics-summary-weekly], [data-analytics-summary-monthly] detect all new dashboard sections
  - Combined with T02's [data-analytics-heatmap], all four dashboard sections are programmatically detectable
  - Empty state renders meaningful guidance text (not blank page) with link to /workouts/active
  - Loading states visually distinct (spinner) from empty states (guidance text)
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Analytics dashboard page with bar chart, summaries & navigation

**Built the /analytics dashboard page wiring MuscleHeatmap, VolumeByMuscleGroupChart, and WeeklySummaryCard/MonthlySummaryCard into a responsive layout with period selector, Clerk protection, and navigation from WorkoutHistory.**

## What Happened

Created three new self-fetching analytics components and assembled them into a dashboard page at `/analytics`:

1. **VolumeByMuscleGroupChart** — Self-fetching Recharts horizontal BarChart that calls `getVolumeByMuscleGroup` with the selected `periodDays`. Each bar is color-coded per muscle group (matching heatmap region semantics). Custom tooltip shows volume and set count. Handles loading spinner and empty state.

2. **WeeklySummaryCard / MonthlySummaryCard** — Self-fetching stat cards calling `getWeeklySummary` / `getMonthlySummary`. Display workout count, total volume (formatted with `formatWeight` using user's preferred unit), total sets, and top 3 exercises ranked by volume. Card styling matches existing patterns (rounded border, shadow-sm, white bg).

3. **Analytics dashboard page** (`/analytics/page.tsx`) — Client component with `useState` for period selection. Layout: back link → page title with period selector → 2-column grid (heatmap left, bar chart right) on desktop → 2-column summary cards below. Period selector controls both heatmap and bar chart (shared state via `useQuery` args). Summary cards are independent (always last 7d/30d). Full empty state when no completed workouts shows guidance text with link to start a workout.

4. **Middleware and navigation** — Added `/analytics(.*)` to Clerk's `isProtectedRoute` matcher. Added "Analytics" outline button to WorkoutHistory header alongside "Templates" and "Start Workout".

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — 11/11 checks pass
- All regression scripts pass:
  - verify-s01-m02: 12/12 ✅
  - verify-s02-m02: 8/8 ✅
  - verify-s02: 15/15 ✅
  - verify-s03: 12/12 ✅
  - verify-s04: 6/6 ✅
  - verify-s05: 8/8 ✅
- **Total: 72/72 backend checks pass**
- `apps/web/src/middleware.ts` contains `/analytics(.*)` in `isProtectedRoute`
- `WorkoutHistory.tsx` contains Analytics link button at `/analytics`

## Diagnostics

- CSS selectors `[data-analytics-heatmap]`, `[data-analytics-barchart]`, `[data-analytics-summary-weekly]`, `[data-analytics-summary-monthly]` detect all dashboard sections
- Page renders at `/analytics` with Convex reactive data — live updates when new workouts are logged
- Empty states render meaningful guidance (not blank page) with actionable link
- Loading states are visually distinct (spinners) from empty states (guidance text with icons)
- Components handle `undefined` (loading) and `[]`/zero (empty) distinctly

## Deviations

None — implementation followed the task plan.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx` — **new** — self-fetching Recharts horizontal BarChart with per-muscle-group colors
- `apps/web/src/components/analytics/WeeklySummaryCard.tsx` — **new** — self-fetching weekly summary stat card
- `apps/web/src/components/analytics/MonthlySummaryCard.tsx` — **new** — self-fetching monthly summary stat card
- `apps/web/src/app/analytics/page.tsx` — **new** — analytics dashboard page assembling all components
- `apps/web/src/middleware.ts` — modified — added `/analytics(.*)` to Clerk protected routes
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — modified — added "Analytics" outline button link to header
