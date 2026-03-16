---
estimated_steps: 5
estimated_files: 7
---

# T02: Rebuild the landing sections into a premium workout showcase

**Slice:** S02 — Landing Page Redesign
**Milestone:** M006

## Description

Replace the template hero and supporting sections with a distinct workout-tracker marketing page that feels bold, premium, and specific to this product. Keep the existing page orchestration seam, but rewrite the actual landing sections and landing-only styling so the first impression matches the app that already exists behind auth.

## Steps

1. Rework the section narrative in `page.tsx` and the home-section components so the page tells a workout-product story: hero, feature highlights, results/social proof, and final CTA.
2. Rewrite `Hero.tsx` with workout-specific messaging, strong primary/secondary CTAs, and CSS-led composition that feels premium without relying on the old template artwork.
3. Rewrite `Benefits.tsx` into a feature showcase tied to real product capabilities like workout logging, exercise discovery, analytics, feed, leaderboards, challenges, and live sessions.
4. Rewrite `Testimonials.tsx`, `FooterHero.tsx`, and `Footer.tsx` into believable workout-tracker social-proof and conversion sections that match the new tone and remove all note-taking language.
5. Add or replace landing-specific styles in `globals.css` to support the chosen Apple Fitness+ inspired direction — warm gradients, rounded cards, layered surfaces, and strong spacing/typography — without drifting into S03’s app-wide design system work.

## Must-Haves

- [ ] The root page renders hero, feature, social-proof/results, and final CTA sections with workout-specific copy.
- [ ] Landing-page visuals feel intentionally premium and differentiated, not like a lightly edited starter template.
- [ ] No visible note-taking or UseNotes language remains in the landing sections.

## Verification

- `pnpm --filter web-app typecheck`
- Browser-check `http://localhost:3000/` and confirm the page visibly contains the new hero, feature highlights, social-proof/results section, and bottom CTA with workout-tracker copy

## Observability Impact

- Signals added/changed: the landing page’s visible section structure and CTA affordances become the primary runtime proof surface for S02.
- How a future agent inspects this: open `/` in the browser and inspect the rendered section sequence, copy, and CTA targets.
- Failure state exposed: missing or stale sections, weak template leftovers, and broken section composition remain immediately visible on the live page.

## Inputs

- `apps/web/src/app/page.tsx` — retain the existing composition seam so the slice stays isolated from S03.
- `apps/web/src/components/home/Hero.tsx` — currently full note-taking copy and old artwork usage; likely a full rewrite.
- `apps/web/src/components/home/Benefits.tsx` — structural seam for a workout-features section.
- `apps/web/src/components/home/Testimonials.tsx` — can be repurposed into member stories/results social proof.
- `apps/web/src/components/home/FooterHero.tsx` — bottom CTA block currently points to stale notes flows.
- `apps/web/src/components/home/Footer.tsx` — visible landing footer copy must match the new positioning.
- `apps/web/src/app/globals.css` — landing-only gradients and utility classes should live here without expanding into authenticated-page tokens.

## Expected Output

- `apps/web/src/components/home/Hero.tsx` — premium workout-specific hero section.
- `apps/web/src/components/home/Benefits.tsx` — workout feature showcase tied to real app capabilities.
- `apps/web/src/components/home/Testimonials.tsx` — social-proof/results section aligned to fitness use cases.
- `apps/web/src/components/home/FooterHero.tsx` — strong final CTA into the real product.
- `apps/web/src/components/home/Footer.tsx` — closing footer copy and links aligned with the workout tracker.
- `apps/web/src/app/globals.css` — landing-only styling primitives supporting the new aesthetic.
- `apps/web/src/app/page.tsx` — orchestrates the rewritten section set at the existing `/` route.
