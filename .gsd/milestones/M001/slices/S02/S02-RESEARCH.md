# S02: Workout CRUD & Active Workout Session — Research

**Date:** 2026-03-11

## Summary

S02 delivers the core workout logging loop: create a workout, add exercises, log sets with weight/reps, finish the workout, see it in history, with auto-tracked duration and kg/lbs unit preference. This is the highest-complexity slice because it creates the backbone CRUD layer that S03-S05 all consume, and introduces client-side state management for the active workout flow (exercise picker modal, set logging forms, running timer display).

The schema is already deployed from S01 with all required tables (`workouts`, `workoutExercises`, `sets`, `userPreferences`) and indexes. The work is purely backend Convex functions + web UI. The primary risk is getting the active workout UX right — it's a multi-step stateful flow (start → add exercises → log sets → finish) that needs to feel smooth and not lose data.

The recommended approach is: (1) build all Convex mutations/queries first with comprehensive auth-gating, (2) build the workout history page as a simple read-only list, (3) build the active workout page as the complex interactive flow, (4) add the unit preference system. S02 should only implement weight/reps per set — RPE, tempo, notes, and supersets are S03 scope.

## Recommendation

**Backend-first, then UI.** Create 4 Convex files (`workouts.ts`, `workoutExercises.ts`, `sets.ts`, `userPreferences.ts`) following the established patterns from `exercises.ts`. Use `getUserId` from `convex/lib/auth.ts` for all auth-gating. Build helper functions to load workout-with-exercises-and-sets in a single query (manual "join" via Promise.all on related tables). For the web UI, use Next.js App Router with `/workouts` (history list), `/workouts/active` (active session), and leverage the existing exercise picker from S01's `listExercises` query. Unit conversion should be a pure utility function — store in kg, display per preference. Duration tracking uses `startedAt`/`completedAt` timestamps on the workout document; a client-side timer ticks based on `startedAt`.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Variant-based button/UI components | `cva` + `Button` in `components/common/button.tsx` | Already in the project, supports variant/size props |
| Class merging | `cn()` from `@/lib/utils` using `clsx` + `tailwind-merge` | Established pattern, used everywhere |
| Auth identity in Convex | `getUserId()` from `convex/lib/auth.ts` | S01 established this as the canonical pattern |
| Exercise listing for picker | `api.exercises.listExercises` | Already built and tested in S01, dual-path search+filter |
| Route protection | `createRouteMatcher` in `middleware.ts` | `/workouts(.*)` already listed as protected |
| Id types | `Id<"workouts">` from `@packages/backend/convex/_generated/dataModel` | Type-safe document references, used in notes pattern |
| Reactive queries | `useQuery` from `convex/react` with `"skip"` for conditional | Standard Convex pattern, handles loading/realtime |
| Mutations | `useMutation` from `convex/react` | Returns async function, standard Convex pattern |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — All 7 workout tables already defined with validators and indexes. S02 does NOT touch this file. Key tables: `workouts` (by_userId, by_userId_status indexes), `workoutExercises` (by_workoutId, by_exerciseId), `sets` (by_workoutExerciseId), `userPreferences` (by_userId).
- `packages/backend/convex/exercises.ts` — Canonical pattern for queries/mutations: import `getUserId`, define arg validators at top, use `.withIndex()` for indexed queries, `.take(N)` for bounded results. Follow this file's structure exactly.
- `packages/backend/convex/notes.ts` — Shows `createNote`/`deleteNote` mutation patterns with auth. Uses `getUserId` → throw "User not found" on null. S02 mutations follow same pattern.
- `packages/backend/convex/lib/auth.ts` — Returns `string | undefined`. All mutation handlers must check for undefined.
- `apps/web/src/app/notes/[slug]/page.tsx` — Dynamic route pattern: `params: Promise<{ slug: string }>`, cast to `Id<"tableName">`. Use this pattern for `/workouts/[id]` detail view.
- `apps/web/src/components/exercises/ExerciseList.tsx` — Client component pattern: `"use client"`, `useState` for filter state, `useQuery` with conditional args, loading/empty states. Active workout page will be similar but more complex.
- `apps/web/src/components/exercises/ExerciseCard.tsx` — Card component pattern with Badge sub-component and BADGE_COLORS map. Workout history cards can follow similar structure.
- `apps/web/src/components/exercises/ExerciseFilters.tsx` — Filter component pattern: native HTML selects, controlled via lifted state. Reuse for workout history filters.
- `apps/web/src/components/common/button.tsx` — CVA button with variant/size system. Use for all workout actions (Start, Finish, Add Exercise, Log Set, Delete).
- `apps/web/src/middleware.ts` — Already has `/workouts(.*)` in protected routes. No changes needed.
- `apps/web/src/app/ConvexClientProvider.tsx` — Convex+Clerk provider already wraps the entire app. No changes needed.

