# S02: Progress Charts Per Exercise

**Goal:** Users can open any exercise from the library and view a Recharts line chart showing weight progression, volume progression, and estimated 1RM over time — with accurate data from their completed workouts.
**Demo:** Navigate to `/exercises`, click an exercise card, see the exercise detail page with a line chart displaying real historical data (or an empty state for exercises never performed). Backend verification script proves data accuracy.

## Must-Haves

- `getExerciseProgress` Convex query in `analytics.ts` returning `{ date, maxWeight, totalVolume, estimated1RM }[]` per workout session, sorted by date ascending
- Warmup sets excluded from all metrics (consistent with PR detection, D045)
- Empty/bodyweight/partial sets guarded against (no NaN, no division by zero)
- `estimateOneRepMax` exported from `prDetection.ts` for reuse (no duplication)
- Time period filter support (`periodDays` arg: 30, 90, 180, 365, undefined=all-time) per D048
- Recharts installed and working with React 19 / Next.js 16
- `ExerciseProgressChart` client component with multi-line chart (weight, volume, estimated 1RM) using dual Y-axes
- Exercise detail page at `/exercises/[id]/page.tsx` showing exercise info, PRs, and the chart
- ExerciseCard links to `/exercises/[id]` from the library page (without breaking ExercisePicker)
- Empty state when fewer than 2 data points
- `data-exercise-chart` attribute on chart container for programmatic verification (follows D057 convention)
- `testGetExerciseProgress` test helper in `testing.ts`
- `verify-s02-m02.ts` script with all checks passing

## Proof Level

- This slice proves: integration (real Convex backend queries + real chart rendering with data from DB)
- Real runtime required: yes (Convex dev backend for verification script, `next dev` for chart rendering)
- Human/UAT required: yes (chart readability, axis labels, tooltip UX — cannot be fully automated)

## Verification

- `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8+ checks proving data accuracy:
  - EP-01: getExerciseProgress returns correct number of data points (one per completed workout with that exercise)
  - EP-02: maxWeight equals highest working set weight per workout session
  - EP-03: totalVolume equals sum of weight×reps for all working sets per session
  - EP-04: estimated1RM matches Epley formula for best set in session
  - EP-05: Warmup sets excluded from all metrics
  - EP-06: Data points sorted by date ascending
  - EP-07: periodDays filter returns only workouts within the time range
  - EP-08: Exercise with no completed workouts returns empty array
- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- All existing verify scripts still pass (no regression):
  - `npx tsx packages/backend/scripts/verify-s01-m02.ts` — 12/12
  - `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15
  - `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12
  - `npx tsx packages/backend/scripts/verify-s04.ts` — 6/6
  - `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8

## Observability / Diagnostics

- Runtime signals: `getExerciseProgress` returns an empty array (not an error) when no data exists — the chart component interprets this as the empty state. No structured logging needed; the query is side-effect-free.
- Inspection surfaces: `testGetExerciseProgress` query in `testing.ts` — callable via ConvexHttpClient to inspect raw chart data for any exercise without auth. Convex dashboard query tab can run `analytics.getExerciseProgress` directly.
- Failure visibility: Convex function errors surface in the dashboard function logs with full stack traces. Chart rendering failures show in browser console. `data-exercise-chart` attribute enables programmatic chart presence detection.
- Redaction constraints: none — no secrets or PII in analytics data

## Integration Closure

- Upstream surfaces consumed:
  - `workoutExercises` table with `by_exerciseId` index (M001/S01)
  - `workouts` table with `by_userId_completedAt` index (M002/S01)
  - `sets` table with `by_workoutExerciseId` index (M001/S02)
  - `estimateOneRepMax()` from `convex/lib/prDetection.ts` (M002/S01)
  - `getPersonalRecords` query from `personalRecords.ts` (M002/S01)
  - `getExercise` query from `exercises.ts` (M001/S01)
  - `formatWeight`, `displayWeight` from `apps/web/src/lib/units.ts` (M001/S02)
- New wiring introduced in this slice:
  - `analytics.ts` Convex module with `getExerciseProgress` query — S02→S04 boundary output
  - Exercise detail page `/exercises/[id]` — new route consuming `getExercise`, `getPersonalRecords`, `getExerciseProgress`
  - ExerciseCard → Link wrapper to `/exercises/[id]` — navigation entry point
  - `testGetExerciseProgress` test helper — S02→S04 boundary testability
- What remains before the milestone is truly usable end-to-end:
  - S03: Volume analytics, muscle heatmap, summary cards (web)
  - S04: Mobile port of all analytics features (Victory Native XL charts, react-native-svg heatmap)

## Tasks

