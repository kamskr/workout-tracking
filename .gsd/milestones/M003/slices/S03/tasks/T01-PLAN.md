---
estimated_steps: 8
estimated_files: 7
---

# T01: Add isPublic to workouts, extend schema, create sharing.ts with privacy/share/clone mutations and queries

**Slice:** S03 — Workout Sharing & Privacy
**Milestone:** M003

## Description

Build the complete backend contract for workout sharing and privacy. This is the largest task in S03 — it adds the `isPublic` field to workouts, extends the schema validators, creates a new `sharing.ts` module with 4 Convex functions, modifies existing functions for privacy correctness, and adds all test helpers needed for verification.

The critical privacy enforcement points are:
1. `finishWorkout` must read `workout.isPublic ?? true` instead of hardcoding `true`
2. `computePeriodSummary` must filter by `isPublic` when called for cross-user views (profile stats) but include private for the user's own analytics
3. `getSharedWorkout` must check BOTH the feedItem and workout `isPublic` as defense-in-depth
4. `toggleWorkoutPrivacy` must cascade-update feed items when workout privacy changes

## Steps

1. **Schema changes:** Add `isPublic: v.optional(v.boolean())` to workouts table. Add `v.literal("workout_shared")` to the `feedItemType` union validator.

2. **Create `sharing.ts` module** with 4 Convex functions:
   - `shareWorkout` (mutation, auth required): Validates workout exists, belongs to user, is completed, and `isPublic !== false`. Creates a `workout_shared` feedItem. Returns the feedItemId as share token. Log: `[Share] Created workout_shared feed item {feedItemId} for workout {workoutId}`.
   - `getSharedWorkout` (query, NO auth required): Accepts `feedItemId`. Loads feedItem, checks `isPublic`. Loads workout, checks `workout.isPublic !== false`. If caller is authenticated (via optional `ctx.auth.getUserIdentity()`), checks blocks table. Joins workout → workoutExercises (take 50) → exercises → sets (take 20 per exercise). Resolves author profile. Returns full detail or `null`.
   - `cloneSharedWorkoutAsTemplate` (mutation, auth required): Accepts `feedItemId` and template `name`. Loads shared workout via same checks as getSharedWorkout (isPublic, blocks). Reads workoutExercises+sets, creates template+templateExercises owned by caller (reuse saveAsTemplate pattern: `targetSets = sets.length`, `targetReps = first set's reps`). Log: `[Clone] User {userId} cloned shared workout {workoutId} as template {templateId}`. Returns templateId.
   - `toggleWorkoutPrivacy` (mutation, auth required): Accepts workoutId and `isPublic` boolean. Patches workout. Queries feedItems by_workoutId, patches each feedItem's `isPublic`. Log: `[Privacy] Updated isPublic to {value} on workout {workoutId} and {count} feed items`.

3. **Modify `finishWorkout` in workouts.ts:** Change `isPublic: true` (line ~80) to `isPublic: workout.isPublic ?? true`. Add `isPublic: v.optional(v.boolean())` arg to `createWorkout`.

4. **Modify `computePeriodSummary` in analytics.ts:** Add `includePrivate: boolean = true` parameter. When `includePrivate` is `false`, add filter `w.isPublic !== false` to the completedWorkouts filter. Default `true` ensures backward compatibility for all existing callers.

5. **Modify `getProfileStats` in profiles.ts:** Pass `includePrivate: false` to `computePeriodSummary` so public profile stats exclude private workouts. Keep `testGetProfileStats` also passing `false` (it mirrors the public-facing behavior).

6. **Update all other `computePeriodSummary` callers** to explicitly pass `true`: `getWeeklySummary`, `getMonthlySummary`, `testGetWeeklySummary`, `testGetMonthlySummary`.

7. **Add test helpers to testing.ts:**
   - `testCreateWorkoutWithPrivacy` — createWorkout variant accepting `isPublic` arg
   - `testShareWorkout` — mirrors shareWorkout mutation
   - `testGetSharedWorkout` — mirrors getSharedWorkout query (no auth check)
   - `testCloneAsTemplate` — mirrors cloneSharedWorkoutAsTemplate
   - `testToggleWorkoutPrivacy` — mirrors toggleWorkoutPrivacy
   - Update `testFinishWorkout` to read `workout.isPublic ?? true` instead of hardcoded `true`
   - Update `testCreateFeedItem` to accept optional `type` and `isPublic` args

