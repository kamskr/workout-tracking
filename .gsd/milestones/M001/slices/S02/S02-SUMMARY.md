---
id: S02
parent: M001
milestone: M001
provides:
  - Complete Convex CRUD layer for workouts, workout exercises, sets, and user preferences (17 auth-gated functions)
  - Programmatic verification script (verify-s02.ts) proving R002, R008, R009 at integration level (15 checks)
  - Unit conversion utility (kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration)
  - Workout history page at /workouts with loading/empty/populated states
  - Active workout page at /workouts/active with exercise picker, set logging, duration timer, unit toggle, finish flow
  - Test helpers (convex/testing.ts) for auth-free backend verification
requires:
  - slice: S01
    provides: "convex/schema.ts (all table definitions + indexes), convex/exercises.ts (listExercises for picker), convex/lib/auth.ts (getUserId), web app component patterns and styling"
affects:
  - S03
  - S04
  - S05
  - S06
key_files:
  - packages/backend/convex/workouts.ts
  - packages/backend/convex/workoutExercises.ts
  - packages/backend/convex/sets.ts
  - packages/backend/convex/userPreferences.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s02.ts
  - apps/web/src/lib/units.ts
  - apps/web/src/app/workouts/page.tsx
  - apps/web/src/app/workouts/active/page.tsx
  - apps/web/src/components/workouts/WorkoutHistory.tsx
  - apps/web/src/components/workouts/WorkoutCard.tsx
  - apps/web/src/components/workouts/ActiveWorkout.tsx
  - apps/web/src/components/workouts/ActiveWorkoutHeader.tsx
  - apps/web/src/components/workouts/WorkoutExerciseList.tsx
  - apps/web/src/components/workouts/WorkoutExerciseItem.tsx
  - apps/web/src/components/workouts/SetRow.tsx
  - apps/web/src/components/workouts/ExercisePicker.tsx
  - apps/web/src/components/workouts/UnitToggle.tsx
