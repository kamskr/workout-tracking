---
estimated_steps: 7
estimated_files: 8
---

# T03: Analytics tab with heatmap, volume chart, and summary cards

**Slice:** S04 — Mobile Analytics — Charts, Heatmap & PRs
**Milestone:** M002

## Description

Build the Analytics tab for the mobile app: add a new bottom tab to `MainTabs.tsx`, create `AnalyticsScreen` with a period selector, muscle group heatmap (react-native-svg), volume bar chart (Victory Native XL), and weekly/monthly summary cards. All components self-fetch via `useQuery` from existing S03 Convex queries. The dashboard uses D066 period options (7d/30d/90d/All Time).

## Steps

1. **Create `PeriodSelector` component.** Build a reusable horizontal ScrollView pill selector at `apps/native/src/components/analytics/PeriodSelector.tsx`. Props: `periods: { label, value }[]`, `selected`, `onSelect`. Style as D038 chip pattern using `TouchableOpacity` pills with accent-colored selected state. This component is reused by both the analytics dashboard (T03) and exercise detail screen (T04).

2. **Create `MuscleHeatmapNative` component.** Build at `apps/native/src/components/analytics/MuscleHeatmapNative.tsx`. Import `Svg`, `Path`, `Rect`, `Text as SvgText`, `Defs`, `LinearGradient`, `Stop` from `react-native-svg`. Import shared path data (`MUSCLE_REGIONS`, `BODY_OUTLINE_FRONT`, `BODY_OUTLINE_BACK`, `VIEWBOX`) from `@packages/backend/data/muscle-heatmap-paths`. Import `interpolateHeatmapColor` from `../../lib/colors`. Self-fetch via `useQuery(api.analytics.getVolumeByMuscleGroup, { periodDays })`. Render front and back body views side by side with color-coded muscle regions. Include color legend using `LinearGradient`. Handle loading (ActivityIndicator) and empty states.

3. **Create `VolumeBarChartNative` component.** Build at `apps/native/src/components/analytics/VolumeBarChartNative.tsx`. Self-fetch via `useQuery(api.analytics.getVolumeByMuscleGroup, { periodDays })`. Use Victory Native XL `CartesianChart` + `Bar` for horizontal bar chart showing volume per muscle group. Set explicit height (250px). Use the same per-muscle-group colors as web (`BAR_COLORS` map). Handle loading and empty states.

4. **Create `WeeklySummaryCardNative` component.** Build at `apps/native/src/components/analytics/WeeklySummaryCardNative.tsx`. Self-fetch via `useQuery(api.analytics.getWeeklySummary)`. Display "This Week" heading, stats row (workouts, volume, sets), and top 3 exercises list. Use `formatWeight` from `../../lib/units` for volume display. Style with theme tokens.

5. **Create `MonthlySummaryCardNative` component.** Build at `apps/native/src/components/analytics/MonthlySummaryCardNative.tsx`. Identical structure to weekly card but fetches `getMonthlySummary` and shows "This Month" heading.

6. **Create `AnalyticsScreen` and assemble dashboard.** Build at `apps/native/src/screens/AnalyticsScreen.tsx`. SafeAreaView with ScrollView. Title "Analytics". PeriodSelector at top (7d/30d/90d/All Time per D066, default 30d). Pass `periodDays` to `MuscleHeatmapNative` and `VolumeBarChartNative`. Include `WeeklySummaryCardNative` and `MonthlySummaryCardNative` below (these don't use the period selector — they have fixed 7d/30d windows). Fetch user preferences for `weightUnit` via `useQuery(api.userPreferences.getPreferences)`.

7. **Add Analytics tab to `MainTabs.tsx`.** Create `AnalyticsStack` with `AnalyticsScreen`. Add `Tab.Screen name="Analytics"` to the bottom tab navigator between Templates and Settings. Add icon entry to `TAB_ICONS`: `Analytics: { active: "stats-chart", inactive: "stats-chart-outline" }`. Run typecheck and all backend verification scripts.

## Must-Haves

- [ ] `PeriodSelector` reusable component with horizontal pill ScrollView
- [ ] `MuscleHeatmapNative` rendering shared SVG paths via react-native-svg with `interpolateHeatmapColor`
- [ ] `VolumeBarChartNative` using Victory Native XL `CartesianChart` + `Bar`
- [ ] `WeeklySummaryCardNative` self-fetching weekly summary data
- [ ] `MonthlySummaryCardNative` self-fetching monthly summary data
- [ ] `AnalyticsScreen` assembling all 4 sections with period selector
- [ ] Analytics tab in bottom navigation with `stats-chart` / `stats-chart-outline` icons
- [ ] `pnpm turbo typecheck --force` passes with 0 errors
- [ ] 72/72 backend checks pass

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- All backend verification scripts pass (72/72)
- `grep -r "stats-chart" apps/native/src/navigation/MainTabs.tsx` shows icon config
- `grep -r "getVolumeByMuscleGroup" apps/native/src/components/analytics/` shows query usage
- `grep -r "getWeeklySummary" apps/native/src/components/analytics/` shows query usage
- `grep -r "MUSCLE_REGIONS" apps/native/src/components/analytics/MuscleHeatmapNative.tsx` confirms shared path import

## Observability Impact

- Signals added/changed: 4 new `useQuery` subscriptions (volume by muscle group ×2 for heatmap + chart, weekly summary, monthly summary). Loading states rendered as `ActivityIndicator`. Empty states show descriptive messages.
- How a future agent inspects this: Check `AnalyticsScreen` for component assembly. Check each analytics component for `useQuery` calls. Verify `PeriodSelector` state flows to heatmap and bar chart via `periodDays` prop. Verify theme compliance via `colors` import.
- Failure state exposed: Query loading surfaces as spinner; query failure surfaces via Convex error boundary. react-native-svg render failures surface as React Native error screen. Victory Native XL render failures surface similarly.

## Inputs

- T01 output: `victory-native`, `@shopify/react-native-skia`, `react-native-svg` installed; `interpolateHeatmapColor` in `apps/native/src/lib/colors.ts`
- `packages/backend/data/muscle-heatmap-paths.ts` — shared SVG path data (S03)
- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — web reference implementation
- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx` — web reference implementation
- `apps/web/src/components/analytics/WeeklySummaryCard.tsx` — web reference implementation
- `apps/web/src/components/analytics/MonthlySummaryCard.tsx` — web reference implementation
- `apps/native/src/navigation/MainTabs.tsx` — current 4-tab navigator
- `apps/native/src/lib/theme.ts` — style constants
- `apps/native/src/lib/units.ts` — `formatWeight` utility

## Expected Output

- `apps/native/src/components/analytics/PeriodSelector.tsx` — **new** — reusable period pill selector
- `apps/native/src/components/analytics/MuscleHeatmapNative.tsx` — **new** — react-native-svg heatmap
- `apps/native/src/components/analytics/VolumeBarChartNative.tsx` — **new** — Victory Native XL bar chart
- `apps/native/src/components/analytics/WeeklySummaryCardNative.tsx` — **new** — weekly stats card
- `apps/native/src/components/analytics/MonthlySummaryCardNative.tsx` — **new** — monthly stats card
- `apps/native/src/screens/AnalyticsScreen.tsx` — **new** — analytics dashboard screen
- `apps/native/src/navigation/MainTabs.tsx` — **modified** — Analytics tab added with AnalyticsStack
