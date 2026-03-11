# S06: Mobile App & Cross-Platform Polish — Research

**Date:** 2026-03-11

## Summary

S06 must rebuild the entire S01–S05 feature surface in React Native for the Expo mobile app, replacing the current notes-focused screens with workout-domain screens. The backend is 100% ready — all Convex queries, mutations, and types from S01–S05 are deployed and proven. The work is purely UI: building React Native equivalents of ~3,200 lines of web components across 18 files, wired to the same Convex API.

The existing native app (`apps/native`) is a template-era notes app using `@react-navigation/native-stack` with 4 screens, `@clerk/clerk-expo` for OAuth, and the shared `@packages/backend` for Convex bindings. The architecture (ConvexProviderWithClerk, metro monorepo config) is proven — CreateNoteScreen and NotesDashboardScreen already demonstrate `useQuery`/`useMutation` against the Convex backend from React Native. The main challenge is volume (many screens and components to build), gym-optimized UX (large tap targets, one-handed use, D007/D022), and platform-specific replacements for web APIs (`window.prompt` → TextInput modal, `window.confirm` → `Alert.alert`, SVG circular timer → React Native SVG or Animated API, CSS → StyleSheet).

The recommended approach is to: (1) restructure navigation from a single stack to a bottom-tab navigator with 4 tabs (Exercises, Workouts, Templates, Settings), (2) port each web component 1:1 to React Native StyleSheet following the clean/minimal design language (D007), (3) share the `units.ts` utility as a pure-logic module, and (4) implement the rest timer using React Native's `Animated` API or `react-native-svg` for the circular countdown.

## Recommendation

**Bottom-tab navigation with stack navigators per tab.** Replace the current single-stack notes navigation with a tab-based layout: Exercises, Workouts, Templates, and Settings tabs. Each tab contains a nested stack for drill-down (e.g., Workouts tab: History → Active Workout). This matches gym usage patterns — users need quick access to different sections with one thumb tap.

**Port components in feature order, not layer order.** Build screens top-down: navigation shell → exercises browse → workout history → active workout (with set logging, exercise picker, rest timer) → templates → settings (unit toggle, rest defaults). This lets each layer be tested against the live Convex backend as it's built.

**Extract `units.ts` to a shared location.** The conversion utilities (`kgToLbs`, `lbsToKg`, `formatWeight`, `displayWeight`, `formatDuration`, `formatRestTime`) are pure functions with no web dependencies. They can be either copied to the native app or moved to a shared package. Given the monorepo setup, copying to `apps/native/src/lib/units.ts` is simpler and avoids a new shared package just for utilities.

**Rest timer: use `setInterval` + `Date.now()` arithmetic** (same pattern as web, D032). React Native doesn't throttle timers like browser background tabs. Use `Vibration` API from React Native core instead of Web Audio for completion notification. For the circular countdown visual, use `react-native-svg` (already transitively available via Expo) or build a simple `Animated.View` ring.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Tab navigation | `@react-navigation/bottom-tabs` (already installed) | Battle-tested, already in package.json, deep-links and gesture support |
| Stack navigation | `@react-navigation/native-stack` (already installed) | Already used in the app, native performance |
| Icons | `@expo/vector-icons` (already installed) | Includes Ionicons, MaterialIcons, Feather — all needed icon sets |
| Safe area handling | `react-native-safe-area-context` (already installed) | Correct inset handling for notches and home indicators |
| Keyboard-aware scrolling | `react-native-keyboard-aware-scroll-view` (already installed) | Set logging forms need keyboard-aware scrolling |
| Circular timer visual | `react-native-svg` (available via Expo) | SVG stroke-dasharray technique mirrors web implementation exactly |
| Haptic feedback on timer completion | `expo-haptics` (install needed) | Platform-native haptic feedback, more appropriate than vibration for timer |
| Confirmation dialogs | `Alert.alert` from React Native core | Platform-native replacement for `window.confirm` |
| Text input prompts | Custom Modal with TextInput | Replace `window.prompt` (e.g., template naming) |

## Existing Code and Patterns

