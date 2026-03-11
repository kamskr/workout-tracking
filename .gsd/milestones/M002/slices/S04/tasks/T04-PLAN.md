---
estimated_steps: 5
estimated_files: 5
---

# T04: Exercise detail screen with progress chart and navigation

**Slice:** S04 — Mobile Analytics — Charts, Heatmap & PRs
**Milestone:** M002

## Description

Add an exercise detail screen to the mobile app with a Victory Native XL progress line chart, PR summary cards, exercise info header, and time period selector. Wire `ExerciseCard` navigation so tapping an exercise in the library drills into this detail screen. This completes R013 (Progress Charts Per Exercise) on mobile — same data shape and query as web, different chart library.

## Steps

1. **Create `ExerciseProgressChartNative` component.** Build at `apps/native/src/components/analytics/ExerciseProgressChartNative.tsx`. Props: `exerciseId: Id<"exercises">`, `periodDays?: number`. Self-fetch via `useQuery(api.analytics.getExerciseProgress, { exerciseId, periodDays })`. Use Victory Native XL `CartesianChart` with `Line` components for 3 metrics: maxWeight (blue), estimated1RM (teal), totalVolume (amber). Set explicit height of 280px in parent View. Format X-axis dates with `toLocaleDateString`. Handle loading (ActivityIndicator) and empty (<2 data points) states. Use `displayWeight` from `../../lib/units` for Y-axis labels.

2. **Create `ExerciseDetailScreen`.** Build at `apps/native/src/screens/ExerciseDetailScreen.tsx`. Accept `exerciseId` route param. Fetch exercise info via `useQuery(api.exercises.getExercise, { id: exerciseId })`. Fetch personal records via `useQuery(api.personalRecords.getPersonalRecords, { exerciseId })`. Layout as ScrollView with: exercise info header (name, muscle group, equipment, type badges), PR summary cards row (Best 1RM, Best Volume, Best Reps — styled like web's detail page), PeriodSelector (D048 periods: 30d/90d/6mo/1yr/All Time, default All Time), and `ExerciseProgressChartNative`. Fetch user preferences for unit display.

3. **Add `ExerciseDetailScreen` to `ExercisesStack` navigator.** In `MainTabs.tsx`, add `<ExercisesStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />` to the `ExercisesTab` stack. Define the route param type for `exerciseId: string`.

4. **Wire `ExerciseCard` navigation.** Add `onPress?: () => void` prop to `ExerciseCard`. In `ExercisesScreen`, pass `onPress` in the `renderItem` callback to navigate to `ExerciseDetail` with `{ exerciseId: item._id }`. The `ExerciseCard`'s `TouchableOpacity` already exists — wire its `onPress` to the prop.

5. **Final verification.** Run `pnpm turbo typecheck --force` — 0 errors across all 3 packages. Run all 8 backend verification scripts — confirm 72/72 pass. Confirm the navigation chain: ExercisesScreen → ExerciseCard tap → ExerciseDetailScreen with chart. Confirm `PeriodSelector` (from T03) is reused for exercise detail period selection.

## Must-Haves

- [ ] `ExerciseProgressChartNative` using Victory Native XL `CartesianChart` + `Line` with 3 metrics
- [ ] `ExerciseDetailScreen` with exercise info, PR summary cards, period selector, progress chart
- [ ] `ExerciseDetailScreen` registered in `ExercisesStack` navigator
- [ ] `ExerciseCard` `onPress` prop wired for navigation from `ExercisesScreen`
- [ ] `PeriodSelector` reused from T03 with D048 periods (30d/90d/6mo/1yr/All Time)
- [ ] `pnpm turbo typecheck --force` passes with 0 errors
- [ ] 72/72 backend checks pass (no regression)

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- All 8 backend verification scripts pass — total 72/72
- `grep "ExerciseDetail" apps/native/src/navigation/MainTabs.tsx` shows screen registration
- `grep "onPress" apps/native/src/components/ExerciseCard.tsx` shows prop defined
- `grep "getExerciseProgress" apps/native/src/components/analytics/ExerciseProgressChartNative.tsx` shows query usage
- `grep "getPersonalRecords" apps/native/src/screens/ExerciseDetailScreen.tsx` shows PR query

## Observability Impact

- Signals added/changed: 3 new `useQuery` subscriptions per exercise detail view (exercise info, personal records, exercise progress). These are the same Convex queries used by web — no new backend surfaces.
- How a future agent inspects this: Check `ExerciseDetailScreen` for query calls and data rendering. Check `ExercisesStack` navigator for route registration. Check `ExerciseCard` for `onPress` prop.
- Failure state exposed: Navigation failure surfaces as React Navigation error. Query loading shows ActivityIndicator. Chart empty state shows "Not enough data" message for <2 data points.

## Inputs

- T01 output: `victory-native` and `@shopify/react-native-skia` installed and compiling
- T03 output: `PeriodSelector` component at `apps/native/src/components/analytics/PeriodSelector.tsx`
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — web reference implementation (Recharts)
- `apps/web/src/app/exercises/[id]/page.tsx` — web exercise detail page (layout reference)
- `apps/native/src/navigation/MainTabs.tsx` — ExercisesStack for screen registration (modified in T03)
- `apps/native/src/components/ExerciseCard.tsx` — needs `onPress` prop
- `apps/native/src/screens/ExercisesScreen.tsx` — needs navigation wiring in `renderItem`
- S02 Summary — `getExerciseProgress` returns `{ date, maxWeight, totalVolume, estimated1RM? }[]`
- S01 Summary — `getPersonalRecords(exerciseId)` returns PR records

## Expected Output

- `apps/native/src/components/analytics/ExerciseProgressChartNative.tsx` — **new** — Victory Native XL line chart
- `apps/native/src/screens/ExerciseDetailScreen.tsx` — **new** — exercise detail with chart + PRs + info
- `apps/native/src/navigation/MainTabs.tsx` — **modified** — ExerciseDetail screen added to ExercisesStack
- `apps/native/src/components/ExerciseCard.tsx` — **modified** — `onPress` prop added
- `apps/native/src/screens/ExercisesScreen.tsx` — **modified** — navigation wiring in renderItem
- Clean typecheck across all 3 packages, 72/72 backend checks pass
