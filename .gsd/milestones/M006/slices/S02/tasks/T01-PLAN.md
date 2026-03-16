---
estimated_steps: 4
estimated_files: 5
---

# T01: Retire stale public branding and route users into real app entry points

**Slice:** S02 — Landing Page Redesign
**Milestone:** M006

## Description

Remove the most obvious starter-template residue from the public-facing shell before touching the main landing sections. This task updates branding, nav labels, and CTA/link targets so the page stops advertising a notes product and starts routing people into the actual workout app.

## Steps

1. Audit the public header, logo, shared landing-facing footer copy, and signed-in user navigation for visible `UseNotes`, `note-taking`, and `/notes` references that would still appear on `/`.
2. Update `Header.tsx`, `Logo.tsx`, and any landing-facing shared navigation copy so the public shell describes the workout tracker and uses real routes such as auth, workouts, exercises, feed, leaderboards, or challenges.
3. Fix signed-in landing-facing navigation affordances in `UserNav.tsx` and related CTA labels/targets so authenticated users are not sent to `/notes` and the landing page remains credible in both auth states.
4. Run typecheck and verify in the browser that the header/footer shell on `/` contains no visible UseNotes residue and no visible CTA targets `/notes`.

## Must-Haves

- [ ] Visible public-shell branding on `/` is workout-tracker specific rather than UseNotes-specific.
- [ ] Signed-out and signed-in landing-facing CTAs/link targets no longer send users to `/notes`.

## Verification

- `pnpm --filter web-app typecheck`
- Browser-check `http://localhost:3000/` and confirm header/logo/footer shell text is workout-tracker specific and no visible landing-page CTA routes to `/notes`

## Inputs

- `apps/web/src/components/Header.tsx` — current public navigation still exposes old landing anchors and stale CTA destinations.
- `apps/web/src/components/common/Logo.tsx` — current text brand still renders `UseNotes` and must be retired for R030 to be truthful.
- `apps/web/src/components/common/UserNav.tsx` — signed-in dashboard routing still points at `/notes` and can leak stale product assumptions onto `/`.
- `apps/web/src/components/home/Footer.tsx` — footer copy is part of the visible landing shell and still carries template language.
- `apps/web/src/app/page.tsx` — keep the existing composition pattern intact while swapping branding surfaces.

## Expected Output

- `apps/web/src/components/Header.tsx` — public nav and CTA labels/targets updated to workout-tracker routes.
- `apps/web/src/components/common/Logo.tsx` — product brand text updated with no visible UseNotes residue.
- `apps/web/src/components/common/UserNav.tsx` — signed-in landing-facing destination labels/targets aligned with the real app.
- `apps/web/src/components/home/Footer.tsx` — footer branding/copy aligned with the workout product.
- `apps/web/src/app/page.tsx` — still composes the landing page without introducing a new route structure.

## Observability Impact

- Runtime signals changed: the visible header/logo/footer copy and landing-page CTA href targets on `/` now advertise workout tracking routes instead of starter-template `/notes` destinations.
- Inspection surfaces: `http://localhost:3000/`, browser assertions for visible branding text and link hrefs, browser console logs for homepage runtime noise, and `pnpm --filter web-app typecheck` for compile-time regressions.
- Failure visibility: stale `UseNotes`/`note-taking` text, visible `/notes` CTA targets, or nav regressions for signed-in users remain directly inspectable on the live page and in rendered link attributes.
