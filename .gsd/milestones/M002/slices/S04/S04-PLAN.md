# S04: Mobile Analytics — Charts, Heatmap & PRs

**Goal:** Port all M002 analytics features to the React Native mobile app — PR badges in active workouts, exercise progress charts, muscle heatmap, volume bar chart, and weekly/monthly summary cards — using Victory Native XL for charts and react-native-svg for the heatmap.

**Demo:** User opens mobile app, sees PR 🏆 badges during an active workout, navigates to an Analytics tab showing a muscle heatmap + volume chart + summary cards, and drills into any exercise from the library to view a progress line chart — all powered by the same Convex backend queries as web.

## Must-Haves

- `victory-native`, `@shopify/react-native-skia`, and `react-native-svg` installed and building without errors
- `react-native-reanimated/plugin` configured in `babel.config.js`
- 🏆 PR badges render in `WorkoutExerciseItem` during active mobile workouts via `useQuery(getWorkoutPRs)`
- Analytics bottom tab added to `MainTabs.tsx` with heatmap, volume bar chart, weekly + monthly summary cards
- `MuscleHeatmapNative` component consumes shared SVG path data from `@packages/backend/data/muscle-heatmap-paths`
- Volume bar chart built with Victory Native XL `CartesianChart` + `Bar`
- Period selector (7d/30d/90d/All Time) controls heatmap and volume chart data
- `ExerciseDetailScreen` accessible from `ExerciseCard` press, showing Victory Native XL progress line chart
- Time period selector on exercise detail (30d/90d/6mo/1yr/All Time)
- `interpolateHeatmapColor` ported to `apps/native/src/lib/colors.ts`
- `pnpm turbo typecheck --force` passes with 0 errors across all 3 packages
- All existing M001 + M002 backend verification scripts pass (72/72 checks, no regression)

## Proof Level

