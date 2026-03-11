# S01: User Profiles — Research

**Date:** 2026-03-11

## Summary

S01 introduces the first cross-user data model to the codebase. Today, every query is scoped to a single authenticated user via `getUserId()` (returns Clerk `subject` string). Profiles break this by requiring: (a) a new `profiles` table with publicly queryable data, (b) a profile setup flow for first-time users (username selection, bio), (c) profile stats derived from existing workout/analytics data, and (d) a public-facing profile page at `/profile/[username]` that other authenticated users can view.

The existing codebase is well-structured for this. The `userPreferences` table and its upsert pattern (`query by_userId → patch or insert`) is the exact pattern `createProfile` will follow. The `computePeriodSummary` function in `analytics.ts` already aggregates workout count, volume, and top exercises — profile stats can reuse this directly. The `exercises` table already has a `searchIndex("search_name", ...)` — the `profiles` table needs an identical search index on `displayName` for user discovery. The Avatar component (`@radix-ui/react-avatar`) and Clerk's `useUser()` hook are already wired in `UserNav.tsx` — the same pattern applies to profile display.

The primary risk is **username uniqueness enforcement**. Convex doesn't have native unique constraints — uniqueness must be enforced at the application level via an indexed query + conditional insert within a single mutation (which is atomic due to Convex's OCC). Case-insensitive uniqueness requires storing a separate `usernameLower` field (D072). A race condition between two simultaneous profile creations from the same Clerk user (e.g. two tabs) must also be handled — check `by_userId` index before insert.

## Recommendation

1. **New `profiles` table** with `userId` (string, indexed), `username` (string), `usernameLower` (string, unique-indexed), `displayName`, `bio`, `avatarStorageId`, `isPublic`, `createdAt`. Both `by_userId` (for "does this user have a profile?") and `by_usernameLower` (for "is this username taken?" and profile page lookup) indexes.

2. **`createProfile` mutation** — Atomic create-or-return. Check `by_userId` first (if profile exists, return it). Then check `by_usernameLower` for uniqueness. Then insert. All in one mutation — Convex OCC guarantees no duplicates.

3. **`updateProfile` mutation** — Allows updating `displayName`, `bio`, `avatarStorageId`, `isPublic`. If username changes, re-check `by_usernameLower` uniqueness.

4. **`getProfile` query** (by userId) and **`getProfileByUsername` query** (by usernameLower) — Both are public-facing (any authenticated user can call). Profile page uses `getProfileByUsername`. These do NOT require the viewer to own the profile.

5. **`getProfileStats` query** — Takes a `userId` arg. Reuse `computePeriodSummary(db, userId, undefined)` for all-time stats (totalWorkouts, totalVolume, topExercises). Add streak computation (consecutive days with completed workouts, walking backward from today).

6. **`searchProfiles` query** — Uses search index on `displayName`. Same pattern as `listExercises` search path.

7. **Avatar upload** — `generateAvatarUploadUrl` mutation (calls `ctx.storage.generateUploadUrl()`). Client POSTs file, gets `storageId`, calls `updateProfile({ avatarStorageId })`. Profile queries resolve avatar URL via `ctx.storage.getUrl(avatarStorageId)`. Old avatar storage ID cleaned up in `updateProfile` when avatar changes.

8. **Profile setup UI** — `/profile/setup` page (protected). Shows if user has no profile. Fields: username (validated live), display name (seeded from Clerk `identity.name`), bio (optional). After creation, redirect to `/profile/[username]`.

9. **Profile view UI** — `/profile/[username]` page (protected — all profile viewers must be authenticated in S01; public profile access comes in S03 with share links). Displays avatar, name, bio, stats. "Edit Profile" button if viewing own profile.

10. **Middleware update** — Add `/profile(.*)` to `isProtectedRoute` in `middleware.ts`.

11. **Test helpers** — `testCreateProfile`, `testUpdateProfile`, `testGetProfile`, `testGetProfileByUsername`, `testGetProfileStats`, `testSearchProfiles`, `testCleanupProfile`. Extend existing `testCleanup` to also delete profiles.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Avatar image upload + serving | Convex `ctx.storage.generateUploadUrl()` + `ctx.storage.getUrl()` | Built into platform. Generates upload URLs, serves via CDN. Already Convex 1.29+. |
| User search for follow discovery (S02 prep) | Convex `.searchIndex()` on profiles `displayName` | Same pattern as `exercises` table `search_name` index. Proven in codebase. |
| Profile stats (workout count, volume) | `computePeriodSummary(db, userId, undefined)` from `analytics.ts` | Already extracts totalWorkouts, totalVolume, topExercises. Pass `undefined` periodDays for all-time. |
| Avatar display component | `@radix-ui/react-avatar` (`Avatar`, `AvatarImage`, `AvatarFallback`) | Already imported and used in `UserNav.tsx`. |
| Initial display name + avatar | Clerk `ctx.auth.getUserIdentity()` returns `name`, `pictureUrl` | Available on every Convex function call. Seed profile on creation. |
| Username format validation | Regex: `/^[a-zA-Z0-9_]{3,30}$/` | Standard pattern. No library needed. |
| Upsert pattern (create-or-return) | `userPreferences.ts` pattern: query by index → patch or insert | Same atomic upsert used for preferences. Extend to profiles with uniqueness check. |

