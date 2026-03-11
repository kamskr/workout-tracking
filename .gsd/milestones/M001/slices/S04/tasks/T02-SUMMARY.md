---
id: T02
parent: S04
milestone: M001
provides:
  - RestTimerProvider component for wrapping the active workout tree
  - useRestTimer hook exposing timer state + actions (start, pause, resume, skip, adjust)
  - RestTimerDisplay floating countdown component with circular SVG ring and controls
  - TimerState and TimerActions type exports for downstream consumption
  - Web Audio API completion beep (880Hz sine, graceful no-op if unavailable)
key_files:
  - apps/web/src/components/workouts/RestTimerContext.tsx
  - apps/web/src/components/workouts/RestTimerDisplay.tsx
key_decisions: []
patterns_established:
  - Timer uses Date.now() arithmetic (endTime - now) computed in 100ms setInterval, not counter decrement — accurate across tab switches and browser throttling
  - Timer state machine transitions enforced in action callbacks (e.g. pauseTimer only works when running, resumeTimer only when paused)
  - Mutable refs (endTimeRef, pausedRemainingRef, intervalRef) for interval math to avoid stale-closure issues; React state for rendering
  - AudioContext created lazily on first beep call (browser requires prior user gesture)
  - Visibility animation uses shouldRender + visible two-phase pattern (mount first, animate on next frame, unmount after transition)
observability_surfaces:
  - Timer context exposes { status, remainingSeconds, configuredDuration, exerciseName } — inspectable via React DevTools on any consuming component
  - data-testid="rest-timer-display" and data-testid="rest-timer-time" for automated testing
  - console.warn on AudioContext creation failure (non-fatal, does not break timer)
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: RestTimerContext and RestTimerDisplay component

**Built React context with full timer state machine (idle→running→paused→completed→idle) and floating circular countdown display with pause/resume, skip, and ±15s adjust controls.**

## What Happened

Created two new files implementing the core rest timer feature:

1. **RestTimerContext.tsx** — React context providing timer state and actions. The state machine supports four states: idle, running, paused, completed. Key implementation details:
   - `startTimer(seconds, exerciseName)` records `endTime = Date.now() + seconds * 1000` and starts a 100ms `setInterval`. Calling while running replaces the current timer (no stacking).
   - `pauseTimer()` captures remaining time in a ref and clears the interval. `resumeTimer()` recomputes endTime and restarts.
   - `adjustTimer(delta)` shifts endTime by delta seconds (clamped to ≥0, completes immediately at 0). Works in both running and paused states.
   - `skipTimer()` clears everything and returns to idle immediately.
   - On completion (remaining reaches 0): plays 880Hz sine beep via Web Audio API, shows "completed" state for 3 seconds, then auto-clears to idle.
   - Uses mutable refs for all interval math to avoid stale-closure issues; React state only drives rendering.
   - Cleanup on unmount clears all timers (handles workout finish / navigation away).

2. **RestTimerDisplay.tsx** — Floating fixed-position component (bottom-right, z-50). Features:
   - SVG circular progress ring (stroke-dasharray/stroke-dashoffset technique, 120px diameter). Ring color changes by status: blue=running, amber=paused, green=completed.
   - Time remaining in M:SS format using `formatRestTime` from T01.
   - Exercise name label (truncated at 140px).
   - Status-dependent controls: running shows pause/skip/±15s; paused shows resume/skip; completed shows checkmark + "Done!" text.
   - Slide-in/fade-out animation via two-phase mount: `shouldRender` controls DOM presence, `visible` controls CSS transform/opacity.
   - Only renders when timer is active (not idle).

3. **Web Audio beep** — `playCompletionBeep()` helper inside the context file. Lazily creates AudioContext on first call. Plays 880Hz sine for 200ms with quick fade-out to avoid click artifact. Gracefully no-ops with console.warn if AudioContext is unavailable or suspended.

## Verification

- `pnpm turbo typecheck` — **3/3 packages pass** with zero errors (web-app cache miss, fresh compilation)
- RestTimerContext.tsx exports: `RestTimerProvider`, `useRestTimer`, `TimerStatus`, `TimerState`, `TimerActions` ✅
- RestTimerDisplay.tsx exports: default component ✅
- Both files use `formatRestTime` from `@/lib/units` (T01 output) ✅

### Slice-level verification (partial — T02 of 3):
- [x] `pnpm turbo typecheck` — all 3 packages compile
- [x] `npx tsx packages/backend/scripts/verify-s04.ts` — all checks pass (T01, unchanged)
- [ ] TypeScript compilation of integration points (T03 — ActiveWorkout, WorkoutExerciseItem wiring)

## Diagnostics

- Timer context values (`status`, `remainingSeconds`, `configuredDuration`, `exerciseName`) are inspectable via React DevTools on any component inside `RestTimerProvider`.
- `data-testid="rest-timer-display"` on the floating container and `data-testid="rest-timer-time"` on the time display for automated testing.
- AudioContext creation failures are logged to `console.warn` with the prefix `[RestTimer]`.
- Timer state transitions are fully deterministic from the action calls — no hidden side effects.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/web/src/components/workouts/RestTimerContext.tsx` — new file: React context with timer state machine, provider, hook, and Web Audio beep
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — new file: floating circular countdown UI with SVG ring, time display, and control buttons
