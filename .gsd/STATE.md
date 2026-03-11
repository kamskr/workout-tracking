# GSD State

**Active Milestone:** M005 — Collaborative Live Workouts
**Active Slice:** S01 complete ✅ — ready for S02
**Active Task:** None — S01 complete, awaiting S02 planning
**Phase:** M005/S01 complete (2026-03-11). All 4 tasks done, slice summary and UAT written. S02 next.

## Completed Milestones
- [x] M001: Core Workout Logging ✅ (6 slices, 20 tasks, 13 requirements validated, 41/41 backend checks)
- [x] M002: Analytics & Progress ✅ (4 slices, 13 tasks, 16 requirements validated, 72/72 backend checks)
- [x] M003: Social Foundation ✅ (4 slices, 12 tasks, 0 new requirements validated, 42 checks pending Convex CLI auth)
- [x] M004: Leaderboards & Challenges ✅ (4 slices, 12 tasks, 0 new requirements validated, 40 checks pending Convex CLI auth)

## M005 Plan
- 4 slices planned: S01 ✅ (Session + Presence + Set Feed), S02 (Timer + Lifecycle + Summary), S03 (Integration + Verification), S04 (Mobile Port)
- Risk ordering: S01 high ✅ (presence heartbeat pattern proven), S02 medium (timer sync), S03 medium (integration proof), S04 low (mobile port)
- 18 decisions recorded: D137–D154 (D137-D148 from M005 planning, D149-D154 from S01 execution)
- Requirement mapping: R021 (primary), R011 (partial — mobile extension)
- Schema additions: 2 new tables (groupSessions, sessionParticipants), 1 optional field on workouts (sessionId)
- New module: sessions.ts (9 functions)
- Cron additions: presence cleanup (30s interval) ✅, session timeout check (S02)

## M005/S01 Complete ✅
- [x] T01: Schema, sessions.ts mutations/queries, cron, and test helpers ✅ (15m)
- [x] T02: Verification script for session backend ✅ (10m)
- [x] T03: Web UI — session page, join page, middleware, and heartbeat ✅ (25m)
- [x] T04: TypeScript compilation check and native compatibility ✅ (5m)

### S01 Delivered
- 2 new schema tables (groupSessions, sessionParticipants) with indexes
- sessionId optional field + by_sessionId index on workouts
- sessions.ts: 4 mutations + 4 queries + 1 internalMutation (cleanupPresence)
- 30s presence cleanup cron in crons.ts
- 10 session test helpers in testing.ts (9 original + testSetParticipantHeartbeat)
- _generated/api.d.ts updated with sessions module
- verify-s01-m05.ts: 12-check verification script (SS-01 through SS-12)
- /workouts/session/[id]/page.tsx — live session view with heartbeat
- /session/join/[inviteCode]/page.tsx — join flow with auth-gated redirect
- SessionParticipantList + SessionSetFeed components
- Middleware protection for /session(.*)
- All data attributes: data-session-page, data-session-invite, data-session-participants, data-session-sets, data-presence-indicator
- clsx dependency added to resolve pre-existing TS2307 blocker

## Verification Status
- `tsc --noEmit` backend — ✅ 0 errors
- `tsc --noEmit` web — ✅ 0 errors
- `tsc --noEmit` native — ✅ 0 new errors (38 pre-existing TS2307 for convex/react)
- M001+M002 regression: 72/72 checks (baseline)
- M003 verification scripts: 42 checks pending Convex CLI auth
- M004 verification scripts: 40 checks pending Convex CLI auth
- M005/S01 verification script: 12 checks created, pending live Convex backend
- **Total pending checks: 94** (blocked on `npx convex login`)

## Requirements Status
- 16 validated (R001-R014, R022, R023)
- 7 active (R015-R021) — R015-R020 fully implemented pending live verification; R021 S01 complete, S02-S04 remaining
- 3 deferred (R024-R026)
- 2 out of scope (R027-R028)

## Decisions
- D001-D069 from M001+M002
- D070-D106 from M003
- D107-D136 from M004
- D137-D148 from M005 planning
- D149-D154 from M005/S01

## Blockers
- **Convex CLI auth:** `npx convex login` requires interactive terminal with browser. Must resolve before 94 verification checks can execute and R015-R020 can be validated.
- **Pre-existing:** Next.js 16 deprecated middleware convention may cause 404 on App Router routes

## Next Steps
1. Plan and execute M005/S02: Shared Timer, Session Lifecycle & Combined Summary
2. (Parallel/when available) Resolve Convex CLI auth and run all 94 pending verification checks
