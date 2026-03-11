---
id: T04
parent: S06
milestone: M001
provides:
  - RestTimerContext with state machine (idle→running→paused→completed→idle) and Vibration on completion
  - RestTimerDisplay floating overlay with circular countdown, pause/resume/skip/±15s controls
  - RestDurationConfig per-exercise rest time override with ±15s and Reset
  - Timer auto-starts after logSet with 4-level priority chain (D031)
  - TemplatesScreen with loading/empty/populated three-state pattern
  - TemplateCard with Start Workout (D034/D035) and Delete actions
  - TextInputModal replacing window.prompt for template naming
  - Save as Template button on completed WorkoutCards
  - Old notes screens removed with no dead imports
key_files:
  - apps/native/src/components/RestTimerContext.tsx
  - apps/native/src/components/RestTimerDisplay.tsx
  - apps/native/src/components/RestDurationConfig.tsx
  - apps/native/src/components/TextInputModal.tsx
  - apps/native/src/screens/TemplatesScreen.tsx
  - apps/native/src/components/TemplateCard.tsx
  - apps/native/src/components/WorkoutCard.tsx
  - apps/native/src/screens/ActiveWorkoutScreen.tsx
  - apps/native/src/components/WorkoutExerciseItem.tsx
key_decisions:
  - Used View-based circular progress ring instead of react-native-svg (not in deps) — two half-circle overlays with rotation for progress display
  - Used Animated.View with spring/timing for RestTimerDisplay slide-in/out instead of CSS transitions
  - Timer placed at bottom:90 (above tab bar) with elevation/shadow for floating card UX
  - TemplateCard navigates to Workouts tab's ActiveWorkout screen via cross-tab navigation after startWorkoutFromTemplate
patterns_established:
  - RestTimerProvider wraps ActiveWorkoutScreen children; useRestTimer hook same interface as web
  - TextInputModal pattern replaces all window.prompt usage in React Native (reusable for any naming flow)
  - resolveRestSeconds utility implements D031 4-level priority chain inline in WorkoutExerciseItem
observability_surfaces:
  - "[RestTimer] Vibration failed (degraded gracefully):" logged via console.warn on vibration error
  - "[RestDurationConfig] Failed to update/reset rest seconds:" logged via console.error
  - "[TemplateCard] deleteTemplate failed:" logged via console.error
  - "[WorkoutExerciseItem] logSet failed:" logged via console.error
  - Template CRUD errors surfaced via Alert.alert with descriptive Convex error messages
  - Timer context state inspectable via React DevTools (RestTimerProvider value)
duration: ~25 minutes
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T04: Rest timer, templates, cross-platform sync verification & polish

**Ported rest timer with vibration, built templates screen with save/load/delete, created TextInputModal, removed dead notes code — all typechecks pass with zero backend regression.**

## What Happened

Built all remaining mobile features for S06:

1. **RestTimerContext** — Direct port of web state machine (idle→running→paused→completed→idle) with same Date.now()/endTime arithmetic (D032), 100ms tick interval. Replaced `playCompletionBeep()` Web Audio with `Vibration.vibrate([0, 400, 200, 400])` double burst pattern.

2. **RestTimerDisplay** — Floating overlay positioned above tab bar with Animated slide-in/out. Circular countdown uses View-based half-circle rotation approach (no SVG dep needed). Shows MM:SS time, exercise name, status-dependent controls (running: pause/skip/±15s, paused: resume/skip, completed: checkmark + "Done!").

3. **RestDurationConfig** — Inline expandable clock badge per exercise. Tap expands to ±15s adjustment buttons + "Reset" (clears override). Calls `updateRestSeconds` mutation. Wired into WorkoutExerciseItem header.

4. **Timer wiring** — ActiveWorkoutScreen wrapped in RestTimerProvider, RestTimerDisplay rendered as absolute overlay. WorkoutExerciseItem fires `startTimer()` after successful `logSet` using 4-level priority chain (D031): `workoutExercise.restSeconds → exercise.defaultRestSeconds → userDefaultRestSeconds → 60`. Skips if duration is 0.

