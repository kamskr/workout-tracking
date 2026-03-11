# S06: Mobile App & Cross-Platform Polish

**Goal:** All features from S01–S05 work on the Expo mobile app with gym-optimized UI. Realtime sync between web and mobile is verifiable. Clean/minimal design (D007) is consistent across both platforms.
**Demo:** User can browse exercises with filters, start a workout, log sets with RPE/tempo/notes, see previous performance, use the rest timer, save/load templates, and toggle units — all on the React Native mobile app, backed by the same Convex backend as web.

## Must-Haves

- Bottom-tab navigation with 4 tabs: Exercises, Workouts, Templates, Settings
- Auth-gated navigation: unauthenticated users see login, authenticated see main tabs
- Exercise browse with FlatList, muscle group filter, equipment filter, name search (R001, R010)
- Workout history list with cards showing date, duration, exercise count (R002)
- Active workout screen: add exercises, log sets (weight/reps/RPE/tempo/notes), finish workout (R002, R003, R009)
- Previous performance inline display when logging sets (R007)
- Superset visual grouping with create/remove controls (R005)
- Rest timer: auto-start after logging set, circular countdown, pause/resume/skip/adjust (R004)
- Template list, save-as-template from completed workouts, start workout from template (R006)
- Unit preference toggle (kg/lbs) with conversions (R008)
- Settings screen with unit toggle and default rest time config
- Light theme status bar, clean/minimal styling (D007, R022)
- App metadata updated from "NotesContract" to "Workout Tracker"
- `pnpm turbo typecheck` passes for all packages including native-app

## Proof Level

- This slice proves: operational
- Real runtime required: yes (Expo dev client or simulator for visual/interaction verification)
- Human/UAT required: yes (gym-usability of mobile UI, design quality assessment)

## Verification

