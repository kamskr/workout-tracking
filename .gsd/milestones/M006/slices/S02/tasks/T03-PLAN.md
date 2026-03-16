---
estimated_steps: 5
estimated_files: 7
---

# T03: Run slice verification and close runtime polish gaps on the home page

**Slice:** S02 — Landing Page Redesign
**Milestone:** M006

## Description

Close the slice with live proof rather than static confidence. This task verifies the redesigned landing page at runtime, checks for stale branding and bad CTA destinations, inspects console/runtime behavior, and fixes homepage-only polish issues uncovered during that pass.

## Steps

1. Start from the redesigned landing page and run `pnpm --filter web-app typecheck` so the slice closes with a passing compile signal.
2. Verify the live `/` page in the browser with explicit checks for workout-tracker branding, presence of hero/features/social-proof/final CTA sections, and absence of visible `UseNotes` or `note-taking` copy.
3. Inspect CTA destinations and authenticated/signed-out affordances on the rendered landing page to ensure they point to real app or auth entry points instead of `/notes`.
4. Review browser console output on `/` and identify any new JavaScript/runtime errors or redesign-induced warnings inside S02-owned components.
5. Fix any remaining homepage-only issues found during verification, then rerun the browser checks so the slice ends with clean runtime evidence.

## Must-Haves

- [ ] Slice verification on the live root page passes with no visible UseNotes residue.
- [ ] Landing-page CTAs are credible and point to real app/auth surfaces instead of `/notes`.
- [ ] No new homepage JavaScript/runtime failures remain after the redesign.

## Verification

- `pnpm --filter web-app typecheck`
- Browser assertions on `http://localhost:3000/` covering visible branding, section presence, and absence of visible `UseNotes` / `note-taking` copy
- Browser console review on `/` showing no new JavaScript/runtime errors after landing-page changes

## Observability Impact

- Signals added/changed: homepage browser assertions and console diagnostics become the authoritative slice-close signal.
- How a future agent inspects this: run the typecheck, load `/` in the browser, assert on visible sections/text, and inspect console logs.
- Failure state exposed: stale copy, wrong routes, missing sections, and client-side runtime regressions are directly visible in browser assertions/logs.

## Inputs

- `apps/web/src/components/home/Hero.tsx` — redesigned hero must render truthfully at runtime.
- `apps/web/src/components/home/Benefits.tsx` — feature section must survive real rendering without layout/runtime issues.
- `apps/web/src/components/home/Testimonials.tsx` — social-proof section must be present and use workout copy.
- `apps/web/src/components/home/FooterHero.tsx` — final CTA must route to a real app or auth entry point.
- `apps/web/src/components/home/Footer.tsx` — footer must be brand-clean after the redesign.
- `apps/web/src/components/Header.tsx` — landing header targets and labels need final runtime confirmation.
- `apps/web/src/app/globals.css` — landing-specific styling changes may surface browser/runtime polish issues.

## Expected Output

- `apps/web/src/components/home/Hero.tsx` — any verification-driven homepage fixes applied.
- `apps/web/src/components/home/Benefits.tsx` — any verification-driven homepage fixes applied.
- `apps/web/src/components/home/Testimonials.tsx` — any verification-driven homepage fixes applied.
- `apps/web/src/components/home/FooterHero.tsx` — any verification-driven homepage fixes applied.
- `apps/web/src/components/home/Footer.tsx` — any verification-driven homepage fixes applied.
- `apps/web/src/components/Header.tsx` — final CTA/route polish applied if verification finds issues.
- `apps/web/src/app/globals.css` — final homepage-only visual/runtime polish if needed.
