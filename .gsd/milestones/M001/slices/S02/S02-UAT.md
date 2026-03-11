# S02: Workout CRUD & Active Workout Session — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Backend contracts fully proven by programmatic verification script (15 checks against live Convex). UI compilation verified by typecheck. Browser auth gating confirmed. Full authenticated browser flow deferred due to Clerk dev auth complexity (Cloudflare captcha + email OTP).

## Preconditions

- Local Convex backend running: `cd packages/backend && npx convex dev`
- Next.js dev server running: `cd apps/web && pnpm dev`
- Exercise data seeded (from S01): 144 exercises in Convex
- Authenticated Clerk session in browser (sign in at localhost:3000)

## Smoke Test

Run `npx tsx packages/backend/scripts/verify-s02.ts` — should exit 0 with 15/15 checks passing. This confirms the entire backend contract is intact.

## Test Cases

### 1. Workout lifecycle (backend)

1. Run `npx tsx packages/backend/scripts/verify-s02.ts`
2. **Expected:** 15/15 checks pass, covering: create workout, add exercises, log sets, finish with duration, list workouts, get workout details with joined data, delete workout, unit preference CRUD.

### 2. Typecheck compilation

1. Run `pnpm turbo typecheck`
2. **Expected:** All 3 packages (backend, web-app, native-app) compile with 0 errors.

### 3. Auth gating on /workouts

1. Open `http://localhost:3000/workouts` in a browser without being signed in
2. **Expected:** Redirected to Clerk sign-in page with redirect_url pointing back to /workouts.

### 4. Auth gating on /workouts/active

1. Open `http://localhost:3000/workouts/active` in a browser without being signed in
2. **Expected:** Redirected to Clerk sign-in page.

### 5. Workout history page (authenticated)

1. Sign in via Clerk
2. Navigate to `/workouts`
3. **Expected:** Page renders with either empty state ("No workouts yet" + "Start Workout" CTA) or list of completed workouts if any exist.

### 6. Active workout flow (authenticated)

1. Sign in via Clerk
2. Navigate to `/workouts/active`
3. **Expected:** New workout auto-created (or existing one resumed). Running duration timer visible. "Add Exercise" button available.
4. Click "Add Exercise" → exercise picker modal opens with search/filter
5. Select an exercise → it appears in the workout
6. Click "Add Set" → new set row with weight/reps inputs
7. Enter weight and reps → values saved on blur
8. Click "Finish Workout" → redirected to `/workouts` with completed workout in list

### 7. Unit toggle

1. While on active workout page, toggle between kg and lbs
2. **Expected:** Weight displays update to reflect the selected unit. Preference persists across page reloads.

## Edge Cases

### Resume existing workout

1. Navigate to `/workouts/active` when a workout is already in progress
2. **Expected:** Existing workout is resumed (not a new one created). Duration timer shows elapsed time since original start.

### Empty workout finish

1. Start a workout, don't add any exercises
2. Click "Finish Workout"
3. **Expected:** Workout finishes with 0 exercises. Appears in history with computed duration.

### Delete workout from history

1. On `/workouts`, click delete on a workout card
2. Confirm the dialog
3. **Expected:** Workout removed from list. All associated exercises and sets cascade-deleted.

## Failure Signals

- `verify-s02.ts` exits non-zero or shows ❌ FAIL on any check
- `pnpm turbo typecheck` shows type errors in any package
- `/workouts` or `/workouts/active` returns 404 or fails to render
- Convex mutations throw unexpected errors (check browser console for `[CONVEX]` prefixed errors)
- Duration shows as "0m" after a non-trivial workout session
- Weight values displayed incorrectly after unit toggle (should convert, not just change label)

## Requirements Proved By This UAT

- R002 — Workout CRUD: Full lifecycle proven by verify-s02.ts (create, add exercises, log sets, finish, list, details, delete). UI routes exist and compile.
- R008 — Unit Preference: Preference CRUD proven by verify-s02.ts. Conversion utility tested programmatically. UI toggle component wired.
- R009 — Duration Auto-Tracking: Server-side computation proven by verify-s02.ts (durationSeconds >= 1, completedAt set). Client timer and formatDuration utility tested.

## Not Proven By This UAT

- Full authenticated browser end-to-end flow (blocked by Clerk dev Cloudflare captcha + email OTP in automated browser)
- Realtime sync across devices (deferred to S06)
- Weight input conversion correctness in browser (UI compiles with correct bindings but not exercised end-to-end)
- Error boundary behavior when Convex queries fail
- Mobile UI (deferred to S06)

## Notes for Tester

- The programmatic verification script (`verify-s02.ts`) is the primary proof artifact. Run it first.
- Clerk dev mode requires manual sign-in with a real account — automated browser testing is blocked by Cloudflare captcha and email verification.
- If testing manually in browser, create a Clerk account first via the sign-up flow, then test the workout pages.
- The `convex/testing.ts` file contains public test functions that should NOT be deployed to production.
