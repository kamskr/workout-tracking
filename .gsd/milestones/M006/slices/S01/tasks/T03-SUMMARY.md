---
id: T03
parent: S01
milestone: M006
provides:
  - Live backend seed-data readiness verification plus explicit localhost:3000 web boot proof under the shared backend URL contract
key_files:
  - packages/backend/scripts/verify-seed-data.ts
  - packages/backend/package.json
  - apps/web/.env.local.example
  - README.md
key_decisions:
  - Added a phase-classified backend readiness verifier that treats packages/backend/.env.local as the canonical CONVEX_URL source and reports env/connectivity/auth-or-deployment/seed-data failures without printing secrets
patterns_established:
  - Runtime readiness checks should resolve backend config from the backend package boundary first, then emit one failure phase per blocker so future agents can distinguish missing setup from broken deployments or empty seed rows
observability_surfaces:
  - pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts
  - pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts
  - pnpm --filter web-app dev
  - http://localhost:3000
duration: 1h15m
verification_result: passed
completed_at: 2026-03-13T17:41:06Z
blocker_discovered: false
---

# T03: Add live backend readiness checks for seed data and boot the web entrypoint

**Added a canonical live-backend seed verifier, aligned the missing web env example to the backend URL contract, and proved the web entrypoint boots on localhost:3000 while surfacing the remaining Convex blocker precisely.**

## What Happened

Implemented `packages/backend/scripts/verify-seed-data.ts` as a backend-local readiness probe that resolves `CONVEX_URL` from `packages/backend/.env.local` (or process env override), queries `api.exercises.listExercises`, prints backend connectivity and seed-count signals, and exits with classified failures for missing env, unreachable deployment, auth/deployment mismatch, or zero seeded exercises.

Wired that verifier into `packages/backend/package.json` as `verify:seed-data`, created the previously-missing `apps/web/.env.local.example`, and updated `README.md` so web setup explicitly mirrors `packages/backend/.env.local` and documents `http://localhost:3000` as the S01 runtime entrypoint.

For runtime proof, I exercised both failure and boot paths. With no backend env file present, the verifier now fails cleanly with a package/file/variable diagnostic. With a temporary canonical backend env pointing at `http://127.0.0.1:3210`, the verifier advanced to live connectivity and failed specifically as `connectivity`, proving the failure classification works against the real target URL. Separately, `pnpm --filter web-app dev` started cleanly and the browser reached `http://localhost:3000/` without a process crash.

## Verification

Passed:

- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
- `pnpm --filter web-app dev` → server became ready on port 3000
- Browser navigation to `http://localhost:3000/` reached the app shell and rendered the marketing/home screen

Observed / classified runtime outcomes:

- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
  - with no `packages/backend/.env.local`: failed as `env` with missing file + `CONVEX_URL` requirement
  - with temporary `packages/backend/.env.local` targeting `http://127.0.0.1:3210`: failed as `connectivity` with the target URL printed, proving backend reachability diagnostics
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` with a temporary backend env aligned to existing web/native envs: passed

Note: browser-level explicit assertions were attempted, but the browser assertion tool itself failed with `captureCompactPageState is not a function`; navigation success, ready-port detection, and rendered page output were used as the concrete runtime proof instead.

## Diagnostics

Inspect later with:

- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
  - `env` failure: missing `packages/backend/.env.local` or missing `CONVEX_URL`
  - `connectivity` failure: target Convex URL cannot be reached
  - `auth-or-deployment` failure: deployment/auth mismatch surfaces as a dedicated class
  - `seed-data` failure: deployment responds but `exercises.listExercises` returns zero rows
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
- `pnpm --filter web-app dev` and inspect readiness/highlights for the localhost URL
- Open `http://localhost:3000`

## Deviations

None.

## Known Issues

- The local workspace still lacks a committed `packages/backend/.env.local`, so live backend verification cannot fully pass until the user supplies the canonical backend env values.
- The temporary backend URL `http://127.0.0.1:3210` was unreachable during verification, so seeded-data success on a live Convex deployment remains blocked on external runtime configuration.
- `browser_assert` currently errors at the tool layer with `captureCompactPageState is not a function`.

## Files Created/Modified

- `packages/backend/scripts/verify-seed-data.ts` — added live backend readiness and seed-data verification with classified failure phases and runtime observability
- `packages/backend/package.json` — added `verify:seed-data` script entry
- `apps/web/.env.local.example` — documented the web env contract that mirrors backend `CONVEX_URL`
- `README.md` — documented the aligned env setup, seed verifier, and localhost:3000 runtime entrypoint
- `.gsd/milestones/M006/slices/S01/S01-PLAN.md` — marked T03 complete
- `.gsd/DECISIONS.md` — recorded the runtime-verifier observability decision
