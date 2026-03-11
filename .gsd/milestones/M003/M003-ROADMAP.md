# M003: Social Foundation

**Vision:** Transform the workout app from a personal tool into a community — user profiles, follow system, realtime activity feed with reactions, and workout sharing with cloneable templates.

## Success Criteria

- User A views User B's public profile showing display name, avatar, bio, and workout stats (total workouts, streak, volume)
- User A follows User B. User B completes a workout. User A sees it in their feed within seconds via Convex subscription
- User A reacts to User B's workout (fire/fist bump/etc). User B sees the reaction update in realtime
- User B shares a workout via public link. An unauthenticated user can view the summary. An authenticated user can clone it as a personal template
- User marks a workout as private — it does NOT appear in any feed, any profile view, or any public share link
- User blocks another user — blocked user's content is hidden from the blocker's feed and the blocked user cannot view the blocker's profile
- Feed remains performant with 50+ followed users posting regularly (paginated, indexed queries)

## Key Risks / Unknowns

- **Feed query performance with realtime subscriptions** — Cross-user fan-out-on-read through Convex reactive queries could cause excessive recomputation. Research recommends a hybrid `feedItems` denormalization table, but this needs to be proven with real data.
- **Privacy model correctness** — Every existing query is single-user-scoped. Social features introduce cross-user reads for the first time. A privacy leak (showing private workouts in feeds or public profiles) would erode trust. Needs explicit access control on every new public-facing query.
- **Username uniqueness and profile creation race** — Multiple tabs/devices could create duplicate profiles. Need atomic create-or-get with case-insensitive uniqueness.
- **Public unauthenticated access** — All existing Convex queries use `getUserId()`. Share pages must work without auth — a new pattern for this codebase.

## Proof Strategy

- **Feed performance** → retire in S02 by building the real feed with `feedItems` denormalization, paginated queries, and a verification script that creates 50+ feed items from multiple users and proves the feed query returns correct, paginated results within Convex limits
- **Privacy correctness** → retire in S03 by adding `isPublic` flag on workouts, writing a verification script that proves private workouts are excluded from feed items, public profiles, and share queries
- **Public unauthenticated access** → retire in S03 by building the real `/shared/[id]` route with a public Convex query (no `getUserId()` check) and verifying it resolves for unauthenticated users

## Verification Classes

- Contract verification: Multi-user backend verification scripts (ConvexHttpClient with test helpers) proving profile CRUD, follow/unfollow, feed item creation, reaction persistence, privacy gating, share/clone flows, block filtering
- Integration verification: Web UI exercised in browser — profile creation flow, feed subscription, reaction click, share link resolution, clone-as-template
- Operational verification: Feed pagination under load (50+ items), realtime subscription latency (feed item appears within seconds of workout completion)
- UAT / human verification: Mobile social UI (Feed tab, Profile tab) — layout, navigation, interaction quality

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 4 slices are complete with verification scripts passing
- Profile → follow → feed → reaction → share → clone pipeline works end-to-end through the real web UI
- Privacy controls proven: private workouts excluded from all social surfaces
- Public share links work for unauthenticated users (no Clerk session required)
- Block/report mutations exist and block filtering is enforced in feed queries
- TypeScript compiles 0 errors across all 3 packages
- All M001 + M002 regression checks still pass (72/72 + new M003 checks)
- Mobile social features (Feed tab, Profile tab) ported with same backend queries
- Final integrated acceptance scenarios from M003-CONTEXT pass

## Requirement Coverage

- Covers: R015 (User Profiles → S01), R016 (Follow System and Activity Feed → S02), R017 (Workout Sharing → S03)
- Partially covers: R011 (Cross-Platform UI → S04 extends mobile to social features)
- Leaves for later: R018 (Leaderboards → M004), R019 (Group Challenges → M004), R020 (Achievements → M004), R021 (Collaborative Workouts → M005), R025 (Community Exercise Library → deferred)
- Orphan risks: none — all Active requirements relevant to M003 are mapped

## Slices

- [x] **S01: User Profiles** `risk:high` `depends:[]`
  > After this: A user visiting the app for the first time sees a profile creation flow (choose username, set bio). Their profile page at `/profile/[username]` displays name, avatar, bio, and workout stats (total workouts, volume). Other authenticated users can view the profile. Proven by backend verification script (profile CRUD, username uniqueness, stats computation) and browser walkthrough of profile creation + view.

- [x] **S02: Follow System & Activity Feed** `risk:high` `depends:[S01]`
  > After this: User A can search for and follow User B from their profile page. User B completes a workout and a feed item appears in User A's realtime activity feed at `/feed`. User A can react to the feed item (fire, fist bump, etc) and the reaction count updates live. Feed is paginated. Proven by backend verification script (follow/unfollow, feed item creation on workout completion, reactions, pagination, block filtering) and browser walkthrough of follow → feed → react flow.