- `apps/native/ConvexClientProvider.tsx` — Convex+Clerk provider wiring. Works as-is. All Convex hooks (`useQuery`, `useMutation`) work identically to web.
- `apps/native/src/screens/NotesDashboardScreen.tsx` — Demonstrates `useQuery(api.*)` in React Native with FlatList rendering. Pattern to follow for exercise list and workout history.
- `apps/native/src/screens/CreateNoteScreen.tsx` — Demonstrates `useMutation(api.*)` with form inputs and keyboard-aware scrolling. Pattern to follow for set logging.
- `apps/native/src/screens/LoginScreen.tsx` — Clerk OAuth flow (Google + Apple). Keep as-is, adjust post-login navigation target.
- `apps/native/App.tsx` — Root with font loading and ConvexClientProvider wrapper. Needs StatusBar color update (blue→white per D007) and Navigation swap.
- `apps/native/metro.config.js` — Monorepo-aware Metro config. Already watches `@packages/backend`. No changes needed.
- `apps/web/src/lib/units.ts` — 60 lines of pure conversion functions. Copy to native verbatim (zero web deps).
- `apps/web/src/components/workouts/RestTimerContext.tsx` — 308 lines. Timer state machine is pure React (no web APIs except `AudioContext`). Can be ported with minimal changes: replace `playCompletionBeep()` with `Vibration.vibrate()` or `expo-haptics`.
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — Contains `MUSCLE_GROUPS` and `EQUIPMENT_OPTIONS` constants. Extract these to share with native filter UI.
- All Convex API imports (`api.workouts.*`, `api.sets.*`, `api.exercises.*`, `api.templates.*`, `api.userPreferences.*`, `api.workoutExercises.*`) — Work identically in React Native via `@packages/backend/convex/_generated/api`.

## Constraints

- **No NativeWind or shared CSS** (D009 note) — Web uses Tailwind 4, mobile uses React Native StyleSheet. All styling is platform-specific. No shared design tokens beyond color constants.
- **No Expo Router** — The app uses `@react-navigation/*` directly (not `expo-router`). The navigation is configured imperatively, not file-system-based. Keep this approach for consistency.
- **`window.*` APIs don't exist in React Native** — `window.confirm`, `window.prompt`, `window.alert` used in 5+ web components must be replaced with `Alert.alert` and custom modals.
- **No `"use client"` directives in React Native** — All web components use `"use client"`. React Native doesn't use this pattern. Omit when porting.
- **SVG rendering** — Web uses inline `<svg>` elements extensively. React Native requires `react-native-svg` for SVG or replacement with icon library equivalents.
- **CSS `cn()` utility / Tailwind classes** — All styling must be converted from Tailwind utility classes to React Native StyleSheet objects.
- **`Link` / `useRouter` from Next.js** — Replace with `navigation.navigate()` from React Navigation.
- **Clerk auth on mobile already working** — `@clerk/clerk-expo` v2.19.6 with OAuth (Google/Apple) is proven. Just need to adjust the post-login route.
- **Expo 54 / React Native 0.82** — Both are very recent. The app has `newArchEnabled: true` in app.json (New Architecture / Fabric). No known blockers for our use case.
- **Timer background behavior** — React Native keeps JS running when app is backgrounded (unlike browser tabs). `setInterval` continues. However, if the OS kills the process, timer state is lost (same as web). Full background survival deferred per milestone context.

## Common Pitfalls

