# S03: Achievements & Badges — Backend + Web UI — Research

**Date:** 2026-03-11

## Summary

S03 adds a gamification layer with ~15 hardcoded badge definitions evaluated server-side on workout completion, stored in a `userBadges` table, and displayed on user profiles. The core pattern is a fourth non-fatal try/catch block in `finishWorkout` that evaluates badge rules against the user's current stats (workout count, volume, PRs, streak, challenges completed) and upserts awards into `userBadges` with a unique `[userId, badgeSlug]` constraint. This follows the exact same non-fatal hook pattern established by feed items (M003/S02), leaderboard entries (M004/S01), and challenge progress (M004/S02) — the codebase already has three working examples in `finishWorkout`.

The badge system has two distinct concerns: (1) a **definitions constant** (`BADGE_DEFINITIONS`) — a TypeScript object mapping badge slugs to display metadata and evaluation thresholds, shared between backend evaluation and UI rendering, and (2) an **evaluation function** (`evaluateAndAwardBadges`) that queries the user's current stats and compares against thresholds. The evaluation function needs to query workout count, total volume, PR count, streak, and challenge completion count — all of which have existing indexed queries in the codebase (`computePeriodSummary` for workout/volume, `computeCurrentStreak` for streaks, `personalRecords` index `by_userId_exerciseId` for PR count, `challengeParticipants` index `by_userId` for challenge participation). The main cost concern is the number of queries per evaluation — ~5-6 aggregate queries on every `finishWorkout` — but these are bounded reads against indexed fields and the function is non-fatal, so worst case is a missed badge award that will be caught on the next workout completion.

The web UI adds a badges section to the existing profile page (`/profile/[username]/page.tsx`) below the leaderboard opt-in toggle, using the same card/grid pattern as `ProfileStats`. A new `getUserBadges` query returns awarded badges for any user (cross-user readable, like `getProfileStats`). No new routes or navigation changes are needed — badges are a profile subsection, not a standalone page.

## Recommendation

**3 tasks: T01 (Schema + definitions + evaluation), T02 (Queries + test helpers + verification), T03 (Web UI on profile page).**

T01 adds the `userBadges` table to the schema with a `by_userId_badgeSlug` composite index for uniqueness and a `by_userId` index for listing. Creates `packages/backend/convex/lib/badgeDefinitions.ts` with the `BADGE_DEFINITIONS` constant and `packages/backend/convex/lib/badgeEvaluation.ts` with `evaluateAndAwardBadges(db, userId)`. Wires the evaluation into `finishWorkout` as a fourth non-fatal hook.

T02 creates `badges.ts` with a `getUserBadges` auth-gated query. Adds ~5 test helpers to `testing.ts` (`testEvaluateAndAwardBadges`, `testGetUserBadges`, `testAwardBadge`, `testGetRawUserBadges`, `testGetUserBadgeCount`). Extends `testCleanup` with `userBadges` deletion. Writes `verify-s03-m04.ts` with ~12 checks proving badge award on workout count threshold, no duplicate awards, badge listing, cross-user badge visibility, and streak/PR/volume-based badges.

T03 adds the badges section to the profile page and creates a `BadgeDisplay` component rendering awarded badges as emoji cards with name/description. Uses `data-badge-*` attributes for programmatic verification.

**Key decision: Badge definitions as a framework-agnostic TypeScript constant in `convex/lib/`** — this file has no React/Convex imports, just a plain object. Both the backend evaluation function and the web/mobile UI import it for display metadata (emoji, name, description). Same pattern as `muscle-heatmap-paths.ts` (D063).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Badge uniqueness (no double-award) | Composite index `by_userId_badgeSlug` + query-before-insert | Same upsert pattern as PR detection and leaderboard entries. Query existing → skip if found → insert if missing. |
| Workout count aggregation | `computePeriodSummary(db, userId, undefined)` → `workoutCount` | Already proven all-time aggregation. Used by `getProfileStats`. Reuse directly in badge evaluation. |
| Streak computation | `computeCurrentStreak(db, userId)` from `profiles.ts` | Already exported and tested. Returns current streak days. |
| Non-fatal hook in finishWorkout | try/catch with `[Badge]` prefix logging | Three existing examples (Feed Item, Leaderboard, Challenge). Copy the exact pattern. |
| Cross-user query | Same pattern as `getProfileStats` — auth-gated but reads for any userId arg | Badges should be visible on anyone's profile. |
| Data attributes for testing | `data-badge-*` attributes | Extends D057/D064/D082/D090/D099/D118/D124 pattern. |

