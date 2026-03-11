---
estimated_steps: 6
estimated_files: 10
---

# T03: Workout history and active workout with set logging

**Slice:** S06 — Mobile App & Cross-Platform Polish
**Milestone:** M001

## Description

Build the core workout loop on mobile: workout history list, active workout screen with exercise adding, full set logging (weight/reps/RPE/tempo/notes), previous performance display, superset grouping, duration timer, and unit-aware inputs. This is the largest and most complex task in S06 — it ports the entire active workout surface (~1,800 lines of web components) to React Native. Delivers R002, R003, R005, R007, R008, R009 on mobile.

## Steps

1. Create `apps/native/src/components/WorkoutCard.tsx` — card showing workout name (or date), formatted duration badge, exercise count (self-fetched via `useQuery(api.workoutExercises.listExercisesForWorkout)`), and delete button with `Alert.alert` confirmation. Style per D007. Replace `apps/native/src/screens/WorkoutsScreen.tsx` placeholder with full implementation: FlatList of WorkoutCards from `useQuery(api.workouts.listWorkouts)`. "Start Workout" button at bottom. Loading/empty/populated three-state pattern. Wire navigation: "Start Workout" → `navigation.navigate("ActiveWorkout")`.

2. Create `apps/native/src/components/UnitToggle.tsx` — simple kg/lbs toggle button using `useMutation(api.userPreferences.setUnitPreference)`. Same pattern as web but using `TouchableOpacity` with styled text. Create `apps/native/src/components/ActiveWorkoutHeader.tsx` — workout name, running duration timer (setInterval from `startedAt`, formatted via `formatDuration`), unit toggle, and "Finish Workout" button with `Alert.alert` confirmation. Port the finish flow: `finishWorkout` mutation → `navigation.goBack()` (or `navigation.navigate("WorkoutsHistory")`).

3. Create `apps/native/src/components/SetRow.tsx` — the most complex component. Port the web SetRow pattern: local state for weight, reps, RPE, tempo, notes with onBlur save (D021). Weight input converts at boundary: `displayWeight` on render, `lbsToKg` on blur if unit is lbs. RPE: narrow numeric input, clamped 1-10. Tempo: text input. Notes: collapsible row below main row via toggle icon (D029). Delete set button. Warmup toggle. All inputs use `TextInput` with appropriate `keyboardType` (`numeric` for weight/reps/RPE, `default` for tempo/notes). Use `returnKeyType="done"` and handle keyboard dismiss. Style for gym use: large text, generous tap targets (min 44px height).

4. Create `apps/native/src/components/WorkoutExerciseItem.tsx` — renders exercise name, previous performance inline ("Last: 3×10 @ 60 kg" via `useQuery(api.sets.getPreviousPerformance)` with D027 formatting), list of SetRows, "Add Set" button. Port `formatPreviousPerformance` helper (group consecutive identical sets). "First time! 🎉" badge for new exercises. Create `apps/native/src/components/ExercisePicker.tsx` — modal overlay with exercise filter/search reusing ExerciseFilters + ExerciseCard from T02. Single-tap adds exercise to workout via `useMutation(api.workoutExercises.addExerciseToWorkout)` and closes modal.

5. Create `apps/native/src/components/WorkoutExerciseList.tsx` — ports the discriminated union render pattern for single vs superset exercise grouping (D028). Superset containers with colored left border from the 6-color palette. "Group Superset" selection mode with checkboxes on ungrouped exercises, floating "Create Superset" button when 2+ selected. "Remove from superset" per exercise. Receives `userDefaultRestSeconds` as prop for threading to items. Wrap in `KeyboardAwareScrollView` for keyboard handling during set input.

6. Create `apps/native/src/screens/ActiveWorkoutScreen.tsx` — orchestrator component porting ActiveWorkout logic: auto-create or resume workout (D018, D022 useRef guard), query workout details via `useQuery(api.workouts.getWorkoutWithDetails)`, render ActiveWorkoutHeader + WorkoutExerciseList + ExercisePicker toggle. Pass user preferences (unit, defaultRestSeconds) down. Wire into Workouts tab stack navigator in MainTabs.

