---
estimated_steps: 4
estimated_files: 0
---

# T04: TypeScript compilation gate and regression verification

**Slice:** S03 — Integration Hardening & Verification
**Milestone:** M005

## Description

Final structural verification that all S03 changes compile cleanly across all 3 packages, no regressions introduced to S01/S02 verification scripts, and all expected exports/functions/data-attributes are in place. This is the gating check before the slice can be marked complete.

## Steps

1. **Backend compilation** — Run `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` and confirm 0 errors. This validates `finishWorkoutCore.ts`, the refactored `workouts.ts`, the modified `sessions.ts`, the extended `testing.ts`, and all 3 verification scripts.

2. **Web compilation** — Run `pnpm -C apps/web exec tsc --noEmit` and confirm 0 errors. This validates the modified workouts page with the "Start Group Session" button.

3. **Native compilation** — Run `pnpm -C apps/native exec tsc --noEmit` and confirm 0 new errors beyond the 38 pre-existing TS2307 for convex/react.

4. **Structural spot-checks** — Verify: (a) `finishWorkoutCore` is exported from `lib/finishWorkoutCore.ts`, (b) `sessions.ts` still has 15 function exports, (c) `testing.ts` has ≥94 exports (92 baseline + 2 new), (d) all 3 verify scripts (s01, s02, s03) exist and define their expected check counts, (e) `data-start-group-session` attribute present on workouts page, (f) `verify-s03-m05.ts` defines 15 checks with SS- prefix.

## Must-Haves

- [ ] Backend: 0 TypeScript errors
- [ ] Web: 0 TypeScript errors
- [ ] Native: 0 new TypeScript errors
- [ ] All 3 M05 verification scripts compile
- [ ] `finishWorkoutCore` exported from lib
- [ ] `sessions.ts` has 15 exports (unchanged count — no new functions added)
- [ ] Structural spot-checks all pass

## Verification

- `pnpm -C packages/backend exec tsc --noEmit -p convex/tsconfig.json` — exit code 0
- `pnpm -C apps/web exec tsc --noEmit` — exit code 0
- `pnpm -C apps/native exec tsc --noEmit 2>&1 | grep -c 'error TS'` — ≤38 (pre-existing)
- `ls packages/backend/scripts/verify-s0{1,2,3}-m05.ts` — all exist
- `grep -c 'export' packages/backend/convex/lib/finishWorkoutCore.ts` — ≥1
- `grep -c 'SS-' packages/backend/scripts/verify-s03-m05.ts` — ≥15

## Observability Impact

- Signals added/changed: None (read-only verification task)
- How a future agent inspects this: Run the same tsc commands to verify compilation status at any point.
- Failure state exposed: None

## Inputs

- T01 output: `finishWorkoutCore.ts`, refactored `workouts.ts`, modified `sessions.ts`
- T02 output: extended `testing.ts`, `verify-s03-m05.ts`
- T03 output: modified workouts page

## Expected Output

- No file changes — this is a verification-only task
- Confirmation that all compilation checks pass
- Slice ready for S03-SUMMARY.md
