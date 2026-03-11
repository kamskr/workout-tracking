---
id: T02
parent: S03
milestone: M004
provides:
  - getUserBadges auth-gated query in badges.ts returning enriched badges with display metadata
  - 5 badge test helpers in testing.ts (testEvaluateAndAwardBadges, testGetUserBadges, testAwardBadge, testGetRawUserBadges, testGetUserBadgeCount)
  - testCleanup extended with userBadges deletion
  - verify-s03-m04.ts verification script with 12 named checks (BG-01 through BG-12)
  - api.d.ts updated with badges module import
key_files:
  - packages/backend/convex/badges.ts
  - packages/backend/convex/testing.ts
  - packages/backend/scripts/verify-s03-m04.ts
  - packages/backend/convex/_generated/api.d.ts
key_decisions:
  - Badge enrichment uses pre-built Map<slug, definition> for O(1) lookups rather than .find() per badge
  - Unknown badge slugs produce fallback metadata with "Unknown Badge" name and ❓ emoji plus console log for diagnostics
  - testGetUserBadges mirrors production getUserBadges enrichment logic exactly (same output shape)
patterns_established:
  - Badge test helpers follow existing challenge test helper pattern (testUserId arg, no auth)
  - Verification script pattern matches verify-s01-m04.ts / verify-s02-m04.ts (ConvexHttpClient, named checks, setup/cleanup/try-finally)
observability_surfaces:
  - getUserBadges returns enriched badges (name, emoji, description, category) — UI can display without importing definitions
  - testGetRawUserBadges returns raw DB rows for low-level assertions
  - testGetUserBadgeCount returns integer count for quick checks
  - Unknown badge slugs logged as "[Badge] Unknown badge slug" in getUserBadges
duration: 14m
verification_result: partial
completed_at: 2026-03-11T16:28:00+01:00
blocker_discovered: false
---

# T02: Queries + test helpers + verification script

**Created `getUserBadges` query, 5 badge test helpers, `testCleanup` integration, and 12-check verification script covering all 5 badge categories.**

## What Happened

1. **Created `packages/backend/convex/badges.ts`** — Single `getUserBadges` auth-gated query that accepts `{ userId }`, queries `userBadges` by `by_userId` index, enriches each row with display metadata (name, emoji, description, category) from `BADGE_DEFINITIONS` via pre-built Map lookup, and returns the enriched array sorted by `awardedAt` desc. Cross-user readable (same pattern as `getProfileStats`). Unknown badge slugs produce fallback metadata and a diagnostic console.log.

2. **Added 5 badge test helpers to `testing.ts`** — After the Challenge section (line ~2719):
   - `testEvaluateAndAwardBadges`: mutation accepting `testUserId`, calls `evaluateAndAwardBadges(ctx.db, testUserId)`
   - `testGetUserBadges`: query returning enriched badges (mirrors production `getUserBadges` output)
   - `testAwardBadge`: mutation for direct badge insertion (controlled test setup)
   - `testGetRawUserBadges`: query returning raw `userBadges` docs (no enrichment)
   - `testGetUserBadgeCount`: query returning badge count as integer

3. **Extended `testCleanup`** — Added `userBadges` deletion block before the "Delete profiles" section, querying `by_userId` index and deleting all matching rows.

4. **Updated `api.d.ts`** — Added `import type * as badges from "../badges.js"` and `badges: typeof badges` entry in `fullApi`.

5. **Wrote `verify-s03-m04.ts`** — 12-check verification script using ConvexHttpClient with `testing.*` functions. Checks BG-01 through BG-12 covering: workout count badge award (BG-01), threshold enforcement (BG-02), deduplication (BG-03), metadata enrichment (BG-04), cross-user visibility (BG-05), volume badge (BG-06), streak badge (BG-07), PR badge (BG-08), challenge badge (BG-09), count growth (BG-10), cleanup (BG-11), and definitions structure validation (BG-12).

## Verification

### Static checks — all passed ✅
- `cd packages/backend && npx -p typescript tsc --noEmit -p convex` — 0 errors
- `grep` for 5 test helpers in testing.ts — 5 found
- `grep "userBadges" testing.ts` — shows cleanup integration
- `grep -c "BG-" verify-s03-m04.ts` — 48 (well above 12 minimum)
- `grep "badges" api.d.ts` — shows `import type * as badges` and `badges: typeof badges`

### Runtime verification — not run
- `verify-s03-m04.ts` could not be executed because the local Convex dev server requires interactive login (`npx convex dev` prompts for auth). The script is complete and structurally correct but needs a running Convex backend to execute its 12 checks.

### Slice-level verification status (intermediate task — T02 of 3):
- ✅ `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- ⏳ `cd apps/web && npx tsc --noEmit` — not yet relevant (T03 web UI)
- ⏳ `npx tsx packages/backend/scripts/verify-s03-m04.ts` — needs Convex server running
- ⏳ Profile page `[data-badge-section]` / `[data-badge-card]` — T03 scope

## Diagnostics

- `testGetRawUserBadges({ testUserId })` → raw DB rows for inspecting badge state
- `testGetUserBadgeCount({ testUserId })` → integer badge count for quick sanity checks
- `testGetUserBadges({ testUserId })` → enriched view matching production `getUserBadges` output
- `getUserBadges({ userId })` → auth-gated query returning full enriched badge list
- Unknown badge slugs logged with `[Badge] Unknown badge slug "${slug}"` prefix

## Deviations

None — implementation matches the task plan exactly.

## Known Issues

- Verification script (`verify-s03-m04.ts`) has not been run against a live Convex backend in this session due to the dev server requiring interactive login. The script compiles correctly and follows the established pattern from `verify-s01-m04.ts` and `verify-s02-m04.ts`. It should be run when the Convex dev server is available.

## Files Created/Modified

- `packages/backend/convex/badges.ts` — new file: `getUserBadges` auth-gated query with display metadata enrichment
- `packages/backend/convex/testing.ts` — extended: 5 badge test helpers + `testCleanup` userBadges deletion block (~120 lines added)
- `packages/backend/scripts/verify-s03-m04.ts` — new file: 12-check verification script (BG-01 through BG-12)
- `packages/backend/convex/_generated/api.d.ts` — updated: `badges` module import and fullApi entry
