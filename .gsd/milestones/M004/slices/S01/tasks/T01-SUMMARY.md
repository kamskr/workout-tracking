---
id: T01
parent: S01
milestone: M004
provides:
  - leaderboardEntries table with composite index and by_userId index
  - leaderboardOptIn field on profiles table
  - leaderboardMetric validator export from schema
  - updateLeaderboardEntries computation helper
  - Non-fatal leaderboard hook in finishWorkout
  - Cascade-delete of leaderboard entries in deleteWorkout
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/lib/leaderboardCompute.ts
  - packages/backend/convex/workouts.ts
key_decisions:
  - Leaderboard upsert queries by_userId index + filter (not a dedicated composite for userId+exerciseId+metric) since the by_userId index is already needed for cascade-delete and the filter is bounded by per-user entry count
patterns_established:
  - Non-fatal hook pattern in finishWorkout: try/catch with `[Leaderboard]` prefix matching existing `[Feed Item]` pattern
  - Upsert pattern for leaderboard entries: query existing → compare value → patch if greater or insert if missing
  - Working set filter: `!isWarmup && weight > 0 && reps > 0` consistent with PR detection and analytics
observability_surfaces:
  - "[Leaderboard] Error updating entries for workout ${workoutId}: ${err}" — structured console.error in finishWorkout non-fatal hook
  - updatedAt field on leaderboardEntries enables staleness detection
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Schema + leaderboard compute helper + finishWorkout hook

**Added leaderboardEntries table, computation helper computing e1RM/volume/reps per exercise, and wired into finishWorkout + deleteWorkout**

## What Happened

1. Extended `schema.ts` with the `leaderboardEntries` table containing fields for userId, exerciseId, metric (e1rm/volume/reps), period (allTime), value, workoutId, and updatedAt. Added composite index `by_exerciseId_metric_period_value` for top-N queries and `by_userId` for cascade-delete. Added `leaderboardOptIn: v.optional(v.boolean())` to profiles table. Exported `leaderboardMetric` validator for downstream use.

2. Created `leaderboardCompute.ts` with `updateLeaderboardEntries(db, userId, workoutId)` that traverses all workout exercises and their sets, filters to working sets (excludes warmups and sets without weight/reps), computes three metrics per exercise (best e1RM via Epley formula, total volume as Σ(weight×reps), max single-set reps), and upserts into leaderboardEntries using a query+compare+patch/insert pattern.

3. Added non-fatal try/catch block in `finishWorkout` after the feed item creation block, calling `updateLeaderboardEntries`. Errors are logged with `[Leaderboard]` prefix matching the existing `[Feed Item]` pattern.

4. Added cascade-delete in `deleteWorkout` that queries leaderboard entries by `by_userId` index and deletes entries matching the deleted workout's ID.

## Verification

- `cd packages/backend && tsc --noEmit -p convex` — 0 errors ✅
- `cd apps/web && tsc --noEmit` — only pre-existing clsx TS2307, 0 new errors ✅
- `grep -n "leaderboardEntries" schema.ts` — table definition with both indexes ✅
- `grep -n "leaderboardOptIn" schema.ts` — field on profiles table ✅
- `grep -n "updateLeaderboardEntries" workouts.ts` — import and call in finishWorkout ✅
- `grep -n "[Leaderboard]" workouts.ts` — structured error logging ✅
- `grep -n "leaderboardEntries" workouts.ts` — cascade-delete in deleteWorkout ✅

### Slice-level verification (T01 — partial):
- LB-01 through LB-12: Not yet testable (requires T02 queries + test helpers + verification script)
- Backend tsc: ✅ 0 errors
- Web tsc: ✅ 0 new errors
- Structured error logging: ✅ `[Leaderboard]` prefixed console.error in non-fatal hook

## Diagnostics

- Search Convex dashboard logs for `[Leaderboard]` prefix to find leaderboard update failures
- Query `leaderboardEntries` table directly to verify entry existence and values
- Check `updatedAt` field on entries to detect staleness (entries not being refreshed)
- Leaderboard update failures are logged but don't block workout completion — failure is only visible in Convex dashboard logs

## Deviations

None

## Known Issues

None

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added leaderboardEntries table with composite index, leaderboardOptIn on profiles, leaderboardMetric validator export
- `packages/backend/convex/lib/leaderboardCompute.ts` — New file: updateLeaderboardEntries computation helper (~120 lines)
- `packages/backend/convex/workouts.ts` — Added import, non-fatal leaderboard hook in finishWorkout, cascade-delete in deleteWorkout
