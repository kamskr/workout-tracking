# S01: Convex Schema & Exercise Library — Research

**Date:** 2026-03-11

## Summary

S01 delivers the Convex schema for the entire workout domain, a curated exercise seed (~100-150 exercises), exercise browsing with filters on the web app, and Clerk auth gating on protected routes. The codebase is a Turborepo monorepo with a Convex backend package (`@packages/backend`), a Next.js 16 web app (Tailwind 4), and an Expo 54 mobile app. Auth (Clerk + Convex) is already wired on both platforms.

The primary technical decision is **normalized vs. nested schema**. Convex is document-based with no joins, but the workout domain is inherently relational (workouts → exercises → sets). Normalizing into separate tables (`exercises`, `workouts`, `workoutExercises`, `sets`, `workoutTemplates`, `templateExercises`, `userPreferences`) with `v.id()` references is the right call — it keeps documents small, makes M002 analytics queries efficient, and avoids hitting transaction limits on deeply nested documents. This is confirmed by Convex best practices for relational data.

The seed loading challenge is manageable: Convex mutations can write up to 16,000 documents in a single transaction (with 16 MiB write limit). ~150 exercises fit easily in one mutation. Idempotency can be achieved by checking if exercises already exist (query by a stable `slug` field) before inserting.

## Recommendation

**Fully normalized schema with 7 tables**, using compound indexes for the query patterns S02-S06 will need:

1. `exercises` — core library with search index on `name`, compound indexes on `primaryMuscleGroup` and `equipment`
2. `workouts` — user workouts with index on `userId` + `startedAt` for history
3. `workoutExercises` — join table linking workouts to exercises, with `order` and optional `supersetGroupId`
4. `sets` — individual sets with all tracking fields, indexed by `workoutExerciseId`
5. `workoutTemplates` — saved templates, indexed by `userId`
6. `templateExercises` — template exercise list with target sets/reps
7. `userPreferences` — unit preference, indexed by `userId`

For S01 specifically, only `exercises` and `userPreferences` tables need populated data and working queries. The other tables are defined in the schema but their mutations come in S02-S05.

**Exercise seed** as a JSON file in `packages/backend/data/exercises.json`, loaded by an `internalMutation` that checks for existing data by slug before inserting. Called via a Convex dashboard action or a seed script.

**Web UI** for exercise browsing: new `/exercises` route with filter dropdowns (muscle group, equipment) and a search input. Use Convex's `searchIndex` on exercise `name` for text search and compound indexes for filter queries. Auth-gated via Clerk middleware.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Auth identity in Convex functions | `ctx.auth.getUserIdentity()` pattern from `notes.ts` | Already working, proven pattern — extract to shared `getUserId` helper |
| Exercise name search | Convex `searchIndex` with `filterFields` | Built-in full-text search, ranked by relevance, no external search service needed |
| Route protection | Clerk middleware (`createRouteMatcher`) | Already in `middleware.ts`, just add exercise/workout routes to matcher |
| Type-safe DB queries | Convex generated types from `@packages/backend` | Schema → auto-generated `Doc<"tableName">` types, shared across web/mobile via workspace import |
| UI primitives (button, dropdown) | Existing `apps/web/src/components/common/` (Radix + CVA) | Already built with Tailwind 4 + Radix patterns, follow the same approach |
| CSS utility composition | `cn()` helper in `src/lib/utils.ts` | `clsx` + `twMerge` already wired |

## Existing Code and Patterns

