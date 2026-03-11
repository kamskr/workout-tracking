# S02: Follow System & Activity Feed

**Goal:** Users can follow/unfollow other users, see a realtime paginated activity feed of followed users' completed workouts, react to feed items, and block/report users — all proven by backend verification script and browser-testable web UI.
**Demo:** User A follows User B from their profile page. User B completes a workout. User A navigates to `/feed` and sees User B's workout in a realtime activity feed. User A reacts with a fire emoji — the count updates live. User A blocks User C — User C's content disappears from A's feed. Feed is paginated with "Load More".

## Must-Haves

- 5 new tables in Convex schema: `follows`, `feedItems`, `reactions`, `blocks`, `reports`
- `followUser` / `unfollowUser` mutations with self-follow rejection and duplicate idempotency
- `getFeed` paginated query (fan-out-on-read from `feedItems`, post-filter for followed users, block exclusion)
- Feed item auto-creation in `finishWorkout` (non-fatal try/catch) and `testFinishWorkout`
- `addReaction` / `removeReaction` mutations with type validation (fire, fistBump, clap, strongArm, trophy)
- `blockUser` / `unblockUser` / `reportContent` mutations (block cascades: removes follow relationships)
- Feed item cascade-delete when workout is deleted (+ associated reactions)
- ~12 test helpers in `testing.ts` for multi-user social scenarios
- `testCleanup` extended to delete follows, feedItems, reactions, blocks, reports
- Verification script (`verify-s02-m03.ts`) with ~15 checks proving follow/unfollow, feed creation, reactions, block filtering, pagination, cascade delete
- `/feed` web page with `usePaginatedQuery`, reaction buttons, empty state, "Load More"
- Follow/unfollow button on `/profile/[username]` page (non-own profiles)
- User search for follow discovery (reuses `searchProfiles`)
- `/feed(.*)` added to Clerk middleware protected routes
- "Feed" link added to app navigation
- Data attributes: `data-feed-page`, `data-feed-item`, `data-reaction-bar`, `data-follow-button`

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (Convex backend via ConvexHttpClient for verification script; dev server for UI)
- Human/UAT required: yes (visual quality of feed layout, reaction interaction feel, realtime update latency)

## Verification

- `npx tsx packages/backend/scripts/verify-s02-m03.ts` — 15 checks covering follow/unfollow cycle, feed item creation on workout completion, feed query returns followed users' items, reactions add/remove with counts, block filtering, pagination with 50+ items, cascade delete, self-follow rejection, duplicate follow idempotency
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors (pre-existing `clsx` only)
- Browser assertion: `/feed` page renders with `data-feed-page` attribute, feed items have `data-feed-item`, reaction bars have `data-reaction-bar`
- Browser assertion: `/profile/[username]` shows `data-follow-button` for non-own profiles
- Diagnostic check: `finishWorkout` feed item creation is non-fatal — workout completion succeeds even if feed item insertion were to fail (proven by try/catch in code review)

## Observability / Diagnostics

- Runtime signals: `[Feed Item] Error creating feed item for workout {id}` console.error in `finishWorkout` on non-fatal failure; `[Block] Removed follow relationships between {blockerId} and {blockedId}` console.log on block cascade; stable error messages in social mutations ("Cannot follow yourself", "User not found", "Already blocked")
- Inspection surfaces: `testGetFollowStatus`, `testGetFollowCounts`, `testGetFeed`, `testGetReactionsForFeedItem` test helpers queryable via ConvexHttpClient for programmatic state inspection; `data-feed-item` / `data-reaction-bar` / `data-follow-button` data attributes for browser assertions
- Failure visibility: Feed item creation failure logged with workout ID and error message; block cascade logs relationship removal; all social mutations throw descriptive errors on invalid input
- Redaction constraints: none — no secrets or PII in social data (userId is Clerk subject string, already public in auth context)

## Integration Closure

- Upstream surfaces consumed: S01 `profiles` table for author display info on feed items; S01 `getProfile`/`getProfileByUsername` queries for profile resolution; S01 `searchProfiles` for user discovery; S01 `testCreateProfile` / `testCleanup` test helpers; existing `workouts.ts` `finishWorkout` and `deleteWorkout` mutations; existing `testing.ts` `testFinishWorkout` and `testDeleteWorkout`; Convex `paginationOptsValidator` and `usePaginatedQuery` for feed pagination
- New wiring introduced in this slice: `social.ts` Convex module (follows, feed, reactions, blocks, reports functions); feed item creation injected into `finishWorkout` and `testFinishWorkout`; cascade delete of feedItems/reactions added to `deleteWorkout` and `testDeleteWorkout`; `/feed` Next.js route; follow/unfollow UI on profile page; `/feed(.*)` middleware protection; navigation link to Feed
- What remains before the milestone is truly usable end-to-end: S03 (privacy toggle, workout sharing, public share links, clone-as-template), S04 (mobile port of social features)

## Tasks

