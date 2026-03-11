---
id: S01
parent: M003
milestone: M003
provides:
  - profiles table in Convex schema with userId, username, usernameLower, displayName, bio, avatarStorageId, isPublic, createdAt — indexed by userId, usernameLower (unique), and search on displayName
  - 7 Convex functions in profiles.ts — createProfile (atomic with uniqueness), updateProfile, getProfile, getProfileByUsername, getProfileStats, searchProfiles, generateAvatarUploadUrl
  - computeCurrentStreak helper for consecutive UTC-day streak calculation
  - 6 profile test helpers in testing.ts (testCreateProfile, testUpdateProfile, testGetProfile, testGetProfileByUsername, testGetProfileStats, testSearchProfiles)
  - testCleanup extended to delete profiles and clean up avatar storage
  - computePeriodSummary updated to accept undefined periodDays for all-time queries (D084)
  - verify-s01-m03.ts verification script with 12 checks covering profile CRUD, username uniqueness, format validation, stats, search, cross-user reads
  - /profile/setup page — protected, creates profile with live username availability check, Clerk displayName seeding
  - /profile/[username] page — protected, displays avatar, name, bio, stats, inline edit for own profile, "not found" handling
  - ProfileSetupForm and ProfileStats reusable components
  - Clerk middleware protection for /profile(..) routes
requires:
  - slice: none
    provides: standalone — consumes existing auth pattern, analytics computation, Avatar component
affects:
  - S02 (consumes profiles table, getProfile/getProfileByUsername queries, searchProfiles, test helpers)
  - S03 (consumes profile data for author info on shared workouts)
  - S04 (consumes all profile UI patterns for mobile port)
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/profiles.ts
  - packages/backend/convex/testing.ts
  - packages/backend/convex/analytics.ts
  - packages/backend/scripts/verify-s01-m03.ts
  - apps/web/src/middleware.ts
  - apps/web/src/app/profile/setup/page.tsx
  - apps/web/src/app/profile/[username]/page.tsx
  - apps/web/src/components/profile/ProfileSetupForm.tsx
  - apps/web/src/components/profile/ProfileStats.tsx
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - D080 — Username immutability after creation
  - D081 — Streak computation uses UTC days (no timezone awareness)
  - D082 — Profile page data attributes for programmatic UI verification
  - D083 — Profile stats via computePeriodSummary reuse
  - D084 — computePeriodSummary accepts undefined periodDays for all-time queries
patterns_established:
  - Cross-user read pattern — profile queries accept userId/username arg and return any user's data (auth check verifies caller is authenticated but does not scope data to caller)
  - Username uniqueness enforcement — query by_usernameLower index before insert within atomic mutation, Convex OCC handles concurrent creation races
  - Avatar storage lifecycle — generateAvatarUploadUrl → client POST → storageId → updateProfile, old avatar cleaned up on change
  - Conditional Convex query with "skip" — used in profile setup/view for queries dependent on prior data loading
  - Inline edit pattern on view pages — toggle between display and edit mode without navigation
observability_surfaces:
  - Stable error messages in profiles.ts — "Username already taken", "Username must be 3-30 characters, alphanumeric and underscores only", "Profile not found", "Not authenticated"
  - Test inspection queries — testGetProfile, testGetProfileByUsername, testGetProfileStats, testSearchProfiles for programmatic state verification
  - Profile stats return zero-value defaults when no workout data exists (no error thrown)
  - UI data attributes — data-profile-setup-form, data-profile-stats, data-profile-page for browser assertion targeting
  - Username validation states visible inline — idle, invalid, checking, available, taken
drill_down_paths:
  - .gsd/milestones/M003/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S01/tasks/T03-SUMMARY.md
duration: 1h15m
verification_result: partial
completed_at: 2026-03-11
---

# S01: User Profiles

**Convex-backed user profiles with username uniqueness, workout stats, cross-user reads, search, avatar upload, and web UI for profile creation and viewing — first cross-user readable table in the app.**

## What Happened

Built the complete user profile system in three tasks:

