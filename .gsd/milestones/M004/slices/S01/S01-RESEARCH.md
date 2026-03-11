# S01: Leaderboards — Backend + Web UI — Research

**Date:** 2026-03-11

## Summary

S01 adds pre-computed leaderboard rankings backed by a new `leaderboardEntries` table with composite indexes for top-N queries, a `leaderboardOptIn` field on the existing `profiles` table, and a web UI at `/leaderboards` showing ranked entries filtered by exercise, metric, and time period. The core backend pattern is proven: Convex indexed `.withIndex().order("desc").take(N)` is explicitly documented for leaderboard-style queries (confirmed via Context7 docs), and the codebase already has a clean non-fatal hook pattern in `finishWorkout` (feed item creation at line ~53 of `workouts.ts`) that S01 replicates for leaderboard entry upserts.

The primary risk is the composite index design for `leaderboardEntries`. The index must support `eq(exerciseId).eq(metric).eq(period)` with the score field (`value`) as the trailing sort column, enabling `.order("desc").take(10)` for top-N within a specific exercise+metric+period combination. Convex composite indexes require equality conditions on all prefix fields before the sort field — confirmed by docs. The "show my rank" feature (D114) uses a bounded `.take(1000)` scan then indexOf — acceptable for MVP but will need the Convex Aggregate component if rank precision at scale becomes required.

The secondary risk is the `finishWorkout` mutation weight. This mutation already creates feed items (non-fatal). S01 adds leaderboard entry upserts as a second non-fatal try/catch block. Each workout completion will compute e1RM/volume/reps metrics across all exercises in the workout and upsert corresponding leaderboard entries. With 4-8 exercises per workout and 3 metrics each, that's 12-24 upserts — bounded and fast, but must be independently non-fatal so a bug in leaderboard logic never blocks workout completion.

## Recommendation

**Build order within S01:**

1. **Schema changes** — Add `leaderboardEntries` table to `schema.ts` with `by_exerciseId_metric_period_value` composite index (4 prefix equality fields + value as sort). Add `leaderboardOptIn: v.optional(v.boolean())` to `profiles` table.

2. **Leaderboard computation helper** — `packages/backend/convex/lib/leaderboardCompute.ts` — extracted `updateLeaderboardEntries(db, userId, workoutId)` function that:
   - Fetches all workoutExercises + sets for the workout
   - Computes 3 metrics per exercise: best e1RM (via existing `estimateOneRepMax`), total volume, max reps
   - Upserts into `leaderboardEntries` per exercise/metric/period (all-time + 30d + 7d)
   - Period entries store a `periodStart` timestamp for filtering; "all-time" uses 0

3. **Hook into finishWorkout** — Add second non-fatal try/catch block after feed item creation. Mirror the exact pattern used for feed items.

4. **Leaderboard queries** — New `packages/backend/convex/leaderboards.ts` file with:
   - `getLeaderboard(exerciseId, metric, period, limit)` — auth-gated, returns top-N with opt-in filtering
   - `getMyRank(exerciseId, metric, period)` — bounded scan for caller's position
   - `setLeaderboardOptIn(optIn: boolean)` — mutation to toggle opt-in on profiles

5. **Test helpers in testing.ts** — `testSetLeaderboardOptIn`, `testGetLeaderboard`, `testGetMyRank`, `testUpdateLeaderboardEntries` (direct call for setup)

6. **Verification script** — `verify-s01-m04.ts` with 5+ test users proving: ranking correctness, opt-in filtering, rank after update, non-opted-in exclusion, metric accuracy

7. **Web UI** — `/leaderboards` page with exercise selector, metric picker (e1RM/volume/reps), period picker (7d/30d/all-time), top-N table, "my rank" callout. Profile page gets leaderboard opt-in toggle.

