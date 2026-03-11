# S04: Rest Timer — Research

**Date:** 2026-03-11

## Summary

S04 delivers a rest timer that auto-starts after logging a set, with visual countdown, pause/skip/adjust controls, and configurable rest duration per exercise. Timer state is entirely local (D008 — not synced to Convex). The feature integrates into the existing active workout page (`ActiveWorkout.tsx`), triggered by the `logSet` mutation in `WorkoutExerciseItem.tsx`.

The schema and seed data are already prepared for this feature. The `exercises` table has `defaultRestSeconds` on all 144 seeded exercises (values range from 0 to 180 seconds). The `workoutExercises` table has a `restSeconds` field for per-exercise-in-workout overrides. The `userPreferences` table has `defaultRestSeconds` for a global user default. None of these are wired to any UI yet — that's S04's job.

The primary technical challenge is state management: the timer lives in the `ActiveWorkout` component tree but must be triggered from deep inside `WorkoutExerciseItem` → `handleAddSet`. This requires lifting timer state to a shared ancestor or using React context. The timer itself is a simple `setInterval` countdown — no external libraries needed.

## Recommendation

Build a pure client-side rest timer using React context for state management, `setInterval` for the countdown, and the Web Audio API for a completion sound. No backend changes needed — all schema fields already exist. The rest duration priority chain should be: workoutExercise.restSeconds override → exercise.defaultRestSeconds → userPreferences.defaultRestSeconds → hardcoded 60s fallback.

Implementation plan:
1. **RestTimerContext** — React context + provider that holds timer state (remaining seconds, isRunning, isPaused, configuredDuration, currentExerciseName). Exposes `startTimer(seconds, exerciseName)`, `pauseTimer()`, `resumeTimer()`, `skipTimer()`, `adjustTimer(delta)` actions.
2. **RestTimerDisplay** — Floating/fixed UI component showing circular countdown, time remaining, pause/skip/adjust buttons. Renders inside `ActiveWorkout` but outside the exercise list.
3. **Integration in WorkoutExerciseItem** — After `logSet` resolves, call `startTimer()` from context with the appropriate rest duration from the exercise data.
4. **Rest duration configuration** — Add an inline control per exercise to adjust rest time, persisted to `workoutExercises.restSeconds` via a new mutation.
5. **Completion notification** — Web Audio API beep + optional browser Notification API (with permission prompt).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Timer countdown | `setInterval` + React state | Standard browser API, no library needed for a single countdown timer |
| Circular progress | SVG `<circle>` with `stroke-dashoffset` | Pure CSS/SVG technique, no charting library needed for a simple ring |
| Completion sound | Web Audio API `OscillatorNode` | Built-in browser API, avoids loading audio files. 2-3 lines of code for a beep. |
| State sharing across components | React Context | Timer state needs to flow from WorkoutExerciseItem (trigger) to ActiveWorkout-level display. Context is the standard React solution. |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — `exercises.defaultRestSeconds` (optional number), `workoutExercises.restSeconds` (optional number), `userPreferences.defaultRestSeconds` (optional number) — all already defined, none wired to UI yet
- `packages/backend/data/exercises.json` — All 144 exercises have `defaultRestSeconds` values (0-180s). 0 means no rest (stretches, cardio). Typical values: 30-45s (isolation), 60-90s (compounds), 120-180s (heavy compounds like deadlifts/squats)
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — The orchestrator component. Timer context provider should wrap its children. Already loads `workoutDetails` which includes exercise data with `defaultRestSeconds`
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Contains `handleAddSet` callback that calls `logSet`. This is the trigger point for the timer. The `data.exercise` object already includes `defaultRestSeconds` from `getWorkoutWithDetails`
- `apps/web/src/components/workouts/ActiveWorkoutHeader.tsx` — Duration timer pattern using `setInterval` + `useEffect` cleanup — same pattern the rest timer will follow
- `apps/web/src/lib/units.ts` — `formatDuration` already exists but formats in minutes. Rest timer needs seconds-level formatting (e.g., "1:30"). Need a new `formatRestTime(seconds)` helper.
- `packages/backend/convex/workoutExercises.ts` — No mutation exists to update `restSeconds` on a workoutExercise. Need to add one (simple `patch` with ownership check).
- `packages/backend/convex/userPreferences.ts` — `getPreferences` already returns `defaultRestSeconds` if set. `setUnitPreference` only sets `weightUnit`. Need to add a `setDefaultRestSeconds` mutation or generalize to `updatePreferences`.

