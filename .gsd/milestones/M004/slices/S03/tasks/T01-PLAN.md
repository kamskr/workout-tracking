---
estimated_steps: 5
estimated_files: 5
---

# T01: Schema + badge definitions + evaluation engine + finishWorkout hook

**Slice:** S03 — Achievements & Badges — Backend + Web UI
**Milestone:** M004

## Description

Creates the complete badge backend data layer: the `userBadges` table in the schema, the `BADGE_DEFINITIONS` TypeScript constant with ~15 badges across 5 categories (workout count, volume, streak, PR, challenge), and the `evaluateAndAwardBadges` evaluation engine that queries user stats once, fetches existing badges once, and awards any newly qualified badges. Wires the evaluation into `finishWorkout` as the 4th non-fatal try/catch hook following the established `[Feed Item]` / `[Leaderboard]` / `[Challenge]` pattern.

## Steps

1. **Add `userBadges` table to schema.ts** — Add the table definition with `userId` (v.string()), `badgeSlug` (v.string()), `awardedAt` (v.number()), plus two indexes: `by_userId` (for listing all badges) and `by_userId_badgeSlug` (for deduplication checks). Place after the `challengeParticipants` table.

2. **Create `packages/backend/convex/lib/badgeDefinitions.ts`** — Define a framework-agnostic TypeScript constant `BADGE_DEFINITIONS` as a readonly array of objects, each with: `slug`, `name`, `emoji`, `description`, `category` (one of "workoutCount" | "volume" | "streak" | "pr" | "challenge"), `statKey` (which aggregate stat to check), and `threshold` (number). Export the type `BadgeDefinition` and the `BADGE_DEFINITIONS` array. Include all 15 badges from research: 5 workout-count (first_workout/ten_workouts/twenty_five_workouts/fifty_workouts/hundred_workouts), 3 volume (volume_10k/volume_100k/volume_1m), 3 streak (streak_3/streak_7/streak_30), 2 PR (first_pr/ten_prs), 2 challenge (first_challenge/five_challenges).

3. **Create `packages/backend/convex/lib/badgeEvaluation.ts`** — Implement `evaluateAndAwardBadges(db, userId)` that: (a) fetches all existing `userBadges` for this userId via `by_userId` index and builds a `Set<string>` of awarded slugs; (b) batch-fetches 5 aggregate stats: `workoutCount` via `computePeriodSummary(db, userId, undefined)`, `totalVolume` from same call, `currentStreak` via `computeCurrentStreak(db, userId)`, `prCount` via querying `personalRecords` with `by_userId_exerciseId` index and collecting + counting, `completedChallengeCount` via querying `challengeParticipants` by `by_userId` index then joining with `challenges` to filter `status === "completed"`; (c) iterates `BADGE_DEFINITIONS`, skips already-awarded badges, checks if stat meets threshold, and inserts into `userBadges` with `awardedAt: Date.now()`. Import `computePeriodSummary` from `../analytics` and `computeCurrentStreak` from `../profiles`.

4. **Wire badge evaluation into `finishWorkout` in workouts.ts** — Add `import { evaluateAndAwardBadges } from "./lib/badgeEvaluation"` at top. After the challenge progress try/catch block, add a 4th non-fatal hook: `try { await evaluateAndAwardBadges(ctx.db, userId); } catch (err) { console.error(\`[Badge] Error evaluating badges for user ${userId}: ${err}\`); }`.

5. **Update `_generated/api.d.ts`** — Add `import type * as lib_badgeDefinitions from "../lib/badgeDefinitions.js"` and `import type * as lib_badgeEvaluation from "../lib/badgeEvaluation.js"` to the imports section. Add corresponding entries in the `fullApi` declaration: `"lib/badgeDefinitions": typeof lib_badgeDefinitions` and `"lib/badgeEvaluation": typeof lib_badgeEvaluation`. This manual update follows the pattern used for leaderboardCompute and challengeCompute.

## Must-Haves

- [ ] `userBadges` table in schema with `by_userId` and `by_userId_badgeSlug` indexes
- [ ] `BADGE_DEFINITIONS` constant with exactly 15 badges across 5 categories
- [ ] `evaluateAndAwardBadges` queries 5 aggregates once, fetches existing badges once, then awards new badges
- [ ] Badge deduplication: skips badges already in the awarded-slugs Set (never double-awards)
- [ ] Non-fatal `[Badge]` try/catch in `finishWorkout` as 4th hook (after challenge progress)
- [ ] `badgeDefinitions.ts` is framework-agnostic (no React/Convex server imports — plain TypeScript)

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `grep -c "\[Badge\]" packages/backend/convex/workouts.ts` returns 1
- `grep "evaluateAndAwardBadges" packages/backend/convex/workouts.ts` shows the import and call
- `grep -c "export const BADGE_DEFINITIONS" packages/backend/convex/lib/badgeDefinitions.ts` returns 1
- Badge definitions count: `node -e "const d = require('./packages/backend/convex/lib/badgeDefinitions'); console.log(d.BADGE_DEFINITIONS.length)"` outputs 15 (or verify via grep)
- Schema has `userBadges` table: `grep "userBadges:" packages/backend/convex/schema.ts`

## Observability Impact

- Signals added/changed: `[Badge] Error evaluating badges for user ${userId}: ${err}` — structured console.error matching existing non-fatal hook pattern. Badge evaluation errors are now visible in Convex dashboard logs alongside `[Feed Item]`, `[Leaderboard]`, and `[Challenge]` errors.
- How a future agent inspects this: Search Convex logs for `[Badge]` prefix. Query `userBadges` table directly to verify badge awards exist.
- Failure state exposed: Badge evaluation failure does not block workout completion. Failure is logged with user ID and error details. Missing badges will be awarded on the next workout completion (self-healing).

## Inputs

- `packages/backend/convex/schema.ts` — existing schema with 20 tables, needs `userBadges` addition
- `packages/backend/convex/workouts.ts` — `finishWorkout` with 3 existing non-fatal hooks
- `packages/backend/convex/analytics.ts` — exports `computePeriodSummary(db, userId, periodDays)`
- `packages/backend/convex/profiles.ts` — exports `computeCurrentStreak(db, userId)`
- S03-RESEARCH badge definitions design — 15 badges, 5 categories, threshold-based evaluation

## Expected Output

- `packages/backend/convex/schema.ts` — `userBadges` table added (~15 lines)
- `packages/backend/convex/lib/badgeDefinitions.ts` — new file (~100 lines): `BadgeDefinition` type, `BadgeCategory` type, `BADGE_DEFINITIONS` array with 15 entries
- `packages/backend/convex/lib/badgeEvaluation.ts` — new file (~90 lines): `evaluateAndAwardBadges(db, userId)` function
- `packages/backend/convex/workouts.ts` — 4th non-fatal hook added (~6 lines), new import line
- `packages/backend/convex/_generated/api.d.ts` — 2 new type imports + 2 fullApi entries for badge lib files
