---
id: T01
parent: S01
milestone: M006
provides:
  - Explicit package-local env contract plus an executable verifier for backend/web/native alignment
key_files:
  - packages/backend/scripts/verify-env-contract.ts
  - packages/backend/.env.local.example
  - packages/backend/package.json
  - README.md
key_decisions:
  - packages/backend/.env.local is the canonical backend env file and app env files must mirror its Convex URL
  - The env verifier reports package/file/variable names only and never prints secret values
patterns_established:
  - Cross-package env verification lives in backend scripts and includes a built-in failure fixture for inspectable diagnostics
observability_surfaces:
  - pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts
  - pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture
  - pnpm --filter @packages/backend run verify:env-contract
  - pnpm --filter @packages/backend run verify:env-contract:failure
duration: 1h 09m
verification_result: passed
completed_at: 2026-03-13T17:35:29Z
blocker_discovered: false
---

# T01: Make the env contract explicit and self-verifying

**Added a canonical backend env template, a cross-package env verifier with failure-fixture diagnostics, and setup docs that point future agents to the real package boundaries.**

## What Happened

I started by fixing the slice-plan observability gap: `S01-PLAN.md` now includes a failure-path verification step for the env-contract verifier so inspectable diagnostics are part of slice verification, not just happy-path checks.

I then verified the repo’s real env consumers. Backend verification scripts already fall back to `packages/backend/.env.local`, backend auth reads `CLERK_ISSUER_URL`, web reads `NEXT_PUBLIC_CONVEX_URL` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and native reads `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. The drift found in the task plan was real: `apps/web/.env.local` and `apps/native/.env` existed locally, but `packages/backend/.env.local` did not.

From that, I added `packages/backend/.env.local.example` as the canonical backend contract, documenting required backend variables (`CONVEX_URL`, `CLERK_ISSUER_URL`) and optional `OPENAI_API_KEY`.

I implemented `packages/backend/scripts/verify-env-contract.ts` to:

- check backend, web, and native env-file presence at their package boundaries
- assert package-specific required variable names are present
- report optional missing variables separately
- compare backend `CONVEX_URL` against web/native public Convex URLs with slash-tolerant normalization
- compare web/native Clerk publishable keys for shared-tenant alignment
- redact by design: diagnostics include only package labels, file paths, and variable names
- expose `--check-failure-fixture`, which creates a temporary broken env setup and verifies that targeted failure messages remain inspectable

I wired the verifier into `packages/backend/package.json` as `verify:env-contract` and `verify:env-contract:failure`.

During verification, the required task command initially failed because `tsx` was not installed in `@packages/backend`. I treated that as the concrete blocking cause for this task’s verification path, added `tsx` as a backend dev dependency, and re-ran the exact commands. A second failure exposed a real bug in the failure fixture (missing temp directories before writes); I fixed only that bug and confirmed the failure diagnostics worked as intended.

Finally, I updated `README.md` so setup guidance now points to `packages/backend/.env.local` as canonical for backend scripts and explains exactly how `apps/web/.env.local` and `apps/native/.env` must align to it.

## Verification

Passed for this task:

- Updated slice verification to include failure-path inspection:
  - `S01-PLAN.md` now includes `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
- Implemented verifier command and confirmed current-workspace failure is targeted:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
  - Result: fails specifically on `backend` missing `packages/backend/.env.local`
- Implemented inspectable failure-path fixture and confirmed targeted diagnostics:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
  - `pnpm --filter @packages/backend run verify:env-contract:failure`
  - Result: reports both a missing native env file and a backend/web URL mismatch with package/file/variable naming

Partial slice-level verification run and current status:

- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
  - Partial: backend/web pass, native still fails on missing direct `convex/*` dependency resolution (expected T02 work)
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
  - Not yet runnable in this slice because `scripts/verify-seed-data.ts` does not exist until T03

## Diagnostics

Use these commands later:

- Happy path / current workspace:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
  - `pnpm --filter @packages/backend run verify:env-contract`
- Failure-path observability:
  - `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
  - `pnpm --filter @packages/backend run verify:env-contract:failure`

Failure shapes exposed by the verifier:

- missing env file: names the package and absolute file path
- missing required variable: names the package, file, and variable names
- cross-package mismatch: names the package pair and variable names involved
- optional missing variables: surfaced without printing values

## Deviations

- Added `tsx` to `packages/backend` devDependencies because the task’s required verification command depends on it and the package did not previously provide it.
- Added a failure-fixture verification command in `package.json` in addition to the task-plan’s direct `tsx` invocation so the diagnostic path is easier to run repeatedly.

## Known Issues

- Current workspace still lacks `packages/backend/.env.local`, so the happy-path verifier intentionally fails until that file is created from the new example.
- Native typecheck still fails on unresolved `convex/react` and `convex/react-clerk` imports; that is the planned scope of T02.
- `packages/backend/scripts/verify-seed-data.ts` is not present yet; that is planned for T03.

## Files Created/Modified

- `packages/backend/.env.local.example` — canonical backend env template for local development
- `packages/backend/scripts/verify-env-contract.ts` — cross-package env verifier with redacted diagnostics and failure fixture
- `packages/backend/package.json` — added verifier scripts and backend-local `tsx` dev dependency support
- `README.md` — replaced stale env setup guidance with package-local contract instructions
- `.gsd/milestones/M006/slices/S01/S01-PLAN.md` — added explicit failure-path verification for env diagnostics
