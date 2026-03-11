# S02: Group Challenges — Backend + Web UI — Research

**Date:** 2026-03-11

## Summary

S02 adds time-limited group challenges to the competitive platform — users create challenges (e.g., "Most Pull-ups This Week"), friends join, logging sets updates live standings, and a scheduled function completes the challenge at deadline with the correct winner. This is the project's first use of Convex cron jobs (`crons.ts`) and `ctx.scheduler.runAt`, which are already proven patterns in the Convex ecosystem — `ctx.scheduler.runAfter` is already used in `notes.ts` for the OpenAI summary flow, and `cronJobs()` from `convex/server` is well-documented with interval/cron/daily/weekly/monthly variants.

The codebase is well-positioned for this: S01 established the pre-computed entry + upsert pattern in `leaderboardCompute.ts` that challenge standings can follow, the `finishWorkout` non-fatal hook pattern is proven (feed items + leaderboard entries), `testing.ts` has established multi-user test helpers (5 test users in S01's verification script), and the web UI pill-picker pattern from the leaderboards page transfers directly to challenge type/status pickers. The primary risk is challenge metric accumulation — "total reps" or "total volume" for a specific exercise requires traversing all sets logged during the challenge period per participant, which must be bounded by `.take()` limits. Secondary risk is the `crons.ts` file being the project's first — cron-triggered functions can't be directly tested, but the internal mutations they call can be exercised through test helpers.

The recommended approach is: (1) add `challenges` and `challengeParticipants` tables with status state machine and indexed standings, (2) create `challenges.ts` with CRUD + standings queries, (3) hook challenge progress updates into `finishWorkout` as a third non-fatal try/catch block (and optionally into `logSet` for more granular realtime updates), (4) create `crons.ts` with a periodic challenge deadline check, (5) schedule one-off `completeChallenge` via `ctx.scheduler.runAt(endTime)` on challenge creation, and (6) build the web UI at `/challenges` with challenge list, create form, standings view, and join flow.

## Recommendation

**Build in 3 tasks matching S01 pattern:**

**T01 — Schema + challenge compute + hooks + crons.ts:** Add `challenges` and `challengeParticipants` tables to schema. Create `lib/challengeCompute.ts` with `updateChallengeProgress(db, userId, workoutId)` that traverses active challenges the user participates in, computes metrics from sets logged during the challenge period, and upserts `currentValue` on `challengeParticipants`. Wire into `finishWorkout` as a third non-fatal hook. Create `crons.ts` with `crons.interval("check challenge deadlines", { minutes: 15 }, internal.challenges.checkDeadlines)`. Create `completeChallenge` as an `internalMutation` — idempotent, checks deadline, determines winner, transitions status to "completed". Schedule `completeChallenge` via `ctx.scheduler.runAt(endTime)` when a challenge is created.

**T02 — Queries + mutations + test helpers + verification:** Create `challenges.ts` with auth-gated functions: `createChallenge`, `joinChallenge`, `leaveChallenge`, `getChallengeStandings`, `listChallenges`, `getChallenge`, `cancelChallenge`. Add ~8-10 test helpers to `testing.ts`. Write `verify-s02-m04.ts` with ~14-16 named checks across 4 test users proving: challenge CRUD, join/leave, standings computation, metric accuracy, participant cap enforcement, status transitions, deadline completion with winner determination, cancellation, and exercise-specific challenge standings.

**T03 — Web UI:** Create `/challenges` page with challenge list (filterable by status), create challenge form (type, exercise, start/end dates), challenge detail with live standings table, and join/leave buttons. Add "Challenges" nav link to Header. Add `/challenges(.*)` to middleware protected routes. Use data-challenge-* attributes for programmatic verification (D057 pattern).

**Prove first:** A challenge is created → 3 users join → each logs sets → standings update correctly → `completeChallenge` fires → winner is determined correctly. This is M004 acceptance test #2.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Challenge deadline scheduling | `ctx.scheduler.runAt(endTime, internal.challenges.completeChallenge, { challengeId })` | First-class Convex feature. Already proven in notes.ts via `runAfter`. `runAt` takes a timestamp (ms since epoch) for precise scheduling. |
| Periodic deadline safety net | `cronJobs()` in `crons.ts` with `crons.interval("check deadlines", { minutes: 15 }, ...)` | Built-in Convex cron infrastructure. First use in project but well-documented. Handles drift from `runAt`. |
| Challenge metric computation | Reuse `computePeriodSummary` pattern from `analytics.ts` — traverse workouts → exercises → sets with time-range filter | Proven aggregation pattern. Working-set filter (`!isWarmup && weight > 0 && reps > 0`) already established in leaderboardCompute.ts and analytics.ts. |
| Standings ranking | Pre-computed `currentValue` on `challengeParticipants` with indexed query `.order("desc").take(N)` | Same top-N pattern as `getLeaderboard` in S01. Avoids on-demand computation. |
| Multi-user test setup | `testing.ts` multi-user pattern with `testUserId` arg (D017/D079) | Already proven with 5 test users in S01 verify script. Extend for 4 challenge test users. |
| Status state machine | `v.union(v.literal(...))` validator on `status` field | Same pattern as `workoutStatus` in existing schema. Runtime-validated by Convex. |

## Existing Code and Patterns

- `packages/backend/convex/workouts.ts` — `finishWorkout` has two non-fatal try/catch blocks (feed item + leaderboard). **Add a third non-fatal block** for challenge progress updates. Same `[Challenge]` error prefix pattern.
- `packages/backend/convex/lib/leaderboardCompute.ts` — `updateLeaderboardEntries` demonstrates the traverse-workout-exercises→sets→compute-metrics→upsert pattern. **Challenge progress computation follows the same shape** but filters by challenge exercise and time window.
- `packages/backend/convex/notes.ts` — Uses `ctx.scheduler.runAfter(0, internal.openai.summary, {...})` — **proves `ctx.scheduler` is available in mutations** and the `internal` import pattern works. `runAt` uses the same API with a timestamp instead of delay.
- `packages/backend/convex/openai.ts` — Uses `internalAction` and `internalMutation` from `"./_generated/server"`. **Follow this import pattern** for `completeChallenge` internal mutation.
- `packages/backend/convex/leaderboards.ts` — `getLeaderboard` uses composite index with `.order("desc").take(N)` for ranked retrieval + profile enrichment. **Challenge standings query follows the same pattern** with `by_challengeId_currentValue` index.
- `packages/backend/convex/schema.ts` — 16 tables including `leaderboardEntries` with composite indexes. `feedItemType` union, `leaderboardMetric` export pattern. **Add `challengeType` and `challengeStatus` validators** following the same union pattern and export them.
- `packages/backend/convex/testing.ts` (2306 lines) — Multi-user test helpers with `testUserId`, `testCleanup` cascade logic. **Extend with challenge test helpers** and add challenge cleanup to `testCleanup`.
- `packages/backend/scripts/verify-s01-m04.ts` — 5-user verification with named checks, `ConvexHttpClient`, cleanup-before-test pattern. **Follow the same structure** for `verify-s02-m04.ts`.
- `apps/web/src/app/leaderboards/page.tsx` — Pill-style MetricPicker/PeriodPicker, ranked table, exercise selector dropdown, `data-leaderboard-*` attributes. **Reuse pill picker pattern** for challenge status/type filtering and `data-challenge-*` attributes for UI verification.
- `apps/web/src/middleware.ts` — Protected route matcher list. **Add `/challenges(.*)`** following the existing pattern.
- `apps/web/src/components/Header.tsx` — Desktop + mobile nav links. **Add "Challenges" link** after "Leaderboards" in both desktop and mobile menus.
- `packages/backend/convex/_generated/api.d.ts` — Manually edited to include `leaderboards` module. **Will need manual additions** for `challenges` and `crons` modules until `npx convex dev` runs.

## Constraints

- **`crons.ts` must export default `cronJobs()` result** — Convex requires the file to be at `convex/crons.ts` (not a subdirectory) and export the cron definitions as default. The cron functions must reference `internal.*` (internal mutations/actions), not public ones.
- **`ctx.scheduler.runAt` timestamp is in milliseconds** — Same as `Date.now()`. Challenge `endAt` must be stored as ms-since-epoch. Convex doesn't guarantee exact-millisecond execution — the scheduled function must verify the challenge hasn't been completed already (idempotent).
- **Convex 10s query timeout / 16K doc read limit** — Challenge standings computation traversing all sets for all participants during a challenge period must be bounded. For a 100-participant challenge with 30 days of sets, this could approach limits. Mitigation: pre-compute `currentValue` in `challengeParticipants` on each workout completion, query only the pre-computed values for standings.
- **`finishWorkout` mutation weight** — Now has 3 non-fatal blocks (feed item + leaderboard + challenge). Each independently fails gracefully but adds latency. Challenge progress update must query active challenges for the user, find matching participants, and compute metrics. Must bound the query to active challenges only (`.withIndex("by_status", q => q.eq("status", "active"))` won't work without a compound index including userId — use a participants-based lookup instead).
- **Convex indexes are single-equality-prefix** — Composite indexes like `[challengeId, currentValue]` allow `eq(challengeId).order("desc")` for standings but NOT `eq(challengeId) AND eq(userId)` simultaneously. Need separate `by_userId` index on `challengeParticipants` for "my challenges" queries and `by_challengeId_userId` for unique join checks.
- **testing.ts is 2306 lines** — Adding ~10 challenge test helpers + cleanup extensions will push to ~2500+ lines. Acceptable per existing pattern (append-only test helpers with clear section headers), but approaching practical limits for IDE navigation.
- **No `convex.config.ts` exists** — `crons.ts` does NOT require `convex.config.ts` (that's only for Convex components). Cron jobs work with the standard `convex/` directory setup.
- **`api.d.ts` manual editing** — First `npx convex dev` run will overwrite. New modules (`challenges`, `crons`, `lib/challengeCompute`) must be added manually for TypeScript compilation, following S01's pattern.

## Common Pitfalls

- **Challenge race condition on join** — Multiple users joining simultaneously. **Mitigation:** Convex mutations are serialized per-document. Since each join inserts a new `challengeParticipants` doc, there's no conflict. Participant count check against cap (D115: 100 max) needs a fresh count query inside the mutation — the `.collect().length` approach is safe because mutations are atomic.
- **Double-completion of challenges** — Both `ctx.scheduler.runAt` and the cron safety-net `checkDeadlines` could fire for the same challenge. **Mitigation:** `completeChallenge` must be idempotent — first check `status !== "active"` and return early if already completed/cancelled. Use `internalMutation` so it can't be called from clients.
- **Challenge progress computed only for matching exercises** — For exercise-specific challenges (totalReps on Pull-ups), the progress hook in `finishWorkout` must only traverse workout exercises matching the challenge's `exerciseId`. For workout-count challenges, it just increments a counter. **Mitigation:** Switch on `challenge.type` in the compute function and only traverse sets when needed.
- **Stale standings after workout deletion** — If a user deletes a workout that contributed to challenge progress, the `currentValue` on their participant entry becomes stale. **Mitigation:** Recompute participant's `currentValue` in `deleteWorkout` cascade (check if workout falls within any active challenge period). Or accept staleness and rely on cron-based recomputation. For S02 MVP, document as a known limitation — challenge progress recomputation on workout deletion is a nice-to-have.
- **Challenge creation with past endAt** — Users could accidentally (or maliciously) create challenges that end in the past. **Mitigation:** Validate `endAt > Date.now()` in `createChallenge`. Also validate `startAt < endAt` and `startAt >= Date.now()` (or allow "start immediately" by defaulting `startAt` to `Date.now()`).
- **Challenge status transition ordering** — The state machine `pending → active → completed → cancelled` has rules: only creator can cancel (from pending or active), only the system can complete (from active), pending→active happens when startAt is reached. **Mitigation:** Keep `activateChallenge` as an internal mutation called by cron when `Date.now() >= startAt && status === "pending"`. Include activation check in the same `checkDeadlines` cron.
- **Feed item type extension** — If challenge completions should appear in the feed (CR-M004-03 from research), `feedItemType` union needs extension. **Recommendation:** Defer feed integration to avoid touching the feed system in S02. S03 or S04 can add `challenge_completed` feed item type.

## Open Risks

- **Challenge metric accumulation cost** — "Total reps" or "total volume" challenges require traversing all sets logged during the challenge period per participant. For a 30-day challenge with a prolific user (50 workouts, ~500 sets), this is ~500 document reads per participant per standings computation. With 100 participants, that's 50K reads — well above the 16K doc read limit. **Mitigation:** Pre-compute `currentValue` incrementally in `finishWorkout` (add delta, not recompute from scratch). The `currentValue` on `challengeParticipants` is the running total. Only the current workout's contribution needs to be computed, not the full history.
- **Cron job testing** — Convex cron jobs can't be directly unit-tested. The `checkDeadlines` internal mutation can be tested via test helpers, but the cron schedule itself (every 15 minutes) is only verifiable by running `npx convex dev` against a live deployment. **Mitigation:** Test the `completeChallenge` and `checkDeadlines` internal mutations directly via test helpers. Trust Convex's cron infrastructure for the scheduling part.
- **`finishWorkout` growing complexity** — With 3 non-fatal hooks (feed + leaderboard + challenge), the mutation is getting heavy. Each hook adds document reads and writes. **Mitigation:** Keep each hook independently non-fatal with structured error logging. Monitor execution time via Convex dashboard. If latency becomes an issue, consider moving hooks to `ctx.scheduler.runAfter(0, ...)` to defer them off the main mutation path.
- **Challenge state activation timing** — Challenges with a future `startAt` need to transition from "pending" to "active" at the right time. The cron runs every 15 minutes, so there could be up to 15 minutes of delay before a pending challenge becomes active. **Mitigation:** Also schedule `activateChallenge` via `ctx.scheduler.runAt(startAt)` on creation, similar to the completion scheduling. The cron is the safety net.
- **M003 verification still pending** — Social features (profiles, follows) that challenges depend on for user lookup and profile enrichment haven't been verified against a live backend. If profile queries have issues, challenge standings enrichment could fail. **Mitigation:** Challenge functions should handle missing profiles gracefully (show userId fallback instead of displayName).

## Schema Design

### New tables (added to existing 16-table schema):

```typescript
// ── Challenges ───────────────────────────────────────────────────────────────
challenges: defineTable({
  creatorId: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  type: challengeType,           // totalReps | totalVolume | workoutCount | maxWeight
  exerciseId: v.optional(v.id("exercises")),  // required for totalReps/totalVolume/maxWeight, optional for workoutCount
  status: challengeStatus,       // pending | active | completed | cancelled
  startAt: v.number(),           // ms since epoch
  endAt: v.number(),             // ms since epoch
  winnerId: v.optional(v.string()),  // set on completion
  completedAt: v.optional(v.number()),
  scheduledCompletionId: v.optional(v.id("_scheduled_functions")),  // for cancellation cleanup
  createdAt: v.number(),
})
  .index("by_status", ["status"])
  .index("by_creatorId", ["creatorId"]),

// ── Challenge Participants ───────────────────────────────────────────────────
challengeParticipants: defineTable({
  challengeId: v.id("challenges"),
  userId: v.string(),
  currentValue: v.number(),      // pre-computed running metric value
  joinedAt: v.number(),
})
  .index("by_challengeId_currentValue", ["challengeId", "currentValue"])  // standings
  .index("by_userId", ["userId"])                                          // my challenges
  .index("by_challengeId_userId", ["challengeId", "userId"]),             // unique join check
```

### Validator exports:

```typescript
const challengeType = v.union(
  v.literal("totalReps"),
  v.literal("totalVolume"),
  v.literal("workoutCount"),
  v.literal("maxWeight"),
);

const challengeStatus = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export { ..., challengeType, challengeStatus };
```

### State Machine:

```
pending ──→ active ──→ completed
  │           │
  └──→ cancelled ←──┘
```

- `pending → active`: When `Date.now() >= startAt`. Triggered by cron check or `ctx.scheduler.runAt(startAt)`.
- `active → completed`: When `Date.now() >= endAt`. Triggered by `ctx.scheduler.runAt(endAt)` or cron safety net. Sets `winnerId` to participant with highest `currentValue`.
- `pending → cancelled` / `active → cancelled`: Creator-initiated. Only the creator can cancel.
- `completed` and `cancelled` are terminal states.

## Challenge Metric Computation Strategy

For each challenge type, the computation in `finishWorkout` differs:

| Type | What to compute | Data traversal |
|------|----------------|----------------|
| `workoutCount` | Increment by 1 | No set traversal needed — just increment `currentValue` |
| `totalReps` | Sum of reps for challenge exercise in this workout | Filter workout exercises by `challenge.exerciseId`, sum `reps` from working sets |
| `totalVolume` | Sum of `weight × reps` for challenge exercise | Filter workout exercises by `challenge.exerciseId`, sum `weight×reps` from working sets |
| `maxWeight` | Max weight lifted in a single set for challenge exercise | Filter workout exercises by `challenge.exerciseId`, find `max(weight)` from working sets — compare-and-update (upsert if greater) |

**Key insight:** The `finishWorkout` hook computes **only the delta from the current workout**, not the full history. For accumulative types (totalReps, totalVolume, workoutCount), it adds the delta to `currentValue`. For max types (maxWeight), it compares and updates only if greater. This keeps the computation bounded per workout.

## Verification Plan

`verify-s02-m04.ts` with ~14-16 named checks across 4 test users:

| Check | What it proves |
|-------|---------------|
| CH-01 | Challenge created with correct fields and "pending" status |
| CH-02 | User can join a challenge (participant entry created) |
| CH-03 | Participant cap enforced (101st join rejected) — may skip for simplicity, test with smaller cap |
| CH-04 | Duplicate join rejected (idempotent) |
| CH-05 | Standings return participants ordered by currentValue descending |
| CH-06 | workoutCount metric increments correctly after finishWorkout |
| CH-07 | totalReps metric sums correctly for challenge exercise |
| CH-08 | totalVolume metric computes correctly (Σ weight×reps) |
| CH-09 | maxWeight metric tracks highest single-set weight |
| CH-10 | Challenge status transitions: pending → active |
| CH-11 | completeChallenge determines correct winner (highest currentValue) |
| CH-12 | completeChallenge is idempotent (second call is no-op) |
| CH-13 | cancelChallenge transitions to cancelled (creator only) |
| CH-14 | listChallenges filters by status correctly |
| CH-15 | Challenge with no participants completes with no winner |
| CH-16 | leaveChallenge removes participant and currentValue |

## Web UI Plan

### `/challenges` page (~400-500 lines estimated)

Components:
- **ChallengeList** — Filterable by status (Active / Completed / My Challenges). Each card shows title, type, participant count, time remaining (or winner for completed).
- **CreateChallengeForm** — Modal or inline form: title, type selector (pill picker), exercise selector (for exercise-specific types), start date, end date.
- **ChallengeDetail** — Standings table (rank, user, current value), challenge info (type, exercise, dates, status), join/leave button, cancel button (creator only).
- **StatusPicker** — Pill-style filter matching MetricPicker pattern from leaderboards.

Data attributes: `data-challenge-page`, `data-challenge-list`, `data-challenge-detail`, `data-challenge-standings`, `data-challenge-create`, `data-challenge-join`.

### Navigation
- "Challenges" link in Header after "Leaderboards" (desktop + mobile)
- `/challenges(.*)` added to middleware protected routes

## Dependencies on S01

S02 consumes from S01:
- **`leaderboardMetric` validator** — Referenced from schema for consistent metric naming, though challenge types are distinct from leaderboard metrics.
- **`updateLeaderboardEntries` pattern** — The upsert-on-improvement pattern. Challenge standings use a similar approach but with incremental delta.
- **Non-fatal hook pattern in `finishWorkout`** — Third try/catch block follows the exact same structure.
- **Multi-user test helper pattern** — Same `testUserId` approach, same `testCleanup` extension.
- **Pill picker UI pattern** — MetricPicker/PeriodPicker from leaderboards page reused for StatusPicker/TypePicker.

S02 does NOT modify any S01 artifacts (leaderboardEntries table, leaderboard queries, leaderboard UI) — clean separation.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (130 installs) | available — could help with Convex cron and scheduler patterns |
| Convex | `get-convex/agent-skills@function-creator` (115 installs) | available — could help with internal mutation authoring for challenge lifecycle |
| Convex | `get-convex/agent-skills@schema-builder` (109 installs) | available — could help with challenge table schema design |
| Frontend Design | `frontend-design` | installed — use for challenge UI |

## Sources

- Convex cron jobs documentation (source: [Convex Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs)) — `cronJobs()` in `crons.ts`, `crons.interval()` / `crons.cron()` / `crons.daily()` etc., must export default, references `internal.*` functions
- Convex scheduled functions (source: [Convex Scheduled Functions](https://docs.convex.dev/scheduling/scheduled-functions)) — `ctx.scheduler.runAfter(ms, fn, args)` and `ctx.scheduler.runAt(timestamp, fn, args)`, available in mutations and actions, timestamp in ms since epoch
- Existing `notes.ts` in codebase — proves `ctx.scheduler.runAfter(0, internal.openai.summary, { noteId })` works with internal function references
- Existing `openai.ts` in codebase — proves `internalAction` and `internalMutation` import from `"./_generated/server"` and internal function definitions
- S01 summary forward intelligence — `finishWorkout` has 2 non-fatal hooks, `updateLeaderboardEntries` demonstrates traverse-compute-upsert pattern, `api.d.ts` needs manual editing
