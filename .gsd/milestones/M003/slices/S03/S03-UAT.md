# S03: Workout Sharing & Privacy — UAT

**Milestone:** M003
**Written:** 2026-03-11

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: The sharing & privacy contract is fully proven by a 15-check verification script (artifact-driven) covering all privacy gates, share flows, clone-as-template, and block filtering. Web UI is verified by TypeScript compilation + data attribute presence + browser smoke test of the public /shared route. Live-runtime verification (running the script against Convex) is required to validate R017 but is currently blocked by Convex CLI auth.

## Preconditions

- Convex dev server running (`npx convex dev` in packages/backend)
- Web dev server running (`pnpm dev` in apps/web)
- At least 2 test user accounts (for cross-user sharing/cloning)
- User A has at least one completed workout

## Smoke Test

Navigate to `/shared/nonexistent-id` — page should load without Clerk redirect (no login required) and show "Workout not available" message. This confirms the public route works for unauthenticated visitors.

## Test Cases

### 1. Share a Public Workout

1. Log in as User A
2. Complete a workout (create → add exercise → log sets → finish)
3. Go to /workouts — find the completed workout card
4. Verify PrivacyToggle shows "Public" (green toggle, globe icon)
5. Click the Share button
6. **Expected:** "Link copied!" confirmation appears, clipboard contains a `/shared/[id]` URL

### 2. View Shared Workout (Unauthenticated)

1. Open the copied `/shared/[id]` URL in an incognito/private browser window (not signed in)
2. **Expected:** Page loads without login redirect, shows workout name, duration, exercises with sets (weight/reps), author info
3. **Expected:** No "Clone as Template" button visible (unauthenticated)

### 3. Clone Shared Workout as Template

1. Open the same `/shared/[id]` URL while signed in as User B
2. Verify "Clone as Template" button is visible
3. Click "Clone as Template" — enter a template name in the prompt
4. **Expected:** "Cloned!" confirmation appears, template created in User B's templates at /templates

### 4. Privacy Toggle Hides from Feed

1. As User A, toggle a completed workout to "Private" via the PrivacyToggle
2. **Expected:** Toggle switches to gray with lock icon, label shows "Private"
3. As User B (who follows User A), check /feed
4. **Expected:** The now-private workout does NOT appear in User B's feed

### 5. Private Workout Cannot Be Shared

1. As User A, try to share a private workout (if ShareButton is visible — it shouldn't be)
2. **Expected:** ShareButton is NOT rendered for private workouts (isPublic === false hides it at UI level)
3. If URL is manually constructed with the feedItemId of a private workout, navigating to `/shared/[id]` shows "Workout not available"

### 6. Profile Stats Exclude Private Workouts

1. As User A, verify profile stats at `/profile/[username]`
2. Note total workouts count
3. Mark one workout as private
4. Refresh profile page
5. **Expected:** Total workouts count decreases by 1 (private workout excluded from public stats)

## Edge Cases

### Nonexistent Share ID

1. Navigate to `/shared/completely-invalid-id`
2. **Expected:** "Workout not available" message with home link. No error page, no crash.

### Blocked User Views Shared Workout

1. User C is blocked by User A
2. User C navigates to User A's shared workout URL
3. **Expected:** "Workout not available" (block filtering rejects the query)

### Clone Preserves Exercise Order

1. User A shares a workout with 3+ exercises in specific order
2. User B clones it as template
3. User B views the template at /templates
4. **Expected:** Exercises appear in same order as original workout, with correct targetSets and targetReps

### Toggle Privacy Cascade

1. User A shares a workout (creating a "workout_shared" feed item)
2. User A toggles the workout to private
3. **Expected:** Both the workout AND the associated feed item(s) are updated to isPublic: false
4. The shared link now shows "Workout not available"

## Failure Signals

- `/shared/[id]` page redirects to Clerk login → middleware is not excluding /shared routes
- Clone button visible without signing in → auth-conditional rendering broken
- Private workout appears in follower's feed → feed privacy filtering broken
- ShareButton visible on private workout → UI-level privacy gate broken
- Profile stats unchanged after toggling privacy → includePrivate parameter not working
- "Workout not available" for a valid public shared workout → getSharedWorkout query or feedItem lookup broken
- TypeScript errors in `apps/web/tsconfig.json` → component imports or API types broken

## Requirements Proved By This UAT

- R017 (Workout Sharing) — Share via public link (test 1+2), clone as template (test 3), privacy toggle excludes from social surfaces (tests 4+5+6), block filtering (edge case), unauthenticated access (test 2)
- R017 sub-claims:
  - Public workout shareable via link: tests 1+2
  - Unauthenticated visitor can view shared workout: test 2
  - Authenticated user can clone as template: test 3
  - Private workouts excluded from feed: test 4
  - Private workouts cannot be shared: test 5
  - Profile stats respect privacy: test 6

## Not Proven By This UAT

- R017 runtime execution of all 15 verification script checks (blocked by Convex CLI auth — must run `verify-s03-m03.ts` live)
- Mobile sharing/privacy UI (deferred to S04)
- Feed performance under load with privacy filtering (operational verification)
- Realtime subscription latency for privacy toggle cascade (the toggle patches feed items, but we don't prove the subscription updates within N seconds)
- Concurrent privacy toggles (race condition edge case — what if two tabs toggle simultaneously)

## Notes for Tester

- The verification script (`npx tsx packages/backend/scripts/verify-s03-m03.ts`) is the authoritative contract test — run it first if Convex CLI auth is available. If all 15 checks pass, R017 is fully validated.
- The `clsx` dependency was manually copied to resolve a pre-existing build error — if `pnpm install` is run, the web app may fail to build until `clsx` is properly added to dependencies.
- The PrivacyToggle defaults workouts to public (D073 convention) — existing workouts created before S03 are treated as public (undefined = public).
- The CloneButton uses `window.prompt` for template name input — this works in browsers but would need adaptation for mobile (S04).
