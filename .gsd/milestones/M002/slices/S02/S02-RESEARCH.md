# S02: Progress Charts Per Exercise — Research

**Date:** 2026-03-11

## Summary

S02 delivers R013 (Progress Charts Per Exercise) — the ability for users to open any exercise and view line charts showing weight, volume, and estimated 1RM progression over time on web. The slice has two major parts: (1) a Convex query function `getExerciseProgress` that traverses the `workoutExercises → workouts → sets` graph to produce time-series chart data, and (2) a web UI entry point (exercise detail page or modal) with Recharts line charts consuming that data.

The query traversal pattern already exists in `getPreviousPerformance` (sets.ts) — it queries `workoutExercises` by `exerciseId`, resolves each to its parent workout (filtering by userId + completed status), then collects sets. The progress chart query follows the same traversal but returns *all* completed workout sessions for the exercise rather than just the most recent one. S01 added the `by_userId_completedAt` index on workouts (not needed for this exact query pattern, but useful for time-range filtering). The `by_exerciseId` index on `workoutExercises` is the primary entry point.

Recharts 3.8.0 is the chart library (D046), fully compatible with React 19. It provides `LineChart`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`, and `Legend` — all needed for multi-line progress charts. The web app currently has no exercise detail page — ExerciseCard is display-only with no click action. S02 needs to add either a dedicated page (`/exercises/[id]`) or a detail modal accessible from the exercise card.

The verification strategy follows the established pattern: a backend verification script (`verify-s02-m02.ts`) that creates multiple workouts with known set data over time, calls `getExerciseProgress`, and validates the returned data points match expected values. Web UI verification shows the chart rendering with real data.

## Recommendation

**Approach: Dedicated `getExerciseProgress` query + Recharts line chart on a new exercise detail page.**

1. **Backend query — `analytics.ts`**: Create `packages/backend/convex/analytics.ts` with a `getExerciseProgress` query. Args: `exerciseId: Id<"exercises">`, `periodDays?: number` (optional, defaults to all-time). Traversal: `workoutExercises(by_exerciseId)` → resolve workouts (filter userId + completed + optional time range) → collect sets per workout session → aggregate per workout date: `{ date: number, maxWeight: number, totalVolume: number, estimated1RM: number }[]`. Return sorted by date ascending.

2. **Data aggregation per workout session**: For each completed workout that contains the exercise:
   - `maxWeight`: Highest weight used in any working set (non-warmup)
   - `totalVolume`: Sum of `weight × reps` across all working sets
   - `estimated1RM`: Maximum Epley estimate across all working sets (reuse logic from `prDetection.ts`)
   - `date`: `workout.completedAt` timestamp
   - Skip warmup sets for all metrics (consistent with PR detection, D045)

3. **Web chart component — `ExerciseProgressChart.tsx`**: Recharts `LineChart` inside `ResponsiveContainer` with three `Line` elements (maxWeight, totalVolume, estimated1RM). Use dual Y-axes: left for weight/1RM (same unit scale), right for volume (different magnitude). XAxis shows dates formatted as "MMM d". Tooltip shows all three values with units. Unit-aware display via `formatWeight` (D003/D021).

4. **Exercise detail page — `/exercises/[id]/page.tsx`**: New Next.js dynamic route. Shows exercise name, muscle group, equipment, instructions, PR records (from `getPersonalRecords`), and the progress chart. ExerciseCard gets a `Link` wrapper to navigate here. This is the S02 → S04 boundary output — mobile will have its own exercise detail screen.

5. **Time period selector**: Tabs or pill buttons for 30d, 90d, 6mo, 1yr, all-time (D048). Default to "All Time" for first implementation — most users will have limited data initially. The `periodDays` parameter filters workouts server-side.

6. **Test helpers**: Extend `testing.ts` with `testGetExerciseProgress` query. Verification script creates 3+ workouts across different "dates" (using real mutations with small delays), validates data point count, value accuracy, and time ordering.

7. **Empty state**: If fewer than 2 data points, show a message like "Log more workouts with this exercise to see progress charts" instead of a broken chart with a single dot.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Web line charts | Recharts 3.8.0 (`recharts`) | D046 decision. React 19 compatible (peer dep `^19.0.0`). Declarative, composable API. `ResponsiveContainer` handles layout. Best-in-class for React web charts. |
| Estimated 1RM calculation | `estimateOneRepMax()` in `convex/lib/prDetection.ts` | Already implemented per D045 (Epley formula). Extract or import for reuse in analytics aggregation. |
| Weight unit formatting | `formatWeight()`, `displayWeight()` in `apps/web/src/lib/units.ts` | Already handles kg↔lbs conversion at display boundary (D003/D021). Chart labels and tooltips should use these. |
| Date formatting | `Intl.DateTimeFormat` / `toLocaleDateString` | Already used in WorkoutCard. No library needed for "MMM d" date labels. |

## Existing Code and Patterns

- `packages/backend/convex/sets.ts` → `getPreviousPerformance` — **The primary traversal pattern to adapt.** Queries `workoutExercises(by_exerciseId)` → resolves workout ownership + completed status → collects sets. Progress query does the same but for *all* matching workouts, not just the most recent.
- `packages/backend/convex/lib/prDetection.ts` → `estimateOneRepMax()` — Private function. Either export it for reuse in analytics, or duplicate the one-liner (`weight × (1 + reps/30)`, capped at 15 reps). Exporting is cleaner.
- `packages/backend/convex/personalRecords.ts` → `getPersonalRecords(exerciseId)` — Returns current best per PR type. The exercise detail page should display these alongside the chart.
- `packages/backend/convex/exercises.ts` → `getExercise(id)` — Already exists, returns full exercise doc. Used on the detail page for name/muscle group/instructions.
- `apps/web/src/components/exercises/ExerciseCard.tsx` — Currently display-only (no link/click). Needs a `Link` wrapper to `/exercises/[id]`. Keep the card simple, add navigation.
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Self-fetching pattern (D020): component calls `useQuery` internally. ExerciseProgressChart should follow the same pattern — the chart component subscribes to `getExerciseProgress` reactively.
- `apps/web/src/app/exercises/page.tsx` — Exercise library list page. The new `/exercises/[id]/page.tsx` follows the same layout pattern (max-w-5xl container, gray-50 background).
- `packages/backend/scripts/verify-s01-m02.ts` — Verification script pattern: `ConvexHttpClient`, `testUserId`, check runner, cleanup. S02 verification script follows the same structure.
- `packages/backend/convex/testing.ts` — Test helpers with `testUserId` bypass. Extend with `testGetExerciseProgress` and potentially `testGetExerciseHistory` queries.
- `apps/web/src/app/globals.css` — Tailwind v4 config with `--color-primary: #0d87e1`. Chart colors should complement this (blue primary line, muted secondary lines).

