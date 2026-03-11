# S03: Full Set Tracking, Supersets & Previous Performance — Research

**Date:** 2026-03-11

## Summary

S03 adds three capabilities to the existing workout logging flow: (1) RPE, tempo, and notes fields on sets; (2) superset exercise grouping; (3) previous performance display. The schema already supports all three — `sets` has `rpe`, `tempo`, `notes` fields, `workoutExercises` has `supersetGroupId`, and `workoutExercises` has a `by_exerciseId` index for reverse lookups. The work is primarily extending mutations/queries that don't yet accept these fields, building the previous performance query, and adding UI for all three features.

The highest complexity is the **previous performance query** — it must find the most recent completed workout containing a given exercise, then return the sets from that workout. This requires a multi-table traversal: `workoutExercises` (by exerciseId) → `workouts` (check userId + completed status) → `sets` (for that workoutExerciseId). Convex has no joins, so this is N+1 by nature. The `by_exerciseId` index on `workoutExercises` makes the initial lookup efficient, but filtering by userId and status requires fetching each workout. For users with moderate history (< 100 uses of an exercise), this is fine. A dedicated index or denormalized userId on `workoutExercises` would optimize further if needed.

Superset grouping is straightforward — `supersetGroupId` is already an optional string on `workoutExercises`. The UI groups exercises sharing the same `supersetGroupId` and renders them visually connected. The main UX question is how to create/manage superset groups (drag-to-group vs. explicit "link" action).

## Recommendation

**Approach: Extend existing backend + UI incrementally in 3 task blocks.**

1. **Backend extensions** — Add `rpe`, `tempo`, `notes` to `logSet` and `updateSet` args. Add `getPreviousPerformance` query. Add `setSupersetGroup` and `clearSupersetGroup` mutations. Add corresponding test helpers.
2. **UI: SetRow + WorkoutExerciseItem** — Extend `SetRow` with RPE (number input 1-10), tempo (text input), and notes (text input) using the same `onBlur` save pattern. Add previous performance display to `WorkoutExerciseItem` header. Add superset visual grouping to `WorkoutExerciseList`.
3. **Verification** — Extend `verify-s02.ts` pattern to `verify-s03.ts` covering R003 (RPE/tempo/notes round-trip), R005 (superset grouping), R007 (previous performance query returns correct data).

No schema migration is needed — all fields already exist in the schema.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Set field mutation/query | Existing `logSet`/`updateSet` in `convex/sets.ts` | Just extend args — don't create new functions |
| Unit-aware display | `displayWeight`/`formatWeight` in `apps/web/src/lib/units.ts` | Previous performance display needs these for formatting |
| Test harness pattern | `convex/testing.ts` + `scripts/verify-s02.ts` | Extend with S03 test helpers, same ConvexHttpClient pattern |
| Component styling | `cn()` utility + Tailwind classes from existing components | Maintain visual consistency with S02 components |
| Ownership verification | `verifySetOwnership`/`verifyWorkoutOwnershipAndStatus` helpers | Reuse for new mutations |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — Schema already has `rpe: v.optional(v.number())`, `tempo: v.optional(v.string())`, `notes: v.optional(v.string())` on sets table, and `supersetGroupId: v.optional(v.string())` on workoutExercises. **No migration needed.**
- `packages/backend/convex/sets.ts` — `logSet` currently accepts only `weight`, `reps`, `isWarmup`. Must extend to also accept `rpe`, `tempo`, `notes`. Same for `updateSet`. Follow the existing partial-update pattern in `updateSet` (only patch provided fields).
- `packages/backend/convex/workoutExercises.ts` — `addExerciseToWorkout` doesn't set `supersetGroupId`. Need new mutation to set/clear it on existing workout exercises. Don't modify `addExerciseToWorkout` — superset grouping is a separate action after exercises are added.
- `apps/web/src/components/workouts/SetRow.tsx` — Currently renders weight + reps inputs with onBlur save pattern. Extend with RPE, tempo, notes inputs following same pattern. **Note:** The `SetData` interface is duplicated in SetRow, WorkoutExerciseItem, and WorkoutExerciseList — all three need updating when set fields expand.
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — This is where previous performance display goes (in the exercise header area, below muscle group/equipment line). Also where notes per exercise could appear.
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — This is where superset visual grouping logic lives. Exercises with same `supersetGroupId` should render in a grouped container.
- `packages/backend/convex/workouts.ts` — `getWorkoutWithDetails` returns exercises and sets joined. Sets already include all schema fields (rpe, tempo, notes) since Convex returns full documents. No backend change needed here for the read path.
- `packages/backend/convex/testing.ts` — `testLogSet` also only accepts `weight`, `reps`, `isWarmup`. Must extend for S03 verification of RPE/tempo/notes round-trips.
- `apps/web/src/components/workouts/ExercisePicker.tsx` — Currently single-click-to-add. S03 superset grouping doesn't need multi-select here — supersets are formed after exercises are in the workout.

