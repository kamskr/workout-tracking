# GSD State

**Active Milestone:** M004 — Leaderboards & Challenges
**Active Slice:** None — S01 complete, S02 next
**Active Task:** None
**Phase:** S01 complete (2026-03-11). Leaderboard backend + web UI shipped. Next: S02 Group Challenges planning.

## Completed Milestones
- [x] M001: Core Workout Logging ✅ (6 slices, 20 tasks, 13 requirements validated, 41/41 backend checks)
- [x] M002: Analytics & Progress ✅ (4 slices, 13 tasks, 16 requirements validated, 72/72 backend checks)
- [x] M003: Social Foundation ✅ partial (4 slices, 12 tasks, 0 new requirements validated, 42 checks pending execution)

## M004 Roadmap
- [x] S01: Leaderboards — Backend + Web UI ✅ (3 tasks, ~53 min, 12-check verification script written)
- [ ] S02: Group Challenges — Backend + Web UI `risk:high` `depends:[S01]`
- [ ] S03: Achievements & Badges — Backend + Web UI `risk:medium` `depends:[S01]`
- [ ] S04: Mobile Competitive Port `risk:low` `depends:[S01,S02,S03]`

## Verification Status
- `tsc --noEmit` backend — ✅ 0 errors
- `tsc --noEmit` web — ✅ 0 new errors (1 pre-existing TS2307 for clsx)
- `tsc --noEmit` native — ✅ 0 new errors (34 pre-existing TS2307 for convex/react)
- M001+M002 regression: 72/72 checks (baseline, not re-run — no breaking changes)
- M003 verification scripts: 42 checks pending Convex CLI auth
- M004/S01 verification script: 12 checks pending Convex CLI auth

## Requirements Status
- 16 validated (R001-R014, R022, R023)
- 7 active (R015-R021) — R015/R016/R017 fully implemented pending live verification; R018 backend+web complete pending live verification; R019/R020 mapped to M004/S02-S03; R021 mapped to M005
- 3 deferred (R024-R026)
- 2 out of scope (R027-R028)

## Decisions
- D001-D069 from M001+M002
- D070-D106 from M003
- D107-D116 from M004 planning
- D117-D120 from M004/S01

## Blockers
- **Convex CLI auth:** `npx convex login` requires interactive terminal with browser. Must resolve before verification scripts can execute and R015/R016/R017/R018 can be validated.
- **Pre-existing:** `clsx` missing from apps/web dependencies (manually copied workaround)
- **Pre-existing:** Next.js 16 deprecated middleware convention may cause 404 on App Router routes

## Next Steps
1. Plan S02: Group Challenges — Backend + Web UI (challenges table, lifecycle, crons.ts)
2. Run all verification scripts when Convex CLI auth is available (42 M003 + 12 M004/S01 = 54 checks)
3. Browser visual UAT of /leaderboards page
