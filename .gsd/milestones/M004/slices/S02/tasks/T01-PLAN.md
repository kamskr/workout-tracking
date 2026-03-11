---
estimated_steps: 5
estimated_files: 6
---

# T01: Schema + challenge compute + crons.ts + finishWorkout hook

**Slice:** S02 — Group Challenges — Backend + Web UI
**Milestone:** M004

## Description

Establishes the complete backend data layer and infrastructure for group challenges. Adds two new tables (`challenges`, `challengeParticipants`) with proper indexes and validators to the schema. Creates the challenge computation engine (`challengeCompute.ts`) that incrementally updates participant standings from workout data. Creates the scheduling infrastructure (`crons.ts` for periodic lifecycle checks, `completeChallenge`/`activateChallenge`/`checkDeadlines` as internal mutations). Wires challenge progress updates into `finishWorkout` as a third non-fatal try/catch block.

This task produces only the internal mutations and infrastructure — public API functions are added in T02. The internal mutations (`completeChallenge`, `activateChallenge`, `checkDeadlines`) must be independently exercisable for T02's test helpers to call them.

## Steps

1. **Add `challengeType`, `challengeStatus` validators and two tables to `schema.ts`:**
   - Add `challengeType` validator: `v.union(v.literal("totalReps"), v.literal("totalVolume"), v.literal("workoutCount"), v.literal("maxWeight"))`
   - Add `challengeStatus` validator: `v.union(v.literal("pending"), v.literal("active"), v.literal("completed"), v.literal("cancelled"))`
   - Export both validators alongside existing exports (`feedItemType`, `reactionType`, `reportTargetType`, `leaderboardMetric`)
   - Add `challenges` table with fields: `creatorId: v.string()`, `title: v.string()`, `description: v.optional(v.string())`, `type: challengeType`, `exerciseId: v.optional(v.id("exercises"))`, `status: challengeStatus`, `startAt: v.number()`, `endAt: v.number()`, `winnerId: v.optional(v.string())`, `completedAt: v.optional(v.number())`, `scheduledCompletionId: v.optional(v.id("_scheduled_functions"))`, `createdAt: v.number()`
   - Indexes: `by_status` on `["status"]`, `by_creatorId` on `["creatorId"]`
   - Add `challengeParticipants` table with fields: `challengeId: v.id("challenges")`, `userId: v.string()`, `currentValue: v.number()`, `joinedAt: v.number()`
   - Indexes: `by_challengeId_currentValue` on `["challengeId", "currentValue"]` (standings), `by_userId` on `["userId"]` (my challenges), `by_challengeId_userId` on `["challengeId", "userId"]` (unique join check)

2. **Create `lib/challengeCompute.ts` with `updateChallengeProgress`:**
   - Import `GenericDatabaseWriter`, `DataModel`, `Id` from Convex (same pattern as `leaderboardCompute.ts`)
   - Export async function `updateChallengeProgress(db, userId, workoutId)` 
   - Find all active challenges the user participates in: query `challengeParticipants` by `by_userId` index, filter to matching userId, then for each participant doc fetch the challenge and check `status === "active"` and `Date.now() <= endAt`
   - For each active challenge:
     - **workoutCount**: Increment `currentValue` by 1 (no set traversal)
     - **totalReps**: Fetch workout exercises, filter by `challenge.exerciseId`, get working sets (`!isWarmup && reps > 0`), sum reps, add delta to `currentValue`
     - **totalVolume**: Same filter, sum `weight × reps` from working sets, add delta to `currentValue`
     - **maxWeight**: Same filter, find max weight from working sets, compare-and-update `currentValue` if greater (not additive)
   - Use `db.patch(participant._id, { currentValue: newValue })` for each update
   - Working set filter matches existing pattern: `!s.isWarmup && s.weight !== undefined && s.weight > 0 && s.reps !== undefined && s.reps > 0` (for reps-only types like totalReps, relax weight check)

