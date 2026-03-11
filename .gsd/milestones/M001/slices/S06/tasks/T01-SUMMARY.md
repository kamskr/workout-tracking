---
id: T01
parent: S06
milestone: M001
provides:
  - Auth-gated navigation (LoginScreen vs MainTabs based on useAuth().isSignedIn)
  - Bottom-tab navigator with 4 tabs (Exercises, Workouts, Templates, Settings)
  - SettingsScreen with unit toggle and default rest time config (persisted to Convex)
  - Shared utilities (units.ts, theme.ts) for native app
  - App identity updated from NotesContract to WorkoutTracker
  - Light theme status bar (white background, dark content)
key_files:
  - apps/native/src/navigation/MainTabs.tsx
  - apps/native/src/navigation/Navigation.tsx
  - apps/native/src/screens/SettingsScreen.tsx
  - apps/native/src/lib/units.ts
  - apps/native/src/lib/theme.ts
  - apps/native/App.tsx
  - apps/native/app.json
  - apps/native/src/screens/LoginScreen.tsx
key_decisions:
  - Auth-gated navigation uses conditional Screen rendering in a Stack.Navigator (isSignedIn ? MainTabs : LoginScreen) — no manual navigation after OAuth
  - Each tab wraps its own NativeStackNavigator for future drill-down (e.g., WorkoutsTab will get ActiveWorkout)
  - LoginScreen no longer calls navigation.navigate() after OAuth — setting active session triggers auth state change which drives navigator automatically
  - theme.ts uses system blue (#007AFF) as accent color for iOS-native feel
patterns_established:
  - Auth-gated navigator pattern: useAuth().isSignedIn drives which screens are mounted
  - Tab → nested stack pattern: each bottom tab owns its own native-stack for drill-down navigation
  - Theme constants: import { colors, spacing, fontFamily } from "../lib/theme" for D007-consistent styling
  - Convex mutation error handling: .catch(err => console.error("[ScreenName] mutationName failed:", err))
observability_surfaces:
  - Auth state inspectable via useAuth() return value in React DevTools
  - Convex mutation failures logged to console.error with [ScreenName] prefix for easy grep
  - Tab navigator state visible via React Navigation DevTools
  - userPreferences mutations visible in Convex dashboard
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Navigation shell, auth gating, app metadata & shared utilities

**Replaced notes-era single-stack navigation with workout-domain bottom-tab layout, auth-gated routing, light theme, and shared utilities.**

## What Happened

Executed all 7 steps from the plan:

1. **Shared utilities**: Copied `units.ts` verbatim from web to `apps/native/src/lib/units.ts` (all 6 pure functions: kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration, formatRestTime). Created `theme.ts` with D007-compliant color constants (white background, system blue accent, subtle grays).

2. **SettingsScreen**: Built with unit preference toggle (kg↔lbs) using `useQuery(api.userPreferences.getPreferences)` and `useMutation(api.userPreferences.setUnitPreference)`. Default rest time config with ±15s buttons and `formatRestTime` display. Sign-out button via `useAuth().signOut`. Handles the Convex return type union correctly (fallback object vs full preference document).

3. **Placeholder screens**: Created ExercisesScreen, WorkoutsScreen, TemplatesScreen — minimal views with title text, ready for T02-T04 replacement.

4. **MainTabs**: Bottom tab navigator with 4 tabs using Ionicons (barbell, fitness, copy, settings). Each tab wraps a NativeStackNavigator for future drill-down. Styled per D007: white tab bar, system blue active tint, gray inactive tint.

5. **Navigation.tsx**: Replaced notes-era stack with auth-conditional rendering. Uses `useAuth()` from `@clerk/clerk-expo` — `isSignedIn` renders MainTabs, otherwise LoginScreen. Shows loading spinner while auth state initializes.

6. **App.tsx**: Removed blue status bar wrapper View and `#0D87E1` background. StatusBar now uses white background with `barStyle="dark-content"`.

7. **app.json**: Changed name/slug from "NotesContract" to "WorkoutTracker". Splash background changed from `#0D87E1` to `#FFFFFF`.

8. **LoginScreen (bonus)**: Removed manual `navigation.navigate("NotesDashboardScreen")` — OAuth now just calls `setActive` and the auth-gated navigator switches automatically. Removed `navigation` prop dependency entirely.

## Verification

- `pnpm turbo typecheck --force` — **3/3 packages pass (0 errors)**
- No references to `NotesDashboardScreen`, `InsideNoteScreen`, `CreateNoteScreen` in Navigation.tsx — **confirmed clean**
- app.json shows `"name": "WorkoutTracker"`, `"slug": "WorkoutTracker"` — **confirmed**
- Status bar: `barStyle="dark-content"`, `backgroundColor="#FFFFFF"` — **confirmed**
- units.ts contains all 6 exported functions — **confirmed**
- 4 tabs registered: Exercises, Workouts, Templates, Settings — **confirmed**
- Auth gating via `useAuth().isSignedIn` conditional rendering — **confirmed**

### Slice-level checks (intermediate task — partial expected):
- `pnpm turbo typecheck --force` — ✅ 3/3 pass
- Backend verify scripts (s02–s05) — ⏭️ requires running Convex backend (not started; no backend changes in this task)
- Manual Expo checks — ⏭️ requires Expo dev server (visual verification deferred to device/simulator)

## Diagnostics

- **Auth state**: Inspect `useAuth()` return in React DevTools to see `isSignedIn`, `isLoaded`
- **Navigation**: React Navigation DevTools shows tab navigator state and stack hierarchy
- **Convex mutations**: SettingsScreen logs failures as `[SettingsScreen] setUnitPreference failed:` and `[SettingsScreen] setDefaultRestSeconds failed:` to console.error
- **OAuth errors**: LoginScreen logs as `[LoginScreen] OAuth error:` to console.error

## Deviations

- Updated LoginScreen beyond plan scope: removed `navigation` prop and manual `NotesDashboardScreen` navigation. This was necessary because the auth-gated navigator makes manual navigation incorrect (screen no longer exists in the navigator). The plan's "Fix LoginScreen" note in the Do field anticipated this.

## Known Issues

- Old notes-era screen files (`NotesDashboardScreen.tsx`, `InsideNoteScreen.tsx`, `CreateNoteScreen.tsx`) still exist on disk. They are unused (no imports). T04 plan explicitly includes "Remove old notes screens and dead imports" as cleanup.

## Files Created/Modified

- `apps/native/src/lib/units.ts` — verbatim copy of web units.ts (6 pure functions)
- `apps/native/src/lib/theme.ts` — D007 color constants, spacing, fontFamily
- `apps/native/src/navigation/MainTabs.tsx` — bottom tab navigator with 4 tabs, nested stacks
- `apps/native/src/navigation/Navigation.tsx` — auth-gated: LoginScreen vs MainTabs
- `apps/native/src/screens/SettingsScreen.tsx` — unit toggle + rest time config + sign-out
- `apps/native/src/screens/ExercisesScreen.tsx` — placeholder (T02 replaces)
- `apps/native/src/screens/WorkoutsScreen.tsx` — placeholder (T03 replaces)
- `apps/native/src/screens/TemplatesScreen.tsx` — placeholder (T04 replaces)
- `apps/native/src/screens/LoginScreen.tsx` — removed manual navigation, uses theme constants
- `apps/native/App.tsx` — light status bar, removed blue wrapper
- `apps/native/app.json` — WorkoutTracker identity, white splash
