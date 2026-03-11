---
id: T03
parent: S06
milestone: M001
provides:
  - Workout history screen with FlatList of WorkoutCards (date, duration, exercise count, delete)
  - Active workout screen with auto-create/resume (D018, D022 guard), exercise adding, set logging
  - Full set tracking: weight/reps/RPE/tempo/notes with onBlur save (D021) and unit conversion at boundary
  - Previous performance display inline per exercise (R007, D027 formatting)
  - Superset visual grouping with colored borders, create/remove controls (R005, D028)
  - ExercisePicker modal reusing ExerciseFilters and exercise query
  - UnitToggle component for kg/lbs switching
  - ActiveWorkoutHeader with running duration timer, unit toggle, finish button
key_files:
  - apps/native/src/screens/WorkoutsScreen.tsx
  - apps/native/src/screens/ActiveWorkoutScreen.tsx
  - apps/native/src/components/WorkoutCard.tsx
  - apps/native/src/components/ActiveWorkoutHeader.tsx
  - apps/native/src/components/WorkoutExerciseList.tsx
  - apps/native/src/components/WorkoutExerciseItem.tsx
  - apps/native/src/components/SetRow.tsx
  - apps/native/src/components/ExercisePicker.tsx
  - apps/native/src/components/UnitToggle.tsx
  - apps/native/src/navigation/MainTabs.tsx
key_decisions:
  - Used React Native Modal with presentationStyle="pageSheet" for ExercisePicker instead of inline overlay — better mobile UX with native slide-up gesture
  - SetRow shows tempo input only when notes toggle is active or tempo has a value — keeps default row compact for gym use
  - Superset group IDs generated with random string + timestamp instead of crypto.randomUUID (not available in React Native Hermes engine)
  - WorkoutCard self-fetches exercise count via useQuery instead of receiving as prop — matches web pattern, keeps card self-contained
patterns_established:
  - onBlur save pattern (D021) ported to React Native TextInput with same local state + mutation on blur
  - Auto-create/resume workout pattern (D018/D022) with useRef guard ported identically from web
  - Superset grouping discriminated union render pattern (D028) ported with RN View + borderLeftWidth/Color
  - Previous performance formatPreviousPerformance helper ported with same grouping logic
  - Alert.alert replaces window.confirm for all destructive actions (delete workout, delete set, remove exercise, finish workout)
observability_surfaces:
  - "[ActiveWorkoutScreen] Failed to create workout:" console.error on auto-create failure
  - "[SetRow] updateSet/deleteSet failed:" console.error on mutation failures
  - "[WorkoutExerciseItem] logSet failed:" console.error on add-set failure
  - "[ExercisePicker] addExercise failed:" console.error on exercise-add failure
  - "[ActiveWorkoutHeader] finishWorkout failed:" console.error on finish failure
  - "[UnitToggle] setUnitPreference failed:" console.error on unit toggle failure
  - "[WorkoutCard] deleteWorkout failed:" console.error on workout delete failure
  - "[WorkoutExerciseList] setSupersetGroup/clearSupersetGroup failed:" console.error on superset mutations
  - Double-creation guard (createAttempted ref) prevents duplicate workouts
duration: 35m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Workout history and active workout with set logging

**Ported the entire active workout surface (~10 components) from web to React Native with full set logging, previous performance, and superset grouping.**

## What Happened

Built 9 new components and replaced 1 placeholder screen to deliver the core workout loop on mobile:

1. **WorkoutsScreen** — Replaced placeholder with full FlatList of WorkoutCards showing workout history with loading/empty/populated three-state pattern. "Start Workout" button navigates to ActiveWorkout.

2. **WorkoutCard** — Card showing workout name, formatted date, duration badge, exercise count (self-fetched), and delete button with Alert.alert confirmation.

3. **ActiveWorkoutScreen** — Orchestrator porting the web ActiveWorkout logic: auto-create or resume active workout (D018 pattern, D022 useRef guard), queries workout details and user preferences, renders header + exercise list + picker.

