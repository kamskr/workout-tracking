# S01: Session Creation, Joining, Presence & Live Set Feed

**Goal:** Users can create a group workout session on web, join via invite link, see each other as active participants with presence indicators, and see each other's logged sets in realtime — with a working heartbeat-based presence system and cron cleanup.

**Demo:** User A creates a group session at `/workouts/session/[id]`, gets a shareable invite link. User B opens `/session/join/[inviteCode]`, joins the session, and both browsers show each other as "active" participants. User A logs a set — User B sees it appear in the shared set feed within 2 seconds. User A closes their tab — within ~40 seconds User B sees User A's presence change to "idle".

## Must-Haves

- `groupSessions` table with fields: `hostId`, `status` (waiting|active|completed|cancelled), `inviteCode`, `createdAt`, with indexes `by_hostId`, `by_inviteCode`, `by_status`
- `sessionParticipants` table with fields: `sessionId`, `userId`, `workoutId`, `lastHeartbeatAt`, `status` (active|idle|left), `joinedAt`, with indexes `by_sessionId`, `by_userId`, `by_sessionId_userId`
- `workouts` table extended with optional `sessionId: v.optional(v.id("groupSessions"))` and `by_sessionId` index
- `sessions.ts` mutations: `createSession`, `joinSession`, `leaveSession`, `sendHeartbeat`
- `sessions.ts` queries: `getSession`, `getSessionByInviteCode`, `getSessionParticipants`, `getSessionSets`
- `cleanupPresence` internal mutation registered in `crons.ts` (30-second interval)
- 6-char alphanumeric invite codes using unambiguous character set (D146)
- Participant hard cap at 10 (D147), late join allowed for active sessions (D148)
- Idempotent `joinSession` — dedup via `by_sessionId_userId` composite index
- Web page at `/workouts/session/[id]` showing live participant list and shared set feed
- Web page at `/session/join/[inviteCode]` handling join flow and redirect
- Middleware updated with `/session(.*)` protected route
- Heartbeat sending every 10 seconds from client, cron cleanup every 30 seconds (D139)
- Three-query architecture on session page: `getSession` (static), `getSessionParticipants` (presence), `getSessionSets` (set feed via `workouts.by_sessionId`, not through participants table). Fourth query `getSessionByInviteCode` used by join page only.
- Test helpers in `testing.ts` for session lifecycle (`testCreateSession`, `testJoinSession`, `testSendHeartbeat`, `testLeaveSession`, `testGetSession`, `testGetSessionParticipants`, `testGetSessionSets`)
- Verification script `verify-s01-m05.ts` with 12+ checks covering session creation, joining, presence, invite codes, set feed, and error cases
- Data attributes: `data-session-page`, `data-session-participants`, `data-session-sets`, `data-session-invite`, `data-presence-indicator`
- TypeScript compiles 0 new errors across all 3 packages

## Proof Level

- This slice proves: contract + integration (backend lifecycle + reactive web UI)
- Real runtime required: yes (Convex dev server for subscription reactivity and cron)
- Human/UAT required: yes (two browser windows proving realtime delivery within ~2 seconds)

## Verification

