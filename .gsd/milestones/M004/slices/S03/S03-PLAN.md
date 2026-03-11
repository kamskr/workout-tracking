# S03: Achievements & Badges — Backend + Web UI

**Goal:** Users earn badges for milestones (workout count, volume, streaks, PRs, challenge completions) evaluated server-side on workout completion, stored in `userBadges`, and displayed on any user's profile page.
**Demo:** A user completes their 10th workout and a "Dedicated Lifter" badge appears on their profile page immediately — with ~15 hardcoded badge definitions evaluated server-side on workout completion, and a badges section visible on any user's profile.

## Must-Haves

- `userBadges` table with `by_userId` and `by_userId_badgeSlug` indexes in schema
- `BADGE_DEFINITIONS` TypeScript constant with ~15 badges across 5 categories (workout count, volume, streak, PR, challenge)
- `evaluateAndAwardBadges(db, userId)` function that queries aggregate stats once and checks all thresholds
- Non-fatal badge evaluation hook in `finishWorkout` (4th try/catch block, `[Badge]` prefix)
- `getUserBadges` auth-gated query returning awarded badges with display metadata for any userId
- ~5 test helpers in `testing.ts` + `testCleanup` extended with `userBadges` deletion
- `verify-s03-m04.ts` verification script with ~12 checks proving badge award, deduplication, cross-user visibility, and per-category thresholds
- `BadgeDisplay` component on profile page showing awarded badges with emoji/name/description
- `data-badge-*` attributes on badge UI for programmatic verification

## Proof Level

- This slice proves: integration (badge evaluation triggered by real workout data → stored in DB → queryable by UI)
- Real runtime required: yes — verification script runs against Convex backend
- Human/UAT required: yes — visual verification of badge display on profile page

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors (backend compiles)
- `cd apps/web && npx tsc --noEmit` — 0 new errors (web compiles)
- `npx tsx packages/backend/scripts/verify-s03-m04.ts` — 12/12 checks pass:
  - BG-01: `first_workout` badge awarded after 1 workout completion
  - BG-02: `ten_workouts` badge NOT awarded after 1 workout (threshold not met)
  - BG-03: `first_workout` badge appears only once after multiple evaluations (no duplicate)
  - BG-04: `getUserBadges` returns awarded badges with correct display metadata (name, emoji, category)
  - BG-05: Cross-user badge visibility — user B can query user A's badges
  - BG-06: Volume badge `volume_10k` awarded when totalVolume ≥ 10,000 kg
  - BG-07: Streak badge `streak_3` awarded when streak ≥ 3 days
  - BG-08: PR badge `first_pr` awarded when PR count ≥ 1
  - BG-09: Challenge badge `first_challenge` awarded when completed-challenge count ≥ 1
  - BG-10: Badge count increases correctly as more thresholds are crossed
  - BG-11: Cleanup removes all userBadges for test users
  - BG-12: Badge definitions constant has expected structure (15 badges, 5 categories, all have slug/name/emoji/threshold)
- Structural: Profile page renders `[data-badge-section]` and `[data-badge-card]` elements

## Observability / Diagnostics

- Runtime signals: `[Badge] Error evaluating badges for user ${userId}: ${err}` — structured console.error in finishWorkout non-fatal hook (matches `[Feed Item]`, `[Leaderboard]`, `[Challenge]` patterns)
- Inspection surfaces: `getUserBadges({ userId })` query returns full badge list for any user; `testGetUserBadges` test helper bypasses auth; `testGetRawUserBadges` returns raw DB rows; `testGetUserBadgeCount` returns integer count
- Failure visibility: Non-fatal wrapper ensures workout completion always succeeds. Badge evaluation failure is visible only in Convex dashboard logs via `[Badge]` prefix. `userBadges` table rows have `awardedAt` timestamp for audit.
- Redaction constraints: none — no secrets or PII in badge data

## Integration Closure

- Upstream surfaces consumed:
  - `computePeriodSummary(db, userId, undefined)` from `analytics.ts` — workout count + total volume
  - `computeCurrentStreak(db, userId)` from `profiles.ts` — current streak days
  - `personalRecords` table via `by_userId_exerciseId` index — PR count
  - `challengeParticipants` table via `by_userId` index + `challenges` table — completed challenge count
  - `finishWorkout` mutation in `workouts.ts` — hook point for badge evaluation
  - Profile page `apps/web/src/app/profile/[username]/page.tsx` — badge section insertion point
- New wiring introduced in this slice:
  - `evaluateAndAwardBadges` called from `finishWorkout` (4th non-fatal hook)
  - `getUserBadges` query consumed by `BadgeDisplay` component on profile page
  - `BADGE_DEFINITIONS` constant importable by both backend and web app via `@packages/backend` alias
- What remains before the milestone is truly usable end-to-end:
  - S04: Mobile port of badge display, leaderboard, and challenge UIs
  - Live verification script execution (all M004 scripts: S01 12 + S02 16 + S03 12 = 40 checks)
  - Browser visual UAT of profile badge display