**T01 (Backend):** Added `profiles` table to Convex schema with all specified fields and indexes (by_userId, by_usernameLower unique, search_displayName). Created `profiles.ts` with 7 Convex functions — `createProfile` enforces atomic create-or-return with case-insensitive username uniqueness via `usernameLower` index, `updateProfile` allows displayName/bio/avatar changes with old avatar cleanup, `getProfile`/`getProfileByUsername` are cross-user read queries (first in the app), `getProfileStats` reuses `computePeriodSummary` for all-time aggregates plus a new `computeCurrentStreak` helper that walks backward through completed workouts by UTC day, `searchProfiles` uses the full-text search index, and `generateAvatarUploadUrl` provides Convex file storage upload. Extended `testing.ts` with 6 profile test helpers and updated `testCleanup` to delete profiles and avatar storage. Changed `computePeriodSummary` signature to accept `undefined` for all-time queries (D084).

**T02 (Verification):** Created `verify-s01-m03.ts` with 12 checks (P-01 through P-12) covering profile creation, get by userId, get by username (case-insensitive), username uniqueness collision, format validation (too short, invalid chars), duplicate profile idempotency, profile update, stats with workout data, streak computation, search by displayName, cross-user reads (two test users), and nonexistent profile handling. Script follows established ConvexHttpClient pattern. Could not be executed — Convex CLI requires interactive authentication that was not available in the session.

**T03 (Web UI):** Added `/profile(.*)` to Clerk middleware protected routes. Built `/profile/setup` page with `ProfileSetupForm` component — username field with live format validation and debounced availability check via `getProfileByUsername`, displayName seeded from Clerk, bio textarea, race condition error handling. Built `/profile/[username]` page showing avatar (Radix Avatar with initials fallback), display name, username, bio, and `ProfileStats` component (total workouts, streak, volume, top exercises with loading skeleton and empty state). Own-profile inline edit toggle for displayName and bio. "Profile not found" graceful handling. All pages use data attributes for programmatic verification.

## Verification