- This slice proves: final-assembly (all M002 analytics features working on both platforms)
- Real runtime required: yes — Victory Native XL + Skia + react-native-svg are native modules requiring runtime verification on a device or simulator
- Human/UAT required: yes — chart rendering quality, heatmap proportions on mobile screen sizes, and touch interactions need visual confirmation

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — 12/12 pass (no regression)
- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8/8 pass (no regression)
- `npx tsx packages/backend/scripts/verify-s03-m02.ts` — 11/11 pass (no regression)
- `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 pass (no regression)
- `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12 pass (no regression)
- `npx tsx packages/backend/scripts/verify-s04.ts` — 6/6 pass (no regression)
- `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8 pass (no regression)
- **Total: 72/72 backend checks must pass**
- Human UAT: verify charts render in Expo dev client / simulator, heatmap is readable, PR badges appear

## Observability / Diagnostics

- Runtime signals: Convex `useQuery` subscriptions for all analytics data — loading states visible as `undefined` before data arrives; error states surfaced via Convex error handling
- Inspection surfaces: All analytics components self-fetch via `useQuery` — data accuracy is independently verifiable via the existing backend test helpers (`testGetExerciseProgress`, `testGetVolumeByMuscleGroup`, etc.) and Convex dashboard
- Failure visibility: Victory Native XL rendering failures surface as React Native red screen errors with stack traces; missing Skia/SVG dependencies surface as Metro bundler build errors; `console.error` logs for PR query failures in `WorkoutExerciseItem`
- Redaction constraints: none — no secrets in analytics components

## Integration Closure

- Upstream surfaces consumed: `api.personalRecords.getWorkoutPRs` (S01), `api.analytics.getExerciseProgress` (S02), `api.analytics.getVolumeByMuscleGroup` / `getWeeklySummary` / `getMonthlySummary` (S03), `@packages/backend/data/muscle-heatmap-paths` (S03), `apps/web/src/lib/colors.ts` interpolation logic (S03)
- New wiring introduced in this slice: Analytics tab in bottom tab navigator, ExerciseDetailScreen in ExercisesStack, ExerciseCard onPress navigation, `workoutId` threaded through WorkoutExerciseItem for PR queries, Victory Native XL + Skia + react-native-svg native dependencies
- What remains before the milestone is truly usable end-to-end: Human UAT verification of chart rendering quality on actual mobile device/simulator. After S04, all M002 success criteria are met programmatically — only visual quality UAT remains.

## Tasks

- [x] **T01: Install Victory Native XL, Skia, and react-native-svg — verify build** `est:25m`
  - Why: Front-loads the highest-risk item (D046, M002 key risk). All subsequent tasks depend on these native dependencies compiling successfully.
  - Files: `apps/native/package.json`, `apps/native/babel.config.js`, `apps/native/app.json`
  - Do: Install `victory-native`, `@shopify/react-native-skia`, `react-native-svg` via `npx expo install`. Add `react-native-reanimated/plugin` as last plugin in babel.config.js. Port `interpolateHeatmapColor` to `apps/native/src/lib/colors.ts`. Run typecheck to verify. If Skia fails, fallback to `react-native-chart-kit`.
  - Verify: `pnpm turbo typecheck --force` passes with 0 errors; all 72/72 backend checks still pass
  - Done when: All 3 native dependencies resolve in TypeScript, babel plugin configured, color utility ported, typecheck clean

- [x] **T02: PR badges in mobile WorkoutExerciseItem** `est:20m`
  - Why: Completes R012 mobile delivery — users see 🏆 badges during active mobile workouts, same as web.
  - Files: `apps/native/src/components/WorkoutExerciseItem.tsx`, `apps/native/src/components/WorkoutExerciseList.tsx`, `apps/native/src/screens/ActiveWorkoutScreen.tsx`
  - Do: Add `workoutId` to `ExerciseItemData.workoutExercise` type. Thread `workoutId` from `ActiveWorkoutScreen` workout details through `WorkoutExerciseList` to `WorkoutExerciseItem`. Add `useQuery(api.personalRecords.getWorkoutPRs)` with client-side `exerciseId` filter (D055). Render amber 🏆 badges matching web design language.
  - Verify: `pnpm turbo typecheck --force` passes; 72/72 backend checks pass
  - Done when: `WorkoutExerciseItem` renders PR badges with reactive Convex subscription, `workoutId` properly threaded through component hierarchy

- [x] **T03: Analytics tab with heatmap, volume chart, and summary cards** `est:35m`
  - Why: Delivers R014 on mobile — analytics dashboard with all 4 sections (heatmap, volume chart, weekly summary, monthly summary) plus period selector.
  - Files: `apps/native/src/navigation/MainTabs.tsx`, `apps/native/src/screens/AnalyticsScreen.tsx`, `apps/native/src/components/analytics/MuscleHeatmapNative.tsx`, `apps/native/src/components/analytics/VolumeBarChartNative.tsx`, `apps/native/src/components/analytics/WeeklySummaryCardNative.tsx`, `apps/native/src/components/analytics/MonthlySummaryCardNative.tsx`, `apps/native/src/components/analytics/PeriodSelector.tsx`
  - Do: Add `AnalyticsStack` with `AnalyticsScreen` to `MainTabs.tsx` using `stats-chart` / `stats-chart-outline` icons. Build `PeriodSelector` as horizontal ScrollView pill buttons (D038, D066 periods: 7d/30d/90d/All Time). Build `MuscleHeatmapNative` using `react-native-svg` `<Svg>/<Path>` consuming shared path data from `@packages/backend/data/muscle-heatmap-paths`. Build `VolumeBarChartNative` using Victory Native XL `CartesianChart` + `Bar` with horizontal layout. Build `WeeklySummaryCardNative` and `MonthlySummaryCardNative` as React Native `View`/`Text` stat cards. All components self-fetch via `useQuery`.
  - Verify: `pnpm turbo typecheck --force` passes; 72/72 backend checks pass
  - Done when: Analytics tab visible in bottom nav, all 4 dashboard sections render with real Convex data, period selector controls heatmap + bar chart

- [x] **T04: Exercise detail screen with progress chart and navigation** `est:30m`
  - Why: Completes R013 on mobile — users drill into any exercise to see progress line chart with time period selector, same data as web.
  - Files: `apps/native/src/screens/ExerciseDetailScreen.tsx`, `apps/native/src/navigation/MainTabs.tsx`, `apps/native/src/components/ExerciseCard.tsx`, `apps/native/src/screens/ExercisesScreen.tsx`, `apps/native/src/components/analytics/ExerciseProgressChartNative.tsx`, `apps/native/src/components/analytics/PeriodSelector.tsx`
  - Do: Add `ExerciseDetailScreen` to `ExercisesStack` navigator. Add `onPress` prop to `ExerciseCard` and wire it in `ExercisesScreen` to navigate with `exerciseId` param. Build `ExerciseProgressChartNative` using Victory Native XL `CartesianChart` + `Line` + `Scatter` with dual Y-axis (weight/1RM left, volume right), explicit 280px height. Include exercise info header (name, muscle group, equipment), PR summary cards (best 1RM, best volume, best reps via `getPersonalRecords`), and time period selector (D048 periods: 30d/90d/6mo/1yr/All Time). Run full typecheck + all backend verification scripts.
  - Verify: `pnpm turbo typecheck --force` passes with 0 errors; all 72/72 backend checks pass; ExerciseCard navigates to detail screen; chart component accepts `exerciseId` and `periodDays` props
  - Done when: Tapping an ExerciseCard navigates to detail screen showing exercise info, PR cards, period selector, and Victory Native XL progress line chart with real Convex data

## Files Likely Touched

- `apps/native/package.json`
- `apps/native/babel.config.js`
- `apps/native/src/lib/colors.ts`
- `apps/native/src/components/WorkoutExerciseItem.tsx`
- `apps/native/src/components/WorkoutExerciseList.tsx`
- `apps/native/src/screens/ActiveWorkoutScreen.tsx`
- `apps/native/src/navigation/MainTabs.tsx`
- `apps/native/src/screens/AnalyticsScreen.tsx`
- `apps/native/src/screens/ExerciseDetailScreen.tsx`
- `apps/native/src/screens/ExercisesScreen.tsx`
- `apps/native/src/components/ExerciseCard.tsx`
- `apps/native/src/components/analytics/MuscleHeatmapNative.tsx`
- `apps/native/src/components/analytics/VolumeBarChartNative.tsx`
- `apps/native/src/components/analytics/WeeklySummaryCardNative.tsx`
- `apps/native/src/components/analytics/MonthlySummaryCardNative.tsx`
- `apps/native/src/components/analytics/PeriodSelector.tsx`
- `apps/native/src/components/analytics/ExerciseProgressChartNative.tsx`
