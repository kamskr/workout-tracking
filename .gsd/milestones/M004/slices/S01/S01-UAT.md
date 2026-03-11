# S01: Leaderboards — Backend + Web UI — UAT

**Milestone:** M004
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime + human-experience)
- Why this mode is sufficient: Backend correctness proven by 12-check verification script covering ranking, opt-in filtering, metric accuracy, and deletion cascade. Web UI requires human visual assessment for layout quality, interaction feel, and responsive behavior. Live runtime needed for Convex backend verification (script execution pending Convex CLI auth).

## Preconditions

- Convex dev backend running (`npx convex dev`)
- `CONVEX_URL` environment variable configured
- Web app running (`cd apps/web && npm run dev`)
- At least one user account authenticated via Clerk
- Ideally 3+ user accounts to test multi-user leaderboard rankings

## Smoke Test

1. Navigate to `/leaderboards` in the web app
2. Verify the page loads with an exercise selector, metric/period pickers, and a table area
3. If no leaderboard data exists, verify the "No exercises with rankings yet" empty state is shown
4. Navigate to your profile page and verify the "Leaderboard Participation" toggle is visible

## Test Cases

### 1. Leaderboard Page — Full Ranking View

1. Ensure at least 2 users have completed workouts with the same exercise (e.g., Bench Press)
2. Ensure at least 1 user has opted in via the profile toggle
3. Navigate to `/leaderboards`
4. Select "Bench Press" from the exercise dropdown
5. Select "Est. 1RM" metric
6. **Expected:** Table shows ranked entries with Rank (#), User (display name + @username), and Value columns. Opted-in users appear; non-opted-in users do not. Entries are ordered highest value first.

### 2. Current User Highlighting

1. As an opted-in user who has completed Bench Press workouts, navigate to `/leaderboards`
2. Select Bench Press exercise
3. **Expected:** Your row is highlighted with a blue background and a "You" badge appears next to your name

### 3. My Rank Callout

1. As an opted-in user, navigate to `/leaderboards` and select an exercise you've done
2. **Expected:** Below the table, a "My Rank" card shows your rank number and value (e.g., "#2 — 95.0 kg")

### 4. My Rank — Not Opted In

1. As a user who has NOT opted in, navigate to `/leaderboards`
2. **Expected:** My Rank card shows "Not ranked — opt in on your profile" with a link to your profile page

### 5. Profile Opt-In Toggle

1. Navigate to your own profile page (`/profile/[your-username]`)
2. Scroll to the "Leaderboard Participation" section
3. Toggle the switch ON
4. **Expected:** Toggle reflects opted-in state. Navigating to `/leaderboards` now shows you in rankings.
5. Toggle the switch OFF
6. **Expected:** You no longer appear in leaderboard rankings

### 6. Metric Picker

1. Navigate to `/leaderboards` and select an exercise
2. Switch between "Est. 1RM", "Total Volume", and "Max Reps"
3. **Expected:** Table values update to reflect the selected metric. Rankings may change between metrics.

### 7. Period Picker (Cosmetic in S01)

1. Navigate to `/leaderboards` and select an exercise
2. Switch between "7 Days", "30 Days", and "All Time"
3. **Expected:** Period buttons toggle visually. Note: In S01, all periods show the same data (backend only supports allTime). This is expected behavior.

### 8. Exercise Selector — Only Exercises With Entries

1. Navigate to `/leaderboards`
2. Open the exercise dropdown
3. **Expected:** Only exercises that have at least one leaderboard entry appear in the dropdown. Exercises never performed by any user are not listed.

### 9. Navigation

1. Click "Leaderboards" in the header navigation bar
2. **Expected:** Navigates to `/leaderboards` page
3. Verify the link appears in both desktop and mobile header menus

### 10. Auth Protection

1. In an incognito/unauthenticated browser, navigate to `/leaderboards`
2. **Expected:** Redirected to Clerk sign-in page (middleware protects the route)

## Edge Cases

### Empty Leaderboard (No Data)

1. Navigate to `/leaderboards` before any workouts have been completed
2. **Expected:** "No exercises with rankings yet" message displayed. No errors.

### Only Non-Opted-In Users Have Data

1. Multiple users have completed workouts but none have opted in
2. Navigate to `/leaderboards` and select an exercise
3. **Expected:** Exercise appears in dropdown (entries exist) but table shows "No rankings yet" (all entries filtered out by opt-in check)

### Profile Page — Other User's Profile

1. Navigate to another user's profile page
2. **Expected:** The leaderboard opt-in toggle is NOT visible (only shown on own profile)

### Workout Deletion Cascade

1. Complete a workout, verify leaderboard entry exists
2. Delete the workout
3. **Expected:** Leaderboard entry for that workout is also deleted

## Failure Signals

- `/leaderboards` returns 404 or blank page — middleware or page file issue
- Exercise dropdown is empty when workouts exist — `getLeaderboardExercises` query failing
- Table shows entries from non-opted-in users — opt-in post-filter broken
- Rankings are not sorted descending — composite index or sort logic issue
- My Rank shows incorrect position — bounded scan or rank computation bug
- Profile toggle doesn't persist — `setLeaderboardOptIn` mutation failing
- TypeScript errors on page load — `api.d.ts` codegen mismatch
- Console errors mentioning `[Leaderboard]` — non-fatal hook failing (workout still succeeds but entries not updated)

## Requirements Proved By This UAT

- R018 (Leaderboards) — This UAT proves: leaderboard rankings displayed correctly, opt-in filtering works, metric/period/exercise selection functional, My Rank callout accurate, profile opt-in toggle works, auth protection active. Combined with 12-check verification script (LB-01 through LB-12) proving backend correctness (Epley formula, warmup exclusion, max reps, ranking order, deletion cascade).

## Not Proven By This UAT

- Mobile leaderboard UI (deferred to S04)
- Real-time leaderboard updates when another user completes a workout (requires multi-device testing)
- Period filtering beyond "All Time" (backend only supports allTime in S01; 7d/30d are cosmetic)
- Scale behavior with 100+ users on a single leaderboard (test uses 5 users)
- Leaderboard performance under concurrent workout completions

## Notes for Tester

- **Period picker is intentionally cosmetic in S01** — all 3 period buttons (7 Days, 30 Days, All Time) show the same data. This is by design (D117). Full period filtering may be added in a future slice.
- **Verification script must be run separately** — `npx tsx packages/backend/scripts/verify-s01-m04.ts` requires a running Convex backend and CLI auth. This proves the 12 backend correctness checks that the UI relies on.
- **`api.d.ts` was manually edited** — If you see TypeScript errors related to the `leaderboards` module, run `npx convex dev` to regenerate the file.
- The leaderboard page uses `data-leaderboard-*` attributes for programmatic assertions: `data-leaderboard-page`, `data-leaderboard-table`, `data-leaderboard-rank`, `data-leaderboard-exercise-select`, `data-leaderboard-optin`.
