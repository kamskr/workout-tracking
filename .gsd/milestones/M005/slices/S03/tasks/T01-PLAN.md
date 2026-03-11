---
estimated_steps: 5
estimated_files: 3
---

# T01: Extract finishWorkoutCore and wire into endSession + checkSessionTimeouts

**Slice:** S03 — Integration Hardening & Verification
**Milestone:** M005

## Description

The primary integration gap in M005: `endSession` marks participants as "left" and the session as "completed", but participant workout records stay `inProgress` forever. This means feed items, leaderboard entries, challenge progress, and badges never fire for group session workouts. This task extracts the 4 non-fatal hooks from `finishWorkout` into a shared `finishWorkoutCore` lib function, refactors `finishWorkout` to use it, then wires it into both `endSession` and `checkSessionTimeouts`.

## Steps

1. **Create `finishWorkoutCore` lib function** — New file `packages/backend/convex/lib/finishWorkoutCore.ts`. Extract the post-auth logic from `finishWorkout`: (a) patch workout to completed with `completedAt` and `durationSeconds`, (b) create feed item (non-fatal try/catch), (c) `updateLeaderboardEntries` (non-fatal), (d) `updateChallengeProgress` (non-fatal), (e) `evaluateAndAwardBadges` (non-fatal). Function signature: `finishWorkoutCore(db: DatabaseWriter, userId: string, workoutId: Id<"workouts">): Promise<{ completedAt: number; durationSeconds: number }>`. Import the 3 lib functions. The function must read the workout doc, validate it exists and is `inProgress` (throw if not found, return early/skip if already completed for idempotent behavior), compute `durationSeconds`, patch to completed, then run hooks.

2. **Refactor `finishWorkout` in `workouts.ts`** — Replace the inline hook logic with: auth check → get workout → ownership check → status check → `await finishWorkoutCore(ctx.db, userId, args.id)`. Remove the direct imports of `updateLeaderboardEntries`, `updateChallengeProgress`, `evaluateAndAwardBadges` from workouts.ts (they move to finishWorkoutCore.ts). Import `finishWorkoutCore` instead. The mutation's return type stays identical: `{ completedAt, durationSeconds }`.

3. **Wire `finishWorkoutCore` into `endSession`** — After the existing participant sweep that marks participants as "left", add a workout completion sweep: query workouts by `by_sessionId`, for each workout that is `inProgress`, call `finishWorkoutCore(ctx.db, workout.userId, workout._id)` wrapped in per-participant try/catch. Log the count of finished workouts. Skip workouts that are already "completed" (idempotent — handles the case where a participant manually finished before host ended). Add structured log: `[Session] endSession: finished N participant workouts`.

4. **Wire `finishWorkoutCore` into `checkSessionTimeouts`** — Inside the `allStale` branch (after patching session to completed), add the same workout completion sweep: query workouts by `by_sessionId`, iterate with per-participant try/catch, call `finishWorkoutCore` for each inProgress workout. Log the count. This ensures abandoned session workouts don't stay orphaned as `inProgress` (which would block users from starting new workouts per D018).

5. **Verify backend compilation** — Run `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` and confirm 0 errors. Verify `finishWorkoutCore` is exported. Verify `endSession` and `checkSessionTimeouts` both import it.

## Must-Haves

- [ ] `finishWorkoutCore` exported from `convex/lib/finishWorkoutCore.ts` with signature `(db, userId, workoutId) → { completedAt, durationSeconds }`
- [ ] `finishWorkout` in `workouts.ts` delegates to `finishWorkoutCore` — identical behavior, no regression
- [ ] `endSession` calls `finishWorkoutCore` per participant with per-participant try/catch
- [ ] `endSession` skips already-completed workouts (idempotent)
- [ ] `checkSessionTimeouts` calls `finishWorkoutCore` per participant on auto-complete
- [ ] Backend compiles with 0 errors

## Verification

- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — 0 errors
- `grep -c 'finishWorkoutCore' packages/backend/convex/sessions.ts` — at least 2 (endSession + checkSessionTimeouts)
- `grep -c 'finishWorkoutCore' packages/backend/convex/workouts.ts` — at least 1 (finishWorkout)
- `head -5 packages/backend/convex/lib/finishWorkoutCore.ts` — file exists with export

## Observability Impact

- Signals added/changed: `[Session] endSession` log extended with "finished N participant workouts" count. Per-participant hook failures logged as `[Session] endSession: hook error for participant {userId}: {error}`. `[Session] checkSessionTimeouts` log extended with workout finish count per auto-completed session.
- How a future agent inspects this: Filter Convex function logs for `[Session] endSession` to see workout completion counts. Check `workouts` table for `status: "completed"` with `sessionId` set to verify integration worked.
- Failure state exposed: Individual participant hook failures don't block other participants. Error includes participant userId for correlation. A partially-failed endSession still completes the session and other participants' workouts.

## Inputs

- `packages/backend/convex/workouts.ts` — Current `finishWorkout` with 4 inlined hooks (~100 lines of hook logic to extract)
- `packages/backend/convex/sessions.ts` — Current `endSession` (marks participants left, no workout finishing) and `checkSessionTimeouts` (patches session status, no workout finishing)
- `packages/backend/convex/lib/leaderboardCompute.ts` — `updateLeaderboardEntries(db, userId, workoutId)`
- `packages/backend/convex/lib/challengeCompute.ts` — `updateChallengeProgress(db, userId, workoutId)`
- `packages/backend/convex/lib/badgeEvaluation.ts` — `evaluateAndAwardBadges(db, userId)`
- S01/S02 summaries — Session schema, function structure, patterns

## Expected Output

- `packages/backend/convex/lib/finishWorkoutCore.ts` — New file (~80 lines): exported `finishWorkoutCore` function with 4 non-fatal hooks
- `packages/backend/convex/workouts.ts` — Modified: `finishWorkout` simplified to auth + delegation to `finishWorkoutCore`
- `packages/backend/convex/sessions.ts` — Modified: `endSession` and `checkSessionTimeouts` call `finishWorkoutCore` per participant with try/catch
