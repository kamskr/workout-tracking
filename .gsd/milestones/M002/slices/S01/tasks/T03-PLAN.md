---
estimated_steps: 5
estimated_files: 4
---

# T03: Wire PR badge into web WorkoutExerciseItem and verify end-to-end

**Slice:** S01 — Personal Records — Detection & Live Notification
**Milestone:** M002

## Description

Close the integration loop by adding a 🏆 PR badge to the web active workout screen. The badge uses `useQuery(api.personalRecords.getWorkoutPRs)` to reactively display PRs for the current workout. Also handle `logSet` return type change in the web UI (it now returns `{ setId, prs }` instead of just setId). Run all verification: verify-s01-m02.ts (all checks), typecheck, M001 regression scripts, and a live browser check.

## Steps

1. **Thread `workoutId` into `WorkoutExerciseItem`** — Check how `WorkoutExerciseItem` gets its data. It receives `ExerciseItemData` which has `workoutExercise.workoutId` — but looking at the type, `workoutId` is on the `workoutExercise` object inside the `data` prop (it's part of the `workoutExercises` document). Confirm this. If `workoutId` is available via `data.workoutExercise`, no prop threading needed — extract it directly.

2. **Add `useQuery` for workout PRs** — In `WorkoutExerciseItem`, add `useQuery(api.personalRecords.getWorkoutPRs, { workoutId })`. This subscribes to all PRs for the workout. Filter the results client-side for PRs matching `data.workoutExercise.exerciseId`. Memoize or keep the filter cheap (typically 0-5 PRs per workout).

3. **Render 🏆 PR badge** — If filtered PRs exist for this exercise, render a badge below/beside the exercise name. Show PR type labels: "🏆 Weight PR", "🏆 Volume PR", "🏆 Reps PR" (or combined). Style per D007: subtle, clean background (light amber/gold), small text. The badge should animate in (simple CSS transition/opacity) since it appears reactively after a set is logged.

4. **Handle `logSet` return type change** — Check if `handleAddSet` in `WorkoutExerciseItem` or any other web component uses the return value of the `logSet` mutation. If it does (e.g. storing the setId), update to destructure `{ setId, prs }`. If not used, no change needed. Also check `SetRow.tsx` and any other consumers of `api.sets.logSet`.

5. **Run full verification suite** — Execute in order:
   - `pnpm turbo typecheck --force` — 0 errors
   - `npx tsx packages/backend/scripts/verify-s01-m02.ts` — all checks pass
   - `npx tsx packages/backend/scripts/verify-s02.ts` — passes (no regression)
   - `npx tsx packages/backend/scripts/verify-s03.ts` — passes
   - `npx tsx packages/backend/scripts/verify-s04.ts` — passes
   - `npx tsx packages/backend/scripts/verify-s05.ts` — passes
   - Start web dev server, navigate to active workout in browser, log a set with enough weight/reps to trigger a PR, verify 🏆 badge appears on the exercise card via `browser_assert` or `browser_find`.

## Must-Haves

- [ ] `WorkoutExerciseItem` subscribes to `getWorkoutPRs` and renders 🏆 badge for exercises with PRs
- [ ] Badge shows PR type (weight/volume/reps)
- [ ] Badge styled per D007 — clean, minimal, light amber/gold
- [ ] `logSet` return type change handled in all web consumers without breaking
- [ ] `verify-s01-m02.ts` — all checks pass
- [ ] `pnpm turbo typecheck --force` — 0 errors across all 3 packages
- [ ] All M001 verify scripts still pass (no regression)
- [ ] Live browser verification: PR badge appears during active workout

## Verification

- `pnpm turbo typecheck --force` — 0 errors
- `npx tsx packages/backend/scripts/verify-s01-m02.ts` — all ≥10 checks pass
- `npx tsx packages/backend/scripts/verify-s02.ts` — passes
- `npx tsx packages/backend/scripts/verify-s03.ts` — passes
- `npx tsx packages/backend/scripts/verify-s04.ts` — passes
- `npx tsx packages/backend/scripts/verify-s05.ts` — passes
- Browser: 🏆 badge visible on exercise card after logging a PR-triggering set

## Observability Impact

- Signals added/changed: The `getWorkoutPRs` subscription makes PR state visible in the browser React DevTools network tab — Convex subscriptions are inspectable in the Convex dashboard's "Functions" view.
- How a future agent inspects this: Open Convex dashboard → Functions → `personalRecords:getWorkoutPRs` to see subscription activity. Browser DevTools → React/Convex tab to see the query state. Or use `browser_evaluate` to check `document.querySelectorAll('[data-pr-badge]')` count.
- Failure state exposed: If `getWorkoutPRs` returns empty but PRs were expected, check `personalRecords` table in Convex dashboard for missing records (PR detection failure in `logSet`).

## Inputs

- `packages/backend/convex/personalRecords.ts` — `getWorkoutPRs` query from T02
- `packages/backend/convex/sets.ts` — `logSet` with PR detection from T02
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — existing component
- T02 output: all backend PR detection working, verify script mostly passing

## Expected Output

- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — updated with PR badge + `useQuery` subscription
- Possibly `apps/web/src/components/workouts/ActiveWorkout.tsx` or parent components — if `workoutId` prop threading is needed
- All verification scripts pass
- Live web demo works: 🏆 badge appears in realtime
