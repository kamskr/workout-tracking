# M003: Social Foundation — Research

**Date:** 2026-03-11

## Summary

M003 adds social features (profiles, follow, feed, reactions, sharing) to a well-structured Convex + Clerk + Turborepo workout app. The existing codebase has a clean 9-table normalized schema, consistent auth pattern via `getUserId()` (Clerk subject → string), established test helper pattern via `testing.ts`, and a proven web-first + mobile-port slice strategy (D050). The social layer introduces two fundamentally new concerns: **cross-user data access** (every existing query is single-user-scoped) and **public/unauthenticated access** (shared workout links for non-users).

The primary recommendation is **fan-out-on-read** for the activity feed. Convex's reactive subscriptions make fan-out-on-write (pre-materializing each user's feed) unnecessary at the scale this app targets (<100 followed users, <50 workouts/day in feed). A simple query that collects recent workouts from followed users, with a `by_userId_completedAt` index (already exists), will work and stay correct under Convex's transactional model. Profile data should live in a Convex `profiles` table (not just Clerk metadata) to support custom bios, privacy settings, and stats — seeded on first login from Clerk identity. Avatar storage should use Convex file storage (upload URL → storage ID → serve URL) to keep the entire data layer in one system. Public share links should use standard Next.js routes with Convex public queries (no auth check), **not** HTTP actions — this avoids adding an HTTP router and keeps the page SSR-friendly.

The riskiest slice is the **follow system + feed** — it touches the most new tables, introduces cross-user reads, and the feed query needs realtime performance validation. Ship this first. Profiles are a prerequisite but lower risk. Sharing/cloning builds on existing template infrastructure (R006) and can slot in last.

## Recommendation

1. **S01: User Profiles** — New `profiles` table, create-on-first-visit mutation (seed from Clerk identity), profile edit UI, public profile view page. Low risk, but gates everything else.
2. **S02: Follow System + Activity Feed** — `follows` table, follow/unfollow mutations, fan-out-on-read feed query, `feedItems` table for denormalized feed entries (workout completed → insert feed item), reactions table, realtime feed UI on web. Highest risk — prove feed query performance early.
3. **S03: Workout Sharing** — Privacy flag on workouts, share-to-feed mutation, public share link route (unauthenticated Convex query), clone-as-template mutation, share UI on web.
4. **S04: Mobile Social Port** — Port all social features to Expo (Profile tab, Feed tab, share/reaction UI). Mirrors M001/S06 and M002/S04 pattern.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Avatar image upload + serving | Convex File Storage (`ctx.storage.store()`, `ctx.storage.getUrl()`) | Already integrated in the platform. Generates upload URLs, stores blobs, serves via CDN. No need for S3/Cloudinary. |
| User search for follow discovery | Convex search index (`.searchIndex()` on profiles table) | Already used for exercise search (`search_name` on exercises table). Same pattern. |
| Public workout share page (unauthenticated) | Convex public query (query without `getUserId()` check) + Next.js dynamic route | Convex queries are public by default — auth is opt-in. Just don't call `getUserId()` in the share query. No HTTP router needed. |
| Pagination for feed | Convex `.paginate()` with `paginationOptsValidator` | Built-in cursor-based pagination. Already documented in Convex best practices. |
| Realtime feed updates | Convex reactive subscriptions (`useQuery`) | Same mechanism used for workout list, PR badges, analytics. No WebSocket setup needed. |
| Initial profile data (name, avatar) | Clerk `getUserIdentity()` returns `name`, `pictureUrl`, `email` | Already available via `ctx.auth.getUserIdentity()`. Seed profile on first visit. |

## Existing Code and Patterns

