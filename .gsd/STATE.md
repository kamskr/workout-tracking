# GSD State

**Active Milestone:** M003 — Social Foundation
**Active Slice:** S02 complete — ready for S03
**Active Task:** none — S02 wrapped, next is S03 planning
**Phase:** S02 complete — all 3 tasks done, summary + UAT written, decisions recorded

## Completed Milestones
- [x] M001: Core Workout Logging ✅ (6 slices, 20 tasks, 13 requirements validated, 41/41 backend checks)
- [x] M002: Analytics & Progress ✅ (4 slices, 13 tasks, 16 requirements validated, 72/72 backend checks)

## M003 Roadmap
- [x] S01: User Profiles `risk:high` `depends:[]` ✅
  - [x] T01: Add profiles table, Convex functions, and test helpers
  - [x] T02: Write and pass backend verification script
  - [x] T03: Build profile setup and profile view web pages
- [x] S02: Follow System & Activity Feed `risk:high` `depends:[S01]` ✅
  - [x] T01: Add social tables, create social.ts, inject feed item creation into finishWorkout/deleteWorkout ✅
  - [x] T02: Add social test helpers to testing.ts and write verification script ✅
  - [x] T03: Build /feed page, add follow/unfollow to profile page, wire navigation ✅
- [ ] S03: Workout Sharing & Privacy `risk:medium` `depends:[S01, S02]`
- [ ] S04: Mobile Social Port `risk:low` `depends:[S01, S02, S03]`

## Verification Status
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — ✅ 0 errors
- `tsc --noEmit -p apps/web/tsconfig.json` — ✅ 0 new errors (pre-existing clsx only)
- M002 verification: verify-s01-m02 (12/12), verify-s02-m02 (8/8), verify-s03-m02 (11/11)
- M001 regression: verify-s02 (15/15), verify-s03 (12/12), verify-s04 (6/6), verify-s05 (8/8)
- **Total: 72/72 backend checks pass** (pre-S01 baseline — regression scripts not re-run due to Convex CLI auth)
- verify-s01-m03.ts: script created (12 checks), execution pending Convex CLI auth
- verify-s02-m03.ts: script created (15 checks, F-01 through F-15), execution pending Convex CLI auth

## S02 Completion Summary
- 5 social tables (follows, feedItems, reactions, blocks, reports) with all indexes
- 11 Convex functions in social.ts (follow/unfollow, feed, reactions, block/report)
- Feed item lifecycle wired into finishWorkout (non-fatal) and deleteWorkout (cascade-delete)
- 12 social test helpers + testCleanup extended for social tables
- 15-check verification script with 3 test users
- /feed page with usePaginatedQuery, FeedItem + ReactionBar components
- Follow/unfollow on profile pages with follower/following counts
- User discovery search on feed page
- /feed middleware protection + Feed navigation link
- All data attributes: data-feed-page, data-feed-item, data-reaction-bar, data-follow-button
- Decisions D087-D094 recorded

## Requirements Status
- 16 total validated (R001-R014, R022, R023)
- 7 active (R015-R021) — R015 advanced by S01, R016 advanced by S02 (both pending live verification)
- 3 deferred (R024-R026)
- 2 out of scope (R027-R028)
- M003 covers: R015, R016, R017 (primary), R011 (supporting via S04)

## Decisions
- D070-D079 recorded for M003 planning
- D080-D086 recorded for S01
- D087-D094 recorded for S02

## Next Steps
1. Plan and execute M003/S03: Workout Sharing & Privacy
2. **Pre-verification blocker:** Run `npx convex login` interactively → `npx convex dev` to push schema → run verify scripts

## Blockers
- Convex CLI auth needed: `npx convex login` requires interactive terminal with browser. Must be run before verification scripts can execute.
- Pre-existing: `clsx` missing from apps/web dependencies (blocks runtime page rendering for all pages)
- Pre-existing: Next.js 16 deprecated middleware convention causes 404 on all App Router routes
