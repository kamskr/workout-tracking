---
estimated_steps: 4
estimated_files: 3
---

# T02: Implement exercise seed mutation and query functions

**Slice:** S01 — Convex Schema & Exercise Library
**Milestone:** M001

## Description

Create the Convex functions that power the exercise library: an idempotent seed mutation that loads exercises from the JSON file, and query/mutation functions for listing, getting, searching, and creating exercises. These functions are the boundary contract that S02-S06 and the web UI consume. All queries use `withIndex` or `withSearchIndex` — never `.filter()` on full table scans.

## Steps

1. Create `packages/backend/convex/seed.ts`:
   - `internalMutation` named `seedExercises` that imports the exercise JSON data
   - For each exercise in the JSON: query `exercises` table using `by_slug` index to check existence, insert only if not found
   - Log counts: `console.log(\`Seed complete: ${inserted} inserted, ${skipped} skipped of ${total}\`)`
   - Handle the JSON import — Convex runs in a bundled environment, so use a direct import of the JSON file or embed the data

2. Create `packages/backend/convex/exercises.ts`:
   - `listExercises` query with args: `searchQuery` (optional string), `primaryMuscleGroup` (optional string), `equipment` (optional string), `exerciseType` (optional string). Two code paths:
     - If `searchQuery` is provided: use `withSearchIndex("search_name", q => ...)` with `.search("name", searchQuery)` and optional filter chains for muscle group, equipment, type
     - If no searchQuery: use `withIndex("by_primaryMuscleGroup")` or `withIndex("by_equipment")` or `withIndex("by_type")` depending on which filter is provided, or list all with reasonable limit if no filters. Apply remaining filters with `.filter()` only after index narrowing.
   - `getExercise` query with arg `id: v.id("exercises")` — simple `ctx.db.get(id)`
   - `createCustomExercise` mutation — auth-gated via `getUserId()`, sets `isCustom: true` and `userId` from auth. Takes name, slug, primaryMuscleGroup, secondaryMuscleGroups, equipment, exerciseType, instructions, defaultRestSeconds as args.

3. Run `pnpm turbo typecheck` to verify all functions compile with the schema types.

4. Test the seed and query functions by deploying to Convex dev (`npx convex dev --once` in `packages/backend`), running the seed via the Convex dashboard functions panel, and querying exercises with various filter combinations.

## Must-Haves

- [ ] Seed mutation is idempotent — running it twice produces no duplicates (checks by slug)
- [ ] Seed logs inserted/skipped counts for observability
- [ ] `listExercises` uses `withIndex` for filter-only queries (never full table `.filter()`)
- [ ] `listExercises` uses `withSearchIndex` for text search with optional filter fields
- [ ] `listExercises` returns results capped at a reasonable limit (e.g., 200) to prevent oversized responses
- [ ] `getExercise` returns a single exercise document by ID
- [ ] `createCustomExercise` is auth-gated — throws if no userId
- [ ] All functions import `getUserId` from `./lib/auth` where needed
- [ ] TypeScript compiles cleanly

## Verification

- `pnpm turbo typecheck` passes for `@packages/backend`
- Deploy schema with `npx convex dev --once` — succeeds
- Run `seedExercises` via Convex dashboard — log shows ~120 inserted, 0 skipped
- Run `seedExercises` again — log shows 0 inserted, ~120 skipped (idempotent)
- Call `listExercises({})` — returns 100+ exercises
- Call `listExercises({ primaryMuscleGroup: "chest" })` — returns only chest exercises
- Call `listExercises({ equipment: "barbell" })` — returns only barbell exercises
- Call `listExercises({ searchQuery: "bench" })` — returns exercises with "bench" in name

## Observability Impact

- Signals added/changed: Seed mutation logs insert/skip counts — visible in Convex dashboard logs
- How a future agent inspects this: Check Convex dashboard logs for seed run results; call `listExercises` with various filter args from dashboard to verify query behavior; check `exercises` table in data browser for count and data quality
- Failure state exposed: Seed mutation errors surface in Convex logs with stack traces; query functions return empty arrays (not crashes) for no-match scenarios; auth failure in `createCustomExercise` throws explicit "User not found" error

## Inputs

- `packages/backend/convex/schema.ts` — table definitions and index names from T01
- `packages/backend/data/exercises.json` — seed data from T01
- `packages/backend/convex/lib/auth.ts` — `getUserId` helper from T01

## Expected Output

- `packages/backend/convex/seed.ts` — idempotent `seedExercises` internalMutation
- `packages/backend/convex/exercises.ts` — `listExercises`, `getExercise`, `createCustomExercise` functions
- Convex deployment with schema pushed and exercises seeded
