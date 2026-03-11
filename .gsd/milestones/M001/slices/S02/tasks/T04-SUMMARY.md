---
id: T04
parent: S02
milestone: M001
provides:
  - Active workout page at /workouts/active with auto-create/resume behavior
  - Exercise picker modal with search and filter support (reuses S01 listExercises)
  - Set logging UI with weight/reps inputs, warmup toggle, unit-aware display
  - Running duration timer (client-side interval from startedAt)
  - Unit toggle (kg/lbs) calling setUnitPreference mutation
  - Finish workout flow redirecting to /workouts history
key_files:
  - apps/web/src/app/workouts/active/page.tsx
  - apps/web/src/components/workouts/ActiveWorkout.tsx
  - apps/web/src/components/workouts/ActiveWorkoutHeader.tsx
  - apps/web/src/components/workouts/WorkoutExerciseList.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/workouts/SetRow.tsx
  - apps/web/src/components/workouts/ExercisePicker.tsx
  - apps/web/src/components/workouts/UnitToggle.tsx
key_decisions:
  - SetRow uses local state for weight/reps with onBlur save pattern — avoids mutation spam on every keystroke
  - Weight conversion happens at the input boundary (lbsToKg on blur, displayWeight on render) — server always stores kg
  - ActiveWorkout uses useRef createAttempted flag to prevent duplicate workout creation during React strict mode double-renders
  - ExercisePicker is a controlled modal (open/close via parent state) rather than a route-based dialog
patterns_established:
  - Input boundary conversion pattern — convert units at component boundary (display on render, store on blur) keeping server data canonical
  - Auto-create-or-resume pattern — useEffect checks for active workout, creates if none, resumes if exists, with ref guard against double-creation
observability_surfaces:
  - Navigate to /workouts/active to see active workout state visually
  - All mutations go through Convex (observable in dashboard tables)
  - Failed createWorkout stays in "Starting workout…" spinner state (visible)
  - Convex client surfaces mutation errors via console
duration: 45m
verification_result: partial
completed_at: 2026-03-11
blocker_discovered: false
---

# T04: Active workout page with exercise picker, set logging, and duration timer

**Built complete active workout UI with exercise picker, set logging, unit toggle, duration timer, and finish flow — all 8 components created, typecheck passes.**

## What Happened

Created all 8 planned components for the active workout page:

1. **`UnitToggle.tsx`** — Segmented control (kg/lbs) reading from `getPreferences` query, calling `setUnitPreference` mutation on toggle. Styled as inline button group.

2. **`ExercisePicker.tsx`** — Modal dialog for adding exercises to workout. Reuses `ExerciseFilters` component from S01 for search/muscle group/equipment filtering. Uses `listExercises` query with dynamic filter args. Click on exercise calls `addExerciseToWorkout` mutation and closes modal. Shows loading/empty states.

3. **`SetRow.tsx`** — Single set row with weight input (number, displays in user's unit), reps input (number), warmup toggle button, and delete button. Uses local state for inputs with onBlur save pattern — converts lbs→kg via `lbsToKg` before calling `updateSet` mutation. Displays existing weight via `displayWeight(weight, unit)`.

4. **`WorkoutExerciseItem.tsx`** — Shows exercise name with muscle group/equipment badges, list of SetRows, "Add Set" button (calls `logSet`), "Remove Exercise" button with window.confirm dialog. Receives data from `getWorkoutWithDetails`.

5. **`WorkoutExerciseList.tsx`** — Ordered list of `WorkoutExerciseItem` components with empty state, "Add Exercise" button at bottom that triggers parent's picker open callback.

6. **`ActiveWorkoutHeader.tsx`** — Workout name, running duration timer (client-side `setInterval` computing elapsed seconds from `startedAt`, formatted via `formatDuration`), "In Progress" badge, `UnitToggle`, and "Finish Workout" button (calls `finishWorkout` then `router.push("/workouts")`). Timer ticks every second.

7. **`ActiveWorkout.tsx`** — Main orchestrator. Checks for existing inProgress workout via `getActiveWorkout`. Auto-creates one if none exists (with ref guard against double-creation). Uses `getWorkoutWithDetails` for full data. Manages picker modal state. Shows appropriate loading states: "Loading…", "Starting workout…", "Loading workout…".

8. **`apps/web/src/app/workouts/active/page.tsx`** — Route page rendering `ActiveWorkout` in standard layout.

## Verification

- **`pnpm turbo typecheck`** — ✅ All 3 packages compile (web-app, backend, native-app)
- **Browser verification** — NOT completed. Could not start local Convex backend (`convex-local-backend` binary not found/installed) which is required for `npx convex dev` to connect to `127.0.0.1:3210`. All browser flow verification is deferred.
- **Slice verification** — `verify-s02.ts` script not re-run (requires running Convex backend).

## Diagnostics

- Navigate to `/workouts/active` in browser (requires running Convex + Next.js dev servers)
- Check Convex dashboard → workouts table for document status
- Console logs from Convex client show query/mutation activity
- If `createWorkout` fails, component stays in "Starting workout…" state (visible)
- All mutation errors surface via Convex React error handling

## Deviations

None — all 8 planned files created as specified.

## Known Issues

- Browser verification not completed — requires local Convex backend to be running (binary was not available in this environment). The UI code compiles and follows all correct Convex API patterns, but end-to-end browser flow is unverified.
- SetRow uses initial values from props but doesn't re-sync if server value changes from another source (e.g., another tab). The `key` prop from parent should handle remounting on ID change, but in-place value updates from server won't reflect until remount.

## Files Created/Modified

- `apps/web/src/app/workouts/active/page.tsx` — Active workout route page
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — Main orchestrator with auto-create/resume logic
- `apps/web/src/components/workouts/ActiveWorkoutHeader.tsx` — Name, timer, unit toggle, finish button
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — Exercise list with add button and empty state
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Single exercise with sets and actions
- `apps/web/src/components/workouts/SetRow.tsx` — Set input row with unit-aware weight/reps
- `apps/web/src/components/workouts/ExercisePicker.tsx` — Exercise selection modal with filters
- `apps/web/src/components/workouts/UnitToggle.tsx` — kg/lbs preference toggle
