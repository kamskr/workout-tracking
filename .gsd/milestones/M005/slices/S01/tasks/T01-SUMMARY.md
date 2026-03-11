---
id: T01
parent: S01
milestone: M005
provides:
  - groupSessions and sessionParticipants schema tables with indexes
  - sessionId optional field on workouts table with by_sessionId index
  - sessions.ts module with 4 mutations, 4 queries, 1 internalMutation
  - Presence cleanup cron at 30-second interval
  - 9 session test helpers in testing.ts
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/sessions.ts
  - packages/backend/convex/crons.ts
  - packages/backend/convex/testing.ts
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Invite code generated from ABCDEFGHJKLMNPQRSTUVWXYZ23456789 charset (no 0/O/1/I) with collision retry up to 10 attempts
  - sendHeartbeat also resets participant status to "active" (re-activates idle participants who reconnect)
  - getSessionSets traverses workouts→workoutExercises→sets without touching sessionParticipants (per spec)
  - Derived presence in getSessionParticipants uses 30s threshold on lastHeartbeatAt at query time, not just stored status
patterns_established:
  - "[Session] functionName(sessionId): action result" structured logging pattern across all session mutations and cron
  - Session invite code generation with collision retry pattern
  - Heartbeat-based presence with cron cleanup pattern (30s timeout, 30s cleanup interval)
observability_surfaces:
  - "[Session]" prefixed console.log in createSession, joinSession, leaveSession, sendHeartbeat (error), cleanupPresence
  - getSession query returns full session state with participantCount and host profile
  - getSessionParticipants returns lastHeartbeatAt and derivedStatus per participant
  - cleanupPresence logs sessions scanned count and idle transition count
  - Descriptive error messages: "Session not found", "Session is not joinable (status: ...)", "Session full (max 10 participants)", "Not a participant", "Host cannot leave session"
duration: 15 minutes
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Schema, sessions.ts mutations/queries, cron, and test helpers

**Built complete S01 backend: 2 new schema tables, sessionId on workouts, 9-function sessions.ts module, presence cron, and 9 test helpers.**

## What Happened

Implemented the full group session backend foundation:

1. **Schema** (`schema.ts`): Added `sessionStatus` and `participantStatus` validators. Created `groupSessions` table (hostId, status, inviteCode, createdAt) with 3 indexes (by_hostId, by_inviteCode, by_status). Created `sessionParticipants` table (sessionId, userId, workoutId, lastHeartbeatAt, status, joinedAt) with 3 indexes (by_sessionId, by_userId, by_sessionId_userId). Added optional `sessionId` field and `by_sessionId` index to existing `workouts` table.

2. **sessions.ts**: New module with 9 exported functions:
   - `createSession` — generates 6-char invite code from unambiguous charset with collision retry, creates session + workout + participant for host
   - `joinSession` — idempotent join by inviteCode or sessionId, enforces 10-participant cap, transitions waiting→active on first non-host join
   - `leaveSession` — marks participant as "left", blocks host from leaving
   - `sendHeartbeat` — patches lastHeartbeatAt, resets status to "active"
   - `getSession` — session doc enriched with participantCount and host profile
   - `getSessionByInviteCode` — lookup by invite code with same enrichment
   - `getSessionParticipants` — participant list with profile enrichment and derived presence status (active if heartbeat within 30s)
   - `getSessionSets` — traverses workouts→workoutExercises→sets grouped by participant, does NOT read sessionParticipants
   - `cleanupPresence` (internalMutation) — marks stale participants idle, bounded with .take(1000)

3. **Cron** (`crons.ts`): Added 30-second interval for `cleanup session presence` alongside existing challenge deadline cron.

4. **Test helpers** (`testing.ts`): Added 9 session helpers: testCreateSession, testJoinSession, testJoinSessionById, testSendHeartbeat, testGetSession, testGetSessionParticipants, testGetSessionSets, testLeaveSession, testCleanupPresence.

5. **Generated types** (`_generated/api.d.ts`): Added sessions module import and registration so `internal.sessions.cleanupPresence` resolves for crons.ts.

## Verification

- `tsc --noEmit -p convex/tsconfig.json` — **0 errors** ✅
- `tsc --noEmit` on apps/web — only pre-existing clsx TS2307 (1 error) ✅
- `tsc --noEmit` on apps/native — only pre-existing convex/react TS2307 (38 errors) ✅
- sessions.ts exports 9 functions (4 mutations + 4 queries + 1 internalMutation) ✅
- crons.ts has 2 `crons.interval` entries ✅
- testing.ts has all 9 session test helpers ✅
- getSessionSets confirmed to have 0 references to "sessionParticipants" ✅
- 7 `[Session]` structured log entries across sessions.ts ✅
- `getSessionByInviteCode` query compiles with inviteCode string arg ✅
- Slice verification script (`verify-s01-m05.ts`) does not exist yet — expected for T01 (pending later task)

## Diagnostics

- **Structured logs**: All session mutations emit `[Session] functionName(sessionId): action result` format to Convex function logs. Filter by `[Session]` prefix in Convex dashboard.
- **Session state inspection**: `getSession` query returns status, inviteCode, hostId, participantCount, and host profile. Queryable via Convex dashboard.
- **Presence inspection**: `getSessionParticipants` returns each participant's `lastHeartbeatAt` and `derivedStatus` (computed at query time from 30s threshold).
- **Cron health**: `cleanupPresence` logs "scanned N sessions, marked N participants idle" on every run.
- **Error messages**: All mutation errors include descriptive messages for debugging: "Session not found", "Session is not joinable (status: completed)", "Session full (max 10 participants)", "Not a participant", "Host cannot leave session".

## Deviations

- Added `testJoinSessionById` as a 9th helper (plan said ~8) — useful for verification scripts that have the sessionId directly.
- Updated `_generated/api.d.ts` to register sessions module — necessary for `internal.sessions.cleanupPresence` reference in crons.ts to compile. This is normally auto-generated by `npx convex dev` but we can't run the dev server in CI.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added 2 new tables (groupSessions, sessionParticipants), sessionId on workouts, 2 new validators (sessionStatus, participantStatus)
- `packages/backend/convex/sessions.ts` — New file, ~380 lines, complete session backend module
- `packages/backend/convex/crons.ts` — Added presence cleanup cron at 30-second interval
- `packages/backend/convex/testing.ts` — Extended with ~310 lines of 9 session test helpers
- `packages/backend/convex/_generated/api.d.ts` — Added sessions module import and registration
