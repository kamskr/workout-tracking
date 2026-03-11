# S04: Mobile Analytics — Charts, Heatmap & PRs — Research

**Date:** 2026-03-11

## Summary

S04 ports all analytics features from web to mobile: PR badges in the active workout, exercise progress charts, muscle group heatmap, volume bar chart, and weekly/monthly summary cards. The backend queries are already built and verified (S01–S03) — this slice is purely mobile UI work. The core technical challenge is installing Victory Native XL + `@shopify/react-native-skia` for charts, and `react-native-svg` for the heatmap — three native dependencies that must coexist with Expo 54 / React Native 0.82.1 / New Architecture (enabled in `app.json`).

The mobile app currently has no analytics tab, no exercise detail screen, and no PR badge rendering. The `WorkoutExerciseItem` native component lacks `workoutId` in its type interface (unlike the web version which added it in S01/T03), so PR query integration requires a type change. The navigation structure (`MainTabs.tsx`) uses bottom tabs with nested stacks — an Analytics tab needs to be added. The exercise library (`ExercisesScreen`) currently just lists exercises with no drill-down to a detail/chart view.

The recommended approach is: (1) install `victory-native`, `@shopify/react-native-skia`, and `react-native-svg` as the first task with build verification, (2) add PR badges to `WorkoutExerciseItem` by threading `workoutId` through the component hierarchy, (3) build the analytics tab with heatmap (react-native-svg consuming the shared path data), summary cards, and volume chart, (4) add exercise detail screen with Victory Native XL line chart accessible from ExerciseCard navigation. This order front-loads the highest-risk item (native dependency installation) and makes each subsequent task buildable.

## Recommendation

**Approach: Four tasks — dependency install, PR badges, analytics tab, exercise detail charts.**

1. **T01 — Install dependencies + verify build.** Install `victory-native`, `@shopify/react-native-skia`, and `react-native-svg` into `apps/native`. Add `react-native-reanimated/plugin` to `babel.config.js` (required by Victory Native XL — currently missing despite reanimated already being a dependency). Run `pnpm turbo typecheck --force` to verify. This retires the highest-risk item (Victory Native XL + Skia on Expo 54). If Skia fails, fallback to `react-native-chart-kit`.

2. **T02 — PR badges in mobile WorkoutExerciseItem.** Add `workoutId` to the `ExerciseItemData` type. Thread it from `ActiveWorkoutScreen` → `WorkoutExerciseList` → `WorkoutExerciseItem`. Add `useQuery(api.personalRecords.getWorkoutPRs)` subscription with client-side `exerciseId` filter (same pattern as web D055). Render 🏆 badges with amber styling matching the web design language.

3. **T03 — Analytics tab with heatmap + summary cards.** Add "Analytics" bottom tab to `MainTabs.tsx` with `analytics` Ionicons icon. Build `AnalyticsScreen` with: period selector (horizontal pill ScrollView, D038 chip pattern), `MuscleHeatmapNative` component consuming shared SVG paths from `@packages/backend/data/muscle-heatmap-paths` via `react-native-svg`, `VolumeBarChartNative` using Victory Native XL horizontal Bar chart, `WeeklySummaryCardNative` and `MonthlySummaryCardNative` stat cards. All components self-fetch via `useQuery`.

4. **T04 — Exercise detail screen with progress chart.** Add `ExerciseDetailScreen` to `ExercisesStack` navigator. Make `ExerciseCard` navigate to detail on press. Build `ExerciseProgressChartNative` using Victory Native XL `CartesianChart` + `Line` + `Scatter` with the same data shape from `getExerciseProgress`. Include time period selector, PR summary cards, and exercise info header. Run typecheck + all backend verification scripts to confirm no regressions.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Mobile line/bar charts | Victory Native XL (`victory-native`) + `@shopify/react-native-skia` | Purpose-built for RN with Skia rendering. High-performance, animated. Project already has `react-native-reanimated` (4.1.5) and `react-native-gesture-handler` (2.29.1). D046 decision. |
| Mobile SVG rendering (heatmap) | `react-native-svg` | Required for rendering the shared SVG path data from `muscle-heatmap-paths.ts`. D047 reverses D042's avoidance — heatmap with 9 regions justifies the dependency. |
| Heatmap color interpolation | Port `interpolateHeatmapColor` from web `colors.ts` | Same gradient stops (gray→blue 5-stop). Function is pure math (no DOM) — can be copied directly to native `lib/colors.ts`. |
| Analytics data queries | Existing `analytics.ts` queries (S02+S03) | `getExerciseProgress`, `getVolumeByMuscleGroup`, `getWeeklySummary`, `getMonthlySummary` — all auth-gated and verified. Mobile just calls them via `useQuery`. |
| PR queries | Existing `personalRecords.ts` queries (S01) | `getWorkoutPRs` and `getPersonalRecords` — same reactive subscription pattern as web. |
| Weight formatting | Existing `apps/native/src/lib/units.ts` | Already copied from web (D041). Has `formatWeight`, `displayWeight` used by chart labels. |

## Existing Code and Patterns