## Constraints

- **Timer state is local only (D008)** — Timer does not sync to Convex. If the user refreshes the page or opens another tab, the timer resets. This is intentional — rest periods are ephemeral.
- **No schema changes needed** — `exercises.defaultRestSeconds`, `workoutExercises.restSeconds`, and `userPreferences.defaultRestSeconds` all exist in the schema already. Only new Convex mutations for updating `restSeconds` on workoutExercises and `defaultRestSeconds` on userPreferences are needed.
- **`getWorkoutWithDetails` already returns full exercise docs** — The `exercise` object in workoutDetails includes `defaultRestSeconds`, so no additional query is needed to determine rest time for an exercise.
- **Browser-based testing blocked by Clerk CAPTCHA** — Same limitation as S02/S03. Verification via typecheck + programmatic scripts. Timer logic should be unit-testable without browser auth.
- **Web-only for S04** — Mobile (S06) will implement its own timer UI. Web timer component won't be shared.
- **Superset shared rest timers deferred** — R005 notes "grouped exercises share rest timers" but S03 explicitly deferred this to S04. Implementation: when the last set in a superset round is logged, start one shared timer. This needs superset awareness in the timer trigger logic.

## Common Pitfalls

- **setInterval drift** — `setInterval` isn't perfectly accurate. For a rest timer (30-180s), drift is negligible. But display should compute remaining time from `endTime - Date.now()` rather than decrementing a counter, to stay accurate on tab switches.
- **Multiple rapid set logs** — If a user logs 3 sets quickly, each should restart the timer (not queue 3 timers). The context's `startTimer` must replace the current timer, not stack.
- **Timer continues after workout finish** — If the user finishes the workout while a timer is running, the timer should be cleared. Need cleanup when navigating away from the active workout page.
- **Tab visibility / backgrounding** — When the browser tab is hidden, `setInterval` throttles to ~1/sec (acceptable) or may stop entirely in some browsers. Using `Date.now()` - based calculation instead of decrementing ensures accuracy on tab return.
- **Context provider placement** — The `RestTimerProvider` must wrap both `WorkoutExerciseList` (where `startTimer` is called) and the timer display component. Placing it inside `ActiveWorkout` return value is the natural spot.
- **Sound playback without user interaction** — Browsers block `AudioContext` creation until a user gesture. The first `logSet` click provides that gesture, so creating the AudioContext lazily on first timer start should work. But if the timer completes while the tab is backgrounded, the sound may not play.

## Open Risks

- **Superset rest timer sharing** — The requirement says "grouped exercises share rest timers" but the exact UX is ambiguous. Simplest interpretation: only start the timer after logging a set for the *last* exercise in the superset group for that round. This requires knowing which exercises are in the superset and whether the current set completes a round. Complexity is medium — may need to be simplified to "timer starts after any set in a superset, just like single exercises."
- **Sound may not play when tab is backgrounded** — Web Audio API may be suspended when the tab isn't visible. The timer will still fire visually when the user returns, but the audible cue may be missed. Not a blocker for M001 web-only scope; mobile (S06) can use native notifications.
- **No rest timer for `defaultRestSeconds: 0` exercises** — Stretches and some cardio exercises have 0s rest. Timer should not auto-start for these. Need to check for `> 0` before starting.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@function-creator` (110 installs) | available — useful for creating new mutations |
| Convex | `get-convex/agent-skills@convex-helpers-guide` (121 installs) | available — may help with mutation patterns |
| React timer patterns | `charleswiltgen/axiom@axiom-timer-patterns-ref` (23 installs) | available — low install count, likely not needed for simple setInterval |
| React testing | `manutej/luxor-claude-marketplace@jest-react-testing` (336 installs) | available — useful if we need to test timer hooks |

No skills are critical for this slice. The timer is straightforward React state + setInterval. The Convex function-creator skill could speed up writing the 2-3 new mutations but the patterns are already established in the codebase.

## Sources

- Schema and seed data analysis from existing codebase (`schema.ts`, `exercises.json`)
- ActiveWorkoutHeader.tsx `setInterval` pattern for duration timer — proven pattern to follow
- D008 decision: timer state is local (not synced to Convex)
- S03 summary: superset rest timer sharing deferred to S04
- R004 requirement: auto-starting countdown, configurable per exercise, pause/adjust/skip
