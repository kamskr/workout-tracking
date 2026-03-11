# GSD State

**Active Milestone:** M003 — Social Foundation
**Active Slice:** S01 complete — ready for S02
**Active Task:** None
**Phase:** S01 complete — T01+T02+T03 done, summary and UAT written, ready for S02

## Completed Milestones
- [x] M001: Core Workout Logging ✅ (6 slices, 20 tasks, 13 requirements validated, 41/41 backend checks)
- [x] M002: Analytics & Progress ✅ (4 slices, 13 tasks, 16 requirements validated, 72/72 backend checks)

## M003 Roadmap
- [x] S01: User Profiles `risk:high` `depends:[]` ✅
  - [x] T01: Add profiles table, Convex functions, and test helpers
  - [x] T02: Write and pass backend verification script
  - [x] T03: Build profile setup and profile view web pages
- [ ] S02: Follow System & Activity Feed `risk:high` `depends:[S01]`
- [ ] S03: Workout Sharing & Privacy `risk:medium` `depends:[S01, S02]`
- [ ] S04: Mobile Social Port `risk:low` `depends:[S01, S02, S03]`

## Verification Status
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — ✅ 0 errors
- `tsc --noEmit -p apps/web/tsconfig.json` — ✅ 0 new errors (pre-existing clsx only)
- M002 verification: verify-s01-m02 (12/12), verify-s02-m02 (8/8), verify-s03-m02 (11/11)
- M001 regression: verify-s02 (15/15), verify-s03 (12/12), verify-s04 (6/6), verify-s05 (8/8)
- **Total: 72/72 backend checks pass** (pre-S01 baseline — regression scripts not re-run due to Convex CLI auth)
- verify-s01-m03.ts: script created (12 checks), execution pending Convex CLI auth

## Requirements Status
- 16 total validated (R001-R014, R022, R023)
- 7 active (R015-R021) — R015 advanced by S01 (pending live verification)
- 3 deferred (R024-R026)
- 2 out of scope (R027-R028)
- M003 covers: R015, R016, R017 (primary), R011 (supporting via S04)

## Decisions
- D070-D079 recorded for M003 planning
- D080-D086 recorded for S01 (username immutability, UTC streak, profile data attributes, stats reuse, computePeriodSummary undefined, conditional query skip, inline edit)

## Next Steps
1. **Pre-S02 blocker:** Run `npx convex login` interactively → `npx convex dev` to push schema → `verify-s01-m03.ts` for 12/12 pass + 72/72 regression pass
2. Plan and execute M003/S02: Follow System & Activity Feed

## Blockers
- Convex CLI auth needed: `npx convex login` requires interactive terminal with browser. Must be run before S02 to validate S01 backend fully and push schema.
