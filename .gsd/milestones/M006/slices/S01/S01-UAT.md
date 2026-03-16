# S01: Infrastructure & Dev Stack — UAT

**Milestone:** M006
**Written:** 2026-03-16

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S01 is half artifact contract and half live runtime proof. The slice is done only if the env files, verifier scripts, typecheck, seed-data probe, and localhost web boot all work together.

## Preconditions

- Run from the repo root with dependencies installed: `pnpm install`
- Local env files exist and are aligned:
  - `packages/backend/.env.local`
  - `apps/web/.env.local`
  - `apps/native/.env`
- `packages/backend/.env.local:CONVEX_URL` points at the intended backend deployment
- `apps/web/.env.local:NEXT_PUBLIC_CONVEX_URL` and `apps/native/.env:EXPO_PUBLIC_CONVEX_URL` match that backend URL

## Smoke Test

Run:

```sh
pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app
```

**Expected:** all three packages pass, and native shows no `TS2307` errors for `convex/react` or `convex/react-clerk`.

## Test Cases

### 1. Env contract passes on the real workspace files

1. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`.
2. Read the output.
3. **Expected:** the command exits successfully. Optional warnings may mention `OPENAI_API_KEY`, but there should be no missing-file, missing-vars, or mismatch errors.

### 2. Failure fixture proves diagnostics are inspectable

1. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`.
2. Read the emitted diagnostics.
3. **Expected:** the command succeeds while printing a missing native env file diagnostic and a backend/web URL mismatch diagnostic, with only file paths and variable names exposed.

### 3. Seed-data readiness reaches the configured backend

1. Run `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`.
2. Watch the phase output.
3. **Expected:** the script reports the backend URL source, returns a non-zero exercise count, and exits successfully.

### 4. Web app boots on localhost:3000

1. Start the web app with `pnpm --filter web-app dev`.
2. Wait for the ready message showing `http://localhost:3000`.
3. Open `http://localhost:3000` in a browser.
4. **Expected:** the page renders successfully and the dev server stays up.

### 5. Native Convex resolution stays fixed after install

1. After a fresh `pnpm install`, rerun `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`.
2. Inspect only the native package output if needed.
3. **Expected:** there are no module-resolution errors for direct `convex/*` imports in `apps/native`.

## Edge Cases

### Cross-package Convex URL drift

1. Change one of the public app URLs so it no longer matches `packages/backend/.env.local:CONVEX_URL`.
2. Run `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`.
3. **Expected:** the verifier fails with an explicit mismatch diagnostic naming the disagreeing variables.

### Unreachable backend deployment

1. Point `packages/backend/.env.local:CONVEX_URL` at an unreachable host.
2. Run `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`.
3. **Expected:** the script fails as `connectivity`, not as a generic stack trace.

### Reachable deployment with missing seed rows

1. Run the seed verifier against a backend with no exercise seed data.
2. **Expected:** the script fails as `seed-data` after connecting successfully.

## Failure Signals

- `TS2307` errors for `convex/react` or `convex/react-clerk` from `apps/native`
- `verify-env-contract.ts` reports `[missing-file]`, `[missing-vars]`, or `[mismatch]`
- `verify-seed-data.ts` exits as `env`, `connectivity`, `auth-or-deployment`, or `seed-data`
- `pnpm --filter web-app dev` fails to keep port 3000 ready
- Browser load at `http://localhost:3000` fails or crashes the dev server

## Requirements Proved By This UAT

- R029 — proves the package-local env contract, native dependency resolution fix, backend seed-data readiness, and web boot path that later slices depend on.

## Not Proven By This UAT

- Expo runtime boot on iOS Simulator
- Landing-page redesign quality or removal of UseNotes copy
- Full M003–M005 live verification suite

## Notes for Tester

- The current home page still says UseNotes. That is expected at the end of S01 and should not fail this UAT.
- Optional `OPENAI_API_KEY` warnings from the env-contract verifier are non-blocking for this slice.
- If a later slice reports mysterious browser or verification failures, rerun the env-contract and seed-data scripts before debugging app code.