- [x] **T01: Backend query + verification script (initially failing)** `est:35m`
  - Why: Establishes the `getExerciseProgress` query in `analytics.ts`, the `testGetExerciseProgress` test helper, and the verification script with 8 checks. The script defines the objective stopping condition — checks will fail until the query is implemented.
  - Files: `packages/backend/convex/analytics.ts`, `packages/backend/convex/lib/prDetection.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s02-m02.ts`
  - Do: Export `estimateOneRepMax` from `prDetection.ts`. Create `analytics.ts` with `getExerciseProgress` query (args: `exerciseId`, optional `periodDays`). Traversal: `workoutExercises(by_exerciseId)` → resolve workouts (filter userId + completed + time range) → collect sets per session → aggregate `{ date, maxWeight, totalVolume, estimated1RM }`. Add `testGetExerciseProgress` to `testing.ts`. Write `verify-s02-m02.ts` with 8 checks covering accuracy, edge cases, and filtering. Run script — all 8 checks should pass.
  - Verify: `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8/8 pass. `pnpm turbo typecheck --force` — 0 errors.
  - Done when: All 8 verification checks pass and the query returns accurate data matching the raw set calculations.

- [x] **T02: Install Recharts + build ExerciseProgressChart component** `est:30m`
  - Why: Installs Recharts in the web app and builds the chart component that consumes `getExerciseProgress` data. This is the core visual output of the slice — the chart must render weight, volume, and estimated 1RM lines with dual Y-axes.
  - Files: `apps/web/package.json`, `apps/web/src/components/exercises/ExerciseProgressChart.tsx`
  - Do: Install `recharts` in `apps/web`. Create `ExerciseProgressChart` as a `"use client"` component. Props: `exerciseId`, optional `periodDays`. Component calls `useQuery(api.analytics.getExerciseProgress)` internally (self-fetching pattern per D020). Renders Recharts `LineChart` inside `ResponsiveContainer` with 3 `Line` elements. Dual Y-axes: left for weight/1RM (kg), right for volume (kg). XAxis shows dates as "MMM d". Tooltip shows all 3 values with units via `formatWeight`/`displayWeight`. Add `data-exercise-chart` attribute on container. Handle empty state (< 2 data points) with informative message. Handle loading state.
  - Verify: `pnpm turbo typecheck --force` — 0 errors. Component file exists and exports default.
  - Done when: Chart component compiles, handles empty/loading states, and uses real `useQuery` subscription for reactive data.

- [x] **T03: Exercise detail page + ExerciseCard navigation link** `est:30m`
  - Why: Wires the chart into a user-facing page and connects the navigation from ExerciseCard. Without this, there's no way for users to see the chart. This closes the integration loop for S02.
  - Files: `apps/web/src/app/exercises/[id]/page.tsx`, `apps/web/src/components/exercises/ExerciseCard.tsx`, `apps/web/src/components/exercises/ExerciseList.tsx`
  - Do: Create `/exercises/[id]/page.tsx` — `"use client"` page using `useParams()` to get exercise ID. Shows exercise name, muscle group badges, equipment, instructions, PR records (from `useQuery(getPersonalRecords)`), and the `ExerciseProgressChart`. Add time period selector (tabs/pills for 30d, 90d, 6mo, 1yr, All Time — default All Time per D048). Wrap ExerciseCard in a Next.js `Link` to `/exercises/${exercise._id}`. Verify ExercisePicker does NOT reuse ExerciseCard (confirmed in research — safe to add Link). Follow existing layout pattern (max-w-5xl, gray-50 bg). Add back navigation link to `/exercises`.
  - Verify: `pnpm turbo typecheck --force` — 0 errors. All existing verify scripts pass (regression check). `npx tsx packages/backend/scripts/verify-s02-m02.ts` — 8/8 still pass.
  - Done when: Exercise detail page renders with chart + PRs + info, ExerciseCard links to it, typecheck passes across all packages, all verification scripts pass.

## Files Likely Touched

- `packages/backend/convex/analytics.ts` — **new** — `getExerciseProgress` query
- `packages/backend/convex/lib/prDetection.ts` — export `estimateOneRepMax`
- `packages/backend/convex/testing.ts` — add `testGetExerciseProgress`
- `packages/backend/scripts/verify-s02-m02.ts` — **new** — 8-check verification script
- `apps/web/package.json` — add `recharts` dependency
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — **new** — Recharts chart component
- `apps/web/src/app/exercises/[id]/page.tsx` — **new** — exercise detail page
- `apps/web/src/components/exercises/ExerciseCard.tsx` — add Link wrapper
- `apps/web/src/components/exercises/ExerciseList.tsx` — pass exercise ID to card (if needed)