## Constraints

- **Convex has no native aggregation.** The `getExerciseProgress` query must load all matching `workoutExercise` docs, resolve each to its workout, filter, then load all sets — all in JavaScript within the Convex function handler. This is O(N) where N = total workoutExercise rows for the exercise across all users (the `by_exerciseId` index is not user-scoped).
- **`by_exerciseId` index on workoutExercises is global (not per-user).** The query must post-filter for `workout.userId === currentUser`. For a popular exercise with many users, this scans all users' workoutExercises before filtering. Acceptable for single-user M002 scale. If multi-user scale becomes an issue, a composite `by_exerciseId_userId` index or denormalized `userId` on `workoutExercises` would help.
- **Convex 10-second query timeout.** A user with 50 workouts containing the same exercise: ~50 workoutExercise docs → ~50 workout lookups → ~200 set docs. Well within limits. The `getPreviousPerformance` pattern already works at this scale.
- **Recharts requires `react-is` as a peer dependency.** Need to verify it's installed or install it alongside Recharts. React 19 should include it or it needs to be added explicitly.
- **No existing exercise detail route.** Must create `/exercises/[id]/page.tsx` as a new Next.js dynamic route. The middleware at `apps/web/src/middleware.ts` may need updating if it restricts routes.
- **Chart data must be unit-aware.** Backend returns weights in kg (D003). Charts must convert at the display boundary using user's unit preference. The Recharts `tickFormatter` and `Tooltip` formatter props handle this cleanly.
- **Recharts renders SVG.** Each data point is an SVG element. For exercises with 100+ workout sessions, this could create performance issues. Mitigation: for large datasets, aggregate by week/month rather than showing every individual workout. For M002 (single user, likely <50 sessions per exercise), raw per-workout data is fine.