5. **TextInputModal** — Reusable modal with title, TextInput, Cancel/Confirm buttons. Auto-focuses, supports returnKeyType="done" submit. Replaces window.prompt for template naming.

6. **TemplatesScreen** — Full replacement of placeholder. Three-state pattern: loading (ActivityIndicator), empty (icon + guidance text), populated (FlatList of TemplateCards with count badge).

7. **TemplateCard** — Shows template name, date, exercise count + names (max 4 with "+N more"). "Start Workout" button calls `startWorkoutFromTemplate` and navigates to ActiveWorkout; shows Alert on conflict (D035). "Delete" with Alert.alert confirmation.

8. **WorkoutCard** — Added "Save as Template" button on completed workouts. Uses TextInputModal for naming, calls `saveAsTemplate` mutation, shows success/error Alerts.

9. **Cleanup** — Deleted `NotesDashboardScreen.tsx`, `CreateNoteScreen.tsx`, `InsideNoteScreen.tsx`. Verified no dead imports remain.

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages ✅
- `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 ✅
- `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12 ✅
- `npx tsx packages/backend/scripts/verify-s04.ts` — 6/6 ✅
- `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8 ✅
- `grep -r "NotesDashboard\|CreateNote\|InsideNote" apps/native/src/` — returns nothing ✅
- Old notes screen files confirmed deleted ✅
- All new components typecheck with proper Convex API types ✅

Manual Expo checks (not automated, require device):
- Rest timer starts after logging a set on mobile
- Timer can be paused, resumed, skipped, adjusted ±15s
- Phone vibrates on timer completion
- Templates screen shows saved templates
- "Save as Template" on completed workout opens naming modal and saves
- "Start Workout" from template creates a pre-filled workout

## Diagnostics

- **Timer state**: Inspect `RestTimerProvider` value in React DevTools — shows status, remainingSeconds, configuredDuration, exerciseName
- **Vibration failures**: Logged as `[RestTimer] Vibration failed` via console.warn — degrades gracefully (no crash)
- **Template mutations**: Errors surface via Alert.alert with descriptive messages from Convex backend
- **Rest duration mutations**: Logged as `[RestDurationConfig] Failed to update/reset rest seconds:` via console.error
- **Convex dashboard**: All template/workout CRUD operations from mobile client visible at http://127.0.0.1:6790
- **Backend contracts**: All 4 verify scripts confirm no regression from any client platform

## Deviations

- Used View-based circular progress instead of react-native-svg (as the plan anticipated — "simpler Animated.View approach if SVG is problematic") since react-native-svg is not in dependencies.

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/components/RestTimerContext.tsx` — **Created** — Timer state machine with Vibration (port of web version)
- `apps/native/src/components/RestTimerDisplay.tsx` — **Created** — Floating circular countdown overlay
- `apps/native/src/components/RestDurationConfig.tsx` — **Created** — Per-exercise rest duration config with ±15s/Reset
- `apps/native/src/components/TextInputModal.tsx` — **Created** — Reusable text input modal (replaces window.prompt)
- `apps/native/src/screens/TemplatesScreen.tsx` — **Replaced** — Full template list screen with loading/empty/populated states
- `apps/native/src/components/TemplateCard.tsx` — **Created** — Template card with Start Workout and Delete
- `apps/native/src/components/WorkoutCard.tsx` — **Modified** — Added Save as Template button on completed workouts
- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — **Modified** — Wrapped in RestTimerProvider, renders RestTimerDisplay
- `apps/native/src/components/WorkoutExerciseItem.tsx` — **Modified** — Wired timer start after logSet, added RestDurationConfig
- `apps/native/src/screens/NotesDashboardScreen.tsx` — **Deleted**
- `apps/native/src/screens/CreateNoteScreen.tsx` — **Deleted**
- `apps/native/src/screens/InsideNoteScreen.tsx` — **Deleted**