**Reuse extensively:**
- `estimateOneRepMax` from `convex/lib/prDetection.ts` for e1RM metric
- `finishWorkout` non-fatal try/catch pattern from `workouts.ts`
- `testCleanup` extension pattern from `testing.ts` (add leaderboardEntries cleanup)
- `data-*` attribute convention (D057/D064/D082/D090/D099) for UI verification
- `ConvexHttpClient` verification script pattern from M01/M02/M03 scripts
- Profile page integration pattern from `ProfileStats.tsx`
- `PeriodSelector` UI pattern from analytics page

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Top-N leaderboard queries | `.withIndex("by_exerciseId_metric_period_value").order("desc").take(N)` | O(1) index scan. Convex docs explicitly show this pattern for leaderboard use case. |
| Estimated 1RM computation | `estimateOneRepMax()` from `convex/lib/prDetection.ts` | Already proven in M02. Epley formula, edge case handling (>15 reps, 1 rep). Single source of truth (D061). |
| Non-fatal mutation hooks | Feed item try/catch in `finishWorkout` (workouts.ts:~53) | Proven pattern — if leaderboard update fails, workout completion still succeeds. |
| User opt-in field | `v.optional(v.boolean())` on profiles (same pattern as `isPublic` on workouts) | Convex optional fields with undefined = not opted in. Simple, backward-compatible. |
| Test helper pattern | `testing.ts` with `testUserId` arg pattern (D017/D079) | 2041 lines of proven test helpers. Multi-user testing already established for M03 social. |
| Period selector UI | `PeriodSelector` component in analytics page | Reusable pill selector pattern with configurable periods array. |

## Existing Code and Patterns

- `packages/backend/convex/workouts.ts` — `finishWorkout` creates feedItems in a non-fatal try/catch block (lines ~45-75). **Clone this exact pattern** for the leaderboard entry upsert block. The feed item block counts exercises and PRs — leaderboard block will traverse the same workoutExercises and their sets.

- `packages/backend/convex/lib/prDetection.ts` — `estimateOneRepMax(weight, reps)` exported for reuse (D061). `detectAndStorePRs` shows the upsert pattern: fetch existing record, compare, patch or insert. **Reuse `estimateOneRepMax`** directly. **Follow the upsert pattern** (fetch existing leaderboard entry → compare value → patch if better or insert if new).

- `packages/backend/convex/analytics.ts` — `computePeriodSummary(db, userId, periodDays, includePrivate)` traverses workouts → workoutExercises → sets. The traversal pattern (get workouts, loop workoutExercises, collect sets) is reused by the leaderboard compute helper. Volume computation (`weight × reps` summed across working sets) is identical.

- `packages/backend/convex/profiles.ts` — `profiles` table already has `by_userId` index. Adding `leaderboardOptIn` field is a non-breaking schema addition. `updateProfile` mutation shows the patch pattern for optional field updates.

- `packages/backend/convex/testing.ts` (2041 lines) — `testCleanup` at line ~1800 cascade-deletes all user data including profiles, follows, feedItems, etc. **Must extend** to also delete leaderboardEntries by userId. `testCreateProfile`, `testFinishWorkout`, `testLogSet`, `testAddExercise` are all reusable for multi-user leaderboard test setup.

- `packages/backend/convex/schema.ts` — 15 tables, fully normalized. `personalRecords` table shows the pattern for a per-user/per-exercise storage table with composite index (`by_userId_exerciseId`). Leaderboard entries follow the same pattern but indexed for cross-user top-N queries (reverse: exercise+metric+period as prefix, value as sort).

- `packages/backend/scripts/verify-s01-m02.ts` — Verification script pattern: resolve CONVEX_URL, create ConvexHttpClient, cleanup → setup → checks → cleanup → summary. Multi-exercise setup with `allExercises[0]` and `allExercises[1]` from seed data. **Follow this pattern exactly** for `verify-s01-m04.ts`.

- `apps/web/src/app/analytics/page.tsx` — `PeriodSelector` component (pill buttons for time period selection), `useQuery` pattern with conditional loading, empty state handling. **Reuse for leaderboard page** — exercise picker + metric picker + period picker.

- `apps/web/src/app/profile/[username]/page.tsx` — Profile view with `FollowButton`, inline edit, `ProfileStats` integration. **Extend with leaderboard opt-in toggle** in the profile settings section (similar to existing Edit Profile flow).

- `apps/web/src/middleware.ts` — Protected routes matcher. **Must add `/leaderboards(.*)` to the isProtectedRoute matcher** to require auth.