- [x] **S03: Workout Sharing & Privacy** `risk:medium` `depends:[S01, S02]`
  > After this: User can toggle a workout as public/private. Public workouts can be shared to the feed or via a public link (`/shared/[id]`). An unauthenticated visitor can view the shared workout summary. An authenticated user can clone the shared workout as a personal template. Private workouts are excluded from all social surfaces. Proven by backend verification script (privacy gating, share link resolution without auth, clone-as-template, private workout exclusion from feed/profile) and browser walkthrough of share flow + public link + clone.

- [x] **S04: Mobile Social Port** `risk:low` `depends:[S01, S02, S03]`
  > After this: All social features work on mobile — Profile tab (view/edit own profile, view others), Feed tab (realtime feed with reactions), share/clone UI, follow/unfollow. Same Convex backend queries, no backend changes. Mobile navigation updated (Profile tab replaces or consolidates Settings, Feed tab added). Proven by TypeScript compilation across all packages, all M003 backend verification scripts still passing, and visual verification in Expo.

## Boundary Map

### S01 → S02

Produces:
- `profiles` table with `userId` (string, indexed), `username` (string, unique indexed, lowercase), `displayName`, `bio`, `avatarStorageId`, `isPublic` fields
- `getProfile` / `getProfileByUsername` public queries (work with or without auth)
- `createProfile` / `updateProfile` mutations with username uniqueness enforcement
- `getProfileStats` query returning `{ totalWorkouts, currentStreak, totalVolume, topExercises }`
- `searchProfiles` query using Convex search index on `displayName`
- Profile creation flow UI on web (`/profile/setup`)
- Profile view page at `/profile/[username]`
- Test helpers: `testCreateProfile`, `testGetProfile`

Consumes:
- Existing `getUserId()` auth pattern from `convex/lib/auth.ts`
- Existing analytics computation pattern from `convex/analytics.ts` (for profile stats)
- Clerk `getUserIdentity()` for seeding initial name/avatar

### S02 consumes S01, produces for S03

Produces:
- `follows` table with `followerId`/`followingId` (strings, indexed), unique pair index
- `feedItems` table with `authorId`, `type`, `workoutId`, `summary` (denormalized snapshot), `isPublic`, `createdAt` — indexed by `authorId_createdAt` and `workoutId`
- `reactions` table with `feedItemId`, `userId`, `type`, `createdAt` — indexed by `feedItemId` and unique `feedItemId_userId_type`
- `blocks` table with `blockerId`/`blockedId` (strings, indexed)
- `reports` table with `reporterId`, `targetType`, `targetId`, `reason`, `createdAt`
- `followUser` / `unfollowUser` mutations
- `getFeed` paginated query (fan-out-on-read from `feedItems` of followed users, excludes blocked)
- `addReaction` / `removeReaction` mutations
- `blockUser` / `reportContent` mutations
- Feed item auto-creation in `finishWorkout` mutation (inserts `feedItems` row for completed workouts)
- Feed UI at `/feed` with realtime subscription, pagination, reaction buttons
- Follow/unfollow UI on profile pages
- Test helpers: `testFollowUser`, `testCreateFeedItem`, `testAddReaction`, `testBlockUser`

Consumes:
- S01 `profiles` table for author display info on feed items
- S01 `searchProfiles` for user discovery

### S03 consumes S01 + S02, produces for S04

Produces:
- `isPublic` field on `workouts` table (`v.optional(v.boolean())`, default true via app logic)
- `shareWorkout` mutation (creates feed item of type `workout_shared` + generates share token)
- `getSharedWorkout` public query (no auth required, fetches workout + exercises + sets for public workouts)
- `cloneSharedWorkoutAsTemplate` mutation (reuses `saveAsTemplate` pattern from `templates.ts`)
- Privacy enforcement: `finishWorkout` feed item creation respects `isPublic`, feed queries filter by `isPublic`, profile stats exclude private workouts
- `/shared/[id]` Next.js route (public, not in Clerk middleware) rendering workout summary with clone button
- Privacy toggle UI on workout creation/detail
- Share button on completed workouts (feed share + copy link)
- Clone button on shared workout view
- Test helpers: `testShareWorkout`, `testGetSharedWorkout`, `testCloneAsTemplate`

Consumes:
- S01 profile data for author info on shared workout page
- S02 `feedItems` table for share-to-feed flow
- S02 block filtering (blocked users can't view shared workouts from blocker)
- Existing `templates.ts` `saveAsTemplate` pattern for clone flow

### S04 consumes S01 + S02 + S03

Produces:
- Mobile Profile tab (view/edit own, view others, stats, follow/unfollow)
- Mobile Feed tab (paginated feed, reactions, realtime updates)
- Mobile share/clone UI
- Mobile privacy toggle
- Updated `MainTabs.tsx` navigation (Profile replaces Settings with settings nested inside, Feed tab added — 6 tabs total or 5 with consolidation)

Consumes:
- All S01/S02/S03 Convex queries and mutations (no backend changes)
- S01 profile pages pattern
- S02 feed/reaction pattern
- S03 share/clone/privacy pattern
