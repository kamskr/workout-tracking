---
id: T03
parent: S04
milestone: M001
provides:
  - End-to-end rest timer integration — logging a set triggers countdown with correct priority chain
  - RestDurationConfig component for per-exercise rest duration configuration
  - userDefaultRestSeconds prop threaded from preferences through component tree
key_files:
  - apps/web/src/components/workouts/ActiveWorkout.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/workouts/WorkoutExerciseList.tsx
  - apps/web/src/components/workouts/RestDurationConfig.tsx
key_decisions:
  - RestDurationConfig uses expandable inline pattern (clock badge → adjust controls) to minimize visual clutter
  - Override indicator is a small blue dot next to the rest time
  - userDefaultRestSeconds extracted from preferences via "in" check to handle union type from getPreferences fallback
patterns_established:
  - Priority chain for rest duration resolved at component level (workoutExercise.restSeconds ?? exercise.defaultRestSeconds ?? userDefaultRestSeconds ?? 60)
  - Timer start is fire-and-forget from handleAddSet callback — no await, no error handling needed (context action)
  - Props threaded through list component (ActiveWorkout → WorkoutExerciseList → WorkoutExerciseItem) rather than per-item queries
observability_surfaces:
  - data-testid="rest-duration-config" on per-exercise config control
  - console.error("[RestDurationConfig]") on mutation failures
  - Timer context values (status, remainingSeconds, exerciseName) inspectable via React DevTools
  - workoutExercises.restSeconds in Convex dashboard after config changes
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Wire timer into ActiveWorkout and WorkoutExerciseItem

**Connected rest timer end-to-end: set logging triggers countdown, per-exercise rest config with inline +/−15s controls, priority chain flows from preferences through component tree.**

## What Happened

Wrapped `ActiveWorkout` children in `RestTimerProvider` so all exercise items and the display share the same timer context. Added `RestTimerDisplay` between the header and exercise list. Threaded `userDefaultRestSeconds` from preferences through `WorkoutExerciseList` to each `WorkoutExerciseItem` as a prop.

In `WorkoutExerciseItem`, added `useRestTimer()` hook and computed `resolvedRestSeconds` via the priority chain (workoutExercise.restSeconds → exercise.defaultRestSeconds → userDefaultRestSeconds → 60). After `logSet` resolves, `startTimer(resolvedRestSeconds, exerciseName)` is called if the duration > 0. Duration of 0 skips timer start entirely.

Created `RestDurationConfig` as a new component rendered in each exercise header. Shows a clock icon + formatted rest time that expands on click to reveal −15s / +15s buttons and a Reset option (clears the override). Calls `updateRestSeconds` mutation to persist changes. The override indicator (blue dot) shows when `workoutExercise.restSeconds` is explicitly set.

Updated `ExerciseItemData` type to include `restSeconds` on workoutExercise and `defaultRestSeconds` on exercise — both already present in the Convex documents returned by `getWorkoutWithDetails`.

## Verification

- `pnpm turbo typecheck --force` — ✅ 3/3 packages compile with zero errors
- `verify-s04.ts` — not runnable (local Convex backend not running); backend unchanged in this task so prior verification (6/6) still valid
- Code review: RestTimerProvider wraps ActiveWorkout children, RestTimerDisplay renders inside provider, WorkoutExerciseItem calls startTimer after logSet, RestDurationConfig calls updateRestSeconds mutation, priority chain correctly implemented with ?? chaining

## Diagnostics

- `data-testid="rest-duration-config"` on each exercise's rest config control
- `data-testid="rest-timer-display"` and `data-testid="rest-timer-time"` on the floating timer (from T02)
- Timer context values inspectable via React DevTools on any component inside RestTimerProvider
- `workoutExercises.restSeconds` field visible in Convex dashboard after per-exercise config changes
- Mutation errors logged to `console.error("[RestDurationConfig]")` with full error object

## Deviations

- Used `"defaultRestSeconds" in preferences` check instead of direct property access to satisfy TypeScript union type from `getPreferences` (returns `{ weightUnit: "kg" }` fallback without `defaultRestSeconds`). Functionally equivalent.
- WorkoutExerciseList also modified (not listed as expected output in task plan but listed in step 3) — passes `userDefaultRestSeconds` through to items.

## Known Issues

- Local Convex backend not running so `verify-s04.ts` couldn't be re-run — backend is unchanged in this task.

## Files Created/Modified

- `apps/web/src/components/workouts/ActiveWorkout.tsx` — wrapped in RestTimerProvider, renders RestTimerDisplay, extracts and passes userDefaultRestSeconds
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — calls startTimer after logSet with priority chain, renders RestDurationConfig, extended ExerciseItemData type
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — accepts and passes userDefaultRestSeconds prop to items
- `apps/web/src/components/workouts/RestDurationConfig.tsx` — new file: inline expandable rest duration config with ±15s, reset, and updateRestSeconds mutation
