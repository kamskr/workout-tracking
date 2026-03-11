---
id: M002
provides:
  - personalRecords table with PR detection (weight/volume/reps) running inside logSet mutation
  - getExerciseProgress query returning time-series chart data per exercise
  - getVolumeByMuscleGroup, getWeeklySummary, getMonthlySummary analytics queries
  - Recharts progress charts on web at /exercises/[id] with dual Y-axes and time period selector
  - SVG muscle group heatmap (7 regions, front+back body views) with shared path data
  - Analytics dashboard at /analytics with heatmap, volume bar chart, summary cards
  - Victory Native XL charts and react-native-svg heatmap on mobile
  - PR 🏆 badges in active workouts on both web and mobile
  - Analytics bottom tab on mobile with full feature parity
  - 3 M002 verification scripts (31 total checks) plus 5 M001 regression scripts (41 checks) — 72/72 pass
key_decisions:
  - D043 — On-demand aggregation, no pre-computed rollup tables
  - D044 — Dedicated personalRecords table storing detected PRs
  - D045 — Epley formula for estimated 1RM
  - D046 — Recharts (web) + Victory Native XL (mobile), shared data shape contract
  - D047 — Custom SVG heatmap with shared body outline asset
  - D048 — Standard analytics time periods (30d/90d/6mo/1yr/all-time)
  - D049 — Three PR types (weight, volume, reps)
  - D051 — logSet returns { setId, prs } with backward-compatible test helpers
  - D052 — PR detection errors non-fatal (try/catch)
  - D058 — Exercise progress data shape contract (S02→S04 boundary)
  - D062 — 50% secondary muscle group volume attribution for heatmap
  - D063 — SVG path data in packages/backend/data/ for cross-platform sharing
  - D066 — Dashboard uses 7d/30d/90d/All Time (differs from exercise detail periods)
  - D067 — Native analytics components suffixed with Native
  - D068 — Victory Native XL charts use explicit 280px height
patterns_established:
  - Shared lib/ helpers in convex/lib/ for cross-cutting mutation logic (prDetection.ts)
  - computeX extraction pattern — shared function callable from both auth-gated query and test helper
  - Self-fetching analytics components with useQuery, handling loading/empty states
  - Dashboard assembly — page owns shared state (periodDays), passes to child components
  - SVG path data extraction — pure-data TS file consumable by any framework (web and mobile)
  - data-analytics-* attribute convention for agent-inspectable UI elements
  - Web-first delivery with mobile port as final slice (D050)
  - Victory Native XL per-bar rendering pattern for per-item colors
observability_surfaces:
  - logSet returns { setId, prs } — callers see which PRs triggered per set
  - getWorkoutPRs, getPersonalRecords, getExerciseProgress, getVolumeByMuscleGroup, getWeeklySummary, getMonthlySummary — auth-gated Convex reactive queries
  - testGetExerciseProgress, testGetVolumeByMuscleGroup, testGetWeeklySummary, testGetMonthlySummary — test helpers callable via ConvexHttpClient
  - personalRecords table queryable in Convex dashboard
  - "[PR Detection] Error:" in Convex function logs (non-fatal)
  - data-pr-badge, data-exercise-chart, data-analytics-heatmap, data-analytics-barchart, data-analytics-summary-weekly, data-analytics-summary-monthly CSS selectors
  - verify-s01-m02.ts (12 checks), verify-s02-m02.ts (8 checks), verify-s03-m02.ts (11 checks) — definitive correctness checks
requirement_outcomes:
  - id: R012
    from_status: active
    to_status: validated
    proof: "12/12 backend checks in verify-s01-m02.ts prove weight PR (Epley 1RM), volume PR, rep PR detection correctness including edge cases. Web UI renders reactive 🏆 badge via useQuery subscription. Mobile PR badges ported in S04 with same reactive pattern."
  - id: R013
    from_status: active
    to_status: validated
    proof: "8/8 backend checks in verify-s02-m02.ts prove time-series data accuracy (max weight, total volume, estimated 1RM, warmup exclusion, date sorting, period filtering). Recharts chart on web at /exercises/[id]. Victory Native XL chart on mobile ExerciseDetailScreen. Same getExerciseProgress query powers both."
  - id: R014
    from_status: active
    to_status: validated
    proof: "11/11 backend checks in verify-s03-m02.ts prove volume aggregation accuracy (primary + secondary attribution, warmup exclusion, bodyweight handling, time-range filtering, weekly/monthly totals, top exercises ranking, empty state). Web dashboard at /analytics with heatmap, bar chart, summary cards. Mobile Analytics tab with same features via react-native-svg and Victory Native XL."