- **Large `FlatList` render performance** — The exercise list has 144 items. Use `FlatList` with `keyExtractor`, `getItemLayout` (if possible), and memoized render items. Avoid rendering all 144 exercise cards simultaneously.
- **TextInput `onBlur` behavior differs on mobile** — The onBlur save pattern (D021) from web SetRow works on mobile but the keyboard dismiss trigger is different. Need to ensure `returnKeyType` and `blurOnSubmit` are configured properly. Consider adding a "Done" button above the keyboard.
- **Navigation state after workout creation** — The web uses `useRouter().push()` for navigation after mutations. React Native needs `navigation.navigate()` or `navigation.replace()` — be careful about back-stack behavior (user shouldn't be able to "go back" to a creating state).
- **Responsive font sizing** — The app already uses `react-native-responsive-fontsize` (RFValue). Use this for consistent sizing, but don't over-use — fixed sizes work fine for most gym-oriented large text.
- **Status bar handling** — Current app sets blue status bar. D007 mandates clean/minimal light theme. Update to light status bar with dark content.
- **Auth-gated navigation** — The current app navigates manually from LoginScreen to NotesDashboardScreen after OAuth. For S06, need proper auth state checking (Clerk `useAuth().isSignedIn`) to show login vs. main app, preventing users from seeing workout screens before auth.
- **Template naming modal** — `SaveAsTemplateButton` uses `window.prompt()` which doesn't exist in RN. Need a custom `TextInputModal` component with a text field and confirm/cancel buttons.
- **`crypto.randomUUID()` for superset grouping** — The web uses this in `handleCreateSuperset`. React Native may not have this API. Use `Math.random().toString(36)` or a UUID library as fallback.

## Open Risks

- **Component volume** — ~3,200 lines across 18 web components to port. This is a large slice even though the backend is stable. Risk of scope creep if every web feature gets a 1:1 port with equal polish.
- **`react-native-svg` availability in Expo 54** — Need to verify `react-native-svg` is available in the current Expo SDK for the circular timer. If not, fall back to `Animated.View` with rotation transform.
- **Clerk token caching** — The web Clerk setup caches tokens via the browser. `@clerk/clerk-expo` v2.19.6 may need `expo-secure-store` for token persistence across app restarts. Without it, users may need to re-authenticate every launch.
- **Realtime sync verification** — Milestone requires proving that a set logged on mobile appears on web within ~1s. This depends on both apps connecting to the same Convex deployment, which is already the architecture — but it needs to be explicitly verified during UAT.
- **Typecheck delta** — The native app currently typechecks cleanly, but it references notes API only. After gutting notes screens and adding workout screens, all imports must resolve cleanly against `@packages/backend/convex/_generated/api`. Any schema type mismatches will surface here.
- **App.json metadata** — Currently named "NotesContract" with notes-era branding. Needs update for workout tracker identity.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Expo / React Native | `jezweb/claude-skills@react-native-expo` | available (743 installs) — general Expo/RN patterns |
| Expo / React Native | `mindrally/skills@expo-react-native-typescript` | available (242 installs) — TypeScript-focused |
| Expo / React Native | `pproenca/dot-skills@expo-react-native-performance` | available (178 installs) — performance patterns |
| Convex | `get-convex/agent-skills@function-creator` | available (110 installs) — not needed (backend complete) |
| Clerk | `clerk/skills@clerk-setup` | available (1.9K installs) — Clerk already wired |

**Most relevant:** `jezweb/claude-skills@react-native-expo` (743 installs) — could help with RN/Expo patterns if needed during implementation. Install command: `npx skills add jezweb/claude-skills@react-native-expo`

## Screen Inventory (Web → Mobile)

| Web Route / Component | Mobile Equivalent | Complexity |
|----------------------|-------------------|------------|
| `/exercises` — ExerciseList + ExerciseFilters + ExerciseCard | Exercises tab: FlatList with filter bar | Medium |
| `/workouts` — WorkoutHistory + WorkoutCard | Workouts tab: FlatList with history cards | Medium |
| `/workouts/active` — ActiveWorkout + ActiveWorkoutHeader + WorkoutExerciseList + WorkoutExerciseItem + SetRow + ExercisePicker + RestTimerDisplay + RestDurationConfig + UnitToggle | Active Workout screen (push from history) | **High** — most complex screen, many sub-components |
| `/templates` — TemplateList + TemplateCard | Templates tab: FlatList with template cards | Low-Medium |
| RestTimerContext | RestTimerContext (port with Vibration swap) | Low |
| SaveAsTemplateButton | Part of workout card, with custom TextInput modal | Low |
| N/A | Settings screen (unit toggle, default rest time) | Low |

## Sources

- Convex React Native quickstart docs (source: Context7 `/websites/convex_dev`)
- Expo 54 navigation patterns (source: Context7 `/expo/expo`)
- Expo haptics documentation (source: Context7 `/expo/expo`)
- Existing codebase: `apps/native/` — 4 screens, navigation setup, Convex+Clerk provider
- Existing codebase: `apps/web/src/components/workouts/` — 12 components, 2,507 lines
- Existing codebase: `apps/web/src/components/templates/` — 3 components, 375 lines
- Existing codebase: `apps/web/src/components/exercises/` — 3 components, 301 lines
