# S04: Mobile Competitive Port — UAT

**Milestone:** M004
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + human-experience)
- Why this mode is sufficient: TypeScript compilation and structural grep checks prove all API wiring is correct and type-safe. However, 7-tab navigation usability, date input UX, badge grid layout on narrow screens, and challenge flow ergonomics require human evaluation on a real device or Expo Go.

## Requirements Proved By This UAT

- **R011 (Cross-Platform UI)** — Proves competitive features compile and wire correctly for mobile, consuming the same Convex backend as web. Runtime UX proof requires live testing.
- **R018 (Leaderboards — mobile)** — Proves LeaderboardScreen consumes getLeaderboard, getMyRank, getLeaderboardExercises, and ProfileScreen consumes setLeaderboardOptIn — all type-safe. Structural grep confirms all 4 API call sites.
- **R019 (Group Challenges — mobile)** — Proves ChallengesScreen and ChallengeDetailScreen consume listChallenges, createChallenge, joinChallenge, leaveChallenge, cancelChallenge, getChallengeStandings — all type-safe. Structural grep confirms all 6 API call sites.
- **R020 (Achievements and Badges — mobile)** — Proves BadgeDisplayNative consumes getUserBadges and renders on both ProfileScreen and OtherProfileScreen. Structural grep confirms API call site and component integration.

## Not Proven By This UAT

- **Live backend data flow:** Verification scripts (40 checks across S01-S03) remain blocked on Convex CLI auth. Cannot prove data correctness end-to-end until those execute.
- **Runtime visual rendering:** Badge grid layout, leaderboard table scrolling, challenge card list performance, and date input parsing require Expo Go or device testing.
- **7-tab navigation usability:** Whether 7 bottom tabs are comfortable on various screen sizes (especially small phones) is a human judgment call.
- **Challenge creation date UX:** TextInput date entry (D136) may confuse users — needs human validation of the freeform YYYY-MM-DD HH:MM format.
- **Challenge exercise picker performance:** Modal loads full exercise list (144+) — untested on low-end devices.

## Preconditions

- Expo development server running: `cd apps/native && npx expo start`
- Expo Go installed on test device or simulator configured
- Convex backend deployed and running (for data to appear)
- Test user signed in via Clerk on the mobile app
- At least 1 other user with a profile and some workouts completed (for leaderboard/challenge testing)

## Smoke Test

Open the mobile app → tap the "Compete" tab (trophy icon, 7th tab) → ChallengesScreen loads with status filter pills and empty state or challenge list → tap "View Leaderboards" → LeaderboardScreen loads with exercise selector and empty state or ranked entries.

## Test Cases

### 1. Compete Tab Navigation

1. Open the app and verify 7 bottom tabs are visible
2. Tap the "Compete" tab (trophy icon)
3. **Expected:** ChallengesScreen loads as the landing page with Active/Completed/My Challenges pill filter and challenge list (or empty state)

### 2. Leaderboard Browsing

1. From ChallengesScreen, tap "View Leaderboards" or navigate to LeaderboardScreen
2. Tap an exercise chip in the horizontal scroll
3. Toggle between Est. 1RM / Total Volume / Max Reps metric pills
4. Toggle between 7 Days / 30 Days / All Time period pills
5. **Expected:** Leaderboard table updates with ranked entries (or empty state). My Rank card shows at bottom if user has an entry.

### 3. Challenge Creation

1. On ChallengesScreen, scroll to "Create Challenge" section
2. Fill in title, select type (Total Reps / Total Volume / etc.)
3. Tap "Select Exercise" to open exercise picker modal
4. Select an exercise from the modal list
5. Enter start and end dates in YYYY-MM-DD HH:MM format
6. Tap "Create Challenge"
7. **Expected:** Challenge appears in the list after creation. Alert shown on success or error.

### 4. Challenge Detail and Actions

1. Tap a challenge card in the list
2. **Expected:** ChallengeDetailScreen opens via stack push with challenge info, standings, and action buttons
3. Tap "Join Challenge" (if not already joined)
4. **Expected:** Alert confirms join success. Standings update to include the user.
5. Tap back to return to ChallengesScreen
6. **Expected:** Smooth stack pop back to challenge list

### 5. Badge Display on Own Profile

1. Navigate to Profile tab
2. Scroll to see the Badges section (between profile card and Workout Stats)
3. **Expected:** Badge grid shows earned badges (emoji + name + description) in 3 columns, or "No badges yet" empty state. Loading skeleton animates while fetching.

### 6. Badge Display on Other Profile

1. Navigate to another user's profile (e.g., via feed or search)
2. Scroll to see the Badges section
3. **Expected:** Other user's earned badges displayed (or "hasn't earned any badges yet" empty state)

### 7. Leaderboard Opt-In Toggle

1. Navigate to own Profile tab
2. Scroll to Settings section
3. Find leaderboard opt-in toggle (between unit toggle and rest timer)
4. Tap to toggle opt-in status
5. **Expected:** Button switches between "Leaderboard Opt-In: Off" (outlined) and "Leaderboard Opt-In: On" (filled accent). Mutation succeeds silently.

## Edge Cases

### Empty States

1. View leaderboard with no exercises selected → shows "Select an exercise" prompt
2. View leaderboard with no entries → shows "No entries yet" message
3. View challenges with no challenges → shows "No challenges found" message
4. View badges with no earned badges → shows appropriate empty state (own profile: "No badges yet" / other profile: "hasn't earned any badges yet")
5. **Expected:** Each screen handles empty state gracefully, no crashes or blank screens

### Challenge Creation Validation

1. Try creating a challenge with empty title
2. Try creating without selecting an exercise
3. Enter malformed date (e.g., "tomorrow")
4. **Expected:** Form validation prevents submission or mutation returns error displayed via Alert.alert

### 7-Tab Navigation on Small Screen

1. Test on a device with ≤5.5" screen
2. Verify all 7 tab icons and labels are visible
3. Verify tapping each tab navigates correctly
4. **Expected:** All tabs accessible, though labels may be truncated on very small screens

## Failure Signals

- App crashes when tapping Compete tab (missing navigator registration)
- TypeScript compilation fails with new errors after changes
- Blank screen on any competitive screen (query returns undefined but loading state not handled)
- Badge section not visible on profile pages (import or placement error)
- Opt-in toggle has no effect (mutation not wired or error swallowed)
- Challenge creation silently fails (no Alert.alert on error)
- Tab count is not 7 (missing or duplicate Tab.Screen registration)
- Console errors with [ChallengesScreen], [ChallengeDetail], or [ProfileScreen] prefixes indicating mutation failures

## Notes for Tester

- **7 tabs is intentional** — the plan chose this over drawer navigation. Assess whether it feels cramped on your device and report as UX feedback, not a bug.
- **Date input is intentionally plain TextInput** — no native date picker dependency was added (D136). This is a known rough edge; report friction level.
- **Pre-existing TS2307 errors for `convex/react`** in native app are expected and tolerated — they occur because the native tsconfig can't resolve the Convex package the same way the runtime can via Metro bundler.
- **Backend verification scripts** (40 checks) are separate from this UAT and require Convex CLI auth to run.
- The leaderboard "period" filter (7 Days / 30 Days / All Time) is cosmetic in S01 — all data is stored as "allTime" (D117). Don't expect different results when switching periods.