## Constraints

- **Convex single-mutation transaction limit:** Each mutation runs in a single transaction. Finishing a workout (set `status`, `completedAt`, `durationSeconds`) is a single doc update — fine. But creating a workout from a template (S05) may need multiple inserts; keep mutations granular.
- **No server-side joins in Convex:** Loading a workout with its exercises and sets requires multiple `db.query()` calls within a single query function. Use `Promise.all` to parallelize. This is the standard Convex pattern.
- **Weight stored in kg (D003):** All `sets.weight` values are in kg. Unit conversion is display-only on the client. Conversion factor: 1 kg = 2.20462 lbs. When user inputs lbs, convert to kg before calling mutation.
- **Schema is frozen for S02:** S01 deployed the complete schema. S02 must not modify `schema.ts` — only add new Convex function files.
- **Convex `useQuery` returns `undefined` while loading:** Not `null`, not `[]`. Must handle this explicitly in UI to avoid flash of incorrect state.
- **Convex mutations are ordered per-client:** No race conditions between rapid set logs from the same user.
- **`workouts.status` is enum: `planned | inProgress | completed`:** S02 uses `inProgress` when starting and `completed` when finishing. `planned` is for template-loaded workouts (S05 scope).
- **Only one active workout at a time (recommended):** The schema doesn't enforce this, but the UI should check for existing `inProgress` workouts and resume them instead of creating duplicates.
- **`_creationTime` is auto-set by Convex:** Available on all documents. Can be used for ordering workout history (most recent first) via default table scan order (descending `_creationTime`).

## Common Pitfalls

