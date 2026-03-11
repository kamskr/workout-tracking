---
estimated_steps: 6
estimated_files: 9
---

# T04: Rest timer, templates, cross-platform sync verification & polish

**Slice:** S06 — Mobile App & Cross-Platform Polish
**Milestone:** M001

## Description

Complete the remaining mobile features: rest timer (R004), workout templates (R006), and final cross-platform polish (R011, R022). Port the rest timer context and display with React Native vibration replacing Web Audio. Build the templates screen with save/load/delete. Create TextInputModal to replace `window.prompt`. Clean up dead notes code. Verify typecheck passes and all backend verification scripts show no regression.

## Steps

1. Create `apps/native/src/components/RestTimerContext.tsx` — port the web RestTimerContext state machine (idle → running → paused → completed → idle). Keep `Date.now()` arithmetic with `endTime` storage (D032). Keep `setInterval` at 100ms for updates. Replace `playCompletionBeep()` with `Vibration.vibrate([0, 400, 200, 400])` from `react-native` (double vibration burst for completion). Export `RestTimerProvider`, `useRestTimer` hook, same interface as web.

2. Create `apps/native/src/components/RestTimerDisplay.tsx` — floating overlay at bottom of screen (above tab bar). Show circular countdown using either `react-native-svg` (Circle with `strokeDasharray`/`strokeDashoffset`) or a simpler `Animated.View` approach if SVG is problematic. Display MM:SS time, exercise name, status-dependent controls: running → pause/skip/±15s, paused → resume/skip, completed → dismiss. Style per D007 with a slight elevation/shadow for the floating card.

3. Create `apps/native/src/components/RestDurationConfig.tsx` — inline expandable control per exercise showing current rest time with clock icon badge. Expand to show ±15s buttons and "Reset" (clear override). Calls `useMutation(api.workoutExercises.updateRestSeconds)`. Same pattern as web but with `TouchableOpacity` and StyleSheet. Wire RestTimerProvider into `ActiveWorkoutScreen.tsx` — wrap children in provider, render RestTimerDisplay. Wire timer start in `WorkoutExerciseItem.tsx` — after `logSet` resolves, compute duration from 4-level priority chain (D031: `workoutExercise.restSeconds → exercise.defaultRestSeconds → userDefaultRestSeconds → 60`), skip if 0, call `startTimer(duration, exerciseName)`. Wire RestDurationConfig into WorkoutExerciseItem.

4. Create `apps/native/src/components/TextInputModal.tsx` — reusable modal with title, TextInput, "Cancel" and "Confirm" buttons. Used for template naming (replaces `window.prompt`). Props: `visible`, `title`, `placeholder`, `onConfirm(text)`, `onCancel`. Build `apps/native/src/screens/TemplatesScreen.tsx` — replace placeholder with FlatList of TemplateCards from `useQuery(api.templates.listTemplates)`. Loading/empty/populated three-state pattern.

5. Create `apps/native/src/components/TemplateCard.tsx` — shows template name, exercise count, exercise names, creation date. "Start Workout" button (calls `startWorkoutFromTemplate`, navigates to ActiveWorkout on success, shows `Alert.alert` error on active workout conflict per D035). "Delete" button with `Alert.alert` confirmation. Update `apps/native/src/components/WorkoutCard.tsx` — add "Save as Template" button on completed workout cards (status === "completed"). Uses TextInputModal for naming, calls `useMutation(api.templates.saveAsTemplate)`. Success feedback via `Alert.alert`.

6. Final polish and cleanup: Remove old notes screen files (`NotesDashboardScreen.tsx`, `CreateNoteScreen.tsx`, `InsideNoteScreen.tsx`) and their dead imports. Ensure no references to notes remain in navigation or imports. Verify consistent spacing, font usage (Inter family from loaded fonts), and tap target sizes (minimum 44px) across all screens. Run `pnpm turbo typecheck --force` for final clean compile. Run all backend verification scripts to confirm no regression.

## Must-Haves

