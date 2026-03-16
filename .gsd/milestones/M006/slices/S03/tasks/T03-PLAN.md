---
estimated_steps: 6
estimated_files: 7
---

# T03: Retrofit representative authenticated pages and add runtime shell proof

**Slice:** S03 — App Shell & Design System
**Milestone:** M006

## Description

Prove the shell is real by applying it to representative page shapes and adding automated runtime verification. This task should retrofit at least one core list page, one dashboard-style page, and one social/competitive page to consume the shared shell primitives instead of ad hoc wrappers. Then add or update a Playwright spec that asserts shell presence plus route-specific carry-through on the worktree-local server. If Clerk/env middleware blocks render, capture that as a blocker class rather than mislabeling the shell work as broken.

## Steps

1. Inspect the selected representative routes (minimum: `/workouts`, `/exercises`, `/analytics`, and one of `/feed` or `/leaderboards`) and identify the repeated wrapper/title/card patterns to replace with the new shell primitives.
2. Refactor those pages to consume `PageHeader`, `AppCard`, `StatCard`, `AppBadge`, and shell-aware spacing/container classes while preserving their existing data fetching, page actions, and content semantics.
3. Add durable route-level/selective `data-*` hooks where needed so browser assertions can verify both shell presence and page-specific carry-through without brittle text matching.
4. Add or update `apps/web/tests/app-shell.spec.ts` (and `apps/web/playwright.config.ts` if needed) so the representative authenticated pages are exercised against the worktree-local server on port 3001, asserting shell chrome plus route-specific content/data hooks.
5. Run `pnpm --filter web-app typecheck` and `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts`; if the runtime fails before page render because of Clerk/env issues, capture that exact blocker class in the task summary instead of treating it as a page-shell regression.
6. Manually inspect browser console output on the representative authenticated routes and note any remaining warnings/errors that belong to downstream S04 or env follow-up.

## Must-Haves

- [ ] Representative routes visibly consume the shared shell/primitives instead of local wrapper duplication.
- [ ] Automated browser proof exists for authenticated shell presence and route-specific content carry-through.
- [ ] Worktree-local runtime proof uses port 3001 when needed and records Clerk/env middleware failures as blockers, not UI defects.
- [ ] `pnpm --filter web-app typecheck` passes after the page retrofits.

## Verification

- Run `pnpm --filter web-app typecheck`.
- Run `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts` against the worktree-local server.
- Manually review browser console logs on `/workouts`, `/exercises`, `/analytics`, and `/feed` or `/leaderboards`.

## Observability Impact

- Signals added/changed: browser-verifiable `data-*` hooks on shell/page regions; Playwright spec becomes the authoritative runtime proof for shell composition.
- How a future agent inspects this: run `tests/app-shell.spec.ts` and open the worktree-local app on port 3001.
- Failure state exposed: shell wiring failure, page-specific regressions, and env/auth middleware blockers are separated into distinct proof surfaces.

## Inputs

- T01 outputs in `apps/web/src/components/app-shell/` — shared card/header/stat/badge primitives and authenticated design tokens.
- T02 outputs in `apps/web/src/app/(app)/layout.tsx` and `apps/web/src/components/app-shell/AppShell.tsx` — authenticated shell boundary and navigation seam.
- `apps/web/src/app/workouts/page.tsx`, `apps/web/src/app/exercises/page.tsx`, `apps/web/src/app/analytics/page.tsx`, `apps/web/src/app/feed/page.tsx`, `apps/web/src/app/leaderboards/page.tsx` — representative route candidates with duplicated page scaffolding.

## Expected Output

- Representative authenticated route files under `apps/web/src/app/` — updated to use the shared shell primitives and selectors.
- `apps/web/tests/app-shell.spec.ts` — runtime proof for authenticated shell presence across representative routes.
- `apps/web/playwright.config.ts` — adjusted if needed so the worktree-local server/port is the truth surface for the spec.
