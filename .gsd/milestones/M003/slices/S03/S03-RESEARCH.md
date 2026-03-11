# S03: Workout Sharing & Privacy — Research

**Date:** 2026-03-11

## Summary

S03 adds three capabilities to the workout app: (1) a privacy toggle (`isPublic`) on workouts that gates visibility across all social surfaces, (2) public share links at `/shared/[id]` that work for unauthenticated users, and (3) a clone-as-template flow for authenticated users viewing a shared workout. This slice introduces the app's first truly unauthenticated Convex query — every existing query calls `getUserId()` — and extends the existing template system for cross-user cloning.

The primary risk is **privacy correctness** — the `isPublic` field must be respected everywhere: `finishWorkout` feed item creation, `getFeed` post-filter (already filters by `item.isPublic`), profile stats, and the new public share query. The `finishWorkout` mutation currently hardcodes `isPublic: true` on feed item creation (line 80 of `workouts.ts`). This must read the workout's `isPublic` field instead. The `getFeed` post-filter already checks `item.isPublic` (line 187 of `social.ts`), so if the feed item is created with the correct value, feed filtering is automatic.

The share link pattern is straightforward: a Convex query that accepts a `feedItemId` or `workoutId`, skips the `getUserId()` check entirely, validates `isPublic === true` (or default true for pre-migration workouts), and returns the joined workout+exercises+sets data. The Next.js route at `/shared/[id]` is excluded from Clerk middleware protection. The clone flow reuses the established `saveAsTemplate` pattern from `templates.ts` — read shared workout exercises, create template owned by the cloning user. The `feedItemType` validator needs `"workout_shared"` added for explicit share-to-feed events.

The secondary concern is **schema migration** — the `workouts` table gains `isPublic: v.optional(v.boolean())` with `undefined` treated as `true` (public by default per D073). This is backward-compatible (no data migration needed for existing workouts).

## Recommendation

### Task breakdown

**T01 (Backend):** Add `isPublic` to workouts schema. Add `"workout_shared"` to `feedItemType` validator. Create new functions: `shareWorkout` mutation (creates feed item + returns share token), `getSharedWorkout` public query (no auth, fetches workout+exercises+sets if public), `cloneSharedWorkoutAsTemplate` mutation (reads shared workout, creates template for authenticated user). Modify `finishWorkout` to read workout's `isPublic` and pass it to the feed item. Add `isPublic` arg to `createWorkout`. Add test helpers (`testShareWorkout`, `testGetSharedWorkout`, `testCloneAsTemplate`, `testCreateWorkoutWithPrivacy`). Extend `testCleanup` if needed.

**T02 (Verification):** Write `verify-s03-m03.ts` with checks covering: private workout excluded from feed items, private workout excluded from public share query, public workout visible in feed, share link resolves for public workout, share link rejects private workout, clone-as-template creates template owned by cloning user with correct exercises, `getSharedWorkout` works without auth (test via ConvexHttpClient without auth token — which already works since test helpers bypass auth), privacy toggle (update workout isPublic and verify feed item exclusion), block filtering on shared workout view.

**T03 (Web UI):** Create `/shared/[id]` page excluded from Clerk middleware — renders workout summary (exercises, sets, PRs) for unauthenticated visitors + clone button for authenticated users. Add privacy toggle on workout creation and detail pages. Add share button on completed workout cards/detail (copy link + share to feed). Data attributes: `data-shared-workout`, `data-privacy-toggle`, `data-share-button`, `data-clone-button`.

### Share token design

Use the `feedItem._id` as the share token in the URL: `/shared/[feedItemId]`. This is simpler than generating a random token and avoids adding a new field. Convex IDs are unguessable (they look like `jd7q3g4x0y...`) — sufficient for public share links. The `getSharedWorkout` query takes a feedItemId, loads the feedItem, verifies `isPublic`, then joins the workout data. Alternative: use `workoutId` directly — simpler but exposes a user's workout IDs. Prefer feedItemId for indirection.