- [ ] RestTimerContext with same state machine as web, vibration on completion
- [ ] RestTimerDisplay with circular countdown, pause/resume/skip/adjust controls
- [ ] RestDurationConfig for per-exercise rest time override
- [ ] Timer auto-starts after logSet with 4-level priority chain (D031)
- [ ] TemplatesScreen shows template list with loading/empty/populated states
- [ ] TemplateCard with "Start Workout" and "Delete" actions
- [ ] TextInputModal replaces `window.prompt` for template naming
- [ ] "Save as Template" on completed WorkoutCards
- [ ] Start-from-template creates pre-filled workout (D034, D035)
- [ ] Old notes screens removed, no dead imports
- [ ] `pnpm turbo typecheck --force` passes for all 3 packages
- [ ] All 4 backend verification scripts pass (no regression)

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 ✅
- `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12 ✅
- `npx tsx packages/backend/scripts/verify-s04.ts` — 6/6 ✅
- `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8 ✅
- Rest timer starts after logging a set on mobile (manual Expo check)
- Timer can be paused, resumed, skipped, adjusted ±15s
- Phone vibrates on timer completion
- Templates screen shows saved templates
- "Save as Template" on completed workout opens naming modal and saves
- "Start Workout" from template creates a pre-filled workout
- No files referencing `NotesDashboard`, `CreateNote`, or `InsideNote` exist in `apps/native/src/`
- `grep -r "NotesDashboard\|CreateNote\|InsideNote" apps/native/src/` returns nothing

## Observability Impact

- Signals added/changed: RestTimerContext state transitions logged via `console.warn` on vibration fallback. Template mutation errors surfaced via `Alert.alert` with descriptive messages from Convex.
- How a future agent inspects this: Timer context state inspectable via React DevTools. Convex dashboard shows template CRUD operations from mobile client. Backend verify scripts confirm no contract regression.
- Failure state exposed: Timer vibration failure degrades gracefully (no crash, just no haptic). Template save failure shows error in Alert. Start-from-template with active workout shows descriptive conflict error (D035).

## Inputs

- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — from T03 (wrap in RestTimerProvider)
- `apps/native/src/components/WorkoutExerciseItem.tsx` — from T03 (wire timer start after logSet, add RestDurationConfig)
- `apps/native/src/components/WorkoutCard.tsx` — from T03 (add Save as Template button)
- `apps/native/src/screens/TemplatesScreen.tsx` — placeholder from T01 (to be replaced)
- `apps/native/src/navigation/MainTabs.tsx` — from T01/T02/T03 (update Templates tab import)
- `apps/native/src/lib/units.ts` — formatRestTime utility from T01
- `apps/native/src/lib/theme.ts` — color constants from T01
- `apps/web/src/components/workouts/RestTimerContext.tsx` — web pattern reference (308 lines)
- `apps/web/src/components/workouts/RestTimerDisplay.tsx` — web pattern reference (300 lines)
- `apps/web/src/components/templates/` — web pattern reference for template UI
- S04 summary: D031 priority chain, D032 Date.now() arithmetic, Web Audio replacement needed
- S05 summary: D033-D036 template behavior decisions

## Expected Output

- `apps/native/src/components/RestTimerContext.tsx` — timer state machine with Vibration
- `apps/native/src/components/RestTimerDisplay.tsx` — floating circular countdown
- `apps/native/src/components/RestDurationConfig.tsx` — per-exercise rest duration config
- `apps/native/src/components/TextInputModal.tsx` — reusable text input modal
- `apps/native/src/screens/TemplatesScreen.tsx` — template list screen
- `apps/native/src/components/TemplateCard.tsx` — template card with start/delete
- `apps/native/src/components/WorkoutCard.tsx` — updated with Save as Template
- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — updated with RestTimerProvider + Display
- `apps/native/src/components/WorkoutExerciseItem.tsx` — updated with timer start + RestDurationConfig
- Old notes screens deleted: `NotesDashboardScreen.tsx`, `CreateNoteScreen.tsx`, `InsideNoteScreen.tsx`