## Tasks

- [x] **T01: Schema + badge definitions + evaluation engine + finishWorkout hook** `est:25m`
  - Why: Creates the data layer (schema + definitions constant + evaluation function) and wires badge evaluation into the existing `finishWorkout` mutation as a 4th non-fatal hook. This is the backend core that T02 and T03 build upon.
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/lib/badgeDefinitions.ts`, `packages/backend/convex/lib/badgeEvaluation.ts`, `packages/backend/convex/workouts.ts`, `packages/backend/convex/_generated/api.d.ts`
  - Do: Add `userBadges` table to schema with `by_userId` and `by_userId_badgeSlug` indexes. Create `badgeDefinitions.ts` with `BADGE_DEFINITIONS` constant (~15 badges across 5 categories). Create `badgeEvaluation.ts` with `evaluateAndAwardBadges(db, userId)` that batch-fetches all needed stats (workout count, total volume, current streak, PR count, completed challenge count) once, fetches existing user badges once to build a skip-set, then iterates definitions checking thresholds. Wire into `finishWorkout` as 4th non-fatal try/catch with `[Badge]` prefix. Update `api.d.ts` with badge lib imports.
  - Verify: `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors. `finishWorkout` contains 4 non-fatal hooks (feed item, leaderboard, challenge, badge). `badgeDefinitions.ts` exports 15 badge definitions. `badgeEvaluation.ts` exports `evaluateAndAwardBadges`.
  - Done when: Backend compiles, schema has `userBadges` table, `finishWorkout` calls `evaluateAndAwardBadges` in non-fatal wrapper, badge definitions constant has 15 entries across 5 categories.

- [x] **T02: Queries + test helpers + verification script** `est:25m`
  - Why: Creates the query layer (`badges.ts` with `getUserBadges`), test helpers for programmatic verification, and the 12-check verification script that proves badge evaluation correctness across all 5 badge categories.
  - Files: `packages/backend/convex/badges.ts`, `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s03-m04.ts`, `packages/backend/convex/_generated/api.d.ts`
  - Do: Create `badges.ts` with `getUserBadges` auth-gated query (accepts `userId`, returns awarded badges enriched with display metadata from `BADGE_DEFINITIONS`). Add ~5 test helpers to `testing.ts`: `testEvaluateAndAwardBadges`, `testGetUserBadges`, `testAwardBadge` (direct insert), `testGetRawUserBadges`, `testGetUserBadgeCount`. Extend `testCleanup` with `userBadges` deletion. Write `verify-s03-m04.ts` with 12 named checks (BG-01 through BG-12) across 2 test users. Update `api.d.ts` with `badges` module import.
  - Verify: `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors. `verify-s03-m04.ts` has 12 BG checks. `testing.ts` has 5 badge test helpers. `testCleanup` includes `userBadges` deletion.
  - Done when: Backend compiles, `badges.ts` exports `getUserBadges`, verification script has 12 checks covering all 5 badge categories + deduplication + cross-user visibility + cleanup.

- [x] **T03: Badge display component on profile page** `est:20m`
  - Why: Delivers the user-facing badge UI — a `BadgeDisplay` component rendering awarded badges on any user's profile page, making badges visible to users and completing the R020 requirement surface.
  - Files: `apps/web/src/components/profile/BadgeDisplay.tsx`, `apps/web/src/app/profile/[username]/page.tsx`
  - Do: Create `BadgeDisplay` component with `userId` prop, own `useQuery(api.badges.getUserBadges)`, loading skeleton, empty state, and badge card grid. Each badge card shows emoji, name, description, and awarded date. Add `data-badge-section` on container and `data-badge-card` on each card. Add `data-badge-slug` attribute with badge slug value. Import and render `BadgeDisplay` on profile page between the leaderboard opt-in section and the stats section (for own profile) or before stats (for any profile).
  - Verify: `cd apps/web && npx tsc --noEmit` — 0 new errors. Profile page imports and renders `BadgeDisplay`. `BadgeDisplay.tsx` has `data-badge-section`, `data-badge-card`, and `data-badge-slug` attributes.
  - Done when: Web compiles, `BadgeDisplay` renders on profile page with data attributes, shows loading/empty/populated states, badges display with emoji + name + description.

## Files Likely Touched

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/lib/badgeDefinitions.ts` (new)
- `packages/backend/convex/lib/badgeEvaluation.ts` (new)
- `packages/backend/convex/workouts.ts`
- `packages/backend/convex/badges.ts` (new)
- `packages/backend/convex/testing.ts`
- `packages/backend/convex/_generated/api.d.ts`
- `packages/backend/scripts/verify-s03-m04.ts` (new)
- `apps/web/src/components/profile/BadgeDisplay.tsx` (new)
- `apps/web/src/app/profile/[username]/page.tsx`