## Existing Code and Patterns

- `packages/backend/convex/workouts.ts` — `finishWorkout` has 3 non-fatal try/catch blocks (feed item creation, leaderboard update, challenge progress). **S03 adds a 4th for badge evaluation.** Pattern: `try { await evaluateAndAwardBadges(ctx.db, userId); } catch (err) { console.error(\`[Badge] ...\`); }`
- `packages/backend/convex/lib/leaderboardCompute.ts` — Demonstrates the compute-helper-in-lib pattern. `evaluateAndAwardBadges` goes in `convex/lib/badgeEvaluation.ts` following the same convention.
- `packages/backend/convex/lib/prDetection.ts` — `estimateOneRepMax` exported for reuse. The upsert pattern (query existing → compare → patch/insert) is the template for badge award deduplication.
- `packages/backend/convex/analytics.ts` — `computePeriodSummary(db, userId, undefined)` returns `{ workoutCount, totalVolume, totalSets, topExercises }` for all-time stats. **Reuse directly** in badge evaluation for workout-count and volume badges.
- `packages/backend/convex/profiles.ts` — `computeCurrentStreak(db, userId)` returns current streak. **Reuse directly** for streak badges. `getProfileStats` shows how to compose multiple compute functions into a single query response.
- `apps/web/src/app/profile/[username]/page.tsx` — Profile page currently has: header (avatar/name/bio/edit), leaderboard opt-in toggle, and ProfileStats section. **Badge section goes between the leaderboard opt-in and the stats section** (or after stats — depends on visual flow). Page is ~340 lines; badge section adds ~50 lines of JSX.
- `apps/web/src/components/profile/ProfileStats.tsx` — Demonstrates the stat card grid pattern and `data-profile-stats` attribute. **Badge display follows the same component pattern** — self-contained component with `userId` prop, own `useQuery`, loading skeleton, empty state, and data attribute.
- `packages/backend/convex/testing.ts` — 2719 lines with clear section headers. **Add badge test helpers after the Challenge section** (line ~2716). Follow the `testUserId` arg pattern. Extend `testCleanup` with `userBadges` deletion.
- `packages/backend/convex/schema.ts` — 346 lines, 20 tables. **Add `userBadges` table** (~15 lines). No `badges` table needed — definitions are a TypeScript constant, not database rows (D110).
- `packages/backend/convex/_generated/api.d.ts` — Must be manually extended with `badges` module import (same as was done for `leaderboards` and `challenges`). Will be overwritten on next `npx convex dev`.

## Constraints

- **`finishWorkout` is getting heavy** — Already has 4 sequential operations (workout patch, feed item, leaderboard, challenge progress). Badge evaluation adds a 5th. Each is non-fatal so the workout always succeeds, but total mutation time increases. Badge evaluation should aim for minimal queries — ~5-6 indexed reads is the target.
- **`computePeriodSummary` with `undefined` periodDays does a `.take(500)` on workouts** — For users with 500+ completed workouts, this could get expensive inside `finishWorkout`. But it's already called in `getProfileStats` (a query, not mutation) and is proven at this scale. Within the non-fatal wrapper, it's bounded and acceptable.
- **`computeCurrentStreak` walks up to 500 workouts backward** — Same scale concern as above. Already proven in `getProfileStats`. Non-fatal wrapper makes it safe.
- **testing.ts is 2719 lines** — Adding ~100-150 lines of badge test helpers pushes toward 2900 lines. Still manageable with section headers but getting long. Not worth splitting now — follow existing convention.
- **Convex unique index enforcement** — Convex doesn't have unique constraints. Badge deduplication must be done via query+check+insert in the mutation (same as PR detection). The composite index `by_userId_badgeSlug` enables efficient duplicate checking.
- **No bodyweight field in schema** — "Weight Warrior" or bodyweight-milestone badges are not feasible. Stick to workout count, volume, PR, streak, and challenge badges.
- **Challenge completion count requires scanning `challengeParticipants`** — Must join through challenges table to check `status === "completed"` and `winnerId` for "challenge winner" badges. Bounded by `.take(100)` per user.

