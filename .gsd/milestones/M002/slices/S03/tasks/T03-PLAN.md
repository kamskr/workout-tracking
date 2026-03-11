---
estimated_steps: 5
estimated_files: 7
---

# T03: Analytics dashboard page with bar chart, summaries & navigation

**Slice:** S03 — Volume Analytics, Muscle Heatmap & Summaries
**Milestone:** M002

## Description

Closes the slice by assembling all backend queries and UI components into a real user-facing analytics dashboard at `/analytics`. Builds the volume bar chart, weekly/monthly summary cards, the dashboard page layout, Clerk middleware protection, and adds a navigation link from WorkoutHistory. This task wires everything together — backend queries to React components to page layout to navigation.

## Steps

1. **Create `VolumeByMuscleGroupChart` component.**
   - `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx`
   - Self-fetching pattern: accepts `periodDays` prop, calls `useQuery(api.analytics.getVolumeByMuscleGroup, { periodDays })`
   - Renders Recharts horizontal `BarChart` with one bar per muscle group
   - Each bar color-coded to match heatmap region colors (import from `colors.ts` or define bar-specific palette)
   - `XAxis` = muscle group name (formatted: "Full Body" not "fullBody"), `YAxis` = volume (compact number format)
   - Includes `Tooltip` with volume and set count
   - Loading spinner, empty state ("No volume data yet")
   - `data-analytics-barchart` attribute on root container

2. **Create `WeeklySummaryCard` and `MonthlySummaryCard` components.**
   - `apps/web/src/components/analytics/WeeklySummaryCard.tsx`
   - `apps/web/src/components/analytics/MonthlySummaryCard.tsx`
   - Self-fetching: `useQuery(api.analytics.getWeeklySummary)` / `useQuery(api.analytics.getMonthlySummary)`
   - Display: workout count, total volume (formatted with `formatWeight`), total sets, top 3 exercises
   - Card styling: matches existing card patterns (rounded border, shadow-sm, white bg)
   - Loading state, empty state ("No workouts this week/month")
   - `data-analytics-summary-weekly` / `data-analytics-summary-monthly` attributes

3. **Build `/analytics/page.tsx` dashboard page.**
   - `apps/web/src/app/analytics/page.tsx`
   - `"use client"` — needs `useState` for period selection, `useQuery` for data
   - Layout: page title "Analytics", PeriodSelector (reuse pill button pattern from exercise detail page — define inline or extract), then 2-column grid on desktop (heatmap left, bar chart right), summary cards below (2-column grid: weekly left, monthly right)
   - PeriodSelector controls both heatmap and bar chart period (shared state)
   - Summary cards are independent (always show last 7d / last 30d)
   - MuscleHeatmap receives data from `useQuery(api.analytics.getVolumeByMuscleGroup, { periodDays })` — map to `{ muscleGroup, percentage }[]`
   - Empty state: if volume query returns empty array, show "Log your first workout to see analytics" with link to `/workouts/active`
   - Use `formatWeight` from `@/lib/units` for volume display in user's preferred unit
   - Back link to `/workouts` at top of page

4. **Wire middleware and navigation.**
   - Add `/analytics(.*)` to `isProtectedRoute` matcher in `apps/web/src/middleware.ts`
   - Add "Analytics" link button to `WorkoutHistory.tsx` header, alongside "Templates" and "Start Workout"
   - Button style: `variant="outline"` to match Templates button pattern

5. **Run full verification suite.**
   - `pnpm turbo typecheck --force` — 0 errors
   - `npx tsx packages/backend/scripts/verify-s03-m02.ts` — all checks pass
   - Run all regression scripts: verify-s01-m02 (12/12), verify-s02-m02 (8/8), verify-s02 (15/15), verify-s03 (12/12), verify-s04 (6/6), verify-s05 (8/8)

## Must-Haves

- [ ] VolumeByMuscleGroupChart self-fetching with Recharts horizontal BarChart
- [ ] WeeklySummaryCard and MonthlySummaryCard self-fetching with correct display
- [ ] `/analytics` page assembles heatmap, bar chart, and summaries with period selector
- [ ] `/analytics(.*)` added to Clerk middleware protection
- [ ] "Analytics" navigation link added to WorkoutHistory header
- [ ] Empty state with guidance text when no completed workouts
- [ ] Loading states for all self-fetching components
- [ ] `data-analytics-*` attributes on all major containers
- [ ] Full typecheck and verification pass (0 errors, all checks green)

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — all checks pass
- All prior verification scripts pass (no regression)
- `apps/web/src/middleware.ts` contains `/analytics(.*)` in `isProtectedRoute`
- `WorkoutHistory.tsx` contains Analytics link

## Observability Impact

- Signals added/changed: `data-analytics-barchart`, `data-analytics-summary-weekly`, `data-analytics-summary-monthly` attributes for programmatic UI detection. Volume data flows through `useQuery` reactive subscriptions — live updates when new workouts are logged.
- How a future agent inspects this: CSS selectors `[data-analytics-heatmap]`, `[data-analytics-barchart]`, `[data-analytics-summary-weekly]`, `[data-analytics-summary-monthly]` detect all dashboard sections. Page renders at `/analytics` with Convex reactive data.
- Failure state exposed: Empty states render meaningful guidance (not blank page). Loading states are visually distinct (spinners). Components handle `undefined` (loading) and `[]`/`null` (empty) distinctly.

## Inputs

- `packages/backend/convex/analytics.ts` — T01's queries: `getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary`
- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — T02's heatmap component (imports from `@packages/backend/data/muscle-heatmap-paths`)
- `apps/web/src/lib/colors.ts` — T02's color interpolation utility
- `apps/web/src/app/exercises/[id]/page.tsx` — PeriodSelector pattern to reuse
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — self-fetching chart pattern
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — header with Templates/Start Workout buttons
- `apps/web/src/middleware.ts` — Clerk route protection
- `apps/web/src/lib/units.ts` — `formatWeight` for volume display

## Expected Output

- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx` — **new** — self-fetching Recharts bar chart
- `apps/web/src/components/analytics/WeeklySummaryCard.tsx` — **new** — self-fetching weekly summary card
- `apps/web/src/components/analytics/MonthlySummaryCard.tsx` — **new** — self-fetching monthly summary card
- `apps/web/src/app/analytics/page.tsx` — **new** — analytics dashboard page
- `apps/web/src/middleware.ts` — modified — `/analytics(.*)` added to protected routes
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — modified — "Analytics" link added to header
