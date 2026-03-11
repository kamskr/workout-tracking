---
id: T01
parent: S03
milestone: M003
provides:
  - isPublic field on workouts table (schema change)
  - workout_shared feed item type (schema change)
  - sharing.ts module with 4 Convex functions (shareWorkout, getSharedWorkout, cloneSharedWorkoutAsTemplate, toggleWorkoutPrivacy)
  - Privacy-aware finishWorkout (reads workout.isPublic ?? true)
  - computePeriodSummary includePrivate parameter
  - getProfileStats passes includePrivate: false for public profile stats
  - 5 new test helpers + updated testCreateWorkout/testCreateFeedItem/testFinishWorkout
  - sharing module registered in _generated/api.d.ts
key_files:
  - packages/backend/convex/schema.ts
  - packages/backend/convex/sharing.ts
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/analytics.ts
  - packages/backend/convex/profiles.ts
  - packages/backend/convex/testing.ts
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Used workout.isPublic ?? true (undefined = public) per D073 convention
  - getSharedWorkout returns null (not error) for private/blocked/missing — consistent null-or-data pattern
  - cloneSharedWorkoutAsTemplate reuses saveAsTemplate pattern (targetSets = sets.length, targetReps = first set's reps)
  - After TypeScript narrowing from isPublic === false guard, used workout.isPublic ?? true instead of workout.isPublic !== false to avoid TS2367
patterns_established:
  - Defense-in-depth privacy check: check BOTH feedItem.isPublic AND workout.isPublic in getSharedWorkout
  - Cascade privacy update: toggleWorkoutPrivacy patches workout AND all associated feed items
  - includePrivate parameter pattern on computePeriodSummary for privacy-aware analytics
observability_surfaces:
  - "[Share] Created workout_shared feed item {feedItemId} for workout {workoutId}" — console.log in shareWorkout/testShareWorkout
  - "[Privacy] Updated isPublic to {value} on workout {workoutId} and {count} feed items" — console.log in toggleWorkoutPrivacy/testToggleWorkoutPrivacy
  - "[Clone] User {userId} cloned shared workout {workoutId} as template {templateId}" — console.log in cloneSharedWorkoutAsTemplate/testCloneAsTemplate
  - testGetSharedWorkout query returns full shared workout state or null for private/blocked/missing
duration: 20m
verification_result: passed
completed_at: 2026-03-11T16:28:00+01:00
blocker_discovered: false
---

# T01: Add isPublic to workouts, extend schema, create sharing.ts with privacy/share/clone mutations and queries

**Built complete backend contract for workout sharing and privacy: isPublic field on workouts, 4 sharing functions, privacy-aware feed item creation, includePrivate analytics parameter, and 5 test helpers.**

## What Happened

1. **Schema changes:** Added `isPublic: v.optional(v.boolean())` to workouts table. Added `v.literal("workout_shared")` to feedItemType union validator.

2. **Created `sharing.ts`** with 4 Convex functions:
   - `shareWorkout` — auth mutation, validates workout ownership/status/privacy, creates workout_shared feedItem, returns feedItemId
   - `getSharedWorkout` — NO auth query, checks isPublic on both feedItem AND workout (defense-in-depth), optional block check for authenticated callers, joins full workout detail with exercises/sets/author profile
   - `cloneSharedWorkoutAsTemplate` — auth mutation, same isPublic/block checks, creates template+templateExercises owned by caller using saveAsTemplate pattern
   - `toggleWorkoutPrivacy` — auth mutation, patches workout.isPublic, cascade-updates all feedItems for that workout

3. **Modified `finishWorkout`** to read `workout.isPublic ?? true` instead of hardcoded `true`. Added `isPublic: v.optional(v.boolean())` arg to `createWorkout`.

4. **Modified `computePeriodSummary`** to accept `includePrivate: boolean = true` parameter. When false, filters out workouts where `isPublic === false`.

5. **Modified `getProfileStats`** to pass `includePrivate: false` so public profile stats exclude private workouts.

6. **Updated all other `computePeriodSummary` callers** to explicitly pass `true`: getWeeklySummary, getMonthlySummary, testGetWeeklySummary, testGetMonthlySummary.

7. **Added 5 test helpers** to testing.ts: testCreateWorkoutWithPrivacy, testShareWorkout, testGetSharedWorkout, testCloneAsTemplate, testToggleWorkoutPrivacy. Updated testFinishWorkout to read `workout.isPublic ?? true`. Updated testCreateFeedItem to accept optional `type` and `isPublic` args. Updated testCreateWorkout to accept optional `isPublic` arg.

8. **Updated `_generated/api.d.ts`** with sharing module import and registration.

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — **0 errors** ✅
- `tsc --noEmit -p apps/web/tsconfig.json` — **0 new errors** (pre-existing `clsx` only) ✅
- `sharing.ts` exports 4 functions: shareWorkout, getSharedWorkout, cloneSharedWorkoutAsTemplate, toggleWorkoutPrivacy ✅
- `finishWorkout` contains `workout.isPublic ?? true` (not hardcoded `isPublic: true`) ✅
- `testFinishWorkout` contains `workout.isPublic ?? true` (not hardcoded `isPublic: true`) ✅
- `computePeriodSummary` signature includes `includePrivate` parameter with default `true` ✅
- `getProfileStats` passes `includePrivate: false` ✅
- All 5 test helpers present: testShareWorkout, testGetSharedWorkout, testCloneAsTemplate, testCreateWorkoutWithPrivacy, testToggleWorkoutPrivacy ✅
- `createWorkout` accepts optional `isPublic` arg ✅
- `testCreateFeedItem` accepts optional `type` and `isPublic` args ✅
- Sharing module registered in `_generated/api.d.ts` ✅

### Slice verification status (T01 is first of 3 tasks):
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — ✅ PASS
- `tsc --noEmit -p apps/web/tsconfig.json` — ✅ PASS (pre-existing clsx only)
- `npx tsx packages/backend/scripts/verify-s03-m03.ts` — ⏳ Not yet written (T02)
- SH-01 through SH-15 checks — ⏳ Pending T02 verification script

## Diagnostics

- **testGetSharedWorkout** query: inspect any shared workout's full state or verify null for private/blocked/missing
- **testShareWorkout** mutation: create share records programmatically for testing
- **testToggleWorkoutPrivacy** mutation: flip privacy and verify cascade via testGetFeed
- Console signals: `[Share]`, `[Privacy]`, `[Clone]` logs in sharing.ts and test helpers
- Error contracts: shareWorkout throws "Workout is private — cannot share"; cloneSharedWorkoutAsTemplate throws "Shared workout not available"; getSharedWorkout returns null (not error)

## Deviations

- Used `workout.isPublic ?? true` instead of `workout.isPublic !== false` in shareWorkout/testShareWorkout after the `isPublic === false` guard — TypeScript strict mode (TS2367) flags `!== false` as unintentional after narrowing removes `false` from the type. Semantically identical; `?? true` is clearer.

## Known Issues

None.

## Files Created/Modified

- `packages/backend/convex/schema.ts` — Added `isPublic: v.optional(v.boolean())` to workouts table, `v.literal("workout_shared")` to feedItemType
- `packages/backend/convex/sharing.ts` — **NEW**: 4 Convex functions for sharing/privacy/cloning with observability logs
- `packages/backend/convex/workouts.ts` — finishWorkout reads `workout.isPublic ?? true`, createWorkout accepts `isPublic` arg
- `packages/backend/convex/analytics.ts` — computePeriodSummary gains `includePrivate` parameter (default true)
- `packages/backend/convex/profiles.ts` — getProfileStats passes `includePrivate: false`
- `packages/backend/convex/testing.ts` — 5 new test helpers, updated testFinishWorkout/testCreateWorkout/testCreateFeedItem
- `packages/backend/convex/_generated/api.d.ts` — sharing module registered
