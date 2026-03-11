# S03: Workout Sharing & Privacy

**Goal:** Users can toggle workout privacy, share public workouts via link, unauthenticated visitors can view shared workouts, authenticated users can clone shared workouts as personal templates. Private workouts are excluded from all social surfaces (feed, profile stats, share queries).
**Demo:** User B creates a public workout, shares it — the `/shared/[feedItemId]` page renders workout details without auth. User A (authenticated) clones it as a template. User B marks another workout as private — it does NOT appear in the feed, profile stats, or share query. The 15+ check verification script proves all privacy gates and sharing flows.

## Must-Haves

- `isPublic` field on workouts table (`v.optional(v.boolean())`, undefined = public per D073)
- `"workout_shared"` added to `feedItemType` validator in schema
- `shareWorkout` mutation: creates `workout_shared` feed item + returns feedItemId as share token
- `getSharedWorkout` public query: no auth required, fetches workout+exercises+sets for public workouts, rejects private
- `cloneSharedWorkoutAsTemplate` mutation: reads shared workout exercises, creates template owned by cloning user
- `finishWorkout` + `testFinishWorkout` read workout's `isPublic` (not hardcoded `true`) for feed item creation
- `computePeriodSummary` gains `includePrivate` parameter — `getProfileStats` passes `false`, all other callers pass `true`
- `toggleWorkoutPrivacy` mutation: updates workout `isPublic` + cascades to update feed item `isPublic`
- Privacy enforcement in `getSharedWorkout`: checks BOTH feed item AND workout `isPublic`
- Block filtering in `getSharedWorkout` for authenticated callers
- `/shared/[id]` Next.js route excluded from Clerk middleware, renders workout detail + clone button
- Privacy toggle UI on workout creation/detail
- Share button on completed workouts
- Test helpers: `testShareWorkout`, `testGetSharedWorkout`, `testCloneAsTemplate`, `testCreateWorkoutWithPrivacy`, `testToggleWorkoutPrivacy`
- 15+ check verification script (`verify-s03-m03.ts`) covering privacy gating, share resolution, clone-as-template, private exclusion from feed/profile stats, block filtering on shared view

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (Convex backend must be running for verification scripts)
- Human/UAT required: no (programmatic verification covers all privacy and sharing contracts; UI verified by TypeScript compilation + data attributes)

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors (pre-existing `clsx` only)
- `npx tsx packages/backend/scripts/verify-s03-m03.ts` — 15+ checks pass (when Convex CLI auth available)
- Verification script checks include:
  - SH-01: Public workout creates feed item with `isPublic: true` on finish
  - SH-02: Private workout creates feed item with `isPublic: false` on finish
  - SH-03: Private workout excluded from follower's feed
  - SH-04: Public workout visible in follower's feed
  - SH-05: `shareWorkout` creates `workout_shared` feed item and returns feedItemId
  - SH-06: `getSharedWorkout` returns full workout detail for public workout (no auth)
  - SH-07: `getSharedWorkout` rejects private workout
  - SH-08: `cloneSharedWorkoutAsTemplate` creates template owned by cloning user with correct exercises
  - SH-09: `cloneSharedWorkoutAsTemplate` rejects private workout
  - SH-10: `toggleWorkoutPrivacy` flips `isPublic` on workout AND associated feed items
  - SH-11: Profile stats (via `computePeriodSummary` with `includePrivate: false`) exclude private workouts
  - SH-12: Profile stats for own analytics (with `includePrivate: true`) include all workouts
  - SH-13: Blocked user cannot view shared workout via `getSharedWorkout`
  - SH-14: `getSharedWorkout` returns null for nonexistent feedItemId
  - SH-15: Clone preserves exercise order and derives correct targetSets/targetReps

## Observability / Diagnostics

- Runtime signals:
  - `[Share] Created workout_shared feed item {feedItemId} for workout {workoutId}` — console.log in `shareWorkout` mutation
  - `[Privacy] Updated isPublic to {value} on workout {workoutId} and {count} feed items` — console.log in `toggleWorkoutPrivacy`
  - `[Clone] User {userId} cloned shared workout {workoutId} as template {templateId}` — console.log in `cloneSharedWorkoutAsTemplate`
  - Existing: `[Feed Item] Error creating feed item for workout {id}: {error}` — console.error in finishWorkout
- Inspection surfaces:
  - `testGetSharedWorkout` test helper: programmatic state inspection of any shared workout via ConvexHttpClient
  - `testShareWorkout` test helper: create share records for testing
  - Data attributes: `data-shared-workout`, `data-privacy-toggle`, `data-share-button`, `data-clone-button` on UI elements
