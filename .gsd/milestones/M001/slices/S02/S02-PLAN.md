# S02: Workout CRUD & Active Workout Session

**Goal:** User can start a workout on web, add exercises, log sets with weight/reps, finish the workout, see it in history. Duration auto-tracks. Unit preference (kg/lbs) is respected.
**Demo:** Sign in → start workout → add 2 exercises from picker → log 3 sets with weight/reps → see running timer → finish workout → see it in history with correct duration and weight displayed in preferred unit.

## Must-Haves

- Convex mutations/queries for workout lifecycle (create, get, list, finish, delete)
- Convex mutations/queries for workout exercises (add, remove, reorder, list)
- Convex mutations/queries for sets (log, update, delete, list)
- Convex queries/mutations for user preferences (get, set unit)
- Active workout page with exercise picker, set logging, and running duration timer
- Workout history page listing completed workouts
- Unit conversion utility (store kg, display per preference)
- Auth-gating on all workout data queries/mutations
- Resume existing in-progress workout instead of creating duplicates
- Programmatic verification script exercising all Convex functions

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Convex backend + web UI)
- Human/UAT required: no (programmatic verification script + browser verification cover requirements)

## Verification

- `npx tsx packages/backend/scripts/verify-s02.ts` — programmatic script exercising all Convex workout/set/preference functions against live backend (R002, R008, R009). Creates workout, adds exercises, logs sets, finishes workout, verifies duration computed, verifies unit preference CRUD, cleans up.
- `pnpm turbo typecheck` — all packages compile
- Browser: `/workouts` shows workout history after completing a workout
- Browser: `/workouts/active` shows active workout with exercise picker, set logging, running timer
- Browser: finishing workout redirects to history and shows correct duration
- Browser: unit toggle switches weight display between kg and lbs

## Observability / Diagnostics

- Runtime signals: Convex mutations throw descriptive errors ("User not found", "Workout not found", "Workout does not belong to user", "Workout is not in progress"). All error messages include the operation context.
- Inspection surfaces: `npx convex run workouts:listWorkouts` for CLI check; `npx tsx packages/backend/scripts/verify-s02.ts` for full programmatic verification; Convex dashboard tables (workouts, workoutExercises, sets, userPreferences).
- Failure visibility: Auth failures throw immediately with "User not found". Ownership violations throw with "does not belong to user". Status violations throw with "not in progress" / "not found". All are synchronous — no silent failures.
- Redaction constraints: None — no secrets in workout data.

## Integration Closure

- Upstream surfaces consumed: `convex/schema.ts` (all table definitions + indexes), `convex/exercises.ts` (`listExercises` for picker), `convex/lib/auth.ts` (`getUserId`), `apps/web/src/components/common/button.tsx`, `apps/web/src/lib/utils.ts` (`cn`), `apps/web/src/middleware.ts` (already protects `/workouts(.*)`)
- New wiring introduced in this slice: 4 new Convex function files (`workouts.ts`, `workoutExercises.ts`, `sets.ts`, `userPreferences.ts`), unit conversion lib, 2 new routes (`/workouts`, `/workouts/active`), exercise picker modal component, active workout UI
- What remains before the milestone is truly usable end-to-end: S03 (RPE/tempo/supersets/previous performance), S04 (rest timer), S05 (templates), S06 (mobile app + cross-platform polish)

## Tasks

- [x] **T01: Convex workout lifecycle and set logging functions** `est:45m`
  - Why: All UI depends on these backend functions. Build the complete CRUD layer for workouts, workout exercises, sets, and user preferences — the backbone that S03-S05 all consume.
  - Files: `packages/backend/convex/workouts.ts`, `packages/backend/convex/workoutExercises.ts`, `packages/backend/convex/sets.ts`, `packages/backend/convex/userPreferences.ts`
  - Do: Create all 4 Convex function files following `exercises.ts` patterns. Auth-gate every function via `getUserId`. Workouts: create (inProgress), getActiveWorkout (by_userId_status index), getWorkout (with ownership check), getWorkoutWithDetails (compound query via Promise.all joining exercises+sets+exercise names), listWorkouts (by_userId, desc, take 50), finishWorkout (compute durationSeconds server-side), deleteWorkout (cascade delete exercises+sets). WorkoutExercises: add (auto-compute next order), remove (cascade sets), reorder (batch update). Sets: log (auto-compute next setNumber), update, delete, listSetsForExercise. UserPreferences: get (return default if none), setUnitPreference (upsert).
  - Verify: `pnpm turbo typecheck` passes. Functions appear in Convex dashboard after `npx convex dev` deploys.
  - Done when: All 4 files compile, deploy to Convex, and are callable from the dashboard.

- [x] **T02: Programmatic verification script for all S02 backend functions** `est:30m`
  - Why: Proves R002/R008/R009 at the integration level against live Convex before any UI work. Also serves as regression test for S03-S05 which consume these functions.
  - Files: `packages/backend/scripts/verify-s02.ts`
  - Do: Create verification script following `verify-s01.ts` pattern (ConvexHttpClient). Needs a Clerk-authenticated client to test auth-gated mutations. Test sequence: set unit preference → create workout → verify getActiveWorkout returns it → add 2 exercises → log sets with weight/reps → verify set count → finish workout → verify durationSeconds is computed → verify listWorkouts returns it → verify getWorkoutWithDetails returns full join data → clean up (delete workout). Each step is a named check with PASS/FAIL output. Auth note: since ConvexHttpClient can't easily auth, consider using `internalMutation`-style helpers or test against the mutations with a mock auth approach — if auth blocks programmatic testing, create a lightweight test helper.
  - Verify: `npx tsx packages/backend/scripts/verify-s02.ts` exits 0 with all checks passing.
  - Done when: Script runs successfully against live Convex, exercising create → add exercises → log sets → finish → list → details → delete workflow.

