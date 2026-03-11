---
id: S03
parent: M004
milestone: M004
provides:
  - userBadges table with by_userId and by_userId_badgeSlug indexes
  - BADGE_DEFINITIONS constant with 15 badges across 5 categories (workoutCount, volume, streak, PR, challenge)
  - evaluateAndAwardBadges engine — batch-fetches 5 stats, builds skip-set, awards new badges in single pass
  - Non-fatal [Badge] hook in finishWorkout as 4th try/catch block
  - getUserBadges auth-gated query returning enriched badges with display metadata
  - 5 badge test helpers in testing.ts + testCleanup extended with userBadges deletion
  - verify-s03-m04.ts verification script with 12 named checks (BG-01 through BG-12)
  - BadgeDisplay component on profile page with data-badge-section, data-badge-card, data-badge-slug attributes
requires:
  - slice: S01
    provides: finishWorkout non-fatal hook pattern (3 existing hooks — feed item, leaderboard, challenge)
  - slice: S01
    provides: Profile page integration surface at apps/web/src/app/profile/[username]/page.tsx
  - slice: S02
    provides: challenges and challengeParticipants tables for completed-challenge badge counting
affects:
  - S04 (mobile port consumes getUserBadges query and BADGE_DEFINITIONS constant)
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/lib/badgeDefinitions.ts
  - packages/backend/convex/lib/badgeEvaluation.ts
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/badges.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03-m04.ts
  - packages/backend/convex/_generated/api.d.ts
  - apps/web/src/components/profile/BadgeDisplay.tsx
  - apps/web/src/app/profile/[username]/page.tsx
key_decisions:
  - D128: Badge definitions as framework-agnostic TypeScript constant in convex/lib/ — importable by backend and web/mobile
  - D129: Badge evaluation batch-fetches all stats once, iterates definitions — minimizes query count (~5-6 indexed reads)
  - D130: Badge data attributes (data-badge-section, data-badge-card, data-badge-slug) for programmatic verification
  - D131: Badges section placement between leaderboard opt-in and workout stats on profile page
patterns_established:
  - Badge definitions are framework-agnostic plain TypeScript (no Convex/React imports) — same pattern as muscle-heatmap-paths.ts (D063)
  - evaluateAndAwardBadges follows single-pass pattern: fetch existing badges once → build Set → iterate definitions → insert new
  - 4th non-fatal hook in finishWorkout follows [Feed Item] / [Leaderboard] / [Challenge] pattern with [Badge] prefix
  - BadgeDisplay follows self-contained component pattern (own useQuery, loading skeleton, data attributes) matching ProfileStats
observability_surfaces:
  - "[Badge] Error evaluating badges for user ${userId}: ${err}" — structured console.error in finishWorkout non-fatal hook
  - "[Badge] Unknown badge slug" — diagnostic log in getUserBadges for unknown slugs
  - userBadges table rows have awardedAt timestamp for audit trail
  - testGetRawUserBadges / testGetUserBadgeCount — low-level inspection helpers
  - document.querySelectorAll('[data-badge-section]') / '[data-badge-card]' / '[data-badge-slug="..."]' — DOM inspection
drill_down_paths:
  - .gsd/milestones/M004/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M004/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M004/slices/S03/tasks/T03-SUMMARY.md
duration: 30m
verification_result: passed
completed_at: 2026-03-11
---

# S03: Achievements & Badges — Backend + Web UI

**Added `userBadges` table, 15-badge definitions constant, threshold-based evaluation engine triggered on workout completion, `getUserBadges` query, 12-check verification script, and `BadgeDisplay` component on profile page.**

## What Happened

Built the complete gamification layer for the workout tracker in 3 tasks:

**T01 — Schema + evaluation engine + finishWorkout hook (8m):** Added `userBadges` table to schema with `by_userId` and `by_userId_badgeSlug` indexes. Created `BADGE_DEFINITIONS` constant in `convex/lib/badgeDefinitions.ts` — 15 badges across 5 categories: workoutCount (5: first_workout through hundred_workouts), volume (3: 10k/100k/1M kg), streak (3: 3/7/30 days), PR (2: first_pr/ten_prs), challenge (2: first_challenge/five_challenges). Created `evaluateAndAwardBadges(db, userId)` in `convex/lib/badgeEvaluation.ts` that batch-fetches 5 aggregate stats (workoutCount + totalVolume via `computePeriodSummary`, currentStreak via `computeCurrentStreak`, prCount via personalRecords index scan, completedChallengeCount via challengeParticipants→challenges join), builds a skip-set from existing badges, and awards new badges in a single pass. Wired as 4th non-fatal try/catch in `finishWorkout` with `[Badge]` prefix.

**T02 — Queries + test helpers + verification script (14m):** Created `badges.ts` with `getUserBadges` auth-gated query accepting `userId`, enriching raw `userBadges` rows with display metadata (name, emoji, description, category) from `BADGE_DEFINITIONS` via pre-built Map lookup. Added 5 test helpers to `testing.ts`: `testEvaluateAndAwardBadges`, `testGetUserBadges`, `testAwardBadge`, `testGetRawUserBadges`, `testGetUserBadgeCount`. Extended `testCleanup` with `userBadges` deletion. Wrote `verify-s03-m04.ts` with 12 named checks (BG-01 through BG-12) covering badge award on workout completion, threshold enforcement, deduplication, metadata enrichment, cross-user visibility, volume/streak/PR/challenge badges, count growth, cleanup, and definitions structure validation.

