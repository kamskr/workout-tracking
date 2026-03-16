---
id: T02
parent: S03
milestone: M006
provides:
  - Shared authenticated App Router layout seam with product navigation split away from the public marketing header
key_files:
  - apps/web/src/app/(app)/layout.tsx
  - apps/web/src/components/app-shell/AppShell.tsx
  - apps/web/src/components/app-shell/AppNav.tsx
  - apps/web/src/components/Header.tsx
  - apps/web/src/components/common/UserNav.tsx
key_decisions:
  - Protected Next.js pages now live under apps/web/src/app/(app)/ and inherit AppShell while public routes stay on the root layout path.
patterns_established:
  - Authenticated chrome is composed once in AppShell and discovered via durable data-ui hooks rather than repeated per-route wrappers.
  - Public marketing navigation and authenticated product navigation are split into separate components instead of branching inside a shared header.
observability_surfaces:
  - data-ui="app-shell"
  - data-ui="app-shell-sidebar"
  - data-ui="app-shell-header"
  - data-ui="app-shell-content"
  - data-ui="app-nav"
  - data-ui="app-nav-link"
  - data-ui="public-header"
duration: 1h18m
verification_result: passed
completed_at: 2026-03-16T19:23:00+01:00
blocker_discovered: false
---

# T02: Wire the authenticated route shell and navigation split

**Moved protected routes behind a shared `(app)` layout with a dedicated authenticated shell and left the landing/shared routes on the public path.**

## What Happened

I moved the protected page files into `apps/web/src/app/(app)/...` so they retain their URLs but now inherit one shared layout path. That layout renders a new `AppShell`, which owns the authenticated chrome, content container, responsive sidebar/mobile top bar, and a product-focused `AppNav` linking workouts, exercises, analytics, feed, templates, leaderboards, challenges, and profile/session entry points.

`apps/web/src/components/Header.tsx` was reduced back to a public marketing header for `/`, and authenticated account controls stayed on the existing `UserNav` rather than creating a second account menu. `UserNav` was lightly restyled to fit the new shell and now exposes profile + workout entry points from the dropdown.

The root layout stayed provider-only, so `/` and `/shared/[id]` remain outside the authenticated shell composition path. Notes routes were moved under the authenticated group as part of the existing middleware boundary and still render their existing content unchanged for now.

## Verification

- Ran `pnpm --filter web-app typecheck` — passed.
- Attempted `pnpm --filter web-app exec next dev --port 3001` via background server start. A pre-existing listener already owned port 3001, so I inspected that server before retrying.
- Verified the existing 3001 server’s failure mode with browser/runtime inspection:
  - `curl -I http://127.0.0.1:3001` returned `500 Internal Server Error`.
  - Background shell highlights showed Clerk runtime failure class: invalid publishable key.
  - Browser navigation to `http://127.0.0.1:3001/` reproduced the same runtime error overlay, confirming the blocker is auth/env related rather than shell wiring.
- Because Clerk failed before route render, full public-vs-auth browser assertions were blocked at runtime in this task. The code-level shell split and type safety were still verified successfully.

## Diagnostics

- Authenticated shell runtime hooks:
  - `data-ui="app-shell"`
  - `data-ui="app-shell-sidebar"`
  - `data-ui="app-shell-header"`
  - `data-ui="app-shell-content"`
  - `data-ui="app-nav"`
  - `data-ui="app-nav-link"`
- Public route header hook: `data-ui="public-header"`
- To inspect later: run the web app on port 3001 with valid Clerk config, then verify `/` does **not** render `data-ui="app-shell"` while protected routes do.
- Runtime blocker currently visible: Clerk publishable-key error before page render.

## Deviations

- Could not start a fresh dev server on port 3001 because the port was already occupied by an existing worktree server.
- Browser smoke was limited to blocker classification because Clerk auth configuration fails before route-level shell rendering.

## Known Issues

- Live browser verification of `/`, `/shared/[id]`, and protected-route shell presence remains blocked until the Clerk publishable key configuration is fixed.
- The slice-level Playwright spec `apps/web/tests/app-shell.spec.ts` does not exist yet; that work belongs to T03 per the slice plan.

## Files Created/Modified

- `apps/web/src/app/(app)/layout.tsx` — added the shared authenticated layout seam that wraps protected routes with `AppShell`.
- `apps/web/src/components/app-shell/AppShell.tsx` — added the authenticated shell container, responsive chrome, and shared content region.
- `apps/web/src/components/app-shell/AppNav.tsx` — added product-focused authenticated navigation with durable route hooks.
- `apps/web/src/components/Header.tsx` — simplified to a public-only marketing header.
- `apps/web/src/components/common/UserNav.tsx` — reused and restyled the existing account dropdown for the authenticated shell.
- `apps/web/src/app/(app)/workouts/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/workouts/active/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/exercises/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/exercises/[id]/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/analytics/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/feed/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/leaderboards/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/challenges/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/templates/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/profile/setup/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/profile/[username]/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/notes/page.tsx` — moved under the authenticated route group.
- `apps/web/src/app/(app)/notes/[slug]/page.tsx` — moved under the authenticated route group.
- `.gsd/DECISIONS.md` — recorded the new authenticated shell composition seam decision.
- `.gsd/KNOWLEDGE.md` — recorded the current 3001/Clerk runtime blocker inspection rule.
