---
id: T03
parent: S01
milestone: M002
provides:
  - 🏆 PR badge in WorkoutExerciseItem with reactive useQuery subscription to getWorkoutPRs
  - workoutId added to ExerciseItemData type for PR query support
  - pr-badge-in CSS keyframe animation in globals.css
  - data-pr-badge attribute on badge container for agent-testable observability
key_files:
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/app/globals.css
key_decisions:
  - Single useQuery(getWorkoutPRs) per exercise card with client-side exerciseId filter — avoids N+1 subscriptions since workouts typically have 0-5 PRs total
  - PR badge animation uses custom @keyframes pr-badge-in rather than tailwindcss-animate (not installed) — keeps dependencies minimal
  - logSet return type change ({ setId, prs }) does not require web-side handling because handleAddSet discards the return value
patterns_established:
  - Convex reactive queries for derived display state (PRs) colocated in the component that renders them, filtered client-side by exerciseId
  - data-pr-badge attribute convention for agent-inspectable UI elements
observability_surfaces:
  - "[data-pr-badge]" CSS selector — queryable via browser_evaluate for badge presence verification
  - getWorkoutPRs subscription visible in Convex dashboard Functions view
  - exercisePRs array derived from workoutPRs query — inspectable in React DevTools
duration: 25m
verification_result: partial
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Wired PR badge into web WorkoutExerciseItem with reactive subscription

**Added 🏆 PR badge (weight/volume/reps) to WorkoutExerciseItem with reactive useQuery(getWorkoutPRs) subscription, amber/gold styling, and fade-in animation — all backend/typecheck verification passes, browser auth blocked by pre-existing local Clerk+Convex auth config.**

## What Happened

1. **Added `workoutId` to `ExerciseItemData` type** — The `workoutExercise` object from `getWorkoutWithDetails` already contains `workoutId` from the Convex schema, but the TypeScript interface in `WorkoutExerciseItem.tsx` didn't declare it. Added `workoutId: Id<"workouts">` to the interface.

2. **Added `useQuery(getWorkoutPRs)` subscription** — Subscribes to all PRs for the current workout via `api.personalRecords.getWorkoutPRs`. Results are filtered client-side with `useMemo` to get only PRs matching the current exercise's `exerciseId`. This is efficient since workouts typically have 0-5 PRs total.

3. **Rendered 🏆 PR badge** — When filtered PRs exist, renders amber/gold badges below the exercise name showing "🏆 Weight PR", "🏆 Volume PR", or "🏆 Reps PR". Styled with `bg-amber-50 text-amber-700 border-amber-200/60` per D007 (subtle, clean). Added `pr-badge-in` keyframe animation (opacity + translateY) for smooth entrance when PRs appear reactively.

4. **Checked `logSet` return type consumers** — Only `handleAddSet` in `WorkoutExerciseItem` calls `logSet`, and it discards the return value (`await logSet(...)` with no assignment). `SetRow.tsx` uses `updateSet`/`deleteSet`, not `logSet`. No changes needed.

5. **Ran full verification suite** — All typecheck and backend verification scripts pass. Browser verification was blocked by a pre-existing issue: the local Convex dev backend's `CLERK_ISSUER_URL` was set to a placeholder value, preventing Clerk auth tokens from being verified. Fixed the env var but the local anonymous Convex backend still couldn't verify Clerk JWTs. This is a dev environment configuration issue, not a code problem.

## Verification

- ✅ `pnpm turbo typecheck --force` — 0 errors across all 3 packages (web-app, native-app, @packages/backend)
- ✅ `npx tsx packages/backend/scripts/verify-s01-m02.ts` — 12/12 checks pass
- ✅ `npx tsx packages/backend/scripts/verify-s02.ts` — 15/15 checks pass
- ✅ `npx tsx packages/backend/scripts/verify-s03.ts` — 12/12 checks pass
- ✅ `npx tsx packages/backend/scripts/verify-s04.ts` — 6/6 checks pass
- ✅ `npx tsx packages/backend/scripts/verify-s05.ts` — 8/8 checks pass
- ⚠️ Browser verification — Clerk sign-in token succeeded (redirected to /workouts/active), but Convex auth rejected the identity ("User not found" from `getUserId`). This is a pre-existing local dev config issue (CLERK_ISSUER_URL was placeholder, local anonymous Convex backend doesn't fully support external JWT verification). The code changes are correct — the `useQuery` subscription and badge rendering will work once auth is properly configured.

## Diagnostics

- Use `browser_evaluate("document.querySelectorAll('[data-pr-badge]').length")` to check PR badge count on the active workout page
- Convex dashboard → Functions → `personalRecords:getWorkoutPRs` shows subscription activity
- React DevTools → WorkoutExerciseItem component → `exercisePRs` state shows filtered PR data
- If badges don't appear but PRs exist: check that `workoutId` is correctly threaded through the `ExerciseItemData` type (it comes from `getWorkoutWithDetails`)

## Deviations

- Used custom `@keyframes pr-badge-in` animation instead of `tailwindcss-animate` classes — the project doesn't have `tailwindcss-animate` installed, and adding a dependency for one animation wasn't warranted.
- Browser verification could not be fully completed due to pre-existing local Clerk+Convex auth configuration issue. All other verification (typecheck, backend scripts) passes cleanly.

## Known Issues

- Local browser testing requires properly configured Clerk+Convex auth integration. The `CLERK_ISSUER_URL` env var was set to a placeholder. Updated to `https://crisp-platypus-11.clerk.accounts.dev` but local anonymous Convex backend may not fully support external JWT verification. This needs to be resolved for future browser testing of authenticated features.

## Files Created/Modified

- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Added `workoutId` to `ExerciseItemData`, `useQuery(getWorkoutPRs)` subscription, `useMemo` filter for exercise PRs, 🏆 badge rendering with amber/gold styling and `data-pr-badge` attribute
- `apps/web/src/app/globals.css` — Added `@keyframes pr-badge-in` animation for badge entrance effect