- [x] **T03: Unit conversion utility and workout history page** `est:35m`
  - Why: The history page is the simplest UI entry point — read-only list of completed workouts. Also establishes the unit conversion utility (R008) that the active workout page will use. Wires the first real route at `/workouts`.
  - Files: `apps/web/src/lib/units.ts`, `apps/web/src/app/workouts/page.tsx`, `apps/web/src/components/workouts/WorkoutHistory.tsx`, `apps/web/src/components/workouts/WorkoutCard.tsx`
  - Do: Create `units.ts` with `kgToLbs`, `lbsToKg`, `formatWeight`, `displayWeight` helpers (D003 — store kg, display per pref). Create `/workouts` route page. `WorkoutHistory` component: uses `useQuery(api.workouts.listWorkouts)` + `useQuery(api.userPreferences.getPreferences)`, shows loading/empty states, renders `WorkoutCard` list. `WorkoutCard`: shows workout name, date (formatted), duration (mm:ss), exercise count, total sets. Include a "Start Workout" button linking to `/workouts/active`. Follow ExerciseList/ExerciseCard patterns for component structure and styling.
  - Verify: `pnpm turbo typecheck` passes. Browser: `/workouts` renders (empty state initially, then with data after T02 script creates workouts or after manual testing via active workout).
  - Done when: `/workouts` page renders workout history with correct duration and weight formatting per unit preference.

- [x] **T04: Active workout page with exercise picker, set logging, and duration timer** `est:60m`
  - Why: This is the core user loop — the most complex page in M001. Delivers R002 (workout CRUD from UI), R008 (unit-aware weight input), and R009 (visible running timer). Wires everything together: Convex mutations from T01, unit utils from T03, exercise picker from S01.
  - Files: `apps/web/src/app/workouts/active/page.tsx`, `apps/web/src/components/workouts/ActiveWorkout.tsx`, `apps/web/src/components/workouts/ActiveWorkoutHeader.tsx`, `apps/web/src/components/workouts/WorkoutExerciseList.tsx`, `apps/web/src/components/workouts/WorkoutExerciseItem.tsx`, `apps/web/src/components/workouts/SetRow.tsx`, `apps/web/src/components/workouts/ExercisePicker.tsx`, `apps/web/src/components/workouts/UnitToggle.tsx`
  - Do: Create `/workouts/active` route. `ActiveWorkout`: checks for existing inProgress workout via `getActiveWorkout`, creates one if none, uses `getWorkoutWithDetails` for full state. `ActiveWorkoutHeader`: editable workout name, running duration timer (client-side interval from `startedAt`), finish button (calls `finishWorkout`, redirects to `/workouts`). `WorkoutExerciseList`: ordered exercise list with add button. `WorkoutExerciseItem`: exercise name with set table, add-set button. `SetRow`: inline weight/reps inputs with unit-aware display/input (convert lbs→kg on save), warmup toggle, delete. `ExercisePicker`: modal/dialog showing exercise list (reuses `listExercises` from S01 with filters), click to add. `UnitToggle`: kg/lbs toggle calling `setUnitPreference`. All mutations use `useMutation` from convex/react.
  - Verify: `pnpm turbo typecheck`. Browser: navigate to `/workouts/active` → workout created → add exercise → log set with weight/reps → timer ticking → finish → redirected to `/workouts` with completed workout showing.
  - Done when: Full workout flow works end-to-end in browser: start → add exercises → log sets → see timer → finish → appears in history with correct duration.

## Files Likely Touched

- `packages/backend/convex/workouts.ts` (new)
- `packages/backend/convex/workoutExercises.ts` (new)
- `packages/backend/convex/sets.ts` (new)
- `packages/backend/convex/userPreferences.ts` (new)
- `packages/backend/scripts/verify-s02.ts` (new)
- `apps/web/src/lib/units.ts` (new)
- `apps/web/src/app/workouts/page.tsx` (new)
- `apps/web/src/app/workouts/active/page.tsx` (new)
- `apps/web/src/components/workouts/WorkoutHistory.tsx` (new)
- `apps/web/src/components/workouts/WorkoutCard.tsx` (new)
- `apps/web/src/components/workouts/ActiveWorkout.tsx` (new)
- `apps/web/src/components/workouts/ActiveWorkoutHeader.tsx` (new)
- `apps/web/src/components/workouts/WorkoutExerciseList.tsx` (new)
- `apps/web/src/components/workouts/WorkoutExerciseItem.tsx` (new)
- `apps/web/src/components/workouts/SetRow.tsx` (new)
- `apps/web/src/components/workouts/ExercisePicker.tsx` (new)
- `apps/web/src/components/workouts/UnitToggle.tsx` (new)