8. **Update `_generated/api.d.ts`:** Add `import type * as sharing from "../sharing.js"` and add `sharing: typeof sharing` to the `fullApi` modules object.

## Must-Haves

- [ ] `isPublic: v.optional(v.boolean())` on workouts table in schema
- [ ] `"workout_shared"` in feedItemType validator
- [ ] `shareWorkout` mutation creates workout_shared feedItem, returns feedItemId
- [ ] `getSharedWorkout` query works without auth, checks isPublic on feedItem AND workout, joins full detail
- [ ] `getSharedWorkout` block-checks authenticated callers
- [ ] `cloneSharedWorkoutAsTemplate` creates template owned by caller with correct exercise structure
- [ ] `toggleWorkoutPrivacy` patches workout AND cascade-updates feed items
- [ ] `finishWorkout` reads `workout.isPublic ?? true` (not hardcoded)
- [ ] `testFinishWorkout` reads `workout.isPublic ?? true` (mirrors production)
- [ ] `computePeriodSummary` has `includePrivate` param, defaults true
- [ ] `getProfileStats` passes `includePrivate: false`
- [ ] All 5 test helpers created and type-check
- [ ] `createWorkout` accepts optional `isPublic` arg

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `sharing.ts` exports 4 functions: shareWorkout, getSharedWorkout, cloneSharedWorkoutAsTemplate, toggleWorkoutPrivacy
- `finishWorkout` contains `workout.isPublic ?? true` (not `isPublic: true`)
- `testFinishWorkout` contains `workout.isPublic ?? true` (not `isPublic: true`)
- `computePeriodSummary` signature includes `includePrivate`
- `getProfileStats` passes `includePrivate: false` (or `false` equivalent)
- All test helpers present in testing.ts: testShareWorkout, testGetSharedWorkout, testCloneAsTemplate, testCreateWorkoutWithPrivacy, testToggleWorkoutPrivacy

## Observability Impact

- Signals added: `[Share]`, `[Privacy]`, `[Clone]` console.log messages in sharing.ts mutations for tracing share/privacy/clone actions
- How a future agent inspects this: `testGetSharedWorkout` query returns full shared workout state (or null for private/blocked/missing); `testToggleWorkoutPrivacy` can flip privacy and caller can verify feed item update via `testGetFeed`
- Failure state exposed: `shareWorkout` throws "Workout is private — cannot share" for private workouts; `getSharedWorkout` returns null (not error) for private/blocked/missing; `cloneSharedWorkoutAsTemplate` throws "Shared workout not available" for inaccessible workouts

## Inputs

- `packages/backend/convex/schema.ts` — Current schema with workouts table (needs isPublic) and feedItemType (needs workout_shared)
- `packages/backend/convex/workouts.ts` — finishWorkout with hardcoded `isPublic: true` at line ~80
- `packages/backend/convex/analytics.ts` — computePeriodSummary without includePrivate parameter
- `packages/backend/convex/profiles.ts` — getProfileStats calling computePeriodSummary without privacy filter
- `packages/backend/convex/templates.ts` — saveAsTemplate pattern to replicate for clone flow
- `packages/backend/convex/testing.ts` — Existing test helpers pattern, testFinishWorkout with hardcoded isPublic: true
- S03-RESEARCH.md — Privacy enforcement checklist, pitfall analysis, don't-hand-roll table

## Expected Output

- `packages/backend/convex/schema.ts` — workouts table has isPublic field, feedItemType has workout_shared
- `packages/backend/convex/sharing.ts` — NEW: 4 Convex functions for sharing/privacy/cloning
- `packages/backend/convex/workouts.ts` — finishWorkout reads workout.isPublic, createWorkout accepts isPublic
- `packages/backend/convex/analytics.ts` — computePeriodSummary has includePrivate param
- `packages/backend/convex/profiles.ts` — getProfileStats passes includePrivate: false
- `packages/backend/convex/testing.ts` — 5+ new test helpers, testFinishWorkout updated
- `packages/backend/convex/_generated/api.d.ts` — sharing module registered
