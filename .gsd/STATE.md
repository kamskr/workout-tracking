# GSD State

**Active Milestone:** M005 — Collaborative Live Workouts
**Active Slice:** None — roadmap planned, awaiting S01 execution
**Active Task:** None
**Phase:** M005 planned (2026-03-11). Ready for S01 execution.

## Completed Milestones
- [x] M001: Core Workout Logging ✅ (6 slices, 20 tasks, 13 requirements validated, 41/41 backend checks)
- [x] M002: Analytics & Progress ✅ (4 slices, 13 tasks, 16 requirements validated, 72/72 backend checks)
- [x] M003: Social Foundation ✅ (4 slices, 12 tasks, 0 new requirements validated, 42 checks pending Convex CLI auth)
- [x] M004: Leaderboards & Challenges ✅ (4 slices, 12 tasks, 0 new requirements validated, 40 checks pending Convex CLI auth)

## M005 Plan
- 4 slices planned: S01 (Session + Presence + Set Feed), S02 (Timer + Lifecycle + Summary), S03 (Integration + Verification), S04 (Mobile Port)
- Risk ordering: S01 high (presence heartbeat pattern), S02 medium (timer sync), S03 medium (integration proof), S04 low (mobile port)
- 12 new decisions recorded: D137–D148
- Requirement mapping: R021 (primary), R011 (partial — mobile extension)
- Schema additions: 2 new tables (groupSessions, sessionParticipants), 1 optional field on workouts (sessionId)
- New module: sessions.ts + lib/sessionCompute.ts
- Cron additions: presence cleanup (30s interval), session timeout check

## Verification Status
- `tsc --noEmit` backend — ✅ 0 errors
- `tsc --noEmit` web — ✅ 0 new errors (1 pre-existing TS2307 for clsx only)
- `tsc --noEmit` native — ✅ 0 new errors (30 pre-existing TS2307 for convex/react)
- M001+M002 regression: 72/72 checks (baseline)
- M003 verification scripts: 42 checks pending Convex CLI auth
- M004 verification scripts: 40 checks pending Convex CLI auth
- **Total pending checks: 82** (blocked on `npx convex login`)

## Requirements Status
- 16 validated (R001-R014, R022, R023)
- 7 active (R015-R021) — R015-R020 fully implemented pending live verification; R021 mapped to M005 S01-S04
- 3 deferred (R024-R026)
- 2 out of scope (R027-R028)

## Decisions
- D001-D069 from M001+M002
- D070-D106 from M003
- D107-D136 from M004
- D137-D148 from M005 planning

## Blockers
- **Convex CLI auth:** `npx convex login` requires interactive terminal with browser. Must resolve before 82 verification checks can execute and R015-R020 can be validated.
- **Pre-existing:** `clsx` missing from apps/web dependencies (manually copied workaround)
- **Pre-existing:** Next.js 16 deprecated middleware convention may cause 404 on App Router routes

## Next Steps
1. Execute M005/S01: Session Creation, Joining, Presence & Live Set Feed
2. (Parallel/when available) Resolve Convex CLI auth and run all 82 pending verification checks
