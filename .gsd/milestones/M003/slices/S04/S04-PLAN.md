# S04: Mobile Social Port

**Goal:** All M003 social features work on mobile — Profile tab (view/edit own profile, view others, follow/unfollow), Feed tab (paginated realtime feed with reactions), share/clone/privacy UI, profile setup gating. Same Convex backend queries, no backend changes. Mobile navigation updated (6 tabs: Exercises, Workouts, Templates, Analytics, Feed, Profile — Settings consolidated into Profile).
**Demo:** Open the Expo app → Feed tab shows paginated activity feed with reactions → Profile tab shows own profile with stats and settings → navigate to another user's profile to follow/unfollow → share a completed workout (clipboard copy) → toggle privacy on a workout → all social features usable on mobile.

## Must-Haves

- 8 native social components (FeedItemNative, ReactionBarNative, FollowButtonNative, ProfileStatsNative, ProfileSetupFormNative, PrivacyToggleNative, ShareButtonNative, CloneButtonNative) following established RN patterns
- 5 new screens (FeedScreen, ProfileScreen, ProfileSetupScreen, OtherProfileScreen, SharedWorkoutScreen) consuming Convex queries
- MainTabs.tsx restructured: 6 tabs (D078) with Feed and Profile replacing Settings, settings nested inside Profile stack
- `expo-clipboard` installed for ShareButton clipboard functionality
- `formatRelativeTime` utility added to native lib
- Profile-exists guard on Feed/Profile tabs (redirect to ProfileSetupScreen if no profile)
- `usePaginatedQuery` + FlatList integration for infinite-scroll feed with `onEndReached` guard
- TypeScript compiles 0 errors across all 3 packages (`tsc --noEmit`)
- All M003 backend verification scripts still structurally valid (no backend changes)

## Proof Level

- This slice proves: final-assembly (all social features working on mobile, completing M003 cross-platform requirement)
- Real runtime required: yes (Expo runtime for visual verification)
- Human/UAT required: yes (mobile layout, navigation, interaction quality require visual inspection in Expo)

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors (no backend changes, must stay green)
- `tsc --noEmit -p apps/web/tsconfig.json` — 0 errors (no web changes, must stay green)
- `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors (all new screens/components compile)
- `grep -r "usePaginatedQuery" apps/native/src/` — confirms paginated feed hook usage
- `grep -r "expo-clipboard" apps/native/package.json` — confirms dependency installed
- All 8 components exist: `ls apps/native/src/components/social/` shows FeedItemNative.tsx, ReactionBarNative.tsx, FollowButtonNative.tsx, ProfileStatsNative.tsx, ProfileSetupFormNative.tsx, PrivacyToggleNative.tsx, ShareButtonNative.tsx, CloneButtonNative.tsx
- All 5 screens exist: `ls apps/native/src/screens/` shows FeedScreen.tsx, ProfileScreen.tsx, ProfileSetupScreen.tsx, OtherProfileScreen.tsx, SharedWorkoutScreen.tsx
- MainTabs.tsx has 6 Tab.Screen entries (Exercises, Workouts, Templates, Analytics, Feed, Profile)
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` returns 6
- SettingsScreen.tsx functionality preserved (accessible from ProfileScreen)
- Backend verification scripts structurally unchanged: `wc -l packages/backend/scripts/verify-s0*-m03.ts` unchanged from S03

## Observability / Diagnostics