## Constraints

- **Convex has no joins** — The previous performance query requires multi-table traversal: `workoutExercises` (by_exerciseId index) → fetch each workout → check userId + status === "completed" → fetch sets for matching workoutExerciseId. This is O(N) where N = total workout-exercise rows for that exercise across all users.
- **No `userId` on `workoutExercises`** — The `workoutExercises` table doesn't have a userId field, so we can't filter by user at the index level. We must traverse to the parent workout to check ownership. For the previous performance query, this means fetching workout docs for each matching workoutExercise. If this becomes a perf issue, could add a denormalized `userId` to `workoutExercises`, but that's a schema change — avoid for now.
- **`by_exerciseId` index on `workoutExercises`** — This index exists and returns all workoutExercises for a given exerciseId across all users and all workouts. Must filter to the current user's completed workouts in-memory.
- **SetRow local state pattern (D021)** — New inputs (RPE, tempo, notes) must follow the same local-state-with-onBlur-save pattern. Don't introduce different state management.
- **SetData interface duplication** — The `SetData` interface is copy-pasted in 3 files. When adding rpe/tempo/notes, all 3 must be updated. Consider extracting to a shared type, but keep it simple — a local type in each file is the existing convention.
- **Tempo format** — Tempo is stored as a string (e.g., "3-1-2-0" for 3s eccentric, 1s pause, 2s concentric, 0s pause). Input validation is optional for S03 — accept freeform text, display as-is. Structured parsing can come later.

## Common Pitfalls

- **Forgetting to extend `updateSet` alongside `logSet`** — Both mutations need the new args. If `logSet` saves RPE but `updateSet` can't modify it, users can never correct a value.
- **Previous performance query scanning too broadly** — The `by_exerciseId` index returns results for ALL users. Must filter by userId (via workout lookup) and status === "completed". Without careful early-termination (finding the most recent first), this could scan a lot of docs. Strategy: query workoutExercises by exerciseId, traverse to workouts, filter for user's completed ones, sort by completedAt desc, take first.
- **Superset group ID uniqueness** — `supersetGroupId` is a string, not a Convex ID. Use a simple scheme like `crypto.randomUUID()` client-side or a timestamp-based ID. Don't overthink this — it's a local grouping identifier within a single workout.
- **SetData interface drift** — The interface is duplicated in 3 files. Missing the update in one file causes TypeScript errors or silent data omission. Consider extracting a shared type but don't block on it.
- **RPE validation bounds** — RPE is 1-10 scale. Validate in the mutation (clamp or reject out-of-range values). Don't rely on client-side validation alone.
- **Previous performance for first-time exercises** — The query must gracefully return null/empty when the user has never done this exercise before. UI must handle this case.

## Open Risks

- **Previous performance query performance at scale** — For popular exercises (e.g., bench press), the `by_exerciseId` index will return workoutExercises from many users. In a multi-user app, this scan grows linearly with total user count. Acceptable for M001 (single-user focus), but may need a compound index or denormalization for M002+. Flag for DECISIONS.md if implementation shows > 100ms query times.
- **Superset UX complexity** — Creating/managing superset groups needs clear UX. Two approaches: (a) explicit "Create Superset" button that groups selected exercises, or (b) drag-to-group. Approach (a) is simpler and fits the clean/minimal design language (D007). Drag-to-group is more discoverable but significantly more complex. Recommend approach (a) for S03.
- **Tempo input format ambiguity** — Users might enter "3120", "3-1-2-0", "3/1/2/0", or "slow". Freeform string avoids the problem for now but makes future analytics harder. Accept any string for S03; consider structured input in S06 mobile or later.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (121 installs) | available — useful for idiomatic patterns |
| Convex | `get-convex/agent-skills@function-creator` (110 installs) | available — could help with mutation/query creation |
| Convex | `get-convex/agent-skills@schema-builder` (105 installs) | available — not needed (schema already done) |

None are critical for S03 since the patterns are established from S01/S02. The `convex-helpers-guide` could be useful for optimizing the previous performance query if the naive approach is too slow.

## Sources

- Convex docs on indexes and multi-table traversal (source: [Convex Reading Data](https://docs.convex.dev/database/reading-data))
- Existing codebase: `convex/schema.ts`, `convex/sets.ts`, `convex/workoutExercises.ts`, `convex/testing.ts`, `scripts/verify-s02.ts`
- S02 summary forward intelligence on SetRow patterns and ExercisePicker limitations
- Decisions register (D003, D006, D007, D021) for weight storage, tracking depth, design language, and input patterns
