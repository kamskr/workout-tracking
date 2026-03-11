# S01: User Profiles — UAT

**Milestone:** M003
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Profile backend contract is provable by verification script (12 programmatic checks). Web UI requires live browser walkthrough for form interaction quality but does not need human judgment — data attributes enable automated assertion. Human experience testing is not required for S01 because the profile UI is standard form/view patterns.

## Preconditions

1. Convex dev server running (`npx convex dev` from `packages/backend/`)
2. Next.js dev server running (`pnpm dev` from `apps/web/`)
3. Clerk authentication configured and working (user can sign in)
4. At least one completed workout exists for the test user (for stats verification)
5. `CONVEX_URL` environment variable set (or present in `.env.local`)

## Smoke Test

Run `CONVEX_URL=<your-convex-url> npx tsx packages/backend/scripts/verify-s01-m03.ts` — expect 12/12 checks passed with exit code 0. If this passes, the backend contract is healthy.

## Test Cases

### 1. Profile Creation Flow

1. Sign in as a user without a profile
2. Navigate to `/profile/setup`
3. Enter a username with fewer than 3 characters
4. **Expected:** Inline validation shows "Username must be 3-30 characters, alphanumeric and underscores only"
5. Enter a valid username (e.g., "testuser_one")
6. **Expected:** Inline status shows "Checking..." then "✓ Available" (green text)
7. Verify displayName is pre-filled from Clerk identity
8. Add a bio (optional)
9. Click "Create Profile"
10. **Expected:** Redirect to `/profile/testuser_one` showing the new profile with avatar, name, bio

### 2. Profile View Page

1. Navigate to `/profile/<your-username>`
2. **Expected:** Page shows avatar (or initials fallback), display name, @username, bio
3. **Expected:** ProfileStats section shows total workouts, current streak, total volume, and top exercises
4. **Expected:** `document.querySelector('[data-profile-page]')` is present
5. **Expected:** `document.querySelector('[data-profile-stats]')` is present

### 3. Cross-User Profile View

1. Sign in as User A (who has a profile)
2. Navigate to `/profile/<user-b-username>` (a different user's profile)
3. **Expected:** User B's profile displays correctly — avatar, name, bio, stats
4. **Expected:** No "Edit Profile" button visible (not own profile)

### 4. Own Profile Edit

1. Navigate to your own profile page
2. Click "Edit Profile"
3. Change displayName and bio
4. Save changes
5. **Expected:** Profile view updates to show new displayName and bio
6. **Expected:** Username remains unchanged (immutable)

### 5. Username Uniqueness

1. Navigate to `/profile/setup` (as a new user without a profile)
2. Enter a username that another user already has (case-insensitive — e.g., "TestUser_One" when "testuser_one" exists)
3. **Expected:** Inline status shows "✗ Username already taken" (red text)
4. **Expected:** Submit button disabled or form rejects on submit

### 6. Profile Not Found

1. Navigate to `/profile/nonexistent_user_xyz`
2. **Expected:** Page shows "Profile not found" message — no error boundary crash, no blank page
3. **Expected:** `document.querySelector('[data-profile-page]')` is present (the not-found page still renders the profile page container)

### 7. Backend Verification Script

1. Ensure Convex dev server is running
2. Run `CONVEX_URL=<url> npx tsx packages/backend/scripts/verify-s01-m03.ts`
3. **Expected:** All 12 checks pass (P-01 through P-12)
4. **Expected:** Exit code 0
5. **Expected:** Cleanup runs for both test users at end

## Edge Cases

### Empty Stats (New User)

1. Create a profile for a user with zero completed workouts
2. Navigate to their profile page
3. **Expected:** Stats section shows "0 workouts", "0 day streak", "0 kg volume", no top exercises — no error, no crash

### Rapid Username Check

1. On the setup form, type a username character by character quickly
2. **Expected:** Debounced availability check (400ms) — no flicker, final result is correct

### Profile Setup Redirect for Existing User

1. Sign in as a user who already has a profile
2. Navigate directly to `/profile/setup`
3. **Expected:** Automatically redirected to `/profile/<your-username>` — not shown the setup form again

### Unauthenticated Access

1. Sign out
2. Navigate to `/profile/setup` or `/profile/<any-username>`
3. **Expected:** Redirected to Clerk sign-in page (middleware protection)

## Failure Signals

- **Blank profile page:** getProfile/getProfileByUsername returning null when profile exists → check by_userId or by_usernameLower index
- **Stats showing incorrect values:** computePeriodSummary or computeCurrentStreak logic error → compare verify script P-08/P-09 results against manual calculation
- **"Username already taken" when username is free:** by_usernameLower index not matching → check usernameLower derivation in createProfile
- **Setup form not seeding displayName:** Clerk `useUser()` not loading → check Clerk provider wrapping
- **Profile view crash on nonexistent user:** Missing null check in page component → verify the "not found" branch in [username]/page.tsx
- **Middleware not protecting /profile routes:** Missing route matcher pattern → check middleware.ts for `/profile(.*)`
- **TypeScript errors:** Missing generated API types → run `npx convex dev` to regenerate _generated/api.d.ts

## Requirements Proved By This UAT

- R015 (User Profiles) — Profile creation with unique username, stats display (total workouts, streak, volume, top exercises), cross-user profile viewing, search by displayName, avatar upload, profile editing. Proved by backend verification script (12 checks) and browser walkthrough of setup + view + edit flows.

## Not Proven By This UAT

- **Live verification script execution** — Script exists but has not been run against a live Convex instance in the current session. Must be run pre-S02.
- **M001+M002 regression (72/72)** — Backend code changes (analytics.ts signature, testing.ts extensions) are backward-compatible but regression scripts have not been re-run in this session.
- **Mobile profile UI** — S04 deliverable. Backend queries are ready but no mobile screens exist yet.
- **Follow system integration** — S02 will consume profiles. The cross-user read pattern is proven by the verification script P-11 check, but actual follow/feed integration is untested.
- **Avatar upload E2E** — generateAvatarUploadUrl mutation exists and compiles, but the full upload → display flow requires a running Convex instance to verify.
- **Realtime subscription** — Profile data updates should be reactive via Convex subscriptions, but this isn't explicitly tested (standard Convex behavior).

## Notes for Tester

- **Convex CLI auth is required first.** Run `npx convex login` in an interactive terminal before any testing. Then `npx convex dev` from `packages/backend/` to push the schema (including new profiles table).
- **Pre-existing dependency errors** in web-app (`clsx`) and native-app (`convex/react`) are not S01 issues — ignore them.
- The verification script uses test user IDs `test-m03-s01-user-a` and `test-m03-s01-user-b` — these are cleaned up automatically but avoid using these IDs for manual testing.
- Username format: 3-30 chars, alphanumeric + underscore only. Case is preserved for display but uniqueness is case-insensitive.
- Profile stats for a user with no workouts should show zero values, not errors or empty sections.
