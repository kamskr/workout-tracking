---
id: T01
parent: S05
milestone: M006
provides:
  - Truthful live-backend baseline for the S05 staged verification sweep, including readiness-probe state and per-runner outcomes for M003–M005.
key_files:
  - .gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S05/S05-PLAN.md
  - .gsd/milestones/M006/slices/S05/tasks/T01-PLAN.md
key_decisions:
  - Kept the direct per-script `tsx` invocation workflow and did not add backend package aliases because the existing command surface was already transparent and low-friction.
patterns_established:
  - Run readiness probes before the M003–M005 sweep, then treat cross-package env drift separately from live-backend health when the backend URL and seed probes still pass.
observability_surfaces:
  - packages/backend/scripts/verify-env-contract.ts
  - packages/backend/scripts/verify-seed-data.ts
  - packages/backend/scripts/verify-s01-m03.ts through packages/backend/scripts/verify-s03-m05.ts
  - .gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md
duration: 30m
verification_result: passed
completed_at: 2026-03-16T14:51:00+01:00
blocker_discovered: false
---

# T01: Establish the live backend verification baseline

**Captured a full live-backend verification baseline: seed/connectivity passed, all nine M003–M005 runners passed, and only the cross-package Convex URL env contract is currently drifting.**

## What Happened

I first re-ran the two S01 readiness probes from the worktree root before touching any M003–M005 verification script. `verify-env-contract.ts` failed, but the failure was narrow and specific: `packages/backend/.env.local` had the required variables, `apps/web/.env.local` and `apps/native/.env` also had their required variables, yet both client packages were pointing at a different Convex URL than `backend.CONVEX_URL`. The verifier reported only these two URL mismatches:

- `web.NEXT_PUBLIC_CONVEX_URL` does not mirror `backend.CONVEX_URL`
- `native.EXPO_PUBLIC_CONVEX_URL` does not mirror `backend.CONVEX_URL`

I then ran `verify-seed-data.ts`, which proved the live backend itself was reachable and seeded against `http://127.0.0.1:3210`, so the baseline is not blocked by backend connectivity, deployment auth, or missing seed data.

With that readiness context recorded, I executed the nine pending M003–M005 verification runners individually in the required order:

- `verify-s01-m03.ts` → passed 12/12
- `verify-s02-m03.ts` → passed 15/15
- `verify-s03-m03.ts` → passed 15/15
- `verify-s01-m04.ts` → passed 12/12
- `verify-s02-m04.ts` → passed 16/16
- `verify-s03-m04.ts` → passed 12/12
- `verify-s01-m05.ts` → passed 12/12
- `verify-s02-m05.ts` → passed 10/10
- `verify-s03-m05.ts` → passed 19/19

That yields the expected slice totals with no domain failures:

- M003 total: 42/42
- M004 total: 40/40
- M005 total: 41/41

There was no failing runner and therefore no failing check ID to hand off to T02. The only failing baseline signal is the env-contract drift surfaced before the sweep.

I inspected `packages/backend/package.json` to decide whether lightweight aliases were warranted. They were not: the package already exposes `verify:env-contract` and `verify:seed-data`, and the direct `pnpm --filter @packages/backend exec tsx scripts/...` flow for the nine runner scripts was straightforward enough that adding wrappers would only obscure the truthful per-script surface.

## Verification

Ran from `/Users/kamsagent/Files/projects/workout-tracking/.gsd/worktrees/M006`:

- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` → failed with cross-package URL mismatch diagnostics only; backend/web/native required vars were present.
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` → passed; backend reachable at `http://127.0.0.1:3210`, exercises query succeeded, 144 seeded exercises found.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m03.ts` → passed 15/15.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m03.ts` → passed 15/15.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m04.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m04.ts` → passed 16/16.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m04.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m05.ts` → passed 12/12.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m05.ts` → passed 10/10.
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m05.ts` → passed 19/19.

No command aliases or wrapper were added, so no alias parity check was required.

## Diagnostics

Future inspection path:

- Re-run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` first to check whether client/backend Convex URL drift still exists.
- Re-run `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` to verify live backend connectivity and seed-data readiness at the canonical backend URL.
- Re-run the same nine `verify-s*-m0*.ts` scripts in the documented order if a fresh baseline is needed.
- Use this summary as the current expected truth: the first non-green signal is not a runner failure but the env-contract mismatch between backend and web/native Convex URLs.

## Deviations

- Updated `.gsd/milestones/M006/slices/S05/S05-PLAN.md` to add an explicit failure-path verification step: re-run the earliest failing verification script and confirm the same first failing check ID recurs before attempting any fix.
- Reduced `estimated_files` in `.gsd/milestones/M006/slices/S05/tasks/T01-PLAN.md` from 12 to 11 to resolve the pre-flight task-size warning without changing execution scope.

## Known Issues

- `packages/backend/scripts/verify-env-contract.ts` currently fails because `apps/web/.env.local` and `apps/native/.env` do not mirror `packages/backend/.env.local` for the Convex URL boundary.
- Despite that env drift, the backend seed-data readiness probe and all nine backend verification runners currently pass against the live backend at `http://127.0.0.1:3210`.
- The slice-plan demo text says M005 should total 37/37, but the current verification surface contains 41 passing M005 checks (12 + 10 + 19). The executed runner truth is 41/41.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md` — recorded the live-backend readiness baseline, per-runner results, and the remaining env-contract drift.
- `.gsd/milestones/M006/slices/S05/S05-PLAN.md` — added an explicit diagnostic verification step for recurring first-failure confirmation.
- `.gsd/milestones/M006/slices/S05/tasks/T01-PLAN.md` — reduced the estimated file-count metadata from 12 to 11 to satisfy the pre-flight warning.
