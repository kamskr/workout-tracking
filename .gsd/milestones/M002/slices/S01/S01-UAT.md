# S01: Personal Records — Detection & Live Notification — UAT

**Milestone:** M002
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Backend PR detection correctness is fully proven by the 12-check verification script (artifact-driven). The web UI badge is proven by typecheck and reactive query wiring. Full live-runtime browser UAT is blocked by a pre-existing local Clerk+Convex auth config issue — the code is correct but the auth token chain fails on the local anonymous backend.

## Preconditions

- Convex dev backend running (`npx convex dev` in `packages/backend/`)
- For browser testing: Clerk+Convex auth properly configured (CLERK_ISSUER_URL must match actual Clerk instance)
- For backend verification: no auth needed (uses internal test helpers)

## Smoke Test

Run `npx tsx packages/backend/scripts/verify-s01-m02.ts` — all 12 checks should pass. This proves PR detection works for all 3 types, edge cases are handled, and queries return correct data.

## Test Cases

### 1. Weight PR detected on first set (baseline)

1. Log a weighted set (e.g. 100kg × 5 reps) for an exercise with no prior history
2. Query personalRecords for that exercise
3. **Expected:** A weight PR exists with value matching the Epley estimate (100 × (1 + 5/30) = 116.67)

### 2. Weight PR updated on heavier lift

1. Log another set for the same exercise with higher estimated 1RM (e.g. 110kg × 5)
2. Query personalRecords for that exercise
3. **Expected:** Weight PR value updated to the new higher 1RM. Old PR replaced, not duplicated.

### 3. Volume PR detected on session total

1. Log multiple working sets for an exercise in one workout
2. When cumulative volume (sum of weight × reps for all non-warmup sets) exceeds any prior session
3. **Expected:** Volume PR exists with value equal to the cumulative session volume

### 4. Rep PR detected on high-rep set

1. Log a set with more reps than any prior set for that exercise
2. Query personalRecords for that exercise
3. **Expected:** Reps PR exists with value equal to the rep count of that set

### 5. Warmup sets do not trigger PRs

1. Log a set with `isWarmup: true` and high weight/reps
2. Query personalRecords for that exercise
3. **Expected:** No new PRs created from the warmup set

### 6. 🏆 Badge appears during live workout (browser)

1. Sign in to the web app, start a new workout
2. Add an exercise with no prior history
3. Log a set with weight and reps
4. **Expected:** 🏆 badge with "Weight PR" text appears on the exercise card in realtime (no page refresh)

### 7. No false PR on weaker set

1. Establish a weight PR by logging a heavy set
2. Log a lighter set for the same exercise
3. **Expected:** Weight PR value unchanged. No new PR detected.

## Edge Cases

### Sets without weight skip weight/volume PR

1. Log a set with weight omitted (bodyweight exercise scenario)
2. **Expected:** No weight or volume PR created. Rep PR may still be created if applicable.

### Empty workout returns no PRs

1. Query getWorkoutPRs for a workout with no logged sets
2. **Expected:** Empty array returned, no errors.

### PR metadata integrity

1. After creating PRs, inspect the personalRecords entries
2. **Expected:** Each PR has valid setId (references the triggering set), correct workoutId, and numeric achievedAt timestamp.

## Failure Signals

- `verify-s01-m02.ts` reports any check as FAIL — indicates PR detection logic regression
- `pnpm turbo typecheck --force` reports errors — indicates type-level breakage
- Any M001 verify script fails — indicates regression in existing functionality
- 🏆 badge not appearing after logging a qualifying set in the browser — check `useQuery(getWorkoutPRs)` subscription in React DevTools and `personalRecords` table in Convex dashboard
- `[PR Detection] Error:` in Convex function logs — indicates non-fatal PR detection failure

## Requirements Proved By This UAT

- R012 (Personal Records Tracking) — All 3 PR types (weight/volume/reps) detected correctly during logSet, stored in personalRecords table, edge cases handled (warmup skip, missing weight skip, no false positives), reactive 🏆 badge wired in web UI

## Not Proven By This UAT

- Live browser demo of 🏆 badge appearance — blocked by local Clerk+Convex auth config issue. The code compiles and the reactive query is correctly wired, but end-to-end browser verification of the badge requires working auth.
- Mobile PR badge rendering — deferred to S04
- PR detection performance under load (>200 workouts) — not tested at scale, assumed acceptable per D043

## Notes for Tester

- The backend verification script is the authoritative proof — it exercises all PR types, edge cases, and query correctness without needing a browser or auth.
- If testing the 🏆 badge in the browser, you need Clerk auth working on the local Convex dev backend. The CLERK_ISSUER_URL env var in the Convex dashboard must match your Clerk instance (e.g. `https://crisp-platypus-11.clerk.accounts.dev`).
- The badge uses amber/gold styling (`bg-amber-50 text-amber-700`) and has a `data-pr-badge` attribute you can query in DevTools: `document.querySelectorAll('[data-pr-badge]')`.
