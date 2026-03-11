---
estimated_steps: 3
estimated_files: 1
---

# T02: Verification script for session backend

**Slice:** S01 — Session Creation, Joining, Presence & Live Set Feed
**Milestone:** M005

## Description

Create the verification script `verify-s01-m05.ts` that exercises the complete session backend via test helpers. This proves the backend contract: session creation, invite codes, joining, heartbeat, presence cleanup, set feed aggregation, and error cases. The script follows the established `verify-s02-m04.ts` pattern exactly (ConvexHttpClient, getConvexUrl, check() collector, summary printer, cleanup).

## Steps

1. **Create `verify-s01-m05.ts` scaffold** — Copy the pattern from `verify-s02-m04.ts`: shebang line, imports (ConvexHttpClient, api), getConvexUrl() helper reading from env or `.env.local`, CheckResult interface, results array, check() function, 3 test user constants (`test-session-host`, `test-session-user-b`, `test-session-user-c`). Structure: setup → checks → cleanup → summary.

2. **Implement 12 checks** — Using the test helpers from T01:
   - **SS-01**: `testCreateSession` returns sessionId and inviteCode. Check inviteCode is a string of length 6.
   - **SS-02**: `testGetSession` for the created session returns status "waiting" and hostId matches test user.
   - **SS-03**: `testGetSessionParticipants` for new session returns exactly 1 participant (the host) with status "active".
   - **SS-04**: `testJoinSession` with user B via invite code succeeds. `testGetSessionParticipants` returns 2 participants.
   - **SS-05**: Session status transitions from "waiting" to "active" after first non-host join (verify via `testGetSession`).
   - **SS-06**: `testJoinSession` with user B again (duplicate) does not throw and participant count remains 2 (idempotent).
   - **SS-07**: `testSendHeartbeat` from user A succeeds. `testGetSessionParticipants` shows updated `lastHeartbeatAt` for user A.
   - **SS-08**: Log a set for user A's workout (via `testAddExercise` + `testLogSet`). `testGetSessionSets` returns the set data.
   - **SS-09**: Log a set for user B's workout. `testGetSessionSets` returns sets from both participants.
   - **SS-10**: `testLeaveSession` for user B marks participant status as "left". Participant count still includes them but status is "left".
   - **SS-11**: Call `testCleanupPresence` after making a participant's heartbeat stale (don't call sendHeartbeat for user A, wait or manipulate). Since we can't wait 30s in a test, set a participant's `lastHeartbeatAt` to a past value first via a targeted test helper, then call cleanup. Verify participant status becomes "idle".
   - **SS-12**: Create a session, join 10 participants (users test-session-cap-1 through test-session-cap-10). Attempt 11th join → expect error "Session full".
   
3. **Add cleanup and summary** — Delete all test sessions, participants, workouts, workoutExercises, and sets created during the test. Print summary with pass/fail counts. Exit code 1 on failures.

## Must-Haves

- [ ] Script follows exact `verify-s02-m04.ts` pattern (ConvexHttpClient, check(), getConvexUrl, summary)
- [ ] 12 checks covering: creation, invite code format, host auto-join, user join, status transition, idempotent join, heartbeat, set feed (2 users), leave, presence cleanup, participant cap
- [ ] Each check has a descriptive name and requirement tag (SS-01 through SS-12)
- [ ] Cleanup section removes all test data
- [ ] Script compiles: `npx tsc --noEmit -p packages/backend/tsconfig.json`

## Verification

- `npx tsc --noEmit -p packages/backend/tsconfig.json` — script compiles with 0 errors
- Script structure matches established verification pattern (12 checks, cleanup, summary)
- `npx tsx packages/backend/scripts/verify-s01-m05.ts` — 12/12 pass (requires live Convex backend)

## Observability Impact

- Signals added/changed: None — this is a test script, not runtime code
- How a future agent inspects this: Run script, read pass/fail output. Each check prints `✅ PASS` or `❌ FAIL` with detail. Summary shows total counts.
- Failure state exposed: Failed checks print the specific assertion that failed. Script exit code 1 on any failure, 2 on script-level error.

## Inputs

- `packages/backend/convex/testing.ts` — T01's session test helpers (`testCreateSession`, `testJoinSession`, `testSendHeartbeat`, `testGetSession`, `testGetSessionParticipants`, `testGetSessionSets`, `testLeaveSession`, `testCleanupPresence`)
- `packages/backend/scripts/verify-s02-m04.ts` — structural template for the verification script
- `packages/backend/convex/_generated/api.js` — Convex API exports for type-safe client calls

## Expected Output

- `packages/backend/scripts/verify-s01-m05.ts` — new file, ~400-500 lines, 12 checks with cleanup
