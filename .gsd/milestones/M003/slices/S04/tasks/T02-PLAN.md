---
estimated_steps: 5
estimated_files: 5
---

# T02: Build 5 social screens with FlatList feed

**Slice:** S04 — Mobile Social Port
**Milestone:** M003

## Description

Create all 5 social screens that compose the T01 components into complete UI surfaces. The key technical novelty is FeedScreen's `usePaginatedQuery` + FlatList integration — the first use of Convex pagination in the native app. ProfileScreen consolidates the own-profile view and all SettingsScreen functionality into one screen. ProfileSetupScreen gates first-time social access. OtherProfileScreen shows another user's profile with FollowButton. SharedWorkoutScreen shows a shared workout with conditional CloneButton.

## Steps

1. **Build FeedScreen** — Use `usePaginatedQuery(api.social.getFeed, {}, { initialNumItems: 15 })` with FlatList. Guard `loadMore` in `onEndReached` with `status === "CanLoadMore"` check (prevent duplicate fetches). Render states: loading (ActivityIndicator), empty (discovery prompt), items (FeedItemNative list), loading more (footer spinner), exhausted ("all caught up"). Add user search section at top (TextInput + `searchProfiles` query with debounce, search result cards with inline follow/unfollow). Use `keyExtractor` with `item._id` and memoize `renderItem`. Accept navigation prop to navigate to OtherProfileScreen on author tap.

2. **Build ProfileScreen** — Own-profile view combining profile data + settings. Fetch profile via `useQuery(api.profiles.getProfile, { userId })` where userId comes from `useUser().user.id`. If profile is null (not created), show a button/prompt to navigate to ProfileSetupScreen. Otherwise show: avatar (View + initials fallback), displayName, @username, bio, inline edit toggle (displayName + bio, same as web), ProfileStatsNative component. Below profile section: Settings section with "Weight Unit" toggle, "Default Rest Time" stepper, and "Sign Out" button — same logic as existing SettingsScreen.tsx. Use ScrollView (not FlatList — mixed content).

3. **Build ProfileSetupScreen** — Full-screen username creation flow. Renders ProfileSetupFormNative wrapped in SafeAreaView + KeyboardAvoidingView. On successful profile creation, navigate to ProfileScreen (replace, not push — prevent back-to-setup). Seed initial displayName from `useUser().user?.fullName`.

4. **Build OtherProfileScreen** — Receives `userId` (and optionally `username`) via route params. Queries `getProfile` or `getProfileByUsername` based on available param. Shows avatar, name, bio, ProfileStatsNative, FollowButtonNative. Back button in header. "Profile not found" handling for null query result. No edit capability (not own profile). Navigation to SharedWorkoutScreen if viewing from feed context.

5. **Build SharedWorkoutScreen** — Receives `feedItemId` via route param. Queries `getSharedWorkout` using feedItemId. Renders workout name, date, duration, exercise list with sets (matching web SharedWorkoutView layout). Shows CloneButtonNative if user is authenticated (`useUser().isSignedIn`). "Workout not available" empty state if query returns null. Back button in header.

## Must-Haves

- [ ] FeedScreen uses `usePaginatedQuery` with FlatList `onEndReached` guarded by `status === "CanLoadMore"`
- [ ] FeedScreen has user search section with debounced `searchProfiles` query
- [ ] ProfileScreen includes ALL SettingsScreen functionality (unit toggle, rest timer stepper, sign out)
- [ ] ProfileScreen shows profile-not-created state with navigation to ProfileSetupScreen
- [ ] ProfileSetupScreen navigates to ProfileScreen on success (replace, not push)
- [ ] OtherProfileScreen handles "profile not found" gracefully
- [ ] SharedWorkoutScreen shows CloneButtonNative only when user is authenticated
- [ ] All screens use SafeAreaView + theme.ts styling
- [ ] All screens follow established route param pattern (useRoute + useNavigation with typed params)
- [ ] `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors

## Verification

- `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors
- `ls apps/native/src/screens/FeedScreen.tsx apps/native/src/screens/ProfileScreen.tsx apps/native/src/screens/ProfileSetupScreen.tsx apps/native/src/screens/OtherProfileScreen.tsx apps/native/src/screens/SharedWorkoutScreen.tsx` — all exist
- `grep "usePaginatedQuery" apps/native/src/screens/FeedScreen.tsx` — confirms paginated feed hook
- `grep "CanLoadMore" apps/native/src/screens/FeedScreen.tsx` — confirms pagination guard
- `grep "signOut" apps/native/src/screens/ProfileScreen.tsx` — confirms settings consolidation
- `grep "getSharedWorkout" apps/native/src/screens/SharedWorkoutScreen.tsx` — confirms shared workout query

## Observability Impact

- Signals added/changed: `[FeedScreen]`, `[ProfileScreen]` console.error prefixes on mutation failures in search follow/unfollow and profile update handlers
- How a future agent inspects this: TypeScript compilation verifies all Convex API bindings are correct. Screen file existence + grep for key API hooks confirms integration.
- Failure state exposed: Profile-not-found and workout-not-available states render user-visible messages. Feed loading/empty states handle all pagination statuses.

## Inputs

- `apps/native/src/components/social/*.tsx` — All 8 social components from T01
- `apps/native/src/screens/SettingsScreen.tsx` — Settings functionality to consolidate into ProfileScreen
- `apps/native/src/screens/AnalyticsScreen.tsx` — Screen layout pattern (SafeAreaView + ScrollView + sections)
- `apps/native/src/screens/ExerciseDetailScreen.tsx` — Route param pattern (useRoute + useNavigation with typed params)
- `apps/web/src/app/feed/page.tsx` — Web feed page for layout/logic reference
- `apps/web/src/app/profile/[username]/page.tsx` — Web profile page for layout/logic reference
- `apps/web/src/app/shared/[id]/page.tsx` — Web shared workout page for layout reference

## Expected Output

- `apps/native/src/screens/FeedScreen.tsx` — Paginated feed with search, reactions, infinite scroll
- `apps/native/src/screens/ProfileScreen.tsx` — Own profile + settings consolidation
- `apps/native/src/screens/ProfileSetupScreen.tsx` — Username creation flow
- `apps/native/src/screens/OtherProfileScreen.tsx` — Other user's profile with follow
- `apps/native/src/screens/SharedWorkoutScreen.tsx` — Shared workout detail with conditional clone