## Common Pitfalls

- **Badge double-award race condition** — Two concurrent `finishWorkout` calls could both evaluate and both insert the same badge. **Mitigation:** Query-before-insert with `by_userId_badgeSlug` index. Even if a race occurs, the worst case is two badge rows for the same badge — a minor data inconsistency, not a UX bug. The query+insert in a single mutation is serialized by Convex per-document, so the window is narrow.
- **Stale data in badge evaluation** — Badge evaluation reads workout count, but the current workout was just marked completed in the same mutation. The `db.patch` for workout status happens before the badge hook, so the count should include it. **Verify:** `computePeriodSummary` queries `status === "completed"` and the current workout is already patched to `completed` before the badge hook runs.
- **Overloading badge evaluation with too many queries** — Each badge type needs different data. **Mitigation:** Batch-fetch all needed aggregates once at the top of `evaluateAndAwardBadges`, then iterate through badge definitions checking thresholds. Don't query per-badge.
- **Badge definitions coupling between backend and frontend** — If the definitions constant is in `convex/lib/`, both backend and web app import it via the `@packages/backend` alias. **Verify:** The alias works from both `packages/backend/convex/` and `apps/web/src/` — yes, web already imports from `@packages/backend/convex/_generated/api`. The lib path should work the same way.
- **Missing badges for retroactive activity** — A user with 50 completed workouts who existed before the badge system won't have badges. **Mitigation:** Badge evaluation runs on every `finishWorkout` and checks all thresholds. After the next workout completion, they'll get all badges they qualify for (the 5th, 10th, 25th, 50th badges all awarded at once). No backfill migration needed.
- **Profile page UI getting long** — Profile page already has header, opt-in toggle, and stats. Adding badges must not push stats off-screen. **Mitigation:** Keep badge section compact — horizontal scrollable or grid of emoji badges with small text. Expandable detail on click if needed.

## Open Risks

- **Badge evaluation query count may approach Convex limits on a loaded `finishWorkout`** — The mutation already reads workoutExercises, sets (for feed item count), leaderboardEntries (for upsert), and challengeParticipants (for progress). Adding 5-6 more queries for badge evaluation increases total document reads. At current scale (~100s of workouts) this is fine. At 1000+ workouts per user, `computePeriodSummary` alone reads 500 workout docs + their exercises + sets. **Mitigation:** Keep the non-fatal wrapper. If it fails due to query limits, the badge is awarded next time. Could optimize later with a dedicated pre-computed badge-stats cache.
- **TypeScript import path for badge definitions from web app** — The web app imports from `@packages/backend/convex/_generated/api`. Importing from `@packages/backend/convex/lib/badgeDefinitions` should work via the same alias, but needs verification at build time. If it doesn't resolve, the definitions can be duplicated in `apps/web/src/lib/` (same as D041 units.ts copy pattern).
- **`testFinishWorkout` in testing.ts doesn't call badge evaluation** — It only has feed item creation (no leaderboard, no challenge, no badge hooks). Test helpers must include a direct `testEvaluateAndAwardBadges` mutation, and the verification script calls it explicitly after `testFinishWorkout`. This is consistent with how S01/S02 handle their hooks — `testUpdateLeaderboardEntries` and `testUpdateChallengeProgress` are called separately.

## Badge Definitions Design

~15 badges across 5 categories:

### Workout Count Badges
- `first_workout` — "First Steps" 🏋️ — Complete 1 workout (threshold: 1)
- `ten_workouts` — "Dedicated Lifter" 🔥 — Complete 10 workouts (threshold: 10)
- `twenty_five_workouts` — "Quarter Century" 💪 — Complete 25 workouts (threshold: 25)
- `fifty_workouts` — "Half Century" ⭐ — Complete 50 workouts (threshold: 50)
- `hundred_workouts` — "Centurion" 🏆 — Complete 100 workouts (threshold: 100)

### Volume Badges
- `volume_10k` — "10K Club" 🎯 — Lift 10,000 kg total volume (threshold: 10000)
- `volume_100k` — "100K Club" 💎 — Lift 100,000 kg total volume (threshold: 100000)
- `volume_1m` — "Million Pounder" 🌟 — Lift 1,000,000 kg total volume (threshold: 1000000)

