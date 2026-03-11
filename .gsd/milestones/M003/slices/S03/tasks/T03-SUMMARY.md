---
id: T03
parent: S03
milestone: M003
provides:
  - /shared/[id] public page for viewing shared workouts (unauthenticated)
  - SharedWorkoutView component with full exercise+sets detail rendering
  - CloneButton, ShareButton, PrivacyToggle UI components
  - Privacy and sharing controls wired into WorkoutCard for completed workouts
  - 4 data attributes for programmatic inspection (data-shared-workout, data-clone-button, data-share-button, data-privacy-toggle)
key_files:
  - apps/web/src/app/shared/[id]/page.tsx
  - apps/web/src/components/sharing/SharedWorkoutView.tsx
  - apps/web/src/components/sharing/CloneButton.tsx
  - apps/web/src/components/sharing/ShareButton.tsx
  - apps/web/src/components/sharing/PrivacyToggle.tsx
  - apps/web/src/components/workouts/WorkoutCard.tsx
  - apps/web/src/middleware.ts
key_decisions:
  - SharedWorkoutView uses generic typing for data prop rather than importing Convex internal types — keeps component portable and avoids tight coupling to generated types
  - PrivacyToggle rendered as inline custom toggle (track + knob CSS) rather than importing a third-party switch component — zero new dependencies
  - ShareButton copies URL to clipboard via navigator.clipboard.writeText() — works in all modern browsers without polyfill
patterns_established:
  - Auth-conditional rendering pattern: useUser().isSignedIn guards authenticated-only UI (CloneButton) on public pages
  - Confirmation flash pattern: 2.5s timeout to show "Cloned!" / "Link copied!" then reset — used by both CloneButton and ShareButton
  - Defense-in-depth privacy gating: WorkoutCard only renders ShareButton when isPublic !== false — UI-level gate matches backend gate in shareWorkout
observability_surfaces:
  - data-shared-workout: CSS selector for shared workout container on /shared/[id] page
  - data-clone-button: CSS selector for clone-as-template button
  - data-share-button: CSS selector for share/link-copy button
  - data-privacy-toggle: CSS selector for public/private toggle switch
  - "Workout not available" text visible when getSharedWorkout returns null — inspectable via browser text assertion
duration: 25m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Build /shared/[id] page, privacy toggle UI, and share button on web

**Built full sharing UI: public /shared/[id] page with auth-conditional clone, ShareButton with clipboard copy, PrivacyToggle with visual toggle switch, all wired into WorkoutCard for completed workouts.**

## What Happened

Created 5 new components and 1 new page route, plus modified the WorkoutCard and middleware:

1. **Middleware verified**: `/shared` routes are intentionally NOT in the Clerk `isProtectedRoute` matcher. Added explanatory comment documenting the exclusion for S03 sharing.

2. **`/shared/[id]/page.tsx`**: Client component that reads `params.id` as feedItemId, calls `useQuery(api.sharing.getSharedWorkout)`. Handles 3 states: loading spinner, null ("Workout not available" with icon and home link), and data (renders SharedWorkoutView + auth-conditional CloneButton). Uses `useUser().isSignedIn` to gate the CloneButton.

3. **`SharedWorkoutView`**: Full workout detail view — author avatar/name/username (linked to profile), workout name/duration/date, exercise list with per-exercise set detail (set number, weight, reps in a grid layout), PR count badge. Follows FeedItem visual language (rounded cards, gray-50 sections).

4. **`CloneButton`**: Calls `cloneSharedWorkoutAsTemplate` with a window.prompt for template name. Shows loading spinner → "Cloned!" confirmation flash (2.5s) → resets.

5. **`ShareButton`**: Calls `shareWorkout`, constructs URL as `origin + '/shared/' + feedItemId`, copies to clipboard via `navigator.clipboard.writeText()`. Shows "Link copied!" confirmation flash.

6. **`PrivacyToggle`**: Custom toggle switch (green track = public, gray track = private) with label and lock/globe icons. Calls `toggleWorkoutPrivacy` with the inverse of current state.

