# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Authentication provider | Clerk | Already wired in template on both web and mobile, integrated with Convex | No |
| D002 | M001 | arch | Backend/database | Convex | Template uses Convex, provides realtime sync out of the box, serverless functions | No |
| D003 | M001 | data | Weight unit storage | Store in kg, convert for display | Single canonical unit avoids conversion bugs in analytics and comparisons | No |
| D004 | M001 | convention | Design language | Clean/minimal, Apple Health-inspired | User preference — light theme, generous whitespace, subtle colors | Yes — if user feedback |
| D005 | M001 | data | Exercise seed source | Curated JSON seed (~100-150 exercises) | User chose this over external API. Manual curation ensures quality and avoids API dependency. | Yes — could add external API import later |
| D006 | M001 | arch | Workout logging style | Freeform (no structured programs) | User's primary loop. Templates provide repeatability without program rigidity. | Yes — programs deferred, may add later |
| D007 | M001 | scope | Offline support | Deferred | Convex lacks built-in offline. Significant custom work. Revisit after M002. | Yes — after M002 |
| D008 | M001 | arch | Rest timer state | Local-only (not persisted to Convex) | Simplicity for M001. Cross-device timer sync adds complexity for low value. | Yes — could persist in M005 for collab |
| D009 | M001 | scope | Platforms | Both web (Next.js) and mobile (Expo) from M001 | User requirement. Web built first per slice, mobile added in final integration slice. | No |
