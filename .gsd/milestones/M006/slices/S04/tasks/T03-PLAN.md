# T03: Refresh workout and exercise detail internals for premium active-use flows

**Goal:** Bring the workout and exercise-detail internals up to the new Apple Fitness+ standard so the app’s highest-frequency logging and review surfaces feel as polished as the surrounding shell.
**Why:** `/workouts` and `/exercises/[id]` are already partially refreshed at the route level, but their core cards, lists, set-entry surfaces, and chart wrappers still advertise the old design system.

## Inputs

- S03 route-shell adoption pattern and primitives
- T01 route framing for `/workouts/active` and `/exercises/[id]`
- Existing workout-domain observability hooks such as `data-pr-badge`

## Must-Haves

- `WorkoutHistory`, `WorkoutCard`, `ActiveWorkout`, `WorkoutExerciseItem`, and `WorkoutExerciseList` adopt shared premium surface treatments
- `ExerciseProgressChart` and surrounding exercise-detail containers visually align with the refreshed shell
- High-frequency workout interactions remain behaviorally unchanged
- Existing workout/exercise feature hooks remain available for runtime proof

## Files

- `apps/web/src/components/workouts/ActiveWorkout.tsx`
- `apps/web/src/components/workouts/WorkoutHistory.tsx`
- `apps/web/src/components/workouts/WorkoutCard.tsx`
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx`
- `apps/web/src/components/exercises/ExerciseProgressChart.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/(app)/exercises/[id]/page.tsx`

## Steps

1. Identify the old visual primitives still leaking through workout history, active workout, superset containers, previous-performance rows, set-entry cards, and exercise-detail chart/instruction wrappers.
2. Replace those with shared surface classes or narrowly-scoped new semantic utilities in `globals.css`, keeping the visual hierarchy warm, rounded, and premium without adding brittle one-off class stacks.
3. Tighten the already-refreshed `/workouts` route by upgrading `WorkoutHistory` and `WorkoutCard`, not just the newly-adopted `/workouts/active` route.
4. Preserve all workout logic, mutation wiring, and observability hooks including PR badge selectors and any route-specific section hooks added in T01.
5. Run typecheck and fix any component prop drift introduced by the reskin.

## Observability Impact

- The refreshed workout surfaces must preserve existing route and feature selectors, especially `data-pr-badge` on PR rows and the route-level `data-route` / `data-route-section` hooks already added in T01.
- Future agents should inspect premium-surface regressions through `apps/web/src/components/workouts/*`, `apps/web/src/components/exercises/ExerciseProgressChart.tsx`, and the exercise-detail route wrapper in `apps/web/src/app/(app)/exercises/[id]/page.tsx` before blaming route-shell framing.
- Failure state remains inspectable through DOM selectors and package-level typecheck output: UI regressions should show up as missing/relocated workout selectors in browser proof, while prop drift or stale class contracts should fail `pnpm --filter web-app typecheck`.

## Verification

- `pnpm --filter web-app typecheck`

## Expected Output

- Workout browse, active logging, and exercise detail views share one coherent premium design language
- Old MVP-style card treatments are removed from the core workout surfaces
- Existing behavioral and verification contracts remain intact

## Done When

- The main workout/exercise components no longer visually regress inside the refreshed shell
- No behavior or data-flow logic changed beyond presentation framing
- Web app typecheck passes
