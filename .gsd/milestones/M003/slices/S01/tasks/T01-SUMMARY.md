---
id: T01
parent: S01
milestone: M003
provides:
  - profiles table in Convex schema with userId, username, usernameLower, displayName, bio, avatarStorageId, isPublic, createdAt
  - 7 Convex functions in profiles.ts (createProfile, updateProfile, getProfile, getProfileByUsername, getProfileStats, searchProfiles, generateAvatarUploadUrl)
  - computeCurrentStreak helper for consecutive-day workout streak
  - 6 profile test helpers in testing.ts (testCreateProfile, testUpdateProfile, testGetProfile, testGetProfileByUsername, testGetProfileStats, testSearchProfiles)
  - testCleanup extended to delete profiles and clean up avatar storage
  - computePeriodSummary updated to accept undefined periodDays for all-time queries
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/profiles.ts
  - packages/backend/convex/testing.ts
  - packages/backend/convex/analytics.ts
key_decisions:
  - D084 — computePeriodSummary accepts undefined periodDays for all-time queries
patterns_established:
  - Cross-user read pattern: profile queries accept userId/username arg and return any user's data (not just the caller's). Auth check verifies caller is authenticated but does not scope data to caller.
  - Username uniqueness enforcement: query by_usernameLower index before insert within atomic mutation. Convex OCC handles concurrent creation races.
  - Avatar storage lifecycle: generateAvatarUploadUrl → client POST → storageId → updateProfile. Old avatar cleaned up on change.
observability_surfaces:
  - Stable error messages: "Username already taken", "Username must be 3-30 characters, alphanumeric and underscores only", "Profile not found", "Not authenticated"
  - Test inspection: testGetProfile, testGetProfileByUsername, testGetProfileStats, testSearchProfiles queries for programmatic state verification
  - Profile stats return zero-value defaults when no workout data exists (no error thrown)
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add profiles table, Convex functions, and test helpers

**Created profiles table, 7 profile Convex functions (CRUD + stats + search + avatar upload), streak computation, and 6 test helpers with cleanup integration.**

## What Happened

1. **Added `profiles` table to `schema.ts`** with all specified fields (`userId`, `username`, `usernameLower`, `displayName`, `bio`, `avatarStorageId`, `isPublic`, `createdAt`), two indexes (`by_userId`, `by_usernameLower`), and a search index (`search_displayName` on displayName with isPublic filter field). Follows the same patterns as existing tables.

2. **Created `profiles.ts`** with 7 exported Convex functions:
   - `createProfile` — atomic create-or-return with userId check, username format validation (`/^[a-zA-Z0-9_]{3,30}$/`), case-insensitive uniqueness via usernameLower index
   - `updateProfile` — patches only provided fields, username immutable, cleans up old avatar storage on change
   - `getProfile` — cross-user read by userId with avatar URL resolution
   - `getProfileByUsername` — cross-user read by username (case-insensitive) with avatar URL resolution
   - `getProfileStats` — reuses `computePeriodSummary(db, userId, undefined)` for all-time stats + `computeCurrentStreak` for streak
   - `searchProfiles` — full-text search via `search_displayName` index, returns up to 20 results
   - `generateAvatarUploadUrl` — generates Convex file storage upload URL

3. **Implemented `computeCurrentStreak`** — walks backward from today through completed workouts grouped by UTC date. If today has a workout, counts from today. If only yesterday, counts from yesterday. Stops at first gap in consecutive days.

4. **Extended `testing.ts`** with 6 profile test helpers (`testCreateProfile`, `testUpdateProfile`, `testGetProfile`, `testGetProfileByUsername`, `testGetProfileStats`, `testSearchProfiles`) all using `testUserId` arg pattern. Extended `testCleanup` to delete profiles and clean up avatar storage for the test user.

5. **Updated `computePeriodSummary` signature** in `analytics.ts` from `periodDays: number` to `periodDays: number | undefined` and added `cutoff === undefined` guard in the filter. This enables all-time stat queries without breaking existing callers (D084).

## Verification

- `pnpm turbo typecheck --force --filter=@packages/backend` — **0 errors** (clean pass)
- `pnpm turbo typecheck --force --filter=web-app` — pre-existing error (`Cannot find module 'clsx'`) unrelated to this task. Verified by stashing changes and confirming same error on base branch.
- `pnpm turbo typecheck --force --filter=native-app` — pre-existing errors (`Cannot find module 'convex/react'`) unrelated to this task.
- Convex dev server not running locally — schema validation deferred to T02 when verification script exercises functions against live Convex instance.

### Slice-level verification (partial — T01 is intermediate task):
- ❌ `verify-s01-m03.ts` — not yet created (T02 deliverable)
- ✅ Backend typecheck passes for `@packages/backend`
- ❌ Browser verification — not applicable (T03 deliverable)
- Regression scripts not runnable without live Convex instance

## Diagnostics

- **Inspect profiles table:** Query via Convex dashboard or call `testGetProfile`/`testGetProfileByUsername` via ConvexHttpClient
- **Inspect stats:** Call `testGetProfileStats` with a testUserId to see totalWorkouts, currentStreak, totalVolume, topExercises
- **Error shapes:** All validation failures throw `Error` with stable message strings (listed in observability_surfaces above)
- **Avatar lifecycle:** `generateAvatarUploadUrl` → POST file → storageId → `updateProfile({ avatarStorageId })`. Old storage cleaned up automatically.

## Deviations

- **`computePeriodSummary` signature change (D084):** The existing function signature was `periodDays: number` which doesn't accept `undefined` for all-time queries. Changed to `periodDays: number | undefined` with `cutoff === undefined` guard in the workout filter. This is a backward-compatible change — all existing callers pass number values.

## Known Issues

- **web-app and native-app typecheck failures are pre-existing** — `Cannot find module 'clsx'` (web-app) and `Cannot find module 'convex/react'` (native-app) exist on the base branch before any T01 changes. These are dependency installation issues, not code bugs.
- **Convex dev server not tested** — Local Convex backend is not running. Schema push will be validated in T02 when the verification script exercises functions against a live instance.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added `profiles` table with fields, indexes, and search index
- `packages/backend/convex/profiles.ts` — New file with 7 Convex functions + `computeCurrentStreak` helper + `validateUsername` helper
- `packages/backend/convex/testing.ts` — Added 6 profile test helpers + extended `testCleanup` to delete profiles
- `packages/backend/convex/analytics.ts` — Changed `computePeriodSummary` signature to accept `number | undefined` for all-time queries
- `.gsd/DECISIONS.md` — Added D084