For direct sharing without a feed item (user wants a link but hasn't shared to feed), the `shareWorkout` mutation creates a `workout_shared` feed item automatically. This serves as the "share record."

### Privacy enforcement checklist

Every cross-user data surface must be audited:
1. ✅ `getFeed` — already filters `item.isPublic` (line 187 of social.ts)
2. ⚠️ `finishWorkout` — currently hardcodes `isPublic: true` — must read from workout
3. ⚠️ `getProfileStats` → `computePeriodSummary` — does NOT filter by isPublic — needs filtering
4. 🆕 `getSharedWorkout` — new query, must check `isPublic`
5. 🆕 `cloneSharedWorkoutAsTemplate` — new mutation, must check `isPublic` before cloning
6. ✅ `getWorkoutWithDetails` — already ownership-scoped (userId check), not a social surface
7. ✅ `listWorkouts` — already ownership-scoped, not a social surface

Items 2 and 3 are the bug vectors — they're existing code that needs modification.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Clone a shared workout as a template | `saveAsTemplate` pattern in `templates.ts` (lines 12-56) | Already handles: exercise traversal, set count derivation, targetReps from first set. Clone flow is the same logic but reading from another user's workout. |
| Public workout data query (exercises + sets joined) | `getWorkoutWithDetails` in `workouts.ts` (lines 103-137) | Exact join pattern needed for share page. Copy and remove ownership check, add `isPublic` check. |
| Share page UI with workout summary | `FeedItem.tsx` workout summary card pattern | Same visual: exercise count, duration, PR count. Extend with full exercise list for the detail view. |
| Feed item creation for shares | `finishWorkout` feed item creation pattern (workouts.ts lines 66-85) | Same insert into `feedItems` table, different `type` field (`"workout_shared"` vs `"workout_completed"`). |
| Unauthenticated page access | Clerk middleware `isProtectedRoute` exclusion pattern | Just don't include `/shared(.*)` in the matcher list. Already demonstrated: `/` (landing) is not protected. |
| Test helpers for multi-user flows | `testing.ts` established pattern with `testUserId` arg | Same approach — test clone by passing cloning user's testUserId. |

## Existing Code and Patterns

- `packages/backend/convex/workouts.ts` `finishWorkout` (line 66-85) — Feed item creation. Currently hardcodes `isPublic: true`. Must change to read `workout.isPublic ?? true` (undefined = public per D073). This is the critical privacy enforcement point for automatic feed items.
- `packages/backend/convex/workouts.ts` `getWorkoutWithDetails` (lines 103-137) — The join pattern for workout → workoutExercises → exercises → sets. The public share query needs this exact join but without the `userId` ownership check and with an `isPublic` guard instead.
- `packages/backend/convex/social.ts` `getFeed` (line 182-187) — Already post-filters `item.isPublic`. If the feed item's `isPublic` is correctly set during creation, this works automatically. No changes needed here.
- `packages/backend/convex/templates.ts` `saveAsTemplate` (lines 12-56) — The clone target pattern. Reads workoutExercises + sets, derives targetSets/targetReps, inserts template + templateExercises. Clone-as-template should mirror this but: (a) read from the shared workout's userId, not the cloner's, (b) create template owned by the cloning user.
- `packages/backend/convex/schema.ts` `feedItemType` (line 52) — Currently `v.union(v.literal("workout_completed"))`. Must add `v.literal("workout_shared")` for explicit share events.
- `packages/backend/convex/analytics.ts` `computePeriodSummary` — Aggregates workout data for a userId. Currently counts ALL completed workouts — does not check `isPublic`. Since profile stats use this, private workouts would leak into public profile stats. Must add `isPublic !== false` filter.
- `apps/web/src/middleware.ts` `isProtectedRoute` — Currently protects `/profile(.*)`, `/feed(.*)`, etc. Must NOT include `/shared(.*)`. The route `/shared/[id]` should be publicly accessible.
- `apps/web/src/app/ConvexClientProvider.tsx` — `ConvexProviderWithClerk` wraps the entire app. For unauthenticated users on `/shared/[id]`, `useQuery` still works — `getUserIdentity()` returns `null` inside the Convex function. The share query simply doesn't call `getUserId()`.
- `packages/backend/convex/testing.ts` `testFinishWorkout` (line 78-99) — Also hardcodes `isPublic: true` on feed item creation. Must be updated to mirror production behavior (read workout's `isPublic`).
- `packages/backend/convex/profiles.ts` `getProfileStats` (lines 312-331) — Uses `computePeriodSummary` which doesn't filter by isPublic. Profile stats displayed on `/profile/[username]` would include private workout volume/counts. This is a privacy leak that must be fixed in S03.
- `apps/web/src/components/feed/FeedItem.tsx` — The workout summary card component. The shared workout page can reuse the visual pattern (exercise count, duration, PRs) but needs a more detailed view (full exercise list with sets).

## Constraints

- **`workouts` table has no `isPublic` field yet.** Must add `isPublic: v.optional(v.boolean())` to schema. Existing rows have `undefined` — app logic treats `undefined` as `true` (public by default per D073). No data migration needed.
- **`feedItemType` only allows `"workout_completed"`.** Adding `"workout_shared"` requires updating the union in `schema.ts` line 52. This is a schema change — needs `npx convex dev` to push.
- **Convex queries without `getUserId()` are functionally public.** This is by design — queries are public, auth is opt-in. The share query just skips the auth check. No `http.ts` or HTTP actions needed.
- **Clerk middleware controls route access.** `/shared(.*)` must be excluded from the `isProtectedRoute` matcher. If included, unauthenticated users get redirected to sign-in, defeating the purpose.
- **`computePeriodSummary` is reused by profile stats and analytics.** Modifying its filter logic affects both contexts. Profile stats should exclude private workouts (cross-user visibility), but the user's own analytics dashboard should include ALL their workouts (including private). This means the filter must be conditional — add an `includePrivate` parameter or a separate function.
- **Template creation requires a valid `exerciseId` reference.** When cloning a shared workout as template, the exercises must exist in the shared user's exercise library. If the shared workout uses a custom exercise created by the author, the cloner needs access to that exercise record. Standard seed exercises (isCustom: false) are shared across all users. Custom exercises (isCustom: true) are user-scoped. The clone mutation must verify each exerciseId still exists and skip or handle missing exercises gracefully.
- **Next.js 16 may have middleware behavior differences.** S02 summary notes a Next.js 16 deprecation warning for `middleware.ts`. The `/shared` route must work regardless — test the middleware exclusion carefully.
- **Convex IDs as share tokens.** Convex document `_id` values are opaque strings (e.g., `jd7q3g4x0y2...`). They're not sequential or guessable — adequate for share link tokens. No need for separate UUID generation.

## Common Pitfalls

- **Forgetting to update `testFinishWorkout` alongside production `finishWorkout`** — The testing helper mirrors production behavior. If `finishWorkout` reads `workout.isPublic` but `testFinishWorkout` still hardcodes `true`, verification scripts will produce false positives. Update both simultaneously.
- **Profile stats leaking private workout data** — `getProfileStats` calls `computePeriodSummary` which doesn't know about `isPublic`. A user with 50 private workouts and 10 public ones would show "60 total workouts" on their public profile. Must filter in the stats path. The tricky part: the user's OWN analytics dashboard should still show all 60. Solution: add an `includePrivate` flag to `computePeriodSummary`, or create a separate `computePublicProfileStats` that filters.
- **Feed item type mismatch after adding `"workout_shared"`** — Existing feed items all have `type: "workout_completed"`. The `getFeed` query and `FeedItem` component must handle both types gracefully. If the UI only renders `"workout_completed"` summaries, shared items won't display correctly. Add a type check or make the summary rendering generic.
- **Middleware protecting `/shared` routes** — If someone adds `/shared(.*)` to the middleware protection list (or a too-broad pattern like `/(.*)`), unauthenticated access breaks silently (redirect to sign-in). The middleware matcher must explicitly exclude it.
- **Race between share and privacy toggle** — If a user shares a workout (creating a feed item with `isPublic: true`) then later toggles the workout to private, the feed item's `isPublic` field becomes stale. The share query should check the WORKOUT's `isPublic`, not just the feed item's, for authoritative privacy status. Alternatively, update feed items when workout privacy changes.
- **Clone-as-template with custom exercises** — If the shared workout contains exercises created by the author (`isCustom: true, userId: authorId`), the cloner can still reference them (exercises are readable by all users via the `exercises` table). But the cloner won't "own" the exercise. This is acceptable — templates reference exercises by ID, and the exercise data is read-only for non-owners anyway.
- **`getSharedWorkout` returning too much data** — The join of workout → workoutExercises → exercises → sets could return large payloads for workouts with many exercises. Bound the query: `take(50)` on workoutExercises, `take(100)` on sets per exercise. These are generous limits that cover any real workout.
- **Block filtering on shared workout view** — If User A blocks User B, should A be unable to view B's shared workout via link? The research (M003 boundary map) says yes. The `getSharedWorkout` query should check the blocks table when the caller IS authenticated. Unauthenticated users bypass this (they can't be blocked).

## Open Risks

- **Privacy state consistency between workout and feed item** — A workout's `isPublic` can change after a feed item is created (user toggles to private). The feed item stores its own `isPublic` field. Two options: (a) update feed items when workout privacy changes (cascade), or (b) check the workout's `isPublic` at read time in the share query. Option (a) is more consistent but adds write-time cost. Option (b) is simpler but leaves stale feed items in the feed (the `getFeed` post-filter already checks `item.isPublic`, so a stale feed item with `isPublic: true` would show a workout the author later marked private). **Recommendation:** Use option (a) — when toggling workout privacy, also update the feed item's `isPublic`. This is a single indexed query + patch. The share query should ALSO check the workout's `isPublic` as a defense-in-depth measure.
- **`computePeriodSummary` modification scope** — This function is called by: (1) `getProfileStats` (profile page), (2) `testGetProfileStats` (test helper), (3) `testGetWeeklySummary` (7d), (4) `testGetMonthlySummary` (30d), (5) `getWeeklySummary` (analytics dashboard), (6) `getMonthlySummary` (analytics dashboard). Adding an `includePrivate` parameter touches all callers. Most should pass `true` (show the user's own private data). Only `getProfileStats` should pass `false` (cross-user visibility). This is the safest approach but requires updating 6+ call sites.
- **OG meta tags for share links** — `/shared/[id]` should have Open Graph tags for social media previews (workout name, exercise count, etc.). Next.js `generateMetadata` can fetch the data server-side, but this requires the Convex query to be callable server-side (via `fetchQuery`). Without a Convex auth token server-side, this only works for public queries — which `getSharedWorkout` is. Achievable but adds complexity. Can be deferred to a follow-up if time-constrained.
- **Pre-existing web app dependency issues** — S01 and S02 summaries both note a pre-existing `clsx` module error in the web app. This could affect new page compilation. May need to install `clsx` first.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (127 installs) | available — relevant for access control patterns |
| Convex | `get-convex/agent-skills@function-creator` (114 installs) | available — relevant for creating share/clone functions |
| Convex | `get-convex/agent-skills@schema-builder` (108 installs) | available — relevant for schema modification |
| Frontend | `frontend-design` | installed — for share page UI |

**Note:** Same skills from M003 research. No new skill needs identified for S03 specifically. The `function-creator` skill is most relevant given S03 adds 3+ new Convex functions.

## Sources

- Convex auth docs: queries without `getUserIdentity()` check are public by default (source: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices))
- Convex auth docs: `ctx.auth.getUserIdentity()` returns `null` for unauthenticated clients (source: [Convex Auth Debug](https://docs.convex.dev/auth/debug))
- `packages/backend/convex/workouts.ts` line 80: `isPublic: true` hardcoded in finishWorkout feed item creation
- `packages/backend/convex/social.ts` line 187: `item.isPublic` post-filter already present in getFeed
- `packages/backend/convex/templates.ts`: saveAsTemplate pattern for clone flow reuse
- `packages/backend/convex/analytics.ts`: computePeriodSummary lacks isPublic filtering — privacy leak vector
- `apps/web/src/middleware.ts`: Clerk route protection pattern, `/shared` must be excluded
- `packages/backend/convex/schema.ts` line 52: feedItemType union needs `"workout_shared"` addition
