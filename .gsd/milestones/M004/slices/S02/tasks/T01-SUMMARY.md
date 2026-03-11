---
id: T01
parent: S02
milestone: M004
provides:
  - challenges and challengeParticipants tables in schema
  - challengeType and challengeStatus validators exported from schema
  - updateChallengeProgress incremental computation for 4 challenge types
  - completeChallenge, activateChallenge, checkDeadlines internal mutations
  - crons.ts with 15-minute challenge deadline check
  - finishWorkout third non-fatal hook for challenge progress
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/lib/challengeCompute.ts
  - packages/backend/convex/challenges.ts
  - packages/backend/convex/crons.ts
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - checkDeadlines processes both active→completed and pending→active transitions inline (not via scheduler) since it's already in a mutation context
  - totalReps working set filter relaxes weight check (reps-only exercises like bodyweight)
  - maxWeight uses compare-and-update (not additive) to correctly track personal bests
patterns_established:
  - Internal mutations with idempotent early-return pattern (check status before acting)
  - crons.ts as project's first cron file — must be at convex/crons.ts and export default cronJobs() result
  - Challenge lifecycle state machine: pending → active → completed/cancelled
observability_surfaces:
  - "[Challenge] Error updating progress for workout ${workoutId}: ${err}" in finishWorkout console.error
  - "[Challenge] completeChallenge(${id}): already ${status}, skipping" for idempotent no-ops
  - "[Challenge] activateChallenge(${id}): activated" for lifecycle transitions
  - "[Challenge] checkDeadlines: completed N challenges, activated M challenges" for cron observability
duration: 8min
verification_result: passed
completed_at: 2026-03-11T16:28:00+01:00
blocker_discovered: false
---

# T01: Schema + challenge compute + crons.ts + finishWorkout hook

**Added challenges/challengeParticipants tables, challenge computation engine, lifecycle internal mutations, crons.ts with 15-min deadline check, and non-fatal challenge progress hook in finishWorkout.**

## What Happened

Implemented the complete backend data layer and infrastructure for group challenges:

1. **Schema** — Added `challengeType` and `challengeStatus` validators and two new tables (`challenges` with `by_status`/`by_creatorId` indexes, `challengeParticipants` with `by_challengeId_currentValue`/`by_userId`/`by_challengeId_userId` indexes). Total schema now has 20 tables.

2. **challengeCompute.ts** — Created incremental progress computation supporting all 4 types: `workoutCount` (+1 per workout), `totalReps` (sum reps from matching exercise working sets), `totalVolume` (sum weight×reps), `maxWeight` (compare-and-update). Follows the leaderboardCompute.ts pattern for DB access and working set filtering.

3. **challenges.ts** — Created 3 internal mutations: `completeChallenge` (finds winner by top currentValue, idempotent on non-active), `activateChallenge` (pending→active, idempotent on non-pending), `checkDeadlines` (cron handler that processes both transitions inline).

4. **crons.ts** — Project's first cron file with a 15-minute interval calling `checkDeadlines`.

5. **finishWorkout hook** — Added third non-fatal try/catch block calling `updateChallengeProgress`, matching the existing `[Feed Item]` and `[Leaderboard]` patterns.

## Verification

- `cd packages/backend && node_modules/.bin/tsc --noEmit -p convex` — **0 errors**
- `cd apps/web && node_modules/.bin/tsc --noEmit` — **0 new errors** (pre-existing clsx TS2307 only)
- `grep "challengeType\|challengeStatus" packages/backend/convex/schema.ts` — ✅ both validators present
- `grep "challenges:\|challengeParticipants:" packages/backend/convex/schema.ts` — ✅ both tables present
- `grep "\[Challenge\]" packages/backend/convex/workouts.ts` — ✅ non-fatal hook present
- `grep "cronJobs" packages/backend/convex/crons.ts` — ✅ cron setup present
- `grep "completeChallenge\|activateChallenge\|checkDeadlines" packages/backend/convex/challenges.ts` — ✅ all 3 internal mutations present
- `grep "updateChallengeProgress" packages/backend/convex/lib/challengeCompute.ts` — ✅ compute function present
- `grep "export default" packages/backend/convex/crons.ts` — ✅ default export present
- finishWorkout has 3 non-fatal try/catch blocks confirmed (feed + leaderboard + challenge)
- api.d.ts includes challenges, crons, and lib/challengeCompute modules confirmed

### Slice-level checks (partial — this is task 1 of the slice):
- ✅ `npx tsc --noEmit -p convex` — 0 errors
- ✅ `cd apps/web && npx tsc --noEmit` — 0 new errors
- ⏳ `npx tsx packages/backend/scripts/verify-s02-m04.ts` — not yet runnable (T02 creates test helpers and API)
- ✅ `crons.ts` exists and exports default `cronJobs()` result
- ✅ `finishWorkout` has 3 non-fatal try/catch blocks
- ⏳ `/challenges` page attributes — not yet (T03)
- ⏳ Header "Challenges" link — not yet (T03)
- ⏳ Middleware protection — not yet (T03)

## Diagnostics

- Grep Convex dashboard logs for `[Challenge]` prefix to see all lifecycle events
- `completeChallenge` logs skipped status for idempotent re-invocations
- `checkDeadlines` logs counts of completed/activated challenges per cron run
- Non-fatal hook failure visible in Convex logs only — never blocks workout completion

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added `challengeType`, `challengeStatus` validators and `challenges`, `challengeParticipants` tables (20 tables total)
- `packages/backend/convex/lib/challengeCompute.ts` — New file: `updateChallengeProgress` function handling all 4 challenge types
- `packages/backend/convex/challenges.ts` — New file: `completeChallenge`, `activateChallenge`, `checkDeadlines` internal mutations
- `packages/backend/convex/crons.ts` — New file: cron with 15-min interval for challenge deadline checks
- `packages/backend/convex/workouts.ts` — Added import and third non-fatal try/catch for challenge progress
- `packages/backend/convex/_generated/api.d.ts` — Added challenges, crons, lib/challengeCompute module imports and fullApi entries
