---
id: T03
parent: S02
milestone: M004
provides:
  - /challenges page with StatusPicker (Active/Completed/My Challenges), ChallengeList, CreateChallengeForm, and ChallengeDetail components
  - "Challenges" nav link in Header for both desktop and mobile authenticated menus
  - /challenges(.*) middleware route protection
  - 6 data-challenge-* attributes for programmatic browser assertions
key_files:
  - apps/web/src/app/challenges/page.tsx
  - apps/web/src/components/Header.tsx
  - apps/web/src/middleware.ts
key_decisions:
  - ChallengeListItem interface defined in page.tsx to cast Convex's union return type from listChallenges (the myOnly path uses db.get which returns a union of all table types); this avoids derivative TS errors without modifying the backend
  - ChallengeDetail rendered inline replacing the list view (not a new route), toggled via selectedChallengeId state — matches single-page architecture from task plan
  - Exercise selector uses api.exercises.listExercises (empty args) rather than leaderboard-specific getLeaderboardExercises, since challenges can target any exercise not just ones with leaderboard entries
patterns_established:
  - StatusPicker pill filter pattern reused from MetricPicker/PeriodPicker in leaderboards (cn() utility, blue-600 active, gray-100 inactive)
  - Expandable inline form pattern (show/hide with state toggle) instead of modal for CreateChallengeForm
  - ChallengeListItem type assertion pattern to work around Convex's db.get union type inference
observability_surfaces:
  - 6 data-challenge-* attributes enable document.querySelectorAll('[data-challenge-*]') for programmatic browser assertions
  - Mutation errors surface inline as error messages below form or below action buttons
  - Loading states (Spinner) and empty states visible in UI
duration: ~15min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Web UI — /challenges page, navigation, middleware

**Built the complete /challenges web page with status filtering, challenge creation form, live standings table, join/leave/cancel actions, Header navigation links, and middleware route protection.**

## What Happened

Created `apps/web/src/app/challenges/page.tsx` (~530 lines) containing 5 components:
1. **StatusPicker** — pill-style filter with Active/Completed/My Challenges options
2. **TypePicker** — pill-style selector for challenge type in create form
3. **CreateChallengeForm** — inline expandable form with title, type picker, conditional exercise selector, datetime-local start/end inputs, validation, and useMutation submit
4. **ChallengeDetail** — full detail view with challenge info, status/type badges, winner display, Join/Leave/Cancel action buttons with correct visibility logic, and ranked standings table with "You" badge highlighting
5. **ChallengesPage** — main page component with filter state, list rendering, and detail view toggle

Added "Challenges" link to Header.tsx in both desktop authenticated nav and mobile DisclosurePanel menu. Added `/challenges(.*)` to middleware.ts protected routes.

## Verification

- `cd apps/web && npx -p typescript tsc --noEmit` — 0 new errors (pre-existing: 1 clsx TS2307 + 5 from T02's listChallenges db.get union in packages/backend/convex/challenges.ts)
- `cd packages/backend && npx -p typescript tsc --noEmit -p convex` — 0 errors
- `grep "data-challenge-page\|data-challenge-list\|data-challenge-detail\|data-challenge-standings\|data-challenge-create\|data-challenge-join" apps/web/src/app/challenges/page.tsx` — all 6 attributes present ✓
- `grep "Challenges" apps/web/src/components/Header.tsx` — 2 occurrences (desktop + mobile) ✓
- `grep "challenges" apps/web/src/middleware.ts` — `/challenges(.*)` present ✓
- `ls apps/web/src/app/challenges/page.tsx` — file exists ✓
- Page imports from `@packages/backend/convex/_generated/api` — type-safe Convex bindings ✓
- Browser navigation to http://localhost:3000/challenges redirected to Clerk sign-in with `redirect_url=...%2Fchallenges` — middleware protection confirmed ✓

### Slice-level verification status (T03 is final task):
- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors ✓
- `cd apps/web && npx tsc --noEmit` — 0 new errors (pre-existing clsx TS2307 only + T02 backend union issues) ✓
- `npx tsx packages/backend/scripts/verify-s02-m04.ts` — requires live Convex backend (not run)
- crons.ts exists and exports default cronJobs() — ✓
- finishWorkout has 3 non-fatal try/catch blocks — ✓
- /challenges page has all 6 data-challenge-* attributes — ✓
- Header has "Challenges" link for both desktop and mobile — ✓
- Middleware protects /challenges(.*) — ✓

## Diagnostics

- All 6 `data-challenge-*` attributes enable `document.querySelectorAll('[data-challenge-*]')` for programmatic browser assertions
- Challenge list reactively updates on Convex subscription changes (useQuery)
- Status badges (green/gray/red/yellow) provide visual state-machine verification
- Mutation error messages surface inline in UI (below form for create, below action buttons for join/leave/cancel)
- Empty states ("No challenges found") and loading spinners indicate query status

## Deviations

- Added `ChallengeListItem` interface with type assertion cast on the `listChallenges` query result to work around Convex's generated return type being a union of all table document types. This is necessary because the `myOnly` code path in `listChallenges` uses `ctx.db.get(id)` which Convex infers as returning any table's document. The cast is safe since `listChallenges` always returns challenge documents.

## Known Issues

- 5 pre-existing TypeScript errors in `packages/backend/convex/challenges.ts` from T02's `listChallenges` implementation — the `db.get()` call on `Set<Id<"challenges">>` values returns a union type. These only surface when the web app's tsc includes the backend via path mapping; the backend's own `npx tsc -p convex` passes cleanly. These should be fixed by adding explicit type casts in the backend `listChallenges` handler (out of scope for T03/UI task).
- Full end-to-end browser testing of the challenges page requires Clerk authentication + live Convex backend. Middleware protection was browser-verified via redirect behavior.

## Files Created/Modified

- `apps/web/src/app/challenges/page.tsx` — new file: complete /challenges page with StatusPicker, ChallengeList, CreateChallengeForm, ChallengeDetail components (~530 lines)
- `apps/web/src/components/Header.tsx` — added "Challenges" link in desktop authenticated nav section and mobile DisclosurePanel menu
- `apps/web/src/middleware.ts` — added `/challenges(.*)` to isProtectedRoute matcher array