- `apps/native/src/components/WorkoutExerciseItem.tsx` — **Must modify.** Missing `workoutId` in its `ExerciseItemData.workoutExercise` type (web version has it since S01/T03). The data actually contains `workoutId` (returned by `getWorkoutWithDetails`), but the interface only declares a subset. Need to add `workoutId: Id<"workouts">` to the type and add PR query + badge rendering.

- `apps/native/src/navigation/MainTabs.tsx` — **Must modify.** Add Analytics tab. Currently has 4 tabs (Exercises, Workouts, Templates, Settings). Pattern is `Tab.Screen → StackNavigator → Screen`. Need `AnalyticsStack` with `AnalyticsScreen` and possibly `ExerciseDetailScreen` (or put exercise detail in ExercisesStack).

- `apps/native/src/screens/ExercisesScreen.tsx` — **Navigation target.** ExerciseCard currently renders as a non-navigating TouchableOpacity. Need to wire `onPress` to navigate to ExerciseDetailScreen with the exercise `_id`. Similar to how web wraps ExerciseCard in a `<Link>`.

- `apps/native/src/components/ExerciseCard.tsx` — **Must modify.** Add `onPress` handler prop for navigation to exercise detail screen.

- `apps/native/src/lib/theme.ts` — **Reuse.** All style constants (colors, spacing, fontFamily). Mobile analytics components should use these exclusively.

- `apps/native/src/lib/units.ts` — **Reuse.** `formatWeight` and `displayWeight` for chart labels and summary cards.

- `packages/backend/data/muscle-heatmap-paths.ts` — **Direct import.** Framework-agnostic SVG path data. Import via `@packages/backend/data/muscle-heatmap-paths`. The `MUSCLE_REGIONS`, `BODY_OUTLINE_FRONT`, `BODY_OUTLINE_BACK`, and `VIEWBOX` constants are ready for `react-native-svg` consumption.

- `apps/web/src/lib/colors.ts` — **Port to native.** `interpolateHeatmapColor` is pure math — copy to `apps/native/src/lib/colors.ts`. Same 5-stop gradient (gray-100 → blue-600).

- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — **Reference implementation.** Same structure but web uses `<svg>/<path>` JSX; mobile uses `<Svg>/<Path>` from react-native-svg. The component logic (percentage lookup, color interpolation, front/back views) is identical.

- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — **Reference implementation.** Same data shape, different chart library. Web uses Recharts `LineChart`; mobile uses Victory Native XL `CartesianChart` + `Line`. Dual Y-axis (weight/1RM left, volume right) — Victory Native supports multiple `yAxis` configurations.

- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx` — **Reference implementation.** Horizontal bar chart. Victory Native XL has `Bar` component with horizontal layout via `CartesianChart` orientation.

- `apps/web/src/components/analytics/WeeklySummaryCard.tsx` / `MonthlySummaryCard.tsx` — **Reference implementation.** Pure data display — straightforward port to React Native `View`/`Text` with `StyleSheet`.

- `apps/native/babel.config.js` — **Must modify.** Currently only has `babel-preset-expo`. Victory Native XL requires `react-native-reanimated/plugin` in the plugins array. Note: `react-native-reanimated` is already a dependency (v4.1.5) but the Babel plugin isn't configured — this may already be handled by Expo's preset, but should be explicitly verified.

## Constraints

- **Victory Native XL requires `@shopify/react-native-skia` as a peer dependency.** This is a significant native module (~2MB). The project uses Expo 54 with New Architecture enabled (`"newArchEnabled": true` in `app.json`). Skia must support both New Architecture and Expo 54's React Native 0.82.1.

- **react-native-svg must be Expo-compatible.** Use `npx expo install react-native-svg` to get the SDK-compatible version, not a bare `pnpm add`.

- **Victory Native XL has a render function children API.** Unlike Recharts' declarative JSX children, Victory Native XL uses `CartesianChart` with a render function: `{({ points, chartBounds }) => (<Line points={points.sales} ... />)}`. This is fundamentally different from web chart code — no code sharing possible.

- **No web-compatible fallback for Victory Native XL.** Victory Native XL is React Native only (Skia renderer). If it fails to install, fallback is `react-native-chart-kit` (SVG-based, older but stable) per M002-RESEARCH.

- **Font loading for Victory Native XL axis labels.** Victory Native uses `useFont` from `@shopify/react-native-skia` for axis text rendering. Must provide a font file (the project uses custom fonts via `expo-font`). May need to use the system font or provide the Inter font file directly.

- **The native app has no `@packages/backend` path alias in tsconfig.** However, the monorepo workspace resolution should handle `@packages/backend` imports. The existing native code already imports from `@packages/backend/convex/_generated/api`. The same pattern works for `@packages/backend/data/muscle-heatmap-paths`.

- **Navigation: ExerciseDetailScreen placement.** The exercise detail screen should live in `ExercisesStack` (drill-down from exercise list), not in a separate tab. Victory Native XL charts render within a `View` that needs explicit height — no `ResponsiveContainer` equivalent.

- **Chart height must be explicitly set on mobile.** Unlike Recharts' `ResponsiveContainer`, Victory Native's `CartesianChart` requires an explicit `height` (or a parent `View` with defined height). Typical: 250-300px for a line chart.

## Common Pitfalls

- **`@shopify/react-native-skia` version mismatch with React Native 0.82.1** — Skia has tight coupling to RN versions. Use `npx expo install` to get the Expo-compatible version. If the latest Skia doesn't support RN 0.82.1, check their compatibility matrix or pin to a known working version.

- **Missing Babel plugin for Reanimated** — Victory Native XL uses Reanimated for animations. Without `react-native-reanimated/plugin` in `babel.config.js`, animations crash at runtime. The plugin must be the LAST item in the plugins array. Expo's default preset may already include it if `react-native-reanimated` is detected — verify by checking if current animations (rest timer) already work.

- **Victory Native XL `useFont` returns null** — If no font file is provided, `useFont(null)` returns null and axis labels won't render. Either provide a bundled font file path or use `useFont(require('./assets/font.ttf'))`. Alternatively, skip `useFont` and let Victory use default rendering.

- **SVG path `d` attributes work differently in react-native-svg vs web SVG** — Actually they don't — `react-native-svg`'s `<Path d={...} />` accepts the exact same SVG path data strings as web `<path d={...} />`. The shared path data file works unchanged. The only difference is JSX element names: `<Svg>` vs `<svg>`, `<Path>` vs `<path>`, etc.

- **WorkoutExerciseItem type narrowing** — The `ExerciseItemData.workoutExercise` type on native currently doesn't include `workoutId`. But `getWorkoutWithDetails` returns the full `workoutExercises` document which does include `workoutId`. The fix is to add it to the interface, not to change the query.

- **Large chart on small screens** — Victory Native XL charts with many data points (100+) on a small phone screen will be unreadable. Unlike web where you can scroll horizontally, mobile charts need data point aggregation or limiting. The `getExerciseProgress` query already returns one point per workout session, which is reasonable (users rarely have 100+ sessions for one exercise).

- **Analytics tab icon choice** — Ionicons has several analytics-related icons: `analytics`, `bar-chart`, `stats-chart`, `pie-chart`. Use `stats-chart` / `stats-chart-outline` for consistency with the fitness analytics context.

## Open Risks

- **`@shopify/react-native-skia` compatibility with Expo 54 New Architecture** — This is the M002 key risk being retired in this slice. Skia 1.x supports RN 0.76+, but Expo 54 is on RN 0.82.1 with New Architecture enabled. The combination hasn't been explicitly verified yet. If incompatible, fallback to `react-native-chart-kit` which uses `react-native-svg` (no Skia dependency). This would change the chart API but not the data contracts.

- **Victory Native XL font handling on Expo** — Victory Native XL uses Skia's `useFont` for text rendering, which requires a direct font file reference. Expo's font loading system (`expo-font`) is different — it loads fonts asynchronously and applies them via font family names. Need to verify whether Victory can use Expo-loaded fonts or requires its own `require('./font.ttf')` path.

- **Build time increase from Skia** — `@shopify/react-native-skia` significantly increases native build times (especially first build). This doesn't affect the Expo Go workflow since Skia requires a custom dev client (`npx expo prebuild` + native build). The project currently uses Expo Go — adding Skia means the developer workflow changes to `npx expo run:ios` or EAS Build.

- **Expo Go incompatibility** — Victory Native XL + Skia are native modules not included in Expo Go. This means mobile development after this slice requires either a development build (`expo-dev-client`) or EAS Build. This is a significant developer workflow change.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Victory Native XL | none found | no relevant skills available |
| react-native-svg | none found | no relevant skills available |
| Expo | `expo/skills@building-native-ui` (16.6K installs) | available — relevant for native UI patterns |
| Expo | `expo/skills@expo-dev-client` (9.3K installs) | available — relevant since Skia requires dev client |
| Convex | `get-convex/agent-skills@function-creator` (110 installs) | available — not needed for S04 (no new backend work) |

**Install recommendations:** `expo/skills@building-native-ui` is relevant for building the analytics tab and exercise detail screen with proper native patterns. `expo/skills@expo-dev-client` may be useful if Skia requires transitioning from Expo Go to a development build. Neither is critical — the existing codebase patterns are well-established.

## Sources

- Victory Native XL installation: peer deps are `react-native-reanimated`, `react-native-gesture-handler`, `@shopify/react-native-skia` (source: [Victory Native XL docs — Getting Started](https://github.com/formidablelabs/victory-native-xl/blob/main/website/docs/getting-started.mdx))
- Victory Native XL CartesianChart API: render function children pattern with `points` and `chartBounds` (source: [Victory Native XL docs — CartesianChart](https://github.com/formidablelabs/victory-native-xl/blob/main/website/docs/cartesian/guides/basic-bar-chart.md))
- react-native-svg Expo installation: `npx expo install react-native-svg` (source: [react-native-svg README](https://github.com/software-mansion/react-native-svg/blob/main/README.md))
- react-native-svg Path component: `<Path d={...} />` accepts standard SVG path data strings (source: [react-native-svg USAGE.md](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md))
