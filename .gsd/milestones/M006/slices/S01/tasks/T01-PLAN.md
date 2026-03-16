---
estimated_steps: 4
estimated_files: 4
---

# T01: Make the env contract explicit and self-verifying

**Slice:** S01 — Infrastructure & Dev Stack
**Milestone:** M006

## Description

Define the package-level environment contract the stack already depends on in practice, then make that contract executable with a verifier script. This closes the main S01 coordination risk: backend, web, and native currently rely on different env-file conventions, and the most important one (`packages/backend/.env.local`) is missing from the standard setup path.

## Steps

1. Add `packages/backend/.env.local.example` with the backend-side variables that verification scripts and Convex auth expect.
2. Implement `packages/backend/scripts/verify-env-contract.ts` to inspect backend/web/native env files, assert required variable names are present, and report mismatches or missing files without printing secret values.
3. Wire the verifier into `packages/backend/package.json` and update repo docs so setup guidance points to the package-local env contract instead of only the stale root/template flow.
4. Run the verifier and tighten messages until failures clearly identify the broken package boundary or missing variable.

## Must-Haves

- [ ] The repo has an explicit backend-local env example at the path backend verification code already expects.
- [ ] The verifier checks backend, web, and native package boundaries and redacts secret values.
- [ ] Setup docs tell future agents which env file is canonical for backend scripts and how the app env files should align to it.

## Verification

- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- Temporarily removing a required variable or env file causes a targeted failure message naming the package/file and variable.

## Observability Impact

- Signals added/changed: package-by-package env validation results and mismatch classification.
- How a future agent inspects this: run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`.
- Failure state exposed: missing file, missing required variable, or backend/app URL misalignment.

## Inputs

- `packages/backend/scripts/verify-*.ts` — current backend verification convention falls back to `packages/backend/.env.local`.
- `apps/web/.env.local`, `apps/native/.env`, `.env.local` — current env drift and template-era assumptions identified in research.

## Expected Output

- `packages/backend/.env.local.example` — canonical backend env template for S01.
- `packages/backend/scripts/verify-env-contract.ts` — executable env-boundary verification.
- `packages/backend/package.json` — script entry for the verifier.
- `README.md` — updated local setup guidance reflecting the real env contract.
