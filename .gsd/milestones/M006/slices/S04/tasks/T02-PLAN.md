# T02: Refresh templates and profile surfaces onto shared primitives

**Goal:** Reskin the templates and profile domains so their reusable components inherit the S03 premium design language instead of rendering old local white/gray UI inside prettier route wrappers.
**Why:** These domains already have good behavior and data flow. The visible debt is almost entirely component-level styling duplication, especially local card/stat/badge treatments.

## Inputs

- Route shell adoption from T01
- Shared shell primitives and token namespace from S03
- Existing profile and badge data attributes that power later browser proof

## Must-Haves

- `TemplateList` and `TemplateCard` use shared premium surfaces for loading, empty, and grid/card states
- `ProfileSetupForm`, `ProfileStats`, and `BadgeDisplay` align with the S03 shell vocabulary instead of local gray/white card styling
- `data-profile-*` and `data-badge-*` hooks remain intact and truthful
- Any new utility styling is added centrally in `globals.css`, not scattered as one-off route-local class piles

## Files

- `apps/web/src/components/templates/TemplateList.tsx`
- `apps/web/src/components/templates/TemplateCard.tsx`
- `apps/web/src/components/profile/ProfileSetupForm.tsx`
- `apps/web/src/components/profile/ProfileStats.tsx`
- `apps/web/src/components/profile/BadgeDisplay.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/app-shell/AppCard.tsx`

## Steps

1. Audit the templates and profile components for repeated old-style patterns (`bg-white`, `border-gray-*`, bespoke mini-stat cards, local empty states) and map each to an existing shell primitive or a small new semantic utility in `globals.css`.
2. Reskin template list/card states so they feel native to the Apple Fitness+ direction: warmer hierarchy, stronger emphasis, and premium action affordances without changing template behavior.
3. Reskin profile setup, stats, and badge surfaces to use shared card/stat/badge vocabulary where practical, reducing local duplicate stat-card implementations.
4. Preserve existing observability hooks (`data-profile-setup-form`, `data-profile-stats`, `data-badge-section`, `data-badge-card`, `data-badge-slug`) and ensure loading/empty/edit states still expose a stable verification surface.
5. Run typecheck and resolve any prop/type drift caused by primitive adoption.

## Verification

- `pnpm --filter web-app typecheck`

## Observability Impact

- Runtime inspection still relies on `data-profile-setup-form`, `data-profile-stats`, `data-badge-section`, `data-badge-card`, and `data-badge-slug`; this task must preserve those hooks while moving their surrounding surfaces onto shared shell primitives.
- New shared feature-surface utilities in `apps/web/src/app/globals.css` become the central inspection seam for future refresh tasks, so styling drift should be checked there before adding route-local class piles.
- Failure inspection remains component-level: if a refreshed page looks regressed, compare the route shell selectors from T01 with these feature-specific hooks to separate route-shell issues from template/profile component regressions.

## Expected Output

- Templates and profile surfaces visually match the S03 representative routes
- Centralized feature-surface utilities exist where the shell primitives needed small extensions
- Existing runtime selectors survive unchanged or become clearer

## Done When

- Templates and profile flows no longer depend on local old-style gray/white card patterns
- Shared shell primitives/tokens drive the dominant visual structure
- Web app typecheck passes