## Existing Code and Patterns

- **`packages/backend/convex/lib/auth.ts`** — `getUserId()` returns `(await ctx.auth.getUserIdentity())?.subject`. All profile mutations use this for the current user. Profile queries for "other user's profile" accept a `username` arg instead of relying on auth — this is the first cross-user read pattern.
- **`packages/backend/convex/schema.ts`** — 9 tables, all using `userId: v.string()` for Clerk subject. `profiles` table must use the same pattern. No `v.id("profiles")` references from other tables — use `userId: v.string()` as the logical foreign key. `exercises` table has the search index pattern to copy.
- **`packages/backend/convex/testing.ts`** — All test helpers accept `testUserId: v.string()`. Profile test helpers follow the same pattern. `testCleanup` needs extension to delete profiles.
- **`packages/backend/convex/analytics.ts`** — `computePeriodSummary(db, userId, periodDays)` returns `{ workoutCount, totalVolume, totalSets, topExercises }`. Profile stats reuse this with `periodDays = undefined` (all-time). Streak computation is new.
- **`packages/backend/convex/userPreferences.ts`** — Upsert pattern (`query by_userId → existing ? patch : insert`). Profile creation is similar but adds username uniqueness check.
- **`apps/web/src/middleware.ts`** — `isProtectedRoute` array needs `/profile(.*)` added. Currently protects notes, exercises, workouts, templates, analytics.
- **`apps/web/src/components/common/UserNav.tsx`** — Uses `useUser()` from Clerk for avatar/name. Profile pages will use Convex profile data instead (supports custom bio, username, Convex-stored avatar).
- **`apps/web/src/components/common/avatar.tsx`** — Radix UI Avatar with Image + Fallback. Reuse directly on profile pages.
- **`apps/web/src/app/ConvexClientProvider.tsx`** — `ConvexProviderWithClerk` wraps entire app. All Convex hooks work under this provider.
- **`apps/web/src/app/exercises/[id]/page.tsx`** — Dynamic route pattern to copy for `/profile/[username]/page.tsx`.

## Constraints

- **userId is Clerk subject string, not Convex ID.** All tables use `v.string()`. Profiles table must follow. Cannot use `v.id("profiles")` for foreign keys from S02 tables — use `userId: v.string()` to maintain join consistency.
- **Convex has no native unique constraints.** Username uniqueness is enforced by querying the `by_usernameLower` index before insert within the atomic mutation. OCC ensures concurrent mutations on the same username will conflict and one will retry (seeing the now-existing username).
- **Convex search indexes require a text search field and support only equality filters.** `searchIndex("search_displayName", { searchField: "displayName", filterFields: ["isPublic"] })` — can filter by `isPublic` in the search query, but not by other fields simultaneously.
- **Convex `ctx.storage.getUrl()` returns a URL that may expire.** In reactive queries, this is fine — the URL is regenerated on each query recomputation. For server-rendered pages, the URL must be fresh at render time.
- **Convex query read limit: 16K documents, 10s timeout.** Profile stats via `computePeriodSummary` does full workout traversal. For users with <500 workouts this is fine. Monitor if profile page loads exceed 2s.
- **No HTTP actions router exists.** Don't create one for S01. All profile routes are Next.js pages calling Convex queries client-side.
- **Existing Clerk middleware only protects specific route patterns.** Any new route not in `isProtectedRoute` is publicly accessible. `/profile/setup` and `/profile/[username]` must be added.

## Common Pitfalls

