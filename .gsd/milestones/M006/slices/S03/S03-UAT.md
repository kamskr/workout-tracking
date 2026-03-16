# S03: App Shell & Design System — UAT

**Milestone:** M006
**Written:** 2026-03-16 14:51 CET

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: S03 ships both code-level design-system seams and runtime shell verification surfaces. Artifact inspection proves the shared shell/primitives exist and are wired into representative routes; live-runtime checks are still necessary to classify the current Clerk blocker and confirm where truthful shell proof will come from once auth is fixed.

## Preconditions

- Dependencies installed from the worktree root (`pnpm install` completed)
- `apps/web` can run locally and `pnpm --filter web-app typecheck` passes
- Worktree-local verification target is port 3001 via `apps/web/playwright.config.ts`
- Clerk env is either valid for a real render, or known-invalid so the tester can confirm the blocker-classification path instead of chasing UI ghosts

## Smoke Test

Run `pnpm --filter web-app typecheck` from the worktree root. It should pass with the Playwright proof files included in the web tsconfig, confirming the shell primitives, route retrofits, and proof harness all compile together.

## Test Cases

### 1. Representative authenticated routes inherit the shared shell seam

1. Open `apps/web/src/app/(app)/layout.tsx` and confirm it returns `<AppShell>{children}</AppShell>`.
2. Open `apps/web/src/components/app-shell/AppShell.tsx` and confirm it exposes `data-ui="app-shell"`, `data-ui="app-shell-sidebar"`, `data-ui="app-shell-header"`, and `data-ui="app-shell-content"`.
3. Open `apps/web/src/app/(app)/workouts/page.tsx`, `exercises/page.tsx`, `analytics/page.tsx`, `feed/page.tsx`, and `leaderboards/page.tsx`.
4. **Expected:** each route renders inside the shared shell vocabulary and exposes route-specific hooks such as `data-route`, `data-route-section`, `data-route-content`, `data-feed-discovery`, or `data-leaderboard-controls` rather than introducing its own top-level gray wrapper/header.

### 2. Public and authenticated navigation stay split

1. Open `apps/web/src/components/Header.tsx`.
2. Open `apps/web/src/components/app-shell/AppNav.tsx`.
3. Compare the two navigation surfaces.
4. **Expected:** `Header.tsx` is public/marketing-only, while product destinations such as workouts, exercises, analytics, feed, templates, leaderboards, challenges, and profile/session entry points live in `AppNav` inside the authenticated shell.

### 3. Shared shell primitives carry durable proof hooks

1. Open `apps/web/src/components/app-shell/AppCard.tsx`, `PageHeader.tsx`, `StatCard.tsx`, and `AppBadge.tsx`.
2. Confirm each component exposes a stable `data-ui` hook.
3. Inspect `apps/web/src/app/globals.css` for the dedicated `app-shell` / `app-page` namespace.
4. **Expected:** the design-system primitives are presentational only, selectorized for browser proof, and backed by authenticated-only CSS tokens that do not reuse the landing-page `landing-*` namespace.

### 4. Runtime shell proof targets the worktree-local server and classifies auth blockers

1. Run `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts --config playwright.config.ts` from the worktree root.
2. Watch the server/test output.
3. If the Clerk publishable key is still invalid, inspect the output for `Publishable key not valid.` and note that the request dies before hydration.
4. **Expected:** the proof harness launches from `apps/web`, targets port 3001, and treats Clerk/auth/env HTML failures as a blocker class before shell selector assertions. If auth is fixed later, the same test should continue into shell selector checks on `/workouts`, `/exercises`, `/analytics`, `/feed`, and `/leaderboards`.

## Edge Cases

### Middleware dies before hydration

1. Run the Playwright command above or open `http://127.0.0.1:3001/workouts` while the current Clerk key is invalid.
2. Inspect server output and, if needed, returned page HTML.
3. **Expected:** the failure is attributable to Clerk/auth middleware (`Publishable key not valid.`), not to missing shell selectors. The tester should treat this as an environment blocker, not a regression in the app shell itself.

### Type-level proof harness drift

1. Run `pnpm --filter web-app typecheck`.
2. Confirm that both `apps/web/tests/app-shell.spec.ts` and `apps/web/playwright.config.ts` are included in compilation.
3. **Expected:** no missing-module or implicit-any errors from the Playwright harness; if such errors return, the local proof surface has drifted and S04 should not proceed without fixing it.

## Failure Signals

- `pnpm --filter web-app typecheck` fails in `PageHeader`, app-shell primitives, or Playwright files
- Representative routes reintroduce their own page-local shell wrappers instead of `PageHeader` / `AppCard` / `StatCard`
- `Header.tsx` regains authenticated product navigation, collapsing the public/auth split
- Playwright cannot find the CLI or `@playwright/test` types in `apps/web`
- Runtime checks report missing shell selectors without first ruling out Clerk/auth middleware failure from returned HTML

## Requirements Proved By This UAT

- R031 — proves the authenticated design-system seam exists in code, representative routes consume it, and a dedicated runtime/browser proof surface exists for continued page-refresh work

## Not Proven By This UAT

- Full authenticated shell rendering in a healthy browser session — current live proof is blocked by Clerk middleware rejecting the publishable key before render
- The remaining authenticated pages beyond the representative set — those are S04 scope
- R015–R021 runtime behavior, backend verification, or mobile execution — those remain for S05/S06

## Notes for Tester

Use page source / server output as the first diagnostic surface when authenticated pages fail before render. Browser console output is weak here because the current failure happens in middleware before hydration. Once Clerk env is corrected, rerun the exact same Playwright command before changing selectors; the harness is already wired for the intended routes.
