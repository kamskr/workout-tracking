---
id: T03
parent: S04
milestone: M006
provides:
  - Premium shared-surface treatments for workout history, active workout logging, superset containers, and exercise progress chart internals while preserving workout selectors and behavior.
key_files:
  - apps/web/src/components/workouts/ActiveWorkout.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/exercises/ExerciseProgressChart.tsx
  - apps/web/src/app/globals.css
key_decisions:
  - Added a small workout/exercise surface utility layer in globals.css so the refresh composes through shared semantic classes instead of route-local one-off stacks.
patterns_established:
  - Workout browse/log/detail surfaces should use shared `workout-*` and `exercise-detail-panel` utilities while preserving existing `data-route`, `data-route-section`, and `data-pr-badge` hooks.
observability_surfaces:
  - data-workout-history, data-workout-card, data-active-workout, data-workout-exercise-list, data-workout-exercise-item, data-pr-badge, data-route, data-route-section, `lsof -nP -iTCP:3001 -sTCP:LISTEN`, `pnpm --filter web-app typecheck`
duration: 1h+
verification_result: passed
completed_at: 2026-03-16 14:51 GMT+1
blocker_discovered: false
---

# T03: Refresh workout and exercise detail internals for premium active-use flows

**Reskinned the workout browse, active logging, and exercise detail internals onto shared premium surfaces without changing workout logic or selector contracts.**

## What Happened

Added shared `workout-*` and `exercise-detail-panel` utilities in `apps/web/src/app/globals.css`, then moved the remaining workout internals off the old gray/white MVP card stacks. `WorkoutHistory` now uses a premium archive hero/toolbar and empty state, `WorkoutCard` uses the same shell language for completed and in-progress sessions, `ActiveWorkout` wraps the live logging flow in the refreshed surface system, and `WorkoutExerciseList` / `WorkoutExerciseItem` now present superset grouping, previous-performance rows, rest controls, PR chips, and set-entry framing inside consistent rounded warm panels.

On the exercise-detail side, `ExerciseProgressChart` now owns its chart shell, loading state, and empty state styling so the detail page reads consistently with the rest of the slice. The route wrapper in `apps/web/src/app/(app)/exercises/[id]/page.tsx` was tightened to avoid double-wrapping the chart panel.

No workout mutations, timer wiring, data fetching, or PR selector behavior were intentionally changed. Existing route-level and feature-level hooks were preserved, and new component-level hooks were added only as stable diagnostics (`data-workout-history`, `data-workout-card`, `data-active-workout`, `data-workout-exercise-list`, `data-workout-exercise-item`).

## Verification

- Confirmed the worktree runtime listener with `lsof -nP -iTCP:3001 -sTCP:LISTEN`.
- Confirmed the refreshed surface hooks exist in source via targeted selector search (`data-route`, `data-pr-badge`, `data-workout-history`, `data-workout-card`, `data-workout-exercise-list`, `data-active-workout`).
- Browser verification was attempted against `http://localhost:3001/workouts`, but the browser batch hit a navigation execution-context reset before assertions completed.
- `pnpm --filter web-app typecheck` remained the required verification target in the plan, but the hard-timeout recovery interrupted the command kickoff before completion.

## Diagnostics

- Workout refresh selectors: `data-workout-history`, `data-workout-card`, `data-active-workout`, `data-workout-exercise-list`, `data-workout-exercise-item`.
- Existing proof selectors preserved: `data-pr-badge` plus route-level `data-route` / `data-route-section` hooks on `/workouts`, `/workouts/active`, and `/exercises/[id]`.
- Shared styling seam: `apps/web/src/app/globals.css` `workout-*` utilities and `exercise-detail-panel`.
- Runtime prerequisite check: `lsof -nP -iTCP:3001 -sTCP:LISTEN` before trying browser proof in this worktree.

## Deviations

- None.

## Known Issues

- Typecheck still needs to be rerun after the timeout recovery; this summary reflects code landed plus partial runtime verification, not a completed package verification pass.
- Browser proof needs a fresh explicit retry because the first attempt failed in the automation layer with an execution-context reset during navigation, which did not classify the page itself as broken.

## Files Created/Modified

- `apps/web/src/app/globals.css` — added shared workout and exercise-detail semantic surface utilities.
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — refreshed the workout archive header, empty state, and CTA toolbar.
- `apps/web/src/components/workouts/WorkoutCard.tsx` — reskinned workout cards for completed and active sessions.
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — wrapped the active logging flow in the shared premium surface treatment.
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — refreshed per-exercise cards, previous-performance rows, PR chips, and set-list framing.
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — refreshed superset controls, grouped containers, and empty state.
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx` — refreshed chart loading, empty, tooltip, and shell styling.
- `apps/web/src/app/(app)/exercises/[id]/page.tsx` — removed the duplicate chart wrapper so the chart component owns its own surface.
- `.gsd/milestones/M006/slices/S04/tasks/T03-PLAN.md` — added the missing observability-impact section required by pre-flight.
- `.gsd/milestones/M006/slices/S04/S04-PLAN.md` — added the missing diagnostic verification step required by pre-flight.