## Must-Haves

- [ ] WorkoutsScreen shows workout history in FlatList with loading/empty/populated states
- [ ] WorkoutCard shows date, duration, exercise count, delete with confirmation
- [ ] "Start Workout" navigates to ActiveWorkoutScreen
- [ ] ActiveWorkoutScreen auto-creates or resumes active workout (D018, D022)
- [ ] ActiveWorkoutHeader shows duration timer, unit toggle, finish button
- [ ] ExercisePicker modal adds exercises to workout
- [ ] SetRow logs weight/reps with onBlur save and unit conversion at boundary (D021)
- [ ] SetRow supports RPE, tempo, notes inputs (R003)
- [ ] Previous performance displays inline per exercise (R007, D027)
- [ ] Superset visual grouping with create/remove controls (R005, D028)
- [ ] Finish workout persists to Convex and returns to history
- [ ] All `Alert.alert` replaces `window.confirm` for destructive actions
- [ ] `pnpm turbo typecheck --force` passes

## Verification

- `pnpm turbo typecheck --force` — 0 errors
- Workouts tab shows history list (manual Expo check)
- "Start Workout" creates an active workout
- Adding an exercise via picker adds it to the workout
- Logging a set with weight/reps persists to Convex (check dashboard)
- RPE/tempo/notes inputs save on blur
- Previous performance shows for exercises with history
- Superset grouping visually groups exercises with colored borders
- Finishing workout shows it in history with correct duration
- Delete workout with confirmation removes it

## Observability Impact

- Signals added/changed: Active workout auto-create logs to console if creation fails. Mutation errors from logSet/updateSet/addExercise surface as caught errors with descriptive messages.
- How a future agent inspects this: Convex dashboard shows workouts, workoutExercises, sets tables populated from mobile client. `verify-s02.ts` and `verify-s03.ts` prove backend contracts haven't regressed.
- Failure state exposed: Double-creation guard (`createAttempted` ref) prevents duplicate workouts — if two appear, the guard has been bypassed. ExercisePicker query failure shows empty list. Set save failure via onBlur is silent (mutation error in console) — user sees stale local state.

## Inputs

- `apps/native/src/screens/WorkoutsScreen.tsx` — placeholder from T01 (to be replaced)
- `apps/native/src/navigation/MainTabs.tsx` — tab navigator from T01 (add ActiveWorkout to Workouts stack)
- `apps/native/src/lib/units.ts` — utility functions from T01
- `apps/native/src/lib/theme.ts` — color constants from T01
- `apps/native/src/components/ExerciseFilters.tsx` — reused in ExercisePicker (from T02)
- `apps/native/src/components/ExerciseCard.tsx` — reused in ExercisePicker (from T02)
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — web pattern reference
- `apps/web/src/components/workouts/SetRow.tsx` — web pattern reference for onBlur save, unit conversion
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — web pattern reference for previous performance
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — web pattern reference for superset grouping
- S02 summary: `getWorkoutWithDetails` returns compound query. D018/D022 patterns. D021 onBlur save.
- S03 summary: D027 previous performance formatting. D028 superset visual grouping. D029 notes collapsible.

## Expected Output

- `apps/native/src/screens/WorkoutsScreen.tsx` — workout history with FlatList
- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — active workout orchestrator
- `apps/native/src/components/WorkoutCard.tsx` — workout summary card
- `apps/native/src/components/ActiveWorkoutHeader.tsx` — header with timer, unit toggle, finish
- `apps/native/src/components/WorkoutExerciseList.tsx` — exercise list with superset grouping
- `apps/native/src/components/WorkoutExerciseItem.tsx` — exercise with sets and previous performance
- `apps/native/src/components/SetRow.tsx` — set input row with all tracking fields
- `apps/native/src/components/ExercisePicker.tsx` — exercise selection modal
- `apps/native/src/components/UnitToggle.tsx` — kg/lbs toggle
- `apps/native/src/navigation/MainTabs.tsx` — updated with ActiveWorkout screen in Workouts stack
