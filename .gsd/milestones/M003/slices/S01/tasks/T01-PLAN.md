---
estimated_steps: 5
estimated_files: 3
---

# T01: Add profiles table, Convex functions, and test helpers

**Slice:** S01 — User Profiles
**Milestone:** M003

## Description

Create the `profiles` table in the Convex schema, implement all profile CRUD + stats + search + avatar Convex functions in a new `profiles.ts` file, and extend `testing.ts` with profile-specific test helpers and cleanup. This is the foundational backend work that T02's verification script and T03's UI depend on.

The `profiles` table is the first cross-user readable table in the codebase — previous tables all scope reads to the authenticated user via `getUserId()`. Profile queries (`getProfile`, `getProfileByUsername`) accept a userId/username arg and return data for any user, enabling the social foundation for M003.

## Steps

1. **Add `profiles` table to `schema.ts`** — Fields: `userId` (v.string()), `username` (v.string()), `usernameLower` (v.string()), `displayName` (v.string()), `bio` (v.optional(v.string())), `avatarStorageId` (v.optional(v.id("_storage"))), `isPublic` (v.boolean()), `createdAt` (v.number()). Indexes: `by_userId` on `[userId]`, `by_usernameLower` on `[usernameLower]`. Search index: `searchIndex("search_displayName", { searchField: "displayName", filterFields: ["isPublic"] })`. Follow existing table patterns in schema.ts.

2. **Create `packages/backend/convex/profiles.ts`** with 7 functions:
   - `createProfile` (mutation) — Takes `username`, `displayName`, `bio?`. Gets `userId` via `getUserId()`. Check `by_userId` (if exists, return existing profile). Validate username format (`/^[a-zA-Z0-9_]{3,30}$/`). Compute `usernameLower = username.toLowerCase()`. Check `by_usernameLower` (if taken, throw "Username already taken"). Insert profile with `isPublic: true`, `createdAt: Date.now()`. Return the new profile doc.
   - `updateProfile` (mutation) — Takes `displayName?`, `bio?`, `avatarStorageId?`, `isPublic?`. Gets own profile via `by_userId`. Patches only provided fields. If `avatarStorageId` changes and old one exists, delete old storage. Username is immutable — not accepted as arg.
   - `getProfile` (query) — Takes `userId: v.string()`. Returns profile doc or null. Requires authentication (call `getUserId()` to verify caller is authenticated, but returns any user's profile by the provided `userId` arg). Resolve avatar URL via `ctx.storage.getUrl()` if `avatarStorageId` exists.
   - `getProfileByUsername` (query) — Takes `username: v.string()`. Lowercases input, queries `by_usernameLower`. Returns profile doc with resolved avatar URL, or null. Requires authentication.
   - `getProfileStats` (query) — Takes `userId: v.string()`. Requires authentication. Calls `computePeriodSummary(ctx.db, userId, undefined)` for all-time stats (gets `workoutCount`, `totalVolume`, `topExercises`). Computes `currentStreak` by walking backward through completed workouts grouped by UTC day. Returns `{ totalWorkouts, currentStreak, totalVolume, topExercises }`.
   - `searchProfiles` (query) — Takes `searchTerm: v.string()`. Uses `withSearchIndex("search_displayName", q => q.search("displayName", searchTerm))`. Returns up to 20 results. Requires authentication.
   - `generateAvatarUploadUrl` (mutation) — Calls `ctx.storage.generateUploadUrl()` and returns the URL. Requires authentication.

3. **Implement streak computation** — New helper function `computeCurrentStreak(db, userId)`:
   - Query all completed workouts for userId via `by_userId_completedAt` index, ordered descending.
   - Group by UTC date (`new Date(completedAt).toISOString().slice(0, 10)`).
   - Walk backward from today: if today has a workout, count it. Keep counting consecutive days backward. Stop at first gap.
   - Return the count. If no workouts at all or no workout today/yesterday, return 0 (but if yesterday had one and today doesn't, streak is 0 — streak requires continuity through today or yesterday).

4. **Extend `testing.ts` with profile test helpers**:
   - `testCreateProfile` (mutation) — Same logic as `createProfile` but accepts `testUserId` arg.
   - `testUpdateProfile` (mutation) — Same as `updateProfile` with `testUserId`.
   - `testGetProfile` (query) — Returns profile for given `testUserId`.
   - `testGetProfileByUsername` (query) — Returns profile by username (no auth check).
   - `testGetProfileStats` (query) — Returns stats for given `testUserId`.
   - `testSearchProfiles` (query) — Searches displayName.
   - Extend `testCleanup` to delete all profiles for `testUserId` (query `by_userId`, delete each).

5. **Verify compilation** — Run `pnpm turbo typecheck --force` to ensure 0 errors across all 3 packages. Fix any type errors. Ensure Convex dev server can push the schema update.

## Must-Haves

- [ ] `profiles` table in schema with all fields, indexes, and search index per D071/D072
- [ ] `createProfile` enforces username format + case-insensitive uniqueness + at-most-one-profile-per-userId
- [ ] `updateProfile` does not allow username changes; cleans up old avatar storage
- [ ] `getProfile` and `getProfileByUsername` are cross-user reads (any authenticated user can read any profile)
- [ ] `getProfileStats` returns accurate totalWorkouts/totalVolume/topExercises via `computePeriodSummary` reuse + new streak logic
- [ ] `searchProfiles` uses Convex search index on displayName
- [ ] `generateAvatarUploadUrl` returns a Convex file storage upload URL
- [ ] All 6 profile test helpers exist in testing.ts with `testUserId` arg pattern
- [ ] `testCleanup` deletes profiles alongside other test data
- [ ] TypeScript compiles 0 errors across all 3 packages

## Verification

- `pnpm turbo typecheck --force` — 0 errors
- Convex dev server accepts `npx convex dev` without schema push errors
- Spot-check: `testCreateProfile` → `testGetProfile` round-trip works via Convex dashboard or quick script

## Observability Impact

- Signals added/changed: Profile mutations throw descriptive, stable error messages for validation failures (username format, uniqueness, not found). These messages are the error contract for T03's UI to display.
- How a future agent inspects this: Query `profiles` table in Convex dashboard; call `testGetProfile` / `testGetProfileByUsername` / `testGetProfileStats` via ConvexHttpClient for programmatic inspection.
- Failure state exposed: Username collisions produce "Username already taken"; format violations produce "Username must be 3-30 characters, alphanumeric and underscores only"; missing profile on update produces "Profile not found".

## Inputs

- `packages/backend/convex/schema.ts` — existing 9-table schema to extend
- `packages/backend/convex/lib/auth.ts` — `getUserId()` for auth gating
- `packages/backend/convex/analytics.ts` — `computePeriodSummary` for stats reuse
- `packages/backend/convex/userPreferences.ts` — upsert pattern reference
- `packages/backend/convex/testing.ts` — existing test helper + cleanup pattern to extend
- S01-RESEARCH decisions: D071, D072, D076, D079

## Expected Output

- `packages/backend/convex/schema.ts` — modified (profiles table added)
- `packages/backend/convex/profiles.ts` — new file with 7 exported Convex functions
- `packages/backend/convex/testing.ts` — modified (6 new profile test helpers + cleanup extension)
