---
estimated_steps: 3
estimated_files: 2
---

# T03: Badge display component on profile page

**Slice:** S03 — Achievements & Badges — Backend + Web UI
**Milestone:** M004

## Description

Creates the `BadgeDisplay` component that renders awarded badges as a grid of emoji cards on any user's profile page. The component is self-contained with its own `useQuery` subscription, loading skeleton, empty state, and data attributes for programmatic verification. Integrates into the existing profile page between the leaderboard opt-in toggle and the workout stats section.

## Steps

1. **Create `apps/web/src/components/profile/BadgeDisplay.tsx`** — Self-contained component accepting `userId: string` prop. Uses `useQuery(api.badges.getUserBadges, { userId })` with Convex's reactive subscription. Renders 3 states:
   - **Loading**: Skeleton grid matching the badge card layout (same pattern as `ProfileStats` loading skeleton).
   - **Empty**: Subtle message "No badges earned yet" (or "Complete workouts to earn badges!" for own profile context — if `isOwnProfile` prop is provided).
   - **Populated**: Grid of badge cards (responsive: 3 columns mobile, 4-5 columns desktop). Each card shows the emoji (large, centered), badge name (small bold text), and a short description (smaller gray text). Card uses `rounded-lg border border-gray-200 bg-white p-4 shadow-sm` consistent with `StatCard` in `ProfileStats`. Container has `data-badge-section` attribute. Each card has `data-badge-card` and `data-badge-slug={badge.slug}` attributes.

2. **Integrate `BadgeDisplay` into profile page** — In `apps/web/src/app/profile/[username]/page.tsx`, import `BadgeDisplay` from `@/components/profile/BadgeDisplay`. Add a badges section between the leaderboard opt-in toggle and the "Workout Stats" section. The section renders for ALL profiles (own and others) since badges are always public. Structure:
   ```
   {/* Badges section */}
   <div className="mt-6">
     <h2 className="mb-4 text-sm font-semibold text-gray-700">Badges</h2>
     <BadgeDisplay userId={profile.userId} />
   </div>
   ```
   This placement ensures badges are visible without pushing stats off-screen (research constraint).

3. **Verify web compilation and structural correctness** — Run `cd apps/web && npx tsc --noEmit` to confirm 0 new errors. Verify `BadgeDisplay` is imported and rendered in the profile page. Confirm all data attributes are present in the component source.

## Must-Haves

- [ ] `BadgeDisplay` component with `userId` prop and own `useQuery` subscription
- [ ] Loading skeleton, empty state, and populated badge grid
- [ ] `data-badge-section` attribute on container
- [ ] `data-badge-card` and `data-badge-slug` attributes on each badge card
- [ ] Badge cards show emoji, name, and description
- [ ] Component renders on both own profile and other users' profiles
- [ ] Visual consistency with existing profile card styles (same border/shadow/padding pattern)
- [ ] Web app compiles with 0 new TypeScript errors

## Verification

- `cd apps/web && npx tsc --noEmit` — 0 new errors (only pre-existing clsx TS2307)
- `grep "BadgeDisplay" apps/web/src/app/profile/\\[username\\]/page.tsx` — shows import and usage
- `grep "data-badge-section\|data-badge-card\|data-badge-slug" apps/web/src/components/profile/BadgeDisplay.tsx` — all 3 attributes present
- `grep "getUserBadges" apps/web/src/components/profile/BadgeDisplay.tsx` — query is wired

## Observability Impact

- Signals added/changed: None — UI component only, no new runtime signals.
- How a future agent inspects this: `document.querySelectorAll('[data-badge-section]')` confirms badge section rendered. `document.querySelectorAll('[data-badge-card]')` returns individual badge cards. `[data-badge-slug="first_workout"]` targets specific badges for assertion.
- Failure state exposed: Empty state text visible when no badges exist. Loading skeleton visible during query loading. React error boundary (if present) catches render errors.

## Inputs

- `packages/backend/convex/badges.ts` — T02 output: `getUserBadges` query returning enriched badges
- `packages/backend/convex/lib/badgeDefinitions.ts` — T01 output: badge type definitions for TypeScript inference
- `apps/web/src/app/profile/[username]/page.tsx` — existing 394-line profile page with header, leaderboard opt-in, and stats sections
- `apps/web/src/components/profile/ProfileStats.tsx` — reference for component pattern (self-contained, own useQuery, loading skeleton, data attributes)

## Expected Output

- `apps/web/src/components/profile/BadgeDisplay.tsx` — new file (~100 lines): badge display component with 3 states and data attributes
- `apps/web/src/app/profile/[username]/page.tsx` — modified: imports `BadgeDisplay`, renders badges section between opt-in toggle and stats (~6 lines added)
