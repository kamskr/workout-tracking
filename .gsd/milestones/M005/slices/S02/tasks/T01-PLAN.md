---
estimated_steps: 5
estimated_files: 4
---

# T01: Extend schema, add 5 backend functions + timeout cron, and 6 test helpers

**Slice:** S02 — Shared Timer, Session Lifecycle & Combined Summary
**Milestone:** M005

## Description

Add all S02 backend infrastructure: 3 optional fields on `groupSessions` table, 5 new exported functions in `sessions.ts` (3 timer mutations + `endSession` mutation + `getSessionSummary` query), 1 new `checkSessionTimeouts` internalMutation, 3rd cron entry in `crons.ts`, and 6 corresponding test helpers in `testing.ts`. This is the foundation that all other S02 tasks depend on.

## Steps

1. **Extend `groupSessions` schema** in `schema.ts`: Add `sharedTimerEndAt: v.optional(v.number())`, `sharedTimerDurationSeconds: v.optional(v.number())`, and `completedAt: v.optional(v.number())` to the `groupSessions` table definition. All `v.optional()` — no migration needed for existing data.

2. **Add 5 new functions + 1 internalMutation to `sessions.ts`**:
   - `startSharedTimer(sessionId, durationSeconds)` — Auth-gated mutation. Validates participant membership. Sets `sharedTimerEndAt = Date.now() + durationSeconds * 1000` and `sharedTimerDurationSeconds = durationSeconds` on the session doc. Any participant can call (D140). Log with `[Session]` prefix.
   - `pauseSharedTimer(sessionId)` — Auth-gated mutation. Validates participant membership. Patches `sharedTimerEndAt` to `undefined` (clears timer). Keeps `sharedTimerDurationSeconds` for UI default. Log action.
   - `skipSharedTimer(sessionId)` — Auth-gated mutation. Same as pause (clears `sharedTimerEndAt` to `undefined`). Semantically "skip rest" — user doesn't want to wait. Log action.
   - `endSession(sessionId)` — Auth-gated mutation. Host-only check (`session.hostId === userId`). Status guard: reject if already "completed" (idempotent early return, not error). Accept "waiting" and "active" statuses. Patches `status: "completed"`, `completedAt: Date.now()`, clears `sharedTimerEndAt: undefined`. Also patches all non-"left" participants to `status: "left"`. Follow `completeChallenge` pattern (D111). Log with `[Session]` prefix.
   - `getSessionSummary(sessionId)` — Auth-gated query. Aggregates per-participant stats: traverse workouts (by_sessionId) → workoutExercises (by_workoutId) → sets (by_workoutExerciseId). For each participant: `{ userId, displayName, exerciseCount, setCount, totalVolume (sum of weight*reps for non-warmup sets), durationSeconds (workout.completedAt or Date.now() - workout.startedAt) }`. Return session metadata + array of participant summaries.
   - `checkSessionTimeouts()` — Internal mutation (no auth). Sweeps "waiting" and "active" sessions (same pattern as `cleanupPresence`). For each session: get all participants, check if ALL have `lastHeartbeatAt < now - 15*60*1000` AND `session.createdAt < now - 15*60*1000`. If so, auto-complete: patch session `status: "completed"`, `completedAt: now`. Wrap per-session processing in try/catch for resilience. Log sessions scanned and auto-completed count.

3. **Register `checkSessionTimeouts` in `crons.ts`**: Add `crons.interval("check session timeouts", { minutes: 5 }, internal.sessions.checkSessionTimeouts)` as 3rd cron entry.

4. **Add 6 test helpers to `testing.ts`**: `testStartSharedTimer(testUserId, sessionId, durationSeconds)`, `testPauseSharedTimer(testUserId, sessionId)`, `testSkipSharedTimer(testUserId, sessionId)`, `testEndSession(testUserId, sessionId)`, `testGetSessionSummary(sessionId)` (query, no userId needed), `testCheckSessionTimeouts()` (mutation, no userId needed). Each mirrors the auth-gated counterpart but accepts `testUserId` directly. Follow exact same `mutation({ args: { ... }, handler: async (ctx, args) => { ... } })` pattern as existing 10 session test helpers.

5. **Verify compilation**: Run `tsc --noEmit -p packages/backend/convex/tsconfig.json` — must be 0 errors. Spot-check: `sessions.ts` should export 15 functions, `crons.ts` should have 3 entries, `testing.ts` should have 16 session helpers.

## Must-Haves

- [ ] `groupSessions` has `sharedTimerEndAt`, `sharedTimerDurationSeconds`, `completedAt` as `v.optional(v.number())`
- [ ] `startSharedTimer` sets `sharedTimerEndAt = Date.now() + durationSeconds * 1000` — any participant can call
- [ ] `pauseSharedTimer` and `skipSharedTimer` clear `sharedTimerEndAt` to `undefined`
- [ ] `endSession` is host-only with idempotent status guard (return early if already completed, not throw)
- [ ] `endSession` patches all non-"left" participants to `status: "left"`
- [ ] `getSessionSummary` returns per-participant stats with exerciseCount, setCount, totalVolume
- [ ] `checkSessionTimeouts` auto-completes only sessions where ALL participants are stale for 15+ minutes AND session created 15+ minutes ago
- [ ] `checkSessionTimeouts` has per-session try/catch for resilience
- [ ] 3rd cron entry at 5-minute interval for `checkSessionTimeouts`
- [ ] 6 test helpers follow existing pattern with `testUserId` arg

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `grep -c "export const" packages/backend/convex/sessions.ts` — should show 15 (9 S01 + 6 S02)
- `grep -c "crons.interval" packages/backend/convex/crons.ts` — should show 3
- `grep -c "testStartSharedTimer\|testPauseSharedTimer\|testSkipSharedTimer\|testEndSession\|testGetSessionSummary\|testCheckSessionTimeouts" packages/backend/convex/testing.ts` — should show 6

## Observability Impact

- Signals added/changed: 6 new `[Session]` prefixed log entries — `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer`, `endSession` (success + idempotent skip), `checkSessionTimeouts` (scanned N sessions, auto-completed N)
- How a future agent inspects this: `getSession` query now returns `sharedTimerEndAt`, `sharedTimerDurationSeconds`, `completedAt` automatically (spreads session doc). `getSessionSummary` returns per-participant aggregated stats.
- Failure state exposed: `endSession` logs "not host" rejection, "already completed, skipping" for idempotent calls. `checkSessionTimeouts` per-session try/catch logs error but continues processing remaining sessions.

## Inputs

- `packages/backend/convex/schema.ts` — Current `groupSessions` table definition (needs 3 new fields)
- `packages/backend/convex/sessions.ts` — 9 existing functions from S01 (4 mutations + 4 queries + 1 internalMutation)
- `packages/backend/convex/crons.ts` — 2 existing cron entries (challenge deadlines + session presence)
- `packages/backend/convex/testing.ts` — 10 existing session test helpers (line ~2861+)
- `packages/backend/convex/challenges.ts` — `completeChallenge` (lines 29-66) and `checkDeadlines` (lines 104-150) as structural templates

## Expected Output

- `packages/backend/convex/schema.ts` — `groupSessions` extended with 3 optional fields
- `packages/backend/convex/sessions.ts` — 15 exported functions (9 S01 + `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer`, `endSession`, `getSessionSummary`, `checkSessionTimeouts`)
- `packages/backend/convex/crons.ts` — 3 cron entries
- `packages/backend/convex/testing.ts` — 16 session test helpers (10 S01 + 6 S02)
