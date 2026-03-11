---
estimated_steps: 5
estimated_files: 4
---

# T01: Convex workout lifecycle and set logging functions

**Slice:** S02 — Workout CRUD & Active Workout Session
**Milestone:** M001

## Description

Create the complete Convex backend CRUD layer for workouts, workout exercises, sets, and user preferences. This is the backbone that all S02 UI and S03-S05 slices consume. Every function is auth-gated via `getUserId` from `convex/lib/auth.ts`. Follow the established patterns from `exercises.ts` exactly: import validators, define args, use `.withIndex()` for indexed queries, throw descriptive errors on auth/ownership failures.

## Steps

1. **Create `convex/workouts.ts`** — Workout lifecycle functions:
   - `createWorkout(name?)` mutation: insert with `status: "inProgress"`, `startedAt: Date.now()`, default name "Workout" if not provided. Auth-gate.
   - `getActiveWorkout()` query: use `by_userId_status` index with `["userId", "inProgress"]`, return first match or null. Auth-gate.
   - `getWorkout(id)` query: fetch by id, verify ownership (userId matches), return doc. Auth-gate.
   - `getWorkoutWithDetails(id)` query: load workout + all workoutExercises (by_workoutId) + for each workoutExercise load its sets (by_workoutExerciseId) + exercise doc (db.get). Use `Promise.all` for parallel reads. Return structured `{ workout, exercises: [{ workoutExercise, exercise, sets }] }`. Auth-gate.
   - `listWorkouts()` query: use `by_userId` index, `.order("desc")`, `.take(50)`. Auth-gate.
   - `finishWorkout(id)` mutation: verify ownership + status is "inProgress", set `status: "completed"`, `completedAt: Date.now()`, compute `durationSeconds = Math.round((completedAt - startedAt!) / 1000)`. Auth-gate.
   - `deleteWorkout(id)` mutation: verify ownership, cascade delete all workoutExercises and their sets, then delete workout. Auth-gate.

2. **Create `convex/workoutExercises.ts`** — Exercise management within a workout:
   - `addExerciseToWorkout(workoutId, exerciseId)` mutation: verify workout ownership + inProgress status, compute next order as count of existing exercises for this workout, insert workoutExercise. Return the new workoutExercise id. Auth-gate.
   - `removeExerciseFromWorkout(workoutExerciseId)` mutation: load workoutExercise, verify workout ownership, cascade delete all sets for this workoutExercise, then delete the workoutExercise. Auth-gate.
   - `reorderExercises(workoutId, orderedIds)` mutation: verify workout ownership, batch update `order` field on each workoutExercise to match array index. Auth-gate.
   - `listExercisesForWorkout(workoutId)` query: use `by_workoutId` index, join exercise data via `Promise.all(db.get(exerciseId))`. Return ordered array. Auth-gate (verify workout ownership).

3. **Create `convex/sets.ts`** — Set logging:
   - `logSet(workoutExerciseId, weight?, reps?, isWarmup?)` mutation: load workoutExercise, verify workout ownership + inProgress, compute next setNumber from existing sets count + 1, insert set with `completedAt: Date.now()`, `isWarmup: isWarmup ?? false`. Auth-gate.
   - `updateSet(setId, weight?, reps?, isWarmup?)` mutation: load set, traverse to workout, verify ownership. Partial update only provided fields. Auth-gate.
   - `deleteSet(setId)` mutation: load set, traverse to workout, verify ownership, delete. Auth-gate.
   - `listSetsForExercise(workoutExerciseId)` query: use `by_workoutExerciseId` index, return ordered by setNumber. Auth-gate (traverse to workout for ownership check).

4. **Create `convex/userPreferences.ts`** — Unit preference:
   - `getPreferences()` query: use `by_userId` index, return doc or default `{ weightUnit: "kg" }`. Auth-gate.
   - `setUnitPreference(unit)` mutation: use `by_userId` index to find existing, upsert (insert or patch). Auth-gate.

5. **Typecheck and deploy** — Run `pnpm turbo typecheck` to confirm all 4 files plus existing files compile. Deploy via `npx convex dev` (auto-deploys on file change in dev mode, but verify functions appear).

## Must-Haves

- [ ] All queries/mutations auth-gated via `getUserId` — no unauthenticated access to workout data
- [ ] `finishWorkout` computes `durationSeconds` server-side from timestamps (not client-supplied)
- [ ] `deleteWorkout` cascades to workoutExercises and sets
- [ ] `removeExerciseFromWorkout` cascades to sets
- [ ] `getWorkoutWithDetails` returns full joined data (workout + exercises + sets + exercise names) in a single query call
- [ ] `getActiveWorkout` uses `by_userId_status` index (not full table scan)
- [ ] `logSet` auto-computes `setNumber` from existing sets (1-indexed)
- [ ] All error messages are descriptive: "User not found", "Workout not found", "Workout does not belong to user", "Workout is not in progress"
- [ ] Weight field is optional on sets (bodyweight exercises have no weight)
- [ ] `setUnitPreference` does upsert (insert if no existing doc, patch if exists)

## Verification

- `pnpm turbo typecheck` — all packages compile with no errors
- Convex dev server auto-deploys functions — verify in Convex dashboard or via `npx convex functions` that all new functions are registered
- Quick smoke test via Convex CLI: `npx convex run userPreferences:getPreferences` (should return default without auth, or auth error — confirming the function exists)

## Observability Impact

- Signals added/changed: All mutations throw descriptive errors on auth failure, ownership violation, and status violation. Error messages follow pattern: "{Entity} not found" or "{Entity} does not belong to user" or "{Entity} is not in progress".
- How a future agent inspects this: `npx convex run workouts:listWorkouts` via CLI, or Convex dashboard → tables → workouts/workoutExercises/sets/userPreferences.
- Failure state exposed: Auth failures surface immediately as thrown errors. Cascade deletes are atomic within each mutation transaction.

## Inputs

- `packages/backend/convex/schema.ts` — table definitions, validators, index names
- `packages/backend/convex/exercises.ts` — canonical pattern for queries/mutations structure
- `packages/backend/convex/lib/auth.ts` — `getUserId` helper
- S02-RESEARCH.md — implementation architecture and constraints

## Expected Output

- `packages/backend/convex/workouts.ts` — 7 functions: createWorkout, getActiveWorkout, getWorkout, getWorkoutWithDetails, listWorkouts, finishWorkout, deleteWorkout
- `packages/backend/convex/workoutExercises.ts` — 4 functions: addExerciseToWorkout, removeExerciseFromWorkout, reorderExercises, listExercisesForWorkout
- `packages/backend/convex/sets.ts` — 4 functions: logSet, updateSet, deleteSet, listSetsForExercise
- `packages/backend/convex/userPreferences.ts` — 2 functions: getPreferences, setUnitPreference
