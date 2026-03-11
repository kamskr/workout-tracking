# S03 ("Integration Hardening & Verification") — Research

**Date:** 2026-03-11

## Summary

S03 is the integration and verification capstone of M005. The core engineering challenge is **not** new feature development — S01 and S02 already delivered the complete backend API (15 functions in `sessions.ts`) and web UI. S03 must solve three problems:

1. **`endSession` doesn't finish participant workouts.** The current `endSession` mutation marks participants as "left" and the session as "completed", but leaves all participants' individual workout records in `inProgress` status. This means the 4 non-fatal hooks in `finishWorkout` (feed item, leaderboard, challenge, badge) never fire for group session workouts. This is the primary integration gap — each participant's workout must be completed via the same hook pipeline that solo workouts use, or group sessions become an island feature disconnected from analytics, PRs, leaderboards, and badges.

2. **Comprehensive verification script.** S03 must produce `verify-m05.ts` (or `verify-s03-m05.ts`) with 15+ checks covering the full session lifecycle including the finishWorkout integration. The existing S01 (12 checks) and S02 (10 checks) verify backend correctness in isolation. S03's script must verify that workout completion during/after a group session correctly triggers feed items, leaderboard entries, challenge progress, and badge evaluation.

3. **Two-browser end-to-end proof.** While the verification script proves backend correctness via `ConvexHttpClient`, the roadmap requires visual proof that two real browser windows show synchronized data. This is a manual UAT exercise, but S03 should ensure the UI has an entry point for creating sessions (currently missing — no "Start Group Session" button exists on `/workouts`).

**Primary recommendation:** Factor `finishWorkout`'s hook logic into a reusable lib function (`finishWorkoutCore`), then call it from both the existing `finishWorkout` mutation and from `endSession`'s participant sweep. Build a `testFinishWorkoutWithAllHooks` test helper. Write a single comprehensive `verify-s03-m05.ts` that extends S01/S02 checks with integration checks. Add a "Start Group Session" button on the workouts page as the final UX entry point.

## Recommendation

**Three-task approach:**

1. **Backend integration (endSession → finishWorkout hooks):** Extract the 4 non-fatal hooks from `finishWorkout` into a shared `lib/finishWorkoutHooks.ts` function, then call it from both `finishWorkout` and `endSession` for each participant's workout. This is the cleanest factoring — avoids duplicating hook logic and ensures identical behavior between solo and group workout completion. Add a `testFinishWorkoutWithAllHooks` test helper.

2. **Comprehensive verification script:** `verify-s03-m05.ts` with 15+ checks covering: (a) S01+S02 regression (session create, join, heartbeat, timer, end — lightweight re-verification), (b) finishWorkout integration (feed item created for session participant, leaderboard entries updated, badge evaluation triggered), (c) edge cases (session with no sets, participant who left before end). This is the bulk of the slice work.

3. **UI polish + entry point:** Add "Start Group Session" button on `/workouts` page. This is the only missing UI piece — the session page, join page, timer, and summary are all built.

**Why this ordering:** Backend integration first because the verification script depends on it. Verification script second because it proves correctness. UI entry point third because it's cosmetic (the session URL works directly — just no button to reach it).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Workout completion hooks (feed, leaderboard, challenge, badge) | `updateLeaderboardEntries`, `updateChallengeProgress`, `evaluateAndAwardBadges` in `convex/lib/` | All 3 are framework-agnostic lib functions accepting `(db, userId, workoutId)`. Feed item creation is inline in `finishWorkout` but follows the same pattern. Extracting to a lib function enables reuse. |
| Multi-user test infrastructure | `testing.ts` with `testUserId` args (92 exported test helpers, ~3625 lines) | Established pattern for all M001-M004 verification. Session helpers already exist (11 helpers from S01+S02). Extend with `testFinishWorkoutWithAllHooks`. |
| Verification script pattern | `verify-s01-m05.ts` (12 checks) + `verify-s02-m05.ts` (10 checks) | Exact template for the comprehensive verification script. Same `ConvexHttpClient` + `check()` + cleanup pattern. |
| Session data attributes | `data-session-page`, `data-session-timer`, `data-session-summary`, `data-session-end-button`, `data-session-participants`, `data-session-sets`, `data-session-invite`, `data-presence-indicator` | All already on UI components from S01/S02. Browser assertions can target these directly. |

