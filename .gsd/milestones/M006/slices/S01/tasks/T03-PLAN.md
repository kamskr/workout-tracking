---
estimated_steps: 4
estimated_files: 4
---

# T03: Add live backend readiness checks for seed data and boot the web entrypoint

**Slice:** S01 — Infrastructure & Dev Stack
**Milestone:** M006

## Description

Close S01 with runtime proof rather than only structural proof. This task adds a seed-data readiness check against the live Convex backend, uses the backend-local env convention from T01, and proves the web app can boot against that same backend contract. It is also where remaining user-controlled blockers must become explicit if live Convex/Clerk configuration is still missing.

## Steps

1. Implement `packages/backend/scripts/verify-seed-data.ts` to resolve `CONVEX_URL` from the canonical backend path and assert that the exercise library is populated on the target deployment.
2. Make the verifier classify failures clearly: missing URL, unreachable deployment, auth/deployment mismatch, or zero seeded exercises.
3. Wire the script into `packages/backend/package.json` and align web env example/docs with the backend URL contract established in T01.
4. Use the verified env contract to boot the web app at `http://localhost:3000` and confirm this is the documented S01 runtime entrypoint.

## Must-Haves

- [ ] Seed-data verification runs against the same backend URL contract used by the web/native apps.
- [ ] Failure output distinguishes configuration/connectivity issues from genuinely missing seed data.
- [ ] The web app can be started at localhost:3000 using the aligned env setup, or reports a precise external blocker if secrets/deployment configuration are missing.

## Verification

- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
- `pnpm --filter web-app dev`
- Visiting `http://localhost:3000` after startup reaches the app shell rather than a process crash.

## Observability Impact

- Signals added/changed: backend connectivity phase, seed count/result, and classified blocker messages.
- How a future agent inspects this: run the seed verifier, then start the web app and inspect server readiness/output.
- Failure state exposed: no backend URL, deployment unreachable, backend auth misconfiguration, or missing seed rows.

## Inputs

- T01 verifier and env examples — canonical package env contract.
- `packages/backend/convex/seed.ts` and exercise queries — existing seed/runtime data path.
- T02 compile-clean workspace — structural dependency blockers removed before runtime proof.

## Expected Output

- `packages/backend/scripts/verify-seed-data.ts` — live backend/seed-data readiness check.
- `packages/backend/package.json` — script entry for seed verification.
- `apps/web/.env.local.example` — web env example aligned to the canonical backend URL contract.
- Runtime proof notes captured via the slice verification commands in `S01-PLAN.md`.
