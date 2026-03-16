---
estimated_steps: 5
estimated_files: 7
---

# T02: Wire the authenticated route shell and navigation split

**Slice:** S03 — App Shell & Design System
**Milestone:** M006

## Description

Introduce the actual authenticated composition seam. Protected routes currently repeat their own wrappers and the shared `Header` is still homepage-first. This task should move authenticated pages behind a shared shell/layout path, redesign navigation around real app destinations, and keep public routes (`/` and `/shared/[id]`) outside that shell. The result should be one truthful layout path for signed-in pages, ready for representative route retrofits in T03.

## Steps

1. Inspect the current root layout, middleware, and header composition so the new shell boundary preserves existing Clerk/middleware protection and leaves public routes outside the authenticated shell.
2. Add a protected-route layout seam — preferably an App Router `(app)` route group if that can be done safely in one task — so authenticated pages render inside a shared `AppShell` while `/` and `/shared/[id]` continue using the public/root layout path.
3. Implement `AppShell` and `AppNav` under `apps/web/src/components/app-shell/`, using the new T01 primitives/classes for shell chrome, responsive navigation, content container, and top-level destination links called for in the roadmap (`workouts`, `exercises`, `analytics`, `feed`, `templates`, `leaderboards`, `challenges`, `profile`, and session-related entry points where appropriate).
4. Split `apps/web/src/components/Header.tsx` responsibilities so the landing page keeps its public marketing nav while authenticated navigation lives in the app shell; reuse `UserNav` instead of rebuilding account controls.
5. Run web typecheck, start the worktree-local web app on port 3001 if needed, and smoke-test that protected routes now render through the shared shell while `/` and `/shared/[id]` stay outside it.

## Must-Haves

- [ ] Authenticated pages render through one shared shell/layout composition path instead of per-page wrapper duplication.
- [ ] Public landing and shared-workout routes remain outside the authenticated shell.
- [ ] Navigation is product-focused rather than homepage-anchor-focused and reuses Clerk/user-nav state safely.
- [ ] The shell is responsive enough for desktop and mobile viewport smoke checks.
- [ ] `pnpm --filter web-app typecheck` passes after the layout/nav split.

## Verification

- Run `pnpm --filter web-app typecheck`.
- Start `pnpm --filter web-app exec next dev --port 3001` and manually smoke `/`, `/shared/[id]` (if a valid id is available), and at least one authenticated route to confirm the shell boundary is correct.

## Observability Impact

- Signals added/changed: authenticated shell/nav chrome becomes a stable runtime signal for route wiring success; shell containers should expose durable `data-*` hooks for browser assertions.
- How a future agent inspects this: run the web app on port 3001 and verify public vs authenticated route composition in the browser.
- Failure state exposed: missing shell/nav chrome or accidental shell wrapping of public routes becomes visible immediately at the route level.

## Inputs

- `apps/web/src/app/layout.tsx` — current root layout with fonts/providers but no public-vs-auth shell split.
- `apps/web/src/middleware.ts` — authoritative route-protection boundary; `/shared/[id]` must remain public.
- `apps/web/src/components/Header.tsx` and `apps/web/src/components/common/UserNav.tsx` — current mixed public/auth header responsibilities and existing account controls.
- T01 output in `apps/web/src/components/app-shell/` and `apps/web/src/app/globals.css` — authenticated shell styling vocabulary and primitives to compose here.

## Expected Output

- `apps/web/src/app/(app)/layout.tsx` — shared authenticated layout seam wrapping protected routes.
- `apps/web/src/components/app-shell/AppShell.tsx` — authenticated shell container and content region.
- `apps/web/src/components/app-shell/AppNav.tsx` — redesigned authenticated navigation using real app destinations.
- `apps/web/src/components/Header.tsx` and/or `apps/web/src/app/layout.tsx` — public header path kept isolated from authenticated shell composition.
