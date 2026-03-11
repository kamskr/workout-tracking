---
id: T01
parent: S03
milestone: M005
provides:
  - finishWorkoutCore lib function as single source of truth for workout completion hooks
  - endSession workout completion sweep (per-participant, idempotent, try/catch)
  - checkSessionTimeouts workout completion sweep (per-participant, idempotent, try/catch)
key_files:
  - packages/backend/convex/lib/finishWorkoutCore.ts
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/sessions.ts
key_decisions:
  - finishWorkoutCore is idempotent — returns existing values for already-completed workouts instead of throwing
patterns_established:
  - Shared lib function for workout completion hooks, called from both user-initiated and system-initiated paths
  - Per-participant try/catch in session completion to prevent one participant's hook failure from blocking others
observability_surfaces:
  - "[Session] endSession" log extended with "finished N participant workouts" count
  - "[Session] endSession: hook error for participant {userId}" for per-participant failures
  - "[Session] checkSessionTimeouts" log extended with per-session workout finish count
  - "[finishWorkoutCore]" prefixed errors for individual hook failures (feed, leaderboard, challenge, badge)
duration: 8m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Extract finishWorkoutCore and wire into endSession + checkSessionTimeouts

**Extracted workout completion hooks into `finishWorkoutCore` and wired into both `endSession` and `checkSessionTimeouts` so group session workouts flow through feed, leaderboard, challenge, and badge pipelines.**

## What Happened

1. Created `packages/backend/convex/lib/finishWorkoutCore.ts` with an exported `finishWorkoutCore(db, userId, workoutId)` function containing all 4 non-fatal hooks (feed item creation, leaderboard update, challenge progress, badge evaluation). The function is idempotent — already-completed workouts return existing values without re-running hooks.

2. Refactored `finishWorkout` in `workouts.ts` to delegate to `finishWorkoutCore` after auth/ownership/status checks. Removed direct imports of `updateLeaderboardEntries`, `updateChallengeProgress`, and `evaluateAndAwardBadges` — they now live only in `finishWorkoutCore.ts`. The mutation's return type and behavior are identical.

3. Wired `finishWorkoutCore` into `endSession`: after marking participants as "left", queries workouts by `by_sessionId`, skips already-completed workouts, calls `finishWorkoutCore` per in-progress workout with per-participant try/catch. Logs the count of finished workouts.

4. Wired `finishWorkoutCore` into `checkSessionTimeouts`: inside the `allStale` branch after patching session to completed, same pattern — query workouts by `by_sessionId`, skip completed, call `finishWorkoutCore` per participant with try/catch, log count.

## Verification

- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — **0 errors** ✅
- `grep -c 'finishWorkoutCore' packages/backend/convex/sessions.ts` — **3** (import + endSession + checkSessionTimeouts) ✅
- `grep -c 'finishWorkoutCore' packages/backend/convex/workouts.ts` — **3** (import + usage + function reference) ✅
- `head -5 packages/backend/convex/lib/finishWorkoutCore.ts` — **file exists with export** ✅
- `finishWorkoutCore` exported with correct signature `(db, userId, workoutId) → { completedAt, durationSeconds }` ✅
- Idempotent skip for already-completed workouts confirmed in both `endSession` and `checkSessionTimeouts` ✅
- Prior verification scripts (verify-s01-m05.ts, verify-s02-m05.ts) unaffected — they don't reference changed functions ✅

### Slice-level checks (partial — T01 is not final task):
- ✅ Backend tsc 0 errors
- ✅ `finishWorkoutCore` importable from `convex/lib/finishWorkoutCore.ts`
- ✅ `endSession` includes per-participant `finishWorkoutCore` calls with idempotent skip
- ✅ `checkSessionTimeouts` includes per-participant workout finishing on auto-complete
- ⬜ Web tsc — not yet relevant (no web changes in T01)
- ⬜ Native tsc — not yet relevant
- ⬜ verify-s03-m05.ts — created in T02
- ⬜ "Start Group Session" button — T03

## Diagnostics

- Filter Convex function logs for `[Session] endSession` to see workout completion counts per session end.
- Filter for `[Session] endSession: hook error for participant` to find per-participant hook failures with userId.
- Filter for `[Session] checkSessionTimeouts` to see auto-completed session workout finish counts.
- Filter for `[finishWorkoutCore]` to see individual hook errors (feed, leaderboard, challenge, badge) with workout IDs.
- Query `workouts` table for `status: "completed"` with `sessionId` set to verify integration worked at runtime.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/lib/finishWorkoutCore.ts` — **New**: exported `finishWorkoutCore` function with 4 non-fatal hooks (feed, leaderboard, challenge, badge), idempotent for already-completed workouts
- `packages/backend/convex/workouts.ts` — **Modified**: `finishWorkout` simplified to auth + ownership check + delegation to `finishWorkoutCore`; removed direct imports of 3 hook lib functions
- `packages/backend/convex/sessions.ts` — **Modified**: `endSession` and `checkSessionTimeouts` now import and call `finishWorkoutCore` per participant with try/catch and structured logging