- `npx tsc --noEmit -p packages/backend/tsconfig.json` — 0 errors
- `npx tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors (pre-existing clsx TS2307 only)
- `npx tsc --noEmit -p apps/native/tsconfig.json` — 0 new errors (pre-existing 30 convex/react TS2307)
- `npx tsx packages/backend/scripts/verify-s01-m05.ts` — 12/12 checks pass (pending live Convex backend)
- Manual: two browser windows on same session URL prove realtime set feed and presence indicators

## Observability / Diagnostics

- Runtime signals: `[Session]` prefixed console.log in all session mutations and cron (matching `[Challenge]` pattern). Structured format: `[Session] functionName(sessionId): action result`.
- Inspection surfaces: `getSession` query returns full session state (status, inviteCode, hostId, participantCount). `getSessionParticipants` returns each participant's `lastHeartbeatAt` and `status`. Both queryable via Convex dashboard.
- Failure visibility: `cleanupPresence` cron logs count of participants transitioned to idle and sessions processed. `joinSession` throws descriptive errors: "Session not found", "Session is not joinable", "Already joined", "Session full (max 10)". `createSession` logs generated invite code.
- Redaction constraints: None — no PII beyond Clerk user IDs (already opaque strings).

## Integration Closure

- Upstream surfaces consumed: `getUserId` from `lib/auth.ts`, `logSet` from `sets.ts` (participants use normal set logging), `workouts.createWorkout` pattern (per-participant workout creation), Clerk middleware route protection, `testing.ts` test helper patterns, `crons.ts` cron registration pattern
- New wiring introduced in this slice:
  - `groupSessions` + `sessionParticipants` tables in schema
  - `sessionId` optional field + `by_sessionId` index on `workouts` table
  - `sessions.ts` module with 4 mutations + 4 queries + 1 internal mutation
  - `cleanupPresence` cron in `crons.ts`
  - `/workouts/session/[id]/page.tsx` — live session view
  - `/session/join/[inviteCode]/page.tsx` — join flow
  - `/session(.*)` in middleware protected routes
  - Session test helpers in `testing.ts`
- What remains before the milestone is truly usable end-to-end:
  - S02: Shared timer, session end/cancel mutations, combined summary, session timeout cron
  - S03: finishWorkout integration (session participant's workout → feed/leaderboard/challenge/badge hooks), comprehensive verification script
  - S04: Mobile screens (GroupSessionScreen, SessionLobbyScreen, JoinSessionScreen)

## Tasks

- [x] **T01: Schema, sessions.ts mutations/queries, cron, and test helpers** `est:2h`
  - Why: The entire S01 backend — schema changes, session lifecycle mutations, presence queries, heartbeat cron, and test helpers. This is the foundation everything else builds on. Combined into one task because the schema/mutations/queries/cron form a tightly coupled unit that can't be meaningfully verified independently.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/sessions.ts`, `packages/backend/convex/crons.ts`, `packages/backend/convex/testing.ts`
  - Do: Add `groupSessions` and `sessionParticipants` tables to schema with validators and indexes. Add `sessionId` optional field + `by_sessionId` index to `workouts` table. Create `sessions.ts` with `createSession` (generates 6-char invite code, creates session + host participant + host workout), `joinSession` (idempotent, cap 10, creates participant + workout with sessionId), `leaveSession` (marks participant as "left"), `sendHeartbeat` (patches lastHeartbeatAt), `getSession` (session doc + participant count), `getSessionByInviteCode` (lookup by invite code for join page), `getSessionParticipants` (participant list with presence from lastHeartbeatAt), `getSessionSets` (traverses workouts.by_sessionId → workoutExercises → sets, NOT through participants table), `cleanupPresence` internal mutation (marks participants idle if lastHeartbeatAt > 30s ago). Register cron in crons.ts. Add ~300 lines of test helpers to testing.ts following existing patterns.
  - Verify: `npx tsc --noEmit -p packages/backend/tsconfig.json` — 0 errors
  - Done when: All 4 mutations, 4 queries, 1 internal mutation, and 8+ test helpers compile with correct types. Schema has both new tables and workouts has sessionId field. Cron is registered.

- [x] **T02: Verification script for session backend** `est:1h`
  - Why: Proves the backend contract works end-to-end before building UI. The verification script exercises session creation, joining, presence, set feed, and error cases via test helpers — the objective stopping condition for backend correctness.
  - Files: `packages/backend/scripts/verify-s01-m05.ts`
  - Do: Create verification script following the `verify-s02-m04.ts` pattern (ConvexHttpClient, getConvexUrl, check() collector, summary printer). 12 checks: (1) createSession returns valid session with "waiting" status, (2) session has 6-char invite code, (3) host auto-joins as participant, (4) second user joins via inviteCode, (5) participant count is 2, (6) duplicate join is idempotent (no error, still 2 participants), (7) heartbeat updates lastHeartbeatAt, (8) set logged by user A appears in getSessionSets, (9) set logged by user B also appears, (10) leaveSession marks participant as "left", (11) presence cleanup marks stale participants as idle, (12) session with max 10 participants rejects 11th. Cleanup at end deletes test data.
  - Verify: `npx tsc --noEmit -p packages/backend/tsconfig.json` — 0 errors (script compiles). `npx tsx packages/backend/scripts/verify-s01-m05.ts` — 12/12 checks pass (requires live Convex).
  - Done when: Script compiles and defines all 12 checks with correct Convex API calls. Can run against live backend when available.