- `packages/backend/convex/schema.ts` — Current `notes` table, will be **replaced entirely** with workout domain schema. Pattern: `defineSchema` + `defineTable` with `v` validators.
- `packages/backend/convex/notes.ts` — Auth pattern: `getUserId()` extracts `subject` from `ctx.auth.getUserIdentity()`. Query pattern: `ctx.db.query("table").filter(...)`. Mutation pattern: insert with `ctx.db.insert()`. **Reuse the `getUserId` helper, move to a shared location.**
- `packages/backend/convex/openai.ts` — Shows `internalAction` + `internalMutation` + `internal` import pattern for background work. The seed script should follow this pattern (internalMutation for the actual insert).
- `apps/web/src/app/ConvexClientProvider.tsx` — Convex+Clerk provider. **Keep as-is.** Import pattern: `import { api } from "@packages/backend/convex/_generated/api"` then `useQuery(api.exercises.list)`.
- `apps/web/src/components/notes/Notes.tsx` — Shows the client-side query pattern: `useQuery(api.notes.getNotes)` + `useMutation(api.notes.deleteNote)`. **Follow same pattern** for exercise listing.
- `apps/web/src/middleware.ts` — Clerk route protection with `createRouteMatcher`. Currently protects `/notes(.*)`. **Extend to protect `/exercises(.*)` and `/workouts(.*)`.**
- `apps/web/src/app/globals.css` — Tailwind 4 CSS-first config with `@theme` block. Custom theme tokens defined here. **Add workout app design tokens here.**
- `apps/web/src/components/common/button.tsx` — CVA + Radix pattern for UI primitives. **Follow this pattern** for new components.
- `packages/backend/convex/auth.config.js` — Clerk provider config. **Keep as-is.**

## Constraints

- **Convex transaction limits**: 16,000 document writes, 16 MiB write size, 32,000 document scans per transaction. ~150 exercise inserts fit easily in one mutation.
- **Convex has no joins**: All "relational" queries require multiple queries or denormalization. For S01, exercise listing is a single-table query so this doesn't matter yet. For S02+, workout loading will need multiple queries (workout → workoutExercises → sets).
- **Convex indexes must be defined at schema time**: All indexes needed by S02-S06 must be in the schema from S01. Adding indexes later requires a schema migration push.
- **Search indexes require at least one `searchField` (string) and `staged: false`** for immediate use. Only one search index per table is allowed.
- **Tailwind 4 uses CSS-first config** (`@theme` in `globals.css`), not `tailwind.config.ts`. The project already has this working via `@tailwindcss/postcss` plugin.
- **Next.js 16 with App Router** — all pages are in `src/app/`, components are client or server. Exercise browse page should be a client component (needs `useQuery` for realtime Convex subscription).
- **Convex v1.29.3** — current version in the project. Supports `searchIndex`, `v.union`, `v.literal`, compound indexes.
- **Shared types come from Convex codegen only** — no separate shared types package. Web and mobile both import from `@packages/backend/convex/_generated/api`.

## Common Pitfalls

- **Defining indexes after data exists** — Convex requires `npx convex dev` to push schema changes. If the schema is deployed without needed indexes and data is written, adding indexes later triggers a backfill. Define ALL indexes upfront in S01, including those needed by S02-S06.
- **Seed idempotency via count check** — Don't just check `exercises.length > 0`. If a seed partially fails, you'd have incomplete data. Use a unique `slug` field per exercise and check existence per-exercise, or use a "seed version" marker in a metadata table.
- **Filter vs. withIndex** — Using `.filter()` scans all documents (slow for large tables). Always use `.withIndex()` for production queries on exercises. The exercise table needs indexes on the fields we filter by.
- **Client-side filtering temptation** — Don't fetch all 150 exercises and filter on the client. Use server-side Convex queries with indexes for muscle group and equipment filters. Text search uses `withSearchIndex`.
- **Muscle group as array** — Exercises have primary and secondary muscle groups. If stored as an array, Convex can't index array elements for equality queries. Store `primaryMuscleGroup` as a string (indexed) and `secondaryMuscleGroups` as an array (for display only). Filter queries hit the primary muscle group index.
- **Forgetting to gate exercise mutations** — Custom exercise creation must be auth-gated. The `getUserId` pattern from `notes.ts` must be applied to all mutations.
- **Over-engineering the seed script** — Keep it simple: JSON file → internalMutation that reads it and inserts. Don't build a migration framework for M001.

## Open Risks

