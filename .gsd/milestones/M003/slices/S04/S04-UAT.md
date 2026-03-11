# S04: Mobile Social Port — UAT

**Milestone:** M003
**Written:** 2026-03-11

## UAT Type

- UAT mode: human-experience
- Why this mode is sufficient: S04 is a pure UI port — no backend changes, no new Convex functions. The backend is already proven by S01-S03 verification scripts (42 checks). Mobile social features require visual inspection in Expo runtime for layout, navigation, touch interaction quality, and 6-tab usability — none of which can be verified by TypeScript compilation or grep alone.

## Preconditions

- Expo development server running (`cd apps/native && npx expo start`)
- Convex backend deployed and accessible (Convex dev server or production)
- At least one user profile already created (for testing feed, follow, etc.)
- A second test account available (for testing follow/unfollow, other-profile view)
- At least one completed workout exists (for testing share/privacy/feed)

## Smoke Test

Open the Expo app → confirm 6 tabs visible at bottom (Exercises, Workouts, Templates, Analytics, Feed, Profile) → tap Feed tab → confirm feed loads or shows empty state → tap Profile tab → confirm own profile or setup prompt appears.

## Test Cases

### 1. Profile Setup Flow (New User)

1. Sign in with a fresh Clerk account that has no profile
2. Tap Profile tab
3. **Expected:** "Create your profile" prompt appears with navigation to setup screen
4. Tap "Create Profile" or setup prompt
5. Enter a username (3-30 chars, alphanumeric + underscore)
6. **Expected:** Live validation shows green checkmark for valid/available, red X for taken/invalid
7. Enter display name and optional bio
8. Tap "Create Profile"
9. **Expected:** Navigation resets to ProfileScreen showing the new profile — no back button to setup screen

### 2. Own Profile View + Settings

1. Tap Profile tab (with existing profile)
2. **Expected:** Avatar (initials if no image), display name, @username, bio visible
3. Scroll down to see ProfileStatsNative (total workouts, streak, volume, top exercises)
4. Scroll further to see Settings section (weight unit toggle, rest timer stepper, sign out)
5. Toggle weight unit
6. **Expected:** Unit changes (kg ↔ lbs) and persists
7. Tap edit mode toggle on profile section
8. Edit display name and bio
9. Save
10. **Expected:** Updated values persist and display

### 3. Feed with Paginated Infinite Scroll

1. Tap Feed tab
2. **Expected:** If following users with activity → feed items appear with author avatar, name, workout summary, relative timestamp, reaction bar
3. Scroll to bottom of feed
4. **Expected:** If more items exist → loading spinner at bottom, then more items load ("Load More")
5. Continue scrolling until all items loaded
6. **Expected:** "You're all caught up!" or similar exhausted state
7. If no activity → "Discover users" empty state prompt

### 4. User Search and Follow/Unfollow

1. On Feed tab, tap search area or navigate to search
2. Type a partial name in the search field
3. **Expected:** Search results appear after brief debounce (~300ms)
4. Tap "Follow" on a search result
5. **Expected:** Button changes to "Following"
6. Navigate to that user's profile (tap on their name)
7. **Expected:** OtherProfileScreen shows their profile, stats, FollowButton shows "Following"
8. Tap "Following" to unfollow
9. **Expected:** Button changes back to "Follow"

### 5. Reactions on Feed Items

1. On Feed tab with feed items visible
2. Tap a reaction emoji (🔥, 👊, 👏, 💪, 🏆) on a feed item
3. **Expected:** Count increments immediately (optimistic), emoji appears selected
4. Tap same emoji again
5. **Expected:** Count decrements (toggle off), emoji deselected

### 6. Share a Workout

1. Navigate to Workouts tab, find a completed workout
2. Scroll to the social controls row on the WorkoutCard
3. **Expected:** Privacy toggle (Switch) and Share button visible for completed workouts
4. Tap Share button
5. **Expected:** Brief loading → "Link copied!" flash message → URL in clipboard

### 7. Privacy Toggle