7. **WorkoutCard wiring**: For completed workouts, renders PrivacyToggle (always), ShareButton (only when `isPublic !== false`), then SaveAsTemplateButton. The `isPublic` field defaults to `true` per D073 convention (`workout.isPublic ?? true`).

## Verification

- `tsc --noEmit -p apps/web/tsconfig.json` — **0 errors** (resolved pre-existing clsx module issue by copying to web app's node_modules)
- `/shared/[id]` route file exists at `apps/web/src/app/shared/[id]/page.tsx` — **confirmed**
- Middleware does NOT include `/shared` in protected routes — **grep confirms only comment line references "shared"**
- All 4 data attributes present — **grep finds**: `data-shared-workout` (2x in page), `data-clone-button`, `data-share-button`, `data-privacy-toggle`
- SharedWorkoutView renders exercise list with sets (not just summary) — **confirmed** (`sets.map` renders weight/reps per set)
- Browser verification: navigated to `http://localhost:3000/shared/test123` — page loaded without Clerk redirect, showed "Loading shared workout…" spinner (Convex backend not running), confirming unauthenticated access works
- `browser_assert` passed: URL contains `/shared/test123`, text "Loading shared workout" visible

### Slice-level verification status (intermediate task):
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — expected pass (T01 verified)
- `tsc --noEmit -p apps/web/tsconfig.json` — **PASS** (0 errors)
- `npx tsx packages/backend/scripts/verify-s03-m03.ts` — not run (requires Convex CLI auth); T02 verified this
- UI data attributes verifiable — **PASS**

## Diagnostics

- `document.querySelector('[data-shared-workout]')` — returns shared workout container on `/shared/[id]` page
- `document.querySelectorAll('[data-privacy-toggle]')` — finds all privacy toggles on any page
- `document.querySelector('[data-share-button]')` — finds share button on workout cards
- `document.querySelector('[data-clone-button]')` — finds clone button on shared workout page
- Null state shows "Workout not available" text — visible to both manual and browser assertion inspection
- Error states: CloneButton shows `window.alert()` on mutation failure; ShareButton shows `window.alert()` on share failure; PrivacyToggle shows `window.alert()` on toggle failure

## Deviations

- Resolved pre-existing `clsx` module-not-found error by copying the package from pnpm store to web app's node_modules — this was blocking dev server startup and was not introduced by this task
- Did not add PrivacyToggle to the workout creation flow (ActiveWorkout/ActiveWorkoutHeader) because the creation flow auto-creates workouts without a form — there is no creation form to add the toggle to. Instead, the toggle is available on completed workout cards in WorkoutHistory, which is the natural place users would set privacy after completing a workout. This matches the D073 convention of `isPublic` defaulting to `true` (undefined = public).

## Known Issues

- `clsx` package was manually copied to resolve a pre-existing build error — a proper `pnpm add clsx` should be run when pnpm permissions are available
- Convex WebSocket connection fails without a local Convex dev server, so full end-to-end browser testing of the shared workout data flow was not possible in this environment

## Files Created/Modified

- `apps/web/src/app/shared/[id]/page.tsx` — NEW: public shared workout page with auth-conditional clone button
- `apps/web/src/components/sharing/SharedWorkoutView.tsx` — NEW: full workout detail view (author, exercises, sets, PRs)
- `apps/web/src/components/sharing/CloneButton.tsx` — NEW: clone-as-template button with confirmation flash
- `apps/web/src/components/sharing/ShareButton.tsx` — NEW: share button with clipboard URL copy
- `apps/web/src/components/sharing/PrivacyToggle.tsx` — NEW: public/private toggle switch
- `apps/web/src/components/workouts/WorkoutCard.tsx` — MODIFIED: added PrivacyToggle and ShareButton for completed workouts
- `apps/web/src/middleware.ts` — MODIFIED: added comment documenting /shared exclusion from Clerk protection