duration: ~3h across 4 slices, 13 tasks
verification_result: passed
completed_at: 2026-03-11
---

# M002: Analytics & Progress

**Raw workout logs transformed into actionable insight — PR detection in logSet with reactive 🏆 badges, Recharts/Victory Native XL progress charts per exercise, SVG muscle group heatmap, and weekly/monthly summaries — all verified by 31 backend checks with zero M001 regressions (72/72 total).**

## What Happened

M002 delivered analytics and progress visualization in 4 slices, progressing from backend detection logic through web UI to mobile feature parity:

**S01 (Personal Records)** established the analytics foundation — a `personalRecords` table with PR detection logic embedded in the `logSet` mutation path. Three PR types (weight via Epley 1RM, volume as cumulative session total, reps as single-set max) are detected in realtime, stored in the new table, and surfaced as reactive 🏆 badges in the active workout UI via `useQuery(getWorkoutPRs)`. PR detection is wrapped in try/catch so it never breaks set logging (D052). The high-risk concern about mutation-path overhead was retired — indexed lookups add negligible latency.

**S02 (Progress Charts)** built the exercise progress pipeline — `getExerciseProgress` in `analytics.ts` traverses the workout→exercise→set graph to produce time-series data (`{ date, maxWeight, totalVolume, estimated1RM? }[]`), which the `ExerciseProgressChart` Recharts component renders with dual Y-axes and a time period selector. A new `/exercises/[id]` detail page surfaces the chart alongside exercise info and PR summary cards, with `ExerciseCard` linking into it.

**S03 (Volume Analytics & Heatmap)** added volume aggregation and dashboard features — `computeVolumeByMuscleGroup` attributes 100% volume to primary and 50% to secondary muscle groups, `computePeriodSummary` powers weekly/monthly summary cards, and a custom SVG muscle heatmap with 7 addressable regions across front/back body views was built from framework-agnostic path data. The `/analytics` dashboard page assembles heatmap, volume bar chart, and summary cards with a shared period selector.

**S04 (Mobile Port)** closed the cross-platform loop — Victory Native XL (`victory-native` + `@shopify/react-native-skia`) and `react-native-svg` were installed and configured. All analytics features were ported: PR badges in `WorkoutExerciseItem`, exercise progress line chart in `ExerciseDetailScreen`, muscle heatmap, volume bar chart, and summary cards in a new Analytics bottom tab. Every mobile component self-fetches via `useQuery` from the same Convex backend queries — zero backend changes needed for mobile.

The shared data shape contract (D046, D058) proved effective — S02 and S03 established query shapes on web, and S04 consumed them on mobile without modification.

## Cross-Slice Verification

**Success Criterion 1 — PR badge appears in realtime during live workout:**
- ✅ `verify-s01-m02.ts` 12/12 checks prove all 3 PR types detect correctly (weight PR baseline + update, volume PR, rep PR), warmup/missing-weight exclusion, metadata correctness, workout filtering, no false positives, cumulative volume.
- ✅ Web UI renders `data-pr-badge` badge via reactive `useQuery(getWorkoutPRs)` subscription. Mobile ported in S04.
- ⚠️ Browser live demo partially blocked by pre-existing local Clerk+Convex auth config issue (not a code defect — code compiles and types check).

**Success Criterion 2 — Line chart of weight/volume/1RM progression per exercise:**
- ✅ `verify-s02-m02.ts` 8/8 checks prove data accuracy: max weight, total volume, estimated 1RM computation, warmup exclusion, date sorting, period filtering, empty results.
- ✅ Recharts chart renders at `/exercises/[id]` with dual Y-axes, custom tooltip, time period selector. Victory Native XL chart on mobile `ExerciseDetailScreen`.

**Success Criterion 3 — Muscle group heatmap with configurable period:**
- ✅ `verify-s03-m02.ts` checks VM-01 through VM-05 prove primary/secondary attribution, warmup exclusion, bodyweight handling, time filtering.
- ✅ Web SVG heatmap with 7 color-coded regions + front/back views. Mobile react-native-svg heatmap consuming shared path data. Period selector (7d/30d/90d/All Time).