- Failure visibility:
  - `getSharedWorkout` returns `null` (not error) for private/nonexistent/blocked — caller distinguishes via null check
  - `shareWorkout` throws "Workout not found", "Workout does not belong to user", "Workout is private — cannot share"
  - `cloneSharedWorkoutAsTemplate` throws "Shared workout not available" for private/missing/blocked
  - `toggleWorkoutPrivacy` throws "Workout not found", "Workout does not belong to user"
- Redaction constraints: none — no PII in share data beyond display names already public

## Integration Closure

- Upstream surfaces consumed:
  - `packages/backend/convex/social.ts` — `getFeed` post-filter (already checks `item.isPublic`)
  - `packages/backend/convex/workouts.ts` — `finishWorkout` feed item creation (modified to read workout `isPublic`)
  - `packages/backend/convex/testing.ts` — `testFinishWorkout` (modified to mirror production)
  - `packages/backend/convex/analytics.ts` — `computePeriodSummary` (modified for `includePrivate` param)
  - `packages/backend/convex/profiles.ts` — `getProfileStats` (modified to pass `includePrivate: false`)
  - `packages/backend/convex/templates.ts` — `saveAsTemplate` pattern (reused for clone flow)
  - `packages/backend/convex/schema.ts` — `feedItemType` validator (extended with `"workout_shared"`)
  - `apps/web/src/middleware.ts` — route protection (modified to exclude `/shared`)
  - `apps/web/src/components/feed/FeedItem.tsx` — visual pattern reused for shared workout page
- New wiring introduced in this slice:
  - `sharing.ts` new Convex module with `shareWorkout`, `getSharedWorkout`, `cloneSharedWorkoutAsTemplate`, `toggleWorkoutPrivacy`
  - `/shared/[id]/page.tsx` new Next.js route (public, unauthenticated access)
  - `isPublic` field on workouts table (schema change)
  - `"workout_shared"` feed item type (schema change)
  - `includePrivate` parameter on `computePeriodSummary` (signature change)
- What remains before the milestone is truly usable end-to-end:
  - S04: Mobile social port (Profile tab, Feed tab, share/clone/privacy UI on mobile)
  - Convex CLI auth resolution for running verification scripts live
  - Pre-existing `clsx` dependency fix for web runtime

## Tasks

- [x] **T01: Add isPublic to workouts, extend schema, create sharing.ts with privacy/share/clone mutations and queries** `est:45m` ✅
  - Why: Core backend contract — adds privacy field to workouts, extends feedItemType validator, creates all new Convex functions for sharing/privacy/cloning, modifies finishWorkout to respect privacy, adds includePrivate to computePeriodSummary, updates getProfileStats
  - Files: `packages/backend/convex/schema.ts`, `packages/backend/convex/sharing.ts`, `packages/backend/convex/workouts.ts`, `packages/backend/convex/analytics.ts`, `packages/backend/convex/profiles.ts`, `packages/backend/convex/testing.ts`, `packages/backend/convex/_generated/api.d.ts`
  - Do: (1) Add `isPublic: v.optional(v.boolean())` to workouts table in schema. (2) Add `v.literal("workout_shared")` to feedItemType union. (3) Create `sharing.ts` with 4 functions: `shareWorkout` (auth, creates workout_shared feedItem, returns feedItemId), `getSharedWorkout` (NO auth, accepts feedItemId, checks isPublic on both feedItem AND workout, joins workout→workoutExercises→exercises→sets, block-checks if caller is authenticated), `cloneSharedWorkoutAsTemplate` (auth, reads shared workout exercises, creates template+templateExercises owned by caller — reuse saveAsTemplate pattern), `toggleWorkoutPrivacy` (auth, patches workout.isPublic, cascade-updates feedItems.isPublic). (4) Modify `finishWorkout` to read `workout.isPublic ?? true` instead of hardcoded `true`. (5) Add `includePrivate` param to `computePeriodSummary`, filter `w.isPublic !== false` when false. (6) Update `getProfileStats` to pass `includePrivate: false`. (7) Update all other callers of `computePeriodSummary` to pass `includePrivate: true`. (8) Add `isPublic` arg to `createWorkout`. (9) Add test helpers: `testShareWorkout`, `testGetSharedWorkout`, `testCloneAsTemplate`, `testCreateWorkoutWithPrivacy`, `testToggleWorkoutPrivacy`. (10) Update `testFinishWorkout` to read `workout.isPublic ?? true`. (11) Manually add sharing module to `_generated/api.d.ts`.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
  - Done when: All new functions type-check, finishWorkout reads workout.isPublic, computePeriodSummary has includePrivate param, all test helpers exist

