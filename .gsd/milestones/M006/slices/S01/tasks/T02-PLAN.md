---
estimated_steps: 3
estimated_files: 3
---

# T02: Fix native Convex dependency resolution and prove the workspace compiles

**Slice:** S01 — Infrastructure & Dev Stack
**Milestone:** M006

## Description

Remove the known native compile blocker by making Convex a direct dependency of the Expo app and proving all three packages typecheck together. This task is intentionally narrow: it closes the concrete pnpm/module-resolution failure called out in research before any runtime boot claim is made.

## Steps

1. Add the missing direct `convex` dependency to `apps/native/package.json` using the workspace's existing compatible version.
2. Refresh the workspace lockfile and make any minimal native TypeScript/package-resolution adjustment needed so `convex/react` and `convex/react-clerk` resolve under pnpm strictness.
3. Re-run the scoped Turbo typecheck across backend, web, and native and fix any residual dependency-resolution fallout introduced by the change.

## Must-Haves

- [ ] `apps/native/package.json` declares `convex` directly.
- [ ] The lockfile reflects the dependency change cleanly.
- [ ] Scoped typecheck across all 3 packages passes without native Convex module-resolution errors.

## Verification

- `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`
- Typecheck output contains no `TS2307` errors for `convex/react` or `convex/react-clerk` in `apps/native`.

## Inputs

- `apps/native/package.json` — currently missing the direct Convex dependency.
- `apps/web/package.json` — reference for the working direct-dependency pattern.
- T01 env/doc contract — runtime alignment exists, but this task focuses on compile-time package integrity.

## Expected Output

- `apps/native/package.json` — direct Convex dependency added.
- `pnpm-lock.yaml` — dependency graph updated.
- `apps/native/tsconfig.json` — only if a minimal resolution adjustment is required.

## Observability Impact

- Signals changed: Turbo typecheck output becomes the primary proof surface for native Convex package resolution under pnpm strictness, and the lockfile/package manifest diff shows whether the dependency graph was repaired cleanly.
- How a future agent inspects this task: read `apps/native/package.json` for the direct `convex` declaration, inspect `pnpm-lock.yaml` for the updated native dependency edge, and re-run `pnpm turbo run typecheck --filter=@packages/backend --filter=web-app --filter=native-app`.
- Failure state now visible: native compile failures should surface as explicit module-resolution/typecheck errors in Turbo output, especially `TS2307` for `convex/react` or `convex/react-clerk`, rather than an ambiguous missing transitive dependency situation.
