---
id: T01
parent: S01
milestone: M001
provides:
  - Full 7-table workout-domain Convex schema with all indexes and search index
  - Curated 144-exercise seed data JSON with consistent enum values
  - Shared getUserId auth helper in convex/lib/auth.ts
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/lib/auth.ts
  - packages/backend/data/exercises.json
  - packages/backend/convex/notes.ts
key_decisions:
  - Kept notes table in schema for backward compatibility (existing notes feature still works)
  - Fixed pre-existing broken import path in notes.ts (../convex/_generated/api → ./_generated/api)
patterns_established:
  - Shared auth helpers live in convex/lib/ and are imported by all query/mutation files
  - Enum-like validators use v.union(v.literal(...)) extracted as named constants at top of schema
  - Seed data lives in packages/backend/data/ as static JSON
observability_surfaces:
  - none (schema definition only, no runtime yet)
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Define full workout-domain Convex schema and curate exercise seed data

**Replaced notes-only schema with full 8-table workout domain schema (7 new + notes), created 144-exercise seed JSON, and extracted shared getUserId auth helper.**

## What Happened

1. Created `packages/backend/convex/lib/auth.ts` — extracted `getUserId` helper from `notes.ts` with proper TypeScript typing (`Promise<string | undefined>`). Updated `notes.ts` to import from the shared location.

2. Replaced `packages/backend/convex/schema.ts` with the full workout-domain schema defining 8 tables (notes + 7 workout tables). Shared enum validators (`muscleGroup`, `equipment`, `exerciseType`, `workoutStatus`, `weightUnit`) are defined as `v.union(v.literal(...))` constants at the top and reused across tables. All indexes needed by S02-S06 are defined upfront:
   - `exercises`: 5 regular indexes (`by_slug`, `by_primaryMuscleGroup`, `by_equipment`, `by_type`, `by_user_custom`) + 1 search index (`search_name` with filterFields for primaryMuscleGroup, equipment, exerciseType)
   - `workouts`: `by_userId`, `by_userId_status`
   - `workoutExercises`: `by_workoutId`, `by_exerciseId`
   - `sets`: `by_workoutExerciseId`
   - `workoutTemplates`: `by_userId`
   - `templateExercises`: `by_templateId`
   - `userPreferences`: `by_userId`

3. Created `packages/backend/data/exercises.json` with 144 curated exercises covering all 9 muscle groups (chest, back, shoulders, biceps, triceps, legs, core, fullBody, cardio), all 8 equipment types (barbell, dumbbell, cable, machine, bodyweight, kettlebell, bands, other), and all 5 exercise types (strength, cardio, bodyweight, stretch, plyometric). Each exercise has name, slug, primaryMuscleGroup, secondaryMuscleGroups, equipment, exerciseType, instructions, and defaultRestSeconds. All slugs are unique.

## Verification

- `pnpm turbo typecheck` — all 3 packages (backend, web, native) compile cleanly
- `jq length` on exercises.json — 144 exercises (exceeds 100+ minimum)
- `jq '.[].primaryMuscleGroup' | sort -u` — all 9 expected muscle group values present
- `jq '.[].equipment' | sort -u` — all 8 expected equipment values present
- `jq '.[].exerciseType' | sort -u` — all 5 expected exercise type values present
- `jq '.[].slug' | sort | uniq -d` — empty (zero duplicate slugs)
- `notes.ts` imports from `./lib/auth` and compiles correctly

### Slice-level verification status (T01 is task 1 of 4):
- ✅ `pnpm turbo typecheck` — all packages compile cleanly
- ⏳ `npx convex dev --once` — schema deploy (not run yet, will verify in T02)
- ⏳ Seed exercises and verify query — T02
- ⏳ Browser: exercise page, filters, search — T03
- ⏳ Browser: signed-out redirect — T03

## Diagnostics

Schema validity is inspectable via `pnpm turbo typecheck --filter=@packages/backend`. Exercise data contract is inspectable via `jq` on `data/exercises.json`. No runtime diagnostics yet (no mutations/queries deployed).

## Deviations

- Fixed a pre-existing broken import path in `notes.ts`: `from "../convex/_generated/api"` → `from "./_generated/api"`. The old path went up a directory and back into convex/ which is incorrect but happened to resolve due to filesystem structure.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Full 8-table schema with all validators, indexes, and search index
- `packages/backend/convex/lib/auth.ts` — Shared getUserId auth helper extracted from notes.ts
- `packages/backend/convex/notes.ts` — Updated imports to use shared auth helper and fixed _generated import path
- `packages/backend/data/exercises.json` — 144 curated exercises with consistent enum values and unique slugs
