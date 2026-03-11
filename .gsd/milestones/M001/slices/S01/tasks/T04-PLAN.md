---
estimated_steps: 4
estimated_files: 2
---

# T04: End-to-end verification — seed, query, and browse

**Slice:** S01 — Convex Schema & Exercise Library
**Milestone:** M001

## Description

Final verification task that proves all three owned requirements (R001, R010, R023) are met. Write a verification script that exercises the Convex functions programmatically, then verify the web UI end-to-end in the browser. Fix any issues found during verification.

## Steps

1. Create `packages/backend/scripts/verify-s01.ts` — a Node script using the Convex JS client that:
   - Connects to the Convex deployment (reads `CONVEX_URL` from env or `.env.local`)
   - Queries `listExercises({})` and asserts result count >= 100 (R001)
   - Queries `listExercises({ primaryMuscleGroup: "chest" })` and asserts all results have `primaryMuscleGroup === "chest"` (R010)
   - Queries `listExercises({ equipment: "barbell" })` and asserts all results have `equipment === "barbell"` (R010)
   - Queries `listExercises({ searchQuery: "press" })` and asserts results contain "press" in name (R010)
   - Queries `listExercises({ primaryMuscleGroup: "chest", equipment: "barbell" })` and asserts combined filters work (R010)
   - Prints PASS/FAIL for each check with clear output

2. Run the verification script and confirm all assertions pass. If any fail, debug and fix the underlying query or seed data.

3. Browser verification for R023 (auth gating) and visual correctness:
   - Start the web dev server
   - Navigate to `/exercises` while signed out — confirm redirect to Clerk sign-in
   - Sign in and navigate to `/exercises` — confirm exercises render
   - Apply muscle group filter — confirm results change correctly
   - Apply equipment filter — confirm results change correctly
   - Type search query — confirm results filter by name
   - Check for console errors

4. Fix any issues discovered during verification. Update the verification script or UI code as needed to ensure all checks pass cleanly.

## Must-Haves

- [ ] Verification script confirms >= 100 exercises in the database (R001)
- [ ] Verification script confirms muscle group filter returns only matching exercises (R010)
- [ ] Verification script confirms equipment filter returns only matching exercises (R010)
- [ ] Verification script confirms search returns exercises matching the query (R010)
- [ ] Verification script confirms combined filters work correctly (R010)
- [ ] Browser confirms auth-gated route redirects unauthenticated users (R023)
- [ ] Browser confirms exercise list renders and filters work visually
- [ ] No console errors during browser verification

## Verification

- `npx tsx packages/backend/scripts/verify-s01.ts` — all assertions pass
- Browser: all visual checks pass as described in steps
- `pnpm turbo typecheck` still passes after any fixes

## Observability Impact

- Signals added/changed: Verification script provides structured PASS/FAIL output for each assertion — serves as a regression check for future agents
- How a future agent inspects this: Re-run `verify-s01.ts` to check exercise data integrity; use browser to verify UI state; check Convex dashboard for data and function logs
- Failure state exposed: Each assertion prints the expected vs actual value on failure; script exits with non-zero code on any failure

## Inputs

- `packages/backend/convex/exercises.ts` — query functions to exercise
- `packages/backend/convex/seed.ts` — seed must have been run
- `apps/web/src/app/exercises/page.tsx` — UI to verify in browser
- `apps/web/src/middleware.ts` — auth protection to verify

## Expected Output

- `packages/backend/scripts/verify-s01.ts` — verification script with assertions for R001, R010, R023
- All 3 requirements (R001, R010, R023) verified and passing
- Any bug fixes applied to query functions or UI code
