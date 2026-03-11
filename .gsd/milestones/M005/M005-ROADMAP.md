# M005: Collaborative Live Workouts

**Vision:** Users can start a group workout session, invite friends via a link, see each other's sets in realtime, share a synchronized rest timer, track who's active via presence indicators, and view a combined session summary when the workout ends — turning a solo tracker into a live training partner experience.

## Success Criteria

- User A creates a group workout session and receives a shareable invite link
- User B opens the invite link, joins the session, and both see each other listed as active participants
- User A logs a set — User B sees it appear within 2 seconds via Convex reactive subscription
- Any participant starts the shared rest timer — all participants see it counting down in sync (within ~1 second drift)
- A participant closes the app — other participants see their presence change to "idle" within ~20 seconds (heartbeat interval + cron cleanup)
- The host ends the session — all participants see a combined summary showing every participant's workout stats
- Each participant's sets are stored as normal individual workout records (flowing into analytics, PRs, leaderboards, and badges)
- The entire flow works on web; mobile screens consume the same backend APIs

## Key Risks / Unknowns

- **Presence heartbeat write load** — Periodic mutations from every participant create write amplification. If Convex reactive subscriptions refire on every heartbeat, the UX may flicker or lag. This is the novel pattern with no prior art in the codebase.
- **Shared timer synchronization** — Server-authoritative timer must stay in sync across clients with different clock skews. The existing `RestTimerContext` is client-only (D008) — extending it to server-authoritative is a deliberate departure.
- **Session state machine concurrency** — Multiple participants mutating session state simultaneously (logging sets, sending heartbeats, joining/leaving) must not cause race conditions or data corruption. The challenge lifecycle (D111) is the closest template but had only single-user mutations per action.

## Proof Strategy

- **Presence heartbeat write load** → retire in S01 by building real session creation + join + heartbeat + presence cron, with a web UI showing live presence indicators for 2+ test users. If subscriptions churn unacceptably on heartbeat writes, the data model will be revised before building the full feature.
- **Shared timer synchronization** → retire in S02 by building the server-authoritative timer with a web UI showing synchronized countdown. Two browser windows pointed at the same session prove sync within ~1 second drift.
- **Session state machine concurrency** → retire in S01/S02 by building idempotent mutations with status guards (same pattern as `completeChallenge`). Verification scripts simulate concurrent multi-user actions.

## Verification Classes

- Contract verification: Backend verification scripts extending `testing.ts` with multi-user session test helpers (`testCreateSession`, `testJoinSession`, `testSendHeartbeat`, `testLogSetInSession`). TypeScript compilation across all 3 packages (0 new errors).
- Integration verification: Two browser windows (or verification script simulating 2+ users) proving realtime data delivery — set logged by user A visible to user B's session query within 2 seconds. Shared timer countdown visible to both.
- Operational verification: Presence cron running alongside existing challenge deadline cron. Abandoned session auto-completion after timeout. Session with 5+ simulated participants remains responsive.
- UAT / human verification: Multi-device manual testing (two browsers/phones on the same session). Timer sync visual confirmation. Presence indicator responsiveness.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices are complete with verification scripts compiling and passing structural checks
- `groupSessions` and `sessionParticipants` tables exist in schema with correct indexes
- `sessions.ts` Convex module provides full session lifecycle (create, join, leave, end, heartbeat, timer, summary)
- Presence cron runs in `crons.ts` alongside existing challenge deadline cron
- Web UI at `/workouts/session/[id]` shows live participant list, shared set feed, synchronized timer, and presence indicators
- Session join link at `/session/join/[id]` works for authenticated users (Clerk-protected)
- Each participant's sets are stored as individual workout records with `sessionId` foreign key — flowing into existing `finishWorkout` hooks (feed, leaderboard, challenge, badge)
- Mobile screens (GroupSessionScreen, SessionLobbyScreen, JoinSessionScreen) consume the same Convex APIs
- Final integrated acceptance: two real browser windows prove the full flow (create → join → log sets → shared timer → presence → end → summary)
- TypeScript compiles 0 new errors across backend, web, and native packages

## Requirement Coverage

