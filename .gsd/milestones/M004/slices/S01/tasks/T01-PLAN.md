---
estimated_steps: 5
estimated_files: 3
---

# T01: Schema + leaderboard compute helper + finishWorkout hook

**Slice:** S01 — Leaderboards — Backend + Web UI
**Milestone:** M004

## Description

Establish the `leaderboardEntries` table with composite index for top-N queries, add `leaderboardOptIn` to profiles, create the core `updateLeaderboardEntries` computation helper, wire it into `finishWorkout` as a non-fatal hook, and add cascade-delete in `deleteWorkout`. This is the foundational data pipeline — all subsequent tasks (queries, test helpers, UI) depend on this table and computation existing.

## Steps

1. **Add `leaderboardEntries` table to `schema.ts`** — Define the table with fields: `userId` (string), `exerciseId` (v.id("exercises")), `metric` (v.union of "e1rm", "volume", "reps"), `period` (v.literal("allTime")), `value` (v.number()), `workoutId` (v.id("workouts")), `updatedAt` (v.number()). Add composite index `by_exerciseId_metric_period_value` with fields `["exerciseId", "metric", "period", "value"]`. Add `by_userId` index for cleanup/cascade queries. Add `leaderboardOptIn: v.optional(v.boolean())` to the `profiles` table definition. Export the `leaderboardMetric` validator for reuse.

2. **Create `packages/backend/convex/lib/leaderboardCompute.ts`** — Implement `updateLeaderboardEntries(db, userId, workoutId)` that: fetches all workoutExercises for the workout, fetches sets per exercise, skips warmup sets and sets without weight/reps (same filter as analytics), computes 3 metrics per exercise (e1RM via imported `estimateOneRepMax`, total volume = Σ(weight×reps) for working sets, max single-set reps), upserts into `leaderboardEntries` per exercise/metric with period="allTime". Upsert pattern: query existing entry by userId+exerciseId+metric+period, compare value, patch if new value is greater or insert if no existing entry. Set `updatedAt = Date.now()` on every upsert/insert. Import `estimateOneRepMax` from `./prDetection`.

3. **Add non-fatal leaderboard hook in `finishWorkout`** — After the existing feed item try/catch block in `workouts.ts`, add a second try/catch block that calls `updateLeaderboardEntries(ctx.db, userId, args.id)`. Log errors with `console.error(\`[Leaderboard] Error updating entries for workout ${args.id}: ${err}\`)`. Import `updateLeaderboardEntries` from `./lib/leaderboardCompute`.

4. **Add leaderboard entry cascade-delete in `deleteWorkout`** — After the feed item cascade-delete block, add a block that queries `leaderboardEntries` by `by_userId` index for the workout owner and deletes entries where `workoutId` matches the deleted workout. This handles the specific case from the research pitfalls section.

5. **Verify TypeScript compilation** — Run `cd packages/backend && npx tsc --noEmit` and confirm 0 errors. Check that the schema changes don't break any existing type references.

## Must-Haves

- [ ] `leaderboardEntries` table defined in schema with `by_exerciseId_metric_period_value` composite index (fields in order: exerciseId, metric, period, value) and `by_userId` index
- [ ] `leaderboardOptIn: v.optional(v.boolean())` added to profiles table
- [ ] `leaderboardMetric` validator exported from schema (v.union of "e1rm", "volume", "reps")
- [ ] `updateLeaderboardEntries` function correctly computes e1RM (via `estimateOneRepMax`), volume (weight×reps excluding warmups), and reps (max single-set) per exercise
- [ ] `finishWorkout` calls `updateLeaderboardEntries` in a non-fatal try/catch after feed item creation
- [ ] `deleteWorkout` cascade-deletes leaderboard entries for the deleted workout
- [ ] TypeScript compiles with 0 errors in backend package

## Verification

- `cd packages/backend && npx tsc --noEmit` passes with 0 errors
- `grep -n "leaderboardEntries" packages/backend/convex/schema.ts` shows table definition with both indexes
- `grep -n "leaderboardOptIn" packages/backend/convex/schema.ts` shows field on profiles table
- `grep -n "updateLeaderboardEntries" packages/backend/convex/workouts.ts` shows import and call in finishWorkout
- `grep -n "\[Leaderboard\]" packages/backend/convex/workouts.ts` shows structured error logging
- `grep -n "leaderboardEntries" packages/backend/convex/workouts.ts` shows cascade-delete in deleteWorkout

## Observability Impact

- Signals added/changed: `[Leaderboard] Error updating entries for workout ${workoutId}: ${err}` — structured console.error in finishWorkout non-fatal hook, matching existing `[Feed Item]` pattern
- How a future agent inspects this: Search Convex dashboard logs for `[Leaderboard]` prefix; query `leaderboardEntries` table directly to verify entry existence and values
- Failure state exposed: Leaderboard update failures are logged but don't block workout completion. `updatedAt` field on entries enables staleness detection.

## Inputs

- `packages/backend/convex/schema.ts` — current schema with 15 tables, profiles table without leaderboardOptIn
- `packages/backend/convex/workouts.ts` — finishWorkout with existing feed item non-fatal block (lines ~53-82), deleteWorkout with existing cascade pattern
- `packages/backend/convex/lib/prDetection.ts` — `estimateOneRepMax` function to import and reuse

## Expected Output

- `packages/backend/convex/schema.ts` — extended with leaderboardEntries table (2 indexes) and leaderboardOptIn on profiles
- `packages/backend/convex/lib/leaderboardCompute.ts` — new file with `updateLeaderboardEntries` function (~80-120 lines)
- `packages/backend/convex/workouts.ts` — finishWorkout has second non-fatal block, deleteWorkout has leaderboard cascade