### Passed
- **Backend typecheck:** `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- **Web typecheck:** `tsc --noEmit -p apps/web/tsconfig.json` — only pre-existing `clsx` module error, 0 new errors from S01 changes
- **All S01 files created:** profiles.ts, testing.ts extensions, schema.ts profiles table, verify-s01-m03.ts, middleware.ts update, setup page, [username] page, ProfileSetupForm, ProfileStats, generated api.d.ts update
- **Data attributes present:** data-profile-setup-form, data-profile-stats, data-profile-page verified in source
- **Error messages present:** All 4 stable error messages verified in profiles.ts source
- **Verification script structure:** 12 checks (P-01 through P-12), two test users, cleanup on entry/exit

### Blocked (not code issues)
- **verify-s01-m03.ts execution:** Convex CLI requires interactive `npx convex login` — blocked in non-interactive environment. Script is complete and ready to run.
- **Regression scripts (72/72):** Same Convex CLI auth blocker. No backend logic changes that would break existing scripts.
- **Browser E2E:** Authenticated flows require Clerk sign-in. Middleware protection (redirect to sign-in) confirmed.

## Requirements Advanced

- R015 (User Profiles) — Profile table, CRUD mutations with uniqueness, stats computation, search, avatar upload, web UI for creation and viewing all implemented. Verification script written but execution blocked by Convex CLI auth. Advancing from `active` to partially proven — full validation requires live verification script pass.

## Requirements Validated

- None moved to validated in this slice — R015 proof requires live backend verification (12/12 checks passing) which is blocked by Convex CLI auth.

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- **Generated API types manually updated (T03):** T01 added profiles.ts but codegen requires `npx convex dev`. Manually added profiles module import to `_generated/api.d.ts` — equivalent to codegen output, will be overwritten when Convex dev runs.
- **computePeriodSummary signature change (D084):** Changed from `periodDays: number` to `periodDays: number | undefined` — backward compatible, all existing callers pass number values.
- **Inline edit instead of separate edit page:** Chose inline form toggle on profile view page rather than modal or separate page — simpler for S01 scope.

## Known Limitations

- **Verification script not executed:** 12 checks exist but require Convex CLI auth to run. Must run `npx convex login` interactively, then `npx convex dev` to push schema, then execute script before S02 can start.
- **Pre-existing dependency errors:** web-app has `clsx` module error, native-app has `convex/react` module error — both pre-existing, not introduced by S01.
- **UTC streak only (D081):** Streak computation uses UTC days, no timezone awareness. May show off-by-one for users near midnight in non-UTC zones.
- **Username immutability (D080):** Users cannot change username after creation. Simplifies URL stability but may frustrate users who want a rename.

## Follow-ups

- **Pre-S02 blocker:** Run `npx convex login` → `npx convex dev` → `verify-s01-m03.ts` to get 12/12 pass + 72/72 regression pass before starting S02.
- **Fix pre-existing dependency errors:** Install missing `clsx` types in web-app and resolve `convex/react` in native-app if not already addressed.
- **Codegen refresh:** Run `npx convex dev` to regenerate `_generated/api.d.ts` properly (manual edit in T03 is placeholder).

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added profiles table with fields, indexes, and search index
- `packages/backend/convex/profiles.ts` — New: 7 Convex functions + computeCurrentStreak + validateUsername helpers
- `packages/backend/convex/testing.ts` — Added 6 profile test helpers + extended testCleanup for profiles
- `packages/backend/convex/analytics.ts` — computePeriodSummary signature: number → number | undefined (D084)
- `packages/backend/scripts/verify-s01-m03.ts` — New: 12-check verification script for profile backend contract
- `apps/web/src/middleware.ts` — Added /profile(..) to protected route matcher
- `apps/web/src/app/profile/setup/page.tsx` — New: profile creation page with redirect-if-exists
- `apps/web/src/app/profile/[username]/page.tsx` — New: profile view with stats, inline edit, not-found
- `apps/web/src/components/profile/ProfileSetupForm.tsx` — New: username validation, availability check, creation form
- `apps/web/src/components/profile/ProfileStats.tsx` — New: workout stats with loading/empty states
- `packages/backend/convex/_generated/api.d.ts` — Added profiles module to generated API types

## Forward Intelligence

### What the next slice should know
- Profile queries use the cross-user read pattern: auth check verifies caller exists, but data is not scoped to caller. S02 follow system should use this same pattern for profile lookups on feed items.
- `getProfileStats` returns `{ totalWorkouts, currentStreak, totalVolume, topExercises }` — S02 feed items can reference this for author stats on profile cards.
- `searchProfiles` uses Convex full-text search index on displayName — this is the user discovery mechanism S02 needs for the follow flow.
- Test helpers accept `testUserId` string args. S02 should use different userId strings (not collide with `test-m03-s01-user-a`/`test-m03-s01-user-b`) or ensure cleanup is robust.

### What's fragile
- **_generated/api.d.ts was manually edited** — The profiles module import was hand-added. When `npx convex dev` runs it will regenerate this file. If any S02 functions are added, they also need to be in the generated types (either via codegen or manual update).
- **computePeriodSummary undefined guard** — The `cutoff === undefined` check in the filter is new. If anyone changes the cutoff computation logic, they need to preserve this guard or profile stats break.

### Authoritative diagnostics
- `packages/backend/scripts/verify-s01-m03.ts` — Once Convex CLI auth is resolved, this is the single authoritative check for the S01 backend contract. 12/12 pass = healthy.
- `testGetProfile` / `testGetProfileByUsername` — These query test helpers can be called via ConvexHttpClient for programmatic state inspection of any user's profile.
- Profile stats zero-value defaults — `getProfileStats` never throws for users with no workout data, it returns zeros. This is by design, not a hidden failure.

### What assumptions changed
- **Assumed Convex CLI auth would be available** — It wasn't. The verification script is complete but unexecuted. Next session must resolve CLI auth before S02 starts.
- **Assumed codegen would run** — Without `npx convex dev`, the generated API types needed a manual edit. This is a fragile workaround.
