---
id: S02
parent: M006
milestone: M006
provides:
  - Workout-specific landing-page branding, CTA routing, and premium homepage sections at `/`, plus explicit diagnostics for the remaining Clerk auth-config blocker preventing live render proof
requires:
  - slice: S01
    provides: Working local web runtime and package-level env wiring needed to typecheck and attempt live homepage verification
affects:
  - S03
key_files:
  - apps/web/src/app/page.tsx
  - apps/web/src/app/globals.css
  - apps/web/src/components/Header.tsx
  - apps/web/src/components/common/Logo.tsx
  - apps/web/src/components/common/UserNav.tsx
  - apps/web/src/components/home/Hero.tsx
  - apps/web/src/components/home/Benefits.tsx
  - apps/web/src/components/home/Testimonials.tsx
  - apps/web/src/components/home/FooterHero.tsx
  - apps/web/src/components/home/Footer.tsx
key_decisions:
  - Kept `/` on the existing `app/page.tsx` composition seam and confined S02 changes to landing-facing shared surfaces plus `components/home/*` instead of introducing a new route shell.
  - Kept new homepage styling under `landing-*` primitives in `apps/web/src/app/globals.css` so S02 could ship independently of the app-wide design-system work planned for S03.
  - Treated the Clerk publishable-key failure as a shared runtime/env blocker before render, not as a homepage-component bug.
patterns_established:
  - Public landing-shell navigation should point only at real product routes (`/sign-in`, `/sign-up`, `/workouts`, `/exercises`, `/feed`, `/leaderboards`, `/challenges`) rather than template placeholders.
  - Landing-only visual refreshes should stay scoped under `landing-*` primitives until S03 establishes app-wide tokens.
  - When browser proof is blocked by middleware before render, close the slice with compile/static verification plus captured runtime evidence from the worktree-local server.
observability_surfaces:
  - `pnpm --filter web-app typecheck`
  - `rg -n "UseNotes|note-taking|Note-Taking|/notes" apps/web/src/components/home apps/web/src/components/Header.tsx apps/web/src/components/common/Logo.tsx apps/web/src/components/common/UserNav.tsx apps/web/src/app/page.tsx apps/web/src/app/globals.css`
  - `http://localhost:3001/` on the worktree-local server, whose page source currently resolves to Next `/_error` with Clerk `Publishable key not valid.` before homepage render
  - Browser page source on `http://localhost:3001/` (`__NEXT_DATA__` / edge stack) as the authoritative blocker surface when the body is blank
 drill_down_paths:
  - .gsd/milestones/M006/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S02/tasks/T03-SUMMARY.md
duration: 1h 50m
verification_result: passed
completed_at: 2026-03-16 15:51:00 +0100
---

# S02: Landing Page Redesign

**Replaced the leftover UseNotes marketing shell with workout-tracker branding and premium landing sections, then closed the slice with explicit runtime diagnostics showing Clerk middleware still blocks live homepage proof in this worktree.**

## What Happened

S02 replaced the public-facing homepage without disturbing the authenticated app-shell work reserved for S03.

First, the shared landing-facing shell was cleaned up. Header, logo, signed-in dropdown, and footer copy were moved off UseNotes/template language and onto workout-product branding. Visible public and signed-in CTAs were repointed to real routes like `/sign-in`, `/sign-up`, `/workouts`, `/exercises`, `/feed`, `/leaderboards`, and `/challenges` instead of `/notes` placeholders.

Then the landing sections themselves were rewritten. The hero now sells the actual workout tracker, not note-taking. The middle sections were rebuilt as a workout capability showcase and results/social-proof narrative tied to real product surfaces already shipped in M001–M005. The bottom CTA was rewritten to drive users into auth and real app entry points. Styling for this redesign lives in `apps/web/src/app/globals.css` under landing-scoped `landing-*` primitives: warm gradients, glassy cards, metric blocks, bold typography, and rounded section treatments.

Slice-close verification then focused on truth rather than appearances. Static residue scans stayed clean and the web package typecheck passed. The shared `:3000` server was confirmed to be serving another checkout, so worktree verification moved to `:3001`. On that truthful worktree-local target, the request never reached the homepage because Clerk middleware failed first with `Publishable key not valid.`. That blocker was captured explicitly rather than papered over with homepage-only fixes.

## Verification

Passed:
- `pnpm --filter web-app typecheck`
- `rg -n "UseNotes|note-taking|Note-Taking|/notes" apps/web/src/components/home apps/web/src/components/Header.tsx apps/web/src/components/common/Logo.tsx apps/web/src/components/common/UserNav.tsx apps/web/src/app/page.tsx apps/web/src/app/globals.css` returned no matches
- Browser/page-source inspection on `http://localhost:3001/` confirmed the current runtime blocker shape in the active worktree

