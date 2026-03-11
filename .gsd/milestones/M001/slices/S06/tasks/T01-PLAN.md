---
estimated_steps: 7
estimated_files: 9
---

# T01: Navigation shell, auth gating, app metadata & shared utilities

**Slice:** S06 — Mobile App & Cross-Platform Polish
**Milestone:** M001

## Description

Replace the notes-era single-stack navigation with a workout-domain bottom-tab layout, implement auth-gated routing (unauthenticated → LoginScreen, authenticated → MainTabs), update app identity from "NotesContract" to "Workout Tracker", create shared utilities (units.ts, theme.ts), and build the Settings screen with unit toggle and default rest time config. This is the foundation all subsequent mobile screens build on.

## Steps

1. Copy `apps/web/src/lib/units.ts` to `apps/native/src/lib/units.ts` verbatim (zero web dependencies). Create `apps/native/src/lib/theme.ts` with color constants matching D007 (clean/minimal light theme: white background, subtle grays, system blue accent).

2. Create `apps/native/src/screens/SettingsScreen.tsx` — unit preference toggle (kg/lbs) using `useQuery(api.userPreferences.getPreferences)` and `useMutation(api.userPreferences.setUnitPreference)`. Add default rest time config using `useMutation(api.userPreferences.setDefaultRestSeconds)` with ±15s adjustment buttons and display. Add sign-out button using `useAuth().signOut`.

3. Create placeholder screens for ExercisesScreen, WorkoutsScreen, TemplatesScreen — each exports a simple View with the tab name text. These will be replaced in T02-T04.

4. Create `apps/native/src/navigation/MainTabs.tsx` — bottom tab navigator with 4 tabs: Exercises (Ionicons dumbbell or equivalent), Workouts (Ionicons barbell), Templates (Ionicons copy/document), Settings (Ionicons settings). Each tab contains a native-stack navigator for drill-down (WorkoutsTab has History → ActiveWorkout). Style tabs per D007: light background, subtle icons, system blue active tint.

5. Update `apps/native/src/navigation/Navigation.tsx` — replace the single-stack notes navigator with auth-conditional rendering: use `useAuth()` from `@clerk/clerk-expo` to check `isSignedIn`. If signed in → render MainTabs. If not → render LoginScreen. Wrap in `NavigationContainer`.

6. Update `apps/native/App.tsx` — change StatusBar from blue background (`#0D87E1`) to white/light (`#FFFFFF`) with `barStyle="dark-content"` per D007. Remove the blue status bar View wrapper. Keep font loading and ConvexClientProvider.

7. Update `apps/native/app.json` — change `name` and `slug` from "NotesContract" to "WorkoutTracker". Update splash background from `#0D87E1` to `#FFFFFF`.

## Must-Haves

- [ ] Auth-gated navigation: LoginScreen for unauthenticated, MainTabs for authenticated
- [ ] 4 bottom tabs with correct labels and icons (Exercises, Workouts, Templates, Settings)
- [ ] SettingsScreen with working unit toggle (persisted to Convex) and default rest time config
- [ ] `units.ts` copied with all pure functions (kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration, formatRestTime)
- [ ] `theme.ts` with D007-compliant color constants
- [ ] App metadata updated from NotesContract to WorkoutTracker
- [ ] Status bar light theme (white background, dark content)
- [ ] LoginScreen works — successful OAuth navigates to main app (auth state drives it automatically)
- [ ] `pnpm turbo typecheck --force` passes for all 3 packages

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all packages
- LoginScreen renders for unauthenticated user (manual Expo check)
- After auth, 4 tabs are visible with correct labels
- Settings tab shows unit toggle and rest time config
- Tapping unit toggle calls `setUnitPreference` mutation (visible in Convex dashboard)
- app.json shows "WorkoutTracker" name
- No references to "NotesDashboardScreen", "InsideNoteScreen", "CreateNoteScreen" in Navigation.tsx

## Observability Impact

- Signals added/changed: Auth state drives navigation automatically via `useAuth().isSignedIn` — no manual navigation after OAuth. Sign-out triggers automatic navigation to LoginScreen.
- How a future agent inspects this: Check `useAuth()` return value in React DevTools. Tab navigator state visible via React Navigation DevTools. Convex dashboard shows userPreferences mutations from Settings.
- Failure state exposed: Clerk OAuth errors logged to `console.error` in LoginScreen. Missing Convex env vars cause immediate client error on app launch (visible in Metro console).

## Inputs

- `apps/native/App.tsx` — current root with blue status bar and notes Navigation
- `apps/native/src/navigation/Navigation.tsx` — current notes-era stack navigator
- `apps/native/src/screens/LoginScreen.tsx` — current OAuth login (Google + Apple)
- `apps/web/src/lib/units.ts` — source of pure utility functions to copy
- `apps/native/ConvexClientProvider.tsx` — existing Convex+Clerk provider (no changes needed)
- S04 summary: `setDefaultRestSeconds` mutation exists and uses upsert pattern

## Expected Output

- `apps/native/src/lib/units.ts` — verbatim copy of web units.ts
- `apps/native/src/lib/theme.ts` — D007 color constants (background, text, border, accent, tab colors)
- `apps/native/src/navigation/MainTabs.tsx` — bottom tab navigator with 4 tabs, each wrapping a native-stack
- `apps/native/src/navigation/Navigation.tsx` — auth-gated: LoginScreen vs MainTabs
- `apps/native/src/screens/SettingsScreen.tsx` — unit toggle + default rest time + sign-out
- `apps/native/src/screens/ExercisesScreen.tsx` — placeholder (replaced in T02)
- `apps/native/src/screens/WorkoutsScreen.tsx` — placeholder (replaced in T03)
- `apps/native/src/screens/TemplatesScreen.tsx` — placeholder (replaced in T04)
- `apps/native/App.tsx` — light status bar, cleaned up
- `apps/native/app.json` — WorkoutTracker identity
