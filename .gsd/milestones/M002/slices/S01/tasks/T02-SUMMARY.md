---
id: T02
parent: S01
milestone: M002
provides:
  - PR detection logic (weight/volume/reps) inside logSet mutation
  - personalRecords.ts with getWorkoutPRs and getPersonalRecords auth-gated queries
  - Shared prDetection.ts helper used by both logSet and testLogSet
  - testLogSetWithPR test helper returning { setId, prs }
  - logSet now returns { setId, prs } instead of bare setId
key_files:
  - packages/backend/convex/lib/prDetection.ts
  - packages/backend/convex/personalRecords.ts
  - packages/backend/convex/sets.ts
  - packages/backend/convex/testing.ts
key_decisions:
  - Extracted PR detection into shared lib/prDetection.ts rather than inlining in sets.ts — both logSet (auth-gated) and testLogSet (test helper) call the same detectAndStorePRs function
  - testLogSet still returns bare setId for backward compat with existing verify scripts (S02–S05); testLogSetWithPR returns { setId, prs } for PR-specific verification
  - PR detection is wrapped in try/catch inside logSet — failures are logged but never break set logging
  - Volume PR uses cumulative session volume (all non-warmup sets for the workoutExercise) not just the current set
  - Rep PR requires weight > 0 per D049 ("most reps in a single working set regardless of weight" but still needs to be a weighted set)
patterns_established:
  - Shared lib/ helpers in convex/lib/ for cross-cutting mutation logic (prDetection.ts)
  - testLogSet backward compat via _testLogSetCore internal function + separate testLogSetWithPR export
observability_surfaces:
  - logSet returns { setId, prs: { weight?: boolean, volume?: boolean, reps?: boolean } } — callers see which PRs triggered
  - PR detection errors logged via console.error("[PR Detection] Error:") but non-fatal
  - personalRecords table queryable in Convex dashboard at http://127.0.0.1:6790
  - getWorkoutPRs and getPersonalRecords queries expose stored PR state
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Implement PR detection logic inside logSet mutation

**Added weight/volume/reps PR detection inside logSet with Epley formula, session volume totals, and upsert into personalRecords table — all 12 verify checks pass with zero regressions.**

## What Happened

Created `convex/lib/prDetection.ts` with a `detectAndStorePRs` helper that encapsulates all PR detection logic: weight PR via Epley formula (`weight × (1 + reps/30)`, skips >15 reps), volume PR via cumulative session working-set volume, and rep PR for highest single-set reps. The helper is called from both `logSet` in `sets.ts` and `testLogSet` in `testing.ts`.

Created `convex/personalRecords.ts` with two auth-gated queries: `getWorkoutPRs` (joins exercise names) and `getPersonalRecords` (returns current bests per type for an exercise).

Updated `logSet` to return `{ setId, prs }` with PR detection wrapped in try/catch. Updated `testing.ts` with a shared `_testLogSetCore` internal function — `testLogSet` returns bare setId (backward compat), `testLogSetWithPR` returns `{ setId, prs }`.

## Verification

- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — **12/12 checks pass** (PR-01 through PR-11 plus PR-08b)
- `pnpm turbo typecheck --force` — **0 errors** across all 3 packages (backend, web-app, native-app)
- `npx tsx packages/backend/scripts/verify-s02.ts` — **15/15 pass** (no regression)
- `npx tsx packages/backend/scripts/verify-s05.ts` — **8/8 pass** (no regression)

## Diagnostics

- Query `personalRecords` table in Convex dashboard by userId+exerciseId
- Use `getPersonalRecords(exerciseId)` to inspect stored PR state per exercise
- Use `getWorkoutPRs(workoutId)` to see PRs for a specific workout
- PR detection errors appear as `[PR Detection] Error:` in Convex function logs

## Deviations

- The verify script already works with `testLogSet` (queries PRs separately after logging sets) — did not need to update verify-s01-m02.ts to use `testLogSetWithPR`. Still created `testLogSetWithPR` as planned for future use.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/lib/prDetection.ts` — **new** — Shared PR detection helper with Epley formula, volume/rep PR logic
- `packages/backend/convex/personalRecords.ts` — **new** — Auth-gated getWorkoutPRs and getPersonalRecords queries
- `packages/backend/convex/sets.ts` — Extended logSet with PR detection, returns `{ setId, prs }`
- `packages/backend/convex/testing.ts` — Added testLogSetWithPR, integrated PR detection into testLogSet via shared _testLogSetCore