## Constraints

- **Convex composite index ordering** — Index `by_exerciseId_metric_period_value` must have `exerciseId`, `metric`, `period` as equality prefix fields and `value` as the trailing sort field. The `order("desc").take(N)` only applies to the **last field** after all equality conditions are satisfied. Verified via Convex docs: "step through fields in the order they are defined in the index."

- **Convex index field count** — A 4-field composite index (`exerciseId`, `metric`, `period`, `value`) is within Convex limits. The `_creationTime` auto-appended as the final tiebreaker is acceptable for score ties.

- **`finishWorkout` mutation weight** — Already does: get workout, patch status, count exercises, count PRs, insert feedItem. Adding leaderboard upserts adds: traverse workoutExercises + sets (same data, can share the query), upsert N entries. Total reads bounded by workout size (typically 4-8 exercises × 3-5 sets = 12-40 set reads + 12-24 leaderboard entry reads/writes). Well within Convex's mutation limits.

- **testing.ts is 2041 lines** — Adding ~200-250 lines of leaderboard test helpers pushes to ~2250 lines. Acceptable per the current append-only convention. Will add clear section headers (`// ── Leaderboard test helpers ──`).

- **No `crons.ts` exists yet** — S01 does NOT create crons.ts (that's S02's responsibility). S01 computes leaderboard entries eagerly on `finishWorkout`. A cron for periodic recalculation is a safety net added in S02.

- **Period handling for time-filtered leaderboards** — "7-day" and "30-day" leaderboards require entries to be refreshed when workouts age out of the window. Options: (a) store period-specific entries with `periodStart` and re-compute periodically via cron, or (b) store all-time entries only and filter at query time. Option (b) is simpler for S01 — filter at query time using `completedAt` on the originating workout or `updatedAt` on the entry. This avoids the complexity of managing period-specific rows. Cron-based refresh comes in S02.

  **Revised approach**: Store only all-time entries in S01. Time-filtered leaderboards use `updatedAt` field comparison in the query (post-filter). This adds a scan cost for time-filtered views but avoids triple the row count. S02 can add period-specific entries with cron refresh if needed.

- **`leaderboardOptIn` backward compatibility** — `v.optional(v.boolean())` means existing profiles (created before S01) have `undefined` which is treated as "not opted in" (D109). No migration needed. Users must explicitly toggle to appear on leaderboards.

- **Exercise selector for leaderboards** — The exercise library has 144 seeded exercises. Leaderboard page needs an exercise picker, but only exercises with leaderboard entries should appear. A `getLeaderboardExercises` query returns distinct exerciseIds from leaderboardEntries for the dropdown.

## Common Pitfalls

- **Index field order mistake** — Putting `value` before `period` in the composite index would break the top-N query pattern. The field that gets `.order("desc").take(N)` must be the **last field** in the index definition, after all equality prefix fields. Triple-check: `["exerciseId", "metric", "period", "value"]`.

- **Leaderboard entries for non-opted-in users** — Should entries be created for non-opted-in users? Yes — always compute and store entries so that when a user opts in, their ranking appears immediately. The opt-in filter is applied at **query time** (the `getLeaderboard` query checks the author's profile `leaderboardOptIn`), not at write time. This requires joining profiles in the leaderboard query.

- **Opt-in enforcement via post-filter, not index** — The `by_exerciseId_metric_period_value` index doesn't include an `optedIn` field (that's on the profiles table, not leaderboardEntries). The query fetches top-N entries then filters out users who haven't opted in by joining profiles. This means taking more entries than needed and post-filtering. Take `limit * 3` and filter down to `limit` as a safety margin — revisit if opt-in ratio is very low.

- **Volume metric double-counting warmup sets** — `computePeriodSummary` skips warmup sets (`set.isWarmup`). Leaderboard volume computation must also skip warmups. Copy the same filter: `if (set.isWarmup) continue; if (!set.weight || !set.reps) continue;`.

- **Stale leaderboard entries after workout deletion** — When `deleteWorkout` cascade-deletes sets and feed items, it does NOT currently touch leaderboard entries. Must either: (a) add cascade-delete of leaderboard entries in `deleteWorkout`, or (b) accept staleness and let cron cleanup handle it (S02). Option (a) is safer — add to cascade in `deleteWorkout` and `testDeleteWorkout`.

