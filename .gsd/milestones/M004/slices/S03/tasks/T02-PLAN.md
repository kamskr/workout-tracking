---
estimated_steps: 5
estimated_files: 4
---

# T02: Queries + test helpers + verification script

**Slice:** S03 — Achievements & Badges — Backend + Web UI
**Milestone:** M004

## Description

Creates the query layer (`badges.ts` with `getUserBadges`), adds ~5 test helpers to `testing.ts` for programmatic badge verification, extends `testCleanup` with `userBadges` deletion, and writes the 12-check verification script (`verify-s03-m04.ts`) that proves badge evaluation works correctly across all 5 badge categories including deduplication, cross-user visibility, and cleanup.

## Steps

1. **Create `packages/backend/convex/badges.ts`** — Single auth-gated query `getUserBadges` that accepts `{ userId: v.string() }`, queries `userBadges` by `by_userId` index, enriches each row with display metadata from `BADGE_DEFINITIONS` (name, emoji, description, category), and returns the enriched array sorted by `awardedAt` desc. Import `BADGE_DEFINITIONS` from `./lib/badgeDefinitions`. Cross-user readable (same pattern as `getProfileStats` — auth-gated but reads for any userId arg).

2. **Add badge test helpers to `testing.ts`** — Add after the Challenge section (around line 2719). Import `evaluateAndAwardBadges` from `./lib/badgeEvaluation` and `BADGE_DEFINITIONS` from `./lib/badgeDefinitions`. Create 5 helpers:
   - `testEvaluateAndAwardBadges` (mutation): accepts `testUserId`, calls `evaluateAndAwardBadges(ctx.db, testUserId)`.
   - `testGetUserBadges` (query): accepts `testUserId`, queries `userBadges` by `by_userId` and enriches with `BADGE_DEFINITIONS` metadata (mirrors `getUserBadges`).
   - `testAwardBadge` (mutation): accepts `testUserId`, `badgeSlug`, directly inserts into `userBadges` with `awardedAt: Date.now()` — for controlled test setup.
   - `testGetRawUserBadges` (query): accepts `testUserId`, returns raw `userBadges` docs (no enrichment).
   - `testGetUserBadgeCount` (query): accepts `testUserId`, returns `number` — count of `userBadges` rows.

3. **Extend `testCleanup` in `testing.ts`** — Before the "Delete profiles" section, add a block that queries `userBadges` by `by_userId` index for the test user and deletes all matching rows.

4. **Update `api.d.ts`** — Add `import type * as badges from "../badges.js"` and corresponding `badges: typeof badges` entry in `fullApi`.

5. **Write `packages/backend/scripts/verify-s03-m04.ts`** — 12-check verification script using ConvexHttpClient with `testing.*` functions. Pattern matches `verify-s01-m04.ts` structure. Setup creates 2 test users (A and B) with profiles, seeds exercises. Checks:
   - **BG-01**: Create 1 workout for user A, finish, evaluate → `first_workout` badge exists.
   - **BG-02**: After 1 workout, `ten_workouts` badge does NOT exist (threshold not met).
   - **BG-03**: Evaluate again → `first_workout` still appears only once (no duplicate).
   - **BG-04**: `testGetUserBadges` returns badge with correct name, emoji, category from definitions.
   - **BG-05**: User B calls `testGetUserBadges` for user A → returns user A's badges (cross-user).
   - **BG-06**: Create workouts with enough volume for `volume_10k`, evaluate → badge awarded.
   - **BG-07**: Create workouts on consecutive days (use `testPatchWorkoutCompletedAt` if available, otherwise create+finish rapidly), evaluate → `streak_3` awarded.
   - **BG-08**: Log sets that trigger a PR via `testLogSetWithPR`, evaluate → `first_pr` awarded.
   - **BG-09**: Create+complete a challenge (user A as participant+winner), evaluate → `first_challenge` awarded.
   - **BG-10**: Count badges after all evaluations — verify count increased correctly (multiple badges awarded).
   - **BG-11**: Run `testCleanup` for both users → `testGetUserBadgeCount` returns 0.
   - **BG-12**: Validate `BADGE_DEFINITIONS` structure — 15 entries, 5 categories, all have slug/name/emoji/threshold.

## Must-Haves

- [ ] `getUserBadges` query in `badges.ts` — auth-gated, cross-user readable, enriched with display metadata
- [ ] 5 test helpers in `testing.ts` (testEvaluateAndAwardBadges, testGetUserBadges, testAwardBadge, testGetRawUserBadges, testGetUserBadgeCount)
- [ ] `testCleanup` extended with `userBadges` deletion
- [ ] `verify-s03-m04.ts` with 12 named checks (BG-01 through BG-12)
- [ ] Verification script covers all 5 badge categories (workout count, volume, streak, PR, challenge)
- [ ] `api.d.ts` updated with `badges` module

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `grep "testEvaluateAndAwardBadges\|testGetUserBadges\|testAwardBadge\|testGetRawUserBadges\|testGetUserBadgeCount" packages/backend/convex/testing.ts | wc -l` — at least 5 lines
- `grep "userBadges" packages/backend/convex/testing.ts` shows cleanup integration
- `grep -c "BG-" packages/backend/scripts/verify-s03-m04.ts` — at least 12
- `grep "badges" packages/backend/convex/_generated/api.d.ts` — shows badges module import

## Observability Impact

- Signals added/changed: `getUserBadges` returns enriched badges with metadata — enables UI to display without importing definitions separately. Test helpers provide programmatic inspection surface.
- How a future agent inspects this: `testGetRawUserBadges` → raw DB state, `testGetUserBadgeCount` → quick integer check, `testGetUserBadges` → enriched view matching UI output.
- Failure state exposed: `getUserBadges` returns empty array when no badges exist (not null/error). Missing badge definitions produce unmatched rows logged as "Unknown badge" in enrichment.

## Inputs

- `packages/backend/convex/lib/badgeDefinitions.ts` — T01 output: `BADGE_DEFINITIONS` constant
- `packages/backend/convex/lib/badgeEvaluation.ts` — T01 output: `evaluateAndAwardBadges` function
- `packages/backend/convex/schema.ts` — T01 output: `userBadges` table with indexes
- `packages/backend/convex/testing.ts` — existing 2719 lines with section headers and established test helper patterns
- `packages/backend/scripts/verify-s01-m04.ts` — reference for verification script structure (ConvexHttpClient pattern, named checks, setup/teardown)

## Expected Output

- `packages/backend/convex/badges.ts` — new file (~50 lines): `getUserBadges` query
- `packages/backend/convex/testing.ts` — extended with ~120 lines: 5 test helpers + testCleanup userBadges block
- `packages/backend/scripts/verify-s03-m04.ts` — new file (~500 lines): 12-check verification script
- `packages/backend/convex/_generated/api.d.ts` — `badges` module added to imports and fullApi
