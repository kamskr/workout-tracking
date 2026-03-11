# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Backend platform | Convex (keep from template) | Already wired, realtime built-in, serverless | No |
| D002 | M001 | arch | Auth provider | Clerk (keep from template) | Already wired on both platforms | No |
| D003 | M001 | convention | Weight storage unit | kg internally, display per user preference | International standard, avoids rounding errors on conversion | No |
| D004 | M001 | arch | Exercise data source | Curated JSON seed (~100-150 exercises) | User decided against external API. Seed loaded via Convex mutation. | Yes — if community library (R025) changes sourcing |
| D005 | M001 | scope | Primary user loop | Freeform workout logging (no structured programs) | User explicitly chose freeform. Programs deferred (R026). | Yes — if R026 is activated |
| D006 | M001 | scope | Tracking depth | Full: weight, reps, RPE, tempo, notes per set | User explicitly requested full tracking | No |
| D007 | M001 | convention | Design language | Clean/minimal, light theme, Apple Health-inspired | User chose over dark/gym and vibrant/energetic | No |
| D008 | M001 | arch | Rest timer behavior | Auto-start after logging a set, configurable per exercise | User confirmed. Timer state is local (not synced to Convex). | No |
| D009 | M001 | scope | Platform targets | Both web + mobile from M001 | User explicitly wants both platforms from the start | No |
| D010 | M001 | scope | Offline support | Deferred — nice to have, not M001 | Convex lacks built-in offline. Significant custom work. | Yes — revisit after M002 |
| D011 | M001/S01 | arch | Schema normalization strategy | Fully normalized 7 tables with v.id() references | Convex doc-based but workout data is relational. Normalized keeps docs small, enables M002 analytics queries, avoids transaction limits on nested docs. | No |
| D012 | M001/S01 | convention | Muscle group storage | primaryMuscleGroup as indexed string, secondaryMuscleGroups as display-only array | Convex can't index array elements for equality queries. Primary is indexed for filter queries; secondary is for display. | No |
| D013 | M001/S01 | convention | Exercise query dual-path | withSearchIndex for text search, withIndex for filter-only browse | Convex search index requires a text query. Pure filter queries use regular indexes. Two code paths in listExercises. | No |
| D014 | M001/S01 | convention | Seed idempotency | Check by slug via by_slug index before each insert | Per-exercise slug check is more robust than count-based check — handles partial seed failures. | No |
| D015 | M001/S01 | convention | Filter UI components | Native HTML select elements, no headless UI dependency | Matches clean/minimal design language (D007). Avoids adding a component library dependency for simple dropdowns. Can upgrade to Radix Select later if needed. | Yes |
| D016 | M001/S01 | convention | Exercise type enum expansion | Added `plyometric` as 5th exercise type alongside strength/cardio/bodyweight/stretch | Needed for box jumps, jump squats, etc. in seed data. Schema and seed data both include it. | No |