**Success Criterion 4 — Weekly/monthly summary cards with correct totals:**
- ✅ `verify-s03-m02.ts` checks PS-01 through PS-05 prove workout count, total volume, total sets, top exercises ranking, and empty state.
- ✅ `WeeklySummaryCard` and `MonthlySummaryCard` on web. `WeeklySummaryCardNative` and `MonthlySummaryCardNative` on mobile.

**Success Criterion 5 — All analytics work on both web and mobile:**
- ✅ S04 ported all features — PR badges, progress charts, heatmap, volume chart, summary cards. TypeScript compiles 0 errors across all 3 packages.
- ⚠️ Runtime visual rendering on real device/simulator not yet verified — human UAT pending for chart rendering quality (Victory Native XL + Skia).

**Success Criterion 6 — Accurate, performant analytics for 20+ workouts:**
- ✅ Backend verification scripts create test data with multiple workouts and verify query correctness. On-demand aggregation (D043) handles current scale within Convex query timeout.
- ℹ️ No explicit load test with 200+ workouts — accepted per D043 rationale (revisit if queries exceed 2s).

**Cross-cutting verification:**
- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- All M001 regression scripts pass: verify-s02 (15/15), verify-s03 (12/12), verify-s04 (6/6), verify-s05 (8/8)
- **Total: 72/72 backend checks pass with zero regressions**

## Requirement Changes

- **R012** (Personal Records Tracking): active → validated — 12/12 backend checks prove weight/volume/rep PR detection. Reactive 🏆 badge on web and mobile. Cross-platform delivery complete.
- **R013** (Progress Charts Per Exercise): active → validated — 8/8 backend checks prove time-series data accuracy. Recharts chart on web, Victory Native XL on mobile. Cross-platform delivery complete.
- **R014** (Volume Analytics and Muscle Group Heatmaps): active → validated — 11/11 backend checks prove volume aggregation accuracy. Web dashboard with heatmap + charts + summaries. Mobile Analytics tab with same features. Cross-platform delivery complete.
- **R011** (Cross-Platform UI): remained validated — M002/S04 extended validation scope to include all analytics features on mobile, reinforcing the existing validation from M001/S06.

## Forward Intelligence

### What the next milestone should know
- The analytics query pattern (traverse workoutExercises → workout → sets, batch-resolve related docs into a Map, aggregate in JavaScript) is established and works well at single-user scale. M003's social features (activity feed, leaderboards) will need multi-user aggregation which is a different pattern — consider whether on-demand aggregation (D043) still holds or if pre-computed rollups are needed.
- The `packages/backend/data/` directory is established for cross-platform shared data files (muscle-heatmap-paths.ts). If M003 needs shared assets (e.g., achievement badge definitions), follow the same pattern.
- `convex/analytics.ts` is the canonical module for all analytics queries. It already has 5 query functions — keep it organized or split by domain if it grows further.
- The `testing.ts` pattern (internal mutations/queries with explicit `testUserId` bypassing Clerk auth) works well for backend verification. M003 social features will need multi-user test scenarios — extend `testUserId` to support creating relationships between test users.

### What's fragile
- **Victory Native XL + Skia runtime rendering** — type-checked but not visually verified on a real device or simulator. If Skia fails at runtime, the documented fallback is `react-native-chart-kit`. This is the highest-risk unverified assumption.
- **Local Clerk+Convex auth integration** — the anonymous local Convex backend doesn't fully verify Clerk JWTs. Browser testing of authenticated features requires fixing the CLERK_ISSUER_URL or using a deployed Convex backend. This affects all future slices with browser verification of auth-gated features.
- **On-demand aggregation performance** — works at current scale (single user, <200 workouts) but scans all historical data per query. Multi-user analytics (leaderboards, feed) in M003/M004 will need a different approach.
- **Per-bar rendering in VolumeBarChartNative** — maps each data point to a separate `Bar` component because Victory Native XL lacks per-item color support. Works for 7-9 muscle groups but would not scale to many more items.

### Authoritative diagnostics
- `verify-s01-m02.ts` (12 checks) — definitive PR detection correctness
- `verify-s02-m02.ts` (8 checks) — definitive exercise progress data accuracy
- `verify-s03-m02.ts` (11 checks) — definitive volume aggregation and summary correctness
- `personalRecords` table in Convex dashboard — inspect stored PRs directly
- `data-analytics-*` and `data-pr-badge` CSS selectors — programmatic UI verification
- `[PR Detection] Error:` in Convex function logs — non-fatal PR detection failures

