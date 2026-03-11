# M004: Leaderboards & Challenges — Research

**Date:** 2026-03-11

## Summary

M004 adds three competitive features — leaderboards, time-limited challenges, and an achievement/badge system — on top of the existing 15-table Convex schema, M001 workout data, M002 PR/analytics logic, and M003 social infrastructure. The codebase is well-structured for this: PR detection already runs in the `logSet` mutation hot path (non-fatal pattern from D052), `computePeriodSummary` is a proven reusable aggregation function, and the M003 profile/social layer provides the display surface for badges and the follow graph for challenge invitations. The primary architectural question is how to compute leaderboard rankings without scanning all users' data on every query.

The recommended approach is a **pre-computed leaderboard entries table** updated by hooks in `finishWorkout`/`logSet` (the same pattern that creates feed items today), combined with Convex **cron jobs** for periodic recalculation and challenge lifecycle management. This avoids the complexity of the Convex Aggregate component (which would require a `convex.config.ts` setup the project doesn't have yet) while staying within Convex's query performance constraints. For the first slice, prove leaderboard ranking correctness with a `leaderboardEntries` table indexed for top-N queries — the existing `by_highest_score` index pattern from Convex docs maps directly to `withIndex(...).order("desc").take(N)`. Challenges and badges follow naturally once the leaderboard infrastructure is proven.

The riskiest technical unknowns are: (1) leaderboard update cost on the `logSet`/`finishWorkout` mutation path — must remain non-fatal like PR detection, (2) challenge deadline enforcement via Convex cron jobs — this is the project's first use of `crons.ts`, and (3) badge rule evaluation flexibility — hardcoded rules are simpler and adequate for the defined badge set, but a data-driven engine adds complexity without clear benefit at this scale.

## Recommendation

**Slice order: S01 Leaderboards → S02 Challenges → S03 Badges → S04 Mobile Port.** This follows the M001/M002/M003 pattern of backend+web first, mobile last (D050/D077). Leaderboards first because they're the simplest competitive feature and prove the pre-computed ranking pattern. Challenges depend on leaderboard infrastructure for standings. Badges are the most self-contained and can be done in parallel-ish with challenges but ordered last to avoid blocking the higher-value features.

**Prove first:** A `leaderboardEntries` table with indexed queries returning correct top-10 rankings for bench press 1RM across 5+ test users, updated correctly when new sets are logged. This is the M004 acceptance test #1 and validates the core pattern.

**Reuse extensively:** The `finishWorkout` non-fatal hook pattern (feed item creation), `computePeriodSummary` for aggregation, `detectAndStorePRs` for real-time metric updates, the D017 `testing.ts` multi-user test helper pattern (D079), and the `data-*` attribute convention for UI verification (D057/D064/D082/D090/D099).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Top-N leaderboard queries | Convex indexed `.order("desc").take(N)` | O(1) with index. Avoids full table scan. Docs explicitly show this pattern for leaderboards. |
| Challenge deadline enforcement | Convex cron jobs (`cronJobs()` in `crons.ts`) | Built-in recurring task scheduling. No external scheduler needed. First-class Convex feature. |
| One-off scheduled tasks (challenge end) | `ctx.scheduler.runAt(timestamp, fn)` | Schedule challenge completion at exact deadline. Handles timezone-free UTC timestamps. |
| Large-scale aggregation (future) | `@convex-dev/aggregate` Convex component | O(log n) count/sum/rank. Not needed at current scale but is the escape hatch if pre-computed tables hit limits. |
| Bodyweight normalization (Wilks/DOTS) | Published coefficient tables | Well-established powerlifting formulas. Don't invent a new normalization — use DOTS (modern, simpler) or Wilks (legacy standard). |

## Existing Code and Patterns

- `packages/backend/convex/workouts.ts` — `finishWorkout` creates feedItems in a non-fatal try/catch block. **Reuse this exact pattern** for updating leaderboard entries and evaluating badge rules on workout completion.
- `packages/backend/convex/sets.ts` — `logSet` calls `detectAndStorePRs` non-fatally. **Reuse this pattern** for real-time challenge standing updates (per-set metric accumulation).
- `packages/backend/convex/lib/prDetection.ts` — `detectAndStorePRs` upserts into `personalRecords` table, comparing new values against existing bests. **Reuse this upsert-on-improvement pattern** for leaderboard entry updates.
- `packages/backend/convex/analytics.ts` — `computePeriodSummary` and `computeVolumeByMuscleGroup` are extracted shared functions. **Reuse `computePeriodSummary`** for challenge metric computation (workout count, total volume).
- `packages/backend/convex/profiles.ts` — `computeCurrentStreak` walks UTC days backward. **Reuse for streak leaderboard.** `getProfileStats` shows how to compose multiple compute functions into a single query response.
- `packages/backend/convex/testing.ts` — 2041-line file with `testUserId`-based helpers (D017/D079). **Extend with leaderboard, challenge, and badge test helpers.** Multi-user patterns already established for social tests.
- `packages/backend/convex/social.ts` — Follow graph queries (`by_followerId`, `by_followingId`). **Reuse for challenge invitation** — invite followed users to challenges.
- `packages/backend/convex/schema.ts` — 15 tables, fully normalized. No `convex.config.ts` exists — adding one would be needed only if using Convex components (Aggregate). **Add 4-5 new tables** (leaderboardEntries, challenges, challengeParticipants, badges, userBadges).
- `apps/web/src/components/profile/ProfileStats.tsx` — Profile stat cards with `data-profile-stats` attribute. **Badge display integrates here** — add a badges section below existing stats.
- `apps/web/src/app/feed/page.tsx` — Feed page with `usePaginatedQuery`. **Challenge standings can reuse this pagination pattern** for participant lists.

## Constraints

- **Convex 10s query timeout / 16K doc read limit** — Leaderboard queries must use indexed `.take(N)`, not full table scans. Pre-computed leaderboard entries with indexed score fields are mandatory at any meaningful scale.
- **Convex `.collect()` returns max 1024 documents** — Challenge standings with 100+ participants need pagination or `.take(N)` with appropriate limits.
- **No `convex.config.ts` exists** — Adding `@convex-dev/aggregate` would require creating this file and running `npx convex dev` to generate component code. Defer unless pre-computed tables prove insufficient.
- **`logSet` is the performance-critical hot path** — Any leaderboard/badge computation added here MUST be non-fatal (try/catch) and bounded in document reads. Users must never be blocked from logging a set because of competitive feature failures.
- **`finishWorkout` already does feed item creation** — Adding leaderboard entry updates and badge evaluation here adds mutation weight. Keep each addition independently non-fatal.
- **No user bodyweight field in schema** — Bodyweight-class leaderboards require adding a `bodyWeight` field to `profiles` or `userPreferences`. This is a schema change with no existing data to migrate.
- **Convex indexes are case-sensitive and single-field equality** — Composite leaderboard indexes (exercise + metric + period) must be designed carefully. Can't do inequality filters on multiple fields simultaneously.
- **`testing.ts` is already 2041 lines** — Adding M004 test helpers will push it further. Consider splitting into `testing-social.ts` and `testing-competitive.ts` or keeping one file with clear section headers (current pattern).
- **Web-first, mobile-last pattern** (D050/D077) — S01-S03 deliver backend + web UI. S04 ports all competitive features to mobile. React Native components in `apps/native/src/components/` with `Native` suffix (D067).

## Common Pitfalls

- **Leaderboard staleness vs. mutation cost** — Pre-computed leaderboard entries updated on every set log add write cost to the hot path. **Mitigation:** Update only on workout completion (`finishWorkout`), not per-set. Challenge standings may need per-set updates for real-time feel — make these non-fatal and bounded. Use cron jobs for periodic full recalculation as a consistency safety net.
- **Challenge race conditions on join/leave** — Multiple users joining simultaneously could cause count inconsistencies. **Mitigation:** Convex mutations are serialized per-document, so insert-based joins are naturally atomic. Use optimistic concurrency — let the mutation handle the constraint check.
- **Badge double-awarding** — If badge evaluation runs on every workout completion, the same badge could be evaluated and awarded twice during concurrent requests. **Mitigation:** Use upsert pattern (check existence before insert) with a unique index on `[userId, badgeId]`. Same pattern as PR detection upsert.
- **Leaderboard opt-in complexity** — Users who haven't opted in should not appear on leaderboards but their data should still be tracked privately. **Mitigation:** Add `leaderboardOptIn: v.optional(v.boolean())` to profiles. Leaderboard queries filter on this field. Default false to respect privacy.
- **Challenge end time enforcement drift** — `ctx.scheduler.runAt` is not guaranteed to fire at the exact millisecond. **Mitigation:** The scheduled function checks the actual deadline timestamp on execution. If the challenge hasn't ended yet (clock skew), reschedule. If it has, complete it. Idempotent completion logic.
- **Overbuilding the badge rule engine** — A data-driven rules table adds significant complexity (rule parser, condition evaluator, threshold types). **Mitigation:** Start with hardcoded badge definitions in a TypeScript object/map. ~15-20 badges don't justify a rules engine. Can migrate to data-driven later if the badge catalog grows past 50+.
- **Bodyweight normalization scope creep** — DOTS/Wilks require user bodyweight which doesn't exist in the schema and may not be regularly updated. **Mitigation:** Start with absolute leaderboards and simple weight classes (e.g., <70kg, 70-85kg, 85-100kg, 100kg+). DOTS/Wilks normalization is a candidate for a future enhancement, not M004 table stakes.

## Open Risks

- **Convex Aggregate component may be needed if pre-computed tables don't scale** — The `@convex-dev/aggregate` component provides O(log n) rank lookups (e.g., "what rank am I?"), which pre-computed tables can't efficiently answer without scanning. If "show my rank" is a hard requirement, the Aggregate component becomes necessary. This would be the project's first Convex component, requiring a `convex.config.ts` file.
- **Cron job testing** — Convex cron jobs (`crons.ts`) can't be directly unit-tested. The scheduled functions they call can be tested individually, but the scheduling itself requires a running Convex backend. Verification scripts must test the functions, not the cron triggers.
- **testing.ts file growth** — At 2041 lines and growing, the single testing file may become unwieldy. The risk is low (it's append-only test helpers) but it slows down searches and IDE navigation.
- **M003 verification still pending** — 42 M003 checks have never been executed against a live Convex backend (blocked by Convex CLI auth). If M003 has latent bugs in social/profiles, M004 features that depend on them (badge display on profiles, challenge invitations via follow graph) may surface unexpected failures.
- **Challenge metric computation for "total reps" or "most volume" on specific exercises** — These require traversing all sets logged during the challenge period for each participant, which could hit Convex's document read limits for long challenges or prolific users. Bounded `.take()` with reasonable limits or pre-aggregated totals mitigate this.

## Candidate Requirements & Requirements Analysis

### Table Stakes (must have for R018/R019/R020 to be meaningful)

- **Leaderboard opt-in field on profiles** — R018 explicitly says "opt-in leaderboards." This requires a schema field and UI toggle. Without it, all users appear on leaderboards by default, violating the requirement.
- **Challenge lifecycle state machine** — R019 requires create → join → active → complete. This is a 4-state machine with transitions. Incomplete implementations that skip states (e.g., no explicit "active" vs "pending" distinction) will cause bugs in deadline enforcement.
- **Badge display on profiles** — R020 says "display on profiles." This requires UI integration with the existing ProfileStats component on both web and mobile.

### Likely Omissions (expected behaviors not explicitly stated)

- **"Show my rank" query** — Users will expect to see their own rank on a leaderboard, not just the top N. This requires either scanning down from top until finding the user (O(N) worst case), using the Convex Aggregate component's `indexOf`, or storing rank in the pre-computed entry.
  - *Recommendation:* Surface as a candidate requirement. Implement as a bounded scan (`.take(1000)`) for MVP. If 1000+ participants, fall back to "Top 100" display with "You're not in the top 100" message.
- **Challenge creator privileges** — Who can modify/cancel a challenge? The creator only? Any participant? This isn't specified in R019.
  - *Recommendation:* Only the creator can cancel/modify. Simple ownership check.
- **Leaderboard time period filtering** — R018 says "filterable by time period" but doesn't specify which periods.
  - *Recommendation:* Reuse D048/D066 period patterns: 7d, 30d, 90d, all-time. Consistent with existing analytics.
- **Challenge progress notifications** — When someone overtakes you in a challenge, should you be notified? Not specified.
  - *Recommendation:* Out of scope for M004. Notifications are a separate system.

### Overbuilt Risks

- **Bodyweight normalization (Wilks/DOTS)** — The context doc lists this as an open question. At M004 scale (early competitive features), absolute leaderboards with simple weight classes are sufficient. DOTS/Wilks adds formula complexity, requires user bodyweight data entry (which users may not do), and provides marginal fairness benefit for a small user base.
  - *Recommendation:* Defer DOTS/Wilks to post-M004. Implement simple weight classes only if bodyweight field is added for other reasons.
- **Data-driven badge rules engine** — The context doc asks "hardcoded or data-driven?" For ~15-20 defined badges, a rules engine is overbuilt.
  - *Recommendation:* Hardcoded badge definitions as a TypeScript constant. Revisit if badge catalog exceeds 50.

### Continuity Expectations

- **M001 set logging must not regress** — Non-fatal wrappers on any `logSet`/`finishWorkout` additions.
- **M002 analytics and PR detection must continue working** — Leaderboard entries may reuse PR data but must not modify it.
- **M003 profiles and feed must continue working** — Badge display adds to profiles but doesn't replace existing stats. Challenge events could appear in feed (candidate enhancement).

### Candidate New Requirements (advisory, not auto-binding)

1. **CR-M004-01: Leaderboard opt-in toggle** — Users must explicitly opt in to appear on public leaderboards. Default: opted out. UI toggle on profile/settings.
2. **CR-M004-02: "Show my rank" on leaderboards** — Users see their own position even if not in the top N display.
3. **CR-M004-03: Challenge feed integration** — Challenge completions and new challenge creations appear in the activity feed as new feed item types.
4. **CR-M004-04: User bodyweight for weight classes** — Optional bodyweight field on profiles for weight-class leaderboard filtering.
5. **CR-M004-05: Challenge participant cap** — Maximum number of participants per challenge to prevent unbounded query costs.

## Schema Design Preview

New tables needed (added to existing 15-table schema):

```
leaderboardEntries — Pre-computed ranking entries
  userId, exerciseId, metric (e1rm/volume/reps), value, period, updatedAt
  Indexes: by_exerciseId_metric_period_value (for top-N), by_userId (for "my entries")

challenges — Challenge definitions
  creatorId, title, type (totalReps/totalVolume/workoutCount/maxExercise),
  exerciseId?, startAt, endAt, status (pending/active/completed/cancelled)
  Indexes: by_status, by_creatorId

challengeParticipants — Join table
  challengeId, userId, currentValue, joinedAt
  Indexes: by_challengeId_currentValue (for standings), by_userId

badges — Badge definitions (could be hardcoded constant instead)
  slug, name, description, iconEmoji, category, threshold

userBadges — Awarded badges
  userId, badgeSlug, awardedAt, metadata?
  Indexes: by_userId, by_userId_badgeSlug (uniqueness)
```

## Slice Boundary Contracts

- **S01 → S02 contract:** `leaderboardEntries` table and update logic. Challenge standings reuse the same pre-computed value pattern.
- **S02 → S03 contract:** Challenge completion triggers badge evaluation (e.g., "Complete 5 challenges" badge). Badge evaluation function accepts `(db, userId, event)` and is called from both `finishWorkout` and challenge completion.
- **S01-S03 → S04 contract:** All Convex queries/mutations are shared. Mobile only needs React Native UI components consuming the same API.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (129 installs) | available — could help with Convex patterns and components |
| Convex | `get-convex/agent-skills@function-creator` (115 installs) | available — could help with Convex function authoring |
| Convex | `get-convex/agent-skills@schema-builder` (109 installs) | available — could help with schema design |
| Gamification | `omer-metin/skills-for-antigravity@gamification-loops` (111 installs) | available — could help with badge/achievement design patterns |
| Frontend Design | `frontend-design` | installed — use for leaderboard/challenge UI |

## Sources

- Convex cron jobs documentation (source: [Convex Scheduling Docs](https://docs.convex.dev/scheduling/cron-jobs)) — `cronJobs()` in `crons.ts`, supports interval, cron syntax, weekly, monthly schedules
- Convex scheduled functions (source: [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions)) — `ctx.scheduler.runAfter(ms, fn)` and `ctx.scheduler.runAt(timestamp, fn)` for one-off future execution
- Convex indexed top-N queries (source: [Convex Database Indexes](https://docs.convex.dev/database/indexes)) — `.withIndex(...).order("desc").take(N)` for efficient leaderboard queries
- Convex Aggregate component (source: [Convex Aggregate GitHub](https://github.com/get-convex/aggregate)) — O(log n) count, sum, rank, indexOf operations for large-scale leaderboards (escape hatch)
- Convex components setup (source: [Convex Components Docs](https://docs.convex.dev/components/using)) — Requires `convex.config.ts` with `defineApp()` and `app.use(component)`
- Convex best practices (source: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices)) — Use indexed queries with `.take()` instead of unbounded `.collect()`, pagination for large result sets
