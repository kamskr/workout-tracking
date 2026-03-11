---
id: T02
parent: S02
milestone: M001
provides:
  - Programmatic verification script exercising all S02 backend functions (R002, R008, R009)
  - Test helper functions in convex/testing.ts for auth-free workout lifecycle testing
key_files:
  - packages/backend/scripts/verify-s02.ts
  - packages/backend/convex/testing.ts
key_decisions:
  - Used public mutation/query for test helpers instead of internalMutation/internalQuery because ConvexHttpClient cannot call internal functions without admin auth (not available on local self-hosted backend). Functions accept testUserId param and are clearly marked test-only.
patterns_established:
  - Test helper pattern: public Convex functions with testUserId arg for auth-free verification via ConvexHttpClient
  - Cleanup-in-finally pattern: testCleanup runs in both success and failure paths to avoid leftover test data
observability_surfaces:
  - "npx tsx packages/backend/scripts/verify-s02.ts — 15 named checks with PASS/FAIL output, exit 0/1"
duration: ~15min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Programmatic verification script for all S02 backend functions

**Created verify-s02.ts exercising full workout lifecycle, duration tracking, and unit preferences — 15 checks all passing.**

## What Happened

Built `convex/testing.ts` with 9 test helper functions (testCreateWorkout, testFinishWorkout, testDeleteWorkout, testGetWorkoutWithDetails, testListWorkouts, testAddExercise, testLogSet, testSetUnitPreference, testGetPreferences, testCleanup) that mirror the auth-gated public functions but accept a `testUserId` parameter directly.

Created `scripts/verify-s02.ts` following the verify-s01.ts pattern with 15 named checks across three requirement groups:
- **R009 (Duration tracking)**: Creates workout, waits 2s, finishes, verifies `durationSeconds >= 1` and `completedAt` is set
- **R002 (Workout CRUD)**: Full lifecycle — create workout → add 2 exercises from library → log 3 sets with weight/reps → finish → verify getWorkoutWithDetails returns joined data with exercise names and sets → verify listWorkouts includes it → delete → verify removed
- **R008 (Unit preference)**: Set to "lbs" → read back → set to "kg" → read back

All test data is cleaned up via `testCleanup` in a `finally` block.

## Verification

- `npx tsx packages/backend/scripts/verify-s02.ts` — **15/15 checks pass, exit code 0**
- `pnpm turbo typecheck` — **3/3 packages pass, no type errors**

### Slice-level verification status (intermediate task):
- ✅ `npx tsx packages/backend/scripts/verify-s02.ts` — all pass
- ✅ `pnpm turbo typecheck` — all pass
- ⬜ Browser: `/workouts` — not yet (UI tasks pending)
- ⬜ Browser: `/workouts/active` — not yet (UI tasks pending)
- ⬜ Browser: finishing workout redirects — not yet (UI tasks pending)
- ⬜ Browser: unit toggle — not yet (UI tasks pending)

## Diagnostics

Run `npx tsx packages/backend/scripts/verify-s02.ts` for a fast pass/fail check on all S02 backend contracts. Exit code 0 = healthy. Each check prints `✅ PASS` or `❌ FAIL` with detail string showing the specific assertion that broke.

## Deviations

Test helpers use public `mutation`/`query` instead of `internalMutation`/`internalQuery` as originally planned. `ConvexHttpClient` cannot call internal Convex functions — the local self-hosted backend doesn't expose an admin key for `setAdminAuth`. The functions are still clearly test-only (prefixed with `test`, accept `testUserId` arg, documented as test-only in file header).

## Known Issues

- `convex/testing.ts` exposes public test functions. In production deployment, this file should be excluded or gated behind an environment check. Acceptable for local dev verification.

## Files Created/Modified

- `packages/backend/convex/testing.ts` — 9 test helper functions + cleanup, bypassing auth with testUserId param
- `packages/backend/scripts/verify-s02.ts` — 15-check verification script covering R002, R008, R009
