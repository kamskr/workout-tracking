# S04: Rest Timer

**Goal:** Rest timer auto-starts after logging a set with visual countdown. Configurable per exercise. Can be paused, adjusted, or skipped. Works on web.
**Demo:** User logs a set → timer appears with circular countdown showing rest time → user can pause, adjust ±15s, or skip → timer beeps on completion. User can configure rest duration per exercise inline. Timer respects priority chain: exercise override → exercise default → user preference → 60s fallback.

## Must-Haves

- Timer auto-starts after `logSet` with correct rest duration from priority chain (workoutExercise.restSeconds → exercise.defaultRestSeconds → userPreferences.defaultRestSeconds → 60s)
- Timer does NOT auto-start when rest duration resolves to 0 (stretches, cardio)
- Visual circular countdown (SVG ring) with time remaining in MM:SS format
- Pause / resume toggle
- Skip button to dismiss timer immediately
- Adjust ±15s buttons to modify remaining time mid-countdown
- Timer replaces (not stacks) on rapid consecutive set logs
- Timer clears on workout finish or navigation away
- Per-exercise rest duration configuration (inline control persisted to `workoutExercises.restSeconds`)
- User-level default rest seconds preference (persisted to `userPreferences.defaultRestSeconds`)
- Completion sound via Web Audio API (beep)
- Timer state is local only — no Convex sync (D008)

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Convex dev backend for mutations, browser for UI compilation check)
- Human/UAT required: no (timer logic verifiable programmatically; UI verified via typecheck + visual check if possible)

## Verification

- `pnpm turbo typecheck` — all 3 packages compile with zero errors
- `npx tsx packages/backend/scripts/verify-s04.ts` — verification script proving:
  - `updateRestSeconds` mutation sets `restSeconds` on a workoutExercise
  - `setDefaultRestSeconds` mutation sets `defaultRestSeconds` on userPreferences
  - Rest duration priority chain resolves correctly (exercise override > exercise default > user pref > fallback)
  - Timer does not start for `defaultRestSeconds: 0` exercises
- TypeScript compilation of RestTimerContext, RestTimerDisplay, and all integration points (ActiveWorkout, WorkoutExerciseItem)

## Observability / Diagnostics

- Runtime signals: Timer state transitions (idle → running → paused → completed → idle) are exposed via React context values — inspectable via React DevTools
- Inspection surfaces: `verify-s04.ts` script for backend contract verification. Convex dashboard for `workoutExercises.restSeconds` and `userPreferences.defaultRestSeconds` values.
- Failure visibility: Convex mutations throw descriptive errors ("Workout exercise not found", "does not belong to user"). Timer context exposes `{ status, remainingSeconds, configuredDuration }` for debugging.
- Redaction constraints: none (no secrets involved)

## Integration Closure

- Upstream surfaces consumed:
  - `convex/sets.ts` → `logSet` mutation (triggers timer start from WorkoutExerciseItem callback)
  - `convex/workouts.ts` → `getWorkoutWithDetails` (provides exercise.defaultRestSeconds + workoutExercise.restSeconds)
  - `convex/userPreferences.ts` → `getPreferences` (provides user-level defaultRestSeconds)
  - `ActiveWorkout.tsx` → orchestrator component (wraps timer context provider)
  - `WorkoutExerciseItem.tsx` → `handleAddSet` callback (calls `startTimer` after logSet)
- New wiring introduced in this slice:
  - `RestTimerContext` provider wrapping ActiveWorkout children
  - `startTimer()` call from WorkoutExerciseItem → RestTimerContext after set logging
  - `RestTimerDisplay` floating component rendered in ActiveWorkout
  - `updateRestSeconds` mutation on workoutExercises
  - `setDefaultRestSeconds` mutation on userPreferences
  - `formatRestTime` utility function
- What remains before the milestone is truly usable end-to-end:
  - S05: Workout Templates (save/load from completed workouts)
  - S06: Mobile app + cross-platform polish + realtime sync verification

## Tasks

