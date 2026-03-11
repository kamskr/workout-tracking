---
estimated_steps: 5
estimated_files: 4
---

# T02: Implement PR detection logic inside logSet mutation

**Slice:** S01 — Personal Records — Detection & Live Notification
**Milestone:** M002

## Description

Implement the core PR detection logic: when `logSet` inserts a set, check whether it constitutes a new weight PR (estimated 1RM via Epley), volume PR (session exercise total), or rep PR (most reps in a single working set). Upsert into `personalRecords` when a new PR is detected. Create the `personalRecords.ts` Convex file with `getWorkoutPRs` and `getPersonalRecords` queries. Update `testLogSet` in testing.ts to include the same PR detection logic so the verify script can exercise PR detection without auth.

## Steps

1. **Create `packages/backend/convex/personalRecords.ts`** — Define two queries:
   - `getWorkoutPRs({ workoutId })`: query `personalRecords` by `by_workoutId`, join exercise name from exercises table. Return `{ type, value, exerciseId, exerciseName, setId, achievedAt }[]`. Auth-gated via `getUserId`.
   - `getPersonalRecords({ exerciseId })`: query `personalRecords` by `by_userId_exerciseId` filtered to the current user's records for this exercise. Return `{ type, value, setId, workoutId, achievedAt }[]`. Auth-gated.

2. **Extract PR detection into a shared helper function** — Create a helper (e.g. `detectAndStorePRs`) in `sets.ts` or a new `lib/prDetection.ts` that both `logSet` and `testLogSet` can call. The function takes `ctx`, `userId`, `exerciseId`, `workoutId`, `setId`, the set data (weight, reps, isWarmup), and the `existingSets` array. It:
   - Skips entirely if `isWarmup` is true
   - Fetches the exercise doc to check type — skips if cardio or stretch
   - **Weight PR**: If weight and reps are defined and reps ≤ 15, compute estimated 1RM via Epley (`weight × (1 + reps/30)`; for 1 rep, actual weight). Query `personalRecords` for `by_userId_exerciseId` where type=weight. If no existing record or new value > existing value, upsert.
   - **Volume PR**: If weight and reps are both defined, sum `weight × reps` across all sets in `existingSets` (including current) that are not warmup. Query stored volume PR, upsert if new total exceeds it.
   - **Rep PR**: If reps is defined and weight > 0 and not warmup, compare `reps` against stored rep PR. Upsert if higher (D049: "most reps in a single working set regardless of weight").
   - Returns `{ weight?: boolean, volume?: boolean, reps?: boolean }` indicating which PRs were detected.

3. **Integrate PR detection into `logSet` in `sets.ts`** — After the set insert, call the helper. Wrap in try/catch so PR detection failure doesn't break set logging. Change `logSet` return from just `setId` to `{ setId, prs }`.

4. **Update `testLogSet` in `testing.ts`** — Call the same shared PR detection helper after inserting the set, so verify scripts exercise the full PR detection path. Update return type to `{ setId, prs }`. **Important**: Check if existing verify scripts (verify-s02 through verify-s05) depend on `testLogSet` returning just a setId. If so, ensure backward compatibility — either return an object where `.toString()` works or update callers. The safest approach: keep `testLogSet` returning the setId only, and create `testLogSetWithPR` that returns `{ setId, prs }`. Update verify-s01-m02.ts to use `testLogSetWithPR`.

5. **Run verification** — Execute `npx tsx packages/backend/scripts/verify-s01-m02.ts` and `pnpm turbo typecheck --force`. Fix any issues until the majority of checks pass.

## Must-Haves

- [ ] `personalRecords.ts` with `getWorkoutPRs` and `getPersonalRecords` queries
- [ ] PR detection helper callable from both `logSet` and test helpers
- [ ] Weight PR detection using Epley formula (D045), skipping >15 reps
- [ ] Volume PR detection using session exercise total
- [ ] Rep PR detection (most reps in a single working set)
- [ ] Warmup sets skipped
- [ ] Cardio/stretch exercises skipped for weight PR
- [ ] Sets without weight or reps skip relevant PR types
- [ ] `logSet` returns `{ setId, prs }` without breaking existing callers
- [ ] Existing M001 verify scripts still pass

## Verification

- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — ≥8 checks pass
- `pnpm turbo typecheck --force` — 0 errors
- `npx tsx packages/backend/scripts/verify-s02.ts` — still passes (no regression)
- `npx tsx packages/backend/scripts/verify-s05.ts` — still passes (no regression)

## Observability Impact

- Signals added/changed: `logSet` now returns `{ setId, prs: { weight?: boolean, volume?: boolean, reps?: boolean } }` — callers can see which PRs were triggered. PR detection errors are caught and logged but don't break set logging.
- How a future agent inspects this: Query `personalRecords` table in Convex dashboard by userId+exerciseId. Use `getPersonalRecords` query to see current bests. Use `getWorkoutPRs` to see PRs for a specific workout.
- Failure state exposed: If PR detection fails silently (caught error), the set is still logged but no PR record is created. The absence of expected PR records in `personalRecords` signals a detection failure.

## Inputs

- `packages/backend/convex/schema.ts` — personalRecords table from T01
- `packages/backend/convex/testing.ts` — test helpers from T01
- `packages/backend/scripts/verify-s01-m02.ts` — verify script from T01
- `packages/backend/convex/sets.ts` — existing `logSet` mutation
- S01-RESEARCH.md — PR detection logic, Epley formula, edge cases

## Expected Output

- `packages/backend/convex/personalRecords.ts` — new file with `getWorkoutPRs` and `getPersonalRecords` queries
- `packages/backend/convex/sets.ts` — `logSet` extended with PR detection, returns `{ setId, prs }`
- `packages/backend/convex/testing.ts` — `testLogSetWithPR` helper added
- `packages/backend/scripts/verify-s01-m02.ts` — updated if needed to use `testLogSetWithPR`
