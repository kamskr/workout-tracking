# S01: Infrastructure & Dev Stack

**Goal:** Establish a working local runtime contract for the Convex backend, Next.js web app, and Expo native app so the project can boot against one live backend with seed data and no dependency-resolution blockers.
**Demo:** A fresh agent can use the repo env files, start the backend/web/native stack, reach the web app at localhost:3000, confirm exercise seed data exists on the live Convex deployment, and typecheck all three packages without native `convex/*` resolution failures.

## Must-Haves

- R029 is materially advanced by making the backend env contract explicit and executable across backend, web, and native.
- The native app has a direct `convex` dependency and no longer fails typecheck due to missing `convex/react` or `convex/react-clerk` modules.
- Canonical local env wiring is documented in-repo at the package boundaries the code actually uses: `packages/backend/.env.local`, `apps/web/.env.local`, and `apps/native/.env`.
- There is an executable verification path for: typecheck across all 3 packages, live seed-data presence, and web boot at `http://localhost:3000`.
- Remaining live-blockers are surfaced explicitly when they depend on user-controlled secrets or Convex/Clerk deployment configuration.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
- `pnpm --filter web-app dev` starts cleanly and serves `http://localhost:3000`

## Observability / Diagnostics

- Runtime signals: env-contract verifier reports missing vars by package and backend connectivity/seed verifier reports exact failing phase.
- Inspection surfaces: package env files, `packages/backend/scripts/verify-env-contract.ts`, `packages/backend/scripts/verify-seed-data.ts`, Turbo typecheck output, local web dev server readiness.
- Failure visibility: verification scripts print whether failure is env-shape, Convex reachability, auth/deployment mismatch, or missing exercise seed data.
- Redaction constraints: scripts must report variable names and file locations only, never secret values.

## Integration Closure

- Upstream surfaces consumed: Convex client providers in web/native, backend verify-script env loading convention, existing seed/query functions, workspace package manifests.
- New wiring introduced in this slice: canonical backend env file, aligned app env references, native direct package dependency, executable infra verification scripts.
- What remains before the milestone is truly usable end-to-end: user-supplied live Convex/Clerk configuration if absent locally, full M003-M005 verification, landing page redesign, app-wide design refresh, and iOS simulator proof.

## Tasks

- [x] **T01: Make the env contract explicit and self-verifying** `est:45m`
  - Why: S01 is primarily an environment-boundary slice; before booting anything, the repo needs one canonical, executable contract that tells future agents which files/vars must agree across backend, web, and native.
  - Files: `packages/backend/.env.local.example`, `packages/backend/scripts/verify-env-contract.ts`, `packages/backend/package.json`, `README.md`
  - Do: Add a backend-local env example that matches the repo's actual verification path, implement a small verifier script that checks required vars/file presence across backend/web/native without printing secrets, wire it into backend package scripts, and update the setup docs so S01 no longer depends on stale template assumptions.
  - Verify: `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
  - Done when: the verifier fails with package-specific diagnostics when env files are incomplete and passes when the three package boundaries are aligned.

- [x] **T02: Fix native Convex dependency resolution and prove the workspace compiles** `est:30m`
  - Why: Research found an immediate hard blocker to R029: native cannot resolve `convex/react` under pnpm strictness, so the stack is not boot-clean even before runtime.
  - Files: `apps/native/package.json`, `pnpm-lock.yaml`, `apps/native/tsconfig.json`
  - Do: Add the native app's direct `convex` dependency using the workspace's existing versioning pattern, refresh the lockfile, and make any minimal tsconfig/package-alias adjustment required so native resolves `convex/*` the same way web already does.
  - Verify: `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
  - Done when: typecheck passes for backend, web, and native with no `TS2307` module-resolution errors from native Convex imports.

- [x] **T03: Add live backend readiness checks for seed data and boot the web entrypoint** `est:45m`
  - Why: S01 must close the loop at runtime, not just structurally. The slice is only useful if an agent can confirm the live backend URL works, seed data exists, and the web app actually serves against that contract.
  - Files: `packages/backend/scripts/verify-seed-data.ts`, `packages/backend/package.json`, `apps/web/.env.local.example`, `.gsd/milestones/M006/slices/S01/S01-PLAN.md`
  - Do: Add a backend verification script that resolves `CONVEX_URL` via the canonical backend path and asserts exercise seed data exists, document the exact web env expectation alongside it, and verify the web app boots at localhost:3000 using the aligned env contract. If live deployment/auth is missing, ensure the script exits with a precise blocker message instead of an ambiguous stack trace.
  - Verify: `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` and then `pnpm --filter web-app dev`
  - Done when: the seed-data verifier can distinguish connectivity/configuration failures from empty data, and the web app serves at `http://localhost:3000` using the same backend URL contract.

## Files Likely Touched

- `packages/backend/.env.local.example`
- `packages/backend/scripts/verify-env-contract.ts`
- `packages/backend/scripts/verify-seed-data.ts`
- `packages/backend/package.json`
- `apps/native/package.json`
- `apps/native/tsconfig.json`
- `apps/web/.env.local.example`
- `README.md`