- **Race condition on profile creation** — Two tabs opening simultaneously could both check "no profile exists" and try to insert. Mitigation: Convex OCC. Both mutations read the `by_userId` index. One commits first; the other's commit fails OCC validation (read set changed), retries, sees the existing profile, returns it. This is automatic — just implement the check-then-insert pattern.
- **Case-insensitive username collision** — "JohnDoe" and "johndoe" must collide. Store `usernameLower = username.toLowerCase()` and index on `usernameLower`. Display the user-provided casing but match on lowercase. (D072)
- **Username change invalidates profile URLs** — If a user changes their username, old `/profile/[oldname]` links break. Options: (a) don't allow username changes (simplest), (b) allow changes but old URLs 404 (acceptable for S01), (c) redirect old → new (over-engineering for S01). Recommend (a): usernames are immutable after creation. `updateProfile` does not accept `username`.
- **Profile stats query performance** — `computePeriodSummary` with no period filter scans all workouts. For <500 workouts this is fine. For thousands, consider caching stats in the profile doc (updated on workout completion). Defer optimization to when it's needed.
- **Avatar orphan storage** — When updating avatar, the old `storageId` must be deleted. The `updateProfile` mutation should call `ctx.storage.delete(oldAvatarStorageId)` before setting the new one. If deletion fails, the orphan is harmless at this scale.
- **Seeding profile from Clerk vs. manual entry** — `getUserIdentity()` returns `name` and `pictureUrl` from Clerk. Seed `displayName` from `name` on the setup page as a default value (user can change). Don't auto-download the Clerk avatar — just show it as a preview; user can upload a custom one or skip. If no custom avatar, the profile query falls back to Clerk avatar (via `getUserIdentity().pictureUrl` on the client through `useUser()`).
- **Profile page for users without profiles** — An authenticated user viewing `/profile/[username]` for a username that doesn't exist should see a 404-like message, not a crash. The `getProfileByUsername` query returns `null` for unknown usernames.

## Open Risks

- **Streak computation accuracy** — "Current streak" (consecutive days with completed workouts) requires walking backward through `workouts` by `completedAt` day-by-day. The `by_userId_completedAt` index supports this, but the logic for handling timezone-dependent "day" boundaries is tricky. For S01, use UTC days. Users in different timezones may see a streak that doesn't match their local calendar. Acceptable for MVP, refinable later.
- **Profile setup gating UX** — How aggressively should the app redirect to `/profile/setup` if the user has no profile? Options: (a) redirect on every page load (annoying), (b) show a banner/prompt on first visit to social features (gentler), (c) only require profile when navigating to a social feature (deferred until S02). Recommend (b): show a banner on the main pages if no profile exists, with a link to `/profile/setup`. Don't block existing workout functionality.
- **S01→S02 boundary stability** — S02 depends on the `profiles` table shape, `getProfile`/`getProfileByUsername` queries, `searchProfiles` query, and test helpers. Any field name or return shape changes in S01 will require S02 adjustments. Mitigate by documenting the exact contract in the S01 summary.
- **displayName vs username confusion** — `displayName` is for UI display ("John Doe"). `username` is for URLs and mentions ("johndoe"). Users might expect `displayName` to be unique — it's not. Only `username` is unique. The setup UI must make this clear.
- **Convex file storage URL lifetime** — `ctx.storage.getUrl()` returns URLs that are public and currently don't expire (Convex 1.29). But this could change in future Convex versions. Since profile queries are reactive, URLs are refreshed on every subscription update. Low risk.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@schema-builder` (107 installs) | available — directly relevant for profiles table definition |
| Convex | `get-convex/agent-skills@function-creator` (112 installs) | available — relevant for profile CRUD functions |
| Convex | `get-convex/agent-skills@convex-helpers-guide` (123 installs) | available — relevant for access control patterns |
| Clerk | `clerk/skills@clerk-nextjs-patterns` (3.3K installs) | available — relevant for profile data seeding from Clerk identity |
| Frontend | `frontend-design` | installed — for profile setup and view UI components |

**Recommendation:** Consider installing `get-convex/agent-skills@schema-builder` and `get-convex/agent-skills@function-creator`. They directly apply to S01 work (new table, 6+ new functions). The Clerk skill is lower priority — the existing `getUserIdentity()` pattern is already clear in the codebase.

## Sources

- Convex file storage: `ctx.storage.generateUploadUrl()` → POST file → `storageId` → `ctx.storage.getUrl()` (source: [Convex File Storage](https://docs.convex.dev/file-storage/upload-files))
- Convex search index definition and query pattern (source: [Convex Text Search](https://docs.convex.dev/text-search))
- Convex OCC for race condition handling on concurrent mutations (source: [Convex OCC](https://docs.convex.dev/database/advanced/occ))
- Clerk `getUserIdentity()` returns `name`, `pictureUrl`, `email`, `subject` (source: [Convex Auth Functions](https://docs.convex.dev/auth/functions-auth))
- Convex store-user pattern with `tokenIdentifier` index (source: [Convex Database Auth](https://docs.convex.dev/auth/database-auth))
- Existing codebase: `schema.ts` (9 tables, search index), `auth.ts` (getUserId), `testing.ts` (test helper pattern), `analytics.ts` (computePeriodSummary), `userPreferences.ts` (upsert pattern), `middleware.ts` (route protection), `UserNav.tsx` (Clerk user display), `avatar.tsx` (Radix Avatar)
