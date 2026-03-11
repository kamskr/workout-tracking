# S01: Personal Records — Detection & Live Notification — Research

**Date:** 2026-03-11

## Summary

S01 adds PR detection during live workout sessions and a realtime 🏆 badge. The core work is: (1) a new `personalRecords` table in the Convex schema, (2) PR detection logic inside the `logSet` mutation that compares each new set against stored bests, (3) a reactive query that surfaces PRs for the active workout, and (4) a UI badge on the web active workout screen. The mobile UI is out of scope — it's deferred to S04.

The highest-risk aspect is PR detection inside the `logSet` mutation path. Each set log needs to compare against the user's historical bests for that exercise. Per D044, the approach is to maintain a `personalRecords` table that stores the current best for each exercise × PR type. This means the PR check inside `logSet` reads at most 3 records (one per PR type) from the `personalRecords` table — not scanning all historical sets. When a new PR is detected, the existing record is updated (or created). This keeps the mutation fast: 3 indexed lookups + conditional write, adding ~10-20ms to each `logSet` call.

Volume PR is the most complex to compute because it requires knowing total volume across all sets in the current workout for that exercise. This means reading all sibling sets for the same `workoutExerciseId` during the mutation. The existing `logSet` already does this (to compute `setNumber`), so the incremental cost is only the volume calculation on the already-fetched set list, plus reading historical volume PRs from `personalRecords`.

## Recommendation

**Approach: `personalRecords` table with inline PR detection in `logSet`, reactive query for UI subscription.**

### Schema Addition

```
personalRecords: defineTable({
  userId: v.string(),
  exerciseId: v.id("exercises"),
  type: v.union(v.literal("weight"), v.literal("volume"), v.literal("reps")),
  value: v.number(),
  setId: v.id("sets"),
  workoutId: v.id("workouts"),
  achievedAt: v.number(),
})
  .index("by_userId_exerciseId", ["userId", "exerciseId"])
  .index("by_workoutId", ["workoutId"])
```

### PR Detection Logic (inside `logSet`)

After inserting the set, compute PR candidates:

1. **Weight PR** — If `weight` is defined and > 0, compute estimated 1RM via Epley formula (D045). Compare against stored weight PR for this exercise.
2. **Volume PR** — Sum `weight × reps` for all sets in the current `workoutExerciseId` (including the just-inserted set). Compare against stored volume PR.
3. **Reps PR** — If `weight` is defined and > 0, check if `reps` at this exact weight exceeds the stored reps PR for this exercise at this weight or greater.

If any new PR is detected, upsert into `personalRecords`.

### Reactive UI

- New query: `getWorkoutPRs(workoutId)` — returns all PRs achieved during this workout, joined with exercise name. The client subscribes via `useQuery`.
- Badge component on `WorkoutExerciseItem` — when a PR exists for this exercise in the current workout, show 🏆 with PR type.
- Convex reactivity handles the realtime update automatically: `logSet` mutation inserts PR → Convex re-runs `getWorkoutPRs` → client receives updated data → badge appears.

### Index Addition

- Add `by_userId_completedAt` composite index on `workouts` table — not used directly in S01, but the roadmap boundary map specifies it as an S01 deliverable for S02/S03 consumption.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Estimated 1RM calculation | Epley formula: `weight × (1 + reps / 30)` | One-liner, well-established (D045). For 1-rep: actual weight. Skip for >15 reps. |
| Realtime client update | Convex reactive subscriptions via `useQuery` | No manual WebSocket or polling needed. Mutation inserts PR → subscribed queries re-run automatically. |
| Test data lifecycle | `testing.ts` pattern with `testUserId` arg | Established pattern from M001. Extend with PR-specific test helpers. |

## Existing Code and Patterns

- `packages/backend/convex/sets.ts` → `logSet` — **Integration point.** PR detection hooks into this mutation after the set insert. Already fetches `existingSets` for `setNumber` computation — reuse for volume PR calculation. Already calls `verifySetOwnership` which returns `{ workoutExercise, workout }` — these provide `exerciseId` and `workoutId` needed for PR detection.
- `packages/backend/convex/sets.ts` → `getPreviousPerformance` — **Pattern reference.** Traverses `workoutExercises(by_exerciseId) → workouts → sets`. PR history queries follow a similar pattern, but S01's approach avoids this traversal by storing PRs directly in `personalRecords`.
- `packages/backend/convex/testing.ts` — **Extend.** Add `testLogSetWithPR` (or extend `testLogSet` to return PR info), `testGetWorkoutPRs`, `testGetPersonalRecords` helpers. The existing `testCleanup` must cascade-delete `personalRecords` for the test user.
- `packages/backend/convex/schema.ts` — **Modify.** Add `personalRecords` table. Add `by_userId_completedAt` index to `workouts` table.
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — **Modify.** Add PR badge display. The component already has access to `data.workoutExercise.exerciseId` and the workout context. Add a `useQuery` for exercise PRs in the current workout.
- `apps/web/src/components/workouts/SetRow.tsx` — **Potential modification point.** Could show a per-set 🏆 indicator if the set triggered a PR, but the simpler approach is exercise-level badge on `WorkoutExerciseItem`.
- `packages/backend/scripts/verify-s01.ts` through `verify-s05.ts` — **Pattern for verify-s01-m02.ts.** Same structure: `ConvexHttpClient`, `check()` function, test user ID, cleanup via `testCleanup`.

## Constraints

