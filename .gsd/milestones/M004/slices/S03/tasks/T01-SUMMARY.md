---
id: T01
parent: S03
milestone: M004
provides:
  - userBadges table in schema with by_userId and by_userId_badgeSlug indexes
  - BADGE_DEFINITIONS constant with 15 badges across 5 categories
  - evaluateAndAwardBadges engine that batch-fetches 5 stats and awards new badges
  - Non-fatal [Badge] hook in finishWorkout as 4th try/catch block
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/lib/badgeDefinitions.ts
  - packages/backend/convex/lib/badgeEvaluation.ts
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Badge stat aggregation reuses existing computePeriodSummary and computeCurrentStreak functions rather than duplicating logic
  - PR count derived from personalRecords by_userId_exerciseId index scan + .length (no separate counter)
  - Completed challenge count derived from challengeParticipants join to challenges filtering status === "completed"
patterns_established:
  - Badge definitions are framework-agnostic plain TypeScript (no Convex/React imports) — importable by backend and web
  - evaluateAndAwardBadges follows single-pass pattern: fetch existing badges once → build Set → iterate definitions → insert new
  - 4th non-fatal hook in finishWorkout follows [Feed Item] / [Leaderboard] / [Challenge] pattern with [Badge] prefix
observability_surfaces:
  - "[Badge] Error evaluating badges for user ${userId}: ${err}" — structured console.error in finishWorkout non-fatal hook
  - userBadges table rows have awardedAt timestamp for audit trail
duration: 8m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Schema + badge definitions + evaluation engine + finishWorkout hook

**Added `userBadges` table, 15-badge BADGE_DEFINITIONS constant, threshold-based evaluateAndAwardBadges engine, and wired it as the 4th non-fatal hook in finishWorkout.**

## What Happened

1. Added `userBadges` table to schema.ts after `challengeParticipants` with `userId` (string), `badgeSlug` (string), `awardedAt` (number), and two indexes: `by_userId` for listing and `by_userId_badgeSlug` for deduplication.

2. Created `packages/backend/convex/lib/badgeDefinitions.ts` — a framework-agnostic TypeScript file exporting `BadgeCategory` type, `BadgeDefinition` interface, and `BADGE_DEFINITIONS` readonly array with exactly 15 badges: 5 workoutCount (first_workout/ten_workouts/twenty_five_workouts/fifty_workouts/hundred_workouts), 3 volume (volume_10k/volume_100k/volume_1m), 3 streak (streak_3/streak_7/streak_30), 2 PR (first_pr/ten_prs), 2 challenge (first_challenge/five_challenges).

3. Created `packages/backend/convex/lib/badgeEvaluation.ts` with `evaluateAndAwardBadges(db, userId)` that: (a) fetches all existing userBadges via by_userId index and builds a Set<string> of awarded slugs; (b) batch-fetches 5 aggregate stats — workoutCount + totalVolume via computePeriodSummary, currentStreak via computeCurrentStreak, prCount via personalRecords index scan, completedChallengeCount via challengeParticipants→challenges join; (c) iterates BADGE_DEFINITIONS, skips already-awarded slugs, checks if stat ≥ threshold, inserts new badge rows.

4. Wired badge evaluation into finishWorkout as 4th non-fatal hook after challenge progress, with `[Badge]` prefix error logging matching the established pattern.

5. Updated `_generated/api.d.ts` with type imports for both new lib files and corresponding fullApi entries.

## Verification

- `cd packages/backend && ./node_modules/.bin/tsc --noEmit -p convex` — 0 errors ✅
- `grep -c "\[Badge\]" packages/backend/convex/workouts.ts` → 1 ✅
- `grep "evaluateAndAwardBadges" packages/backend/convex/workouts.ts` → shows import and call ✅
- `grep -c "export const BADGE_DEFINITIONS" packages/backend/convex/lib/badgeDefinitions.ts` → 1 ✅
- Badge definitions count: 15 (verified via `slug: "` pattern grep) ✅
- `grep "userBadges:" packages/backend/convex/schema.ts` → found ✅

Slice-level verification (partial — T01 is task 1 of 3):
- Backend compiles: ✅
- Verification script (`verify-s03-m04.ts`): not yet created (T02 scope)
- Web compilation: not yet affected (T03 scope)
- Profile page badge UI: not yet created (T03 scope)

## Diagnostics

- Search Convex logs for `[Badge]` prefix to find badge evaluation errors
- Query `userBadges` table directly to verify badge awards exist (rows have `awardedAt` timestamp)
- Badge evaluation failures don't block workout completion — self-healing on next workout

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added `userBadges` table with 2 indexes (~10 lines)
- `packages/backend/convex/lib/badgeDefinitions.ts` — New file: BadgeDefinition type, BadgeCategory type, BADGE_DEFINITIONS array with 15 entries (~150 lines)
- `packages/backend/convex/lib/badgeEvaluation.ts` — New file: evaluateAndAwardBadges(db, userId) function (~85 lines)
- `packages/backend/convex/workouts.ts` — Added import + 4th non-fatal [Badge] hook in finishWorkout (~7 lines)
- `packages/backend/convex/_generated/api.d.ts` — Added 2 type imports + 2 fullApi entries for badge lib files
