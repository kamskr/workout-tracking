# S04: Rest Timer — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Backend mutations are verified programmatically via verify-s04.ts (6 checks proving CRUD and priority chain). Timer UI behavior (countdown, controls, beep) requires human visual/auditory verification in a running browser — these are inherently interactive experiences that compilation alone doesn't prove.

## Preconditions

- Convex dev backend running (`npx convex dev` in `packages/backend/`)
- Web app running (`pnpm dev` in `apps/web/`)
- User signed in via Clerk
- At least one exercise exists in the library (seed data loaded)
- An active workout with at least one exercise added

## Smoke Test

Log a set in an active workout → rest timer appears as a floating circular countdown in the bottom-right corner with the exercise name and MM:SS time counting down.

## Test Cases

### 1. Timer auto-starts after logging a set

1. Start a new workout or resume an existing one
2. Add an exercise (e.g., Bench Press)
3. Enter weight and reps for the first set, click "Add Set" / log the set
4. **Expected:** A floating circular timer appears in the bottom-right with ~60s countdown (or exercise default), exercise name displayed, blue ring animating counterclockwise

### 2. Pause and resume timer

1. While timer is running, click the pause button
2. **Expected:** Timer freezes, ring turns amber, pause button becomes resume button
3. Click resume
4. **Expected:** Timer continues counting down from where it paused, ring returns to blue

### 3. Skip timer

1. While timer is running (or paused), click the skip button (X)
2. **Expected:** Timer immediately disappears with fade-out animation

### 4. Adjust timer ±15s

1. While timer is running, click "+15s" button
2. **Expected:** Remaining time increases by 15 seconds, ring proportion updates
3. Click "−15s" button
4. **Expected:** Remaining time decreases by 15 seconds (clamped at 0)

### 5. Timer completion with beep

1. Let the timer count down to 0 (or set a short rest duration first)
2. **Expected:** Ring turns green, shows "Done!" text with checkmark, an audible beep plays, then timer auto-clears after ~3 seconds

### 6. Timer replaces on consecutive set logs

1. While timer is running, log another set for the same or different exercise
2. **Expected:** Timer resets to new duration for the new exercise — does not stack or show two timers

### 7. Per-exercise rest duration configuration

1. In the exercise header area, find the clock icon / rest time badge
2. Click it to expand configuration controls
3. Click "+15s" to increase rest duration
4. **Expected:** Rest time display updates, a blue dot indicator appears showing override is set
5. Log a new set for this exercise
6. **Expected:** Timer starts with the configured override duration, not the default

### 8. Reset per-exercise override

1. Expand the rest duration config for an exercise with a custom override (blue dot visible)
2. Click "Reset"
3. **Expected:** Blue dot disappears, rest time reverts to exercise/user default
4. Log a set
5. **Expected:** Timer starts with the default duration

### 9. Zero rest duration skips timer

1. Configure an exercise's rest duration to 0s (reduce with −15s until 0:00)
2. Log a set for that exercise
3. **Expected:** No timer appears — logging completes without triggering countdown

### 10. Timer clears on workout finish

1. While timer is running, finish the workout
2. **Expected:** Timer disappears as part of navigation away from active workout

## Edge Cases

### Timer survives tab switch

1. Start a timer, switch to another browser tab for 10+ seconds, switch back
2. **Expected:** Timer shows correct remaining time (not paused or drifted) — Date.now() arithmetic ensures accuracy

### Rapid set logging

1. Log 3 sets in rapid succession (click Add Set repeatedly)
2. **Expected:** Timer resets each time to the latest exercise's rest duration — no stacking, no visual glitches

### Very long rest duration

1. Configure rest to 300s (5 minutes) via repeated +15s
2. **Expected:** Timer displays "5:00" and counts down normally, ring animation is proportional

## Failure Signals

- Timer does not appear after logging a set
- Timer shows NaN or negative time
- Pause/resume does not work (timer keeps running or won't restart)
- No beep on completion (check browser audio permissions)
- Per-exercise config changes don't persist (check Convex dashboard for workoutExercises.restSeconds)
- Timer stacks (multiple timers visible simultaneously)
- Timer drift after tab switch (shows wrong time)

## Requirements Proved By This UAT

- R004 — Rest Timer Between Sets: auto-start after set log, visual countdown, configurable per exercise, manual adjust/pause/skip, completion notification (beep). Backend priority chain (4-level) proven by verify-s04.ts. UI integration proven by typecheck + this UAT's manual verification.

## Not Proven By This UAT

- R004 mobile behavior — rest timer on Expo/React Native deferred to S06
- Browser notification API integration — only Web Audio beep is implemented, no system notifications
- Background timer persistence — timer state is lost on page refresh (local-only by design, D008)
- Shared superset rest timer — each set triggers independently (D030), no collective rest after a superset round

## Notes for Tester

- The beep requires a prior user interaction on the page (browser autoplay policy). If no beep plays, click anywhere on the page first, then let a timer complete.
- The timer is intentionally local state — refreshing the page clears it. This is by design (D008).
- `verify-s04.ts` must be run against a live Convex backend (`npx convex dev` running). It tests backend mutations only, not UI.
- React DevTools can inspect timer state on any component inside the active workout (look for RestTimerContext values: status, remainingSeconds, configuredDuration, exerciseName).
