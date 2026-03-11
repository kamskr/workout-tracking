---
estimated_steps: 5
estimated_files: 4
---

# T01: Schema, sessions.ts mutations/queries, cron, and test helpers

**Slice:** S01 — Session Creation, Joining, Presence & Live Set Feed
**Milestone:** M005

## Description

Build the complete S01 backend: two new schema tables (`groupSessions`, `sessionParticipants`), an optional `sessionId` field on `workouts`, the `sessions.ts` module with all mutations/queries/internal functions, the presence cleanup cron, and test helpers in `testing.ts`. This is the foundation for the entire group session feature — every other task depends on it.

## Steps

1. **Update `schema.ts`** — Add `sessionStatus` and `participantStatus` validators. Add `groupSessions` table (hostId, status, inviteCode, createdAt, indexes: by_hostId, by_inviteCode, by_status). Add `sessionParticipants` table (sessionId, userId, workoutId, lastHeartbeatAt, status, joinedAt, indexes: by_sessionId, by_userId, by_sessionId_userId). Add `sessionId: v.optional(v.id("groupSessions"))` + `by_sessionId` index to `workouts` table. Export new validators.

2. **Create `sessions.ts`** — New module with:
   - `createSession` mutation: auth-gated, generates 6-char invite code from unambiguous charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` with collision retry via `by_inviteCode` index, creates groupSessions row (status: "waiting"), creates participant entry for host, creates workout with sessionId for host. Returns `{ sessionId, inviteCode }`.
   - `joinSession` mutation: auth-gated, looks up session by invite code or session ID, validates session is "waiting" or "active" (D148), checks dedup via `by_sessionId_userId`, checks cap of 10 (D147), creates participant entry, creates workout with sessionId. Idempotent — returns existing participant data if already joined. Transitions session from "waiting" to "active" on first non-host join.
   - `leaveSession` mutation: auth-gated, host cannot leave (must end session in S02). Marks participant status as "left".
   - `sendHeartbeat` mutation: auth-gated, patches `lastHeartbeatAt = Date.now()` on participant doc. Minimal work — just a db.patch.
   - `getSession` query: auth-gated, returns session doc enriched with participant count and host profile info.
   - `getSessionByInviteCode` query: auth-gated, looks up session by inviteCode via `by_inviteCode` index, returns session doc enriched with participant count and host profile info. Used by join page to display session info before joining.
   - `getSessionParticipants` query: auth-gated, returns participant list with profile enrichment (displayName, username, avatarUrl) and derived presence status from `lastHeartbeatAt` (active if within 30s, else use stored status).
   - `getSessionSets` query: auth-gated, traverses `workouts (by_sessionId) → workoutExercises (by_workoutId) → sets (by_workoutExerciseId)`. Does NOT read from `sessionParticipants` table. Returns grouped by participant, then by exercise, with exercise name and participant name.
   - `cleanupPresence` internalMutation: queries "waiting" and "active" sessions, then their "active" participants, marks those with `lastHeartbeatAt > 30s ago` as "idle". Logs count. Bounded with `.take(1000)` safety.

3. **Update `crons.ts`** — Add `crons.interval("cleanup session presence", { seconds: 30 }, internal.sessions.cleanupPresence)` alongside the existing challenge deadline cron.

4. **Add test helpers to `testing.ts`** — Add ~8 helpers following the existing `testCreate*`/`testJoin*`/`testGet*` pattern:
   - `testCreateSession(testUserId)` — mirrors createSession, returns `{ sessionId, inviteCode }`
   - `testJoinSession(testUserId, inviteCode)` — mirrors joinSession by invite code
   - `testJoinSessionById(testUserId, sessionId)` — joins by session ID directly
   - `testSendHeartbeat(testUserId, sessionId)` — mirrors sendHeartbeat
   - `testGetSession(sessionId)` — mirrors getSession without auth
   - `testGetSessionParticipants(sessionId)` — mirrors getSessionParticipants without auth
   - `testGetSessionSets(sessionId)` — mirrors getSessionSets without auth
   - `testLeaveSession(testUserId, sessionId)` — mirrors leaveSession
   - `testCleanupPresence()` — mirrors cleanupPresence for verification script control
   Import `sessionStatus`, `participantStatus` from schema.

5. **Verify compilation** — Run `npx tsc --noEmit -p packages/backend/tsconfig.json` and confirm 0 errors.

## Must-Haves

- [ ] `groupSessions` table in schema with all fields and 3 indexes
- [ ] `sessionParticipants` table in schema with all fields and 3 indexes
- [ ] `workouts` table has `sessionId` optional field and `by_sessionId` index
- [ ] `createSession` generates unambiguous 6-char invite codes with collision retry
- [ ] `joinSession` is idempotent (dedup check), enforces cap of 10, allows late join for "active" sessions
- [ ] `joinSession` transitions session "waiting" → "active" on first non-host join
- [ ] `getSessionSets` does NOT read from `sessionParticipants` — traverses workouts.by_sessionId → workoutExercises → sets
- [ ] `cleanupPresence` marks participants idle after 30s without heartbeat
- [ ] Cron registered at 30-second interval in `crons.ts`
- [ ] All 8+ test helpers compile and mirror their auth-gated counterparts
- [ ] All session mutations use `[Session]` structured logging prefix
- [ ] `npx tsc --noEmit -p packages/backend/tsconfig.json` — 0 errors

## Verification

- `npx tsc --noEmit -p packages/backend/tsconfig.json` compiles with 0 errors
- `sessions.ts` exports are visible in `api` generated types (sessions module registered)
- `getSessionByInviteCode` query compiles with inviteCode string arg
- `crons.ts` has two `crons.interval` entries (challenges + presence)
- `testing.ts` has `testCreateSession`, `testJoinSession`, `testSendHeartbeat`, `testGetSessionParticipants`, `testGetSessionSets` exports

## Observability Impact

- Signals added/changed: `[Session]` prefixed console.log in createSession (logs invite code), joinSession (logs participant join + session status transition), leaveSession, sendHeartbeat (silent on success, logs on error), cleanupPresence (logs count of idle transitions and sessions scanned)
- How a future agent inspects this: `getSession` query returns full session state. `getSessionParticipants` returns per-participant `lastHeartbeatAt` and `status`. Convex dashboard function logs show `[Session]` entries.
- Failure state exposed: Mutation errors include descriptive messages: "Session not found", "Session is not joinable (status: completed)", "Already joined this session", "Session full (max 10 participants)", "Not a participant", "Host cannot leave session"

## Inputs

- `packages/backend/convex/schema.ts` — existing 21-table schema to extend
- `packages/backend/convex/challenges.ts` — structural template for lifecycle mutations with idempotent guards
- `packages/backend/convex/crons.ts` — existing cron registration to add to
- `packages/backend/convex/testing.ts` — existing 2833-line test helper file to extend
- `packages/backend/convex/workouts.ts` — `getWorkoutWithDetails` shows multi-table join pattern for `getSessionSets`
- `packages/backend/convex/lib/auth.ts` — `getUserId(ctx)` pattern for all auth-gated functions

## Expected Output

- `packages/backend/convex/schema.ts` — 2 new tables + 1 modified table + 2 new exported validators
- `packages/backend/convex/sessions.ts` — new file, ~350-400 lines, 4 mutations + 4 queries + 1 internalMutation
- `packages/backend/convex/crons.ts` — updated with 2nd cron interval (presence cleanup)
- `packages/backend/convex/testing.ts` — extended with ~300 lines of session test helpers (8+ functions)
