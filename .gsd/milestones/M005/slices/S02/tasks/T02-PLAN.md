---
estimated_steps: 3
estimated_files: 1
---

# T02: Verification script for S02 backend

**Slice:** S02 — Shared Timer, Session Lifecycle & Combined Summary
**Milestone:** M005

## Description

Create `verify-s02-m05.ts` with 10 checks (SS-13 through SS-22) that exercise the S02 backend functions via test helpers and ConvexHttpClient. Covers shared timer start/pause/skip/non-host access, endSession lifecycle, idempotent end, combined summary aggregation, and session timeout behavior. Follows exact same runner pattern as `verify-s01-m05.ts`.

## Steps

1. **Create `verify-s02-m05.ts`** with the standard boilerplate: ConvexHttpClient setup from `CONVEX_URL` (env or `.env.local` file), `check()` function, `CheckResult` interface, `try/finally` cleanup pattern. Use two test users (`test-host-s02` and `test-joiner-s02`).

2. **Implement 10 checks** in the main test flow:
   - **Setup:** Create session (testCreateSession), join with second user (testJoinSession), add exercise and log sets for both users (testAddExerciseToWorkout + testLogSet), so summary data exists.
   - **SS-13: startSharedTimer sets sharedTimerEndAt in future** — Call `testStartSharedTimer(host, sessionId, 90)`, then `testGetSession(sessionId)` — assert `sharedTimerEndAt` exists, is a number, and is greater than `Date.now()`. Assert `sharedTimerDurationSeconds === 90`.
   - **SS-14: pauseSharedTimer clears sharedTimerEndAt** — Call `testPauseSharedTimer(host, sessionId)`, then `testGetSession` — assert `sharedTimerEndAt` is undefined/null.
   - **SS-15: skipSharedTimer clears sharedTimerEndAt** — Start timer again, then `testSkipSharedTimer(host, sessionId)`, `testGetSession` — assert `sharedTimerEndAt` is undefined/null.
   - **SS-16: Non-host can start timer (D140)** — Call `testStartSharedTimer(joiner, sessionId, 60)`, `testGetSession` — assert `sharedTimerEndAt` exists and `sharedTimerDurationSeconds === 60`.
   - **SS-17: endSession by host completes session** — Call `testEndSession(host, sessionId)`, `testGetSession` — assert `session.status === "completed"` and `session.completedAt` is a number.
   - **SS-18: endSession by non-host rejected** — Create a new session for this test. Join second user. Call `testEndSession(joiner, newSessionId)` — assert it throws an error containing "host".
   - **SS-19: endSession idempotent** — Call `testEndSession(host, sessionId)` again on already-completed session — assert it does NOT throw (idempotent early return).
   - **SS-20: getSessionSummary returns per-participant stats** — Call `testGetSessionSummary(sessionId)` — assert result has `participants` array with 2 entries, each has `exerciseCount >= 1`, `setCount >= 1`, `totalVolume >= 0`, and `displayName` is a string.
   - **SS-21: checkSessionTimeouts auto-completes stale session** — Create a new session, set all participants' heartbeats to 20 minutes ago via `testSetParticipantHeartbeat(userId, sessionId, Date.now() - 20*60*1000)`. Also need to set session createdAt to 20 min ago (use a new helper or patch). Call `testCheckSessionTimeouts()`. `testGetSession` — assert status is "completed".
   - **SS-22: checkSessionTimeouts skips session with recent heartbeat** — Create another session, leave one participant with fresh heartbeat. Call `testCheckSessionTimeouts()`. `testGetSession` — assert status is still "active" (not auto-completed).

3. **Add cleanup in finally block**: Call `testCleanup` for both test user IDs. Print summary table with check IDs, names, pass/fail, and exit with code 1 if any failures.

## Must-Haves

- [ ] 10 checks defined (SS-13 through SS-22)
- [ ] Checks cover: timer start/pause/skip, non-host timer access, endSession success/rejection/idempotency, summary aggregation, timeout auto-complete/skip
- [ ] Cleanup in `finally` block deletes all test data
- [ ] Script compiles with `tsc --noEmit -p packages/backend/convex/tsconfig.json`
- [ ] Uses `testGetSession` (not auth-gated `getSession`) for state assertions
- [ ] SS-21 exercises the timeout path by setting heartbeats to stale timestamps

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors (script included in compilation)
- `grep -c "SS-" packages/backend/scripts/verify-s02-m05.ts` — at least 10 check definitions
- Script structure: has `getConvexUrl()`, `check()` function, `try/finally`, cleanup calls

## Observability Impact

- Signals added/changed: None (verification script, not runtime code)
- How a future agent inspects this: Run `npx tsx packages/backend/scripts/verify-s02-m05.ts` to validate all S02 backend behavior. Each check has an ID (SS-13 through SS-22) and descriptive name for targeted debugging.
- Failure state exposed: Each check reports `passed: boolean` with `detail` string explaining what was expected vs. actual.

## Inputs

- `packages/backend/convex/sessions.ts` — T01's 6 new functions (timer mutations, endSession, getSessionSummary, checkSessionTimeouts)
- `packages/backend/convex/testing.ts` — T01's 6 new test helpers + 10 S01 helpers
- `packages/backend/scripts/verify-s01-m05.ts` — Template for script structure (ConvexHttpClient + check pattern + cleanup)

## Expected Output

- `packages/backend/scripts/verify-s02-m05.ts` — New verification script with 10 checks (SS-13 through SS-22), compilable, exercising all S02 backend functions
