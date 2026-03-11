---
id: S04
parent: M001
milestone: M001
provides:
  - Rest timer auto-starts after logging a set with correct duration from 4-level priority chain
  - Visual circular countdown (SVG ring) with MM:SS, pause/resume, skip, ±15s adjust
  - Per-exercise rest duration configuration (inline expandable control persisted to workoutExercises.restSeconds)
  - User-level default rest seconds preference (persisted to userPreferences.defaultRestSeconds)
  - Completion beep via Web Audio API
  - Timer state management via React context (local only, no Convex sync)
  - updateRestSeconds and setDefaultRestSeconds backend mutations (auth-gated, ownership-verified)
  - formatRestTime utility function
  - verify-s04.ts verification script (6 checks)
requires:
  - slice: S02
    provides: logSet mutation, active workout screen, getWorkoutWithDetails query, userPreferences
  - slice: S01
    provides: exercises table with defaultRestSeconds field
affects:
  - S06
key_files:
  - apps/web/src/components/workouts/RestTimerContext.tsx
  - apps/web/src/components/workouts/RestTimerDisplay.tsx
  - apps/web/src/components/workouts/RestDurationConfig.tsx
  - apps/web/src/components/workouts/ActiveWorkout.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - packages/backend/convex/workoutExercises.ts
  - packages/backend/convex/userPreferences.ts
  - packages/backend/scripts/verify-s04.ts
  - apps/web/src/lib/units.ts
key_decisions:
  - D030 — Superset rest timer starts after any set, no shared timer logic (simplest safe interpretation)
  - D031 — Rest duration 4-level priority chain (workoutExercise → exercise default → user pref → 60s)
  - D032 — Timer accuracy via Date.now() arithmetic from stored endTime, not counter decrement
patterns_established:
  - Timer state machine (idle → running → paused → completed → idle) in React context with mutable refs for interval math, React state for rendering
  - Two-phase mount animation (shouldRender + visible) for smooth enter/exit transitions
  - Web Audio API beep with lazy AudioContext creation (graceful no-op if unavailable)
  - RestDurationConfig uses expandable inline pattern (clock badge → adjust controls) to minimize clutter
  - Props threaded through list component rather than per-item queries for user preferences
observability_surfaces:
  - verify-s04.ts script (exit 0/1 with 6 named PASS/FAIL checks)
  - Timer context exposes { status, remainingSeconds, configuredDuration, exerciseName } via React DevTools
  - data-testid attributes on rest-timer-display, rest-timer-time, rest-duration-config
  - Mutations throw descriptive errors ("Workout exercise not found", "does not belong to user", "not in progress")
  - console.error("[RestDurationConfig]") on mutation failures
  - console.warn("[RestTimer]") on AudioContext creation failure
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T03-SUMMARY.md
duration: 35m
verification_result: passed
completed_at: 2026-03-11
---

# S04: Rest Timer

**Rest timer auto-starts after logging a set with circular SVG countdown, pause/resume/skip/±15s controls, per-exercise rest duration configuration, and completion beep — all integrated into the active workout flow.**

## What Happened

Built the rest timer feature across three tasks:

**T01 — Backend & utilities:** Added `updateRestSeconds` mutation to `workoutExercises.ts` (auth-gated, ownership-verified via existing pattern) and `setDefaultRestSeconds` mutation to `userPreferences.ts` (upsert pattern matching `setUnitPreference`). Created test helpers in `testing.ts` and a 6-check verification script (`verify-s04.ts`) proving both mutations and the rest duration priority chain. Added `formatRestTime(seconds)` utility returning "M:SS" format.

**T02 — Timer context & display:** Created `RestTimerContext` with a full state machine (idle → running → paused → completed → idle). Timer uses `Date.now()` arithmetic from a stored `endTime` for accuracy across tab switches — a 100ms `setInterval` recomputes remaining time from wall clock rather than decrementing a counter. Mutable refs hold interval math values to avoid stale-closure issues; React state drives rendering only. `startTimer()` replaces any active timer (no stacking). Created `RestTimerDisplay` as a floating fixed-position component with SVG circular progress ring (stroke-dasharray/offset technique), MM:SS time, exercise name label, and status-dependent controls. Completion triggers an 880Hz sine beep via Web Audio API with lazy AudioContext creation.

**T03 — Integration:** Wrapped `ActiveWorkout` children in `RestTimerProvider`. Rendered `RestTimerDisplay` inside the active workout layout. In `WorkoutExerciseItem`, after `logSet` resolves, the priority chain computes rest duration: `workoutExercise.restSeconds ?? exercise.defaultRestSeconds ?? userDefaultRestSeconds ?? 60`. Duration of 0 skips timer start (stretches, cardio). Created `RestDurationConfig` — an inline expandable control per exercise showing current rest time with ±15s buttons and reset option, calling `updateRestSeconds` to persist overrides. `userDefaultRestSeconds` is threaded from preferences through the component tree as a prop.