- **"Show my rank" performance** — D114 specifies `.take(1000)` bounded scan. For early scale this is fine. But the scan returns 1000 documents just to find one user's position. If this becomes a hot query, consider adding a `by_userId_exerciseId_metric_period` index to directly look up the user's entry and its value, then compare against the leader's value.

- **finishWorkout concurrent calls** — If a user somehow calls finishWorkout twice rapidly, both will try to upsert leaderboard entries. The upsert pattern (fetch existing → compare → patch/insert) is naturally safe because Convex mutations are serialized per-document. Second call will see the first call's writes.

## Open Risks

- **Opt-in post-filter scaling** — If most users don't opt in, the top-N query needs to fetch many more entries than `limit` to find `limit` opted-in users. At small scale (< 1000 users) this is negligible. At large scale, consider adding `leaderboardOptIn` to the composite index or maintaining a separate `optedInLeaderboardEntries` table. **Mitigation:** Take `limit * 3` initially, with a fallback fetch of more if needed.

- **Period-filtered leaderboard staleness** — S01 stores only all-time entries. Time-filtered views (7d/30d) use `updatedAt` comparison, which means a user who set a great 1RM 31 days ago still appears in the 30d view if their entry hasn't been recalculated. **Mitigation:** This is acceptable for S01 MVP. S02 adds cron-based periodic recalculation that refreshes entries. The UI can label time-filtered views as "approximate."

- **Workout deletion leaderboard orphan** — If a user deletes a workout that produced their best leaderboard score, the entry persists with the old value. No recomputation happens until the next workout completion. **Mitigation:** Add leaderboard entry deletion in `deleteWorkout` cascade. For recomputation, the user needs to complete another workout for that exercise — acceptable for MVP.

- **M003 verification never executed** — 42 M03 checks have never run against a live Convex backend (blocked by Convex CLI auth). If `profiles` table has latent bugs (e.g., `by_userId` index issues), the `leaderboardOptIn` field addition and opt-in queries could surface unexpected failures. **Mitigation:** S01 verification script independently tests profile creation and opt-in toggle — will catch any profile table issues.

- **testing.ts approaching maintainability limit** — At 2041 lines, adding ~200-250 more leaderboard helpers pushes to ~2250. Still manageable with section headers, but S02 (challenges) and S03 (badges) will each add 200+ more lines. Consider splitting into `testing-competitive.ts` during S02 if the file exceeds 2500 lines.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (129 installs) | available — could help with index patterns and query optimization |
| Convex | `get-convex/agent-skills@function-creator` (115 installs) | available — could help with Convex function authoring patterns |
| Convex | `get-convex/agent-skills@schema-builder` (109 installs) | available — could help with schema design for new tables |
| Convex | `get-convex/agent-skills@components-guide` (112 installs) | available — relevant if Aggregate component is needed later |
| Frontend Design | `frontend-design` | installed — use for leaderboard page UI |

## Sources

- Convex indexed top-N query pattern (source: [Convex Database Indexes](https://docs.convex.dev/database/indexes)) — `.withIndex("by_highest_score").order("desc").take(10)` confirmed as the efficient leaderboard query pattern
- Convex composite index with equality prefix + sorted trailing field (source: [Convex Database Indexes](https://docs.convex.dev/database/indexes)) — `.withIndex("by_country_highest_score", q => q.eq("country", "CA")).order("desc").take(10)` confirms the index design for exercise+metric+period filtering with value-based top-N
- Convex cron jobs (source: [Convex Scheduling Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs)) — `cronJobs()` in `crons.ts`, supports interval/cron/monthly schedules. Deferred to S02 but confirmed available.
- Convex scheduled functions (source: [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions)) — `ctx.scheduler.runAfter` / `ctx.scheduler.runAt` for one-off future execution. Used in S02 for challenge deadlines.
- Convex index field ordering constraint (source: [Convex Using Indexes](https://docs.convex.dev/using/indexes)) — Equality conditions must be specified in index field order; inequality/sort only on subsequent fields after all equalities.
