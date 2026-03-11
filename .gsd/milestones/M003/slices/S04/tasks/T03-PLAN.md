---
estimated_steps: 5
estimated_files: 3
---

# T03: Restructure navigation, wire social features into WorkoutCard, and verify TypeScript across all packages

**Slice:** S04 — Mobile Social Port
**Milestone:** M003

## Description

The final task restructures MainTabs.tsx from 5 tabs to 6 tabs (D078), replacing the Settings tab with Profile and adding a Feed tab. Each new tab gets a nested stack navigator for drill-down navigation (Feed → OtherProfile → SharedWorkout, Profile → ProfileSetup → OtherProfile). This also wires PrivacyToggleNative and ShareButtonNative into the native WorkoutCard for completed workouts, and runs TypeScript compilation across all 3 packages as the definitive verification. Navigation restructuring is done last because it's the riskiest change (affects all tabs) and everything else should already compile.

## Steps

1. **Define navigation type params** — At the top of MainTabs.tsx (or in a separate types file), define `FeedStackParamList` (FeedMain, OtherProfile: { userId: string }, SharedWorkout: { feedItemId: string }) and `ProfileStackParamList` (ProfileMain, ProfileSetup, OtherProfile: { userId: string }). Update TAB_ICONS map with Feed (`newspaper`/`newspaper-outline`) and Profile (`person`/`person-outline`). Remove Settings entry from TAB_ICONS.

2. **Create Feed and Profile stack navigators** — FeedTab: FeedScreen as default, OtherProfileScreen and SharedWorkoutScreen as drill-down screens. ProfileTab: ProfileScreen as default, ProfileSetupScreen and OtherProfileScreen as drill-down screens. Both use `screenOptions={{ headerShown: false }}` matching existing pattern. Import all new screens.

3. **Update Tab.Navigator** — Replace the 5-tab configuration with 6 tabs: Exercises, Workouts, Templates, Analytics, Feed, Profile. Remove the SettingsTab stack and Settings Tab.Screen. Add Feed and Profile Tab.Screens. Verify all 6 tabs render with correct icons.

4. **Wire PrivacyToggleNative and ShareButtonNative into WorkoutCard** — Import and render PrivacyToggleNative and ShareButtonNative inside WorkoutCard for completed workouts (same pattern as web's WorkoutCard additions in S03). PrivacyToggle appears if workout has `isPublic` field. ShareButton appears only for public completed workouts (`isPublic !== false`). Accept `isPublic` as an optional prop or query it.

5. **Run full TypeScript verification** — Execute `tsc --noEmit` for all 3 packages (backend, web, native). Verify 0 errors across all. Verify backend verification scripts are unchanged (no backend files modified). Confirm MainTabs has exactly 6 Tab.Screen entries. Confirm SettingsScreen functionality is accessible via ProfileScreen (grep for signOut, setUnitPreference, setDefaultRestSeconds).

## Must-Haves

- [ ] MainTabs.tsx has exactly 6 Tab.Screen entries (Exercises, Workouts, Templates, Analytics, Feed, Profile)
- [ ] Settings tab removed — SettingsScreen no longer a top-level tab
- [ ] Feed tab icon: newspaper/newspaper-outline (Ionicons)
- [ ] Profile tab icon: person/person-outline (Ionicons)
- [ ] FeedStackParamList and ProfileStackParamList type params defined and used
- [ ] Feed stack: FeedScreen → OtherProfileScreen → SharedWorkoutScreen navigation
- [ ] Profile stack: ProfileScreen → ProfileSetupScreen → OtherProfileScreen navigation
- [ ] WorkoutCard shows PrivacyToggleNative for completed workouts
- [ ] WorkoutCard shows ShareButtonNative for public completed workouts
- [ ] `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- [ ] `tsc --noEmit -p apps/web/tsconfig.json` — 0 errors
- [ ] `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors
- [ ] No backend files modified (all M003 verification scripts unchanged)

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
- `tsc --noEmit -p apps/web/tsconfig.json` — 0 errors
- `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` — returns 6
- `grep "newspaper" apps/native/src/navigation/MainTabs.tsx` — Feed icon present
- `grep "person" apps/native/src/navigation/MainTabs.tsx` — Profile icon present
- `grep -c "Settings" apps/native/src/navigation/MainTabs.tsx` — should NOT appear as a Tab.Screen (may appear in imports/types)
- `grep "PrivacyToggleNative" apps/native/src/components/WorkoutCard.tsx` — wired into WorkoutCard
- `grep "ShareButtonNative" apps/native/src/components/WorkoutCard.tsx` — wired into WorkoutCard
- `grep "signOut" apps/native/src/screens/ProfileScreen.tsx` — settings preserved in profile
- Backend scripts unchanged: `git diff --name-only packages/backend/scripts/` — no changes

## Observability Impact

- Signals added/changed: None new — navigation restructuring is pure UI wiring with no new error paths
- How a future agent inspects this: `grep -c "Tab.Screen"` for tab count verification. TypeScript compilation for type correctness. Git diff for backend isolation check.
- Failure state exposed: Navigation type errors surface as TypeScript compilation failures (not runtime crashes)

## Inputs

- `apps/native/src/navigation/MainTabs.tsx` — Current 5-tab structure to be restructured
- `apps/native/src/components/WorkoutCard.tsx` — Current WorkoutCard to add share/privacy controls
- `apps/native/src/screens/FeedScreen.tsx` — From T02
- `apps/native/src/screens/ProfileScreen.tsx` — From T02 (already includes settings)
- `apps/native/src/screens/ProfileSetupScreen.tsx` — From T02
- `apps/native/src/screens/OtherProfileScreen.tsx` — From T02
- `apps/native/src/screens/SharedWorkoutScreen.tsx` — From T02
- `apps/native/src/components/social/PrivacyToggleNative.tsx` — From T01
- `apps/native/src/components/social/ShareButtonNative.tsx` — From T01

## Expected Output

- `apps/native/src/navigation/MainTabs.tsx` — 6-tab navigator with Feed and Profile stacks, typed navigation params, correct icons
- `apps/native/src/components/WorkoutCard.tsx` — Updated with PrivacyToggleNative and ShareButtonNative for completed workouts
- All 3 packages compile with 0 TypeScript errors
