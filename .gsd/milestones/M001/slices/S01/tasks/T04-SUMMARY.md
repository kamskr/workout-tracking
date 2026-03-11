---
id: T04
parent: S01
milestone: M001
provides:
  - Verification script (verify-s01.ts) confirming R001, R010 requirements programmatically
  - Full browser-verified end-to-end proof of exercise library, filters, search, and auth gating
key_files:
  - packages/backend/scripts/verify-s01.ts
key_decisions:
  - Used Clerk sign-in token API for automated browser auth (bypasses CAPTCHA/2FA in headless browser)
patterns_established:
  - Verification scripts in packages/backend/scripts/ using ConvexHttpClient for programmatic data assertions
observability_surfaces:
  - Run `npx tsx packages/backend/scripts/verify-s01.ts` for structured PASS/FAIL output per requirement
duration: 30m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T04: End-to-end verification — seed, query, and browse

**Created verification script and browser-verified all S01 requirements: 144 exercises seeded (R001), all filter/search queries correct (R010), auth gating redirects unauthenticated users (R023).**

## What Happened

Created `packages/backend/scripts/verify-s01.ts` — a Node script using `ConvexHttpClient` that programmatically exercises the exercise query functions. The script runs 6 assertions:

1. Total exercises >= 100 (got 144) — R001 ✅
2. Muscle group filter (chest) returns only chest exercises — R010 ✅
3. Equipment filter (barbell) returns only barbell exercises — R010 ✅
4. Search query ("press") returns exercises containing "press" — R010 ✅
5. Combined filter (chest + barbell) returns correct intersection — R010 ✅
6. Search + filter ("press" + chest) returns correct combined results — R010 ✅

Browser verification confirmed:
- Unauthenticated `/exercises` access redirects to Clerk sign-in (R023) ✅
- Signed-in user sees 144 exercises rendered in card grid ✅
- Chest filter → 16 exercises, all with Chest tag ✅
- Barbell filter → 30 exercises, all with Barbell tag ✅
- "press" search → 19 exercises, all containing "press" in name ✅
- No app-level console errors (only Clerk dev-mode warnings and Cloudflare Turnstile noise from sign-up page) ✅
- `pnpm turbo typecheck` passes all 3 packages ✅

## Verification

- `npx tsx packages/backend/scripts/verify-s01.ts` — 6/6 assertions PASS
- `pnpm turbo typecheck` — all 3 packages compile cleanly
- Browser: `/exercises` unauthenticated → redirected to Clerk sign-in (URL contains `sign-in` and `redirect_url`)
- Browser: `/exercises` authenticated → 144 exercises rendered, "Exercise Library" heading visible
- Browser: Chest muscle group filter → "16 exercises" count, all cards show Chest tag
- Browser: Barbell equipment filter → "30 exercises" count, all cards show Barbell tag
- Browser: "press" search → "19 exercises" count, all card names contain "press"

### Slice-level verification (all pass — this is the final task):
- ✅ `pnpm turbo typecheck` — all packages compile cleanly
- ✅ Convex schema deployed (dev server running, queries succeed)
- ✅ Seed exercises verified — 144 exercises in database
- ✅ Browser: exercises render, muscle group filter works, equipment filter works, search works
- ✅ Browser: signed-out → redirected to Clerk sign-in

## Diagnostics

- **Regression check**: Run `npx tsx packages/backend/scripts/verify-s01.ts` — structured PASS/FAIL output per assertion with expected vs actual on failure, exits non-zero on any failure
- **Data inspection**: Convex dashboard → `exercises` table (144 rows), or `npx convex run exercises:listExercises '{}'` from CLI
- **Filter testing**: `npx convex run exercises:listExercises '{"primaryMuscleGroup":"chest"}'` from CLI
- **UI state**: Browser `/exercises` shows count badge and filter dropdowns

## Deviations

- Browser sign-in required using Clerk Backend API sign-in tokens (`/v1/sign_in_tokens`) to bypass CAPTCHA/2FA challenges in the headless Playwright browser. This is the standard Clerk testing pattern for automated environments.

## Known Issues

- None. All requirements verified and passing.

## Files Created/Modified

- `packages/backend/scripts/verify-s01.ts` — Verification script with 6 programmatic assertions for R001 and R010
