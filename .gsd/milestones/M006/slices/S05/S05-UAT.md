# S05: Backend Testing & Bug Fixes — UAT

**Milestone:** M006
**Written:** 2026-03-16

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S05 is a backend verification slice. The user-facing proof is the executed command ledger, stable diagnostic surface, and updated requirement contract rather than a manual UI walkthrough.

## Preconditions

- Worktree root is `/Users/kamsagent/Files/projects/workout-tracking/.gsd/worktrees/M006`.
- Live Convex deployment is reachable from `packages/backend/.env.local`.
- Backend seed data has already been loaded.
- Backend package dependencies resolve so `pnpm --filter @packages/backend exec tsx ...` and `pnpm turbo run typecheck --filter=@packages/backend` can run.

## Smoke Test

Run `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` and confirm it exits 0 with the seeded exercise count present before trusting any downstream M003–M005 verification result.

## Test Cases

### 1. Reconfirm readiness and diagnostic seam

1. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`.
2. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`.
3. Run `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`.
4. **Expected:** the live env-contract check passes its required contract, the failure fixture emits localized `[missing-file]` and `[mismatch]` diagnostics, and the seed-data probe exits 0 with the live backend reachable and seeded.

### 2. Reconfirm the full M003–M005 staged sweep

1. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts`.
2. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m03.ts`.
3. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m03.ts`.
4. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m04.ts`.
5. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m04.ts`.
6. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m04.ts`.
7. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m05.ts`.
8. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m05.ts`.
9. Run `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m05.ts`.
10. Run `pnpm turbo run typecheck --filter=@packages/backend`.
11. **Expected:** every command exits 0; the truthful totals are M003 42/42, M004 40/40, and M005 41/41; backend typecheck also exits 0.

## Edge Cases

### Env drift self-resolves between reruns

1. If `verify-env-contract.ts` was previously failing but now passes, do not assume the diagnostic surface regressed.
2. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`.
3. **Expected:** fixture diagnostics still appear in sanitized, localized form, proving the failure path remains inspectable even though the live repo state is green.

## Failure Signals

- `verify-seed-data.ts` classifies env, connectivity, auth/deployment, or empty-seed failure instead of returning the expected live seed count.
- Any `verify-s*-m0*.ts` runner exits non-zero or reports a failing stable check ID.
- Backend typecheck exits non-zero.
- The enduring artifacts (`.gsd/REQUIREMENTS.md`, roadmap, slice summary, state) claim totals or commands that do not match the rerun output.

## Requirements Proved By This UAT

- R015 — live 12/12 proof from `verify-s01-m03.ts`.
- R016 — live 15/15 proof from `verify-s02-m03.ts`.
- R017 — live 15/15 proof from `verify-s03-m03.ts`.
- R018 — live 12/12 proof from `verify-s01-m04.ts`.
- R019 — live 16/16 proof from `verify-s02-m04.ts`.
- R020 — live 12/12 proof from `verify-s03-m04.ts`.
- R021 — live 41/41 M005 backend proof from the three session runners.
- R032 — full live backend verification proof from readiness probes, failure-fixture diagnostic seam, staged sweep, and backend typecheck.

## Not Proven By This UAT

- R029 end-to-end dev-stack proof on Expo/mobile runtime.
- R030 and R031 live browser proof for landing/app-shell routes while Clerk publishable-key middleware still blocks truthful page assertions.
- Two-browser/two-device manual UX proof for collaborative sessions; S05 proves the backend contract, not the final human realtime experience.

## Notes for Tester

Use the slice summary and T01/T02 task summaries as the authoritative command ledger if any rerun output looks surprising. The stale 37-check M005 estimate should be ignored; the runner truth in this worktree is 41 M005 checks.
