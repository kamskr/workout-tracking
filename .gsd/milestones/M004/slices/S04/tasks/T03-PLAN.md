---
estimated_steps: 4
estimated_files: 2
---

# T03: Integrate BadgeDisplayNative + leaderboard opt-in into ProfileScreen and OtherProfileScreen, verify full compilation

**Slice:** S04 — Mobile Competitive Port
**Milestone:** M004

## Description

Final integration task: wire BadgeDisplayNative from T01 into both profile screens, add leaderboard opt-in toggle to ProfileScreen, and run full cross-package TypeScript compilation to verify zero regressions. This completes the competitive feature set on mobile by making badges visible on all profile views and giving users control over their leaderboard participation.

## Steps

1. Modify `apps/native/src/screens/ProfileScreen.tsx`:
   - Import `BadgeDisplayNative` from `../components/competitive/BadgeDisplayNative`
   - Import `useMutation` (already imported) and add `api.leaderboards.setLeaderboardOptIn` mutation
   - Import `useQuery` for `api.profiles.getProfile` (already present) — read `profile.leaderboardOptIn` field
   - Add leaderboard opt-in toggle in the Settings section (between the weight unit toggle and the rest timer section):
     - Row layout: "Show on leaderboards" label + TouchableOpacity toggle button
     - Button text: "Opted In" (accent bg) or "Opt In" (border style) based on `profile?.leaderboardOptIn === true`
     - onPress calls `setLeaderboardOptIn({ optIn: !currentOptIn })` with error catch logging `[ProfileScreen] setLeaderboardOptIn failed:`
   - Add BadgeDisplayNative between the profile card and "Workout Stats" section:
     - `<View style={styles.section}><Text style={styles.sectionTitle}>Badges</Text><BadgeDisplayNative userId={userId!} isOwnProfile={true} /></View>`
     - Only render when profile exists (inside the "Profile exists — full view" branch)
   - Placement matches D131: badges between opt-in toggle and workout stats

2. Modify `apps/native/src/screens/OtherProfileScreen.tsx`:
   - Import `BadgeDisplayNative` from `../components/competitive/BadgeDisplayNative`
   - Add badges section between the profile card and "Workout Stats" section:
     - `<View style={styles.section}><Text style={styles.sectionTitle}>Badges</Text><BadgeDisplayNative userId={profile.userId} isOwnProfile={false} /></View>`
   - No leaderboard opt-in toggle on other users' profiles (own profile only)

3. Run full TypeScript compilation across all 3 packages:
   - `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
   - `cd apps/web && npx tsc --noEmit` — 0 new errors (pre-existing clsx TS2307 only)
   - `cd apps/native && npx tsc --noEmit` — 0 new errors (pre-existing convex/react TS2307 tolerated)

4. Run structural grep checks confirming all API surfaces are wired:
   - `grep "BadgeDisplayNative" apps/native/src/screens/ProfileScreen.tsx` — hit
   - `grep "BadgeDisplayNative" apps/native/src/screens/OtherProfileScreen.tsx` — hit
   - `grep "setLeaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` — hit
   - `grep -r "api.badges" apps/native/src/` — confirms getUserBadges consumed
   - `grep -r "api.leaderboards" apps/native/src/` — confirms all 4 leaderboard APIs consumed
   - `grep -r "api.challenges" apps/native/src/` — confirms all 7 challenge APIs consumed
   - `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 7

## Must-Haves

- [ ] ProfileScreen renders BadgeDisplayNative between profile card and Workout Stats (D131)
- [ ] ProfileScreen has leaderboard opt-in toggle calling `setLeaderboardOptIn` mutation
- [ ] OtherProfileScreen renders BadgeDisplayNative between profile info and Workout Stats
- [ ] No leaderboard opt-in toggle on OtherProfileScreen (own profile only)
- [ ] TypeScript compiles with 0 new errors across all 3 packages
- [ ] All Convex API surfaces (leaderboards×4, challenges×7, badges×1) consumed in native app

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex` — 0 errors
- `cd apps/web && npx tsc --noEmit` — 0 new errors
- `cd apps/native && npx tsc --noEmit` — 0 new errors
- `grep "BadgeDisplayNative" apps/native/src/screens/ProfileScreen.tsx` — hit
- `grep "BadgeDisplayNative" apps/native/src/screens/OtherProfileScreen.tsx` — hit
- `grep "setLeaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` — hit
- All 12 Convex API functions referenced in native app (4 leaderboard + 7 challenge + 1 badge)

## Observability Impact

- Signals added/changed: ProfileScreen logs `[ProfileScreen] setLeaderboardOptIn failed:` on opt-in mutation failure. No new signals for OtherProfileScreen (BadgeDisplayNative handles its own loading/error internally).
- How a future agent inspects this: `grep "leaderboardOptIn" apps/native/src/screens/ProfileScreen.tsx` — confirms opt-in toggle is wired. BadgeDisplayNative's own useQuery handles all badge state internally.
- Failure state exposed: Opt-in toggle shows stale state if mutation fails (Convex subscription will revert to server state). BadgeDisplayNative shows loading/empty states per its internal implementation.

## Inputs

- `apps/native/src/components/competitive/BadgeDisplayNative.tsx` — From T01, self-contained badge display component
- `apps/native/src/screens/ProfileScreen.tsx` — Existing profile screen to modify (694 lines)
- `apps/native/src/screens/OtherProfileScreen.tsx` — Existing other-profile screen to modify
- `packages/backend/convex/leaderboards.ts` — `setLeaderboardOptIn` mutation API
- `packages/backend/convex/badges.ts` — `getUserBadges` query (consumed by BadgeDisplayNative)
- S01-SUMMARY forward intelligence: "Profile page already has the leaderboard opt-in toggle section" (on web — now porting to mobile)
- S03-SUMMARY forward intelligence: "`getUserBadges({ userId })` returns enriched badges — mobile can render directly"

## Expected Output

- `apps/native/src/screens/ProfileScreen.tsx` — Modified: BadgeDisplayNative section + leaderboard opt-in toggle in Settings (~30 lines added)
- `apps/native/src/screens/OtherProfileScreen.tsx` — Modified: BadgeDisplayNative section (~15 lines added)
- All 3 packages compile clean — milestone M004 mobile port complete at TypeScript level
