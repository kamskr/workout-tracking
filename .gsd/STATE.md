# GSD State

**Active Milestone:** M001 — Core Workout Logging
**Active Slice:** S01 complete ✅ — ready for squash-merge and S02 planning
**Active Task:** none
**Phase:** Slice closure — S01 artifacts written, pending merge to main

## Recent Decisions
- D011: Fully normalized 7-table schema with v.id() references
- D012: primaryMuscleGroup as indexed string, secondaryMuscleGroups as display-only array
- D013: Dual query path — withSearchIndex for text search, withIndex for filter-only browse
- D014: Seed idempotency via per-exercise slug check
- D015: Native HTML select for filter UI (no headless UI dependency)
- D016: Added `plyometric` as 5th exercise type

## S01 Final Status
- [x] T01: Full 8-table schema, 144-exercise seed JSON, shared auth helper
- [x] T02: Seed mutation + exercise query/mutation API — verified against live Convex
- [x] T03: Exercise browse page at /exercises with filters, search, card grid, Clerk route protection
- [x] T04: End-to-end verification — R001, R010, R023 all verified (script + browser)

## Requirements Validated
- R001 — Exercise Library (144 exercises seeded, browsable)
- R010 — Body-Part and Equipment Filtering (all filter paths verified)
- R023 — Clerk Auth on web (route protection verified)

## Blockers
- None

## Next Action
Squash-merge S01 branch to main, then begin S02 planning