- [x] **T03: Web UI — session page, join page, middleware, and heartbeat** `est:2h`
  - Why: Delivers the user-facing web experience — the live session view and join flow that prove realtime presence and set feed delivery. Without this, the backend can't be visually verified.
  - Files: `apps/web/src/app/workouts/session/[id]/page.tsx`, `apps/web/src/app/session/join/[inviteCode]/page.tsx`, `apps/web/src/components/session/SessionParticipantList.tsx`, `apps/web/src/components/session/SessionSetFeed.tsx`, `apps/web/src/middleware.ts`
  - Do: (1) Add `/session(.*)` to middleware protected routes. (2) Create `/session/join/[inviteCode]/page.tsx` — fetches session by invite code, shows session info, join button, useRef guard against double-join (D022 pattern), redirects to `/workouts/session/[id]` after join. (3) Create `SessionParticipantList` component — uses `useQuery(api.sessions.getSessionParticipants)`, shows each participant with name/avatar + presence dot (green=active, yellow=idle, gray=left), data-session-participants and data-presence-indicator attributes. (4) Create `SessionSetFeed` component — uses `useQuery(api.sessions.getSessionSets)`, shows all participants' sets grouped by exercise with participant name badges, read-only display for others' sets, data-session-sets attribute. (5) Create `/workouts/session/[id]/page.tsx` — three queries (getSession, getSessionParticipants, getSessionSets) with "skip" pattern (D085), invite link copy button, participant list sidebar, set feed main area, heartbeat interval (useEffect + setInterval every 10s calling sendHeartbeat), data-session-page and data-session-invite attributes. Clean up heartbeat interval on unmount.
  - Verify: `npx tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors. Manual: navigate to session page in browser, see participant list and set feed render.
  - Done when: Both pages render with live Convex data. Middleware protects `/session(.*)`. Heartbeat interval fires every 10 seconds. All data-* attributes present. Invite link is copyable.

- [x] **T04: TypeScript compilation check and native compatibility** `est:30m`
  - Why: Final verification that all changes compile cleanly across all 3 packages. The new schema fields and API exports must not break existing mobile or web code. This is the last gate before the slice is complete.
  - Files: `packages/backend/convex/schema.ts` (read-only check), `apps/native/src/` (no changes expected — just compile check)
  - Do: Run TypeScript compilation across all 3 packages. Fix any type errors introduced by schema changes (the optional `sessionId` field on workouts should be backward-compatible but verify). Ensure `sessions.ts` exports are visible in `api` generated types. Verify no regression in existing 72/72 M001+M002 backend checks (structural — the checks themselves don't need re-running, just that their test helpers still compile).
  - Verify: `npx tsc --noEmit -p packages/backend/tsconfig.json` — 0 errors. `npx tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors. `npx tsc --noEmit -p apps/native/tsconfig.json` — 0 new errors.
  - Done when: All 3 packages compile. No new TypeScript errors introduced. The S01 boundary contract (schema + API surface) is stable for S02 consumption.

## Files Likely Touched

- `packages/backend/convex/schema.ts` — add groupSessions, sessionParticipants tables + sessionId on workouts
- `packages/backend/convex/sessions.ts` — new module: 4 mutations + 3 queries + 1 internal mutation
- `packages/backend/convex/crons.ts` — add presence cleanup cron (30s interval)
- `packages/backend/convex/testing.ts` — add ~8 session test helpers
- `packages/backend/scripts/verify-s01-m05.ts` — new verification script (12 checks)
- `apps/web/src/middleware.ts` — add `/session(.*)` to protected routes
- `apps/web/src/app/workouts/session/[id]/page.tsx` — live session page
- `apps/web/src/app/session/join/[inviteCode]/page.tsx` — join flow page
- `apps/web/src/components/session/SessionParticipantList.tsx` — participant list with presence dots
- `apps/web/src/components/session/SessionSetFeed.tsx` — shared set feed display
