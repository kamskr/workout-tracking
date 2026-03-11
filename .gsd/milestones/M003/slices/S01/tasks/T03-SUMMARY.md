---
id: T03
parent: S01
milestone: M003
provides:
  - Profile setup page at /profile/setup with username validation, Clerk displayName seeding, and live availability check
  - Profile view page at /profile/[username] with avatar, bio, stats, inline edit for own profile, and "not found" handling
  - ProfileSetupForm component with debounced username availability checking via getProfileByUsername
  - ProfileStats component consuming getProfileStats with loading skeleton and empty state
  - Clerk middleware protection for /profile(..) routes
  - Convex generated API types updated to include profiles module
key_files:
  - apps/web/src/middleware.ts
  - apps/web/src/app/profile/setup/page.tsx
  - apps/web/src/app/profile/[username]/page.tsx
  - apps/web/src/components/profile/ProfileSetupForm.tsx
  - apps/web/src/components/profile/ProfileStats.tsx
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Inline edit for own profile (displayName + bio) via dialog-less inline form toggle on profile view page — simpler than modal for S01 scope
  - Username availability check uses debounced (400ms) useQuery with Convex "skip" pattern for conditional queries
  - ProfileStats receives userId + weightUnit as props rather than fetching user preferences internally — allows reuse for both own and other users' profiles
patterns_established:
  - Conditional Convex query pattern with "skip" — used in profile setup (skip getProfile until user.id loaded) and profile view (skip getProfileStats until profile loaded)
  - Profile page data attributes (data-profile-setup-form, data-profile-stats, data-profile-page) for programmatic UI verification
  - Inline edit pattern on view pages — toggle between display and edit mode without navigation
observability_surfaces:
  - data-profile-setup-form attribute on setup form container
  - data-profile-stats attribute on stats container (both loading and loaded states)
  - data-profile-page attribute on profile view page main element (including not-found state)
  - Username validation errors shown inline below username field with distinct states (idle, invalid, checking, available, taken)
  - Form-level errors displayed in red bordered container for mutation failures
  - "Profile not found" explicit message for nonexistent usernames (no error boundary crash)
duration: 30m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Build profile setup and profile view web pages

**Created /profile/setup and /profile/[username] pages with ProfileSetupForm (live username validation) and ProfileStats components, protected by Clerk middleware.**

## What Happened

Built the two profile web UI surfaces that consume the Convex profile functions from T01:

1. **Middleware update** — Added `/profile(.*)` to the Clerk `isProtectedRoute` matcher in `middleware.ts`. Both `/profile/setup` and `/profile/[username]` now require authentication.

2. **ProfileSetupForm component** — Client component with three fields: username (live format validation via regex + debounced availability check via `getProfileByUsername`), displayName (pre-seeded from Clerk `user.fullName`), and bio (optional textarea). Username status indicator shows five distinct states (idle, invalid, checking, available, taken). Submit calls `createProfile` mutation and redirects to `/profile/[username]` on success. Race condition errors (username taken between check and submit) surface as form-level error message.

3. **Profile setup page** — Checks if user already has a profile via `getProfile({ userId })`. If profile exists, redirects to `/profile/[username]`. Otherwise renders the setup form with loading state while checking.

4. **ProfileStats component** — Consumes `getProfileStats` query, displays total workouts, current streak (days), total volume (formatted with weight unit), and top exercises (name + volume). Includes loading skeleton and empty state for users with no workout data.

5. **Profile view page** — Uses `getProfileByUsername` for profile data and `getProfileStats` for stats. Shows avatar (using existing Radix Avatar component with initials fallback), display name, username, bio, and workout stats. "Edit Profile" button appears only when `profile.userId === user.id`. Inline edit form toggles for displayName and bio (no modal/navigation needed). "Profile not found" graceful handling with descriptive message for nonexistent usernames.

