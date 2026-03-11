# M004: Leaderboards & Challenges

**Vision:** Transform the workout tracker from a personal logging tool into a competitive platform — users see how they stack up on leaderboards, compete in time-limited challenges with friends, and earn badges that display on their profiles.

## Success Criteria

- A user opts in to leaderboards, logs a bench press set, and their ranking appears on the Bench Press 1RM leaderboard alongside other users — viewable on both web and mobile
- A user creates a "Most Pull-ups This Week" challenge, 3 friends join, they each log pull-up sets during the week, and the live standings update correctly showing who's winning
- A challenge reaches its deadline, the scheduled function fires, and the winner is determined correctly with the challenge marked as completed
- A user completes their 10th workout and a "Dedicated Lifter" badge appears on their profile immediately — visible to anyone viewing that profile
- A user who has NOT opted in to leaderboards does not appear in any leaderboard ranking
- Leaderboard rankings remain correct after new workouts are logged (pre-computed entries update on workout completion)
- All competitive features work on both web and mobile, consuming the same Convex backend

## Key Risks / Unknowns

- **Pre-computed leaderboard update cost on finishWorkout** — Adding leaderboard entry upserts to the already-loaded `finishWorkout` mutation (which already creates feed items) could degrade the workout completion hot path. Must remain non-fatal and bounded.
- **Convex cron jobs (first use in project)** — `crons.ts` is new infrastructure. Challenge deadline enforcement depends on it working correctly. Cron-triggered functions can't be directly unit-tested — only the functions they call can be.
- **Top-N indexed queries at scale** — The `.withIndex(...).order("desc").take(N)` pattern for leaderboard queries is documented but unproven in this codebase. Must verify correct index design and query performance.
- **Challenge metric accumulation across many sets** — "Total reps" or "total volume" challenges require traversing all sets logged during the challenge period per participant. Could hit Convex document read limits for long challenges.

## Proof Strategy

- **Leaderboard update cost** → retire in S01 by building the real leaderboard with `finishWorkout` hooks and verifying that workout completion still succeeds when leaderboard upsert is added (non-fatal pattern from D052)
- **Cron jobs** → retire in S02 by creating real `crons.ts` with challenge deadline enforcement and verifying the scheduled completion function works correctly via test helpers
- **Top-N indexed queries** → retire in S01 by building real leaderboard queries with composite indexes and verifying correct ranking across 5+ test users
- **Challenge metric accumulation** → retire in S02 by testing challenge standings with multiple participants logging multiple sets during a challenge period

## Verification Classes

- Contract verification: ConvexHttpClient verification scripts (extending D017/D079 test helper pattern) proving leaderboard rankings, challenge lifecycle, and badge awards via internal mutations/queries
- Integration verification: `finishWorkout` → leaderboard entry update → leaderboard query returns updated ranking (real mutation chain). Challenge join → log sets → standings update → deadline completion (real lifecycle). Set logging → badge evaluation → badge appears on profile query (real trigger chain).
- Operational verification: Convex cron job definition in `crons.ts` for periodic leaderboard recalculation and challenge deadline checks. `ctx.scheduler.runAt` for one-off challenge completion scheduling.
- UAT / human verification: Leaderboard UI on web and mobile showing correct rankings with opt-in filtering. Challenge creation/join/standings flow on web and mobile. Badge display on profile pages. Mobile 6→7+ tab navigation or grouping assessment.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices complete with verification scripts passing
- Leaderboard entries pre-computed correctly from workout data, queryable with correct top-N ranking across 5+ test users
- Challenge lifecycle (create → join → active → complete) proven end-to-end with winner determination
- Badge evaluation triggers on workout completion and awards display on profile
- Opt-in filtering proven: non-opted-in users excluded from all leaderboard views
- `finishWorkout` mutation still succeeds even if leaderboard/badge hooks fail (non-fatal pattern)
- `crons.ts` exists with challenge deadline enforcement and periodic leaderboard recalculation
- TypeScript compiles 0 new errors across all 3 packages
- Web UI delivers leaderboard page, challenge page, and badge display on profiles
- Mobile UI delivers all competitive features consuming the same Convex backend
- Final integrated acceptance scenarios pass (leaderboard ranking, challenge lifecycle, badge award)