3. **Create `challenges.ts` with internal mutations:**
   - Import `internalMutation` from `"./_generated/server"` and `internal` from `"./_generated/api"` (same pattern as `openai.ts`)
   - `completeChallenge = internalMutation`: args `{ challengeId: v.id("challenges") }`. Check status is "active" — if not, log `[Challenge] completeChallenge(${id}): already ${status}, skipping` and return. Check `Date.now() >= challenge.endAt`. Query participants by `by_challengeId_currentValue` index, order desc, take 1 for winner. Patch challenge: `status: "completed"`, `winnerId` (or undefined if no participants), `completedAt: Date.now()`. 
   - `activateChallenge = internalMutation`: args `{ challengeId: v.id("challenges") }`. Check status is "pending" — if not, return early. Check `Date.now() >= challenge.startAt`. Patch challenge: `status: "active"`. Log `[Challenge] activateChallenge(${id}): activated`.
   - `checkDeadlines = internalMutation`: args `{}`. Query challenges with `by_status` index for "active" status. For each, if `Date.now() >= endAt`, call `completeChallenge` logic inline (not via scheduler — we're already in a mutation). Also query "pending" challenges: for each, if `Date.now() >= startAt`, activate inline. Log counts processed.

4. **Create `crons.ts`:**
   - Import `cronJobs` from `"convex/server"` and `internal` from `"./_generated/api"`
   - `const crons = cronJobs();`
   - `crons.interval("check challenge deadlines", { minutes: 15 }, internal.challenges.checkDeadlines);`
   - `export default crons;`
   - This is the project's first cron file — must be at `convex/crons.ts` (not a subdirectory) and export default

5. **Wire challenge hook into `finishWorkout` and update `api.d.ts`:**
   - In `workouts.ts`, import `updateChallengeProgress` from `"./lib/challengeCompute"`
   - After the existing leaderboard try/catch block, add a third non-fatal block:
     ```
     // Update challenge progress (non-fatal — workout completion always succeeds)
     try {
       await updateChallengeProgress(ctx.db, userId, args.id);
     } catch (err) {
       console.error(`[Challenge] Error updating progress for workout ${args.id}: ${err}`);
     }
     ```
   - In `_generated/api.d.ts`, add manual imports for `challenges`, `crons`, and `lib/challengeCompute` modules following existing pattern. Add them to the `fullApi` object.

## Must-Haves

- [ ] `challenges` table with `by_status` and `by_creatorId` indexes
- [ ] `challengeParticipants` table with `by_challengeId_currentValue`, `by_userId`, `by_challengeId_userId` indexes
- [ ] `challengeType` and `challengeStatus` validators exported from schema
- [ ] `updateChallengeProgress` handles all 4 challenge types with incremental delta (not full recompute)
- [ ] `completeChallenge` is idempotent — returns early for non-active challenges
- [ ] `activateChallenge` is idempotent — returns early for non-pending challenges
- [ ] `checkDeadlines` processes both active→completed and pending→active transitions
- [ ] `crons.ts` exports default `cronJobs()` result with 15-minute interval
- [ ] `finishWorkout` has third non-fatal try/catch with `[Challenge]` prefix
- [ ] `api.d.ts` includes challenges, crons, and lib/challengeCompute modules
- [ ] TypeScript compiles with 0 errors

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `grep "challengeType\|challengeStatus" packages/backend/convex/schema.ts` shows both validators
- `grep "challenges:\|challengeParticipants:" packages/backend/convex/schema.ts` shows both tables
- `grep "\[Challenge\]" packages/backend/convex/workouts.ts` shows the non-fatal hook
- `grep "cronJobs" packages/backend/convex/crons.ts` shows cron setup
- `grep "completeChallenge\|activateChallenge\|checkDeadlines" packages/backend/convex/challenges.ts` shows all 3 internal mutations
- `grep "updateChallengeProgress" packages/backend/convex/lib/challengeCompute.ts` shows the compute function

## Observability Impact

- Signals added/changed: `[Challenge] Error updating progress for workout ${workoutId}: ${err}` structured console.error in finishWorkout (matches `[Feed Item]` and `[Leaderboard]` patterns). `[Challenge] completeChallenge(${id}): already ${status}, skipping` for idempotent no-ops. `[Challenge] activateChallenge(${id}): activated` for lifecycle transitions. `[Challenge] checkDeadlines: completed ${n} challenges, activated ${m} challenges` for cron observability.
- How a future agent inspects this: grep Convex dashboard logs for `[Challenge]` prefix. Check challenge status field directly via `testGetRawChallenge` (T02). Check `challengeParticipants.currentValue` via `testGetRawParticipants` (T02).
- Failure state exposed: Non-fatal hook failure visible only in Convex logs — workout completion always succeeds. Stale `currentValue` if hook fails is eventually consistent (next workout triggers re-computation for that workout's delta only). `completeChallenge` idempotency prevents double-completion.

## Inputs

- `packages/backend/convex/schema.ts` — existing 18-table schema with validator export pattern
- `packages/backend/convex/lib/leaderboardCompute.ts` — working set filter, traverse-compute-upsert pattern to follow
- `packages/backend/convex/workouts.ts` — finishWorkout with 2 existing non-fatal hooks (feed item at line 59, leaderboard at line 91)
- `packages/backend/convex/notes.ts` — `ctx.scheduler.runAfter(0, internal.openai.summary, {...})` proves scheduler + internal import pattern
- `packages/backend/convex/openai.ts` — `internalAction`/`internalMutation` import pattern from `"./_generated/server"`
- S02-RESEARCH.md schema design — table definitions, indexes, state machine

## Expected Output

- `packages/backend/convex/schema.ts` — 2 new tables, 2 new validators exported, total 20 tables
- `packages/backend/convex/lib/challengeCompute.ts` — new file (~100-120 lines) with `updateChallengeProgress`
- `packages/backend/convex/challenges.ts` — new file (~100-130 lines) with 3 internal mutations
- `packages/backend/convex/crons.ts` — new file (~10 lines) with cron setup
- `packages/backend/convex/workouts.ts` — third non-fatal hook added (~5 lines)
- `packages/backend/convex/_generated/api.d.ts` — 3 new module imports + fullApi entries
