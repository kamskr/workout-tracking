---
estimated_steps: 4
estimated_files: 1
---

# T02: Write and pass backend verification script

**Slice:** S01 — User Profiles
**Milestone:** M003

## Description

Create the backend verification script `verify-s01-m03.ts` that exercises all profile CRUD functions, username uniqueness enforcement, stats computation, search, and cross-user reads via ConvexHttpClient. This script is the objective stopping condition for the S01 backend contract. It follows the established pattern from `verify-s02.ts` (M001) and `verify-s01-m02.ts` (M002).

The script uses two test users (`test-m03-s01-user-a` and `test-m03-s01-user-b`) to prove cross-user profile reads — the first multi-user test scenario in the codebase (D079). If any checks fail, the backend functions from T01 must be fixed until all pass.

## Steps

1. **Create `packages/backend/scripts/verify-s01-m03.ts`** following the established verification pattern:
   - Import ConvexHttpClient, api, resolve CONVEX_URL from env or .env.local
   - Define `check(name, requirement, passed, detail)` function and results array
   - Use two test user IDs: `"test-m03-s01-user-a"` and `"test-m03-s01-user-b"`
   - Call `testCleanup` for both users before and after all checks (cleanup on entry + exit)

2. **Implement 12+ verification checks**:
   - **P-01** (R015): Create profile for user A — `testCreateProfile({ testUserId: userA, username: "AlphaUser", displayName: "Alpha User", bio: "Test bio" })` succeeds, returns profile with correct fields
   - **P-02** (R015): Get profile by userId — `testGetProfile({ testUserId: userA })` returns profile with matching username, displayName, bio, isPublic: true
   - **P-03** (R015): Get profile by username — `testGetProfileByUsername({ username: "AlphaUser" })` returns same profile (case-insensitive lookup: "alphauser")
   - **P-04** (R015): Case-insensitive username uniqueness — `testCreateProfile({ testUserId: userB, username: "alphauser" })` throws "Username already taken"
   - **P-05** (R015): Username format validation — `testCreateProfile({ testUserId: userB, username: "ab" })` throws format error (too short); `testCreateProfile({ testUserId: userB, username: "invalid name!" })` throws format error (invalid chars)
   - **P-06** (R015): Duplicate profile for same user returns existing — `testCreateProfile({ testUserId: userA, username: "DifferentName" })` returns existing profile (not a new one), idempotent
   - **P-07** (R015): Update profile — `testUpdateProfile({ testUserId: userA, displayName: "Updated Name", bio: "New bio" })` succeeds. Re-read profile, verify changes persisted.
   - **P-08** (R015): Profile stats with workout data — Create workout for user A, add exercise, log sets, finish workout. Call `testGetProfileStats({ testUserId: userA })`. Verify `totalWorkouts >= 1`, `totalVolume > 0`, `topExercises.length >= 1`.
   - **P-09** (R015): Current streak computation — Verify `currentStreak` is 0 or 1 (depending on whether the test workout's completedAt is today in UTC). Confirm it's a non-negative number.
   - **P-10** (R015): Search profiles — `testSearchProfiles({ searchTerm: "Updated" })` returns at least 1 result matching user A's updated displayName.
   - **P-11** (R015): Cross-user profile read — Create profile for user B (with different username). User B calls `testGetProfileByUsername({ username: "AlphaUser" })` and gets user A's profile. User A calls `testGetProfileByUsername({ username: userB's username })` and gets user B's profile.
   - **P-12** (R015): Nonexistent profile returns null — `testGetProfileByUsername({ username: "nonexistent_xyz_999" })` returns null (no crash).

3. **Run the script and fix any failures** — Execute `npx tsx packages/backend/scripts/verify-s01-m03.ts`. If any check fails, debug and fix the T01 backend functions. Re-run until all pass.

4. **Verify M001+M002 regression** — Run all existing verification scripts to ensure no regressions:
   - `npx tsx packages/backend/scripts/verify-s02.ts` (15/15)
   - `npx tsx packages/backend/scripts/verify-s03.ts` (12/12)
   - `npx tsx packages/backend/scripts/verify-s04.ts` (6/6)
   - `npx tsx packages/backend/scripts/verify-s05.ts` (8/8)
   - `npx tsx packages/backend/scripts/verify-s01-m02.ts` (12/12)
   - `npx tsx packages/backend/scripts/verify-s02-m02.ts` (8/8)
   - `npx tsx packages/backend/scripts/verify-s03-m02.ts` (11/11)

## Must-Haves

- [ ] Verification script uses the established ConvexHttpClient + check() pattern
- [ ] Two distinct test users for multi-user scenario (D079)
- [ ] Cleanup runs before and after all checks (idempotent test data)
- [ ] Username uniqueness (case-insensitive) proven by attempted collision
- [ ] Username format validation proven by invalid inputs
- [ ] Profile stats accuracy verified against known workout data
- [ ] Cross-user profile read verified (user B reads user A's profile)
- [ ] All 12+ checks pass
- [ ] All 72 M001+M002 regression checks still pass

## Verification

- `npx tsx packages/backend/scripts/verify-s01-m03.ts` — prints "12/12 checks passed" (or more)
- All existing verify-*.ts scripts pass with unchanged check counts

## Observability Impact

- Signals added/changed: None — verification script is a read-only diagnostic tool
- How a future agent inspects this: Run `npx tsx packages/backend/scripts/verify-s01-m03.ts` to validate the profile backend contract at any time
- Failure state exposed: Each failed check prints the check name, requirement, and detail explaining what went wrong

## Inputs

- `packages/backend/convex/profiles.ts` — T01 output (profile CRUD functions)
- `packages/backend/convex/testing.ts` — T01 output (profile test helpers)
- `packages/backend/scripts/verify-s02.ts` — pattern reference for script structure
- Convex dev instance running with T01 schema deployed

## Expected Output

- `packages/backend/scripts/verify-s01-m03.ts` — new verification script, all checks passing