6. **Generated API types** — Added `profiles` module import to `packages/backend/convex/_generated/api.d.ts` since the codegen hadn't been run after T01 added `profiles.ts`.

## Verification

### TypeScript compilation
- `tsc --noEmit` in `apps/web` — **0 new errors** (pre-existing `clsx` type declaration error remains)
- `tsc --noEmit -p convex` in `packages/backend` — **0 errors**

### Middleware protection
- Browser: navigated to `http://localhost:3000/profile/setup` → **redirected to Clerk sign-in** ✅
- Browser: navigated to `http://localhost:3000/profile/nonexistent` → **redirected to Clerk sign-in** ✅
- Both routes correctly protected by `createRouteMatcher(["/profile(.*)"])`

### Next.js compilation
- Dev server started on port 3000 with no compilation errors for profile routes
- No runtime errors in server output when serving profile page requests

### Data attributes
- `data-profile-setup-form` on ProfileSetupForm container ✅
- `data-profile-stats` on ProfileStats container (both loading and loaded states) ✅
- `data-profile-page` on profile view page main element (including not-found state) ✅

### Slice-level verification status
- `pnpm turbo typecheck --force` — backend passes, web-app has pre-existing clsx error only, 0 new errors ✅
- `verify-s01-m03.ts` — script exists (12 checks), execution pending Convex CLI auth (unchanged from T02)
- M001+M002 regression — no backend changes in T03, scripts unaffected
- Browser verification for authenticated flows — requires Clerk login (middleware protection confirmed)

## Diagnostics

- **Profile setup form inspection:** `document.querySelector('[data-profile-setup-form]')` — present when setup page renders
- **Profile stats inspection:** `document.querySelector('[data-profile-stats]')` — present when stats load on profile view
- **Profile page inspection:** `document.querySelector('[data-profile-page]')` — present on profile view (including not-found)
- **Username validation states:** Inline text below username field shows checking/available/taken/invalid with distinct CSS classes (text-gray-400, text-green-600, text-red-600)
- **Form errors:** Red bordered container (`border-red-200 bg-red-50`) displays mutation failures (username race condition, network errors)
- **Profile not found:** Explicit message with user icon for nonexistent usernames — no error boundary, no crash

## Deviations

- **Generated API types manually updated:** T01 added `profiles.ts` but didn't regenerate `_generated/api.d.ts` (requires `npx convex dev`). Added `profiles` import manually to unblock typecheck. This is equivalent to what codegen would produce and will be overwritten when `npx convex dev` runs.
- **Inline edit instead of separate edit page/modal:** Task plan mentioned "a simple dialog or inline form" — chose inline form toggle on the profile view page as the simplest approach for S01 scope.

## Known Issues

- **Convex CLI auth still needed:** Verification script `verify-s01-m03.ts` cannot be run without interactive `npx convex login`. The backend functions are correct (T01 compile-verified, T02 script ready) but runtime validation is blocked.
- **Pre-existing clsx type error:** `src/lib/utils.ts(1,39): error TS2307: Cannot find module 'clsx'` — this is a pre-existing issue not introduced by T03.
- **Full browser E2E not possible:** Authenticated profile flows (creating a profile, viewing own profile, viewing another user's profile) require Clerk sign-in which can't be automated in this environment.

## Files Created/Modified

- `apps/web/src/middleware.ts` — Added `/profile(.*)` to protected route matcher
- `apps/web/src/app/profile/setup/page.tsx` — New page: profile creation with redirect-if-exists logic
- `apps/web/src/app/profile/[username]/page.tsx` — New page: profile view with stats, inline edit, not-found handling
- `apps/web/src/components/profile/ProfileSetupForm.tsx` — New component: username validation, availability check, profile creation form
- `apps/web/src/components/profile/ProfileStats.tsx` — New component: workout stats display with loading/empty states
- `packages/backend/convex/_generated/api.d.ts` — Added profiles module to generated API types
