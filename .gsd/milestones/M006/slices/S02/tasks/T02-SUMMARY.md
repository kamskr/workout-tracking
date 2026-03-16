---
id: T02
parent: S02
milestone: M006
provides:
  - Premium workout-specific landing sections and landing-only styling at `/` with a rewritten hero, feature showcase, results/social-proof section, and bottom CTA
key_files:
  - apps/web/src/components/home/Hero.tsx
  - apps/web/src/components/home/Benefits.tsx
  - apps/web/src/components/home/Testimonials.tsx
  - apps/web/src/components/home/FooterHero.tsx
  - apps/web/src/components/home/Footer.tsx
  - apps/web/src/app/globals.css
  - .gsd/milestones/M006/slices/S02/S02-PLAN.md
key_decisions:
  - Rebuilt the landing page with CSS-led warm gradients, glassy layered cards, and workout-product storytelling instead of continuing to depend on the starter template artwork
patterns_established:
  - Landing-only visual refreshes for `/` should live in `apps/web/src/app/globals.css` as scoped section primitives (`landing-*`) rather than leaking app-wide tokens ahead of S03
observability_surfaces:
  - `pnpm --filter web-app typecheck`, `rg -n "UseNotes|note-taking|Note-Taking|/notes"` against landing-owned files, and the live worktree homepage at `http://localhost:3001/` (currently blocked by Clerk publishable-key runtime error)
duration: 36m
verification_result: passed
completed_at: 2026-03-16 15:27:51 +0100
blocker_discovered: false
---

# T02: Rebuild the landing sections into a premium workout showcase

**Replaced the homepage sections with a premium workout-product narrative and landing-only styling, while carrying forward the known Clerk runtime blocker on live browser proof.**

## What Happened

Rewrote the landing-page section set without changing the `/` orchestration seam in `page.tsx`.

- `Hero.tsx` is now a workout-specific opening section with premium copy, auth/app CTAs, training-focus chips, and a CSS-led device/card composition instead of the starter note-taking artwork.
- `Benefits.tsx` now sells real product surfaces: workout logging, exercise discovery, analytics, feed, leaderboards, challenges, and live sessions. The feature cards map directly to existing app capabilities.
- `Testimonials.tsx` is now a results/social-proof section with believable athlete stories plus product-scale metrics, replacing the old note-taking testimonials.
- `FooterHero.tsx` is now a bottom conversion block aimed at real app entry points (`/sign-up`, `/feed`) rather than stale notes flows.
- `Footer.tsx` was refreshed again so its final copy/tone matches the redesigned landing sections and uses “Results” instead of “Community” for the footer anchor label.
- `globals.css` now contains a landing-only style layer built around warm gradients, rounded glass surfaces, bold typography, metric cards, and section primitives under a `landing-*` namespace. I left app-wide design-system work out of scope for S03.

I did not change `page.tsx` because the existing section composition seam already matched the task plan.

## Verification

- Passed: `pnpm --filter web-app typecheck`
- Passed: `rg -n "UseNotes|note-taking|Note-Taking|/notes" apps/web/src/components/home apps/web/src/app/page.tsx apps/web/src/app/globals.css` returned no matches in the landing-owned files.
- Runtime attempt on repo-root server (`http://localhost:3000/`) showed stale UseNotes markup, confirming that server is not serving this worktree and is not valid proof for T02.
- Started a worktree-local Next dev server on `http://localhost:3001/` with `pnpm -C apps/web dev --port 3001`.
- Runtime verification on `http://localhost:3001/` is blocked by the existing Clerk environment issue: the page fails before render with `Publishable key not valid.`
- Browser diagnostics for the worktree server captured the runtime blocker directly. No additional console or network errors beyond the failing Clerk boot were surfaced.

## Diagnostics

- Static residue scan: `rg -n "UseNotes|note-taking|Note-Taking|/notes" apps/web/src/components/home apps/web/src/app/page.tsx apps/web/src/app/globals.css`
- Compile-time proof: `pnpm --filter web-app typecheck`
- Live worktree inspection target: `http://localhost:3001/`
- Current runtime blocker signal: Next runtime error overlay with `Publishable key not valid.` before homepage render
- Future inspection surface once env is fixed: open `/` and confirm the section sequence is hero → feature highlights → results/social proof → final CTA with `landing-*` styling visible

## Deviations

- Browser verification used the worktree-local server on `http://localhost:3001/` instead of the slice plan’s default `http://localhost:3000/` because the already-running `:3000` server was serving the repo root checkout, not this auto-mode worktree.

## Known Issues

- Live landing-page render from this worktree remains blocked by the invalid Clerk publishable key in local runtime configuration. This prevents final browser proof of the new sections until the env issue is resolved.
- `http://localhost:3000/` currently serves a different checkout and still shows stale landing content, so slice-level browser verification must use the worktree server or restart the shared server from this tree.

## Files Created/Modified

- `apps/web/src/components/home/Hero.tsx` — replaced the template hero with workout-product messaging, real CTAs, and a premium card-based visual composition.
- `apps/web/src/components/home/Benefits.tsx` — rewrote the section into a workout capability showcase tied to actual product surfaces.
- `apps/web/src/components/home/Testimonials.tsx` — replaced note-taking testimonials with fitness-oriented results stories and product metrics.
- `apps/web/src/components/home/FooterHero.tsx` — rebuilt the final CTA section around auth/community entry points.
- `apps/web/src/components/home/Footer.tsx` — aligned the closing footer copy and section labels with the new landing narrative.
- `apps/web/src/app/globals.css` — added landing-scoped `landing-*` styles for gradients, layered cards, typography, section layouts, and CTA surfaces.
- `.gsd/milestones/M006/slices/S02/S02-PLAN.md` — marked T02 complete.