- `pnpm turbo typecheck --force` — all 3 packages compile (0 errors)
- `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 checks (no backend regression)
- `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12 checks (no backend regression)
- `npx tsx packages/backend/scripts/verify-s04.ts` — 6/6 checks (no backend regression)
- `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8 checks (no backend regression)
- Manual: Expo app launches, login screen appears for unauthenticated user
- Manual: After auth, 4-tab navigation visible (Exercises, Workouts, Templates, Settings)
- Manual: Exercise list loads with filters, workout CRUD works end-to-end, rest timer counts down, templates save/load
- Manual: Cross-platform sync — set logged on mobile appears on web within ~1s (proves R011)

## Observability / Diagnostics

- Runtime signals: Convex query/mutation errors surface via `console.error` in React Native debugger. Timer state logged via `console.warn` on AudioContext fallback. Navigation state inspectable via React Navigation DevTools.
- Inspection surfaces: Same Convex dashboard (http://127.0.0.1:6790) shows all data from both platforms. Existing verify scripts prove backend contracts are intact regardless of client platform.
- Failure visibility: Auth failures surface as Clerk OAuth error in `console.error`. Mutation failures throw descriptive errors (same as web). Navigation errors visible in Metro bundler console.
- Redaction constraints: Clerk tokens and Convex URLs from env vars — never logged.

## Integration Closure

- Upstream surfaces consumed: All Convex API functions from S01–S05 (`api.exercises.*`, `api.workouts.*`, `api.workoutExercises.*`, `api.sets.*`, `api.templates.*`, `api.userPreferences.*`), `@packages/backend/convex/_generated/api` types, `units.ts` pure functions (copied to native)
- New wiring introduced in this slice: React Native screens wired to same Convex backend via existing `ConvexClientProvider`. Tab navigation replaces notes-era stack. Auth-gated navigation via `useAuth().isSignedIn`. Rest timer context ported with `Vibration` API replacement.
- What remains before the milestone is truly usable end-to-end: nothing — this is the final slice. After S06, all M001 features work on both platforms with shared backend and realtime sync.

## Tasks

- [x] **T01: Navigation shell, auth gating, app metadata & shared utilities** `est:45m`
  - Why: Foundation for all mobile screens — replaces notes-era navigation with workout-domain tab layout, gates on auth state, updates app identity, copies shared utilities
  - Files: `apps/native/App.tsx`, `apps/native/src/navigation/Navigation.tsx`, `apps/native/src/navigation/MainTabs.tsx`, `apps/native/src/screens/SettingsScreen.tsx`, `apps/native/src/lib/units.ts`, `apps/native/src/lib/theme.ts`, `apps/native/app.json`
  - Do: Replace single-stack navigator with auth-conditional render (LoginScreen vs MainTabs). Create bottom-tab navigator with 4 tabs (Exercises, Workouts, Templates, Settings) using `@react-navigation/bottom-tabs`. Create placeholder screens for each tab. Build SettingsScreen with unit toggle and default rest time. Copy `units.ts` from web verbatim. Create `theme.ts` with color constants matching D007. Update App.tsx status bar to light theme. Update app.json name/slug from "NotesContract" to "Workout Tracker". Fix LoginScreen post-auth navigation (remove `NotesDashboardScreen` target — auth state change drives navigation automatically).
  - Verify: `pnpm turbo typecheck --force` passes. Expo app launches showing LoginScreen when signed out and 4-tab layout when signed in. Settings screen toggles unit preference.
  - Done when: Tab navigation renders with correct icons, auth gating works, SettingsScreen persists unit + rest time preferences to Convex, app.json updated

- [x] **T02: Exercise browse screen with filters** `est:35m`
  - Why: Delivers R001, R010 on mobile — users can browse 144 exercises with muscle group, equipment, and name search filters
  - Files: `apps/native/src/screens/ExercisesScreen.tsx`, `apps/native/src/components/ExerciseCard.tsx`, `apps/native/src/components/ExerciseFilters.tsx`
  - Do: Build ExercisesScreen with FlatList rendering exercise cards. Port ExerciseFilters with picker/modal-based selectors for muscle group and equipment (replace HTML `<select>` with RN Picker or custom modal). Add TextInput search bar. Wire to `useQuery(api.exercises.listExercises)` with same filter arg builder pattern as web. Use memoized renderItem + keyExtractor for FlatList performance. Style per D007 clean/minimal theme.
  - Verify: `pnpm turbo typecheck --force` passes. Exercise list renders 144 items. Filters narrow results correctly.
  - Done when: Exercises tab shows browsable list with working search, muscle group filter, equipment filter — all backed by live Convex queries

- [x] **T03: Workout history and active workout with set logging** `est:60m`
  - Why: Delivers R002, R003, R008, R009 on mobile — core workout loop (create → add exercises → log sets → finish → history)
  - Files: `apps/native/src/screens/WorkoutsScreen.tsx`, `apps/native/src/screens/ActiveWorkoutScreen.tsx`, `apps/native/src/components/WorkoutCard.tsx`, `apps/native/src/components/ActiveWorkoutHeader.tsx`, `apps/native/src/components/WorkoutExerciseList.tsx`, `apps/native/src/components/WorkoutExerciseItem.tsx`, `apps/native/src/components/SetRow.tsx`, `apps/native/src/components/ExercisePicker.tsx`, `apps/native/src/components/UnitToggle.tsx`
  - Do: Build WorkoutsScreen with FlatList of WorkoutCards (date, duration, exercise count, delete). "Start Workout" button navigates to ActiveWorkoutScreen. Port ActiveWorkout auto-create/resume logic (D018, D022 useRef guard). Port ActiveWorkoutHeader with running duration timer, unit toggle, finish button. Port WorkoutExerciseList/Item/SetRow with full tracking: weight, reps, RPE, tempo, notes (collapsible). All use onBlur save pattern (D021) with unit conversion at input boundary. ExercisePicker as modal with filter reuse. Replace `window.confirm` with `Alert.alert`. Previous performance display inline below exercise name (R007, D027). Superset visual grouping with create/remove controls (R005, D028 color palette). Use `KeyboardAwareScrollView` for set logging forms.
  - Verify: `pnpm turbo typecheck --force` passes. Active workout screen creates workout, adds exercises, logs sets with all fields, shows previous performance, supports superset grouping, finishes workout. History shows completed workouts.
  - Done when: Full workout lifecycle works on mobile: start → add exercises → log sets (weight/reps/RPE/tempo/notes) → see previous performance → group supersets → finish → see in history

- [x] **T04: Rest timer, templates, cross-platform sync verification & polish** `est:45m`
  - Why: Delivers R004, R006, R011, R022 on mobile — completes all remaining features and verifies cross-platform behavior
  - Files: `apps/native/src/components/RestTimerContext.tsx`, `apps/native/src/components/RestTimerDisplay.tsx`, `apps/native/src/components/RestDurationConfig.tsx`, `apps/native/src/screens/TemplatesScreen.tsx`, `apps/native/src/components/TemplateCard.tsx`, `apps/native/src/components/TextInputModal.tsx`, `apps/native/src/components/WorkoutCard.tsx` (add SaveAsTemplate)
  - Do: Port RestTimerContext — replace Web Audio beep with `Vibration.vibrate()` from react-native (or `expo-haptics` if installed). Keep `Date.now()` arithmetic (D032) and same state machine. Port RestTimerDisplay with either `react-native-svg` circular ring or `Animated.View` ring. Port RestDurationConfig inline control. Wire timer into ActiveWorkoutScreen after logSet with 4-level priority chain (D031). Build TemplatesScreen with FlatList of TemplateCards. Create TextInputModal (custom modal replacing `window.prompt`) for template naming. Add "Save as Template" to completed WorkoutCards. Wire "Start Workout" from template with active-workout conflict check (D035). Final polish pass: consistent spacing, font sizes, tap targets (min 44px), one-handed reachability. Remove old notes screens and dead imports.
  - Verify: `pnpm turbo typecheck --force` passes. All backend verification scripts still pass (no regression). Rest timer starts after logging a set, counts down, can be paused/skipped. Templates save from completed workouts and create new workouts. Cross-platform: data created on mobile visible on web (same Convex backend).
  - Done when: All S01–S05 features functional on mobile. No dead notes code. TypeScript clean. Design consistent with D007.

## Files Likely Touched

- `apps/native/App.tsx`
- `apps/native/app.json`
- `apps/native/src/navigation/Navigation.tsx`
- `apps/native/src/navigation/MainTabs.tsx`
- `apps/native/src/lib/units.ts`
- `apps/native/src/lib/theme.ts`
- `apps/native/src/screens/LoginScreen.tsx`
- `apps/native/src/screens/ExercisesScreen.tsx`
- `apps/native/src/screens/WorkoutsScreen.tsx`
- `apps/native/src/screens/ActiveWorkoutScreen.tsx`
- `apps/native/src/screens/TemplatesScreen.tsx`
- `apps/native/src/screens/SettingsScreen.tsx`
- `apps/native/src/components/ExerciseCard.tsx`
- `apps/native/src/components/ExerciseFilters.tsx`
- `apps/native/src/components/WorkoutCard.tsx`
- `apps/native/src/components/ActiveWorkoutHeader.tsx`
- `apps/native/src/components/WorkoutExerciseList.tsx`
- `apps/native/src/components/WorkoutExerciseItem.tsx`
- `apps/native/src/components/SetRow.tsx`
- `apps/native/src/components/ExercisePicker.tsx`
- `apps/native/src/components/UnitToggle.tsx`
- `apps/native/src/components/RestTimerContext.tsx`
- `apps/native/src/components/RestTimerDisplay.tsx`
- `apps/native/src/components/RestDurationConfig.tsx`
- `apps/native/src/components/TemplateCard.tsx`
- `apps/native/src/components/TextInputModal.tsx`
