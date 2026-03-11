---
id: T01
parent: S02
milestone: M001
provides:
  - Complete Convex CRUD layer for workouts, workout exercises, sets, and user preferences
  - 17 auth-gated functions (7 workout, 4 workoutExercise, 4 set, 2 userPreference)
key_files:
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/workoutExercises.ts
  - packages/backend/convex/sets.ts
  - packages/backend/convex/userPreferences.ts
key_decisions: []
patterns_established:
  - Ownership verification helper pattern (verifyWorkoutOwnershipAndStatus, verifySetOwnership) for reusable auth+ownership+status checks
  - Cascade delete pattern for parent→child relationships (workout→workoutExercises→sets)
  - Auto-computed ordinals (setNumber from count+1, exercise order from count)
observability_surfaces:
  - All mutations throw descriptive errors: "User not found", "Workout not found", "Workout does not belong to user", "Workout is not in progress", "Workout exercise not found", "Set not found"
  - CLI inspection via `npx convex run workouts:listWorkouts` (requires auth + running backend)
  - Convex dashboard tables: workouts, workoutExercises, sets, userPreferences
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Convex workout lifecycle and set logging functions

**Created complete Convex CRUD backend for workouts, workout exercises, sets, and user preferences — 17 auth-gated functions across 4 files.**

## What Happened

Implemented all four Convex function files following the established `exercises.ts` patterns:

1. **workouts.ts** (7 functions): createWorkout (defaults "inProgress", auto-name), getActiveWorkout (uses by_userId_status index), getWorkout (ownership verified), getWorkoutWithDetails (compound query with Promise.all joining exercises+sets+exercise docs), listWorkouts (by_userId desc, take 50), finishWorkout (computes durationSeconds server-side), deleteWorkout (cascades to workoutExercises and sets).

2. **workoutExercises.ts** (4 functions): addExerciseToWorkout (auto-computes next order), removeExerciseFromWorkout (cascades to sets), reorderExercises (batch updates order field), listExercisesForWorkout (joins exercise data via Promise.all).

3. **sets.ts** (4 functions): logSet (auto-computes 1-indexed setNumber, weight optional), updateSet (partial update of provided fields only), deleteSet, listSetsForExercise (ordered by setNumber).

4. **userPreferences.ts** (2 functions): getPreferences (returns default {weightUnit:"kg"} if no doc), setUnitPreference (upserts — insert or patch).

Helper functions `verifyWorkoutOwnershipAndStatus` and `verifySetOwnership` encapsulate the auth→ownership→status check chain, throwing descriptive errors at each failure point.

## Verification

- `pnpm turbo typecheck` — all 3 packages (backend, web-app, native-app) compile with 0 errors
- Function export count verified: 17 exported functions across 4 files matching the plan exactly
- Slice-level checks (intermediate task — partial passes expected):
  - ✅ `pnpm turbo typecheck` passes
  - ⏳ `verify-s02.ts` script — not yet created (T02)
  - ⏳ Browser checks — UI not yet created (T03/T04)

## Diagnostics

- Every mutation throws structured errors on auth/ownership/status failures with descriptive messages
- Inspect via Convex dashboard tables or `npx convex run` CLI commands (requires running backend)
- No silent failures — all error paths throw immediately

## Deviations

None — implementation matches the plan exactly.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/workouts.ts` — 7 workout lifecycle functions (create, getActive, get, getWithDetails, list, finish, delete)
- `packages/backend/convex/workoutExercises.ts` — 4 workout exercise functions (add, remove, reorder, list)
- `packages/backend/convex/sets.ts` — 4 set logging functions (log, update, delete, list)
- `packages/backend/convex/userPreferences.ts` — 2 user preference functions (get, setUnit)
