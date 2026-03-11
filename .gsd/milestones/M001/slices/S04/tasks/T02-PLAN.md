---
estimated_steps: 4
estimated_files: 2
---

# T02: RestTimerContext and RestTimerDisplay component

**Slice:** S04 — Rest Timer
**Milestone:** M001

## Description

Build the core rest timer feature: a React context for timer state management and a floating visual countdown component. The context holds timer state and exposes actions (start, pause, resume, skip, adjust). The display renders a circular SVG countdown ring with controls. The timer uses `Date.now()` arithmetic (not decrementing a counter) for accuracy across tab switches. A completion beep plays via Web Audio API.

This task creates the two standalone files. T03 wires them into the active workout flow.

## Steps

1. **Create `RestTimerContext.tsx`** — Define the timer state machine:
   - States: `idle` | `running` | `paused` | `completed`
   - State shape: `{ status, remainingSeconds, configuredDuration, exerciseName }`
   - Actions: `startTimer(seconds, exerciseName)`, `pauseTimer()`, `resumeTimer()`, `skipTimer()`, `adjustTimer(delta)`
   - Implementation: `startTimer` records `endTime = Date.now() + seconds * 1000` and starts a `setInterval(100ms)` that computes `remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))`. When remaining hits 0, transition to `completed`, play beep, auto-clear to `idle` after 3 seconds.
   - `pauseTimer` records `pausedRemaining` and clears the interval. `resumeTimer` recomputes `endTime` from `pausedRemaining` and restarts interval.
   - `adjustTimer(delta)` shifts `endTime` by `delta * 1000` (clamped to minimum 0). If remaining would go to 0, complete immediately.
   - `startTimer` called while running replaces the current timer (clears old interval, starts fresh). No stacking.
   - Export `RestTimerProvider` (component) and `useRestTimer` (hook).

2. **Implement Web Audio beep** — Helper function `playCompletionBeep()` inside the context file. Creates an `AudioContext` lazily on first call (browser requires user gesture — the logSet click provides it). Plays a short 880Hz sine wave for 200ms. Gracefully no-ops if AudioContext is unavailable or suspended.

3. **Create `RestTimerDisplay.tsx`** — Floating fixed-position component (bottom-right corner, z-50). Only renders when timer status !== `idle`. Contains:
   - SVG circular progress ring (stroke-dasharray/stroke-dashoffset technique). Ring fills as time decreases. Diameter ~120px.
   - Time remaining in "M:SS" format using `formatRestTime` from T01.
   - Exercise name label (truncated if long).
   - Status-dependent controls:
     - Running: pause button, skip button, −15s / +15s adjust buttons
     - Paused: resume button, skip button
     - Completed: brief "Done!" state with checkmark, auto-fades
   - Clean/minimal design matching D007 (white bg, subtle shadow, rounded corners).
   - Transition animations: slide-in from bottom-right on start, fade out on complete/skip.

4. **Type safety and exports** — Ensure `RestTimerProvider` accepts `children: React.ReactNode`. Ensure `useRestTimer` throws if used outside provider. Export timer state type for potential testing use.

## Must-Haves

- [ ] RestTimerContext exports `RestTimerProvider` and `useRestTimer` hook
- [ ] Timer state machine: idle → running → paused → running → completed → idle transitions all work
- [ ] `startTimer` replaces (not stacks) existing running timer
- [ ] Timer uses `Date.now()` arithmetic for accuracy, not counter decrement
- [ ] `adjustTimer(±15)` shifts remaining time correctly (clamped to ≥ 0)
- [ ] Completion beep via Web Audio API (graceful no-op if unavailable)
- [ ] RestTimerDisplay renders circular SVG countdown with MM:SS time
- [ ] RestTimerDisplay shows pause/resume, skip, ±15s controls
- [ ] RestTimerDisplay only renders when timer is active (not idle)
- [ ] `pnpm turbo typecheck` passes

## Verification

- `pnpm turbo typecheck` — all 3 packages compile with zero errors
- Both files exist and export the expected interfaces:
  - `RestTimerContext.tsx` exports `RestTimerProvider`, `useRestTimer`
  - `RestTimerDisplay.tsx` exports default component

## Observability Impact

- Signals added/changed: Timer context exposes `{ status, remainingSeconds, configuredDuration, exerciseName }` — inspectable via React DevTools on any component consuming the context.
- How a future agent inspects this: Check the timer context values in React DevTools. The `status` field shows the current state machine position. `remainingSeconds` shows countdown progress.
- Failure state exposed: If AudioContext creation fails, the beep silently no-ops (logged to console.warn). Timer state is always inspectable via context values.

## Inputs

- `apps/web/src/lib/units.ts` — `formatRestTime` utility (created in T01)
- D007 — Clean/minimal design language (light theme, white backgrounds, subtle shadows)
- D008 — Timer state is local only (no Convex sync)
- S04-RESEARCH.md — `setInterval` pattern from ActiveWorkoutHeader.tsx, `Date.now()` accuracy approach, Web Audio beep implementation

## Expected Output

- `apps/web/src/components/workouts/RestTimerContext.tsx` — React context with timer state machine, provider, hook, and beep function
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — Floating countdown UI with circular ring, time display, and control buttons