- **`logSet` mutation must remain fast.** Each PR check adds 3 indexed reads from `personalRecords` (one per PR type). These are point lookups on `by_userId_exerciseId` index — O(1) per lookup. Volume computation reuses the already-fetched `existingSets` array. Total added cost: ~10-20ms.
- **Mutation timeout is 120 seconds.** Not a concern for PR detection (well under 1 second of added work).
- **No `exerciseType` on the set.** The set doesn't store exercise type. To determine if an exercise is cardio/stretch (where weight PRs don't apply), the mutation must fetch the exercise document. This is 1 additional `ctx.db.get()` call — acceptable.
- **Volume PR requires reading all sets in the workoutExercise.** Already done by `logSet` for `setNumber` computation. The `existingSets` array is already in memory.
- **Reps PR at a given weight requires a design choice.** "Most reps at a given weight" can mean (a) most reps in a single set at exactly that weight, or (b) most reps at that weight or higher. Option (a) is simpler and more intuitive: "You did 12 reps at 80kg — that's a PR!" The stored value is `{ weight, reps }` pairs, but the simplest approach stores just `reps` as the value with weight tracked on the set.
- **`testCleanup` must be updated.** Currently doesn't know about `personalRecords`. Must cascade-delete PR records for the test user.
- **Web-only UI in S01.** Mobile PR badges are S04 scope. The Convex backend (PR detection, queries) is shared and complete in S01.

## Common Pitfalls

- **Checking PRs against all historical sets instead of stored PR records** — Scanning all historical `workoutExercises(by_exerciseId) → sets` on every `logSet` call is O(N) where N grows with workout history. Using the `personalRecords` table as a cache of the current best makes PR detection O(1). This is the core insight of D044.
- **Volume PR race condition** — If a user logs two sets very quickly, both mutations could read the same `existingSets` count and produce incorrect volume calculations. Convex mutations are serialized per-document, so this shouldn't happen — but verify that the `existingSets` query inside `logSet` returns consistent results including any just-inserted set from a concurrent mutation.
- **False PRs on exercise type change** — If an exercise's type is changed from strength to cardio, existing weight PRs become meaningless. Edge case — not worth handling in S01, but note it.
- **PR detection on `updateSet` not just `logSet`** — If a user logs a set with 60kg × 8, then edits it to 80kg × 8, the PR should be rechecked. For S01, only detecting PRs on `logSet` (not `updateSet`) is acceptable — documented as a known gap. Full `updateSet` PR recalculation adds significant complexity (need to un-detect old PRs).
- **Warmup sets triggering PRs** — Sets with `isWarmup: true` should not trigger PR detection. Filter them out.
- **Missing weight or reps** — Sets without weight (bodyweight exercises) or reps (cardio) should skip weight PR and reps PR detection. Volume PR only applies if both weight and reps are present.

## Open Risks

- **Volume PR definition ambiguity** — "Most total volume in one exercise session" could mean (a) cumulative volume across all sets of one exercise in one workout, or (b) volume of a single set. The research recommends (a) — total across all sets — which is more meaningful and matches common fitness app behavior. But it means volume PR can only be evaluated at workout completion, not on every set. Alternative: evaluate on every set, comparing running total against stored PR. This is feasible since we already read all sibling sets.
- **Reps PR storage granularity** — Storing one "reps PR" per exercise loses the weight context. A user may PR with 12 reps at 60kg, but this shouldn't replace their record of 8 reps at 100kg. Recommended: simplify for S01 by storing reps PR as "most reps in a single working set regardless of weight." This is less precise but avoids per-weight-tier storage complexity. Can refine in a future slice.
- **PR detection on `updateSet`** — Not implemented in S01. If a user edits a set's weight/reps after logging, PRs won't be re-evaluated. This is a documented gap. The UI should show PRs based on the data at log time.
- **Existing workout data has no PRs** — Users with M001 workout history won't have any `personalRecords` entries. Their first set log for each exercise in M002 will need to scan historical bests to bootstrap PRs. Alternative: add a one-time backfill function. Recommended: handle in `logSet` — if no `personalRecords` exist for this exercise, the first set automatically becomes the PR baseline.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@function-creator` (110 installs) | available — directly relevant for writing PR detection mutations and queries |
| Convex | `get-convex/agent-skills@schema-builder` (105 installs) | available — relevant for `personalRecords` table schema addition |
| Convex | `get-convex/agent-skills@convex-helpers-guide` (121 installs) | available — general Convex patterns |
| Convex | `get-convex/agent-skills@migration-helper` (84 installs) | available — potentially useful if existing data needs backfill |

**Install recommendations:** `get-convex/agent-skills@function-creator` and `get-convex/agent-skills@schema-builder` are the most directly relevant for S01's backend work (creating the `personalRecords` table and writing PR detection logic). User decides.

## Sources

- Convex mutation handler patterns — database reads inside mutations are fully supported, same `ctx.db` API as queries (source: [Convex Mutation Functions docs](https://docs.convex.dev/functions/mutation-functions))
- Convex reactive subscriptions — `useQuery` automatically re-runs and pushes updates when underlying data changes from mutations (source: [Convex Client Libraries docs](https://docs.convex.dev/understanding))
- Existing codebase analysis — `logSet`, `getPreviousPerformance`, `testing.ts`, `schema.ts`, `WorkoutExerciseItem.tsx`, `SetRow.tsx`, `ActiveWorkout.tsx`
- Epley 1RM formula — `weight × (1 + reps/30)`, standard strength training formula (D045)
- PR storage approach — dedicated `personalRecords` table per D044
