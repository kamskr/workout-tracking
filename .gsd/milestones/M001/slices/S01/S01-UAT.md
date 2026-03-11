# S01: Convex Schema & Exercise Library — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Schema and data correctness are fully verifiable by programmatic script and typecheck. UI browse/filter behavior was verified in browser against live Convex backend. No human-experience judgment needed — this is a data layer + functional browse page, not a design-sensitive workflow.

## Preconditions

- Convex dev backend running (`npx convex dev` in `packages/backend`)
- Exercises seeded (144 rows in `exercises` table — run `npx convex run seed:seedExercises` if empty)
- Web app running (`pnpm dev --filter=web-app`)
- Clerk env vars set in `apps/web/.env.local` and `CLERK_ISSUER_URL` set in Convex backend env
- A Clerk test user account exists for sign-in

## Smoke Test

Navigate to `/exercises` in a browser while signed in → page shows "Exercise Library" heading with 144 exercises in a card grid. If this works, the schema, seed, queries, and UI are all connected.

## Test Cases

### 1. Exercise count and data quality

1. Run `npx tsx packages/backend/scripts/verify-s01.ts`
2. **Expected:** All 6 assertions PASS, exit code 0. Total exercises >= 100 (currently 144).

### 2. Muscle group filter

1. Sign in and navigate to `/exercises`
2. Select "Chest" from the muscle group dropdown
3. **Expected:** Exercise count drops to 16. All visible cards show a "Chest" badge.

### 3. Equipment filter

1. Clear muscle group filter, select "Barbell" from equipment dropdown
2. **Expected:** Exercise count shows 30. All visible cards show a "Barbell" badge.

### 4. Combined filters

1. Select "Chest" muscle group AND "Barbell" equipment
2. **Expected:** Results narrow to exercises that are both chest AND barbell (e.g., Barbell Bench Press). Count is less than either individual filter.

### 5. Name search

1. Clear all filters, type "press" in the search input
2. **Expected:** Results show only exercises with "press" in the name. Count is 19.

### 6. Search + filter combined

1. Type "press" in search, select "Chest" muscle group
2. **Expected:** Results show only chest exercises containing "press" in the name.

### 7. Auth gating — unauthenticated redirect

1. Open an incognito/private browser window
2. Navigate directly to `/exercises`
3. **Expected:** Redirected to Clerk sign-in page (URL contains `sign-in` and `redirect_url`)

### 8. Empty state

1. Sign in, navigate to `/exercises`
2. Select a filter combination that yields no results (e.g., search "xyznotanexercise")
3. **Expected:** Empty state message displayed (no blank page, no error)

## Edge Cases

### Clear all filters returns to full list

1. Apply muscle group and equipment filters
2. Reset both dropdowns to "All" / clear search input
3. **Expected:** Full list of 144 exercises appears again

### Rapid filter switching

1. Quickly switch between different muscle group filters
2. **Expected:** Results update correctly each time, no stale data or flash of wrong results

### Seed idempotency

1. Run `npx convex run seed:seedExercises` when exercises already exist
2. **Expected:** Logs show "0 inserted, 144 skipped of 144". No duplicates created.

## Failure Signals

- `/exercises` shows a loading spinner that never resolves → Convex connection or query error
- Filters return incorrect results (e.g., chest filter shows back exercises) → query index logic broken
- Page shows 0 exercises after seed → seed mutation failed or Convex env misconfigured
- Unauthenticated user sees exercise page → middleware route matcher broken
- TypeScript compilation fails → schema or query type mismatch
- `verify-s01.ts` exits non-zero → data contract violation

## Requirements Proved By This UAT

- R001 — Exercise Library with Curated Seed Data: 144 exercises seeded, queryable by all fields, browsable at /exercises with name/metadata display
- R010 — Body-Part and Equipment Filtering: muscle group dropdown, equipment dropdown, and name search all produce correct filtered results; combined filters narrow correctly
- R023 — Clerk Authentication on Both Platforms: /exercises route redirects unauthenticated users to Clerk sign-in on web platform

## Not Proven By This UAT

- R023 mobile auth gating — deferred to S06 when mobile app is built
- Custom exercise creation via UI — mutation exists but no UI for it yet
- Design quality / visual polish — this UAT verifies function, not aesthetics (R022 is S06's responsibility)
- Exercise detail view — only list/card view exists; no single-exercise detail page yet
- Performance under load — 144 exercises is small; behavior with 500+ custom exercises untested

## Notes for Tester

- Clerk sign-in in headless/automated browsers requires sign-in tokens via Clerk Backend API to bypass CAPTCHA/Turnstile. Manual testing in a real browser works normally.
- The search uses Convex's search index which has eventual consistency — if you seed and immediately search, new exercises might take 1-2 seconds to appear in search results (filter-only queries are immediately consistent).
- The "19 exercises" count for "press" search may vary if custom exercises have been added.
