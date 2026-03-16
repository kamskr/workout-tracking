---
estimated_steps: 5
estimated_files: 6
---

# T01: Define authenticated design tokens and shell primitives

**Slice:** S03 — App Shell & Design System
**Milestone:** M006

## Description

Create the authenticated design-system foundation that S03 and S04 will share. This task is about the visual and structural vocabulary, not page-by-page redesign: add an app-shell section to `globals.css` that stays isolated from the existing `landing-*` homepage styles, then implement a narrow set of reusable authenticated primitives (`AppCard`, `PageHeader`, `StatCard`, `AppBadge`) using the existing `cn()` helper. These primitives should wrap existing content cleanly and expose durable selectors for browser proof.

## Steps

1. Inspect `apps/web/src/app/globals.css` and add a clearly labeled authenticated-shell/design-system section below the existing global theme styles while keeping the S02 `landing-*` section isolated and untouched except for safe coexistence.
2. Define semantic classes/tokens for authenticated surfaces: app background layers, card/panel treatments, warm gradients, shell chrome, pill/badge styles, section spacing, and page-title/subtitle/action-row patterns. Favor reusable class composition over page-specific one-offs.
3. Create thin shared components in `apps/web/src/components/app-shell/` for `AppCard`, `PageHeader`, `StatCard`, and `AppBadge`, all built as presentational wrappers around passed children/props rather than fetching data or owning route logic.
4. Add durable `data-*` hooks on the shared primitives where runtime/browser verification will need stable selectors (for example shell card/header/stat/badge containers), and use `cn()` from `apps/web/src/lib/utils.ts` for opt-in variant composition instead of duplicating class joins.
5. Run web typecheck and leave the primitives ready for T02/T03 to consume without redefining styling locally.

## Must-Haves

- [ ] `globals.css` contains a distinct authenticated design-system section that does not entangle with the existing `landing-*` homepage styles.
- [ ] Shared authenticated primitives exist as thin compositional wrappers for card, page header, stat card, and badge/pill patterns.
- [ ] The primitives include stable selectors/attributes needed for later browser proof.
- [ ] `pnpm --filter web-app typecheck` passes after the new primitives land.

## Verification

- Run `pnpm --filter web-app typecheck`.
- Confirm the new primitives compile without introducing route/page imports or business logic coupling.

## Inputs

- `apps/web/src/app/globals.css` — existing Tailwind 4/global CSS file containing theme setup and the S02 `landing-*` styling section that must stay isolated.
- `apps/web/src/lib/utils.ts` — existing `cn()` helper for shared class composition.
- `apps/web/src/components/workouts/WorkoutCard.tsx`, `apps/web/src/components/exercises/ExerciseCard.tsx`, `apps/web/src/components/profile/ProfileStats.tsx` — representative current card/stat patterns to normalize into shared primitives.

## Expected Output

- `apps/web/src/app/globals.css` — authenticated-shell tokens and semantic utility classes added alongside, but separate from, landing styles.
- `apps/web/src/components/app-shell/AppCard.tsx` — reusable authenticated surface wrapper.
- `apps/web/src/components/app-shell/PageHeader.tsx` — shared title/subtitle/action-row wrapper.
- `apps/web/src/components/app-shell/StatCard.tsx` — reusable stat summary surface.
- `apps/web/src/components/app-shell/AppBadge.tsx` — shared badge/pill component for status/metadata treatments.

## Observability Impact

- Runtime signals added in this task: stable `data-*` selectors on authenticated shell primitives (`app-card`, `page-header`, `stat-card`, `app-badge`) plus semantic shell class names in `globals.css` that later browser proof can assert against.
- Inspection path for future agents: read `apps/web/src/components/app-shell/*.tsx` for selector contracts and wrapper boundaries; inspect `apps/web/src/app/globals.css` for the authenticated token/class namespace; exercise the primitives through later route wiring and browser assertions in `tests/app-shell.spec.ts`.
- Failure visibility improved: missing primitive wiring now shows up as absent `data-*` hooks or missing shell class application instead of ambiguous visual regressions, making shell adoption failures explicit during browser verification.