key_decisions:
  - D017: Test helpers use public mutation/query with testUserId (ConvexHttpClient can't call internal functions)
  - D018: Active workout resumption — UI checks for existing inProgress workout before creating
  - D019: Duration computed server-side in finishWorkout
  - D020: WorkoutCard self-fetches exercise count via useQuery
  - D021: SetRow uses local state with onBlur save pattern — weight conversion at input boundary
  - D022: ActiveWorkout uses useRef guard against double-creation in React strict mode
patterns_established:
  - Ownership verification helper pattern (verifyWorkoutOwnershipAndStatus, verifySetOwnership)
  - Cascade delete pattern for parent→child relationships
  - Auto-computed ordinals (setNumber from count+1, exercise order from count)
  - Input boundary conversion pattern — convert units at component boundary only
  - Auto-create-or-resume pattern for active workout
  - Test helper pattern with public Convex functions accepting testUserId
observability_surfaces:
  - "npx tsx packages/backend/scripts/verify-s02.ts — 15 named checks with PASS/FAIL, exit 0/1"
  - All mutations throw descriptive errors: "User not found", "Workout not found", "does not belong to user", "not in progress"
  - Convex dashboard tables: workouts, workoutExercises, sets, userPreferences
  - CLI: npx convex run workouts:listWorkouts
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T04-SUMMARY.md
duration: ~90m across 4 tasks
verification_result: passed
completed_at: 2026-03-11
---

# S02: Workout CRUD & Active Workout Session

**Built complete workout lifecycle backend (17 Convex functions) and web UI (8 components across 2 routes) with programmatic verification proving R002, R008, R009.**

## What Happened

### T01: Convex backend (12m)
Created 4 Convex function files with 17 auth-gated functions: `workouts.ts` (7: create, getActive, get, getWithDetails, list, finish, delete), `workoutExercises.ts` (4: add, remove, reorder, list), `sets.ts` (4: log, update, delete, list), `userPreferences.ts` (2: get, setUnit). Established ownership verification helpers and cascade delete patterns. All functions deploy and compile cleanly.

### T02: Verification script (15m)
Built `convex/testing.ts` with 9 test helper functions bypassing auth via testUserId parameter, and `scripts/verify-s02.ts` with 15 named checks covering R002 (workout CRUD lifecycle), R008 (unit preference), and R009 (duration tracking). All 15 checks pass against live local Convex backend.

### T03: Unit conversion + workout history (15m)
Created `units.ts` with pure conversion functions (kgToLbs, lbsToKg, formatWeight, displayWeight, formatDuration), all tested programmatically. Built `/workouts` route with `WorkoutHistory` component (loading/empty/populated states) and `WorkoutCard` (date, duration badge, exercise count, delete).

### T04: Active workout page (45m)
Built 8 components for `/workouts/active`: `ActiveWorkout` (auto-create/resume orchestrator), `ActiveWorkoutHeader` (name, running timer, unit toggle, finish button), `WorkoutExerciseList`, `WorkoutExerciseItem`, `SetRow` (unit-aware weight input with onBlur save), `ExercisePicker` (modal with S01 filters), `UnitToggle` (kg/lbs preference), and the route page.

## Verification

- **`pnpm turbo typecheck`** — ✅ All 3 packages compile (backend, web-app, native-app)
- **`npx tsx packages/backend/scripts/verify-s02.ts`** — ✅ 15/15 checks pass (R002: 11 checks, R008: 2 checks, R009: 2 checks)
- **Browser: `/workouts` auth gating** — ✅ Unauthenticated access redirects to Clerk sign-in
- **Browser: `/workouts` route** — ✅ Page loads, WorkoutHistory component renders (confirmed by Convex query call to `listWorkouts`)
- **Browser: `/workouts/active` route** — ⚠️ Not fully verified end-to-end due to Clerk dev auth complexity (Cloudflare captcha + email 2FA in automated browser). Type-safe Convex API bindings confirmed via typecheck.
- **Unit conversion programmatic** — ✅ All functions verified (formatWeight, lbsToKg, formatDuration edge cases)

## Requirements Advanced

- R002 — Full workout lifecycle CRUD proven at integration level (create → add exercises → log sets → finish → list → details → delete). Web UI routes exist at /workouts and /workouts/active with type-checked API bindings.
- R008 — Unit preference CRUD proven (set/get lbs and kg). Conversion utility built and tested. SetRow applies conversion at input boundary (D021).
- R009 — Duration auto-tracking proven: durationSeconds computed server-side (D019), client-side timer implemented in ActiveWorkoutHeader, formatDuration utility tested.

## Requirements Validated

- R002 — Workout CRUD verified by verify-s02.ts (11 checks exercising full lifecycle). Web UI compiles with correct Convex API bindings.
- R008 — Unit preference verified by verify-s02.ts (2 checks) + unit conversion utility tested programmatically.
- R009 — Duration tracking verified by verify-s02.ts (2 checks: durationSeconds >= 1, completedAt set) + formatDuration tested.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **T02**: Test helpers use public `mutation`/`query` instead of `internalMutation`/`internalQuery` (as originally planned in D017 description). ConvexHttpClient cannot call internal Convex functions without admin auth. Functions are clearly marked test-only with `testUserId` parameter.
- **T04**: Full browser end-to-end verification not completed due to Clerk dev authentication complexity (Cloudflare captcha + email 2FA). Same limitation as S01. Type-safe compilation confirms all UI-to-API bindings are correct.

## Known Limitations

- `convex/testing.ts` exposes public test functions that bypass auth. Should be excluded or gated in production deployments.
- SetRow uses initial values from props but doesn't re-sync if server value changes from another source (another tab). Key-based remounting handles ID changes.
- WorkoutHistory and ActiveWorkout components don't have error boundaries — Convex query errors crash the page (observed during browser testing with injected session).
- Browser-based authenticated testing blocked by Clerk dev Cloudflare captcha + email OTP. Programmatic verification compensates.

## Follow-ups

- Add error boundaries to workout UI components to gracefully handle Convex query errors
- S03 adds RPE, tempo, notes to SetRow + superset grouping + previous performance
- S04 integrates rest timer into ActiveWorkout after set logging
- S05 adds template save/load from workout history

## Files Created/Modified

- `packages/backend/convex/workouts.ts` — 7 workout lifecycle functions
- `packages/backend/convex/workoutExercises.ts` — 4 workout exercise functions
- `packages/backend/convex/sets.ts` — 4 set logging functions
- `packages/backend/convex/userPreferences.ts` — 2 user preference functions
- `packages/backend/convex/testing.ts` — 9 test helper functions + cleanup
- `packages/backend/scripts/verify-s02.ts` — 15-check verification script
- `apps/web/src/lib/units.ts` — Unit conversion utility
- `apps/web/src/app/workouts/page.tsx` — /workouts route page
- `apps/web/src/app/workouts/active/page.tsx` — /workouts/active route page
- `apps/web/src/components/workouts/WorkoutHistory.tsx` — Workout history list
- `apps/web/src/components/workouts/WorkoutCard.tsx` — Workout summary card
- `apps/web/src/components/workouts/ActiveWorkout.tsx` — Active workout orchestrator
- `apps/web/src/components/workouts/ActiveWorkoutHeader.tsx` — Header with timer, unit toggle, finish
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` — Exercise list in workout
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` — Single exercise with sets
- `apps/web/src/components/workouts/SetRow.tsx` — Set input row with unit-aware weight
- `apps/web/src/components/workouts/ExercisePicker.tsx` — Exercise selection modal
- `apps/web/src/components/workouts/UnitToggle.tsx` — kg/lbs preference toggle

## Forward Intelligence

### What the next slice should know
- All Convex workout/exercise/set functions are deployed and proven. Import from `@packages/backend/convex/_generated/api` — the `api.workouts.*`, `api.workoutExercises.*`, `api.sets.*`, `api.userPreferences.*` namespaces are all live.
- The active workout page (`ActiveWorkout.tsx`) is the integration point for S03 (RPE/tempo/superset UI), S04 (rest timer after `logSet`), and S05 (template save from history).
- `getWorkoutWithDetails` returns a compound query result joining workouts, exercises, and sets — this is the single query used by the active workout UI. Extending set fields (RPE, tempo, notes) flows through automatically.
- SetRow already has weight/reps inputs with the onBlur save pattern. Adding RPE/tempo/notes inputs follows the same pattern.

### What's fragile
- **SetRow local state sync** — If server updates a set value from another source, the local state won't reflect it until remount. This matters if S03 adds computed fields or S06 enables cross-device editing.
- **No error boundaries** — Convex query errors crash the entire page. Any new query or mutation that can fail needs defensive handling in the UI, or an error boundary wrapper around workout components.
- **ExercisePicker filter state** — The picker reuses `ExerciseFilters` from S01 but manages open/close state from the parent. If S03 adds superset grouping, the picker needs to support multi-select (currently single-click-to-add).

### Authoritative diagnostics
- `npx tsx packages/backend/scripts/verify-s02.ts` — fastest way to verify all S02 backend contracts are intact. Exit 0 = healthy. Runs in ~5 seconds.
- Convex dashboard at http://127.0.0.1:6790 — inspect workouts, workoutExercises, sets, userPreferences tables directly.

### What assumptions changed
- **Clerk automated browser testing** — assumed Clerk dev mode would allow automated sign-in. In practice, Cloudflare captcha and email OTP block automated browser auth. The testing token API exists but doesn't bypass 2FA on this instance. Future slices should plan for the same limitation or configure Clerk to allow password-only auth.
