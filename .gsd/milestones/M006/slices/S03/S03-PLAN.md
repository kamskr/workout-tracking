# S03: App Shell & Design System

**Goal:** Establish the authenticated web app’s Apple Fitness+ foundation by introducing a protected-route app shell, shared design tokens/primitives, and a redesigned authenticated navigation/header that internal pages can compose without repeating layout scaffolding.
**Demo:** Signed-in users land on a consistent shell with modern navigation, warm gradient-backed surfaces, and shared page/card primitives proven on representative routes (`/workouts`, `/exercises`, `/analytics`, `/feed` or `/leaderboards`) while the public landing page remains isolated.

## Must-Haves

- Design tokens and semantic app-surface utilities for authenticated pages live in `apps/web/src/app/globals.css`, separate from the existing `landing-*` homepage styling.
- Authenticated routes render through a shared shell/layout seam that preserves the current Clerk + middleware protection boundary and does not wrap the public landing page or `/shared/[id]`.
- Authenticated navigation/header is redesigned around real product destinations (workouts, exercises, analytics, feed, templates, leaderboards, challenges, profile/session entry points) instead of the current homepage-first navbar.
- Shared UI primitives exist for the repeated authenticated patterns the research identified: page header, card surface, stat card, and badge/pill styling.
- A representative set of internal routes consume the shell/primitives so S04 inherits a proven structure rather than untested scaffolding.
- Slice verification proves both contract safety (`typecheck`) and runtime shell behavior on representative authenticated pages, including console cleanliness or explicit blocker evidence.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `pnpm --filter web-app typecheck`
- `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts`
- `pnpm --filter web-app exec next dev --port 3001` with browser assertions covering authenticated shell presence plus route-specific carry-through on `/workouts`, `/exercises`, `/analytics`, and `/feed` or `/leaderboards`
- Browser console inspection on the representative authenticated routes, recording any env/auth blocker separately from UI regressions

## Observability / Diagnostics

- Runtime signals: route-level shell chrome (nav/header), `data-*` attributes on shell/primitives for durable browser assertions, representative page rendering inside the shared layout region.
- Inspection surfaces: `tests/app-shell.spec.ts`, browser assertions on authenticated routes, browser console logs, and the running worktree-local web app on port 3001.
- Failure visibility: explicit selector/assertion failure for missing shell wiring, route-specific render regressions, and separate recording of Clerk/env blockers if middleware prevents page render.
- Redaction constraints: never print env values, Clerk secrets, or auth tokens; report only variable names and blocker class.

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/app/layout.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/components/Header.tsx`, `apps/web/src/app/globals.css`, representative route files under `apps/web/src/app/`, and existing auth/user navigation surfaces.
- New wiring introduced in this slice: authenticated route-group layout/app shell, split public-vs-auth navigation composition, shared authenticated UI primitives, and browser proof covering the shell on live routes.
- What remains before the milestone is truly usable end-to-end: S04 still needs to roll the design system across the remaining authenticated pages; S05/S06 still need live backend/mobile verification.

## Tasks

- [x] **T01: Define authenticated design tokens and shell primitives** `est:1.5h`
  - Why: S03’s main risk is inconsistency across 17 pages. The fastest way to retire that risk is to define the visual vocabulary once — app-surface tokens, gradients, chrome, card treatments, and narrow reusable primitives — before route wiring starts.
  - Files: `apps/web/src/app/globals.css`, `apps/web/src/components/app-shell/AppCard.tsx`, `apps/web/src/components/app-shell/PageHeader.tsx`, `apps/web/src/components/app-shell/StatCard.tsx`, `apps/web/src/components/app-shell/AppBadge.tsx`, `apps/web/src/lib/utils.ts`
  - Do: Add a dedicated authenticated app-shell section in `globals.css` with semantic classes/tokens that stay separate from the existing `landing-*` styles; implement thin shared primitives for page headers, card surfaces, stat cards, and pill/badge treatments using the project’s `cn()` helper; add durable `data-*` hooks where browser proof will need them; keep the primitives compositional rather than hiding page-specific logic.
  - Verify: `pnpm --filter web-app typecheck`
  - Done when: the design vocabulary exists in code as reusable authenticated primitives, typechecks cleanly, and executors in later tasks can consume it without redefining styles locally.
- [x] **T02: Wire the authenticated route shell and navigation split** `est:2h`
  - Why: The slice does not count as done if every page still owns its own wrapper/header. This task introduces the real composition seam: protected pages share one shell, while public routes keep the landing-specific header/layout.
  - Files: `apps/web/src/app/layout.tsx`, `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/Header.tsx`, `apps/web/src/components/app-shell/AppShell.tsx`, `apps/web/src/components/app-shell/AppNav.tsx`, `apps/web/src/components/common/UserNav.tsx`, `apps/web/src/middleware.ts`
  - Do: Introduce a protected-route layout boundary (prefer an `(app)` route group or equivalent) that wraps authenticated pages in a shared shell while preserving `/` and `/shared/[id]` outside it; split the current header responsibilities so public marketing navigation stays isolated and authenticated navigation surfaces real product destinations; make the shell responsive enough for desktop/mobile widths and compatible with Clerk/user-nav state.
  - Verify: `pnpm --filter web-app typecheck` and manual route smoke in the browser against the worktree-local server on port 3001
  - Done when: authenticated routes render through one shell/nav composition path, public landing/shared routes remain outside that shell, and the new nav exposes the destinations called for in the roadmap without regressing auth wiring.
- [x] **T03: Retrofit representative authenticated pages and add runtime shell proof** `est:2h`
  - Why: S03 must leave behind proven structure, not theoretical scaffolding. Applying the shell/primitives to representative pages demonstrates the system works across different page shapes and gives S04 a trustworthy base.
  - Files: `apps/web/src/app/workouts/page.tsx`, `apps/web/src/app/exercises/page.tsx`, `apps/web/src/app/analytics/page.tsx`, `apps/web/src/app/feed/page.tsx`, `apps/web/src/app/leaderboards/page.tsx`, `apps/web/tests/app-shell.spec.ts`, `apps/web/playwright.config.ts`
  - Do: Refactor at least one core list page, one dashboard-style page, and one social/competitive page to consume `PageHeader`, `AppCard`, `StatCard`, and shell-aware layout spacing instead of ad hoc wrappers; add/adjust Playwright coverage that signs into the app using the existing local auth setup and asserts shell chrome plus route-specific content/data hooks on representative pages; record Clerk/env middleware failures as blockers rather than misclassifying them as UI defects.
  - Verify: `pnpm --filter web-app typecheck`; `pnpm --filter web-app exec playwright test tests/app-shell.spec.ts`; browser console review on the representative authenticated routes
  - Done when: representative routes visibly use the shared shell/primitives, automated browser proof passes on the worktree server or produces a clear auth/env blocker, and S04 can fan the same system out to the remaining pages.

## Files Likely Touched

- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(app)/layout.tsx`
- `apps/web/src/components/Header.tsx`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppNav.tsx`
- `apps/web/src/components/app-shell/AppCard.tsx`
- `apps/web/src/components/app-shell/PageHeader.tsx`
- `apps/web/src/components/app-shell/StatCard.tsx`
- `apps/web/src/components/app-shell/AppBadge.tsx`
- `apps/web/src/app/workouts/page.tsx`
- `apps/web/src/app/exercises/page.tsx`
- `apps/web/src/app/analytics/page.tsx`
- `apps/web/src/app/feed/page.tsx`
- `apps/web/src/app/leaderboards/page.tsx`
- `apps/web/tests/app-shell.spec.ts`
- `apps/web/playwright.config.ts`
