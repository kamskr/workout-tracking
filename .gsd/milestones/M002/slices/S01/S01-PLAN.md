# S01: Personal Records — Detection & Live Notification

**Goal:** PR detection runs inside `logSet`, stores results in a `personalRecords` table, and surfaces 🏆 badges in realtime on the web active workout screen.
**Demo:** User logs a set during a web workout and sees a 🏆 badge appear in realtime when they hit a new 1RM, volume PR, or rep PR — verified by backend script and live browser demo.

## Must-Haves

- `personalRecords` table in Convex schema with `by_userId_exerciseId` and `by_workoutId` indexes
- `by_userId_completedAt` composite index added to `workouts` table (S02/S03 dependency)
- PR detection logic inside `logSet` mutation: weight PR (estimated 1RM via Epley), volume PR (session total), rep PR (most reps in a single working set)
- Warmup sets (`isWarmup: true`) do not trigger PR detection
- Sets missing weight or reps skip the relevant PR types
- `getWorkoutPRs(workoutId)` reactive query returning PRs for a workout
- `getPersonalRecords(exerciseId)` query returning current PRs for an exercise
- Test helpers in `testing.ts`: `testLogSetWithPR`, `testGetWorkoutPRs`, `testGetPersonalRecords`, `testCleanup` updated to cascade-delete `personalRecords`
- `verify-s01-m02.ts` script with ≥10 checks proving PR detection correctness
- 🏆 badge on `WorkoutExerciseItem` when a PR exists for that exercise in the active workout
- Bootstrap behavior: if no `personalRecords` exist for an exercise, the first qualifying set becomes the baseline PR

## Proof Level

- This slice proves: integration (backend PR detection + reactive web UI)
- Real runtime required: yes — Convex dev backend + Next.js web app
- Human/UAT required: no — backend verification script + browser assertion on PR badge

## Verification

- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — ≥10 checks covering:
  - Weight PR detected on first set (baseline)
  - Weight PR updated when a heavier estimated 1RM is logged
  - Volume PR detected when session total exceeds previous
  - Rep PR detected when single-set reps exceed previous
  - Warmup sets do not trigger PRs
  - Sets without weight skip weight/volume PR detection
  - PRs stored with correct setId, workoutId, achievedAt
  - `getWorkoutPRs` returns PRs for the correct workout only
  - `getPersonalRecords` returns current best per type
  - No false PR when set doesn't beat existing record
- `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- Browser verification: navigate to active workout, log a set that triggers a weight PR, verify 🏆 badge appears on the exercise card
- All M001 verify scripts still pass (no regression)

## Observability / Diagnostics

- Runtime signals: `logSet` mutation returns `{ setId, prs: { weight?: boolean, volume?: boolean, reps?: boolean } }` — the caller (and any future debugging) can see exactly which PRs were triggered per set log
- Inspection surfaces: `getPersonalRecords(exerciseId)` query exposes stored PR state per exercise; `getWorkoutPRs(workoutId)` exposes PRs per workout — both are standard Convex reactive queries inspectable via Convex dashboard
- Failure visibility: PR detection failures inside `logSet` are non-fatal — errors are caught and logged, set logging still succeeds. The `personalRecords` table is directly queryable in the Convex dashboard to audit stored PRs.
- Redaction constraints: none — no secrets or PII in PR data

## Integration Closure

- Upstream surfaces consumed: `sets.ts` → `logSet` mutation, `schema.ts`, `testing.ts`, `WorkoutExerciseItem.tsx`, existing verify script pattern
- New wiring introduced in this slice: `logSet` mutation extended with PR detection → `personalRecords` table writes → `getWorkoutPRs` reactive query → `WorkoutExerciseItem` 🏆 badge via `useQuery`
- What remains before the milestone is truly usable end-to-end: S02 (progress charts), S03 (volume analytics/heatmap/summaries), S04 (mobile port)

## Tasks

- [x] **T01: Add personalRecords schema, test helpers, and verification script skeleton** `est:45m`
  - Why: Establishes the data layer and test infrastructure. The verify script starts with all checks failing — subsequent tasks make them pass. Test helpers enable all backend verification without auth tokens.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s01-m02.ts`
  - Do: Add `personalRecords` table to schema (D044). Add `by_userId_completedAt` index to `workouts` table. Add test helpers: `testGetWorkoutPRs`, `testGetPersonalRecords`. Update `testCleanup` to cascade-delete `personalRecords`. Write verify script with ≥10 checks that will initially fail (PR detection not yet implemented). Run `pnpm turbo typecheck --force` to confirm schema compiles.
  - Verify: `pnpm turbo typecheck --force` passes with 0 errors. Verify script runs but checks fail (expected — PR detection not implemented yet). Schema deploys to Convex dev.
  - Done when: `personalRecords` table exists in schema, `testCleanup` deletes PR records, verify script is runnable with defined checks, typecheck passes.

