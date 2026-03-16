# S02: Landing Page Redesign

**Goal:** Replace the leftover UseNotes marketing site at `/` with a bold Apple Fitness+ inspired workout-tracker landing page that matches the real product, routes users into real app entry points, and removes stale branding across the public header/footer surface.
**Demo:** Visiting `http://localhost:3000/` shows a workout-specific hero, feature showcase, social-proof/results section, and bottom CTA with premium warm-gradient styling; no visible UseNotes or note-taking copy remains, and landing-page CTAs point to auth or real app routes instead of `/notes`.

## Must-Haves

- Public landing-page branding, navigation, logo text, footer copy, and CTA targets are workout-tracker specific with no visible UseNotes residue.
- `/` renders a polished workout-tracker showcase with hero, feature highlights, social-proof/results, and final CTA sections using an Apple Fitness+ inspired aesthetic.
- Slice verification proves the landing page renders cleanly at runtime, routes users toward real product entry points, and introduces no new homepage console/runtime failures.

## Proof Level

- This slice proves: integration
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `pnpm --filter web-app typecheck`
- Browser verification at `http://localhost:3000/` with explicit checks that workout-tracker branding is visible, hero/features/social-proof/final CTA sections render, no visible `UseNotes` or `note-taking` copy remains, and public CTAs do not route to `/notes`
- Browser diagnostics on `/` show no new JavaScript/runtime errors after the redesign

## Observability / Diagnostics

- Runtime signals: visible landing sections, CTA href targets, browser console warnings/errors on `/`
- Inspection surfaces: `http://localhost:3000/`, browser assertions/find results, browser console logs, `pnpm --filter web-app typecheck`
- Failure visibility: stale branding text, broken CTA destinations, missing section renders, and console/runtime errors are directly inspectable on the live page
- Redaction constraints: do not expose local env values or Clerk secrets while verifying browser/runtime state

## Integration Closure

- Upstream surfaces consumed: `apps/web/src/app/page.tsx`, `apps/web/src/components/Header.tsx`, `apps/web/src/components/common/Logo.tsx`, `apps/web/src/components/common/UserNav.tsx`, `apps/web/src/app/globals.css`, and the existing `apps/web/src/components/home/*` composition pattern
- New wiring introduced in this slice: refreshed public-nav copy/targets and a fully replaced landing-section composition at the existing `/` entrypoint
- What remains before the milestone is truly usable end-to-end: S03 must establish the authenticated app shell and shared web design tokens; S04 must apply that system across internal pages

## Tasks

- [x] **T01: Retire stale public branding and route users into real app entry points** `est:45m`
  - Why: The fastest way to satisfy R030 is to remove the most obvious UseNotes residue first. Header, logo, footer-adjacent copy, and signed-in user navigation still point at `/notes` and can fail the slice even if the hero is redesigned.
  - Files: `apps/web/src/components/Header.tsx`, `apps/web/src/components/common/Logo.tsx`, `apps/web/src/components/common/UserNav.tsx`, `apps/web/src/components/home/Footer.tsx`, `apps/web/src/app/page.tsx`
  - Do: Replace product naming and public-nav labels with workout-tracker specific copy; change signed-out and signed-in CTA/link targets away from `/notes` toward real auth or app routes (`/sign-in`, `/workouts`, `/exercises`, `/feed`, `/leaderboards`, `/challenges` as appropriate); keep the existing page composition pattern intact so S02 stays isolated from S03; remove any leftover note-taking language from shared landing-facing surfaces.
  - Verify: `pnpm --filter web-app typecheck` plus a browser pass on `/` confirming header/logo/footer text is workout-tracker specific and no visible CTA on the landing page targets `/notes`
  - Done when: The public header/footer shell and shared landing-facing navigation surfaces no longer expose UseNotes branding or `/notes` routes in visible UI for signed-out or signed-in states.
- [x] **T02: Rebuild the landing sections into a premium workout showcase** `est:1h 30m`
  - Why: This is the user-facing heart of the slice. The current hero, benefits, testimonials, and footer CTA are all note-taking template sections and must be replaced wholesale to make the demo truthful.
  - Files: `apps/web/src/components/home/Hero.tsx`, `apps/web/src/components/home/Benefits.tsx`, `apps/web/src/components/home/Testimonials.tsx`, `apps/web/src/components/home/FooterHero.tsx`, `apps/web/src/components/home/Footer.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/app/page.tsx`
  - Do: Rewrite the landing sections around the real product with a bold Apple Fitness+ inspired direction — workout-specific hero, feature highlight grid, results/social-proof storytelling, and a final CTA block; prefer CSS-led composition, gradients, layered cards, and warm accent treatments over template asset dependence; add only landing-specific styling primitives needed for S02 and keep authenticated-page design-system work out of scope.
  - Verify: `pnpm --filter web-app typecheck` and live browser inspection of `/` confirming the presence of hero, feature highlights, social-proof/results, and bottom CTA sections with workout-tracker copy
  - Done when: The root page is a coherent workout-tracker showcase with no visible note-taking content and clearly differentiated premium styling across all landing sections.
- [x] **T03: Run slice verification and close runtime polish gaps on the home page** `est:45m`
  - Why: S02 is only done when the actual runtime page is clean. This task closes the loop by checking for stale copy, credible CTA destinations, and console/runtime issues that the redesign may introduce or inherit.
  - Files: `apps/web/src/components/home/Hero.tsx`, `apps/web/src/components/home/Benefits.tsx`, `apps/web/src/components/home/Testimonials.tsx`, `apps/web/src/components/home/FooterHero.tsx`, `apps/web/src/components/home/Footer.tsx`, `apps/web/src/components/Header.tsx`, `apps/web/src/app/globals.css`
  - Do: Verify the live page at `/` with browser assertions and console inspection; fix any remaining homepage-only polish issues found during verification, especially stale copy, broken links, missing sections, or redesign-induced console/runtime warnings within S02-owned components; leave the page in a demonstrably shippable state for the landing-page slice.
  - Verify: `pnpm --filter web-app typecheck`, browser assertions on visible sections/text/URLs, and browser console log review showing no new JavaScript/runtime errors on `/`
  - Done when: Slice-level verification passes end-to-end and the landing page is runtime-clean enough to hand off to S03 without obvious public-page regressions.

## Files Likely Touched

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/Header.tsx`
- `apps/web/src/components/common/Logo.tsx`
- `apps/web/src/components/common/UserNav.tsx`
- `apps/web/src/components/home/Hero.tsx`
- `apps/web/src/components/home/Benefits.tsx`
- `apps/web/src/components/home/Testimonials.tsx`
- `apps/web/src/components/home/FooterHero.tsx`
- `apps/web/src/components/home/Footer.tsx`
