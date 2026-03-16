# M006/S03 — Research

**Date:** 2026-03-16

## Summary

S03 owns R031’s foundation layer, not the full page-by-page makeover. The authenticated web app currently has no shared app shell: each protected route renders its own `<main>` wrapper, width container, page heading, back link, and action row with repeated gray-card styling. `apps/web/src/components/Header.tsx` is still a homepage-first navbar with a few auth links bolted on, while `apps/web/src/app/layout.tsx` only mounts fonts and `ConvexClientProvider`. That means S03’s highest-value move is to introduce a protected-route layout seam and a small set of shared primitives that S04 can apply across all 17 internal pages without re-deciding structure on each page.

The codebase is already using Tailwind 4 through `globals.css`, and S02 added a large `landing-*` styling section there. Those landing classes should stay isolated. For S03, the right move is to add a new app-shell/design-system section in `globals.css` with tokens and semantic utility classes for authenticated surfaces: background layers, panel/card styles, pill controls, page headers, status badges, sidebar/top-nav chrome, and a small set of reusable gradient treatments. Existing internal pages are mostly plain but structurally clean, so the slice is straightforward if the planner treats it as foundation work rather than trying to redesign every screen now.

## Recommendation

Build S03 around a route-level authenticated shell plus 4–6 shared primitives.

Concretely: split public marketing/header concerns from authenticated navigation; add an `(app)` route group or equivalent protected layout wrapper; move repeated page scaffolding into shared components such as `AppShell`, `PageHeader`, `AppCard`, `StatCard`, and `AppBadge`; then retrofit a representative set of routes to consume those primitives so the system is proven before S04 rolls it across the whole app. Keep the primitives intentionally narrow and compositional — wrappers for existing page content, not a new component framework.

Why this approach: the current duplication is in page structure and surface styling more than in business logic. A shell-first slice retires the inconsistency risk called out in the roadmap, creates a single authenticated navigation model, and gives S04 a stable vocabulary for refreshing the remaining 17 pages without repeatedly touching layout, spacing, and header patterns.

## Implementation Landscape

### Key Files

- `apps/web/src/app/layout.tsx` — current root layout only sets fonts and `ConvexClientProvider`; no app/public shell split exists yet.
- `apps/web/src/middleware.ts` — defines which routes are protected. Useful boundary for deciding which pages should move under an authenticated shell route group.
- `apps/web/src/components/Header.tsx` — current header mixes landing-page anchor nav and authenticated links; should likely be split into public header vs authenticated app nav.
- `apps/web/src/app/globals.css` — current global theme + full S02 `landing-*` section. Best place to add S03 app-shell tokens and utility classes under a distinct section to avoid coupling with homepage styles.
- `apps/web/src/app/workouts/page.tsx` — representative protected page with ad hoc title/action row and plain gray/white surface styles.
- `apps/web/src/app/exercises/page.tsx` — representative protected list page with duplicated max-width container + heading structure.
- `apps/web/src/app/analytics/page.tsx` — representative page already using local picker/card patterns; good candidate for extracting `PageHeader`, `AppCard`, and pill controls.
- `apps/web/src/app/feed/page.tsx` — representative social page with its own layout width and card stack, likely needs the shell to support a narrower content column inside a wider shell.
- `apps/web/src/app/challenges/page.tsx` — representative complex page with back link, filter row, expandable form, list/detail view; useful for proving shell + shared header patterns handle richer layouts.
- `apps/web/src/app/leaderboards/page.tsx` — representative page with filters, table, and “My Rank” callout; good proving ground for shared card/table wrappers.
- `apps/web/src/app/profile/[username]/page.tsx` — representative profile page already composed from `ProfileStats` and `BadgeDisplay`; likely consumer of shared `PageHeader`/section cards rather than a deep rewrite.
- `apps/web/src/app/workouts/active/page.tsx` — active workout route currently just wraps `ActiveWorkout`; needs shell compatibility but should avoid over-constraining focused workout flow.
- `apps/web/src/components/workouts/WorkoutCard.tsx` — current internal card styling pattern (`rounded-xl border bg-white shadow-sm`) repeated across the app; candidate to replace with a design-system card surface.
- `apps/web/src/components/exercises/ExerciseCard.tsx` — another repeated card pattern with local badge styles.
- `apps/web/src/components/feed/FeedItem.tsx` — confirms feed uses the same card language; can migrate to shared card/badge utilities.
- `apps/web/src/components/profile/ProfileStats.tsx` — already contains a local `StatCard`; likely extract a shared version for S03.
- `apps/web/src/components/common/UserNav.tsx` — existing auth dropdown usable inside the authenticated shell once the top-level nav is redesigned.
- `apps/web/src/lib/utils.ts` — only `cn()` helper today; enough for shared primitives.

### Build Order

1. **Define authenticated shell boundary first**
   - Decide whether to introduce an App Router route group (preferred) for protected pages, leaving `/` and `/shared/[id]` on the public root layout path.
   - This is the main architectural seam. Until it exists, every page redesign will keep duplicating wrapper code.

2. **Add app-shell design tokens/classes in `globals.css`**
   - Create a clearly named S03 section for app background, shell chrome, navigation rail/topbar, card surfaces, section spacing, warm gradients, badge treatments, and control states.
   - Reuse Tailwind utilities where possible; reserve custom classes for semantic surfaces and multi-property treatments.

3. **Extract shared primitives**
   - Likely new components under `apps/web/src/components/app-shell/` or `components/ui/`: `AppShell`, `AppNav`, `PageHeader`, `AppCard`, `StatCard`, `AppBadge`.
   - Keep them thin wrappers around class composition; avoid hiding data fetching or route logic.

4. **Redesign authenticated navigation and header**
   - Replace the current `Header.tsx` single-component approach with public and authenticated variants, or move auth nav fully into the shell and keep `Header` public-only.
   - Include primary destinations surfaced in roadmap/context: exercises, workouts, analytics, feed, templates, profile, leaderboards, challenges, plus session/join paths as secondary.

5. **Prove the system on representative routes**
   - At minimum: one core list page (`/exercises` or `/workouts`), one dashboard-like page (`/analytics`), and one social/competitive page (`/feed` or `/leaderboards`).
   - This is enough evidence that S04 can fan out the same system across the remaining pages.

### Verification Approach

- `pnpm --filter web-app typecheck` — required contract check after layout/component extraction.
- `pnpm --filter web-app dev --port 3001` from the worktree if shared `:3000` is serving another checkout.
- Browser verification on authenticated routes (after sign-in state is available):
  - confirm a consistent nav/header appears on protected pages
  - confirm page content still renders inside the new shell
  - confirm no console errors introduced by layout refactor
  - confirm responsive behavior at desktop + mobile widths for shell navigation
- Good smoke set for S03 proof:
  - `/workouts`
  - `/exercises`
  - `/analytics`
  - `/feed` or `/leaderboards`
- Final browser assertions should target shell presence plus page-specific carry-through, not visual prose alone.

## Constraints

- The project uses **Next.js App Router + Tailwind 4**; global design tokens live in `apps/web/src/app/globals.css` via `@theme` and plain CSS classes, not `tailwind.config.js`.
- `apps/web/src/middleware.ts` protects most app routes but explicitly leaves `/shared/[id]` public; the shell split must preserve that boundary.
- `apps/web/src/app/layout.tsx` currently applies **Inter, Montserrat, and Lato simultaneously** on `<body>`. Any typography system in S03 has to work with those loaded fonts unless the executor deliberately simplifies the font strategy.
- Many page files are `