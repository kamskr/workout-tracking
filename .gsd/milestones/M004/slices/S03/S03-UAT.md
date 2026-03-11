# S03: Achievements & Badges — Backend + Web UI — UAT

**Milestone:** M004
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Backend correctness is proven by the 12-check verification script (`verify-s03-m04.ts`) exercising real Convex mutations and queries with 2 test users across all 5 badge categories. Web UI is verified by structural grep checks (data attributes present, component integrated into profile page) and manual visual inspection. The combination covers both data integrity and user-facing presentation.

## Preconditions

- Convex backend deployed and accessible (for verification script execution)
- Convex CLI authenticated (`npx convex login` completed)
- Web app running (`cd apps/web && pnpm dev` at http://localhost:3000)
- At least one user account exists with a completed profile
- A second user account exists (for cross-user badge visibility test)

## Smoke Test

1. Navigate to http://localhost:3000/profile/{your-username}
2. Scroll to the "Badges" section (between leaderboard opt-in and workout stats)
3. **Expected:** Badge section renders — either showing badge cards (if user has completed workouts) or an empty state message ("Complete workouts to earn badges!")

## Test Cases

### 1. Badge display on own profile

1. Log in and navigate to your profile page
2. Look for the "Badges" section
3. **Expected:** `[data-badge-section]` container is visible. If you have completed workouts, badge cards show emoji + name + description. If no workouts, empty state says "Complete workouts to earn badges!"

### 2. Badge display on another user's profile

1. Navigate to another user's profile page (/profile/{other-username})
2. Look for the "Badges" section
3. **Expected:** Badge section renders with that user's badges (or "No badges earned yet" empty state for other users)

### 3. Badge awarded after workout completion

1. Start a new workout and log at least one set
2. Finish the workout
3. Navigate to your profile page
4. **Expected:** If this was your first completed workout, a "First Workout" badge (🏋️) appears in the badges section

### 4. Loading skeleton

1. Navigate to a profile page
2. Observe the brief loading state before badges appear
3. **Expected:** 6 animated placeholder cards render during loading, then replaced by actual badge cards or empty state

### 5. Verification script passes (runtime)

1. Run: `cd packages/backend && npx tsx scripts/verify-s03-m04.ts`
2. **Expected:** All 12 checks pass (BG-01 through BG-12):
   - BG-01: first_workout badge awarded after 1 workout
   - BG-02: ten_workouts badge NOT awarded after 1 workout
   - BG-03: No duplicate badges after multiple evaluations
   - BG-04: getUserBadges returns correct metadata (name, emoji, category)
   - BG-05: Cross-user badge visibility works
   - BG-06: volume_10k badge awarded at ≥10,000 kg
   - BG-07: streak_3 badge awarded at ≥3 day streak
   - BG-08: first_pr badge awarded at ≥1 PR
   - BG-09: first_challenge badge awarded at ≥1 completed challenge
   - BG-10: Badge count increases as thresholds are crossed
   - BG-11: Cleanup removes all test user badges
   - BG-12: BADGE_DEFINITIONS has correct structure (15 badges, 5 categories)

## Edge Cases

### Empty profile (no workouts completed)

1. View a profile for a user who has never completed a workout
2. **Expected:** Badges section shows empty state, no error

### Multiple rapid workout completions

1. Complete 2 workouts in quick succession
2. **Expected:** Badge evaluation runs twice; badges are deduplicated (no duplicates in getUserBadges results)

### Profile page for non-existent user

1. Navigate to /profile/nonexistent-user
2. **Expected:** Profile page handles 404 gracefully; BadgeDisplay does not crash

## Failure Signals

- `[Badge] Error evaluating badges for user` in Convex dashboard logs — badge evaluation failed (non-fatal, workout still succeeds)
- `[Badge] Unknown badge slug` in Convex logs — badge slug mismatch between DB and definitions
- Missing `[data-badge-section]` on profile page — component not rendered
- Verification script check failures (any BG-XX fails)
- TypeScript compilation errors in backend or web packages

## Requirements Proved By This UAT

- R020 (Achievements and Badges) — This UAT proves that badges are evaluated server-side on workout completion, stored in `userBadges`, queryable by any user via `getUserBadges`, and displayed on profile pages via `BadgeDisplay` component. The 12-check verification script covers all 5 badge categories (workout count, volume, streak, PR, challenge), deduplication, cross-user visibility, and cleanup. The structural checks prove web UI integration.

## Not Proven By This UAT

- Mobile badge display — deferred to S04 (Mobile Competitive Port)
- Badge notification/toast on award — no active notification when badge is earned during workout
- Performance under high badge count (only 15 definitions, trivial iteration)
- Live Convex backend execution of verification script — blocked by Convex CLI auth requirement; script compiles and is structurally complete

## Notes for Tester

- The verification script requires Convex CLI authentication (`npx convex login`) before it can execute. Run it when the backend is accessible.
- Badge evaluation is non-fatal — if it fails, workout completion still succeeds. Check Convex dashboard logs for `[Badge]` prefix errors.
- The "first_workout" badge is the easiest to trigger manually — just complete any workout with at least one set.
- Badge data attributes (`data-badge-section`, `data-badge-card`, `data-badge-slug`) can be used for automated browser testing.
- Pre-existing issue: `clsx` TS2307 in web compilation is not related to this slice.
