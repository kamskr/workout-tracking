---
estimated_steps: 4
estimated_files: 3
---

# T02: PR badges in mobile WorkoutExerciseItem

**Slice:** S04 — Mobile Analytics — Charts, Heatmap & PRs
**Milestone:** M002

## Description

Add 🏆 PR badge rendering to the mobile `WorkoutExerciseItem` component. The web version (S01/T03) already shows PR badges during live workouts via `useQuery(getWorkoutPRs)` with client-side `exerciseId` filtering. The mobile version is missing `workoutId` in its type interface and has no PR query integration. This task threads `workoutId` through the component hierarchy and adds reactive PR badge display.

## Steps

1. **Add `workoutId` to `ExerciseItemData` type.** In `WorkoutExerciseItem.tsx`, add `workoutId: Id<"workouts">` to the `ExerciseItemData.workoutExercise` interface. The data returned by `getWorkoutWithDetails` already includes `workoutId` on each workoutExercise document — the type just doesn't declare it.

2. **Thread `workoutId` through component hierarchy.** Verify `ActiveWorkoutScreen` passes full `workoutExercise` objects (including `workoutId`) to `WorkoutExerciseList`, which passes them to `WorkoutExerciseItem`. The data flow already exists — we're expanding the type to include the field that's already present in the runtime data. Confirm `WorkoutExerciseList` properly passes the data through.

3. **Add PR query and badge rendering to `WorkoutExerciseItem`.** Add `useQuery(api.personalRecords.getWorkoutPRs, workoutId ? { workoutId } : "skip")` subscription. Filter results client-side by `exerciseId` using `useMemo` (D055 pattern, same as web). Render amber/gold 🏆 badge `View` with `Text` next to the exercise name when PRs exist. Use theme colors: amber background (`#FEF3C7`), amber text (`#92400E`), matching the web design language.

4. **Verify compilation and regression.** Run `pnpm turbo typecheck --force` to ensure 0 errors. Run all 8 backend verification scripts (72/72). Confirm `WorkoutExerciseItem` PR query works by inspecting the subscription pattern matches the web implementation.

## Must-Haves

- [ ] `workoutId: Id<"workouts">` added to `ExerciseItemData.workoutExercise` type
- [ ] `useQuery(api.personalRecords.getWorkoutPRs)` subscription in `WorkoutExerciseItem`
- [ ] Client-side `exerciseId` filter via `useMemo` on PR results
- [ ] Amber 🏆 badge renders for each detected PR type (weight/volume/reps)
- [ ] `pnpm turbo typecheck --force` passes with 0 errors
- [ ] 72/72 backend checks pass

## Verification

- `pnpm turbo typecheck --force` — 0 errors
- All backend verification scripts pass (72/72)
- `grep "getWorkoutPRs" apps/native/src/components/WorkoutExerciseItem.tsx` returns a match
- `grep "workoutId" apps/native/src/components/WorkoutExerciseItem.tsx` shows the type field and query usage

## Observability Impact

- Signals added/changed: `useQuery(getWorkoutPRs)` subscription adds a reactive data stream per `WorkoutExerciseItem` — same pattern as web (D055). Loading state is `undefined`, error state surfaces via Convex error handling.
- How a future agent inspects this: Check that `WorkoutExerciseItem` imports and calls `api.personalRecords.getWorkoutPRs`. Inspect the `useMemo` filter for correctness. Check badge rendering styles.
- Failure state exposed: If PR query fails, badge simply doesn't render (query returns `undefined` during loading, empty array on error). No crash path — follows web's graceful degradation.

## Inputs

- `apps/native/src/components/WorkoutExerciseItem.tsx` — current component (missing `workoutId` in type, no PR query)
- `apps/native/src/components/WorkoutExerciseList.tsx` — passes `ExerciseItemData` to `WorkoutExerciseItem`
- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — sources workout data from `getWorkoutWithDetails`
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — reference implementation of PR badge rendering (web)
- S01 Summary — `getWorkoutPRs` query returns PRs for a workout, filtered client-side by exerciseId

## Expected Output

- `apps/native/src/components/WorkoutExerciseItem.tsx` — `workoutId` in type, `useQuery(getWorkoutPRs)`, `useMemo` filter, amber 🏆 badge rendering
- No new files created — this modifies the existing component
- Clean typecheck, no regressions
