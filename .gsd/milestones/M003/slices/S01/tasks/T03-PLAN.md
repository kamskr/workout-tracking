---
estimated_steps: 5
estimated_files: 6
---

# T03: Build profile setup and profile view web pages

**Slice:** S01 — User Profiles
**Milestone:** M003

## Description

Build the two web UI surfaces for user profiles: the `/profile/setup` page (profile creation form) and the `/profile/[username]` page (profile view with stats). Update Clerk middleware to protect both routes. These pages consume the Convex functions from T01 and complete the integration proof for S01 — real users can create and view profiles through the web app.

The profile setup page seeds the display name from Clerk's `useUser()` hook and provides live username availability checking. The profile view page shows avatar, display name, bio, and workout stats (total workouts, streak, volume, top exercises). It supports both "my own profile" (with edit link) and "another user's profile" views — the first cross-user web page in the app.

## Steps

1. **Update middleware** — In `apps/web/src/middleware.ts`, add `"/profile(.*)"` to the `isProtectedRoute` matcher array. This ensures both `/profile/setup` and `/profile/[username]` require Clerk authentication.

2. **Create ProfileSetupForm component** — `apps/web/src/components/profile/ProfileSetupForm.tsx`:
   - Client component (`"use client"`)
   - Fields: username (text input with live validation), displayName (text input, seeded from Clerk `useUser().user?.fullName`), bio (textarea, optional)
   - Username validation: regex `/^[a-zA-Z0-9_]{3,30}$/` on input change; debounced availability check via `useQuery(api.profiles.getProfileByUsername, { username })` — if result is not null, show "Username taken"
   - Submit calls `useMutation(api.profiles.createProfile)` with `{ username, displayName, bio }`
   - On success, redirect to `/profile/[username]` via `router.push()`
   - On error (username taken race condition), show error message
   - Clean/minimal design (D007): white card, subtle border, generous spacing, system font
   - Add `data-profile-setup-form` attribute on form container for browser verification

3. **Create profile setup page** — `apps/web/src/app/profile/setup/page.tsx`:
   - Client component using `useUser()` from Clerk and `useQuery(api.profiles.getProfile)` to check if profile exists
   - If profile already exists, redirect to `/profile/[username]`
   - Otherwise, render ProfileSetupForm
   - Loading state while checking profile existence

4. **Create ProfileStats component** — `apps/web/src/components/profile/ProfileStats.tsx`:
   - Client component consuming `useQuery(api.profiles.getProfileStats, { userId })`
   - Displays: total workouts (number), current streak (days), total volume (formatted with user's weight unit preference), top exercises (name + volume list)
   - Loading skeleton while query resolves
   - Empty state if no workout data
   - Add `data-profile-stats` attribute for browser verification

5. **Create profile view page** — `apps/web/src/app/profile/[username]/page.tsx`:
   - Client component using `useParams()` to get username
   - Calls `useQuery(api.profiles.getProfileByUsername, { username })` for profile data
   - Calls `useQuery(api.profiles.getProfileStats, { userId: profile.userId })` for stats (only when profile is loaded)
   - Displays: Avatar (using existing Avatar component), displayName, username, bio, ProfileStats
   - Determines "is own profile" by comparing `profile.userId` with `useUser().user?.id` — if own, show "Edit Profile" button (links to modal or inline edit for displayName/bio; minimal for S01 — a simple dialog or inline form)
   - If profile is null (username not found), show "Profile not found" message
   - Loading state while profile query resolves
   - Add `data-profile-page` attribute on main container for browser verification
   - Follow existing dynamic route pattern from `/exercises/[id]/page.tsx`

## Must-Haves

- [ ] `/profile(.*)` added to Clerk middleware protected routes
- [ ] Profile setup form validates username format + shows availability status
- [ ] Profile setup form seeds displayName from Clerk user
- [ ] Profile creation redirects to `/profile/[username]` on success
- [ ] Profile setup page redirects to existing profile if one already exists
- [ ] Profile view page shows avatar, name, bio, and workout stats
- [ ] Profile view page handles "not found" username gracefully (no crash)
- [ ] "Edit Profile" shown only when viewing own profile
- [ ] TypeScript compiles 0 errors across all 3 packages
- [ ] Data attributes present for programmatic UI verification

## Verification

- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- Browser: navigate to `/profile/setup` → form renders with username field, displayName pre-filled from Clerk
- Browser: navigate to `/profile/nonexistent` → shows "Profile not found" (no crash)
- All backend verification scripts still pass (72/72 + 12/12 M003)

## Observability Impact

- Signals added/changed: `data-profile-setup-form`, `data-profile-stats`, `data-profile-page` attributes on key UI containers (extends D057/D064 pattern)
- How a future agent inspects this: `document.querySelector('[data-profile-page]')` for page presence; `document.querySelector('[data-profile-stats]')` for stats rendering
- Failure state exposed: Username validation errors shown inline below username field. Profile creation errors shown as form-level error message. Profile not found shows explicit message instead of error boundary.

## Inputs

- `packages/backend/convex/profiles.ts` — T01 output (Convex functions to consume)
- `apps/web/src/components/common/avatar.tsx` — existing Radix Avatar component
- `apps/web/src/app/exercises/[id]/page.tsx` — dynamic route pattern reference
- `apps/web/src/middleware.ts` — needs `/profile(.*)` added
- `apps/web/src/app/ConvexClientProvider.tsx` — provides Convex context
- T02 verification passing — confirms backend functions work correctly

## Expected Output

- `apps/web/src/middleware.ts` — modified (added `/profile(.*)`)
- `apps/web/src/app/profile/setup/page.tsx` — new page
- `apps/web/src/app/profile/[username]/page.tsx` — new page
- `apps/web/src/components/profile/ProfileSetupForm.tsx` — new component
- `apps/web/src/components/profile/ProfileStats.tsx` — new component
