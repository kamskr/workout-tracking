# M001: Core Workout Logging

**Vision:** Deliver a fully functional cross-platform workout logging experience — users can browse exercises, log workouts set-by-set with full tracking detail, use a rest timer, save templates, and see everything sync in realtime across web and mobile.

## Success Criteria

- User can browse 100+ exercises filtered by muscle group and equipment on both web and mobile
- User can create a workout, add exercises (including supersets), log sets with weight/reps/RPE/tempo, and finish the workout
- Rest timer auto-starts after logging a set with a visual countdown
- User can save a workout as a template and load it for a future session
- Previous performance ("last time: 3×10 @ 60kg") appears inline when logging sets
- Unit preference (kg/lbs) is respected across the entire app
- Workout duration is auto-tracked from start to finish
- Data created on mobile appears on web within ~1 second (realtime sync)
- Both web and mobile apps have a clean, minimal, consistent design

## Key Risks / Unknowns

- **Convex schema design for relational workout data** — Workouts → exercises → sets is inherently relational. Convex is document-based. Schema design affects both M001 usability and M002 analytics queryability.
- **Rest timer background behavior on mobile** — Expo has limitations on background execution. Timer may not survive app backgrounding without extra work.
- **Exercise seed data loading** — 100-150 exercises must be loaded idempotently. Convex doesn't have a built-in seed mechanism.

## Proof Strategy

- **Convex schema design** → retire in S01 by proving the schema supports creating a workout with exercises and sets, querying exercises by filters, and querying a user's workout history efficiently
- **Rest timer on mobile** → retire in S04 by proving the timer counts down correctly even when navigating between screens (full background survival deferred)
- **Exercise seed loading** → retire in S01 by proving the seed script loads all exercises idempotently and they're queryable with filters

## Verification Classes

- Contract verification: TypeScript compilation across all packages, Convex schema deployment, query/mutation correctness
- Integration verification: Web and mobile both auth via Clerk and read/write to same Convex backend with realtime updates
- Operational verification: Full workout session flow (start → log → timer → finish → template) on both platforms
- UAT / human verification: Design quality, gym-usability of mobile UI, exercise data quality

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 6 slices are complete with passing verification
- Exercise library is seeded and browsable with filters on both platforms
- A full workout can be logged with all tracking fields on both platforms
- Rest timer works during an active workout on both platforms
- Templates can be saved and loaded on both platforms
- Previous performance data appears when logging sets
- Realtime sync is demonstrated (set logged on one platform visible on the other within ~1s)
- Clean/minimal design system is established and consistent across features

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R022, R023
- Partially covers: none
- Leaves for later: R012-R021 (M002-M005), R024-R026 (deferred)
- Orphan risks: none

## Slices

- [x] **S01: Convex Schema & Exercise Library** `risk:high` `depends:[]`
  > After this: user can sign in, browse 100+ exercises filtered by muscle group and equipment on the web app. Convex schema for the entire workout domain is deployed.

- [x] **S02: Workout CRUD & Active Workout Session** `risk:high` `depends:[S01]`
  > After this: user can start a workout on web, add exercises, log sets with weight and reps, finish the workout, and see it in their history. Duration auto-tracks. Unit preference (kg/lbs) is respected.

- [x] **S03: Full Set Tracking, Supersets & Previous Performance** `risk:medium` `depends:[S02]`
  > After this: user can log RPE, tempo, and notes per set. Exercises can be grouped into supersets. Previous performance appears inline when logging. All on web.

- [x] **S04: Rest Timer** `risk:medium` `depends:[S02]`
  > After this: rest timer auto-starts after logging a set with visual countdown. Configurable per exercise. Can be paused, adjusted, or skipped. Works on web.

- [x] **S05: Workout Templates** `risk:low` `depends:[S02]`
  > After this: user can save a completed workout as a template, view saved templates, and start a new workout pre-filled from a template. Works on web.

- [x] **S06: Mobile App & Cross-Platform Polish** `risk:medium` `depends:[S01,S02,S03,S04,S05]`
  > After this: all features from S01-S05 work on the Expo mobile app with a gym-optimized UI. Realtime sync between web and mobile is verified. Clean/minimal design is consistent across both platforms.

## Boundary Map

### S01 → S02

Produces:
- `convex/schema.ts` → Full domain schema: `exercises`, `workouts`, `workoutExercises`, `sets`, `workoutTemplates`, `templateExercises`, `userPreferences` tables with indexes
- `convex/exercises.ts` → `listExercises(filters)`, `getExercise(id)`, `createCustomExercise(...)` queries/mutations
- `convex/seed.ts` → `seedExercises()` mutation that idempotently loads curated JSON data
- `data/exercises.json` → Curated seed data (~100-150 exercises with name, muscleGroups, equipment, type, instructions)

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- `convex/schema.ts` → `exercises` table with muscle group, equipment, and type fields for filtering and previous performance lookups

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `convex/workouts.ts` → `createWorkout()`, `finishWorkout()`, `getWorkout(id)`, `listWorkouts(userId)` mutations/queries
- `convex/workoutExercises.ts` → `addExerciseToWorkout(...)`, `removeExercise(...)`, `reorderExercises(...)` mutations
- `convex/sets.ts` → `logSet(...)`, `updateSet(...)`, `deleteSet(...)` mutations
- `convex/userPreferences.ts` → `getPreferences(userId)`, `setUnitPreference(unit)` query/mutation
- Web UI: active workout screen, exercise picker, set logging form, workout history page

Consumes from S01:
- `convex/exercises.ts` → `listExercises(filters)` for exercise picker
- `convex/schema.ts` → `exercises` table definition

### S02 → S04

Produces:
- `convex/sets.ts` → `logSet(...)` mutation (timer triggers after set is logged)
- Web UI: active workout screen (timer component integrates here)

Consumes from S01:
- `convex/schema.ts` → `exercises` table (for per-exercise rest time defaults)

### S02 → S05

Produces:
- `convex/workouts.ts` → `getWorkout(id)` query (template creation reads from completed workout)
- `convex/workoutExercises.ts` → `listExercisesForWorkout(workoutId)` query
- `convex/sets.ts` → `listSetsForExercise(workoutExerciseId)` query
- Web UI: workout history (template save button lives here)

Consumes from S01:
- `convex/exercises.ts` → exercise data for template display

### S03 → S06

Produces:
- `convex/sets.ts` → Extended set fields (rpe, tempo, notes)
- `convex/workoutExercises.ts` → `supersetGroupId` field and grouping mutations
- `convex/sets.ts` → `getPreviousPerformance(userId, exerciseId)` query
- Web UI: enhanced set form with RPE/tempo/notes, superset UI, previous performance display

Consumes from S02:
- All workout and set mutations/queries
- Active workout screen UI

### S04 → S06

Produces:
- Web UI: `RestTimer` component with countdown, pause, skip, configure
- Timer state management (local state, not synced to Convex)

Consumes from S02:
- `logSet(...)` mutation (triggers timer start)
- Active workout screen (timer integrates into)

### S05 → S06

Produces:
- `convex/templates.ts` → `saveAsTemplate(workoutId)`, `listTemplates(userId)`, `loadTemplate(templateId)`, `deleteTemplate(id)` mutations/queries
- Web UI: template list page, save-as-template flow, load-from-template flow

Consumes from S02:
- Workout and exercise queries for reading completed workout data

### S01-S05 → S06

Produces:
- All Convex queries, mutations, schema, and types from S01-S05

Consumes from S01-S05:
- All backend functions and web UI patterns — S06 rebuilds the UI layer in React Native reusing the same Convex backend