## Existing Code and Patterns

### Backend — Direct Modification

- `packages/backend/convex/sessions.ts` (15 functions) — `endSession` needs modification to call finishWorkout hooks for each participant's workout during the session completion sweep. Currently marks participants as "left" but doesn't touch their workout records.

- `packages/backend/convex/workouts.ts` — `finishWorkout` has 4 non-fatal hooks inlined: (1) feed item creation, (2) `updateLeaderboardEntries`, (3) `updateChallengeProgress`, (4) `evaluateAndAwardBadges`. These need to be extracted to a shared function or duplicated (extraction preferred).

- `packages/backend/convex/testing.ts` (3625 lines, 92 exports) — `testFinishWorkout` only runs the feed item hook (doesn't call leaderboard, challenge, or badge hooks). Need a `testFinishWorkoutWithAllHooks` that mirrors production `finishWorkout` exactly. Also need `testGetFeedItemsForUser` or similar to verify feed items were created for session participants.

- `packages/backend/convex/lib/leaderboardCompute.ts` — `updateLeaderboardEntries(db, userId, workoutId)` — pure lib function, already importable. Computes e1RM/volume/reps per exercise and upserts leaderboard entries.

- `packages/backend/convex/lib/challengeCompute.ts` — `updateChallengeProgress(db, userId, workoutId)` — pure lib function, already importable. Incremental delta computation for active challenges.

- `packages/backend/convex/lib/badgeEvaluation.ts` — `evaluateAndAwardBadges(db, userId)` — pure lib function. Batch-fetches 5 aggregate stats, evaluates 15 badge definitions against thresholds.

### Backend — Read-Only Reference

- `packages/backend/convex/crons.ts` — 3 cron entries (challenge deadlines, presence cleanup, session timeouts). No changes needed.

- `packages/backend/convex/schema.ts` — No changes needed. All schema extensions from S01+S02 are in place (groupSessions, sessionParticipants, workouts.sessionId).

- `packages/backend/scripts/verify-s01-m05.ts` — 12-check template. SS-01 through SS-12.

- `packages/backend/scripts/verify-s02-m05.ts` — 10-check template. SS-13 through SS-22.

### Frontend — Modification

- `apps/web/src/app/workouts/page.tsx` — Currently shows only "Workout History" heading + WorkoutHistory component. Needs "Start Group Session" button that calls `createSession` and navigates to `/workouts/session/[id]`.

### Frontend — Read-Only Reference

- `apps/web/src/app/workouts/session/[id]/page.tsx` — Full session page with heartbeat, participant list, set feed, timer, end session button, and summary view. All data-* attributes present. No changes needed unless the finishWorkout integration changes the summary view.

- `apps/web/src/app/session/join/[inviteCode]/page.tsx` — Join page with auth-gated join flow. No changes needed.

- All 4 session components in `apps/web/src/components/session/` — No changes needed.

## Constraints

- **`testFinishWorkout` doesn't run all 4 hooks** — Only creates a feed item. The leaderboard, challenge, and badge hooks are missing from the test helper. A new `testFinishWorkoutWithAllHooks` is needed for verification, OR the verification script must call `testUpdateLeaderboardEntries`, `testEvaluateAndAwardBadges`, etc. separately after `testFinishWorkout`.

- **`endSession` is host-only and runs in the host's auth context** — When modifying `endSession` to finish participant workouts, the mutation runs in the host's Convex context. But each participant's workout belongs to a different userId. The lib functions accept explicit `(db, userId, workoutId)` so this is fine — no auth check inside the lib functions. The `endSession` mutation itself already has host-only auth via `getUserId(ctx)`, and can iterate participants to call hooks on each.

- **`finishWorkout` auth guard** — Production `finishWorkout` uses `getUserId(ctx)` and checks `workout.userId !== userId`. `endSession` cannot call `finishWorkout` as a mutation-within-mutation. Must inline the hook calls or extract to a lib function.

- **Convex 16K document read limit** — `endSession` iterating 10 participants, each calling 4 hooks (feed item creation, leaderboard entry upsert, challenge progress, badge evaluation) could read many documents. Worst case: 10 participants × (workoutExercises + sets + personalRecords + leaderboardEntries + challengeParticipants + challenges + userBadges + profiles). For 10 participants with 5 exercises each, this is ~500 reads just for the workout traversal + ~200 more for hooks. Well within 16K limit.

- **testing.ts file size** — Already 3625 lines. Adding `testFinishWorkoutWithAllHooks` adds ~50-80 lines. Manageable but getting large.

- **Two-browser testing requires live Convex backend** — All verification scripts are pending live execution (blocked on Convex CLI auth). The two-browser test is manual UAT.

- **No "Start Group Session" entry point** — The workouts page has no button to create a session. Users must directly navigate to `/workouts/session/[id]`. S03 should add the entry point.

## Common Pitfalls

- **Forgetting to finish participant workouts on endSession** — The current `endSession` marks session status as "completed" and participants as "left", but participant workout records remain `inProgress` forever. This means their sets never appear in workout history (only inProgress workouts show), feed items never created, leaderboard never updated. **Fix:** `endSession` must call the finishWorkout hook pipeline for each participant's workout, transitioning it from `inProgress` to `completed`.

- **Double-finishing a workout** — If a participant manually finishes their workout before the host ends the session (e.g., via the normal `/workouts/active` UI), then `endSession`'s participant sweep would try to finish an already-completed workout. **Fix:** Check `workout.status !== "inProgress"` before attempting to complete. Skip silently (idempotent pattern).

- **Session-scoped workouts appearing in normal workout list** — When a participant finishes a group session workout, it should appear in their workout history like any solo workout. The `listWorkouts` query already returns all completed workouts by userId — no filter on `sessionId`. The workout name "Group Session" distinguishes it. No change needed.

- **Feed item for group workout might confuse viewers** — A completed group session workout creates a `workout_completed` feed item per participant. The feed shows "Alice completed Group Session (45m, 5 exercises)". This is the correct behavior — each participant's individual workout record IS a completed workout. The feed doesn't know it was a group session. Acceptable for MVP.

- **Verification script user cleanup race conditions** — Running S01, S02, and S03 verification scripts concurrently could cause test user collisions. **Fix:** Use unique test user IDs per script (e.g., `test-s03-host`, `test-s03-joiner`).

- **Badge evaluation cost in endSession** — For 10 participants, evaluating badges means 10 calls to `evaluateAndAwardBadges`, each reading ~5-6 indexes. This is ~60 reads for badge evaluation alone. Acceptable within Convex limits but should be non-fatal (try/catch) per participant.

## Open Risks

- **`endSession` becoming a "mega mutation"** — If `endSession` finishes 10 participant workouts with all 4 hooks each, the single mutation reads many documents. For 10 participants × (workout + workoutExercises + sets + PR check + leaderboard upsert + challenge update + badge evaluation + feed item + profile lookup) = potentially 1000+ reads. This is within the 16K limit but makes the mutation slow. **Mitigation:** Non-fatal try/catch per participant per hook. If one participant's hook fails, others still process. Worst case: session completes but some hooks missed (self-healing on next solo workout for badges).

- **Auto-timeout completing workouts without hooks** — `checkSessionTimeouts` currently auto-completes sessions by patching status to "completed" but does NOT finish participant workouts or run hooks. If S03 modifies `endSession` to run hooks, `checkSessionTimeouts` should also finish participant workouts — or at least mark them as completed without hooks (acceptable for abandoned sessions where users aren't actively training).

- **Two-browser testing blocked by Convex CLI auth** — The final integrated acceptance (two real browser windows) requires a running Convex backend with authenticated users. This has been blocked since M003. The verification script proves backend correctness but doesn't prove realtime subscription delivery.

- **Stale participant workouts after session timeout** — If a session auto-times-out, participant workouts remain `inProgress` unless the timeout code also finishes them. An orphaned `inProgress` workout would prevent the user from starting a new workout (D018 conflict). **Fix:** `checkSessionTimeouts` must also complete participant workouts when auto-completing a session.

## Proposed Integration Approach

### Option A: Extract `finishWorkoutCore` lib function (Recommended)

Create `packages/backend/convex/lib/finishWorkoutCore.ts`:

```typescript
export async function finishWorkoutCore(
  db: DatabaseWriter,
  userId: string,
  workoutId: Id<"workouts">,
): Promise<{ completedAt: number; durationSeconds: number }> {
  // Same logic as finishWorkout minus auth check
  // 1. Patch workout to completed
  // 2. Non-fatal: create feed item
  // 3. Non-fatal: updateLeaderboardEntries
  // 4. Non-fatal: updateChallengeProgress
  // 5. Non-fatal: evaluateAndAwardBadges
}
```

Then refactor `finishWorkout` in `workouts.ts` to: auth check → call `finishWorkoutCore`.
And modify `endSession` to: mark session completed → for each participant → call `finishWorkoutCore`.

**Pros:** Single source of truth for workout completion. No hook duplication.
**Cons:** Touches `workouts.ts` (refactoring, not adding new code). Must be careful not to break existing `finishWorkout` behavior.

### Option B: Inline hooks in endSession (Simpler, more duplication)

Directly import the 3 lib functions + inline feed item creation in `endSession`, wrapped in per-participant try/catch. Don't touch `workouts.ts`.

**Pros:** Fewer files touched. No refactoring risk.
**Cons:** Duplicated feed item creation logic. If hooks change in `finishWorkout`, `endSession` must be updated too.

### Recommendation: Option A

The factoring cost is small (extract ~50 lines of post-auth logic into a lib function). The benefit is significant — guaranteed identical behavior for solo and group workout completion, and a reusable function for `checkSessionTimeouts` too.

## Verification Checks (Proposed)

S03 verification script (`verify-s03-m05.ts`) with 15+ checks:

### Integration checks (new — S03 core):
- **SS-23:** After endSession, each participant's workout status is "completed" with durationSeconds
- **SS-24:** After endSession, feed items exist for each participant
- **SS-25:** After endSession, leaderboard entries exist for participant exercises
- **SS-26:** After endSession, badge evaluation ran (at least `first_workout` badge awarded if threshold met)
- **SS-27:** Participant who left before endSession has their workout completed correctly
- **SS-28:** endSession is idempotent — second call doesn't re-run hooks (no duplicate feed items)
- **SS-29:** Auto-timeout (checkSessionTimeouts) also completes participant workouts

### Cross-session regression checks:
- **SS-30:** Session create + join + heartbeat + set log (lightweight S01 regression)
- **SS-31:** Timer start + pause + end session (lightweight S02 regression)
- **SS-32:** Session summary reflects correct per-participant stats after endSession with workout completion

### Edge cases:
- **SS-33:** Session with participant who has no exercises/sets — workout still completed cleanly
- **SS-34:** Session workout appears in participant's listWorkouts after completion
- **SS-35:** Session workout's sessionId foreign key intact after completion

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `waynesutton/convexskills@convex` (4.6K installs) | available — relevant for mutation patterns |
| Convex Best Practices | `waynesutton/convexskills@convex-best-practices` (2K installs) | available — relevant for lib function extraction |
| Convex Cron Jobs | `waynesutton/convexskills@convex-cron-jobs` (1.2K installs) | available — existing crons unchanged |
| Convex Realtime | `waynesutton/convexskills@convex-realtime` (1.3K installs) | available — not needed for S03 |

**Note:** Skills not installed. The codebase already has well-established Convex patterns from M001-M004. The existing code is the best reference for S03's integration work.

## Sources

- `endSession` currently doesn't call `finishWorkout` or any hooks — confirmed by reading `sessions.ts:407-456` (source: codebase inspection)
- `testFinishWorkout` only runs feed item hook, not leaderboard/challenge/badge — confirmed by reading `testing.ts:56-115` (source: codebase inspection)
- All 4 hook functions are importable lib functions: `updateLeaderboardEntries(db, userId, workoutId)`, `updateChallengeProgress(db, userId, workoutId)`, `evaluateAndAwardBadges(db, userId)` — confirmed by reading respective lib files (source: codebase inspection)
- No "Start Group Session" button exists on `/workouts` page — confirmed by reading `apps/web/src/app/workouts/page.tsx` (source: codebase inspection)
- TypeScript currently compiles with 0 errors on backend and web packages (source: `pnpm -C packages/backend exec tsc --noEmit` and `pnpm -C apps/web exec tsc --noEmit`)
- Convex 16K document read limit per mutation constrains hook fan-out in endSession (source: [Convex Limits](https://docs.convex.dev))
- `checkSessionTimeouts` auto-completes sessions but does NOT finish participant workouts — confirmed by reading `sessions.ts:515-587` (source: codebase inspection)