- **Forgetting to auth-gate queries that return user data** — Every query that returns workout/set data must filter by `userId` or the workout's `userId`. Unlike exercises (public), workouts are private. Always use `getUserId` and filter.
- **Calling `.collect()` without bounds on user's workout history** — A power user could have thousands of workouts. Use `.take(N)` or pagination. Start with `.take(50)` for the history page.
- **Stale active workout on page navigation** — If user navigates away from active workout and comes back, the workout should still be there (it's persisted in Convex, not local state). Use `useQuery` with `by_userId_status` index filtering for `inProgress` to find and resume.
- **Unit conversion precision** — Don't round during storage. Store the exact kg value. Only round for display (1 decimal place for kg, 0-1 for lbs). Convert on input: `weightKg = inputLbs / 2.20462`.
- **Race condition: deleting a workout while viewing it** — `useQuery` will reactively update to `null`. Handle this gracefully (redirect to history).
- **`workoutExercises.order` management** — When adding/removing/reordering exercises, the `order` field must be kept consistent. Use `0, 1, 2, ...` integer ordering. On delete, don't renumber — just leave gaps (or renumber all, which is simpler but costs more mutations).
- **Set numbering** — `sets.setNumber` should be 1-indexed per exercise. When adding a new set, query existing sets for that `workoutExerciseId` and use `max(setNumber) + 1`.
- **Duration calculation** — `durationSeconds` should be computed server-side in `finishWorkout` as `(completedAt - startedAt) / 1000`. Don't trust client-side duration.

## Open Risks

- **Active workout UX complexity** — The active workout screen is the most complex UI in M001: exercise list with per-exercise set tables, inline weight/reps inputs, add/remove sets, add/remove exercises, running timer, finish button. Risk of scope creep if we try to make it too polished in S02. Mitigation: keep it functional-first, S06 polishes.
- **Convex query read limits** — Loading a workout with 10 exercises and 5 sets each = 1 workout + 10 workoutExercises + 50 sets + 10 exercises (for names) = 71 document reads per query. Well within Convex limits but worth noting for very large workouts.
- **No optimistic updates in initial implementation** — Logging a set will have a brief delay (Convex round-trip ~100-300ms). This is acceptable for MVP. Optimistic updates can be added later if it feels sluggish.
- **Exercise picker search latency** — Convex search index has eventual consistency. Newly created custom exercises may not appear immediately in search. Filter-only queries are immediately consistent. The exercise picker should prefer filter-based browsing over search.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@convex-helpers-guide` (120 installs) | available — general Convex helper patterns |
| Convex | `get-convex/agent-skills@function-creator` (109 installs) | available — Convex function authoring patterns |
| Convex | `get-convex/agent-skills@schema-builder` (104 installs) | available — schema design (less relevant, S01 done) |
| Next.js | `vercel/next.js@update-docs` (1.1K installs) | available — Next.js patterns |
| Clerk | `clerk/skills@clerk-nextjs-patterns` (3.3K installs) | available — Clerk + Next.js auth patterns |
| Clerk | `clerk/skills@clerk` (2.4K installs) | available — general Clerk patterns |
| Frontend Design | `frontend-design` | **installed** — loaded from `~/.gsd/agent/skills/` |

**Recommendation:** The `get-convex/agent-skills@function-creator` skill (109 installs) is the most directly useful — it covers exactly the pattern of writing Convex queries and mutations that S02 needs. The `clerk/skills@clerk-nextjs-patterns` (3.3K installs) is high-value for auth patterns but S01 already established the auth pattern we need. Consider installing `function-creator` if the team wants guided Convex function writing.

## Implementation Architecture

### Backend (Convex functions)

**`convex/workouts.ts`** — Workout lifecycle:
- `createWorkout(name?)` — inserts with `status: "inProgress"`, `startedAt: Date.now()`. Returns workout ID.
- `getWorkout(id)` — returns workout doc (auth-gated: must belong to user).
- `getActiveWorkout()` — queries `by_userId_status` for `inProgress`. Returns first match or null. This is how the UI finds/resumes the active workout.
- `listWorkouts()` — queries `by_userId` index, `.order("desc")`, `.take(50)`. For history page.
- `finishWorkout(id)` — sets `status: "completed"`, `completedAt: Date.now()`, computes `durationSeconds`.
- `deleteWorkout(id)` — deletes workout + cascades to workoutExercises + sets.
- `getWorkoutWithDetails(id)` — compound query: loads workout + all workoutExercises (with exercise names) + all sets. Single query function, uses Promise.all for parallel reads.

**`convex/workoutExercises.ts`** — Exercise management within a workout:
- `addExerciseToWorkout(workoutId, exerciseId)` — inserts with next `order` value.
- `removeExerciseFromWorkout(workoutExerciseId)` — deletes + cascades to sets.
- `reorderExercises(workoutId, orderedIds[])` — batch update `order` fields.
- `listExercisesForWorkout(workoutId)` — queries `by_workoutId`, joins exercise data.

**`convex/sets.ts`** — Set logging:
- `logSet(workoutExerciseId, weight?, reps?, isWarmup)` — inserts with next `setNumber`, `completedAt: Date.now()`.
- `updateSet(setId, weight?, reps?, isWarmup)` — partial update.
- `deleteSet(setId)` — deletes single set.
- `listSetsForExercise(workoutExerciseId)` — queries `by_workoutExerciseId`, ordered by setNumber.

**`convex/userPreferences.ts`** — Unit preference:
- `getPreferences()` — queries `by_userId`. Returns doc or default `{ weightUnit: "kg" }`.
- `setUnitPreference(unit)` — upserts preference doc.

### Web UI (Routes & Components)

**Routes:**
- `/workouts` — Workout history list (protected by existing middleware)
- `/workouts/active` — Active workout session (most complex page)

**Key Components:**
- `WorkoutHistory` — Lists completed workouts with date, name, duration, exercise count
- `WorkoutCard` — Summary card for a single workout in history
- `ActiveWorkout` — Main active workout orchestrator (owns workout state via useQuery)
- `ActiveWorkoutHeader` — Workout name, running timer, finish button
- `WorkoutExerciseList` — Ordered list of exercises in the workout
- `WorkoutExerciseItem` — Single exercise with its sets table
- `SetRow` — Single set row with weight/reps inputs
- `ExercisePicker` — Modal/sheet to select exercises (reuses `listExercises` from S01)
- `UnitToggle` — kg/lbs preference toggle (in settings or inline)

### Unit Conversion Utility

```typescript
// lib/units.ts
const KG_TO_LBS = 2.20462;
export const kgToLbs = (kg: number) => Math.round(kg * KG_TO_LBS * 10) / 10;
export const lbsToKg = (lbs: number) => lbs / KG_TO_LBS; // no rounding for storage
export const formatWeight = (kg: number, unit: "kg" | "lbs") =>
  unit === "kg" ? `${Math.round(kg * 10) / 10} kg` : `${kgToLbs(kg)} lbs`;
```

## Sources

- Convex docs: useMutation pattern for calling mutations from React (source: [Convex React Client](https://docs.convex.dev/client/react))
- Convex docs: useQuery with "skip" for conditional queries (source: [Convex React Client](https://docs.convex.dev/client/react))
- Convex docs: Document references and manual joins via Promise.all (source: [Document IDs](https://docs.convex.dev/database/document-ids))
- Convex docs: Index-based queries with withIndex and compound indexes (source: [Indexes](https://docs.convex.dev/using/indexes))
- Convex docs: Best practice — separate tables with Id references over nested docs (source: [Best Practices](https://docs.convex.dev/understanding/best-practices/other-recommendations))
- Existing codebase: S01 established all patterns for Convex functions, auth, UI components, and routing
