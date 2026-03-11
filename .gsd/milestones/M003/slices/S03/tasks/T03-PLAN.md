---
estimated_steps: 5
estimated_files: 7
---

# T03: Build /shared/[id] page, privacy toggle UI, and share button on web

**Slice:** S03 — Workout Sharing & Privacy
**Milestone:** M003

## Description

Build the web UI for workout sharing and privacy. This task creates the first unauthenticated page in the app — `/shared/[id]` renders a shared workout for anyone, with a clone button for authenticated users. Also adds a privacy toggle (on workout creation and completed workout detail) and a share button (on completed workouts).

The `/shared/[id]` route must be excluded from Clerk middleware so unauthenticated visitors don't get redirected to sign-in. The page uses `useQuery(api.sharing.getSharedWorkout)` which works for both authenticated and unauthenticated users because `getSharedWorkout` doesn't call `getUserId()`.

## Steps

1. **Exclude `/shared` from Clerk middleware:** In `middleware.ts`, remove or don't add `/shared(.*)` to the `isProtectedRoute` matcher. The existing matcher array doesn't include it, but verify it's not caught by a wildcard. Comment to document the intentional exclusion.

2. **Create `/shared/[id]/page.tsx`:** Client component that reads `params.id` as the feedItemId. Calls `useQuery(api.sharing.getSharedWorkout, { feedItemId: id })`. Handles 3 states: loading (spinner), null result ("Workout not available" message), and data (renders SharedWorkoutView). Wraps with `data-shared-workout` attribute. If user is authenticated (check via `useUser()`), shows CloneButton.

3. **Create `SharedWorkoutView` component:** Renders the full shared workout detail:
   - Author info: avatar (Radix Avatar), displayName, @username (link to `/profile/[username]`)
   - Workout name, duration, date
   - Exercise list: for each exercise, show name, sets with weight/reps, set count
   - PR count badge if > 0
   - Clean, read-only presentation — no edit controls
   - Reuses the visual language from FeedItem (rounded cards, gray-50 bg sections, text sizes)

4. **Create `CloneButton`, `ShareButton`, `PrivacyToggle` components:**
   - `CloneButton`: Accepts `feedItemId`. Calls `useMutation(api.sharing.cloneSharedWorkoutAsTemplate)`. Prompts for template name (or uses workout name). On success, shows "Cloned!" confirmation. Data attribute: `data-clone-button`.
   - `ShareButton`: Accepts `workoutId`. Calls `useMutation(api.sharing.shareWorkout)`. On success, copies `window.location.origin + '/shared/' + feedItemId` to clipboard via `navigator.clipboard.writeText()`. Shows "Link copied!" confirmation. Data attribute: `data-share-button`.
   - `PrivacyToggle`: Accepts `workoutId` and current `isPublic` boolean. Renders a toggle switch (custom CSS checkbox or simple button). Calls `useMutation(api.sharing.toggleWorkoutPrivacy)`. Label: "Public" / "Private". Data attribute: `data-privacy-toggle`.

5. **Wire PrivacyToggle and ShareButton into existing workout UI:**
   - Add `isPublic` optional arg to the workout creation flow (default: true per D073). If there's a workout creation form, add PrivacyToggle to it.
   - Add ShareButton to the completed workout detail/card view for completed workouts where `isPublic !== false`.
   - Add PrivacyToggle to completed workout detail for the user's own workouts.

## Must-Haves

- [ ] `/shared/[id]` route exists and is NOT in Clerk middleware protection
- [ ] SharedWorkoutView renders full exercise+sets detail from getSharedWorkout query
- [ ] CloneButton calls cloneSharedWorkoutAsTemplate, shows confirmation
- [ ] ShareButton calls shareWorkout, copies link to clipboard
- [ ] PrivacyToggle calls toggleWorkoutPrivacy, shows current state
- [ ] All 4 data attributes present: data-shared-workout, data-clone-button, data-share-button, data-privacy-toggle
- [ ] Null/loading states handled gracefully on shared page
- [ ] Authenticated vs unauthenticated rendering on shared page (clone button visible only when authenticated)

## Verification

- `tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors (pre-existing clsx only)
- `/shared/[id]` route file exists at `apps/web/src/app/shared/[id]/page.tsx`
- Middleware does NOT include `/shared` in protected routes — grep confirms
- Data attributes verifiable: `grep -r "data-shared-workout\|data-clone-button\|data-share-button\|data-privacy-toggle" apps/web/src/`
- SharedWorkoutView component renders exercise list (not just summary)

## Observability Impact

- Signals added/changed: None — UI components consume Convex queries/mutations which already have observability signals from T01
- How a future agent inspects this: `data-shared-workout`, `data-clone-button`, `data-share-button`, `data-privacy-toggle` CSS selectors for browser assertions. `document.querySelector('[data-shared-workout]')` returns the shared workout container. `document.querySelectorAll('[data-privacy-toggle]')` finds all privacy toggles on page.
- Failure state exposed: Shared page shows "Workout not available" for null getSharedWorkout response — visible to both manual and programmatic inspection. CloneButton shows error toast on mutation failure.

## Inputs

- `packages/backend/convex/sharing.ts` — T01's sharing module (shareWorkout, getSharedWorkout, cloneSharedWorkoutAsTemplate, toggleWorkoutPrivacy)
- `packages/backend/convex/_generated/api.d.ts` — T01's updated API types with sharing module
- `apps/web/src/components/feed/FeedItem.tsx` — Visual pattern reference for workout summary rendering
- `apps/web/src/middleware.ts` — Current middleware (must NOT include /shared)
- `apps/web/src/app/profile/[username]/page.tsx` — Pattern reference for dynamic route with Convex query
- S03-RESEARCH existing patterns: Avatar component, Radix Avatar, conditional query with "skip" (D085)

## Expected Output

- `apps/web/src/middleware.ts` — Verified /shared NOT in protection (add comment)
- `apps/web/src/app/shared/[id]/page.tsx` — NEW: public share page with auth-conditional clone button
- `apps/web/src/components/sharing/SharedWorkoutView.tsx` — NEW: full workout detail view
- `apps/web/src/components/sharing/CloneButton.tsx` — NEW: clone-as-template button with confirmation
- `apps/web/src/components/sharing/ShareButton.tsx` — NEW: share button with clipboard copy
- `apps/web/src/components/sharing/PrivacyToggle.tsx` — NEW: public/private toggle switch
- Existing workout creation/detail pages — modified to include PrivacyToggle and ShareButton where appropriate