## Common Pitfalls

- **Forgetting to filter warmup sets** — Warmup sets (low weight, intentionally light) should be excluded from max weight, volume, and 1RM calculations. The `isWarmup` flag is already on sets. Apply the same filter as PR detection.
- **Empty/null weight or reps in sets** — Some sets may have `weight: undefined` or `reps: undefined` (e.g., bodyweight exercises, partial logs). The aggregation must guard against these, same as `prDetection.ts` does.
- **Chart breaks with 0 or 1 data points** — Recharts renders a flat line or nothing with a single data point. Need an explicit empty/insufficient-data state when fewer than 2 data points exist.
- **Timezone issues in date display** — `completedAt` is UTC epoch millis. Recharts XAxis `tickFormatter` converts to local dates via `new Date(ts).toLocaleDateString()`. This is correct for display but may show different dates than expected near midnight UTC boundaries. Not a major issue for workout progress charts.
- **Volume scale dwarfs weight scale** — Volume (weight × reps, e.g., 3000 kg) is typically 10-50x larger than max weight (e.g., 100 kg). Using a single Y-axis makes weight lines flat at the bottom. Solution: dual Y-axes (left for weight/1RM, right for volume), or separate chart panels, or a metric selector that shows one metric at a time.
- **Not handling exercises with no set data** — A workout exercise might have been added but no sets logged (e.g., user added exercise then removed it, or the workout was finished incomplete). Filter out sessions with zero working sets.
- **Recharts `ResponsiveContainer` height** — Must have an explicit height or be inside a container with defined height. Using `height={300}` or wrapping in a div with fixed height.

## Open Risks

- **Recharts + Next.js 16 SSR** — Recharts uses browser-only APIs (SVG measurement, ResizeObserver). The chart component must be client-only (`"use client"` directive and potentially dynamic import with `ssr: false`). The existing codebase already uses `"use client"` extensively — ExerciseProgressChart follows the same pattern.
- **Query performance with popular exercises** — If the same exercise (e.g., "Bench Press") has been used in 100+ workouts, the query traverses 100+ workoutExercise → workout → sets paths. Each path is 2-3 doc reads. Total: ~300 doc reads for 100 workouts. Within Convex limits (16,384) but worth monitoring.
- **Metric selector UX** — Showing all 3 metrics (weight, volume, 1RM) on one chart may be cluttered. May need to let users toggle metrics on/off or show separate smaller charts. Start with all 3 visible and refine based on visual result.
- **ExerciseCard link safety confirmed** — ExercisePicker has its own inline exercise rendering and does NOT reuse ExerciseCard. Adding a `Link` wrapper to ExerciseCard for the library page is safe — it won't affect the workout exercise picker modal.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Recharts | `yonatangross/orchestkit@recharts-patterns` (82 installs) | available — directly relevant for chart patterns |
| Recharts | `ansanabria/skills@recharts` (65 installs) | available — Recharts usage patterns |
| Recharts | `tartinerlabs/skills@recharts` (30 installs) | available — Recharts patterns |
| Convex | `get-convex/agent-skills@function-creator` (110 installs) | available — recommended for Convex function authoring |
| Convex | `get-convex/agent-skills@schema-builder` (105 installs) | available — useful if schema changes needed |

**Install recommendations:** `yonatangross/orchestkit@recharts-patterns` (82 installs) is the most installed Recharts skill and directly relevant for S02's chart implementation. `get-convex/agent-skills@function-creator` remains relevant for the analytics query. User decides.

## Sources

- Recharts 3.8.0 API — LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, dual Y-axes (source: Context7 `/recharts/recharts` documentation)
- Recharts React 19 peer dependency confirmed: `^19.0.0` in `peerDependencies` (source: `npm view recharts peerDependencies`)
- `getPreviousPerformance` traversal pattern in `convex/sets.ts` — established codebase pattern for exercise history queries
- `estimateOneRepMax` in `convex/lib/prDetection.ts` — Epley formula implementation (D045)
- Convex query constraints: 10s timeout, 16,384 doc read limit (source: M002-RESEARCH.md)
