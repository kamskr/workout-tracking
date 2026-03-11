# S01: User Profiles

**Goal:** Users have a Convex-backed profile with username, display name, bio, and workout stats. Profile creation enforces case-insensitive username uniqueness. Any authenticated user can view another user's profile at `/profile/[username]`. Profile search enables user discovery for S02 follow system.

**Demo:** User A visits the app, is prompted to set up a profile (choose unique username, set display name, add bio). After creation, their profile page at `/profile/username_a` shows their avatar, bio, and workout stats (total workouts, current streak, total volume, top exercises). User B visits `/profile/username_a` and sees the same public profile. Backend verification script proves profile CRUD, username uniqueness enforcement, stats computation accuracy, search, and multi-user cross-user reads.

## Must-Haves

- `profiles` table with `userId` (indexed), `username`, `usernameLower` (unique-indexed), `displayName`, `bio`, `avatarStorageId`, `isPublic`, `createdAt` fields (D071, D072)
- `createProfile` mutation — atomic create-or-return with `by_userId` check then `by_usernameLower` uniqueness check (D072)
- `updateProfile` mutation — allows `displayName`, `bio`, `avatarStorageId`, `isPublic` changes; username is immutable after creation
- `getProfile` query (by userId) and `getProfileByUsername` query (by usernameLower) — cross-user reads for any authenticated user
- `getProfileStats` query — returns `{ totalWorkouts, currentStreak, totalVolume, topExercises }` reusing `computePeriodSummary` pattern (D065)
- `searchProfiles` query with search index on `displayName` (same pattern as `exercises` search_name index)
- Avatar upload via `generateAvatarUploadUrl` mutation + `ctx.storage.getUrl()` resolution (D076)
- Profile test helpers (`testCreateProfile`, `testGetProfile`, `testGetProfileByUsername`, `testGetProfileStats`, `testSearchProfiles`) following D079 multi-user pattern
- `testCleanup` extended to also delete profiles
- Backend verification script (`verify-s01-m03.ts`) with 12+ checks proving profile CRUD, username uniqueness, stats computation, search, cross-user reads
- `/profile/setup` page — protected, shows for users without profiles; fields: username (live validation), displayName (seeded from Clerk), bio (optional)
- `/profile/[username]` page — protected, displays avatar, name, bio, stats; "Edit Profile" button for own profile
- Middleware updated to protect `/profile(.*)` routes
- Username format: `/^[a-zA-Z0-9_]{3,30}$/`, case-insensitive uniqueness via `usernameLower` (D072)
- TypeScript compiles 0 errors across all 3 packages after all changes

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (Convex dev instance for verification script + Next.js dev server for browser walkthrough)
- Human/UAT required: no (programmatic backend proof + browser assertion coverage sufficient for S01)

## Verification

