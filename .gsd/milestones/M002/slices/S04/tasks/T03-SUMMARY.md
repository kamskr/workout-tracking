---
id: T03
parent: S04
milestone: M002
provides:
  - Analytics tab in mobile bottom navigation with heatmap, volume chart, and summary cards
  - PeriodSelector reusable component for 7d/30d/90d/All Time period selection
  - MuscleHeatmapNative using react-native-svg with shared SVG path data
  - VolumeBarChartNative using Victory Native XL CartesianChart + Bar
  - WeeklySummaryCardNative and MonthlySummaryCardNative self-fetching summary cards
key_files:
  - apps/native/src/components/analytics/PeriodSelector.tsx
  - apps/native/src/components/analytics/MuscleHeatmapNative.tsx
  - apps/native/src/components/analytics/VolumeBarChartNative.tsx
  - apps/native/src/components/analytics/WeeklySummaryCardNative.tsx
  - apps/native/src/components/analytics/MonthlySummaryCardNative.tsx
  - apps/native/src/screens/AnalyticsScreen.tsx
  - apps/native/src/navigation/MainTabs.tsx
key_decisions:
  - Used per-bar rendering pattern for Victory Native XL (map individual points to separate Bar components) to achieve per-muscle-group colors, since Bar doesn't support per-item color via Cell like Recharts
  - Used Record<string, unknown> intersection type for chart data to satisfy Victory Native XL's generic constraint on CartesianChart
patterns_established:
  - Native analytics components self-fetch via useQuery — same pattern as web analytics components
  - PeriodSelector pill pattern reusable for any period/filter selection (will be reused in T04 exercise detail)
  - Heatmap shares SVG path data from @packages/backend/data/muscle-heatmap-paths, rendered via react-native-svg instead of DOM svg
observability_surfaces:
  - 4 useQuery subscriptions (getVolumeByMuscleGroup ×2, getWeeklySummary, getMonthlySummary) — loading as ActivityIndicator, empty as descriptive text
  - Victory Native XL render failures surface as React Native error screen with stack traces
  - react-native-svg render failures surface similarly
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Analytics tab with heatmap, volume chart, and summary cards

**Built full Analytics tab for mobile — bottom tab navigation, muscle heatmap (react-native-svg), volume bar chart (Victory Native XL), weekly/monthly summary cards, and period selector — all self-fetching via Convex queries.**

## What Happened

Created 6 new files and modified MainTabs.tsx to add the Analytics tab:

1. **PeriodSelector** — Reusable horizontal ScrollView pill selector with accent-colored selected state. Supports any period options array with `value: number | undefined` (undefined = "All Time").

2. **MuscleHeatmapNative** — Renders front and back body views side by side using react-native-svg, importing shared path data from `@packages/backend/data/muscle-heatmap-paths`. Color-codes muscle regions using `interpolateHeatmapColor` from the ported color utility. Includes LinearGradient color legend.

3. **VolumeBarChartNative** — Uses Victory Native XL `CartesianChart` + `Bar` for a vertical bar chart. Maps each data point to an individual `Bar` component with per-muscle-group colors (same BAR_COLORS as web). Includes formatted axis labels.

4. **WeeklySummaryCardNative** / **MonthlySummaryCardNative** — Self-fetching cards showing workout count, volume, sets, and top 3 exercises. Accept `weightUnit` prop and use `formatWeight` for display.

5. **AnalyticsScreen** — Assembles all components in a ScrollView. PeriodSelector at top controls `periodDays` state (default 30d, per D066). Heatmap and bar chart receive `periodDays`; summary cards have fixed windows. Fetches user preferences for `weightUnit`.

6. **MainTabs.tsx** — Added AnalyticsStack navigator, Analytics tab between Templates and Settings, and `stats-chart` / `stats-chart-outline` icon config.

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages (backend, web, native)
- 72/72 backend checks pass (12+8+11+15+12+6+8)
- `grep -r "stats-chart" apps/native/src/navigation/MainTabs.tsx` — confirms icon config
- `grep -r "getVolumeByMuscleGroup" apps/native/src/components/analytics/` — confirms query usage in heatmap and bar chart
- `grep -r "getWeeklySummary" apps/native/src/components/analytics/` — confirms query usage
- `grep -r "MUSCLE_REGIONS" apps/native/src/components/analytics/MuscleHeatmapNative.tsx` — confirms shared path import

## Diagnostics

- Inspect `AnalyticsScreen` for component assembly and period state flow
- Each analytics component has independent `useQuery` — check individually for data flow
- Victory Native XL chart: if bars don't render, check that `@shopify/react-native-skia` and `react-native-reanimated` are properly linked (T01 verified this)
- react-native-svg heatmap: if paths don't render, check that `react-native-svg` is linked
- Loading states visible as ActivityIndicator in each component; empty states show descriptive messages

## Deviations

- Used `Record<string, unknown> &` intersection type for `ChartDataPoint` to satisfy Victory Native XL's generic constraint (`RawData extends Record<string, unknown>`). This was a TypeScript compatibility requirement not anticipated in the plan.
- Used per-bar rendering pattern (mapping individual points to separate `Bar` components) instead of a single `Bar` with cell-level coloring, since Victory Native XL's `Bar` doesn't support per-item colors like Recharts `Cell`.

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/components/analytics/PeriodSelector.tsx` — **new** — reusable period pill selector
- `apps/native/src/components/analytics/MuscleHeatmapNative.tsx` — **new** — react-native-svg heatmap with shared path data
- `apps/native/src/components/analytics/VolumeBarChartNative.tsx` — **new** — Victory Native XL bar chart with per-muscle colors
- `apps/native/src/components/analytics/WeeklySummaryCardNative.tsx` — **new** — weekly stats card
- `apps/native/src/components/analytics/MonthlySummaryCardNative.tsx` — **new** — monthly stats card
- `apps/native/src/screens/AnalyticsScreen.tsx` — **new** — analytics dashboard screen
- `apps/native/src/navigation/MainTabs.tsx` — **modified** — added Analytics tab with AnalyticsStack and icon config
