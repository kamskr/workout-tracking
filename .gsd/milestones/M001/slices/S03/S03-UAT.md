# S03: Full Set Tracking, Supersets & Previous Performance — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: All three features (R003, R005, R007) are proven at the integration level via verify-s03.ts (12 checks) + full typecheck across 3 packages. The slice plan explicitly notes "Human/UAT required: no" — programmatic verification covers the backend contract and type-level UI correctness. Browser-based testing is blocked by Clerk dev mode CAPTCHA.

## Preconditions

- Convex local dev backend running: `cd packages/backend && npx convex dev`
- Port 3210 available and responding
- Exercise seed data loaded (from S01)

## Smoke Test

Run `npx tsx packages/backend/scripts/verify-s03.ts` — all 12 checks should pass in one run. This confirms RPE/tempo/notes round-trip, superset grouping mutations, and previous performance query all work end-to-end.

## Test Cases

### 1. RPE/Tempo/Notes Round-Trip (R003)

1. Run `npx tsx packages/backend/scripts/verify-s03.ts`
2. Observe check "[R003] Log set with rpe/tempo/notes round-trips correctly" passes
3. **Expected:** Set created with rpe=8, tempo="3-1-2-0", notes="felt good" can be read back with identical values

### 2. RPE Partial Update (R003)

1. Run `npx tsx packages/backend/scripts/verify-s03.ts`
2. Observe check "[R003] UpdateSet partial update: rpe=9, notes changed, tempo preserved" passes
3. **Expected:** Updating rpe and notes preserves the existing tempo value

### 3. RPE Validation Boundary (R003)

1. Run `npx tsx packages/backend/scripts/verify-s03.ts`
2. Observe checks "[R003] RPE=11 is rejected" and "[R003] RPE=0 is rejected" pass
3. **Expected:** Server throws "RPE must be between 1 and 10" for out-of-range values

### 4. Superset Group Set/Clear (R005)

1. Run `npx tsx packages/backend/scripts/verify-s03.ts`
2. Observe checks "[R005] setSupersetGroup sets groupId on both exercises" and "[R005] clearSupersetGroup clears one, other retains groupId" pass
3. **Expected:** setSupersetGroup assigns the same groupId to both exercises; clearSupersetGroup removes it from one while the other retains it

### 5. Previous Performance With Data (R007)

1. Run `npx tsx packages/backend/scripts/verify-s03.ts`
2. Observe checks for getPreviousPerformance (returns data, correct sets, includes exerciseName/workoutDate/workoutName)
3. **Expected:** After completing a workout with 3 sets on an exercise, querying getPreviousPerformance for that exercise returns all 3 sets with correct weights/reps plus metadata

### 6. Previous Performance Null Case (R007)

1. Run `npx tsx packages/backend/scripts/verify-s03.ts`
2. Observe check "[R007] getPreviousPerformance returns null for never-done exercise" passes
3. **Expected:** Querying an exercise the user has never logged returns null (not an error)

### 7. Full Typecheck (cross-cutting)

1. Run `pnpm turbo typecheck`
2. **Expected:** All 3 packages (backend, web-app, native-app) compile with zero errors. This confirms UI components correctly reference the extended mutation/query args.

## Edge Cases

### RPE Boundary Values

1. verify-s03.ts tests RPE=0 (below minimum) and RPE=11 (above maximum)
2. **Expected:** Both rejected with "RPE must be between 1 and 10"

### First-Time Exercise (No Previous Performance)

1. verify-s03.ts queries getPreviousPerformance for an exercise that has never been logged
2. **Expected:** Returns null, not an error. Web UI renders "First time! 🎉" badge.

### Single-Member Superset

1. Create a superset with 2 exercises, then remove one via clearSupersetGroup
2. **Expected:** The remaining exercise still has the groupId. The UI shows it in a superset container with a "Remove from superset" button. This is a known acceptable edge case.

## Failure Signals

- `npx tsx packages/backend/scripts/verify-s03.ts` exits with code 1 and shows FAIL checks
- `pnpm turbo typecheck` reports type errors in any of the 3 packages
- `npx tsx packages/backend/scripts/verify-s02.ts` fails (regression in existing S02 functionality)
- Convex dashboard shows error logs for sets or workoutExercises mutations

## Requirements Proved By This UAT

- R003 — Full Set Tracking: RPE/tempo/notes persist via logSet/updateSet, RPE validated 1-10, partial update preserves fields. Proven by 4 verify-s03 checks + typecheck confirming UI→mutation arg binding.
- R005 — Superset Grouping: setSupersetGroup and clearSupersetGroup work correctly on workoutExercises. Proven by 2 verify-s03 checks + typecheck confirming UI→mutation binding.
- R007 — Previous Performance: getPreviousPerformance returns correct structured data from most recent completed workout, and null for new exercises. Proven by 6 verify-s03 checks + typecheck confirming UI→query binding.

## Not Proven By This UAT

- Visual rendering of RPE/tempo/notes inputs in the browser (Clerk CAPTCHA blocks automated testing)
- Visual rendering of superset grouping containers and colors in the browser
- Visual rendering of "Last: 3×10 @ 60 kg" previous performance text in the browser
- Interactive UX: onBlur save behavior, collapsible notes row, selection mode toggle, floating button appearance
- R005 partial: "Grouped exercises share rest timers" — deferred to S04
- Mobile (React Native) UI for any S03 features — deferred to S06

## Notes for Tester

- All checks are fully automated via `verify-s03.ts`. No manual steps required.
- If you want to visually verify the UI, you need to sign in via Clerk at `http://localhost:3000`, start a workout, and inspect the SetRow inputs and exercise headers. This requires a real Clerk account on the dev instance.
- The verification script cleans up its own test data after running.
- Run `verify-s02.ts` alongside `verify-s03.ts` to confirm no regressions in the base workout CRUD.
