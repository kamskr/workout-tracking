---
estimated_steps: 5
estimated_files: 7
---

# T03: Build /feed page, add follow/unfollow to profile page, wire navigation

**Slice:** S02 — Follow System & Activity Feed
**Milestone:** M003

## Description

Build the web UI that consumes the S02 backend contract — the realtime activity feed at `/feed` using `usePaginatedQuery`, feed item display with author info and reactions, follow/unfollow button on profile pages, user search for follow discovery, and navigation wiring. This is the user-facing proof that the backend works end-to-end.

## Steps

1. **Create `/feed` page with `usePaginatedQuery`** — New `apps/web/src/app/feed/page.tsx`: uses `usePaginatedQuery(api.social.getFeed, {}, { initialNumItems: 15 })` to load feed items. Shows loading state (spinner), empty state ("Follow users to see their workouts here" with link to search/discover users), and the feed item list. "Load More" button at bottom when `status === "CanLoadMore"`. Page container has `data-feed-page` attribute. Include a user search section at the top of the page — text input that calls `searchProfiles` for user discovery, showing profile cards with follow buttons.

2. **Build `FeedItem` component** — New `apps/web/src/components/feed/FeedItem.tsx`: displays author avatar (Radix Avatar with initials fallback, same pattern as profile page), author displayName + @username, workout summary (name, duration formatted, exercise count, PR count), relative timestamp ("2m ago", "1h ago", "3d ago"), and the `ReactionBar` component. Container has `data-feed-item` attribute. Author name/avatar links to `/profile/[username]`.

3. **Build `ReactionBar` component** — New `apps/web/src/components/feed/ReactionBar.tsx`: 5 emoji buttons (🔥 fire, 🤜 fistBump, 👏 clap, 💪 strongArm, 🏆 trophy). Each button shows the count (if > 0) and is highlighted if the current user has reacted. Clicking toggles: calls `addReaction` if not reacted, `removeReaction` if already reacted. Uses `useMutation` for add/remove. Container has `data-reaction-bar` attribute. Optimistic UI: toggle state immediately on click, revert on error.

4. **Add follow/unfollow to profile page** — Modify `apps/web/src/app/profile/[username]/page.tsx`: for non-own profiles, show a follow/unfollow button with `data-follow-button` attribute. Use `useQuery(api.social.getFollowStatus, { targetUserId: profile.userId })` to determine current state. Use `useMutation(api.social.followUser)` and `useMutation(api.social.unfollowUser)`. Show follower/following counts via `useQuery(api.social.getFollowCounts, { userId: profile.userId })` below the username. Button states: "Follow" (outline), "Following" (solid, shows "Unfollow" on hover). Counts displayed as "X followers · Y following".

5. **Wire navigation and middleware** — Add `/feed(.*)` to the `isProtectedRoute` matcher in `apps/web/src/middleware.ts`. Add "Feed" link to `apps/web/src/components/Header.tsx` for authenticated users — add it to the main navigation when user is logged in, linking to `/feed`. Use same styling pattern as existing navigation links. Ensure the link appears in both desktop and mobile header variants.

## Must-Haves

- [ ] `/feed` page uses `usePaginatedQuery` with `api.social.getFeed`
- [ ] "Load More" button visible when `status === "CanLoadMore"`, disabled otherwise
- [ ] Empty feed state shows helpful message with discovery prompt
- [ ] Feed items display author avatar, name, workout summary, timestamp, reactions
- [ ] Author name/avatar in feed items links to `/profile/[username]`
- [ ] ReactionBar shows 5 emoji types with counts and toggle behavior
- [ ] Follow/unfollow button on non-own profiles with correct toggle state
- [ ] Follower/following counts displayed on profile page
- [ ] `/feed(.*)` in middleware protected routes
- [ ] "Feed" link in Header navigation for authenticated users
- [ ] Data attributes: `data-feed-page`, `data-feed-item`, `data-reaction-bar`, `data-follow-button`
- [ ] `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors

## Verification

- `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors (pre-existing `clsx` only)
- Code review: `/feed` page uses `usePaginatedQuery` not `useQuery`
- Code review: All data attributes present (`data-feed-page`, `data-feed-item`, `data-reaction-bar`, `data-follow-button`)
- Code review: Middleware includes `/feed(.*)` in protected routes
- Code review: Header has "Feed" link for authenticated users
- Browser (when available): Navigate to `/feed` — page renders with `data-feed-page`; navigate to `/profile/[username]` of another user — follow button with `data-follow-button` visible

## Observability Impact

- Signals added/changed: Data attributes (`data-feed-page`, `data-feed-item`, `data-reaction-bar`, `data-follow-button`) enable programmatic browser assertions without fragile text/class selectors (D057/D082 pattern)
- How a future agent inspects this: `document.querySelector('[data-feed-page]')` verifies feed page loaded; `document.querySelectorAll('[data-feed-item]')` counts rendered feed items; `document.querySelector('[data-follow-button]')` verifies follow button presence; `document.querySelector('[data-reaction-bar]')` verifies reaction UI
- Failure state exposed: Empty feed state is a visible UI state, not a hidden error; loading states (spinner) clearly indicate pending data; reaction optimistic updates revert visually on error

## Inputs

- `packages/backend/convex/social.ts` — T01 output: `getFeed`, `followUser`, `unfollowUser`, `getFollowStatus`, `getFollowCounts`, `addReaction`, `removeReaction`, `getReactionsForFeedItem`
- `packages/backend/convex/_generated/api.d.ts` — T01 output: social module in API types
- `apps/web/src/app/profile/[username]/page.tsx` — S01 output: existing profile view with avatar, name, bio, stats, inline edit
- `apps/web/src/components/Header.tsx` — Existing header with navigation
- `apps/web/src/middleware.ts` — Existing middleware with protected routes
- `apps/web/src/components/profile/ProfileStats.tsx` — S01 output: stats component pattern
- `packages/backend/convex/profiles.ts` — `searchProfiles` query for user discovery

## Expected Output

- `apps/web/src/app/feed/page.tsx` — New: feed page with usePaginatedQuery, user search, empty state, load more
- `apps/web/src/components/feed/FeedItem.tsx` — New: feed item component with author info, summary, timestamp
- `apps/web/src/components/feed/ReactionBar.tsx` — New: reaction bar with 5 emoji buttons, counts, toggle
- `apps/web/src/app/profile/[username]/page.tsx` — Modified: follow/unfollow button, follower/following counts for non-own profiles
- `apps/web/src/middleware.ts` — Modified: /feed(..) added to protected routes
- `apps/web/src/components/Header.tsx` — Modified: "Feed" link for authenticated users