Observed during runtime verification:
- `http://localhost:3000/` was not trustworthy slice proof because it was serving a stale non-worktree checkout
- `http://localhost:3001/` resolved to Next `/_error` before render
- Browser page source showed `__NEXT_DATA__` with `statusCode: 500` and Clerk edge error `Publishable key not valid.`
- Browser console produced no redesign-induced client errors after the middleware failure, because the landing page never rendered

## Requirements Advanced

- R030 — Source-level residue is removed from the landing-owned surfaces, workout-specific sections and CTA routes are in place, and the slice now has concrete runtime diagnostics for the remaining blocker to final live proof.
- R029 — S02 exercised the web-runtime boundary established in S01 and confirmed the next blocker is auth configuration quality, not missing env-file wiring or missing package setup.

## Requirements Validated

- none — R030 remains active because live homepage assertions on visible sections and CTA behavior are still blocked by Clerk middleware before render.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Slice browser verification used the worktree-local server at `http://localhost:3001/` instead of the plan’s nominal `http://localhost:3000/`, because the shared `:3000` process was serving a different checkout and would have produced false proof.

## Known Limitations

- Live render proof for `/` is still blocked in this worktree by an invalid Clerk publishable key. The request fails in middleware before any landing UI renders.
- Because middleware fails before render, this slice could not finish the planned visible-browser assertions for hero/features/social-proof/final CTA on the live page, even though the source and typecheck evidence are in place.
- The Apple Fitness+ visual refresh is currently limited to public landing surfaces. Authenticated shell and internal page design work still belong to S03/S04.

## Follow-ups

- Repair the local Clerk publishable key used by the worktree web app, then rerun browser assertions on `http://localhost:3001/` to convert R030 from advanced to validated.
- In S03, treat the new `landing-*` primitives as intentionally local; do not stretch them into app-wide tokens without a deliberate consolidation pass.

## Files Created/Modified

- `apps/web/src/components/Header.tsx` — replaced public-nav labels and CTA targets with workout-product routes.
- `apps/web/src/components/common/Logo.tsx` — retired visible UseNotes branding in favor of `LiftLab`.
- `apps/web/src/components/common/UserNav.tsx` — changed the signed-in dropdown route/label from notes copy to workouts.
- `apps/web/src/components/home/Hero.tsx` — rebuilt the hero around workout-tracker messaging and real app CTAs.
- `apps/web/src/components/home/Benefits.tsx` — replaced template benefits with real workout, analytics, social, and competition feature cards.
- `apps/web/src/components/home/Testimonials.tsx` — replaced note-taking testimonials with fitness-oriented results/social-proof content.
- `apps/web/src/components/home/FooterHero.tsx` — rebuilt the bottom CTA section around sign-up and real product entry points.
- `apps/web/src/components/home/Footer.tsx` — aligned footer copy, nav labels, and CTA targets with the redesign.
- `apps/web/src/app/globals.css` — added landing-scoped `landing-*` styles for gradients, card treatments, metrics, and section layouts.
- `.gsd/milestones/M006/slices/S02/tasks/T01-SUMMARY.md` — recorded shared-shell branding and routing changes.
- `.gsd/milestones/M006/slices/S02/tasks/T02-SUMMARY.md` — recorded landing-section rewrite and styling scope.
- `.gsd/milestones/M006/slices/S02/tasks/T03-SUMMARY.md` — recorded slice-close verification and the Clerk runtime blocker.

## Forward Intelligence

### What the next slice should know
- If homepage verification shows a blank body or empty accessibility tree, inspect page source before touching UI code. In this worktree the truth is in `__NEXT_DATA__`, which shows the request dying in Clerk middleware before render.
- The public marketing shell now routes toward real app entry points. S03 can assume `/notes` is no longer the intended landing-path target anywhere in these shared public surfaces.
- The new landing visuals are intentionally local. S03 should establish app-wide tokens fresh instead of inheriting `landing-*` names as if they were already the design system.

### What's fragile
- Local Clerk runtime configuration — if the publishable key is invalid, every homepage browser assertion becomes meaningless because the page never mounts.
- Shared dev-server assumptions — `localhost:3000` may point at a different checkout during auto-mode, so slice verification can silently look at stale UI if the server origin is not confirmed first.

### Authoritative diagnostics
- `pnpm --filter web-app typecheck` — fastest trustworthy contract check that the landing rewrite still compiles.
- `rg -n "UseNotes|note-taking|Note-Taking|/notes" ...` across the landing-owned files — quickest residue check for stale branding and placeholder routes.
- Browser page source on `http://localhost:3001/` — authoritative for the current blocker because it shows the exact Clerk edge error and proves failure happens before any homepage component code runs.

### What assumptions changed
- Assumption: `http://localhost:3000/` would be the truthful target for slice verification — Actually it was serving a different checkout, so worktree proof had to move to `:3001`.
- Assumption: browser verification failures would likely come from stale landing code or bad CTA wiring — Actually the request was blocked earlier by invalid Clerk auth config in middleware.