- Runtime signals: `[FeedScreen]`, `[ProfileScreen]`, `[ShareButtonNative]`, `[CloneButtonNative]` console.error prefixes on mutation failures (matching existing WorkoutCard pattern)
- Inspection surfaces: TypeScript compilation is the primary diagnostic (0 errors = healthy). Convex reactive subscriptions provide automatic realtime data flow — no manual polling or state inspection needed.
- Failure visibility: React Native `Alert.alert` surfaces all mutation errors to the user (replacing web's `window.alert`). Network-level errors surface via Convex's built-in error handling in `useQuery`/`useMutation`.
- Redaction constraints: none (no secrets in mobile UI layer)

## Integration Closure

- Upstream surfaces consumed: All S01-S03 Convex functions (profiles.ts, social.ts, sharing.ts), existing native theme.ts, units.ts, TextInputModal.tsx, navigation patterns (MainTabs.tsx, Navigation.tsx)
- New wiring introduced in this slice: 6-tab MainTabs navigation with Feed and Profile stacks, profile-exists guard gating social screens, usePaginatedQuery + FlatList infinite scroll pattern (first use in native), expo-clipboard dependency for share URL copying
- What remains before the milestone is truly usable end-to-end: Human UAT of mobile social features in Expo runtime, Convex CLI auth resolution for running M003 verification scripts (72 + 42 checks), visual inspection of 6-tab navigation on small devices

## Tasks

- [x] **T01: Build 8 native social components** `est:45m`
  - Why: Components are the building blocks — independently implementable with no navigation dependencies. Must exist before screens can compose them.
  - Files: `apps/native/src/components/social/FeedItemNative.tsx`, `apps/native/src/components/social/ReactionBarNative.tsx`, `apps/native/src/components/social/FollowButtonNative.tsx`, `apps/native/src/components/social/ProfileStatsNative.tsx`, `apps/native/src/components/social/ProfileSetupFormNative.tsx`, `apps/native/src/components/social/PrivacyToggleNative.tsx`, `apps/native/src/components/social/ShareButtonNative.tsx`, `apps/native/src/components/social/CloneButtonNative.tsx`, `apps/native/src/lib/units.ts`
  - Do: Port each web social component to React Native using established patterns (View/Text/TouchableOpacity/StyleSheet, theme.ts tokens, Alert.alert for errors, TextInputModal for prompts). Install `expo-clipboard` for ShareButtonNative. Add `formatRelativeTime` to units.ts. ReactionBarNative uses same optimistic state overlay pattern as web. FollowButtonNative uses tap-to-toggle (no hover). ProfileSetupFormNative uses KeyboardAvoidingView + TextInput with live username validation. PrivacyToggleNative uses RN Switch component.
  - Verify: `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors. All 8 files exist in `apps/native/src/components/social/`.
  - Done when: All 8 components compile with correct Convex API types, use platform-appropriate patterns (Alert.alert, Switch, TextInputModal), and follow theme.ts design language.

- [x] **T02: Build 5 social screens with FlatList feed** `est:40m`
  - Why: Screens compose the components into full UI surfaces. FeedScreen introduces `usePaginatedQuery` + FlatList (first native use) — the primary new technical pattern.
  - Files: `apps/native/src/screens/FeedScreen.tsx`, `apps/native/src/screens/ProfileScreen.tsx`, `apps/native/src/screens/ProfileSetupScreen.tsx`, `apps/native/src/screens/OtherProfileScreen.tsx`, `apps/native/src/screens/SharedWorkoutScreen.tsx`
  - Do: Build FeedScreen with `usePaginatedQuery(api.social.getFeed)` + FlatList (`onEndReached` guarded by `status === "CanLoadMore"`), user search section, empty state. ProfileScreen combines own profile (avatar, name, bio, stats, inline edit) + settings section (unit toggle, rest timer, sign out — moved from SettingsScreen). ProfileSetupScreen uses ProfileSetupFormNative with navigation to ProfileScreen on success. OtherProfileScreen takes userId route param, shows profile with FollowButton. SharedWorkoutScreen shows shared workout detail with conditional CloneButton (auth check via useUser).
  - Verify: `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors. All 5 screen files exist.
  - Done when: All 5 screens compile, FeedScreen uses `usePaginatedQuery` with FlatList infinite scroll, ProfileScreen includes all SettingsScreen functionality, profile-exists guard logic is present.

- [x] **T03: Restructure navigation, wire social features into WorkoutCard, and verify TypeScript across all packages** `est:35m`
  - Why: Navigation restructuring (5→6 tabs, Settings→Profile consolidation) is the riskiest change and should be done last. Also wires ShareButton/PrivacyToggle into native WorkoutCard for completed workouts and adds profile-exists guard navigation.
  - Files: `apps/native/src/navigation/MainTabs.tsx`, `apps/native/src/components/WorkoutCard.tsx`, `apps/native/src/screens/SettingsScreen.tsx`
  - Do: Update MainTabs.tsx to 6 tabs (Exercises, Workouts, Templates, Analytics, Feed, Profile). Add Feed stack (FeedScreen → OtherProfileScreen → SharedWorkoutScreen) and Profile stack (ProfileScreen → ProfileSetupScreen → OtherProfileScreen). Define navigation type params for all new screens. Add profile-exists guard hook that checks `useQuery(api.profiles.getProfile)` and navigates to ProfileSetupScreen if null. Wire PrivacyToggleNative and ShareButtonNative into native WorkoutCard for completed workouts. Remove Settings tab (SettingsScreen.tsx kept for reference but no longer a tab). Verify TypeScript compiles 0 errors across all 3 packages.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json && tsc --noEmit -p apps/web/tsconfig.json && tsc --noEmit -p apps/native/tsconfig.json` — all 0 errors. `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` returns 6. Backend verification scripts unchanged.
  - Done when: 6-tab navigation compiles and renders, all cross-screen navigation is typed, WorkoutCard shows share/privacy controls for completed workouts, TypeScript 0 errors across all 3 packages.

## Files Likely Touched

- `apps/native/src/components/social/FeedItemNative.tsx` (new)
- `apps/native/src/components/social/ReactionBarNative.tsx` (new)
- `apps/native/src/components/social/FollowButtonNative.tsx` (new)
- `apps/native/src/components/social/ProfileStatsNative.tsx` (new)
- `apps/native/src/components/social/ProfileSetupFormNative.tsx` (new)
- `apps/native/src/components/social/PrivacyToggleNative.tsx` (new)
- `apps/native/src/components/social/ShareButtonNative.tsx` (new)
- `apps/native/src/components/social/CloneButtonNative.tsx` (new)
- `apps/native/src/screens/FeedScreen.tsx` (new)
- `apps/native/src/screens/ProfileScreen.tsx` (new)
- `apps/native/src/screens/ProfileSetupScreen.tsx` (new)
- `apps/native/src/screens/OtherProfileScreen.tsx` (new)
- `apps/native/src/screens/SharedWorkoutScreen.tsx` (new)
- `apps/native/src/navigation/MainTabs.tsx` (modified — 6 tabs)
- `apps/native/src/components/WorkoutCard.tsx` (modified — add share/privacy)
- `apps/native/src/lib/units.ts` (modified — add formatRelativeTime)
- `apps/native/package.json` (modified — add expo-clipboard)