1. On a completed WorkoutCard, find the privacy toggle
2. Toggle from Public → Private
3. **Expected:** Switch changes, label updates to "Private"
4. Toggle back to Public
5. **Expected:** Switch changes, label updates to "Public"

### 8. View Shared Workout + Clone

1. Navigate to a shared workout (via feed item tap or deep link)
2. **Expected:** SharedWorkoutScreen shows workout name, date, duration, exercise list with set tables, author card
3. If signed in → CloneButtonNative visible
4. Tap Clone button
5. **Expected:** TextInputModal appears for template name
6. Enter a name and confirm
7. **Expected:** "Cloned!" flash message. Template appears in Templates tab.

### 9. Navigation Drill-Down

1. Tap Feed tab → tap an author name on a feed item
2. **Expected:** Navigates to OtherProfileScreen with back button
3. Tap back
4. **Expected:** Returns to feed, scroll position preserved
5. Tap Profile tab → Profile shows → tap a settings action
6. **Expected:** Settings actions (unit, rest timer, sign out) work inline without navigation

## Edge Cases

### Empty Feed State
1. Sign in with a user that follows nobody
2. Tap Feed tab
3. **Expected:** Empty state with discovery prompt, not a crash or blank screen

### Profile Not Created Guard
1. Sign in with user that has no profile, tap Feed tab
2. **Expected:** Either redirects to profile setup or shows meaningful "create profile first" message — not a crash

### 6-Tab Bar on Small Screen
1. View the app on iPhone SE or smallest supported viewport
2. **Expected:** All 6 tab labels/icons are visible and tappable without overlap or truncation

### Rapid Reaction Taps
1. Quickly tap-toggle a reaction emoji 5+ times
2. **Expected:** No crash, no duplicate mutations, final state is consistent (either reacted or not)

## Failure Signals

- Crash on tab switch to Feed or Profile
- Feed shows infinite loading spinner (never resolves)
- Profile setup form accepts invalid usernames (< 3 chars, special characters)
- Share button fails silently (no "Link copied!" flash, no Alert.alert error)
- Clone button shows for unauthenticated users
- Settings missing from Profile tab (can't find unit toggle, rest timer, sign out)
- More than 6 or fewer than 6 tabs in tab bar
- PrivacyToggle or ShareButton missing from completed WorkoutCards
- Back navigation broken on OtherProfileScreen or SharedWorkoutScreen

## Requirements Proved By This UAT

- R011 (Cross-Platform UI) — Mobile social features work: profile, feed, reactions, follow, share, clone, privacy toggle across all new screens and navigation
- R015 (User Profiles) — Mobile profile creation, viewing, editing, stats display functional
- R016 (Follow System and Activity Feed) — Mobile feed renders with pagination, reactions toggle, follow/unfollow works, user search returns results
- R017 (Workout Sharing) — Mobile share copies link, clone creates template, privacy toggle works, shared workout view renders correctly

## Not Proven By This UAT

- Backend correctness of social queries (proven by S01-S03 verification scripts, pending execution due to Convex CLI auth)
- Feed performance under load (50+ items from 50+ users) — requires operational verification
- Realtime subscription latency (feed item appears within seconds of workout completion) — requires multi-device live test
- Privacy enforcement (private workouts excluded from feed/profile/share) — proven by backend scripts, not by mobile UAT
- Block filtering — backend mutations exist but no block UI on mobile
- Public unauthenticated share link — mobile app requires auth, web route handles unauthenticated access

## Notes for Tester

- Pre-existing TS2307 errors in native TypeScript are expected — they're module resolution issues, not runtime errors.
- The app uses Convex realtime subscriptions, so feed items and reactions should update live without manual refresh.
- `expo-clipboard` may require Expo Go or a development build — clipboard access varies by environment.
- 6 tabs may feel slightly crowded on small phones. This is a known tradeoff (D078) — feedback on whether 5 tabs with a "More" menu would be better is welcome.
- SettingsScreen.tsx file still exists but is no longer a tab — all its functionality is in ProfileScreen.