### Streak Badges
- `streak_3` — "Three-peat" 🔥 — 3-day workout streak (threshold: 3)
- `streak_7` — "Week Warrior" 📅 — 7-day workout streak (threshold: 7)
- `streak_30` — "Monthly Machine" 🗓️ — 30-day workout streak (threshold: 30)

### PR Badges
- `first_pr` — "Record Breaker" 🏅 — Achieve 1 personal record (threshold: 1)
- `ten_prs` — "PR Machine" 🎖️ — Achieve 10 personal records (threshold: 10)

### Social/Challenge Badges
- `first_challenge` — "Challenger" ⚔️ — Complete 1 challenge (threshold: 1)
- `five_challenges` — "Challenge Master" 🏅 — Complete 5 challenges (threshold: 5)

### Evaluation Logic

The evaluation function fetches 5 aggregate values once:
1. **workoutCount** — `computePeriodSummary(db, userId, undefined).workoutCount`
2. **totalVolume** — `computePeriodSummary(db, userId, undefined).totalVolume`
3. **currentStreak** — `computeCurrentStreak(db, userId)`
4. **prCount** — `db.query("personalRecords").withIndex("by_userId_exerciseId", q => q.eq("userId", userId)).collect().length`
5. **completedChallengeCount** — Query `challengeParticipants` by userId, join with `challenges` to count status==="completed"

Then for each badge definition, check if (a) the user's stat meets the threshold and (b) the badge isn't already awarded (query `userBadges` by userId+badgeSlug). If both conditions met, insert a `userBadges` row.

Optimization: Fetch all existing `userBadges` for the user once at the start, build a Set of awarded slugs, skip evaluation for already-awarded badges entirely.

## Schema Addition

```typescript
// Add to schema.ts — userBadges table
userBadges: defineTable({
  userId: v.string(),
  badgeSlug: v.string(),
  awardedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_userId_badgeSlug", ["userId", "badgeSlug"]),
```

No `badges` table — definitions are a TypeScript constant (D110).

## Verification Script Design (~12 checks)

- **BG-01:** After 1 workout, `first_workout` badge awarded
- **BG-02:** After 1 workout, `ten_workouts` badge NOT awarded (threshold not met)
- **BG-03:** After multiple evaluations, `first_workout` badge appears only once (no duplicate)
- **BG-04:** `getUserBadges` returns awarded badges with correct metadata
- **BG-05:** Cross-user badge visibility — user B can see user A's badges
- **BG-06:** Volume badge awarded when totalVolume threshold crossed
- **BG-07:** Streak badge awarded when streak threshold met
- **BG-08:** PR badge awarded when PR count meets threshold
- **BG-09:** Challenge badge awarded when completed challenge count meets threshold
- **BG-10:** Badge count increases correctly as more thresholds are crossed
- **BG-11:** Cleanup removes all userBadges for test users
- **BG-12:** Badge definitions constant has expected structure (slug, name, emoji, category, threshold)

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Gamification | `omer-metin/skills-for-antigravity@gamification-loops` (112 installs) | available — gamification loop design patterns. Install: `npx skills add omer-metin/skills-for-antigravity@gamification-loops` |
| Gamification | `coowoolf/insighthunt-skills@gamification-triad` (23 installs) | available — lower installs, likely less proven |
| Convex | `get-convex/agent-skills@convex-helpers-guide` (130 installs) | available — Convex patterns help |
| Convex | `get-convex/agent-skills@function-creator` (115 installs) | available — function authoring |
| Convex | `get-convex/agent-skills@schema-builder` (109 installs) | available — schema design |
| Frontend | `frontend-design` | installed — use for badge display UI |

## Sources

- Convex indexed queries for deduplication (source: [Convex Database Indexes](https://docs.convex.dev/database/indexes)) — composite index `[userId, badgeSlug]` enables efficient duplicate checking without unique constraints
- Convex mutation serialization (source: [Convex ACID Transactions](https://docs.convex.dev/database/advanced/occ)) — mutations are serialized per-document, making query+insert upsert patterns safe under normal load
- Existing codebase patterns — `finishWorkout` non-fatal hooks (S01/S02), `computePeriodSummary` aggregation (M002/S03), `computeCurrentStreak` (M003/S01), `detectAndStorePRs` upsert pattern (M002/S01)
