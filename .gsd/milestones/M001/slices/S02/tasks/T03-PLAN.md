---
estimated_steps: 4
estimated_files: 5
---

# T03: Unit conversion utility and workout history page

**Slice:** S02 — Workout CRUD & Active Workout Session
**Milestone:** M001

## Description

Build the unit conversion utility (R008) and the workout history page — the simplest read-only UI entry point that lists completed workouts. This establishes the `/workouts` route, the unit conversion module, and the component patterns that the active workout page (T04) will build on. The history page uses `listWorkouts` and `getPreferences` from T01, and displays workout name, date, duration, and exercise count with weight displayed in the user's preferred unit.

## Steps

1. **Create `apps/web/src/lib/units.ts`** — Unit conversion utility:
   - `KG_TO_LBS = 2.20462` constant
   - `kgToLbs(kg: number): number` — converts kg to lbs, rounds to 1 decimal
   - `lbsToKg(lbs: number): number` — converts lbs to kg, NO rounding (for storage precision)
   - `formatWeight(kg: number, unit: "kg" | "lbs"): string` — returns formatted string like "60 kg" or "132.3 lbs"
   - `displayWeight(kg: number, unit: "kg" | "lbs"): number` — returns numeric value in display unit (for input fields)
   - `formatDuration(seconds: number): string` — returns "1h 23m" or "45m" format for workout cards
   - Export `WeightUnit` type as `"kg" | "lbs"`

2. **Create `apps/web/src/components/workouts/WorkoutCard.tsx`** — Single workout summary card:
   - Props: workout data (name, date, durationSeconds, exercise count) + weightUnit
   - Displays: workout name (or "Workout" default), formatted date, formatted duration, exercise count badge
   - Follow `ExerciseCard.tsx` styling pattern: rounded-xl border, subtle hover shadow
   - Include a delete button (calls `deleteWorkout` mutation with confirmation)

3. **Create `apps/web/src/components/workouts/WorkoutHistory.tsx`** — Workout history list:
   - Uses `useQuery(api.workouts.listWorkouts)` for workout data
   - Uses `useQuery(api.userPreferences.getPreferences)` for weight unit
   - Loading state (spinner matching ExerciseList pattern)
   - Empty state with message and "Start Workout" CTA button
   - Renders `WorkoutCard` list in reverse chronological order
   - "Start Workout" button at top linking to `/workouts/active`

4. **Create `apps/web/src/app/workouts/page.tsx`** — Route page:
   - Server component wrapper (or `"use client"` if needed for hooks)
   - Page title "Workout History", description subtitle
   - Renders `WorkoutHistory` component
   - Follow the `/exercises/page.tsx` layout pattern (max-w-5xl, px-4, py-8)

## Must-Haves

- [ ] `formatWeight` respects user unit preference — "60 kg" vs "132.3 lbs" (R008)
- [ ] `lbsToKg` does NOT round (preserves precision for storage) (D003)
- [ ] `formatDuration` handles edge cases: 0 seconds → "0m", > 60 min → "1h 23m"
- [ ] WorkoutHistory shows loading spinner while Convex query resolves
- [ ] WorkoutHistory shows empty state with "Start Workout" CTA when no workouts exist
- [ ] WorkoutCard shows formatted date, duration, and exercise count
- [ ] `/workouts` route renders and is protected by existing Clerk middleware
- [ ] Delete workout button with confirmation dialog before calling mutation

## Verification

- `pnpm turbo typecheck` — all packages compile
- Browser: navigate to `/workouts` — see empty state with "Start Workout" button (or workout list if data exists from T02 script)
- Manually verify unit conversion: `formatWeight(60, "kg")` → "60 kg", `formatWeight(60, "lbs")` → "132.3 lbs"

## Observability Impact

- Signals added/changed: None — this is a read-only UI surface. Error handling delegated to Convex query reactive updates.
- How a future agent inspects this: Navigate to `/workouts` in browser, check for loading/empty/populated states. Unit conversion is a pure function — testable in isolation.
- Failure state exposed: `useQuery` returns `undefined` while loading (handled with spinner). Empty array triggers empty state. Convex connection errors surface via the existing ErrorBoundary.

## Inputs

- `packages/backend/convex/workouts.ts` — `listWorkouts` query (from T01)
- `packages/backend/convex/userPreferences.ts` — `getPreferences` query (from T01)
- `apps/web/src/components/exercises/ExerciseList.tsx` — pattern for loading/empty states
- `apps/web/src/components/exercises/ExerciseCard.tsx` — pattern for card styling
- `apps/web/src/app/exercises/page.tsx` — pattern for route page layout
- `apps/web/src/components/common/button.tsx` — Button component with variants

## Expected Output

- `apps/web/src/lib/units.ts` — unit conversion utility with kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration
- `apps/web/src/components/workouts/WorkoutCard.tsx` — workout summary card component
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — workout history list with loading/empty states
- `apps/web/src/app/workouts/page.tsx` — workout history route page