- `packages/backend/convex/lib/auth.ts` — `getUserId()` extracts Clerk `subject` as userId string. All existing queries use this. Social queries for "other users" will need new patterns: public queries skip this check, cross-user queries accept a `profileId` arg.
- `packages/backend/convex/schema.ts` — 9-table normalized schema. userId is a `v.string()` (Clerk subject), not a Convex ID. All social tables must use the same `v.string()` for userId to maintain join consistency. The `workouts` table already has `by_userId_completedAt` index — usable for feed queries.
- `packages/backend/convex/testing.ts` — Test helpers accept `testUserId: v.string()` to bypass auth. Extend this pattern for social features (test follow, test feed, etc.).
- `packages/backend/convex/templates.ts` — `saveAsTemplate` and `startWorkoutFromTemplate` are the foundation for clone-shared-workout. The clone flow is: read shared workout exercises → create template → optionally start workout from template.
- `packages/backend/convex/workouts.ts` — `getWorkoutWithDetails` joins workout → workoutExercises → exercises → sets. The public share view needs a similar join but without ownership check and with privacy gating.
- `packages/backend/convex/analytics.ts` — `computePeriodSummary` and volume queries show the pattern for aggregating user stats (total workouts, volume). Profile stats can reuse these computations.
- `apps/web/src/middleware.ts` — Clerk middleware protects `/notes(.*)`, `/exercises(.*)`, `/workouts(.*)`, `/templates(.*)`, `/analytics(.*)`. Public share routes (e.g., `/shared/[id]`) must NOT be in this list. Profile routes (`/profile/[username]`) need a split: own profile = protected, other's profile = public.
- `apps/web/src/app/ConvexClientProvider.tsx` — `ConvexProviderWithClerk` wraps the entire app. Public pages that use Convex queries still work — unauthenticated requests just get `null` from `getUserIdentity()`.
- `apps/native/src/navigation/MainTabs.tsx` — 5 tabs (Exercises, Workouts, Templates, Analytics, Settings). M003 needs to add Feed and Profile tabs. Tab bar has space for 5 tabs — going to 7 would be crowded. Consider: replace Settings tab with Profile (settings nested inside), add Feed tab = 6 tabs, or use a top-level navigation change.
- `apps/web/src/components/common/UserNav.tsx` — Uses Clerk's `useUser()` for avatar/name. Shows the pattern for displaying user info.
- `packages/backend/convex/auth.config.js` — Clerk issuer config. No changes needed for M003.

## Constraints

- **userId is a Clerk subject string, not a Convex ID.** All existing tables store `userId: v.string()`. Social tables (profiles, follows, feedItems, reactions) must use the same pattern. Cannot use `v.id("profiles")` for cross-references to profiles without a migration. Recommend: `profiles` table has `userId: v.string()` as the primary key (indexed), and a `v.id("profiles")` `_id` auto-generated by Convex. References from feedItems/reactions use `userId: v.string()` to match existing pattern.
- **No `http.ts` exists yet.** The project has no HTTP router. Adding one for share links would be premature — use Next.js dynamic routes with public Convex queries instead. HTTP actions are only needed if we must serve files or handle webhooks.
- **Convex queries must terminate within 10 seconds and read ≤16K documents.** Feed fan-out-on-read query must be bounded: paginate, limit followed users checked per page, and limit feed items returned. For 50 followed users × 10 recent workouts = 500 workout reads + joins — well within limits.
- **Convex mutations are transactional.** "Follow + create feed items" in one mutation is safe but must stay under 8K document writes. At this scale, not a concern.
- **Mobile tab bar space.** Currently 5 tabs. Adding Feed + Profile = 7 is too many. Need to consolidate: Profile in Settings (or replace Settings), or use a different navigation pattern (drawer, segmented control).
- **Workouts currently have no `isPublic`/`isPrivate` field.** Schema change needed. Adding `v.optional(v.boolean())` for `isPublic` with default `true` (or `false` — privacy default is a UX decision).
- **No user-facing concept of "username" or "profile slug" exists.** Clerk provides email and name but not a guaranteed unique username. Profiles need a unique `username` field for profile URLs (`/profile/[username]`). Must validate uniqueness on creation.

## Common Pitfalls