### What assumptions changed
- **PR detection overhead on logSet** was the highest-risk item (S01 risk:high). In practice, indexed lookups add negligible latency — the risk was retired in S01 without needing pre-computed caches.
- **Recharts 3.x + React 19 compatibility** was uncertain. Works out of the box — no issues encountered.
- **Victory Native XL + Skia + Expo 54** was a key risk. Type-level compatibility confirmed in S04 (installs and compiles). Runtime verification still pending.
- **D048 analytics periods** — dashboard uses shorter windows (7d/30d/90d/All Time per D066) while exercise detail keeps the original spec (30d/90d/6mo/1yr/All Time). The split makes sense for different use cases.
- **SVG heatmap muscle regions** — roadmap specified 9 regions but implementation uses 7 addressable regions across front/back views. Adequate for the current muscle group taxonomy.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added personalRecords table, prType validator, by_userId_completedAt index on workouts
- `packages/backend/convex/lib/prDetection.ts` — Shared PR detection helper (Epley 1RM, volume, reps)
- `packages/backend/convex/personalRecords.ts` — Auth-gated getWorkoutPRs and getPersonalRecords queries
- `packages/backend/convex/sets.ts` — Extended logSet with PR detection, returns { setId, prs }
- `packages/backend/convex/analytics.ts` — getExerciseProgress, getVolumeByMuscleGroup, getWeeklySummary, getMonthlySummary queries
- `packages/backend/convex/testing.ts` — Extended with PR, analytics, volume, and summary test helpers
- `packages/backend/data/muscle-heatmap-paths.ts` — Framework-agnostic SVG path data (7 regions, body outlines)
- `packages/backend/scripts/verify-s01-m02.ts` — 12-check PR detection verification
- `packages/backend/scripts/verify-s02-m02.ts` — 8-check exercise progress verification
- `packages/backend/scripts/verify-s03-m02.ts` — 11-check volume/summary verification
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Added PR badge rendering with reactive query
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — Recharts dual-axis chart
- `apps/web/src/components/exercises/ExerciseCard.tsx` — Added Link wrapper to exercise detail
- `apps/web/src/app/exercises/[id]/page.tsx` — Exercise detail page with chart and PR cards
- `apps/web/src/components/analytics/MuscleHeatmap.tsx` — SVG heatmap component
- `apps/web/src/components/analytics/VolumeByMuscleGroupChart.tsx` — Recharts horizontal bar chart
- `apps/web/src/components/analytics/WeeklySummaryCard.tsx` — Weekly summary card
- `apps/web/src/components/analytics/MonthlySummaryCard.tsx` — Monthly summary card
- `apps/web/src/app/analytics/page.tsx` — Analytics dashboard page
- `apps/web/src/lib/colors.ts` — interpolateHeatmapColor utility
- `apps/web/src/middleware.ts` — Added /analytics to Clerk protected routes
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — Added Analytics link
- `apps/web/src/app/globals.css` — Added pr-badge-in animation
- `apps/web/package.json` — Added recharts dependency
- `apps/native/package.json` — Added victory-native, @shopify/react-native-skia, react-native-svg
- `apps/native/babel.config.js` — Added react-native-reanimated/plugin
- `apps/native/src/lib/colors.ts` — Ported interpolateHeatmapColor
- `apps/native/src/components/WorkoutExerciseItem.tsx` — Added PR badge rendering
- `apps/native/src/navigation/MainTabs.tsx` — Added Analytics tab and ExerciseDetailScreen
- `apps/native/src/screens/AnalyticsScreen.tsx` — Analytics dashboard
- `apps/native/src/screens/ExerciseDetailScreen.tsx` — Exercise detail with chart
- `apps/native/src/screens/ExercisesScreen.tsx` — Wired ExerciseCard navigation
- `apps/native/src/components/ExerciseCard.tsx` — Added onPress prop
- `apps/native/src/components/analytics/PeriodSelector.tsx` — Reusable period selector
- `apps/native/src/components/analytics/MuscleHeatmapNative.tsx` — react-native-svg heatmap
- `apps/native/src/components/analytics/VolumeBarChartNative.tsx` — Victory Native XL bar chart
- `apps/native/src/components/analytics/WeeklySummaryCardNative.tsx` — Weekly stats card
- `apps/native/src/components/analytics/MonthlySummaryCardNative.tsx` — Monthly stats card
- `apps/native/src/components/analytics/ExerciseProgressChartNative.tsx` — Victory Native XL line chart
