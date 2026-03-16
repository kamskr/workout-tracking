# S06: Mobile Testing & Bug Fixes — Research

**Date:** 2026-03-16

## Summary

S06 primarily owns the remaining active mobile/runtime requirements: it advances **R029** from "native compiles" to "Expo actually boots" and is the direct slice for **R033** (iOS Simulator runtime proof, 7 tabs, navigation, and core flows). S01 and S05 already retired backend uncertainty: the Convex deployment is reachable, seed data exists, and the live backend runners are green. The remaining unknown is now the native runtime surface itself.

The native app is already structurally broad enough for the slice goal. `apps/native/src/navigation/MainTabs.tsx` defines all 7 bottom tabs (Exercises, Workouts, Templates, Analytics, Feed, Compete, Profile) plus nested stacks for exercise detail, group sessions, shared workouts, profile setup, leaderboard, and challenge detail. Most screens already query live Convex data directly and wire the expected mutations. The work is therefore not feature implementation first; it is environment proof, simulator boot, runtime bug discovery, then targeted fixes.

The first blocker is outside app code: this machine still resolves `xcode-select -p` to `/Library/Developer/CommandLineTools`, and `xcrun simctl list devices` fails because `simctl` is unavailable. The planner should treat that as the first build/proof seam. There is also a likely debugging hazard inside the app: `apps/native/App.tsx` calls `LogBox.ignoreAllLogs()`, which can hide exactly the warnings/errors needed during first simulator bring-up.

## Recommendation

Take S06 in three stages.

1. **Prove the environment path first**: switch developer tools to full Xcode access, confirm `simctl` works, and start Expo from `apps/native` against the existing S01 env contract. Without that, every later "mobile bug" is ambiguous.
2. **Run the app truthfully on iOS Simulator and record first failures**: verify unauthenticated boot, then the signed-in tab shell, then tab-by-tab rendering. Use the existing live backend as trusted input rather than reopening backend debugging.
3. **Fix only runtime-proven issues**: keep bug work scoped to screens/components that actually fail in simulator. The codebase already has the main seams needed for focused fixes: auth/provider boot, navigation shell, workout flow, analytics, social/competitive tabs, and session flows.

Treat runtime observability as part of the slice, not just support work. At minimum, first-pass execution should temporarily stop suppressing all React Native logs during debugging or replace it with targeted ignores, otherwise the simulator can stall on auth/env/native-module problems with poor evidence.

## Implementation Landscape

### Key Files

- `apps/native/App.tsx` — native app entrypoint; currently loads fonts, wraps the app in `ConvexClientProvider`, and globally calls `LogBox.ignoreAllLogs()`. This is the first place to adjust if runtime failures are too opaque.
- `apps/native/ConvexClientProvider.tsx` — constructs `ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL)` and `ClerkProvider(publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY})` directly from env. This is the main env/auth boot seam and the likeliest source of blank-start or auth-loading failures.
- `apps/native/src/navigation/Navigation.tsx` — auth gate; shows spinner until Clerk `isLoaded`, then either `LoginScreen` or `MainTabs`. If the app appears stuck before tabs render, this is the truth seam.
- `apps/native/src/navigation/MainTabs.tsx` — defines the 7-tab contract S06 must prove. Also defines nested stack routes that should be used during manual runtime verification.
- `apps/native/package.json` — execution commands (`pnpm --filter native-app ios`, `expo start --ios`) and dependency truth for Expo 54 / RN 0.82 / Clerk / Convex / React Navigation.
- `apps/native/app.json` — Expo app config. Current iOS config is minimal (`supportsTablet: true` only); use this as the config truth when checking simulator/runtime assumptions.
- `apps/native/src/screens/ExercisesScreen.tsx` — simplest live-data proof for tab rendering and seed-data consumption via `api.exercises.listExercises`.
- `apps/native/src/screens/WorkoutsScreen.tsx` — core workflow entrypoint for R033: start workout, start group session, join session. Uses live mutations and logs session creation failures.
- `apps/native/src/screens/ActiveWorkoutScreen.tsx` — central workout logging flow. Auto-creates/resumes workouts, loads details, uses `WorkoutExerciseList`, `ExercisePicker`, `RestTimerProvider`, and `RestTimerDisplay`.
- `apps/native/src/components/ExercisePicker.tsx` — modal exercise browse/add flow used by active workouts; live mutation seam for adding exercises.
- `apps/native/src/components/WorkoutExerciseList.tsx` and `apps/native/src/components/WorkoutExerciseItem.tsx` — set logging, supersets, previous performance, PR badge display, rest-duration resolution, and remove-exercise behavior. If workout logging breaks, this is where most runtime fixes will land.
- `apps/native/src/screens/AnalyticsScreen.tsx` — analytics tab proof; depends on live Convex analytics queries and native chart components.
- `apps/native/src/screens/FeedScreen.tsx` — social feed tab proof; depends on authenticated user data, paginated queries, follow actions, and search.
- `apps/native/src/screens/ChallengesScreen.tsx` — compete-tab landing screen and challenge creation flow; useful for testing modal/list state and exercise-backed challenge creation.
- `apps/native/src/screens/ProfileScreen.tsx` and `apps/native/src/screens/ProfileSetupScreen.tsx` — profile/setup seam; important because many social/competitive flows assume a profile exists.
- `apps/native/src/screens/GroupSessionScreen.tsx` and `apps/native/src/screens/JoinSessionScreen.tsx` — collaborative session runtime surface; should only be exercised after basic workouts/auth work because they depend on more live state.
- `apps/native/src/lib/theme.ts` — native visual token truth. No redesign work is needed here for S06, but this file confirms mobile remains on the older light/minimal design language rather than the web Apple Fitness+ refresh.