- [x] **T02: Implement PR detection logic inside logSet mutation** `est:1h`
  - Why: Core slice risk — PR detection inside the mutation path. This is the highest-risk piece: computing 1RM via Epley, summing session volume, comparing against stored PRs, and upserting without degrading set logging performance.
  - Files: `packages/backend/convex/sets.ts`, `packages/backend/convex/personalRecords.ts`
  - Do: Create `personalRecords.ts` with `getWorkoutPRs` query and `getPersonalRecords` query. In `sets.ts` `logSet`: after set insert, fetch the exercise doc to check type. Skip PR detection for cardio/stretch types and warmup sets. Compute weight PR (Epley: `weight × (1 + reps/30)`, actual weight for 1 rep, skip if >15 reps — D045). Compute volume PR (sum `weight × reps` for all sets in this workoutExercise including the new one, compare against stored volume PR). Compute rep PR (if `reps` exceeds stored rep PR value for this exercise). For each PR type: query `personalRecords` by `by_userId_exerciseId` filtered by type, compare, upsert if new PR. Return `{ setId, prs }` from `logSet`. Update `testLogSet` in `testing.ts` to include the same PR detection logic (or extract a shared helper).
  - Verify: Run `npx tsx packages/backend/scripts/verify-s01-m02.ts` — majority of checks should now pass. `pnpm turbo typecheck --force` passes.
  - Done when: Weight PR, volume PR, and rep PR detection work correctly inside `logSet`. Warmup sets and missing weight/reps are handled. Verify script passes ≥8 checks.

- [x] **T03: Wire PR badge into web WorkoutExerciseItem and verify end-to-end** `est:45m`
  - Why: Closes the integration loop — the reactive query drives the UI badge, proving the full mutation → query → subscription → render chain works. Also runs all M001 verify scripts to confirm no regression.
  - Files: `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`, `packages/backend/convex/personalRecords.ts`
  - Do: In `WorkoutExerciseItem`, add `useQuery(api.personalRecords.getWorkoutPRs, { workoutId })` — get workoutId from the workout context (may need to thread it through props or add it to the data shape). Filter PRs for the current exerciseId. If PRs exist, render a 🏆 badge next to the exercise name showing PR types (e.g. "🏆 Weight PR"). Style per D007 (clean/minimal). Verify all M001 verify scripts still pass. Run the full verify-s01-m02.ts script.
  - Verify: `npx tsx packages/backend/scripts/verify-s01-m02.ts` — all checks pass. `pnpm turbo typecheck --force` — 0 errors. All M001 verify scripts pass. Start web dev server, navigate to active workout, log a heavy set, confirm 🏆 badge appears on the exercise card.
  - Done when: 🏆 badge appears in realtime during a web workout when a PR is hit. All verify scripts pass (M001 + M002/S01). TypeScript compiles with 0 errors.

## Files Likely Touched

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/sets.ts`
- `packages/backend/convex/personalRecords.ts` (new)
- `packages/backend/convex/testing.ts`
- `packages/backend/scripts/verify-s01-m02.ts` (new)
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`
