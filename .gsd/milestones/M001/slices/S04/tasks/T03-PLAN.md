---
estimated_steps: 5
estimated_files: 4
---

# T03: Wire timer into ActiveWorkout and WorkoutExerciseItem

**Slice:** S04 — Rest Timer
**Milestone:** M001

## Description

Connect the RestTimerContext and RestTimerDisplay into the active workout flow. This is the integration task that makes the feature work end-to-end: wrapping the active workout in the timer provider, triggering the timer after set logging, displaying the countdown in the workout UI, and adding per-exercise rest duration configuration. Also adds a global default rest seconds setting to the active workout header area.

## Steps

1. **Wrap ActiveWorkout in RestTimerProvider** — In `ActiveWorkout.tsx`, import `RestTimerProvider` from `RestTimerContext`. Wrap the returned JSX (header + exercise list + picker) inside `<RestTimerProvider>`. Render `<RestTimerDisplay />` inside the provider, after `ActiveWorkoutHeader` and before `WorkoutExerciseList`. This gives both the exercise items (trigger) and the display (visual) access to the same timer context.

2. **Trigger timer from WorkoutExerciseItem after set log** — In `WorkoutExerciseItem.tsx`:
   - Import `useRestTimer` from RestTimerContext.
   - Accept `userDefaultRestSeconds` as an optional prop (passed from parent).
   - In `handleAddSet`, after `logSet` resolves, compute rest duration: `data.workoutExercise.restSeconds ?? data.exercise?.defaultRestSeconds ?? userDefaultRestSeconds ?? 60`. If duration > 0, call `startTimer(duration, data.exercise?.name ?? "Exercise")`. If duration === 0, don't start timer.
   - The `data.exercise` object already includes `defaultRestSeconds` from `getWorkoutWithDetails` (confirmed in research). The `data.workoutExercise` already includes `restSeconds` from the schema.

3. **Pass userDefaultRestSeconds through the component tree** — In `ActiveWorkout.tsx`, extract `preferences?.defaultRestSeconds` and pass it to `WorkoutExerciseList` as a prop. In `WorkoutExerciseList.tsx`, pass it through to each `WorkoutExerciseItem`. This avoids each item needing its own `useQuery` for preferences.

4. **Create RestDurationConfig component** — New file `RestDurationConfig.tsx`. An inline control showing the current rest duration for an exercise (formatted as "M:SS" via `formatRestTime`). Shows −15s / +15s buttons and a "Reset" option (clears override to use default). Calls `updateRestSeconds` mutation on change. Renders compactly in the exercise header area (next to muscle group / equipment text). Props: `workoutExerciseId`, `currentRestSeconds` (the resolved value), `isOverride` (whether workoutExercise.restSeconds is set vs inherited).

5. **Wire RestDurationConfig into WorkoutExerciseItem** — Add RestDurationConfig below the exercise name / previous performance in the header section. Compute `isOverride = data.workoutExercise.restSeconds !== undefined`. Compute `currentRestSeconds` from the priority chain (same logic as timer trigger but without user default — that's the fallback the config doesn't show). Show a small clock icon + rest time that expands to the config controls on click/tap.

## Must-Haves

- [ ] `ActiveWorkout.tsx` wraps children in `RestTimerProvider`
- [ ] `RestTimerDisplay` renders inside ActiveWorkout when timer is active
- [ ] `WorkoutExerciseItem` calls `startTimer` after successful `logSet` with correct duration from priority chain
- [ ] Timer does NOT start for exercises with resolved rest duration of 0
- [ ] `userDefaultRestSeconds` flows from preferences through to WorkoutExerciseItem
- [ ] `RestDurationConfig` renders per-exercise rest time with +/- controls
- [ ] `RestDurationConfig` calls `updateRestSeconds` mutation to persist changes
- [ ] `RestDurationConfig` "Reset" option clears override (sets restSeconds to undefined)
- [ ] `pnpm turbo typecheck` passes

## Verification

- `pnpm turbo typecheck` — all 3 packages compile with zero errors
- `npx tsx packages/backend/scripts/verify-s04.ts` — still passes (backend unchanged, confirms mutations still work)
- Manual inspection (if Clerk auth allows): navigate to /workouts/active, add an exercise, log a set → timer should appear with circular countdown

## Observability Impact

- Signals added/changed: Timer start is triggered from `handleAddSet` callback — the rest duration used is derived from a deterministic priority chain that can be inspected by reading the exercise and workoutExercise data in Convex dashboard.
- How a future agent inspects this: Timer context values via React DevTools. `workoutExercises.restSeconds` in Convex dashboard. `verify-s04.ts` for backend contract. `pnpm turbo typecheck` for integration correctness.
- Failure state exposed: If `startTimer` is called with incorrect arguments, TypeScript compilation will catch type mismatches. Runtime timer errors are visible in browser console.

## Inputs

- `apps/web/src/components/workouts/RestTimerContext.tsx` — `RestTimerProvider`, `useRestTimer` (from T02)
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — countdown display component (from T02)
- `packages/backend/convex/workoutExercises.ts` — `updateRestSeconds` mutation (from T01)
- `apps/web/src/lib/units.ts` — `formatRestTime` utility (from T01)
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — current orchestrator (wraps with provider)
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — current component (adds timer trigger + config)
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — passthrough for userDefaultRestSeconds prop
- S02 Forward Intelligence: `getWorkoutWithDetails` returns full exercise docs including `defaultRestSeconds`

## Expected Output

- `apps/web/src/components/workouts/ActiveWorkout.tsx` — modified: wraps in RestTimerProvider, renders RestTimerDisplay, passes userDefaultRestSeconds
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — modified: calls startTimer after logSet, renders RestDurationConfig
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — modified: passes userDefaultRestSeconds prop through to items
- `apps/web/src/components/workouts/RestDurationConfig.tsx` — new file: inline rest duration configuration control