## Requirement Coverage

- Covers: R018 (Leaderboards), R019 (Group Challenges), R020 (Achievements and Badges)
- Partially covers: R011 (Cross-Platform UI — extended with competitive feature mobile port in S04)
- Leaves for later: none
- Orphan risks: none — all 3 active requirements mapped to primary owning slices

## Slices

- [x] **S01: Leaderboards — Backend + Web UI** `risk:high` `depends:[]`
  > After this: A user visits the Leaderboards page on web, sees top-10 rankings for Bench Press 1RM across multiple users, filters by exercise and time period, and their own rank is displayed — all backed by pre-computed leaderboard entries updated on workout completion.

- [ ] **S02: Group Challenges — Backend + Web UI** `risk:high` `depends:[S01]`
  > After this: A user creates a "Most Pull-ups This Week" challenge on web, friends join via the challenges page, logging pull-up sets updates the live standings, and a scheduled function completes the challenge at deadline with the correct winner — the project's first use of Convex cron jobs and ctx.scheduler.runAt.

- [ ] **S03: Achievements & Badges — Backend + Web UI** `risk:medium` `depends:[S01]`
  > After this: A user completes their 10th workout and a "Dedicated Lifter" badge appears on their profile page immediately — with ~15 hardcoded badge definitions evaluated server-side on workout completion, and a badges section visible on any user's profile.

- [ ] **S04: Mobile Competitive Port** `risk:low` `depends:[S01,S02,S03]`
  > After this: All leaderboard, challenge, and badge features work on mobile with native UI components — leaderboard screen with exercise/period pickers, challenge creation and standings screens, badge display on profile — consuming the same Convex backend with zero backend changes.

## Boundary Map

### S01 → S02

Produces:
- `leaderboardEntries` table with `by_exerciseId_metric_period_value` index for top-N queries and `by_userId` index for "my entries"
- `leaderboardOptIn` field on `profiles` table — boolean, default false
- `updateLeaderboardEntries(db, userId, workoutId)` internal helper called from `finishWorkout` (non-fatal) that computes e1RM/volume/reps metrics and upserts leaderboard entries
- `getLeaderboard` query returning ranked entries filtered by exercise, metric, period, with opt-in enforcement
- `getMyRank` query returning the caller's position on a specific leaderboard
- Pre-computed value pattern: challenge standings in S02 reuse the same "upsert entry with indexed score" approach
- Leaderboard test helpers in `testing.ts` (`testSetLeaderboardOptIn`, `testGetLeaderboard`, etc.)
- Verification script `verify-s01-m04.ts` proving ranking correctness

### S02 → S03

Produces:
- `challenges` table with status state machine (pending → active → completed → cancelled)
- `challengeParticipants` table with `by_challengeId_currentValue` index for standings
- `crons.ts` with scheduled challenge lifecycle management
- `completeChallenge` internal mutation for deadline enforcement (idempotent)
- Challenge test helpers in `testing.ts` (`testCreateChallenge`, `testJoinChallenge`, `testLogChallengeProgress`, etc.)
- Verification script `verify-s02-m04.ts` proving lifecycle correctness
- S03 can hook badge evaluation into challenge completion (e.g., "Complete 5 challenges" badge)

### S01 → S03

Produces:
- `finishWorkout` non-fatal hook pattern — S03 adds badge evaluation as another non-fatal try/catch block in the same mutation, following the established leaderboard hook from S01
- Profile integration surface — S03 adds badge display to the existing profile page that S01 already modified (leaderboard opt-in toggle)

### S03 → S04

Produces:
- All Convex queries/mutations for leaderboards, challenges, and badges — mobile consumes the same API
- Web UI patterns and data attribute conventions — mobile mirrors the same UX flows
- Badge definitions constant (`BADGE_DEFINITIONS`) — shared TypeScript object used by both backend evaluation and UI display

### S01+S02+S03 → S04

Consumes:
- `getLeaderboard`, `getMyRank` queries for leaderboard screens
- `createChallenge`, `joinChallenge`, `getChallengeStandings`, `listChallenges` for challenge screens
- `getUserBadges` query for profile badge display
- `leaderboardOptIn` field on profiles for settings toggle
- All verification scripts from S01-S03 as regression baseline