- Covers: R021 (Collaborative Live Workouts — primary)
- Partially covers: R011 (Cross-Platform UI — extended with group workout mobile screens)
- Leaves for later: none
- Orphan risks: none — R021 is the only unmapped active requirement; all others are already implemented

## Slices

- [ ] **S01: Session Creation, Joining, Presence & Live Set Feed** `risk:high` `depends:[]`
  > After this: User A creates a group session on web, User B joins via invite link, both see each other as active participants with presence indicators, User A logs a set and User B sees it appear in realtime in a shared set feed — all on web with a working heartbeat-based presence system and cron cleanup.

- [ ] **S02: Shared Timer, Session Lifecycle & Combined Summary** `risk:medium` `depends:[S01]`
  > After this: Any participant can start/pause/skip a shared rest timer that counts down in sync across all participants' screens, the host can end the session triggering a combined summary view showing all participants' workout stats, and abandoned sessions auto-complete after 15 minutes of inactivity.

- [ ] **S03: Integration Hardening & Verification** `risk:medium` `depends:[S01,S02]`
  > After this: Two real browser windows prove the full end-to-end flow (create → join → log sets → timer → presence idle → end → summary), each participant's workout records flow into finishWorkout hooks (feed, leaderboard, challenge, badge), and a comprehensive verification script with 15+ checks validates all session behaviors programmatically.

- [ ] **S04: Mobile Port** `risk:low` `depends:[S01,S02]`
  > After this: Mobile users can create group sessions, join via deep link, see live participant list with presence, log sets in the shared feed, use the synchronized timer, and view the combined summary — all within the existing Workouts tab stack using the same Convex APIs as web.

## Boundary Map

### S01 → S02

Produces:
- `groupSessions` table with fields: `hostId`, `status` ("waiting" | "active" | "completed" | "cancelled"), `inviteCode`, `createdAt`, indexes `by_hostId`, `by_inviteCode`, `by_status`
- `sessionParticipants` table with fields: `sessionId`, `userId`, `workoutId`, `lastHeartbeatAt`, `status` ("active" | "idle" | "left"), `joinedAt`, indexes `by_sessionId`, `by_userId`, `by_sessionId_userId`
- `workouts` table extended with optional `sessionId: v.optional(v.id("groupSessions"))` field
- `sessions.ts` mutations: `createSession`, `joinSession`, `leaveSession`, `sendHeartbeat`
- `sessions.ts` queries: `getSession`, `getSessionParticipants`, `getSessionSets`
- `cleanupPresence` internal mutation registered in `crons.ts` (30-second interval)
- Web pages: `/workouts/session/[id]` (live session view), `/session/join/[id]` (join page)
- Established pattern: heartbeat mutation + cron-based presence derivation from `lastHeartbeatAt`

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `groupSessions` extended with `sharedTimerEndAt`, `sharedTimerDurationSeconds` optional fields
- `sessions.ts` mutations: `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer`, `endSession`
- `sessions.ts` queries: `getSessionSummary`
- Session lifecycle state machine: waiting → active → completed/cancelled
- `checkSessionTimeouts` internal mutation added to `crons.ts`
- SharedTimerDisplay component on web (server-authoritative countdown)

Consumes:
- S01 session creation, joining, presence infrastructure
- S01 web session page layout (extends with timer and end/summary UI)

### S03 → S04

Produces:
- `finishWorkout` integration: session participant's workout completion triggers existing 4 non-fatal hooks
- Comprehensive verification script (`verify-m05.ts`) with 15+ checks covering session lifecycle, presence, timer, summary, and workout record integration
- Proven end-to-end flow across two browser windows

Consumes:
- S01 + S02 complete backend and web UI

### S04 (terminal)

Produces:
- `GroupSessionScreen` — live session view with participant list, set feed, timer, presence
- `SessionLobbyScreen` — waiting room before session starts
- `JoinSessionScreen` — deep link landing for session invite
- Group session entry point within Workouts tab stack (no new tab — D133 ceiling)

Consumes:
- S01 + S02 complete backend API (all `sessions.ts` functions)
- S03 verification confirms backend correctness