- [x] **T02: Write and structure verify-s03-m03.ts verification script** `est:30m` ✅
  - Why: Proves the entire privacy and sharing contract — this is the authoritative stopping condition for the slice
  - Files: `packages/backend/scripts/verify-s03-m03.ts`
  - Do: Write 15-check verification script using established ConvexHttpClient pattern with 3 test users (USER_A = author, USER_B = follower/cloner, USER_C = block target). Checks SH-01 through SH-15 as defined in Verification section. Uses test helpers from T01 for all data setup and inspection. Cleanup on entry and exit.
  - Verify: `tsc --noEmit -p packages/backend/convex/tsconfig.json` compiles script's imports; script structure matches established pattern
  - Done when: Script has 15 checks covering all privacy gates and sharing flows, imports compile, follows established verify script pattern

- [x] **T03: Build /shared/[id] page, privacy toggle UI, and share button on web** `est:35m` ✅
  - Why: User-facing UI for sharing and privacy — the public share page is the first unauthenticated Convex query consumer in the app
  - Files: `apps/web/src/app/shared/[id]/page.tsx`, `apps/web/src/middleware.ts`, `apps/web/src/components/sharing/SharedWorkoutView.tsx`, `apps/web/src/components/sharing/CloneButton.tsx`, `apps/web/src/components/sharing/PrivacyToggle.tsx`, `apps/web/src/components/sharing/ShareButton.tsx`
  - Do: (1) Exclude `/shared(.*)` from Clerk middleware isProtectedRoute matcher. (2) Create `/shared/[id]/page.tsx` — uses `useQuery(api.sharing.getSharedWorkout, { feedItemId })` without auth dependency, renders workout name, exercises with sets, duration, PRs. Shows `CloneButton` only if user is authenticated. Shows "Workout not available" for null response. Data attribute: `data-shared-workout`. (3) Create `SharedWorkoutView` component — full exercise list with set details (weight, reps), author info, duration badge. Reuses FeedItem visual pattern but with expanded exercise detail. (4) Create `CloneButton` — calls `cloneSharedWorkoutAsTemplate`, shows success toast/redirect to /templates. Data attribute: `data-clone-button`. (5) Create `PrivacyToggle` component — switch/toggle that calls `toggleWorkoutPrivacy`. Data attribute: `data-privacy-toggle`. (6) Create `ShareButton` component — calls `shareWorkout`, copies `/shared/[feedItemId]` to clipboard. Data attribute: `data-share-button`. (7) Add PrivacyToggle to workout creation form (createWorkout args now accept isPublic). (8) Add ShareButton to completed workout cards/detail.
  - Verify: `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors; data attributes present in source
  - Done when: `/shared/[id]` route exists and is excluded from middleware, all 4 components created with data attributes, privacy toggle wired to createWorkout/toggleWorkoutPrivacy, share button wired to shareWorkout

## Files Likely Touched

- `packages/backend/convex/schema.ts` — isPublic on workouts, workout_shared in feedItemType
- `packages/backend/convex/sharing.ts` — NEW: shareWorkout, getSharedWorkout, cloneSharedWorkoutAsTemplate, toggleWorkoutPrivacy
- `packages/backend/convex/workouts.ts` — finishWorkout reads workout.isPublic, createWorkout accepts isPublic arg
- `packages/backend/convex/analytics.ts` — computePeriodSummary gains includePrivate param
- `packages/backend/convex/profiles.ts` — getProfileStats passes includePrivate: false
- `packages/backend/convex/testing.ts` — 5+ new test helpers, testFinishWorkout updated
- `packages/backend/convex/_generated/api.d.ts` — sharing module added
- `packages/backend/scripts/verify-s03-m03.ts` — NEW: 15-check verification script
- `apps/web/src/middleware.ts` — /shared excluded from protection
- `apps/web/src/app/shared/[id]/page.tsx` — NEW: public share page
- `apps/web/src/components/sharing/SharedWorkoutView.tsx` — NEW
- `apps/web/src/components/sharing/CloneButton.tsx` — NEW
- `apps/web/src/components/sharing/PrivacyToggle.tsx` — NEW
- `apps/web/src/components/sharing/ShareButton.tsx` — NEW
