---
id: T02
parent: S01
milestone: M006
provides:
  - Native Expo now declares Convex directly and the workspace compiles cleanly across backend, web, and native under pnpm strictness.
key_files:
  - apps/native/package.json
  - pnpm-lock.yaml
  - .gsd/milestones/M006/slices/S01/tasks/T02-PLAN.md
key_decisions:
  - Kept the native fix minimal by adding a direct Convex dependency and refreshing installed workspace links; no tsconfig override was needed once pnpm materialized the package for the app.
patterns_established:
  - For pnpm-strict workspace apps that import package subpaths directly, declare the package as a direct dependency and verify the fix through the scoped Turbo typecheck rather than relying on transitive access.
observability_surfaces:
  - `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
  - `apps/native/package.json`
  - `pnpm-lock.yaml`
duration: 11m
verification_result: passed
completed_at: 2026-03-13T17:37:36Z
blocker_discovered: false
---

# T02: Fix native Convex dependency resolution and prove the workspace compiles

**Added a direct Convex dependency to the Expo app, refreshed the workspace dependency graph, and cleared native `convex/*` typecheck failures without needing tsconfig changes.**

## What Happened

I first fixed the task-plan observability gap by adding an `## Observability Impact` section to `T02-PLAN.md` so future agents know to inspect Turbo typecheck output plus the manifest/lockfile diff.

On the implementation side, `apps/native/package.json` was missing a direct `convex` dependency even though native imports `convex/react` and `convex/react-clerk` throughout the app. I added `convex` using the same version range pattern already used by the web app.

I then refreshed the workspace lockfile. The first verification run still failed with the expected `TS2307` errors for `convex/react` and `convex/react-clerk`. Rather than changing TypeScript config immediately, I tested the narrower hypothesis that the lockfile-only refresh had not materialized the dependency into native’s installed module tree. That proved correct: `pnpm why convex --filter native-app` showed the dependency edge, but `apps/native/node_modules/convex` was still missing.

After a normal `pnpm install`, the native app had a resolved `convex` package and the scoped Turbo typecheck passed for backend, web, and native with no remaining native Convex module-resolution errors. Because the install alone resolved the failure, `apps/native/tsconfig.json` was left unchanged.

## Verification

Passed:

- `pnpm install --lockfile-only`
  - Updated `pnpm-lock.yaml` with a direct `convex` dependency edge for `apps/native`.
- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
  - Initial run reproduced the native failure as explicit `TS2307` errors for `convex/react` and `convex/react-clerk`.
- `pnpm why convex --filter native-app`
  - Confirmed native’s dependency graph now includes `convex`.
- `pnpm install`
  - Materialized the dependency into the installed workspace modules.
- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
  - Final run passed for all three packages.

Slice-level verification status after T02:

- ✅ `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
- Not run in this task: `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts`
- Not run in this task: `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts --check-failure-fixture`
- Not run in this task: `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts`
- Not run in this task: `pnpm --filter web-app dev`

## Diagnostics

Future inspection surfaces:

- `apps/native/package.json` shows the direct `convex` declaration.
- `pnpm-lock.yaml` shows the native importer’s direct `convex` edge.
- Re-run `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app` to confirm the compile proof.

Failure shape made explicit by this task:

- If the dependency is missing or not installed into the native app’s module tree, Turbo/TypeScript surfaces `TS2307` errors for `convex/react` and `convex/react-clerk` from `apps/native` sources.

## Deviations

- Added the required pre-flight `## Observability Impact` section to `.gsd/milestones/M006/slices/S01/tasks/T02-PLAN.md` before implementation.

## Known Issues

- None for this task’s compile-time scope.

## Files Created/Modified

- `apps/native/package.json` — added the direct `convex` dependency declaration for the Expo app.
- `pnpm-lock.yaml` — recorded the native importer’s direct Convex dependency.
- `.gsd/milestones/M006/slices/S01/tasks/T02-PLAN.md` — added the missing observability guidance required by pre-flight validation.
- `.gsd/milestones/M006/slices/S01/S01-PLAN.md` — marked T02 complete.
