---
id: T02
parent: S05
milestone: M006
provides:
  - Revalidated the live backend verification surface, proved the env-contract diagnostic seam still emits stable failure signals, and confirmed the full M003–M005 staged sweep plus backend typecheck are green without backend code changes.
key_files:
  - .gsd/milestones/M006/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S05/S05-PLAN.md
  - .gsd/KNOWLEDGE.md
  - .gsd/STATE.md
key_decisions:
  - Did not touch backend domain/helper code because the only previously failing seam (`verify-env-contract.ts`) no longer reproduced; treated T02 as a truthful rerun-and-close task instead of inventing a code fix.
patterns_established:
  - When a previously failing verification seam self-resolves, prove the diagnostic path still works with the script’s failure fixture, then rerun the staged sweep and update the recorded baseline instead of forcing a code change.
observability_surfaces:
  - packages/backend/scripts/verify-env-contract.ts
  - packages/backend/scripts/verify-seed-data.ts
  - packages/backend/scripts/verify-s01-m03.ts through packages/backend/scripts/verify-s03-m05.ts
  - pnpm turbo run typecheck --filter=@packages/backend
  - .gsd/milestones/M006/slices/S05/tasks/T02-SUMMARY.md
duration: 25m
verification_result: passed
completed_at: 2026-03-16T15:16:00+01:00
blocker_discovered: false
---

# T02: Repair failing backend verification seams and rerun the staged sweep

**Revalidated the backend verification seams, proved the env-contract failure path is still inspectable, and closed the full M003–M005 sweep green without backend code changes.**

## What Happened

T01 had recorded only one failing verification seam: `packages/backend/scripts/verify-env-contract.ts` reported that `apps/web/.env.local` and `apps/native/.env` no longer mirrored `packages/backend/.env.local` for the Convex URL boundary, while the live seed probe and all nine M003–M005 runners were already green.

I started T02 by rerunning that earliest failing verifier exactly as the task plan required. The mismatch no longer reproduced. The script returned only the optional `OPENAI_API_KEY` warning for `packages/backend/.env.local`, which does not fail the contract. That meant there was no current failing backend/domain seam to repair in `convex/testing.ts`, `finishWorkoutCore.ts`, or any production module.

Because the task plan and slice observability both depended on inspectable failure state, I then validated the verifier’s failure-path surface directly with `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`. The fixture emitted the expected stable diagnostics — one `[missing-file]` line for the synthetic native env file and one `[mismatch]` line for the synthetic backend/web URL drift — confirming that the script still exposes localized, sanitized error text even though the live repo state is now green.

With the only formerly failing seam cleared and its diagnostics still intact, I reran `verify-seed-data.ts`, then the entire staged M003–M005 sweep in dependency order, followed by backend typecheck. Every runner passed again:

- M003: `verify-s01-m03.ts` 12/12, `verify-s02-m03.ts` 15/15, `verify-s03-m03.ts` 15/15 → 42/42
- M004: `verify-s01-m04.ts` 12/12, `verify-s02-m04.ts` 16/16, `verify-s03-m04.ts` 12/12 → 40/40
- M005: `verify-s01-m05.ts` 12/12, `verify-s02-m05.ts` 10/10, `verify-s03-m05.ts` 19/19 → 41/41
- `pnpm turbo run typecheck --filter=@packages/backend` → passed

No cleanup leakage appeared during the reruns, so there was no truthful code seam to change. I updated the slice plan observability requirement earlier in the task, appended a knowledge entry for this self-resolving verifier pattern, and recorded the rerun evidence here.

## Verification

Ran from `/Users/kamsagent/Files/projects/workout-tracking/.gsd/worktrees/M006`:

- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` → passed the required contract checks; only emitted `[optional-missing] package=backend ... vars=OPENAI_API_KEY`.
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture` → passed and emitted the expected inspectable diagnostics:
  - `[missing-file] package=native ...`
  - `[mismatch] packages=backend,web vars=CONVEX_URL,NEXT_PUBLIC_CONVEX_URL`
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` → passed; seed query returned 144 exercises.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m03.ts` → passed 15/15.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m03.ts` → passed 15/15.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m04.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m04.ts` → passed 16/16.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m04.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m05.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m05.ts` → passed 10/10.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m05.ts` → passed 19/19.
- `pnpm turbo run typecheck --filter=@packages/backend` → passed.

## Diagnostics

- Primary inspection surfaces remain the same: `packages/backend/scripts/verify-env-contract.ts`, `packages/backend/scripts/verify-seed-data.ts`, and the nine `verify-s*-m0*.ts` runners.
- If future agents suspect env-boundary drift again, rerun `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` first, then `--check-failure-fixture` to confirm the verifier still emits localized failure diagnostics before assuming product-code regression.
- The staged rerun order recorded here is the current truthful backend health check for S05.

## Deviations

- No backend production/helper code changes were needed because the only previously failing verifier no longer failed when reproduced at the start of T02.
- T02 therefore closed as a rerun-and-evidence task rather than a repair task; this was a state change in the repo/runtime, not a plan-invalidating blocker.

## Known Issues

- `packages/backend/scripts/verify-env-contract.ts` still reports `[optional-missing]` for `OPENAI_API_KEY` in `packages/backend/.env.local`, but the script intentionally treats that as non-fatal.
- The slice-plan demo text still says M005 should total 37/37, while the actual runner surface proves 41/41 (12 + 10 + 19). T02 did not rewrite that demo text.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S05/tasks/T02-SUMMARY.md` — recorded the non-reproducing seam, failure-fixture proof, rerun order, and final green verification evidence.
- `.gsd/milestones/M006/slices/S05/S05-PLAN.md` — added an explicit diagnostic verification step for stable failing-check/error-text capture.
- `.gsd/KNOWLEDGE.md` — added the S05 rule for self-resolving env-contract drift: verify the fixture diagnostics, then rerun the staged sweep instead of reopening backend code.
- `.gsd/STATE.md` — updated the current execution state after T02 completion.