- **Feed query performance with reactive subscriptions** — A feed query that joins across many users can cause excessive recomputation if any followed user modifies any workout. Mitigation: use a dedicated `feedItems` table (denormalized) rather than querying all followed users' workouts directly. When a workout is completed, insert a feed item. The feed query reads only from `feedItems`, which is a single indexed table. This is a hybrid: fan-out-on-write for feed item creation (in the `finishWorkout` mutation), fan-out-on-read for the actual feed display.
- **Privacy leaks through existing queries** — Every existing query (listWorkouts, getWorkoutWithDetails, etc.) is scoped to the current user. Public share and profile views need new query functions that explicitly check privacy flags and never return private data. Don't modify existing queries — write new public-facing ones with explicit access control.
- **Race condition on profile creation** — If multiple tabs/devices trigger "create profile on first visit" simultaneously, you get duplicate profiles. Mitigation: use a unique index on `userId` in the `profiles` table and handle the insert-or-get pattern atomically in a mutation.
- **Avatar storage lifecycle** — If a user uploads a new avatar, the old storage ID becomes orphaned. Need cleanup logic (delete old storage ID on avatar update) or accept the leak at this scale.
- **Block/report without moderation infrastructure** — Basic block (hide blocked user's content client-side + server-side filter) is achievable. Report needs somewhere to go — at minimum, a `reports` table that an admin can query. Without an admin UI, reports are fire-and-forget. Acceptable for M003, but note the gap.
- **Username uniqueness across case** — "JohnDoe" and "johndoe" must be treated as the same username. Store lowercase, display original. Convex indexes are case-sensitive, so store a `usernameLower` field for the unique index.
- **Feed item staleness** — If a user deletes a workout, the corresponding feed item must be cleaned up. Otherwise the feed shows a ghost entry linking to a deleted workout. Add cascade delete in `deleteWorkout`.

## Open Risks

- **Feed denormalization consistency** — Using a `feedItems` table means workout data is duplicated. If a user edits a workout after sharing, the feed item snapshot becomes stale. Options: (a) feed items are immutable snapshots (simpler, stale-OK), (b) feed items reference workout IDs and the feed UI fetches live data (fresh but more reads). Recommend (a) — a shared workout summary is a point-in-time snapshot.
- **Mobile tab bar redesign** — Adding 2 new tabs to 5 existing ones requires a navigation rethink. This could affect mobile UX significantly and may need user input.
- **Username migration for existing users** — Existing Clerk users don't have a username in Convex. On first visit to any social feature, users need a profile creation flow that includes username selection. This is a new onboarding step that doesn't exist today.
- **Public share SEO/OG tags** — Shared workout links should have Open Graph meta tags for social media previews. This requires server-side rendering or `generateMetadata` in Next.js dynamic routes. Achievable but adds complexity to the share page.
- **Convex 1.29 file storage URL expiry** — Convex storage URLs from `ctx.storage.getUrl()` are public but may have expiry. If used for avatars, the URL must be fresh on each render (reactive query handles this) or a long-lived URL must be available. Verify behavior.

## Candidate Requirements Analysis

### Table Stakes (missing from requirements, should be added)

- **R_CANDIDATE_01: Profile creation on first social interaction** — Users need an onboarding flow to create a profile (choose username, set bio) before they can be followed or appear in feeds. Not mentioned in R015 but essential.
- **R_CANDIDATE_02: Username uniqueness and format validation** — Usernames must be unique, case-insensitive, alphanumeric+underscore, and 3-30 chars. Not in requirements but table stakes for profile URLs.
- **R_CANDIDATE_03: Feed item pagination** — Activity feeds must paginate (not load all items at once). Implied by R016 but not explicit.

### Likely Expected (not explicit but users would expect)

- **R_CANDIDATE_04: Unfollow confirmation** — Users should confirm before unfollowing (prevents accidental unfollows). Minor UX detail.
- **R_CANDIDATE_05: Empty state for feed** — When a user follows nobody or nobody has posted, show a helpful prompt (e.g., "Follow users to see their workouts here").
- **R_CANDIDATE_06: Profile stats derived from workout data** — R015 mentions "workout stats" but doesn't specify which. Recommend: total workouts, current streak, total volume, and top 3 exercises — all computable from existing analytics functions.

### Advisory Only (good to know, don't scope-creep)

- **Push notifications for social activity** — Explicitly out of scope per M003 context. Don't add.
- **Feed filtering/sorting** — Sort by recency is sufficient for M003. Algorithmic feeds are over-engineering.
- **Profile cover photos** — Nice to have, not table stakes. Skip for M003.
- **Mutual follow indicator** — Shows if someone you follow follows you back. Nice UX touch but not required for M003.

### Privacy Model Decision Needed

The context mentions "Privacy controls (public/private per workout, profile visibility)" but doesn't specify the **default**. This is a critical UX decision:
- **Default public** = more social content, feels like a fitness community (Strava model)
- **Default private** = safer for new users, less content in feeds (privacy-first model)

Recommend: **default public with easy toggle** — matches fitness app conventions (Strava, Fitbod, Hevy all default to public). Users who want privacy can toggle per-workout or set a global "all workouts private" preference.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (123 installs) | available — relevant for helpers, access control patterns |
| Convex | `get-convex/agent-skills@function-creator` (112 installs) | available — relevant for creating social queries/mutations |
| Convex | `get-convex/agent-skills@schema-builder` (107 installs) | available — relevant for new social tables |
| Clerk | `clerk/skills@clerk-nextjs-patterns` (3.3K installs) | available — relevant for profile data from Clerk identity |
| Clerk | `clerk/skills@clerk-webhooks` (1.8K installs) | available — potentially relevant if using Clerk webhooks for profile sync |
| Frontend | `frontend-design` | installed — for social UI components |

**Recommendation:** Consider installing `get-convex/agent-skills@schema-builder` and `get-convex/agent-skills@function-creator` — they directly apply to the bulk of M003 work (5+ new tables, 20+ new functions). The Clerk skills are lower priority since the existing Clerk integration pattern is already clear.

## New Schema Design (Advisory)

The following tables are needed. This is advisory for roadmap planning, not binding:

```
profiles:
  userId: v.string()          // Clerk subject (primary key via index)
  username: v.string()         // unique, lowercase for URL
  displayName: v.string()      // from Clerk or custom
  bio: v.optional(v.string())
  avatarStorageId: v.optional(v.id("_storage"))
  isPublic: v.boolean()        // profile visibility
  createdAt: v.number()
  indexes: by_userId, by_username, search_displayName

follows:
  followerId: v.string()       // who is following
  followingId: v.string()      // who is being followed
  createdAt: v.number()
  indexes: by_followerId, by_followingId, by_pair (followerId + followingId)

feedItems:
  authorId: v.string()         // who created the activity
  type: "workout_completed" | "workout_shared"
  workoutId: v.id("workouts")  // source workout
  summary: { name, duration, exerciseCount, prCount }  // denormalized snapshot
  isPublic: v.boolean()
  createdAt: v.number()
  indexes: by_authorId_createdAt, by_workoutId

reactions:
  feedItemId: v.id("feedItems")
  userId: v.string()
  type: "fire" | "fistBump" | "clap" | "strongArm" | "trophy"
  createdAt: v.number()
  indexes: by_feedItemId, by_feedItemId_userId (unique reaction per type)

blocks:
  blockerId: v.string()
  blockedId: v.string()
  createdAt: v.number()
  indexes: by_blockerId, by_blockedId

reports:
  reporterId: v.string()
  targetType: "profile" | "feedItem"
  targetId: v.string()
  reason: v.string()
  createdAt: v.number()
```

Workouts table needs one new field: `isPublic: v.optional(v.boolean())` (default true via application logic).

## Sources

- Convex documentation on public queries and access control (source: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices))
- Convex file storage upload/serve pattern (source: [Convex File Storage](https://docs.convex.dev/file-storage/upload-files))
- Convex pagination pattern with `paginationOptsValidator` (source: [Convex Pagination](https://docs.convex.dev/database/pagination))
- Convex HTTP actions for custom endpoints (source: [Convex HTTP Actions](https://docs.convex.dev/functions/http-actions))
- Convex search index for user discovery (source: [Convex Text Search](https://docs.convex.dev/text-search))
- Clerk identity fields available via `getUserIdentity()` (source: [Convex Auth - Clerk](https://docs.convex.dev/auth/clerk))
- Existing codebase: schema.ts, auth.ts, workouts.ts, templates.ts, testing.ts, analytics.ts, middleware.ts, MainTabs.tsx
