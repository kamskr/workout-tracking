# S04: Mobile Social Port — Research

**Date:** 2026-03-11

## Summary

S04 ports all M003 social features (profiles, feed, follow/unfollow, reactions, sharing, privacy toggle, clone-as-template) to the Expo React Native mobile app. This is a **UI-only slice** — no backend changes. The entire Convex API surface (profiles.ts, social.ts, sharing.ts) is already built and type-safe in S01–S03. The mobile app already imports from `@packages/backend/convex/_generated/api` and uses `useQuery`/`useMutation` from `convex/react` throughout all existing screens.

The primary work is: (1) restructure `MainTabs.tsx` to add Feed and Profile tabs while consolidating Settings into Profile (D078 — target 6 tabs), (2) build 5 new screens (FeedScreen, ProfileScreen, ProfileSetupScreen, OtherProfileScreen, SharedWorkoutScreen) and ~8 new components (FeedItemNative, ReactionBarNative, FollowButtonNative, ProfileStatsNative, ProfileSetupFormNative, PrivacyToggleNative, ShareButtonNative, CloneButtonNative) following established native component patterns, and (3) verify TypeScript compiles across all 3 packages with 0 errors.

The risk is genuinely low. Every prior mobile port slice (M001/S06, M002/S04) succeeded by following the same pattern: same Convex queries, platform-specific UI components, StyleSheet-based styling with the theme.ts tokens. The only new concern is `usePaginatedQuery` — never used in the native app before (only on web's feed page). It's exported from `convex/react` and works identically in React Native, but this is the first use and should be verified early. A secondary concern is navigation restructuring — going from 5 tabs to 6 tabs and nesting Settings inside Profile requires careful route param typing.

**Primary recommendation:** Build bottom-up — components first (FeedItemNative, ReactionBarNative, etc.), then screens, then navigation restructuring last. This matches the M001/S06 and M002/S04 pattern and minimizes risk from navigation changes.

## Recommendation

### Approach: Component-first, screen-second, navigation-last

1. **Task 1 — Social components** (~8 components): FeedItemNative, ReactionBarNative, FollowButtonNative, ProfileStatsNative, ProfileSetupFormNative, PrivacyToggleNative, ShareButtonNative, CloneButtonNative. Each mirrors its web counterpart but uses React Native primitives (View, Text, TouchableOpacity, Alert.alert instead of window.alert/prompt, TextInputModal instead of window.prompt).

2. **Task 2 — Social screens** (~5 screens): FeedScreen (paginated feed with `usePaginatedQuery`, user search, empty state), ProfileScreen (own profile with settings nested, inline edit, stats), OtherProfileScreen (or unified ProfileScreen with userId param), ProfileSetupScreen (username creation flow), SharedWorkoutScreen (public workout detail with conditional clone button).

3. **Task 3 — Navigation restructuring + verification**: Update MainTabs.tsx (add Feed + Profile tabs, nest Settings in Profile stack), update type params, typecheck all 3 packages, verify all M003 backend verification scripts still pass (no backend changes means they must be unaffected).

### Why this order
- Components are independently testable and have no dependencies on navigation
- Screens compose components and can be built without navigation wiring
- Navigation is the riskiest change (affects all tabs) and should be done last when everything else compiles

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Paginated feed in React Native | `usePaginatedQuery` from `convex/react` | Already used on web feed page. Same hook works in React Native — returns `{ results, status, loadMore }`. |
| Native prompt dialog (clone template name) | `TextInputModal` component (`apps/native/src/components/TextInputModal.tsx`) | Already built for template naming in WorkoutCard. Reuse for clone-as-template name input. |
| Alert dialogs (errors, confirmations) | `Alert.alert()` from `react-native` | Already used in WorkoutCard delete flow and template save. Replace `window.alert`/`window.confirm` patterns from web. |
| User avatar with initials fallback | Existing pattern in web (Radix Avatar) → simple `View` + `Text` initials + optional `Image` | No need for Radix on native. A simple `View` with borderRadius + `Text` initials is standard RN pattern. |
| Relative timestamps ("3h ago") | Pure function — copy `formatRelativeTime` from web's FeedItem.tsx | Framework-independent utility. Add to `apps/native/src/lib/units.ts`. |
| Theme tokens (colors, spacing, fonts) | `apps/native/src/lib/theme.ts` | Already has all tokens. Social screens use the same `colors`, `spacing`, `fontFamily` constants. |
| Clipboard for share URL | `expo-clipboard` (new dependency) OR `react-native` Clipboard (deprecated) | Need `expo-clipboard` — React Native's built-in Clipboard is deprecated. Small, focused dependency. |
| User identity for profile ownership check | `useUser()` from `@clerk/clerk-expo` | Exported and available. Currently unused in native screens but works identically to `@clerk/clerk-react`. |

## Existing Code and Patterns

### Components to Port (Web → Native mapping)

- `apps/web/src/components/feed/FeedItem.tsx` → `FeedItemNative` — Author avatar/name, workout summary card, relative timestamp, ReactionBar. Replace `<Link>` with `navigation.navigate()`, Radix Avatar with View+Image, Tailwind with StyleSheet.
- `apps/web/src/components/feed/ReactionBar.tsx` → `ReactionBarNative` — 5 emoji buttons with optimistic toggle. Same state machine pattern (local optimistic overlay). Replace `cn()` with conditional StyleSheet.
- `apps/web/src/app/profile/[username]/page.tsx` FollowButton → `FollowButtonNative` — Self-contained component with follow status query, counts, hover-to-unfollow (on mobile: long-press or separate button text).
- `apps/web/src/components/profile/ProfileStats.tsx` → `ProfileStatsNative` — Stat cards grid + top exercises list. Replace Tailwind grid with `flexDirection: 'row'` + `flexWrap: 'wrap'`.
- `apps/web/src/components/profile/ProfileSetupForm.tsx` → `ProfileSetupFormNative` — Username with live validation, displayName, bio. Replace HTML inputs with `TextInput`, form submit with button press.
- `apps/web/src/components/sharing/PrivacyToggle.tsx` → `PrivacyToggleNative` — Toggle switch. Replace custom CSS toggle with `Switch` from `react-native`.
- `apps/web/src/components/sharing/ShareButton.tsx` → `ShareButtonNative` — Share mutation → clipboard copy. Replace `navigator.clipboard.writeText` with `expo-clipboard` `setStringAsync()`. Replace `window.alert` with `Alert.alert`.
- `apps/web/src/components/sharing/CloneButton.tsx` → `CloneButtonNative` — Clone mutation with name input. Replace `window.prompt` with `TextInputModal`. Replace `window.alert` with `Alert.alert`.

### Screens to Build

- `FeedScreen.tsx` — Maps to `apps/web/src/app/feed/page.tsx`. Uses `usePaginatedQuery(api.social.getFeed)`, `FlatList` for feed items, pull-to-refresh, user search section at top.
- `ProfileScreen.tsx` — Combines own-profile view (from `/profile/[username]`) + Settings (from `SettingsScreen.tsx`). Shows avatar, name, bio, stats, edit button, settings section (unit preference, rest time, sign out).
- `ProfileSetupScreen.tsx` — Maps to `/profile/setup`. Username creation flow. Navigate to ProfileScreen on success.
- `OtherProfileScreen.tsx` — Or unified with ProfileScreen via route param. Shows other user's profile with FollowButton and stats.
- `SharedWorkoutScreen.tsx` — Maps to `/shared/[id]`. Shows shared workout detail with conditional CloneButton for authenticated users.

### Established Patterns to Follow

- `apps/native/src/screens/AnalyticsScreen.tsx` — Screen layout: SafeAreaView + ScrollView + section components. This is the template for ProfileScreen and FeedScreen.
- `apps/native/src/components/WorkoutCard.tsx` — Card pattern with self-fetching data (useQuery inside component). FeedItemNative can follow this pattern.
- `apps/native/src/components/analytics/PeriodSelector.tsx` — Reusable horizontal pill selector. Can be adapted for reaction type display.
- `apps/native/src/screens/ExerciseDetailScreen.tsx` — Route param pattern: `useRoute<RouteProp<ParamsType, 'ScreenName'>>()` + `useNavigation<NativeStackNavigationProp<ParamsType>>()`. Profile and shared workout screens need the same pattern.
- `apps/native/src/navigation/MainTabs.tsx` — Tab navigator structure: per-tab Stack navigators wrapping screens. Feed and Profile need the same pattern with nested stack navigators for drill-down.
- `apps/native/src/components/TextInputModal.tsx` — Reusable modal for text input (template naming). Reuse for clone-as-template name prompt.

### Convex API Surface (all already built)

- `api.profiles.createProfile` — Profile creation (username, displayName, bio)
- `api.profiles.updateProfile` — Edit displayName, bio
- `api.profiles.getProfile` — By userId
- `api.profiles.getProfileByUsername` — By username (for availability check)
- `api.profiles.getProfileStats` — Workout stats (totalWorkouts, streak, volume, topExercises)
- `api.profiles.searchProfiles` — Text search on displayName
- `api.profiles.generateAvatarUploadUrl` — Avatar upload URL generation
- `api.social.followUser` / `unfollowUser` — Follow mutations
- `api.social.getFollowStatus` — { isFollowing: boolean }
- `api.social.getFollowCounts` — { followers, following }
- `api.social.getFeed` — Paginated feed with enriched items (author, reactions)
- `api.social.addReaction` / `removeReaction` — Reaction mutations
- `api.social.getReactionsForFeedItem` — Reaction data
- `api.social.blockUser` / `unblockUser` — Block mutations
- `api.sharing.shareWorkout` — Creates share feed item, returns feedItemId
- `api.sharing.getSharedWorkout` — Public query (no auth required)
- `api.sharing.cloneSharedWorkoutAsTemplate` — Clone mutation (auth required)
- `api.sharing.toggleWorkoutPrivacy` — Privacy toggle mutation

## Constraints

- **6-tab maximum (D078):** Bottom tab bar with 6 tabs (Exercises, Workouts, Templates, Analytics, Feed, Profile). Going to 7+ makes touch targets too small. Settings must be consolidated into Profile as a sub-screen (nested stack navigator within Profile tab).
- **No backend changes allowed:** S04 is UI-only. All Convex functions are frozen from S01–S03. If any query/mutation signature doesn't fit mobile UX, work around it client-side.
- **`usePaginatedQuery` is new to native:** First use in the mobile app. The hook is from `convex/react` and works in React Native, but the `FlatList` integration pattern (infinite scroll with `loadMore`) needs careful implementation. Web uses a "Load More" button; mobile should use `onEndReached` for infinite scroll.
- **No `navigator.clipboard` in React Native:** ShareButton needs `expo-clipboard` (`setStringAsync`). This is a new dependency that must be installed.
- **No `window.prompt` in React Native:** CloneButton uses `window.prompt` on web. Mobile must use the existing `TextInputModal` component.
- **No `window.alert` or `window.confirm` in React Native:** All error/confirmation dialogs must use `Alert.alert()` from `react-native`.
- **`useUser()` from `@clerk/clerk-expo`:** Available but currently unused in native screens. Profile ownership check (`isOwnProfile`) needs `useUser().user.id` to compare with `profile.userId`.
- **No hover states in React Native:** Web's FollowButton uses hover-to-show-unfollow. Mobile should show "Following" text and use long-press or tap-to-toggle pattern instead.
- **TypeScript must compile across all 3 packages with 0 errors:** `tsc --noEmit` for backend, web, and native. Pre-existing errors (if any) must not increase.
- **Profile setup gating:** On mobile, the first time a user touches any social feature (Feed, Profile), they should be redirected to profile setup if they don't have a profile yet. Check via `useQuery(api.profiles.getProfile, { userId })` and navigate accordingly.
- **`expo-clipboard` compatibility:** Must use `expo-clipboard` >= 5.0 for Expo SDK 54. Check compatibility before installing.
- **Shared workout deep link (deferred):** Mobile doesn't have `/shared/[id]` routing via URL. The SharedWorkoutScreen will be navigated to from within the app (e.g., tapping a share link in feed). Universal links/deep links are out of scope for S04.

## Common Pitfalls

- **`usePaginatedQuery` + FlatList mismatch** — `usePaginatedQuery` returns `{ results, status, loadMore }`. `FlatList`'s `onEndReached` fires multiple times rapidly. Guard `loadMore` with `status === "CanLoadMore"` check to prevent duplicate fetches. Don't call `loadMore` during `LoadingMore` status.
- **Missing profile guard on Feed/Profile screens** — If user hasn't created a profile and navigates to Feed or Profile tab, queries that need a profile will fail or show empty state. Add a profile-exists check at the screen level and redirect to ProfileSetupScreen if null.
- **Optimistic state in ReactionBar flicker** — The web ReactionBar uses local optimistic state that auto-clears on mutation success. In React Native with potentially slower network, the flicker window is wider. Keep the same pattern but ensure the UI doesn't show jarring state changes.
- **Navigation type params across nested stacks** — React Navigation 7.x with TypeScript requires explicit type params for every navigator and screen. Missing types cause runtime crashes, not just compile errors. Define a `SocialStackParamList` type and use it consistently.
- **Keyboard handling on ProfileSetupScreen** — Username and bio inputs need `KeyboardAvoidingView` or `react-native-keyboard-aware-scroll-view` (already in deps) to prevent the keyboard from covering input fields.
- **Avatar image loading delay** — Convex storage URLs may have loading latency. Always show initials fallback first, then load image. Don't render an empty space while avatar loads.
- **FlatList re-rendering on feed update** — Convex reactive subscription causes `results` array to change reference on every update. Use `keyExtractor` with `item._id` and memoize `renderItem` to prevent full-list re-renders.
- **Settings consolidation regression** — Moving Settings into Profile tab could confuse users who expect Settings as a top-level tab. Ensure sign out, unit preferences, and rest timer settings are all accessible within the Profile screen. Don't lose any existing Settings functionality.
- **Tab icon selection** — Ionicons must have appropriate icons for Feed (e.g., `newspaper` / `newspaper-outline`) and Profile (e.g., `person` / `person-outline`). Settings icon (`settings` / `settings-outline`) should appear as a gear button within Profile, not as a tab.

## Open Risks

- **`usePaginatedQuery` React Native compatibility** — While the hook is exported from `convex/react` and there's no documented React Native incompatibility, it has never been used in this app's mobile codebase. The first use should be verified early (build FeedScreen first and confirm pagination works before building other screens). Risk: low but non-zero.
- **6 tabs on small phones** — iPhone SE and Android compact devices (~320dp width) may make 6 tab labels hard to read. Mitigation: use icons-only on very small screens, or accept that labels may truncate. Test at minimum supported width.
- **Expo SDK 54 + expo-clipboard** — Need to verify `expo-clipboard` version compatibility with Expo SDK 54. The `expo install` command should handle this automatically.
- **Profile creation race on mobile** — Same race condition risk as web (D072), but mobile may have more aggressive component re-mounts. The atomic `createProfile` mutation handles this server-side, but the UI should handle the "profile already exists" response gracefully (navigate to profile view instead of showing error).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| React Native / Expo | `wshobson/agents@react-native-architecture` (4.3K installs) | available — general RN architecture patterns |
| React Native / Expo | `jezweb/claude-skills@react-native-expo` (744 installs) | available — Expo-specific patterns |
| React Native / Expo | `mindrally/skills@expo-react-native-typescript` (247 installs) | available — TypeScript + Expo |
| React Native Design | `wshobson/agents@react-native-design` (4.1K installs) | available — RN design patterns |
| Convex Realtime | `waynesutton/convexskills@convex-realtime` (109 installs) | available — Convex reactive patterns |
| Convex + Expo | `tristanmanchester/agent-skills@integrating-convex-expo` (12 installs) | available — directly relevant but low installs |
| Frontend Design | `frontend-design` | installed — for UI components |

**Recommendation:** The existing codebase already has 15+ mobile screens and components establishing clear patterns. Skills are optional for this slice — the patterns are well-documented in the code itself. If any skill would help, `wshobson/agents@react-native-architecture` (4.3K installs) covers general React Native architecture. The `integrating-convex-expo` skill is directly relevant but low installs suggests limited content.

## New Dependency

- **`expo-clipboard`** — Required for ShareButton clipboard functionality on mobile. Install with `npx expo install expo-clipboard` in the `apps/native` directory. Expected version: ~7.0.x for Expo SDK 54.

## Task Breakdown (Advisory)

### T01: Social Components (~8 components)
- `FeedItemNative.tsx` — feed card with author, summary, reactions
- `ReactionBarNative.tsx` — 5 emoji buttons with optimistic toggle
- `FollowButtonNative.tsx` — self-contained follow/unfollow with counts
- `ProfileStatsNative.tsx` — stat cards + top exercises
- `ProfileSetupFormNative.tsx` — username validation, creation form
- `PrivacyToggleNative.tsx` — Switch component for public/private
- `ShareButtonNative.tsx` — share mutation + clipboard copy (needs expo-clipboard)
- `CloneButtonNative.tsx` — clone mutation + TextInputModal for name

### T02: Social Screens (~5 screens)
- `FeedScreen.tsx` — paginated feed (usePaginatedQuery + FlatList), user search, empty state
- `ProfileScreen.tsx` — own profile + nested settings (consolidates SettingsScreen)
- `ProfileSetupScreen.tsx` — username creation flow
- `OtherProfileScreen.tsx` — other user's profile with FollowButton
- `SharedWorkoutScreen.tsx` — shared workout detail + clone button

### T03: Navigation + TypeScript Verification
- Update `MainTabs.tsx` — add Feed tab, replace Settings with Profile tab
- Define navigation type params for all new screens
- Add profile-exists guard on social screens (redirect to setup if no profile)
- Wire navigation between screens (feed item → profile, profile → settings, etc.)
- Install `expo-clipboard` dependency
- Add `ShareButtonNative` and `PrivacyToggleNative` to native `WorkoutCard.tsx`
- TypeScript compilation verification across all 3 packages
- Verify all M003 backend verification scripts still pass (no backend changes)

## Sources

- Existing mobile codebase: MainTabs.tsx, SettingsScreen.tsx, AnalyticsScreen.tsx, ExerciseDetailScreen.tsx, WorkoutCard.tsx, TextInputModal.tsx, theme.ts, units.ts
- Existing web social components: FeedItem.tsx, ReactionBar.tsx, ProfileSetupForm.tsx, ProfileStats.tsx, SharedWorkoutView.tsx, PrivacyToggle.tsx, ShareButton.tsx, CloneButton.tsx
- Convex API surface: profiles.ts, social.ts, sharing.ts (all S01–S03 output)
- Navigation patterns: @react-navigation/bottom-tabs v7.x, @react-navigation/native-stack v7.x
- M001/S06 summary and M002/S04 summary (prior mobile port slices establishing the pattern)
- D078 decision: Profile tab replaces Settings, Feed tab added, target 6 tabs
- expo-clipboard documentation for Expo SDK 54 compatibility
