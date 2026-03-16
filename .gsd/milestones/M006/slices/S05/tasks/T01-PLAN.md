---
estimated_steps: 5
estimated_files: 11
---

# T01: Establish the live backend verification baseline

**Slice:** S05 — Backend Testing & Bug Fixes
**Milestone:** M006

## Description

Prove that S05 is operating against a truthful live backend before any bug-fixing starts. Re-run the S01 readiness probes using the canonical backend env boundary, then execute the nine pending M003–M005 verification runners individually in dependency order so the first failing script and check ID are unambiguous. If repeatability is painful, add only the lightest package-level command aliasing needed to rerun scripts without hiding per-script truth.

## Steps

1. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` and `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` from the worktree root, recording whether the backend contract is healthy or blocked by env/connectivity/auth-or-deployment/seed-data issues.
2. Execute the nine verification runners one by one in this order: `verify-s01-m03.ts`, `verify-s02-m03.ts`, `verify-s03-m03.ts`, `verify-s01-m04.ts`, `verify-s02-m04.ts`, `verify-s03-m04.ts`, `verify-s01-m05.ts`, `verify-s02-m05.ts`, `verify-s03-m05.ts`; capture each script’s exit status, reported totals, and the first failing check ID if it does not pass.
3. Inspect `packages/backend/package.json` only if rerunning these commands is materially clumsy, and add thin aliases or a wrapper script only if they preserve per-script execution and don’t collapse the staged triage signal into a black box.
4. If command-surface changes were made, run the new alias/wrapper against at least one verification script and confirm it faithfully invokes the same runner output.
5. Summarize the baseline for T02: readiness-probe state, pass/fail status for each runner, earliest failing script/check, and whether any command-surface improvement was introduced.

## Must-Haves

- [ ] The two readiness probes are rerun before any M003–M005 verification script so environment drift is ruled in or out first.
- [ ] All nine pending verification scripts are executed individually in the documented order, with enough recorded detail to identify the earliest failing script/check without rerunning discovery.
- [ ] Any new package command surface remains transparent — no aggregate command that hides which script failed first.

## Verification

- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m03.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m03.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m04.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m04.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m04.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m05.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m05.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m05.ts`
- If aliases are added: the new alias/wrapper command plus one direct `tsx` invocation to confirm output parity.

## Observability Impact

- Signals added/changed: potentially lightweight `package.json` verification aliases only; no new logging format unless a wrapper is added.
- How a future agent inspects this: rerun the readiness probes and the same nine script commands from the worktree root; compare first failing script/check against the baseline captured in this task’s summary.
- Failure state exposed: backend blockers are surfaced as readiness phases before domain debugging begins; script-level failures remain visible as individual runner exits and check IDs.

## Inputs

- `packages/backend/scripts/verify-env-contract.ts` — canonical env-drift verifier established in S01.
- `packages/backend/scripts/verify-seed-data.ts` — authoritative backend reachability + seed-data probe from S01.
- `packages/backend/scripts/verify-s01-m03.ts` through `packages/backend/scripts/verify-s03-m05.ts` — the existing live-validation surface for R015–R021.
- `packages/backend/package.json` — current script surface; only touch it if it improves truthful reruns.
- S01 summary forward intelligence — reuse the backend env boundary and readiness probes before blaming product code.

## Expected Output

- `packages/backend/package.json` — optional minimal alias/wrapper entries that make reruns easier without obscuring per-script truth.
- `.gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md` — baseline record of readiness probe results, all nine runner outcomes, and the earliest failing script/check that T02 must attack.
