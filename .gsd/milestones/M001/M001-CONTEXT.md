# M001: Core Workout Logging — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

A full-stack cross-platform workout tracking app built on a Turborepo monorepo (Next.js + Expo + Convex). M001 delivers the core workout logging experience — the exercise library, workout CRUD, full set tracking, rest timer, workout templates, and cross-platform UI on both web and mobile.

## Why This Milestone

Everything else (analytics, social, leaderboards, collaborative workouts) depends on having a solid workout logging foundation. Without a working exercise library and set tracking, there's nothing to analyze, share, or compete on. This milestone proves the core user loop works end-to-end across both platforms with realtime sync.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open the app on web or mobile, browse exercises by muscle group/equipment, create a workout, log sets with weight/reps/RPE/tempo, see a rest timer count down between sets, and finish the workout
- Save a completed workout as a template, then load that template for the next session with exercises pre-filled
- Start a workout on their phone and see it update in realtime on the web app
- View their workout history and see previous performance inline when logging new sets

### Entry point / environment

- Entry point: `http://localhost:3000` (web), Expo Go / dev build (mobile)
- Environment: local dev (both platforms running against same Convex backend)
- Live dependencies involved: Convex (realtime DB), Clerk (auth)

## Completion Class

- Contract complete means: Convex schema deployed, all mutations/queries return correct data, exercise seed loaded, TypeScript compiles clean on all packages
- Integration complete means: Web and mobile apps both connect to the same Convex backend, auth works on both, workout data created on one platform appears instantly on the other
- Operational complete means: A user can complete a full workout session (start → log sets → rest timer → finish → save as template) on both platforms without errors

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A user can sign in on mobile, create a workout with 3+ exercises including a superset, log sets with full tracking data, use the rest timer, finish the workout, and save it as a template
- The same user can sign in on web and see that workout in their history with all data intact
- The user can load the saved template on web, start a new workout from it, and see previous performance data inline
- Realtime sync is verified: a set logged on mobile appears on web within ~1 second

## Risks and Unknowns

- **Convex schema design for nested workout data** — workouts contain exercises which contain sets. Convex is document-based with no joins. Need to decide: nested documents vs. normalized tables with references. Nested is simpler but harder to query for analytics later.
- **Rest timer across platforms** — Timer state needs to be local (not synced) since it's ephemeral. Must work in background on mobile (Expo background task limitations).
- **Exercise seed data volume** — Loading 100-150 exercises into Convex at setup. Need a seed script that runs idempotently.
- **Tailwind 4 on Next.js 16** — Both are very recent. May encounter edge cases.

## Existing Codebase / Prior Art

- `packages/backend/convex/schema.ts` — Current notes schema, will be completely replaced with workout schema
- `packages/backend/convex/notes.ts` — Existing query/mutation patterns to follow (auth gating with getUserId)
- `packages/backend/convex/auth.config.js` — Clerk auth config, keep as-is
- `apps/web/src/app/ConvexClientProvider.tsx` — Convex+Clerk provider wiring, keep as-is
- `apps/native/ConvexClientProvider.tsx` — Same for mobile, keep as-is
- `apps/web/src/components/common/` — Existing UI primitives (button, avatar, dropdown), may reuse patterns
- `apps/web/src/middleware.ts` — Clerk middleware for route protection

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — Exercise library with curated seed (primary: S01)
- R002 — Workout CRUD with realtime sync (primary: S02)
- R003 — Full set tracking (primary: S03)
- R004 — Rest timer (primary: S04)
- R005 — Superset/circuit grouping (primary: S03)
- R006 — Workout templates (primary: S05)
- R007 — Previous performance display (primary: S03)
- R008 — Unit preference kg/lbs (primary: S02)
- R009 — Workout duration auto-tracking (primary: S02)
- R010 — Body-part and equipment filtering (primary: S01)
- R011 — Cross-platform UI (primary: S06)
- R022 — Clean/minimal design language (primary: S06)
- R023 — Clerk auth on both platforms (primary: S01)

## Scope

### In Scope

- Convex schema design for exercises, workouts, sets, templates, user preferences
- Curated JSON seed of ~100-150 exercises with muscle groups, equipment, type, instructions
- Workout CRUD (create, read, update, delete) with realtime sync
- Full set tracking: weight, reps, RPE, tempo, notes
- Superset/circuit exercise grouping
- Auto-start rest timer with configurable defaults
- Workout templates (save from workout, load into new workout)
- Previous performance display when logging sets
- Unit preference (kg/lbs) per user with canonical storage in kg
- Workout duration auto-tracking
- Exercise library browsing with muscle group and equipment filters
- Cross-platform UI for all features (web + mobile)
- Clean/minimal design system establishment

### Out of Scope / Non-Goals

- PR detection and tracking (M002)
- Charts and analytics (M002)
- Social features, profiles, feeds (M003)
- Leaderboards and challenges (M004)
- Collaborative workouts (M005)
- Offline support (deferred)
- Structured training programs (deferred)
- Nutrition tracking (out of scope permanently)

## Technical Constraints

- Convex is the sole backend — no separate API server
- Auth must use Clerk (already wired in template)
- Web uses Tailwind 4 (new CSS-first config)
- Mobile uses React Native StyleSheet (no NativeWind or shared styling)
- Monorepo managed by Turborepo with pnpm
- Weight stored internally in kg, displayed per user preference
- Exercise seed data is a JSON file imported via Convex mutation

## Integration Points

- **Convex** — All data storage, realtime subscriptions, serverless functions
- **Clerk** — Auth identity on both platforms, user ID flows into Convex queries
- **Turborepo** — Build orchestration, shared types via `@packages/backend`

## Open Questions

- **Normalized vs. nested schema** — Should sets be nested in workout documents or separate table? Leaning toward separate tables (exercises, workouts, workout_exercises, sets) for analytics queryability in M002. Will decide during S01 planning.
- **Shared types package** — Should we create a shared types package or rely on Convex's generated types from `@packages/backend`? Leaning toward Convex generated types only.
- **Charting library choice** — Not needed for M001 but the data model should support efficient aggregation for M002 charts. Cross-platform chart library decision deferred to M002.