- `npx tsx packages/backend/scripts/verify-s01-m03.ts` — 12+ checks covering:
  - Profile creation (create, get by userId, get by username)
  - Username uniqueness (case-insensitive collision rejected)
  - Username format validation (too short, invalid chars rejected)
  - Profile update (displayName, bio changes)
  - Profile stats accuracy (totalWorkouts, totalVolume, topExercises match analytics)
  - Current streak computation (consecutive days with completed workouts)
  - Search profiles by displayName
  - Cross-user profile read (user B reads user A's profile)
  - Cleanup (profiles deleted alongside other test data)
- `pnpm turbo typecheck --force` — 0 errors across 3 packages
- All M001+M002 regression scripts still pass (72/72 checks)
- Browser verification: `/profile/setup` renders form, `/profile/[username]` renders profile page with stats

## Observability / Diagnostics

- Runtime signals: Profile mutations throw descriptive errors with stable messages ("Username already taken", "Username must be 3-30 characters, alphanumeric and underscores only", "Profile already exists for this user", "Profile not found")
- Inspection surfaces: `testGetProfile` and `testGetProfileByUsername` queries for programmatic state inspection; Convex dashboard for `profiles` table direct inspection
- Failure visibility: Username uniqueness violations return clear error text (not OCC retry — the mutation checks and throws). Profile stats query returns zero-value defaults if no workout data exists (no error).
- Redaction constraints: None — profile data is intentionally public within authenticated context

## Integration Closure

- Upstream surfaces consumed:
  - `convex/lib/auth.ts` — `getUserId()` for auth gating on mutations and own-profile queries
  - `convex/analytics.ts` — `computePeriodSummary(db, userId, undefined)` for all-time workout stats
  - `convex/schema.ts` — extends with `profiles` table
  - `convex/testing.ts` — extends with profile test helpers and cleanup
  - `apps/web/src/middleware.ts` — adds `/profile(.*)` to protected routes
  - `apps/web/src/components/common/avatar.tsx` — Radix Avatar component reused on profile pages
  - Clerk `useUser()` — seeds initial displayName on setup page

- New wiring introduced in this slice:
  - `profiles` table in Convex schema (first cross-user readable table)
  - `convex/profiles.ts` — 6 new Convex functions (createProfile, updateProfile, getProfile, getProfileByUsername, getProfileStats, searchProfiles)
  - `convex/profiles.ts` — `generateAvatarUploadUrl` mutation
  - Profile test helpers in `convex/testing.ts`
  - `/profile/setup` and `/profile/[username]` Next.js pages
  - S01→S02 boundary contract: `profiles` table schema, `getProfile`/`getProfileByUsername` query return shapes, `searchProfiles` query, test helpers

- What remains before the milestone is truly usable end-to-end:
  - S02: Follow system + activity feed (consumes profiles for author info)
  - S03: Workout sharing + privacy controls
  - S04: Mobile social port

## Tasks

- [x] **T01: Add profiles table, Convex functions, and test helpers** `est:1h30m`
  - Why: The entire slice depends on the `profiles` table and its CRUD functions. This establishes the data model, uniqueness enforcement, stats computation, search index, avatar upload, and test helpers that T02's verification script and T03's UI will consume.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/profiles.ts`, `packages/backend/convex/testing.ts`
  - Do: Add `profiles` table to schema with all fields + indexes + search index. Create `profiles.ts` with `createProfile`, `updateProfile`, `getProfile`, `getProfileByUsername`, `getProfileStats`, `searchProfiles`, `generateAvatarUploadUrl`. Add profile test helpers to `testing.ts` and extend `testCleanup` to delete profiles. Streak computation is new logic — walk backward through completed workouts by UTC day.
  - Verify: `pnpm turbo typecheck --force` passes 0 errors; Convex dev server accepts schema push
  - Done when: All 7 Convex functions + 5 test helpers compile and are deployed to dev instance

- [x] **T02: Write and pass backend verification script** `est:1h`
  - Why: The verification script is the objective stopping condition for the backend contract. It proves profile CRUD, username uniqueness, stats accuracy, search, and cross-user reads — the S01→S02 boundary contract that S02 will depend on.
  - Files: `packages/backend/scripts/verify-s01-m03.ts`
  - Do: Create verification script following existing `verify-s02.ts` pattern (ConvexHttpClient, testUserId, check function, cleanup). 12+ checks covering all must-haves. Two test users for cross-user read verification. If any checks fail, fix the backend functions until all pass.
  - Verify: `npx tsx packages/backend/scripts/verify-s01-m03.ts` prints 12/12+ checks passed
  - Done when: All checks pass, all M001+M002 regression scripts still pass (72/72)

- [x] **T03: Build profile setup and profile view web pages** `est:1h30m`
  - Why: The UI surfaces complete the integration proof — real users can create profiles and view other users' profiles. This is the first cross-user web page in the app.
  - Files: `apps/web/src/app/profile/setup/page.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/components/profile/ProfileStats.tsx`, `apps/web/src/components/profile/ProfileSetupForm.tsx`
  - Do: Add `/profile(.*)` to middleware. Create `/profile/setup` page with username validation (live check via `getProfileByUsername`), displayName seeded from Clerk, bio textarea. Create `/profile/[username]` page showing avatar, name, bio, stats via `getProfileStats`, "Edit Profile" link for own profile. Create ProfileStats component displaying total workouts, streak, volume, top exercises. Both pages use existing Avatar + design patterns.
  - Verify: `pnpm turbo typecheck --force` passes; browser navigation to `/profile/setup` renders form; `/profile/[username]` renders profile with stats
  - Done when: TypeScript compiles 0 errors across all 3 packages; profile setup flow creates profile and redirects to profile page; profile page displays stats; all backend regression checks still pass

## Files Likely Touched

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/profiles.ts` (new)
- `packages/backend/convex/testing.ts`
- `packages/backend/scripts/verify-s01-m03.ts` (new)
- `apps/web/src/middleware.ts`
- `apps/web/src/app/profile/setup/page.tsx` (new)
- `apps/web/src/app/profile/[username]/page.tsx` (new)
- `apps/web/src/components/profile/ProfileSetupForm.tsx` (new)
- `apps/web/src/components/profile/ProfileStats.tsx` (new)
