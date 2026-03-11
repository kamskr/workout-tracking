---
estimated_steps: 5
estimated_files: 4
---

# T01: Define full workout-domain Convex schema and curate exercise seed data

**Slice:** S01 — Convex Schema & Exercise Library
**Milestone:** M001

## Description

Replace the existing notes-only Convex schema with the full 7-table workout domain schema and create the curated exercise seed data JSON. The schema defines all tables, validators, indexes, and search indexes needed through S06 — this is critical because Convex requires indexes at schema definition time and adding them later triggers backfills. Extract the `getUserId` auth helper to a shared location for reuse across all future Convex functions.

## Steps

1. Create `packages/backend/convex/lib/auth.ts` — extract the `getUserId` helper from `notes.ts` into a shared module. Export it for use by all query/mutation files. Update `notes.ts` to import from the new location.
2. Replace `packages/backend/convex/schema.ts` — define all 7 tables with full validators per the research doc schema design:
   - `exercises`: name, slug, primaryMuscleGroup, secondaryMuscleGroups, equipment, exerciseType, instructions, imageUrl, isCustom, userId, defaultRestSeconds. Indexes: `by_slug`, `by_primaryMuscleGroup`, `by_equipment`, `by_type`, `by_user_custom`. Search index: `search_name` on name with filterFields for primaryMuscleGroup, equipment, exerciseType.
   - `workouts`: userId, name, status (planned/inProgress/completed), startedAt, completedAt, notes, durationSeconds. Indexes: `by_userId`, `by_userId_status`.
   - `workoutExercises`: workoutId, exerciseId, order, supersetGroupId, restSeconds, notes. Indexes: `by_workoutId`, `by_exerciseId`.
   - `sets`: workoutExerciseId, setNumber, weight, reps, rpe, tempo, notes, isWarmup, completedAt. Index: `by_workoutExerciseId`.
   - `workoutTemplates`: userId, name, description, createdFromWorkoutId. Index: `by_userId`.
   - `templateExercises`: templateId, exerciseId, order, targetSets, targetReps, targetWeight, restSeconds. Index: `by_templateId`.
   - `userPreferences`: userId, weightUnit (kg/lbs), defaultRestSeconds. Index: `by_userId`.
3. Create `packages/backend/data/exercises.json` — curate ~120 exercises across all major muscle groups (chest, back, shoulders, biceps, triceps, legs, core) and equipment types (barbell, dumbbell, cable, machine, bodyweight, kettlebell, bands). Each exercise object has: name, slug (kebab-case), primaryMuscleGroup, secondaryMuscleGroups (array), equipment, exerciseType, instructions (short how-to), defaultRestSeconds. Ensure consistent enum values matching the schema validators.
4. Verify TypeScript compilation: run `pnpm turbo typecheck` for `@packages/backend` to confirm the schema is valid.
5. Verify notes.ts still works with the extracted auth helper — confirm import path is correct and types align.

## Must-Haves

- [ ] All 7 tables defined with correct `v` validators matching research doc design
- [ ] All indexes defined upfront (including those for S02-S06: `by_userId_status`, `by_workoutId`, `by_exerciseId`, `by_workoutExerciseId`, `by_templateId`)
- [ ] Search index on `exercises.name` with `filterFields` for `primaryMuscleGroup`, `equipment`, `exerciseType`
- [ ] Exercise JSON seed with 100+ exercises, consistent enum values, unique slugs
- [ ] `getUserId` extracted to `convex/lib/auth.ts` and `notes.ts` updated to use it
- [ ] `primaryMuscleGroup` is a string (not array) — indexed for equality queries per research pitfall
- [ ] Weight-related fields use `number` type (stored as kg per D003)
- [ ] TypeScript compiles cleanly

## Verification

- `pnpm turbo typecheck` passes for `@packages/backend`
- `wc -l packages/backend/data/exercises.json` shows 100+ exercises (check with jq: `cat packages/backend/data/exercises.json | jq length`)
- `cat packages/backend/data/exercises.json | jq '.[].primaryMuscleGroup' | sort -u` shows the expected muscle group enum values
- `cat packages/backend/data/exercises.json | jq '.[].equipment' | sort -u` shows the expected equipment enum values
- `cat packages/backend/data/exercises.json | jq '.[].slug' | sort | uniq -d` returns empty (no duplicate slugs)
- `notes.ts` imports from `./lib/auth` and compiles

## Observability Impact

- Signals added/changed: None (schema definition, no runtime yet)
- How a future agent inspects this: Read `schema.ts` for table definitions, read `data/exercises.json` for seed data contract, check TypeScript compilation for schema validity
- Failure state exposed: TypeScript compilation errors reveal schema definition problems immediately

## Inputs

- Research doc S01-RESEARCH.md — schema design detail section (preloaded above)
- Existing `packages/backend/convex/schema.ts` — notes table to replace
- Existing `packages/backend/convex/notes.ts` — `getUserId` helper to extract
- Decision D003 — store weight in kg internally

## Expected Output

- `packages/backend/convex/schema.ts` — full 7-table schema with all indexes and search index
- `packages/backend/convex/lib/auth.ts` — shared `getUserId` helper
- `packages/backend/convex/notes.ts` — updated to import from `./lib/auth`
- `packages/backend/data/exercises.json` — ~120 curated exercises with consistent enum values
