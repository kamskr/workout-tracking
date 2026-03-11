---
id: T04
parent: S04
milestone: M002
provides:
  - ExerciseProgressChartNative component with Victory Native XL line chart (3 metrics)
  - ExerciseDetailScreen with exercise info, PR summary cards, period selector, and progress chart
  - ExerciseDetail screen registered in ExercisesStack navigator
  - ExerciseCard onPress prop wired for drill-down navigation from ExercisesScreen
key_files:
  - apps/native/src/components/analytics/ExerciseProgressChartNative.tsx
  - apps/native/src/screens/ExerciseDetailScreen.tsx
  - apps/native/src/navigation/MainTabs.tsx
  - apps/native/src/components/ExerciseCard.tsx
  - apps/native/src/screens/ExercisesScreen.tsx
key_decisions:
  - Used index-based x-axis for Victory Native XL chart data (even spacing) with date labels mapped via formatXLabel, since Victory Native XL CartesianChart works best with numeric x-keys
  - Used dual y-axis configuration — left axis for maxWeight/estimated1RM, right axis for totalVolume — matching web chart layout
  - Reused PeriodSelector from T03 with D048 periods (30d/90d/6mo/1yr/All Time), default All Time
patterns_established:
  - Native exercise detail screen follows same query-render pattern as web — 3 independent useQuery calls (getExercise, getPersonalRecords, getExerciseProgress) with graceful loading/empty/not-found states
  - Navigation drill-down via onPress prop on list item cards (ExerciseCard → ExerciseDetail) — reusable pattern for any list-to-detail navigation
observability_surfaces:
  - 3 useQuery subscriptions visible in ExerciseDetailScreen (exercise, personalRecords, preferences)
  - 1 useQuery subscription in ExerciseProgressChartNative (getExerciseProgress)
  - Loading states show ActivityIndicator; empty chart shows "Not enough data" message; null exercise shows "not found" screen
duration: 1 step
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T04: Exercise detail screen with progress chart and navigation

**Built mobile exercise detail screen with Victory Native XL progress line chart, PR summary cards, period selector, and drill-down navigation from exercise library.**

## What Happened

Created `ExerciseProgressChartNative` component using Victory Native XL `CartesianChart` with 3 `Line` components (maxWeight in blue, estimated1RM in teal, totalVolume in amber) — matching the web chart's color scheme and metrics. The chart uses dual y-axes (weight/1RM on left, volume on right) and natural curve interpolation.

Created `ExerciseDetailScreen` with: back-button header, exercise info section (name + muscle group/equipment/type badges), PR summary cards row (Best 1RM, Best Volume, Best Reps with formatted values and dates), PeriodSelector reused from T03 with D048 periods, and the ExerciseProgressChartNative. All data is self-fetched via 3 independent Convex `useQuery` calls.

Registered `ExerciseDetail` screen in the `ExercisesStack` navigator in `MainTabs.tsx`. Added `onPress` prop to `ExerciseCard` and wired it in `ExercisesScreen`'s `renderItem` to navigate to `ExerciseDetail` with the exercise ID.

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- All 8 backend verification scripts pass — 72/72 total:
  - verify-s01-m02: 12/12 ✅
  - verify-s02-m02: 8/8 ✅
  - verify-s03-m02: 11/11 ✅
  - verify-s02: 15/15 ✅
  - verify-s03: 12/12 ✅
  - verify-s04: 6/6 ✅
  - verify-s05: 8/8 ✅
- `grep "ExerciseDetail" MainTabs.tsx` confirms screen registration
- `grep "onPress" ExerciseCard.tsx` confirms prop defined and wired
- `grep "getExerciseProgress" ExerciseProgressChartNative.tsx` confirms query usage
- `grep "getPersonalRecords" ExerciseDetailScreen.tsx` confirms PR query

## Diagnostics

- Inspect `ExerciseDetailScreen` for 3 `useQuery` calls: `getExercise`, `getPersonalRecords`, `getPreferences`
- Inspect `ExerciseProgressChartNative` for `useQuery(api.analytics.getExerciseProgress)` call
- Loading state: `exercise === undefined` triggers ActivityIndicator
- Not-found state: `exercise === null` shows "Exercise not found" screen with back navigation
- Chart empty state: `rawData.length < 2` shows "Not enough data yet" message
- Navigation: `ExercisesScreen` → `ExerciseCard` tap → `ExerciseDetail` with `{ exerciseId: item._id }`

## Deviations

None — implementation followed the plan exactly.

## Known Issues

None discovered.

## Files Created/Modified

- `apps/native/src/components/analytics/ExerciseProgressChartNative.tsx` — **new** — Victory Native XL line chart with 3 metrics, dual y-axes, legend, loading/empty states
- `apps/native/src/screens/ExerciseDetailScreen.tsx` — **new** — Exercise detail screen with info header, PR cards, period selector, progress chart
- `apps/native/src/navigation/MainTabs.tsx` — **modified** — Added ExerciseDetailScreen import and screen registration in ExercisesStack
- `apps/native/src/components/ExerciseCard.tsx` — **modified** — Added optional `onPress` prop, wired to TouchableOpacity
- `apps/native/src/screens/ExercisesScreen.tsx` — **modified** — Added navigation hook and wired ExerciseCard onPress to navigate to ExerciseDetail
