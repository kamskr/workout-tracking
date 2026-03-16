# M006/S02 — Research

**Date:** 2026-03-16

## Summary

S02 is straightforward replacement work, not new architecture. The current `/` page is still the starter-template marketing site: `apps/web/src/app/page.tsx` simply composes `Header` plus five `components/home/*` sections, and every one of those sections still contains UseNotes/note-taking copy, outdated imagery, and `/notes` CTAs. The current render at `http://localhost:3000/` proves the problem directly: headings still say “UseNotes” and “The Ultimate Note-Taking Experience”.

The natural implementation seam is to keep the route shape the same — `app/page.tsx` composing a small set of home-only sections — but replace the landing-specific component set wholesale. The planner should treat `apps/web/src/components/home/` as redesign scope, with `Header.tsx`, `common/Logo.tsx`, and `globals.css` as supporting files because public-nav behavior, branding, and landing-page-only tokens all currently encode the old product.

## Recommendation

Replace the landing page by reusing the existing composition pattern (`Header` + home sections) rather than inventing a new shell or route structure. This keeps S02 isolated from S03 app-shell work. The recommended direction is a public-marketing page with workout-specific hero, feature showcase, social-proof/results section, and a strong CTA into the real product (`/workouts`, `/exercises`, `/feed`, `/leaderboards`, `/challenges` depending on signed-in state), with no dependency on the legacy `/notes` marketing flow.

Also treat branding cleanup as part of S02, not a polish pass: `Header`, `Logo`, footer copy, testimonial copy, and CTA destinations all still reference UseNotes. If only the hero is redesigned, R030 still fails.

## Implementation Landscape

### Key Files

- `apps/web/src/app/page.tsx` — current landing-page entrypoint; only composes `Header`, `Hero`, `Benefits`, `Testimonials`, `FooterHero`, and `Footer`. Safe place to keep orchestration simple while swapping section components.
- `apps/web/src/components/home/Hero.tsx` — current hero is entirely note-taking copy with `/notes` CTA and old artwork (`/images/hero.png`, `/images/hero_image_bg.svg`). Likely full rewrite or replacement.
- `apps/web/src/components/home/Benefits.tsx` — 4-card benefit grid, but all content/images are note-taking themed. Good structural seam for a workout-features section if desired.
- `apps/web/src/components/home/Testimonials.tsx` — currently uses testimonial cards and fake UseNotes copy. Can be repurposed into member stories/social proof/results.
- `apps/web/src/components/home/FooterHero.tsx` — bottom CTA block, currently note-taking themed with `/notes` CTA. Needs rewrite to product CTA.
- `apps/web/src/components/home/Footer.tsx` — footer still says “Take more efficient notes with UseNotes”, includes `/notes` link, and likely needs branding/copyright cleanup.
- `apps/web/src/components/Header.tsx` — public nav still exposes landing anchors for Benefits/Reviews, signed-out CTA links to `/notes`, signed-in nav still includes a “See your Notes” button. Must be updated or S02 will leave obvious template residue.
- `apps/web/src/components/common/Logo.tsx` — text brand still renders `UseNotes`; this is a hard blocker for “no trace of UseNotes”.
- `apps/web/src/components/common/Menu.tsx` — generic footer menu component; likely reusable unchanged if link list/text change only.
- `apps/web/src/components/common/UserNav.tsx` — account dropdown still links “Dashboard” to `/notes`; if the landing header reuses this on `/`, that label/target is stale and should be corrected during S02 or explicitly deferred with eyes open.
- `apps/web/src/app/globals.css` — current landing-only classes (`.linear_gradient`, `.bg_image`, `.button`) are tuned for the starter template. S02 can either replace them with new landing-specific utility classes or add new ones without touching the broader app design system that belongs to S03.
- `apps/web/public/images/*` — current assets are template leftovers (`hero.png`, `goodNews.png`, `cloudSync.png`, etc.). S02 can add workout-specific images here, but should prefer CSS-driven layout/gradient treatment where possible to avoid asset churn.

### Build Order

1. **Retire stale branding and CTA destinations first**
   - Decide the real public CTA targets and brand text.
   - Update `Logo.tsx`, `Header.tsx`, and footer/menu copy together so no partial page still says UseNotes.
   - This is the fastest way to kill the most obvious requirement failure.

2. **Replace the main landing sections**
   - Rewrite `Hero.tsx`, `Benefits.tsx`, `Testimonials.tsx`, `FooterHero.tsx`, and `Footer.tsx` around the workout product.
   - Keep `page.tsx` thin unless the redesign benefits from renamed/imported section files.

3. **Add only the landing-specific styling primitives needed for S02**
   - Use `globals.css` for page-level background treatments, gradients, and reusable landing utilities.
   - Do not broaden into authenticated-page tokens/app-shell work yet; that belongs to S03.

4. **Browser-pass the whole page for truthfulness**
   - Verify there is no visible UseNotes/note-taking copy, all major sections render, and CTAs/routes are credible.

### Verification Approach

- Run: `pnpm --filter web-app typecheck`
- Keep dev server on: `pnpm --filter web-app dev`
- Browser verify at `http://localhost:3000/`
- Explicit checks to run after implementation:
  - root page shows workout-tracker branding, not UseNotes
  - hero/feature/social-proof/CTA sections are present
  - no visible “UseNotes”, “note-taking”, or `/notes` CTA affordances remain on the landing page
  - signed-out CTA/navigation go to real app entry points or auth flow, not legacy notes pages
  - browser console stays free of new JS/runtime errors on `/`

## Constraints

- `apps/web/src/app/page.tsx` is a client component and already uses client-side `Header`; staying within that pattern keeps S02 isolated and low-risk.
- The project uses Next.js 16 + Tailwind 4 with `@theme` in `apps/web/src/app/globals.css`; landing-page styling should follow that setup rather than introducing a separate config path.
- S02 is terminal for the public landing page only. App-shell work for authenticated routes is explicitly S03, so avoid mixing public marketing redesign with internal navigation architecture.
- Clerk is already mounted globally via `apps/web/src/app/ConvexClientProvider.tsx`, and `Header.tsx` already branches on `useUser()`. Public-vs-signed-in CTA behavior can be implemented without new auth plumbing.

## Common Pitfalls

- **Partial template removal** — `Hero` is not the only stale area. `Header`, `Logo`, `Footer`, `FooterHero`, and `UserNav` all still reference UseNotes or `/notes`. Search globally before calling the slice done.
- **Accidentally doing S03 in S02** — redesigning public landing styles is in scope; introducing the authenticated app shell or shared design system for all pages is not. Keep the slice isolated.
- **Leaving stale CTA targets** — even if copy changes, linking primary buttons to `/notes` or labeling user-nav as “Dashboard” with a notes route leaves obvious product mismatch.

## Open Risks

- `UserNav.tsx` still points its “Dashboard” item to `/notes`. If the landing header continues to show user navigation for signed-in users, that stale target may leak into S02 unless explicitly corrected.
- Existing image usage in home components is heavily template-specific. If the redesign keeps many image assets, asset quality may become the limiting factor; CSS-led composition is safer than trying to force old note-taking artwork into workout marketing.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend UI / landing-page redesign | `frontend-design` | available |
