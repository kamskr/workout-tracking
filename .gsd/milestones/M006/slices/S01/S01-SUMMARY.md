---
id: S01
parent: M006
milestone: M006
provides:
  - Executable local dev-stack contract across backend, web, and native, with passing backend seed-data readiness and localhost web boot proof
requires: []
affects:
  - S02
  - S03
  - S04
  - S05
  - S06
key_files:
  - packages/backend/.env.local.example
  - packages/backend/scripts/verify-env-contract.ts
  - packages/backend/scripts/verify-seed-data.ts
  - packages/backend/package.json
  - apps/native/package.json
  - apps/web/.env.local.example
  - README.md
key_decisions:
  - packages/backend/.env.local is the canonical local backend env boundary and web/native must mirror its Convex URL
  - pnpm-strict workspace apps that import convex subpaths directly must declare convex as a direct dependency
  - backend readiness diagnostics classify failures as env, connectivity, auth-or-deployment, or seed-data without printing secrets
patterns_established:
  - Cross-package env verification lives in backend scripts and reports only file paths and variable names
  - Runtime readiness checks resolve backend config from the backend package boundary first, then emit one failure phase per blocker
observability_surfaces:
  - pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app
  - pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts
  - pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture
  - pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts
  - pnpm --filter web-app dev
  - http://localhost:3000
drill_down_paths:
  - .gsd/milestones/M006/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S01/tasks/T03-SUMMARY.md
duration: 3h
verification_result: passed
completed_at: 2026-03-16T14:15:00+01:00
---

# S01: Infrastructure & Dev Stack

**Shipped the local runtime contract for backend, web, and native: env wiring is explicit and self-verifying, native Convex resolution is fixed, seed data is reachable, and the web app boots at localhost:3000.**

## What Happened

S01 turned a vague starter-template setup into an executable local contract.

The backend now owns the env boundary. `packages/backend/.env.local.example` establishes the canonical local file, `apps/web/.env.local.example` documents the mirrored web file, and `README.md` now describes the actual package-local setup instead of the generic template flow.

That contract is enforced by `packages/backend/scripts/verify-env-contract.ts`. It checks backend/web/native file presence, required variable presence, backend-to-web/native Convex URL alignment, and web-to-native Clerk publishable key alignment. It also includes a built-in failure fixture, so downstream agents can verify the negative path and inspect targeted diagnostics without exposing values.

The native compile blocker was real and small: under pnpm strictness, `apps/native` needed a direct `convex` dependency because it imports `convex/react` and `convex/react-clerk` directly. Adding that dependency and refreshing installs removed the entire class of native `TS2307` failures.

S01 also added a live readiness probe in `packages/backend/scripts/verify-seed-data.ts`. It resolves `CONVEX_URL` from the canonical backend env file, queries `api.exercises.listExercises`, and classifies failures as `env`, `connectivity`, `auth-or-deployment`, or `seed-data`. In the current workspace it reached the configured backend and confirmed 144 seeded exercises.

Finally, the slice proved the web entrypoint boots. `pnpm --filter web-app dev` started cleanly and the app served at `http://localhost:3000`. The page still shows UseNotes content, but that is S02 scope, not an S01 failure.

## Verification

Passed:

- `pnpm install`
- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
- `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
- `pnpm --filter web-app dev`
- Browser navigation to `http://localhost:3000/`

Observed runtime evidence:

- env contract check passed, with only an optional missing `OPENAI_API_KEY` warning
- failure fixture emitted the expected missing-file and URL-mismatch diagnostics
- seed-data verifier reached the configured backend and reported `Seed query returned 144 exercises`
- localhost page served successfully with title `Workout Tracker`

Diagnostics also surfaced two non-slice blockers for later work:

- landing page still contains UseNotes copy, which belongs to S02
- browser console shows image aspect-ratio warnings and Clerk dev-key warning on the current home page

## Requirements Advanced

- R029 — Local dev boot is now executable and diagnosable across backend, web, and native boundaries; backend seed data and web boot are proven, and native compile-time dependency resolution is fixed.

## Requirements Validated

- none — R029 stays active because Expo runtime boot on iOS Simulator is still part of the requirement and belongs to S06.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- The task summaries described files that were not actually present in the worktree. This close-out pass had to implement the missing verifier scripts, env examples, README updates, and native dependency repair before slice-level verification could run truthfully.

## Known Limitations

- `packages/backend/.env.local`, `apps/web/.env.local`, and `apps/native/.env` currently contain local runtime values needed for verification and are intentionally untracked; future agents must preserve alignment, not rely on committed secrets.
- The web home page still renders the leftover UseNotes marketing site. S01 proved boot only; redesign remains S02.
- Expo runtime boot is not covered here. R029 therefore remains active until S06 proves the native app boots cleanly.
- The current home page emits image sizing warnings and a Clerk development-keys warning in the browser console.

## Follow-ups

- S02 should replace the UseNotes landing page and clear the current home-page console/image warnings where they fall inside redesigned components.
- S03/S04 can treat `packages/backend/.env.local` plus the two mirror files as the stable local runtime contract while redesigning authenticated pages.
- S05 should reuse `verify-env-contract.ts` and `verify-seed-data.ts` as first-line diagnostics before running the 119 live verification checks.
- S06 should boot Expo against the same backend URL contract rather than inventing a mobile-specific setup path.

## Files Created/Modified

- `packages/backend/.env.local.example` — canonical backend env template for local development
- `packages/backend/scripts/verify-env-contract.ts` — cross-package env verifier with redacted diagnostics and a failure fixture
- `packages/backend/scripts/verify-seed-data.ts` — backend readiness probe with classified failure phases
- `packages/backend/package.json` — added verifier scripts and backend-local `tsx` dependency
- `apps/native/package.json` — added direct `convex` dependency required for pnpm-strict native imports
- `apps/web/.env.local.example` — documented the mirrored web env contract
- `README.md` — replaced stale template setup guidance with the package-local S01 flow
- `.gsd/REQUIREMENTS.md` — updated R029 to reflect what S01 actually proved
- `.gsd/DECISIONS.md` — appended S01 env-boundary and readiness-diagnostics decisions

## Forward Intelligence

### What the next slice should know
- The backend URL at `packages/backend/.env.local:CONVEX_URL` is the authoritative local runtime anchor. If something breaks downstream, check drift there first.
- S01 already proved the current backend has seed data and the web app can boot against it, so S02-S05 should assume runtime is available unless one of the new verifier scripts says otherwise.

### What's fragile
- Local env alignment across three package boundaries — if one URL drifts, downstream browser and verification failures will look like product bugs instead of setup drift.
- The browser toolchain is slightly noisy right now — the home page has console warnings unrelated to S01’s core boot proof.

### Authoritative diagnostics
- `packages/backend/scripts/verify-env-contract.ts` — fastest trustworthy signal for package-boundary drift
- `packages/backend/scripts/verify-seed-data.ts` — fastest trustworthy signal for backend reachability, auth/deployment mismatch, or missing seeds
- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app` — authoritative proof that native Convex module resolution is fixed

### What assumptions changed
- The task summaries assumed the slice files already existed in the worktree; they did not, so the closer had to build the missing S01 implementation before verification.
- Convex CLI auth was not the blocker in this worktree. A direct configured backend URL already existed and the seed-data probe could verify against it immediately.
