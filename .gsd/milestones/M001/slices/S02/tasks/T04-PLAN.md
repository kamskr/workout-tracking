---
estimated_steps: 5
estimated_files: 8
---

# T04: Active workout page with exercise picker, set logging, and duration timer

**Slice:** S02 — Workout CRUD & Active Workout Session
**Milestone:** M001

## Description

Build the active workout page — the core user loop and most complex page in M001. The user navigates to `/workouts/active`, an in-progress workout is automatically created or resumed, they add exercises via a picker modal, log sets with weight/reps, see a running duration timer, and finish the workout (redirecting to history). This task wires together all T01 backend functions, T03 unit conversion, and S01's exercise listing into a cohesive interactive flow. Delivers R002 (workout CRUD from UI), R008 (unit-aware weight input/display), and R009 (visible running timer).

## Steps

1. **Create `ExercisePicker.tsx`** — Modal/dialog for adding exercises to the workout:
   - Reuses `listExercises` query from S01 with filter support (muscle group, equipment, search)
   - Shows a scrollable list of exercises with name + badges
   - Click on an exercise calls `addExerciseToWorkout` mutation and closes picker
   - Includes search input and filter dropdowns (reuse filter logic from ExerciseFilters pattern)
   - Controlled open/close via props from parent

2. **Create `SetRow.tsx` and `WorkoutExerciseItem.tsx`** — Per-exercise set logging:
   - `SetRow`: single row with setNumber label, weight input (number), reps input (number), warmup toggle checkbox, delete button. Weight input shows placeholder in user's unit. On blur/change, converts lbs→kg via `lbsToKg` before calling `updateSet` mutation. Displays existing weight via `displayWeight(weight, unit)`. New sets use `logSet` mutation.
   - `WorkoutExerciseItem`: shows exercise name (from joined data), list of SetRows, "Add Set" button (calls `logSet` with empty weight/reps — user fills in via SetRow update). "Remove Exercise" button with confirmation. Receives exercise data from `getWorkoutWithDetails`.

3. **Create `WorkoutExerciseList.tsx`, `ActiveWorkoutHeader.tsx`, and `UnitToggle.tsx`**:
   - `WorkoutExerciseList`: ordered list of `WorkoutExerciseItem` components, "Add Exercise" button at bottom that opens ExercisePicker.
   - `ActiveWorkoutHeader`: workout name (editable inline or static for now), running duration timer (client-side `setInterval` computing `Math.floor((Date.now() - startedAt) / 1000)` and formatting via `formatDuration`), "Finish Workout" button (calls `finishWorkout`, then `router.push("/workouts")`). Timer updates every second.
   - `UnitToggle`: simple kg/lbs toggle button or segmented control. Reads current preference from `getPreferences` query. Calls `setUnitPreference` mutation on toggle. Place in the header area.

4. **Create `ActiveWorkout.tsx`** — Main orchestrator component:
   - Uses `useQuery(api.workouts.getActiveWorkout)` to check for existing in-progress workout
   - If no active workout: calls `createWorkout` mutation on mount, then queries the new workout
   - If active workout exists: uses `useQuery(api.workouts.getWorkoutWithDetails, { id: activeWorkoutId })` for full data
   - Handles loading states: "Starting workout..." while creating, spinner while loading details
   - Composes: `ActiveWorkoutHeader` + `UnitToggle` + `WorkoutExerciseList` + `ExercisePicker` (modal state managed here)
   - Passes down all data and mutation callbacks to children

5. **Create `apps/web/src/app/workouts/active/page.tsx`** — Route page:
   - `"use client"` page component
   - Renders `ActiveWorkout` in the standard page layout (max-w-5xl container)
   - Page title "Active Workout"

## Must-Haves

- [ ] Navigating to `/workouts/active` auto-creates an inProgress workout if none exists (R002)
- [ ] Existing inProgress workout is resumed, not duplicated (R002)
- [ ] Exercise picker uses S01's `listExercises` with search and filters (R002)
- [ ] Sets can be logged with weight and reps; weight input respects unit preference (R002, R008)
- [ ] Weight stored in kg regardless of display unit (D003)
- [ ] Running duration timer visible and ticking from `startedAt` (R009)
- [ ] "Finish Workout" button transitions workout to completed and redirects to `/workouts` (R002)
- [ ] Exercises and sets reflect Convex realtime updates (no manual refresh needed)
- [ ] All mutations (add exercise, log set, finish workout) call T01 functions via `useMutation`

## Verification

- `pnpm turbo typecheck` — all packages compile
- Browser flow: navigate to `/workouts/active` → workout auto-created → click "Add Exercise" → picker opens → select an exercise → exercise appears in workout → click "Add Set" → fill weight/reps → set logged → timer visible and ticking → click "Finish Workout" → redirected to `/workouts` → completed workout appears in history list with correct duration
- Browser: change unit to lbs → weight inputs/displays update → log a set in lbs → verify stored value is in kg (check Convex dashboard)
- Browser: navigate away and back to `/workouts/active` → existing workout resumed (not new one created)

## Observability Impact

- Signals added/changed: Client-side timer is display-only (no state sync). All data mutations go through Convex (observable in dashboard). Exercise picker search uses the same query as `/exercises` page.
- How a future agent inspects this: Navigate to `/workouts/active` in browser to see the active workout state. Check Convex dashboard → workouts table for document status. Console logs from Convex client show query/mutation activity.
- Failure state exposed: If `createWorkout` fails, the component stays in "Starting workout..." state (visible). If a mutation fails, Convex surfaces the error via React error boundary or console. If no exercises exist (seed not run), the picker shows empty state.

## Inputs

- `packages/backend/convex/workouts.ts` — createWorkout, getActiveWorkout, getWorkoutWithDetails, finishWorkout (from T01)
- `packages/backend/convex/workoutExercises.ts` — addExerciseToWorkout, removeExerciseFromWorkout (from T01)
- `packages/backend/convex/sets.ts` — logSet, updateSet, deleteSet (from T01)
- `packages/backend/convex/userPreferences.ts` — getPreferences, setUnitPreference (from T01)
- `packages/backend/convex/exercises.ts` — listExercises (from S01)
- `apps/web/src/lib/units.ts` — formatWeight, displayWeight, lbsToKg, formatDuration (from T03)
- `apps/web/src/components/common/button.tsx` — Button component
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — filter UI pattern reference

## Expected Output

- `apps/web/src/app/workouts/active/page.tsx` — active workout route
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — main orchestrator
- `apps/web/src/components/workouts/ActiveWorkoutHeader.tsx` — name, timer, finish button
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — exercise list with add button
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — single exercise with sets
- `apps/web/src/components/workouts/SetRow.tsx` — set input row with weight/reps/warmup
- `apps/web/src/components/workouts/ExercisePicker.tsx` — exercise selection modal
- `apps/web/src/components/workouts/UnitToggle.tsx` — kg/lbs preference toggle