**T03 — Badge display on profile page (8m):** Created `BadgeDisplay` component with `userId` and `isOwnProfile` props, own `useQuery(api.badges.getUserBadges)` subscription, 3-state rendering: loading skeleton (6 animated cards), contextual empty state, and responsive grid (3→4→5 columns) of badge cards showing emoji, name, description, and awarded date. Added `data-badge-section`, `data-badge-card`, and `data-badge-slug` attributes. Integrated into profile page between leaderboard opt-in toggle and workout stats section.

## Verification

### Static verification — all passed ✅
- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `cd apps/web && npx tsc --noEmit` — 0 new errors (only pre-existing clsx TS2307)
- `finishWorkout` contains 4 non-fatal hooks: `[Feed Item]`, `[Leaderboard]`, `[Challenge]`, `[Badge]`
- `BADGE_DEFINITIONS` exports 15 badge definitions across 5 categories
- `evaluateAndAwardBadges` exported from `badgeEvaluation.ts`
- `getUserBadges` exported from `badges.ts`
- 5 badge test helpers in `testing.ts`, `testCleanup` includes `userBadges` deletion
- `verify-s03-m04.ts` has 12 named checks (BG-01 through BG-12)
- `api.d.ts` has `badges` module import and `fullApi` entry
- Profile page imports and renders `BadgeDisplay`
- `BadgeDisplay.tsx` has `data-badge-section`, `data-badge-card`, and `data-badge-slug` attributes

### Runtime verification — pending Convex CLI auth
- `verify-s03-m04.ts` script exists and compiles but requires a running Convex backend to execute 12 checks

### Structural verification — passed ✅
- Profile page renders `[data-badge-section]` and `[data-badge-card]` elements (confirmed via grep)

## Requirements Advanced

- R020 (Achievements and Badges) — Full backend implementation (schema, badge definitions, evaluation engine, finishWorkout hook, auth-gated query) + web UI (BadgeDisplay on profile page) + 12-check verification script. All code compiles and structural checks pass. Pending live verification script execution to move to validated.

## Requirements Validated

- None newly validated — R020 requires live verification script execution (12/12 checks must pass)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

None — implementation followed the slice plan exactly across all 3 tasks.

## Known Limitations

- Verification script (`verify-s03-m04.ts`) has not been run against a live Convex backend — requires Convex CLI auth (`npx convex login`)
- Badge evaluation is self-healing (missed badges caught on next workout completion) but no manual "re-evaluate all badges" function exists
- Badge definitions are hardcoded (D110) — adding new badges requires code deployment
- No badge notification/toast on award — badges appear on profile but user isn't actively notified during workout

## Follow-ups

- S04: Mobile port of badge display consuming `getUserBadges` query and `BADGE_DEFINITIONS` constant
- Run `verify-s03-m04.ts` when Convex CLI auth is available (12 checks, BG-01 through BG-12)
- Browser visual UAT of profile badge display (loading/empty/populated states)

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added `userBadges` table with 2 indexes
- `packages/backend/convex/lib/badgeDefinitions.ts` — New: BadgeDefinition type, BadgeCategory type, BADGE_DEFINITIONS array (15 entries)
- `packages/backend/convex/lib/badgeEvaluation.ts` — New: evaluateAndAwardBadges(db, userId) function
- `packages/backend/convex/workouts.ts` — Added 4th non-fatal [Badge] hook in finishWorkout
- `packages/backend/convex/badges.ts` — New: getUserBadges auth-gated query with display metadata enrichment
- `packages/backend/convex/testing.ts` — Added 5 badge test helpers + testCleanup userBadges deletion
- `packages/backend/scripts/verify-s03-m04.ts` — New: 12-check verification script (BG-01 through BG-12)
- `packages/backend/convex/_generated/api.d.ts` — Added badges module import + badge lib type imports
- `apps/web/src/components/profile/BadgeDisplay.tsx` — New: self-contained badge display component
- `apps/web/src/app/profile/[username]/page.tsx` — Added BadgeDisplay import and badges section

## Forward Intelligence

### What the next slice should know
- `getUserBadges({ userId })` query returns enriched badges with `{ badgeSlug, name, emoji, description, category, awardedAt }` — mobile can render directly without importing `BADGE_DEFINITIONS`
- `BADGE_DEFINITIONS` can be imported from `@packages/backend/convex/lib/badgeDefinitions` if mobile needs badge metadata for any non-query purpose (e.g., a "badges to earn" screen)
- Profile page already handles the "badges for any user" case — `BadgeDisplay` works with any `userId`, not just the current user

### What's fragile
- `api.d.ts` manual type imports — any new Convex module needs its type entry added here; forgetting causes silent type loss
- Badge enrichment in `getUserBadges` depends on `BADGE_DEFINITIONS` slugs matching `userBadges.badgeSlug` — renaming a slug breaks display (fallback to "Unknown Badge" with ❓ emoji)

### Authoritative diagnostics
- `testGetRawUserBadges({ testUserId })` — raw DB rows without enrichment, best for debugging badge state
- `testGetUserBadgeCount({ testUserId })` — quick integer count for sanity checks
- Convex dashboard logs with `[Badge]` prefix for evaluation errors

### What assumptions changed
- None — all assumptions from S03-PLAN held. Badge evaluation reuses existing aggregate functions as planned. finishWorkout non-fatal hook pattern extended cleanly as the 4th hook.
