---
estimated_steps: 4
estimated_files: 3
---

# T02: Install Recharts + build ExerciseProgressChart component

**Slice:** S02 — Progress Charts Per Exercise
**Milestone:** M002

## Description

Install Recharts in the web app and build the `ExerciseProgressChart` client component. The chart shows three lines (max weight, total volume, estimated 1RM) with dual Y-axes, reactive data subscription via `useQuery`, and proper empty/loading states. This is the core visual output of S02 — the S02→S04 boundary component proving the data shape renders correctly.

## Steps

1. **Install Recharts in `apps/web`** — Run `pnpm add recharts` in `apps/web/`. Verify `react-is` peer dependency is satisfied (React 19 includes it or it needs explicit install). Run `pnpm turbo typecheck --force` to confirm no type conflicts.

2. **Create `apps/web/src/components/exercises/ExerciseProgressChart.tsx`** as a `"use client"` component:
   - Props: `exerciseId: Id<"exercises">`, `periodDays?: number`
   - Internally calls `useQuery(api.analytics.getExerciseProgress, { exerciseId, periodDays })` — self-fetching pattern (D020)
   - **Loading state**: Spinner or skeleton while `useQuery` returns `undefined`
   - **Empty state**: When data has < 2 points, show a message: "Log more workouts with this exercise to see progress charts" with an appropriate icon
   - **Chart rendering** (≥ 2 data points):
     - `ResponsiveContainer` with `width="100%"` and `height={350}`
     - `LineChart` with `data` mapped from query result
     - Three `Line` elements:
       - Max Weight (blue/primary, left Y-axis) — `stroke` uses `--color-primary` or `#0d87e1`
       - Estimated 1RM (teal/green, left Y-axis) — complements primary
       - Total Volume (amber/orange, right Y-axis) — separate scale
     - **Dual Y-axes**: `<YAxis yAxisId="left" />` for weight/1RM, `<YAxis yAxisId="right" orientation="right" />` for volume
     - `XAxis` with `tickFormatter` converting epoch ms to "MMM d" via `new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })`
     - `Tooltip` with custom formatter showing values with units (weight in kg for now — unit conversion added when wired to page context in T03)
     - `Legend` to identify the three lines
     - `CartesianGrid strokeDasharray="3 3"` for readability
   - Add `data-exercise-chart` attribute on the outermost container div (D057 convention)
   - Line `dot` prop set to show dots only when data points ≤ 20 (avoid clutter with many sessions)

3. **Handle edge cases in data mapping**:
   - `estimated1RM` may be `undefined` for sessions where all sets had >15 reps — Recharts handles `undefined` by breaking the line, which is acceptable
   - Volume axis should use compact number formatting (e.g., "1.2k" for 1200) if values are large
   - Ensure the component doesn't crash if `exerciseId` is invalid (query returns empty)

4. **Typecheck** — Run `pnpm turbo typecheck --force` to confirm 0 errors across all packages. The component imports types from `@packages/backend/convex/_generated/dataModel` and `@packages/backend/convex/_generated/api`.

## Must-Haves

- [ ] `recharts` installed in `apps/web`
- [ ] `ExerciseProgressChart` is a `"use client"` component with self-fetching `useQuery`
- [ ] Three lines rendered: maxWeight, totalVolume, estimated1RM
- [ ] Dual Y-axes: left for weight/1RM, right for volume
- [ ] XAxis shows human-readable dates
- [ ] Tooltip shows all three values with labels
- [ ] Empty state for < 2 data points
- [ ] Loading state while query is undefined
- [ ] `data-exercise-chart` attribute on container
- [ ] TypeScript compiles with 0 errors

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` exists and has default export
- `recharts` present in `apps/web/package.json` dependencies

## Observability Impact

- Signals added/changed: `data-exercise-chart` CSS attribute enables `document.querySelectorAll('[data-exercise-chart]')` for browser-based chart presence detection. Follows D057 convention established in S01.
- How a future agent inspects this: Check for `[data-exercise-chart]` in browser. The component's `useQuery` subscription means chart data updates reactively when new workouts are logged.
- Failure state exposed: React error boundary or blank render if Recharts fails. `useQuery` returning `undefined` indefinitely indicates a Convex connection issue (visible in browser console).

## Inputs

- `packages/backend/convex/analytics.ts` → `getExerciseProgress` query (from T01) — the data source
- `apps/web/src/lib/units.ts` → `formatWeight`, `displayWeight` — weight formatting utilities
- `apps/web/src/app/globals.css` → `--color-primary: #0d87e1` — chart color reference
- S02-RESEARCH: Recharts 3.8.0 confirmed React 19 compatible, API shape documented

## Expected Output

- `apps/web/package.json` — `recharts` added to dependencies
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — **new** — reactive chart component with dual Y-axes, 3 lines, empty/loading states, `data-exercise-chart` attribute