- [x] **T01: Add social tables to schema, create social.ts with all Convex functions, inject feed item creation into finishWorkout/deleteWorkout** `est:50m`
  - Why: Everything in S02 depends on the backend contract — 5 new tables, ~15 Convex functions, and the cross-cutting mutations that wire feed items into the workout lifecycle
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/social.ts`, `packages/backend/convex/workouts.ts`, `packages/backend/convex/_generated/api.d.ts`
  - Do: Add `follows`, `feedItems`, `reactions`, `blocks`, `reports` tables with indexes per S02-RESEARCH schema. Create `social.ts` with `followUser`, `unfollowUser`, `getFollowStatus`, `getFollowCounts`, `getFeed` (paginated), `addReaction`, `removeReaction`, `getReactionsForFeedItem`, `blockUser`, `unblockUser`, `reportContent`. Modify `finishWorkout` to insert feedItems row (non-fatal try/catch). Modify `deleteWorkout` to cascade-delete feedItems and their reactions. Update `_generated/api.d.ts` to include social module.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
  - Done when: All 5 tables defined, all ~11 social functions compile, finishWorkout creates feed items, deleteWorkout cascade-deletes feed items and reactions, backend typecheck passes

- [x] **T02: Add social test helpers to testing.ts and write verification script** `est:40m`
  - Why: Test helpers enable multi-user verification scenarios. The verification script is the authoritative proof that the follow system, feed, reactions, block filtering, and pagination all work correctly at the backend contract level.
  - Files: `packages/backend/convex/testing.ts`, `packages/backend/scripts/verify-s02-m03.ts`
  - Do: Add ~12 test helpers to `testing.ts` (`testFollowUser`, `testUnfollowUser`, `testGetFollowStatus`, `testGetFollowCounts`, `testGetFeed`, `testCreateFeedItem`, `testAddReaction`, `testRemoveReaction`, `testGetReactionsForFeedItem`, `testBlockUser`, `testUnblockUser`, `testReportContent`). Update `testFinishWorkout` to insert feed items (mirror production `finishWorkout`). Update `testDeleteWorkout` to cascade-delete feed items and reactions. Extend `testCleanup` to delete follows, feedItems, reactions, blocks, reports. Write `verify-s02-m03.ts` with 15 checks (F-01 through F-15) using 3 test users.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors; `npx tsx packages/backend/scripts/verify-s02-m03.ts` — 15/15 checks pass (when Convex CLI auth available)
  - Done when: All test helpers compile, testCleanup covers all social tables, testFinishWorkout creates feed items, verification script has 15 checks with 3 test users and proper entry/exit cleanup

- [x] **T03: Build /feed page, add follow/unfollow to profile page, wire navigation** `est:40m`
  - Why: The web UI is the user-facing proof that the backend contract works end-to-end — feed subscription, reactions, follow/unfollow, and user discovery all exercised through real components
  - Files: `apps/web/src/app/feed/page.tsx`, `apps/web/src/components/feed/FeedItem.tsx`, `apps/web/src/components/feed/ReactionBar.tsx`, `apps/web/src/app/profile/[username]/page.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/components/Header.tsx`
  - Do: Create `/feed` page using `usePaginatedQuery(api.social.getFeed)` with "Load More" button and empty state. Build `FeedItem` component showing author avatar/name, workout summary, timestamp, reaction bar. Build `ReactionBar` with 5 emoji buttons (🔥 fire, 🤜 fistBump, 👏 clap, 💪 strongArm, 🏆 trophy) showing counts and toggle state. Add follow/unfollow button to profile page (non-own profiles) with follower/following counts. Add user search section on feed page for discovering users to follow. Add `/feed(.*)` to middleware protected routes. Add "Feed" link to Header navigation for authenticated users. All components use data attributes per D057/D082 pattern.
  - Verify: `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors; browser: `/feed` renders `data-feed-page`, profile shows `data-follow-button`
  - Done when: Feed page renders with pagination, reaction buttons show counts and toggle, follow/unfollow works on profile pages, navigation includes Feed link, all data attributes present, web typecheck passes

## Files Likely Touched

- `packages/backend/convex/schema.ts` — 5 new tables (follows, feedItems, reactions, blocks, reports)
- `packages/backend/convex/social.ts` — New: ~11 Convex functions for follow/feed/reactions/blocks
- `packages/backend/convex/workouts.ts` — Feed item creation in finishWorkout, cascade delete in deleteWorkout
- `packages/backend/convex/testing.ts` — ~12 social test helpers, testFinishWorkout feed injection, testCleanup extension
- `packages/backend/convex/_generated/api.d.ts` — Add social module
- `packages/backend/scripts/verify-s02-m03.ts` — New: 15-check verification script
- `apps/web/src/app/feed/page.tsx` — New: feed page with usePaginatedQuery
- `apps/web/src/components/feed/FeedItem.tsx` — New: feed item component
- `apps/web/src/components/feed/ReactionBar.tsx` — New: reaction bar component
- `apps/web/src/app/profile/[username]/page.tsx` — Add follow/unfollow button, follower/following counts
- `apps/web/src/middleware.ts` — Add /feed(..) to protected routes
- `apps/web/src/components/Header.tsx` — Add Feed navigation link