### Build Order

1. **Environment proof before app debugging**
   - Verify the machine can run iOS Simulator at all.
   - Current state is blocked: `xcode-select -p` returns `/Library/Developer/CommandLineTools`, and `xcrun simctl` is unavailable.
   - Planner should treat the Xcode developer-tools switch as the first task or blocker resolution step because nothing downstream is truthful until `simctl` exists.

2. **Expo boot and auth/env proof**
   - Start Expo from the native package boundary, not from the repo root with an invented path.
   - Confirm env values are present where `ConvexClientProvider.tsx` expects them.
   - First runtime question: does the app reach `LoginScreen` / `MainTabs`, or does it stall on `Navigation.tsx` loading state or provider initialization?

3. **7-tab render proof**
   - Once signed in, verify all tabs from `MainTabs.tsx`: Exercises, Workouts, Templates, Analytics, Feed, Compete, Profile.
   - This should be a dedicated verification pass before deep feature testing so tab-shell breakage is separated from per-screen bugs.

4. **Core flow proof in lowest-risk order**
   - Exercises browse (`ExercisesScreen`) → confirms live list query and detail navigation.
   - Workout logging (`WorkoutsScreen` → `ActiveWorkoutScreen` → `ExercisePicker` / `WorkoutExerciseItem`) → confirms the primary loop and most important S06 acceptance item.
   - Analytics (`AnalyticsScreen`) → confirms charts/data-heavy screen stability.
   - Profile/profile-setup → confirms profile-dependent tabs have a valid user state.

5. **Secondary flow proof / bug cleanup**
   - Feed, leaderboards/challenges, templates, group sessions.
   - Only after the base app is stable, because these are more stateful and more likely to produce incidental failures unrelated to the slice’s minimum accept criteria.

### Verification Approach

Use package-native commands and runtime evidence:

- Environment / simulator readiness:
  - `xcode-select -p`
  - `xcrun simctl list devices`
- Native type safety baseline before runtime:
  - `pnpm --filter native-app typecheck`
- Expo/iOS boot from the native package:
  - `pnpm --filter native-app ios`
  - or `pnpm --filter native-app exec expo start --ios`
- Reuse S01/S05 backend truth if runtime looks suspicious:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
  - `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`

Observable behaviors to record during simulator verification:

- App launches to either `LoginScreen` or authenticated tab shell — not a spinner/crash.
- After sign-in, all 7 tabs from `MainTabs.tsx` render and switch without red screens.
- `Exercises` tab loads exercise list from live Convex data.
- `Workouts` tab can enter `ActiveWorkout`, add an exercise, add/log at least one set, and return cleanly.
- `Analytics` renders without chart/module crashes.
- `Profile` either shows setup prompt or full profile screen and settings actions remain responsive.
- If session flows are exercised, `GroupSession` and `JoinSession` screens open without navigation errors.

## Constraints

- The current machine is not simulator-ready yet: `xcode-select` points at CommandLineTools, so `simctl` is unavailable until developer tools are switched to full Xcode.
- Native runtime config is env-driven at `apps/native/ConvexClientProvider.tsx`; missing/mismatched `EXPO_PUBLIC_CONVEX_URL` or `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` will fail before most UI surfaces render.
- The mobile app depends on authenticated runtime state for most meaningful verification because `Navigation.tsx` gates the main app behind Clerk auth.
- Mobile keeps the older light/minimal theme in `apps/native/src/lib/theme.ts`; S06 is not a native design-refresh slice.

## Common Pitfalls

- **Silent runtime failures from hidden logs** — `apps/native/App.tsx` currently calls `LogBox.ignoreAllLogs()`. If the simulator hangs or a tab renders blank, reduce log suppression first so real React Native / Clerk / Convex errors are visible.
- **Treating auth/env boot failures as screen bugs** — if the app never leaves `Navigation.tsx` loading or fails before `LoginScreen`, inspect `ConvexClientProvider.tsx` and env alignment before touching tab screens.
- **Debugging backend features instead of native runtime** — S05 already proved the backend live runners green. Re-run the S01/S05 verifiers only to distinguish env drift from native issues, not as the default explanation for simulator failures.
- **Over-scoping manual verification on the first pass** — prove tab shell and the primary workout loop first; leave sessions/social edge cases for a second pass after the app is stable.

## Open Risks

- The Xcode developer-tools switch may require user-level system access or manual intervention if `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` is needed outside the agent’s permissions.
- Clerk Expo auth may introduce runtime-specific OAuth/device behavior that does not appear in web verification; if sign-in blocks simulator proof, the planner may need a dedicated auth-debug task before tab verification.
- Because `ConvexClientProvider.tsx` creates clients directly from env with no explicit guardrails, bad env state may manifest as low-signal startup failures rather than clear in-app error surfaces.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React Native / Expo mobile runtime debugging | `debug-like-expert` | available |
| SwiftUI / Xcode app development | `swiftui` | available but only tangentially relevant for simulator/Xcode environment checks |