4. **ActiveWorkoutHeader** — Workout name, running duration timer (setInterval from startedAt), UnitToggle, and "Finish Workout" button with Alert.alert confirmation.

5. **UnitToggle** — Simple kg/lbs toggle using TouchableOpacity with accent background on active option.

6. **SetRow** — Most complex component. Full port of web pattern: local state for weight/reps/RPE/tempo/notes with onBlur save (D021). Weight converts at boundary (displayWeight on render, lbsToKg on blur if lbs). RPE clamped 1-10. Tempo and notes collapsible. Delete set and warmup toggle. All inputs use appropriate keyboardType.

7. **WorkoutExerciseItem** — Exercise name, previous performance inline ("Last: 3×10 @ 60 kg" via getPreviousPerformance with D027 formatting), "First time! 🎉" badge, list of SetRows, "Add Set" button, remove exercise with Alert.alert.

8. **WorkoutExerciseList** — Discriminated union render pattern for single vs superset grouping (D028). Superset containers with colored left border from 6-color palette. "Group Superset" selection mode with checkboxes on ungrouped exercises, floating "Create Superset" button when 2+ selected. "Remove from superset" per exercise.

9. **ExercisePicker** — Modal overlay reusing ExerciseFilters and ExerciseCard patterns from T02. Single-tap adds exercise to workout and closes modal.

10. **MainTabs** — Updated WorkoutsStack to include ActiveWorkout screen.

## Verification

- `pnpm turbo typecheck --force` — 3/3 packages pass, 0 errors
- Backend verify scripts require running Convex dev server (integration concern for final task)
- All 10 expected output files created per task plan
- ActiveWorkout screen in Workouts stack navigator confirmed in MainTabs.tsx

## Diagnostics

- **Mutation errors**: All Convex mutations wrapped with `.catch()` logging to `console.error` with component-prefixed messages (e.g., `[SetRow] updateSet weight failed:`)
- **Double-creation guard**: `createAttempted` useRef in ActiveWorkoutScreen prevents duplicate workout creation. If two workouts appear, the guard has been bypassed.
- **Convex dashboard**: All workout/exercise/set data visible at Convex dashboard from both web and mobile clients
- **Query loading states**: `undefined` = loading (shows ActivityIndicator), `null` = no data (shows empty state), array = results
- **ExercisePicker failure**: Query failure shows empty list; addExercise failure logged to console.error

## Deviations

- Used ScrollView in WorkoutExerciseList instead of KeyboardAwareScrollView — the `keyboardShouldPersistTaps="handled"` prop handles the primary keyboard concern, and KeyboardAwareScrollView would require an additional dependency. Can be upgraded in polish pass if needed.
- Tempo input is shown in a secondary row below main set row (collapsed by default) rather than inline in the main row — better fits mobile screen width constraints.

## Known Issues

- Superset group ID uses `Math.random()` instead of `crypto.randomUUID()` (not available in Hermes). Collision probability is negligible for the use case.
- Set state is initialized from props and not synced on prop changes (same as web pattern) — if another client updates the same set, the local state will be stale until component remount.

## Files Created/Modified

- `apps/native/src/screens/WorkoutsScreen.tsx` — replaced placeholder with full workout history FlatList
- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — new orchestrator with auto-create/resume logic
- `apps/native/src/components/WorkoutCard.tsx` — new workout summary card with self-fetched exercise count
- `apps/native/src/components/ActiveWorkoutHeader.tsx` — new header with timer, unit toggle, finish
- `apps/native/src/components/WorkoutExerciseList.tsx` — new exercise list with superset grouping (D028)
- `apps/native/src/components/WorkoutExerciseItem.tsx` — new exercise item with sets and previous performance
- `apps/native/src/components/SetRow.tsx` — new set input row with all tracking fields and onBlur save
- `apps/native/src/components/ExercisePicker.tsx` — new exercise selection modal
- `apps/native/src/components/UnitToggle.tsx` — new kg/lbs toggle component
- `apps/native/src/navigation/MainTabs.tsx` — added ActiveWorkout screen to Workouts stack