- [x] **T01: Backend mutations, verification script, and timer utility** `est:30m`
  - Why: The timer needs backend mutations (`updateRestSeconds` on workoutExercises, `setDefaultRestSeconds` on userPreferences), test helpers for them, a verification script proving the contracts, and a `formatRestTime` utility. This establishes the backend contract and verification baseline before any UI work.
  - Files: `packages/backend/convex/workoutExercises.ts`, `packages/backend/convex/userPreferences.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s04.ts`, `apps/web/src/lib/units.ts`
  - Do: Add `updateRestSeconds` mutation to workoutExercises.ts (auth-gated, ownership verified). Add `setDefaultRestSeconds` mutation to userPreferences.ts (upsert pattern). Add corresponding test helpers to testing.ts. Create verify-s04.ts exercising both mutations + rest duration priority chain logic. Add `formatRestTime(seconds)` to units.ts returning "M:SS" format.
  - Verify: `npx tsx packages/backend/scripts/verify-s04.ts` passes all checks. `pnpm turbo typecheck` passes.
  - Done when: Both new mutations deployed and proven by verification script. formatRestTime utility exists and is tested inline in the script or programmatically.

- [x] **T02: RestTimerContext and RestTimerDisplay component** `est:40m`
  - Why: The core timer feature — React context for state management and the visual countdown component. This is the main deliverable of the slice.
  - Files: `apps/web/src/components/workouts/RestTimerContext.tsx`, `apps/web/src/components/workouts/RestTimerDisplay.tsx`
  - Do: Create RestTimerContext with provider holding timer state (status, remainingSeconds, configuredDuration, exerciseName). Expose startTimer(seconds, exerciseName), pauseTimer, resumeTimer, skipTimer, adjustTimer(delta) via context. Use `Date.now()`-based calculation (not decrement) for accuracy across tab switches. Create RestTimerDisplay as floating fixed-position component with SVG circular countdown ring, MM:SS time, pause/resume toggle, skip button, ±15s adjust buttons, exercise name label. Play completion beep via Web Audio API OscillatorNode on timer reaching 0. Timer auto-clears after a short delay post-completion.
  - Verify: `pnpm turbo typecheck` passes. Both files export expected types. RestTimerContext exports `useRestTimer` hook and `RestTimerProvider`. RestTimerDisplay renders conditionally when timer is active.
  - Done when: RestTimerContext and RestTimerDisplay compile, export correct interfaces, and implement all timer state machine transitions.

- [x] **T03: Wire timer into ActiveWorkout and WorkoutExerciseItem** `est:30m`
  - Why: Connects the timer context and display to the active workout flow — this is the integration task that makes the feature actually work end-to-end. Also adds per-exercise rest duration configuration UI.
  - Files: `apps/web/src/components/workouts/ActiveWorkout.tsx`, `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`, `apps/web/src/components/workouts/RestDurationConfig.tsx`
  - Do: Wrap ActiveWorkout children in RestTimerProvider. Render RestTimerDisplay inside ActiveWorkout (after header, before/alongside exercise list). In WorkoutExerciseItem, call `startTimer(restSeconds, exerciseName)` from `handleAddSet` after logSet resolves, computing rest duration from priority chain (workoutExercise.restSeconds ?? exercise.defaultRestSeconds ?? preferences.defaultRestSeconds ?? 60). Skip timer start if duration === 0. Create RestDurationConfig — inline control per exercise showing current rest time with +/- buttons and a reset option, calling `updateRestSeconds` mutation on change. Wire RestDurationConfig into WorkoutExerciseItem header area.
  - Verify: `pnpm turbo typecheck` passes. ActiveWorkout renders RestTimerProvider and RestTimerDisplay. WorkoutExerciseItem calls startTimer after set log. RestDurationConfig calls updateRestSeconds mutation.
  - Done when: Full integration compiles. Logging a set triggers the timer with correct rest duration. Per-exercise rest configuration is functional. Timer displays in the active workout UI.

## Files Likely Touched

- `packages/backend/convex/workoutExercises.ts` — new `updateRestSeconds` mutation
- `packages/backend/convex/userPreferences.ts` — new `setDefaultRestSeconds` mutation
- `packages/backend/convex/testing.ts` — new test helpers for both mutations
- `packages/backend/scripts/verify-s04.ts` — new verification script
- `apps/web/src/lib/units.ts` — new `formatRestTime` function
- `apps/web/src/components/workouts/RestTimerContext.tsx` — new file (context + provider + hook)
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — new file (visual countdown UI)
- `apps/web/src/components/workouts/RestDurationConfig.tsx` — new file (per-exercise config control)
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — wrap with RestTimerProvider, add RestTimerDisplay
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — call startTimer after logSet, add RestDurationConfig