## Verification

- `pnpm turbo typecheck --force` — **3/3 packages compile** with zero errors
- `npx tsx packages/backend/scripts/verify-s04.ts` — **6/6 checks pass**:
  - R004-1: updateRestSeconds sets restSeconds on workoutExercise ✅
  - R004-2: updateRestSeconds with undefined clears restSeconds ✅
  - R004-3: setDefaultRestSeconds sets defaultRestSeconds on userPreferences ✅
  - R004-4: WE restSeconds takes precedence over exercise default and user pref ✅
  - R004-5: When WE restSeconds is undefined, exercise.defaultRestSeconds is used ✅
  - R004-6: Priority chain resolves correctly for fallback scenario ✅
- TypeScript compilation of RestTimerContext, RestTimerDisplay, RestDurationConfig, and all integration points (ActiveWorkout, WorkoutExerciseItem, WorkoutExerciseList) ✅

## Requirements Advanced

- R004 — Rest Timer: fully implemented on web — auto-start after set log, visual circular countdown, pause/resume/skip/±15s adjust, per-exercise config, user-level default, completion beep, priority chain

## Requirements Validated

- R004 — Rest Timer: backend mutations proven by 6-check verification script (updateRestSeconds, setDefaultRestSeconds, priority chain resolution). UI components compile with full type safety. Timer state machine covers all specified behaviors (auto-start, pause, resume, skip, adjust, no-timer-for-zero). Mobile platform deferred to S06.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- `WorkoutExerciseList.tsx` was modified (not listed in plan's "Files Likely Touched") to thread `userDefaultRestSeconds` prop from ActiveWorkout to WorkoutExerciseItem — necessary for the prop-threading pattern.
- Used `"defaultRestSeconds" in preferences` TypeScript guard instead of direct property access to handle the union type from `getPreferences` fallback object. Functionally equivalent.

## Known Limitations

- Timer is local-only (no Convex sync) — per D008, this is intentional. Timer state is lost on page refresh.
- Superset exercises don't share a collective rest timer — each set log triggers independently (D030). A shared "rest only after last exercise in the round" pattern could be added later.
- Completion notification is audio-only (Web Audio beep). Browser notification API integration deferred.
- Timer does not survive app/browser closing. Background timer persistence deferred to S06 mobile work.

## Follow-ups

- none

## Files Created/Modified

- `packages/backend/convex/workoutExercises.ts` — added `updateRestSeconds` mutation
- `packages/backend/convex/userPreferences.ts` — added `setDefaultRestSeconds` mutation
- `packages/backend/convex/testing.ts` — added `testUpdateRestSeconds` and `testSetDefaultRestSeconds` helpers
- `packages/backend/scripts/verify-s04.ts` — new verification script with 6 checks
- `apps/web/src/lib/units.ts` — added `formatRestTime(seconds)` utility
- `apps/web/src/components/workouts/RestTimerContext.tsx` — new: React context with timer state machine, provider, hook, Web Audio beep
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — new: floating circular countdown UI with SVG ring and controls
- `apps/web/src/components/workouts/RestDurationConfig.tsx` — new: inline expandable per-exercise rest duration config
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — wrapped in RestTimerProvider, renders RestTimerDisplay, extracts userDefaultRestSeconds
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — calls startTimer after logSet, renders RestDurationConfig, extended ExerciseItemData type
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — accepts and passes userDefaultRestSeconds prop

## Forward Intelligence

### What the next slice should know
- The rest timer is fully local state (React context) — S05 templates don't need to interact with it at all. Templates store exercise configuration, not timer state.
- `workoutExercises.restSeconds` is persisted per workout-exercise and survives workout completion — templates could optionally carry this forward when loading.
- `userPreferences` now has two fields: `weightUnit` and `defaultRestSeconds`. The upsert pattern in both setters includes defaults for the other field.

### What's fragile
- The `getPreferences` fallback returns `{ weightUnit: "kg" }` without `defaultRestSeconds` — any consumer must handle this union type with an `in` check or optional chaining. This affects any new component reading user preferences.
- The two-phase mount animation (shouldRender + visible) in RestTimerDisplay has a `requestAnimationFrame` timing dependency — could be flaky in tests that don't simulate animation frames.

### Authoritative diagnostics
- `verify-s04.ts` against a live Convex backend — proves both mutations and the priority chain end-to-end
- Timer context values in React DevTools — shows exact state machine position and remaining time
- `data-testid` attributes on timer components — stable selectors for any future automated testing

### What assumptions changed
- No assumptions changed. The slice plan was accurate and all tasks completed as specified.
