---
id: T02
parent: S04
milestone: M002
provides:
  - PR 🏆 badge rendering in mobile WorkoutExerciseItem component
  - workoutId threaded through ExerciseItemData type
  - Reactive useQuery(getWorkoutPRs) subscription in native app
key_files:
  - apps/native/src/components/WorkoutExerciseItem.tsx
key_decisions:
  - Matched web PR badge pattern exactly (D055): useQuery(getWorkoutPRs) + client-side exerciseId filter via useMemo
  - Used amber color palette (#FEF3C7 bg, #92400E text, #F59E0B border) matching web design language
patterns_established:
  - Native PR badge rendering follows same query-subscribe-filter-render pattern as web WorkoutExerciseItem
observability_surfaces:
  - useQuery(getWorkoutPRs) subscription provides reactive PR data stream per WorkoutExerciseItem; undefined during loading, empty array on no PRs
duration: 1 step
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: PR badges in mobile WorkoutExerciseItem

**Added 🏆 PR badge rendering to mobile WorkoutExerciseItem with reactive Convex subscription, matching the web implementation pattern.**

## What Happened

1. Added `workoutId: Id<"workouts">` to the `ExerciseItemData.workoutExercise` interface — the runtime data from `getWorkoutWithDetails` already includes this field, the type just didn't declare it.

2. Verified data flow: `ActiveWorkoutScreen` → `WorkoutExerciseList` → `WorkoutExerciseItem` passes full `workoutExercise` documents (including `workoutId`) through — no component hierarchy changes needed.

3. Added `useQuery(api.personalRecords.getWorkoutPRs)` subscription with conditional skip when `workoutId` is falsy. Added `useMemo` filter to extract exercise-specific PRs from the workout-level results (D055 pattern, identical to web).

4. Added amber 🏆 badge rendering with `View`/`Text` components: pill-shaped badges with `#FEF3C7` background, `#92400E` text, `#F59E0B` border. Renders one badge per PR type (Weight PR, Volume PR, Reps PR). Positioned after the "First time!" badge and before the rest duration config.

## Verification

- `pnpm turbo typecheck --force` — 3/3 packages pass, 0 errors
- Backend verification scripts — 72/72 checks pass (12+8+11+15+12+6+8)
- `grep "getWorkoutPRs" apps/native/src/components/WorkoutExerciseItem.tsx` — confirms query import
- `grep "workoutId" apps/native/src/components/WorkoutExerciseItem.tsx` — confirms type field and query usage

## Diagnostics

- Inspect `WorkoutExerciseItem` for `useQuery(api.personalRecords.getWorkoutPRs)` call
- PR query returns `undefined` during loading (badge doesn't render), empty array when no PRs exist, array of `{type, value, exerciseId, exerciseName, setId, achievedAt}` when PRs are found
- `useMemo` filter selects only PRs matching current exercise's `exerciseId`
- No crash path: graceful degradation matches web implementation

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/components/WorkoutExerciseItem.tsx` — Added `workoutId` to type, `useMemo` import, `useQuery(getWorkoutPRs)` subscription, client-side `exerciseId` filter, amber 🏆 badge rendering with styles