- **Exercise data quality** — The curated JSON seed needs to cover the right exercises with accurate muscle group and equipment mappings. Bad data here propagates through the entire app. Mitigate: review seed data carefully, use consistent enum values for muscle groups and equipment.
- **Search index limits** — Convex allows only one search index per table. If we put search on `name`, we can add `filterFields` for muscle group and equipment, but search always requires a text query. For pure filter-only queries (no text search), we need separate indexes. This means two query paths: search (with optional filters) and browse (filters only, no text).
- **Schema forward-compatibility** — The S01 schema must support all S02-S06 features. If we miss a field or index, we'll need a schema push mid-milestone. Low risk since we're defining the schema from roadmap requirements, but RPE/tempo/supersetGroupId fields and their indexes must be included upfront.
- **Convex dev server must be running** — Schema changes require `npx convex dev` to push. If the Convex deployment environment isn't configured with `CONVEX_DEPLOYMENT` env var, schema push will fail. Need to verify env setup before implementation.
- **Tailwind 4 + Next.js 16 edge cases** — Both are recent. The existing app works, but adding new pages/components could surface CSS issues. Low risk since the existing setup is proven.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `get-convex/agent-skills@schema-builder` (104 installs) | available — directly relevant for schema design |
| Convex | `get-convex/agent-skills@function-creator` (109 installs) | available — relevant for queries/mutations |
| Convex | `get-convex/agent-skills@convex-helpers-guide` (120 installs) | available — useful for Convex patterns |
| Clerk | `clerk/skills@clerk-setup` (1.9K installs) | available — auth already wired, may help for route protection patterns |
| Next.js | `wshobson/agents@nextjs-app-router-patterns` (7.7K installs) | available — useful for App Router page structure |
| Frontend design | `frontend-design` | installed — use for exercise browse UI |

## Schema Design Detail

### Table: `exercises`
```
name: string
slug: string (unique identifier for idempotent seeding)
primaryMuscleGroup: string (enum-like: chest, back, shoulders, biceps, triceps, legs, core, fullBody, cardio)
secondaryMuscleGroups: array<string>
equipment: string (enum-like: barbell, dumbbell, cable, machine, bodyweight, kettlebell, bands, other)
exerciseType: string (enum-like: strength, cardio, bodyweight, stretch, plyometric)
instructions: optional<string>
imageUrl: optional<string>
isCustom: boolean
userId: optional<string> (only for custom exercises)
defaultRestSeconds: optional<number> (for S04 rest timer defaults)

Indexes:
- by_slug: [slug]
- by_primaryMuscleGroup: [primaryMuscleGroup]
- by_equipment: [equipment]
- by_type: [exerciseType]
- by_user_custom: [userId, isCustom]

Search index:
- search_name: { searchField: "name", filterFields: ["primaryMuscleGroup", "equipment", "exerciseType"] }
```

### Tables defined but not populated in S01:
- `workouts`: userId, name, status, startedAt, completedAt, notes, durationSeconds
- `workoutExercises`: workoutId, exerciseId, order, supersetGroupId, restSeconds, notes
- `sets`: workoutExerciseId, setNumber, weight, reps, rpe, tempo, notes, isWarmup, completedAt
- `workoutTemplates`: userId, name, description, createdFromWorkoutId
- `templateExercises`: templateId, exerciseId, order, targetSets, targetReps, targetWeight, restSeconds
- `userPreferences`: userId, weightUnit (kg/lbs), defaultRestSeconds

## Requirements Covered

| Req | What S01 Delivers |
|-----|-------------------|
| R001 | Exercise library with curated seed data — full coverage |
| R010 | Body-part and equipment filtering — full coverage |
| R023 | Clerk auth on both platforms — verify existing auth works, gate new routes |
| R011 | Cross-platform UI — web exercise browsing only (mobile in S06) |

## Sources

- Convex schema design: defineSchema, defineTable, validators, indexes (source: [Convex Docs](https://docs.convex.dev/database/schemas))
- Convex transaction limits: 16K doc writes, 16 MiB, 32K scans per transaction (source: [Convex Limits](https://docs.convex.dev/production/state/limits))
- Convex search indexes: one per table, searchField + filterFields (source: [Convex Text Search](https://docs.convex.dev/search/text-search))
- Convex bulk insert pattern: loop inside single mutation for atomicity (source: [Convex Best Practices](https://docs.convex.dev/understanding/best-practices))
- Existing codebase patterns: `notes.ts` getUserId, `ConvexClientProvider.tsx`, `middleware.ts` route protection
