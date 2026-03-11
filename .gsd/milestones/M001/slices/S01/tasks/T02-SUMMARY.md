---
id: T02
parent: S01
milestone: M001
provides:
  - Idempotent seedExercises internalMutation that populates 144 exercises
  - listExercises query with search index and filter index code paths
  - getExercise query by document ID
  - createCustomExercise auth-gated mutation
key_files:
  - packages/backend/convex/seed.ts
  - packages/backend/convex/exercises.ts
key_decisions:
  - JSON seed data imported directly via ES module import (Convex bundler resolves JSON modules natively)
  - Search index filter fields chained in withSearchIndex builder for combined text+filter queries
  - Index selection priority in filter-only path: primaryMuscleGroup > equipment > exerciseType (most selective first)
  - MAX_RESULTS cap of 200 on listExercises to prevent oversized responses
patterns_established:
  - internalMutation for seed operations (not exposed to client)
  - Dual query path pattern: withSearchIndex when searchQuery present, withIndex for filter-only
  - Enum validators duplicated in exercises.ts args (matches schema.ts definitions) — Convex requires inline validators in function args
observability_surfaces:
  - Seed mutation logs "Seed complete: N inserted, N skipped of N" to Convex function logs
  - Query functions return empty arrays (not errors) for no-match filters
  - createCustomExercise throws "User not found" on auth failure
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Implement exercise seed mutation and query functions

**Created idempotent seed mutation and full exercise query/mutation API — all verified against live Convex deployment with 144 exercises seeded.**

## What Happened

Created two new Convex function files:

1. **`seed.ts`** — `seedExercises` as `internalMutation` that imports `data/exercises.json` directly, iterates all 144 exercises, checks existence by slug via the `by_slug` index, and inserts only new records. Logs inserted/skipped/total counts.

2. **`exercises.ts`** — Three functions:
   - `listExercises` with dual query path: uses `withSearchIndex("search_name")` when `searchQuery` is provided (chains filter fields in the search builder), falls back to index-based queries (`by_primaryMuscleGroup` > `by_equipment` > `by_type`) for filter-only requests. Remaining filters applied via `.filter()` after index narrowing. Capped at 200 results.
   - `getExercise` — simple `ctx.db.get(id)` by document ID.
   - `createCustomExercise` — auth-gated via `getUserId()`, sets `isCustom: true` and `userId` from auth context.

Deployed schema to local Convex backend (required setting `CLERK_ISSUER_URL` env var on local backend first), ran seed, and verified all query paths.

## Verification

- **TypeScript compilation**: `pnpm turbo typecheck` passes for all 3 packages (backend, web, native)
- **Schema deployment**: `npx convex dev` successfully pushed schema with all 14 indexes
- **Seed idempotency**:
  - First run: `Seed complete: 144 inserted, 0 skipped of 144` ✓
  - Second run: `Seed complete: 0 inserted, 144 skipped of 144` ✓
- **listExercises no filters**: Returns 144 exercises ✓
- **listExercises primaryMuscleGroup=chest**: Returns 16 chest-only exercises ✓
- **listExercises equipment=barbell**: Returns 30 barbell-only exercises ✓
- **listExercises searchQuery=bench**: Returns 6 exercises with "bench" in name ✓
- **getExercise by ID**: Returns complete single exercise document ✓

## Diagnostics

- **Seed results**: Run `npx convex run seed:seedExercises` — check Convex logs for inserted/skipped counts
- **Query testing**: Run `npx convex run exercises:listExercises '{"primaryMuscleGroup":"chest"}'` from CLI or Convex dashboard
- **Data inspection**: Convex dashboard data browser → `exercises` table for count and data quality
- **Auth failures**: `createCustomExercise` throws "User not found" — visible in Convex function error logs

## Slice-Level Verification Status

- [x] `pnpm turbo typecheck` — all packages compile cleanly
- [x] Schema deploys without errors (verified via `npx convex dev`)
- [x] Seed exercises and verify query returns 100+ exercises (144 returned)
- [ ] Browser: `/exercises` renders with data, filters work, search works — pending T03
- [ ] Browser: signed-out redirect to Clerk sign-in — pending T03

## Deviations

- Had to set `CLERK_ISSUER_URL` as Convex environment variable on local backend before deploy could succeed (auth config requires it). Used placeholder value for local dev.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/seed.ts` — idempotent seedExercises internalMutation
- `packages/backend/convex/exercises.ts` — listExercises, getExercise, createCustomExercise functions
