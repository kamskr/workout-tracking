---
id: T03
parent: S04
milestone: M003
provides:
  - 6-tab navigation with Feed and Profile stacks (replacing 5-tab with Settings)
  - PrivacyToggleNative and ShareButtonNative wired into WorkoutCard for completed workouts
  - FeedStackParamList and ProfileStackParamList exported types for typed navigation
key_files:
  - apps/native/src/navigation/MainTabs.tsx
  - apps/native/src/components/WorkoutCard.tsx
key_decisions:
  - OtherProfile route params use { userId?: string; username?: string } (optional both) to match OtherProfileScreen's existing flexible lookup pattern
  - PrivacyToggle placed above Save-as-Template button in WorkoutCard, ShareButton conditionally rendered when isPublic !== false (matching web pattern exactly)
patterns_established:
  - Typed stack navigators with createNativeStackNavigator<ParamList> for social drill-down (Feed → OtherProfile → SharedWorkout, Profile → ProfileSetup → OtherProfile)
  - WorkoutCard social controls row: PrivacyToggle + conditional ShareButton for completed workouts
observability_surfaces:
  - Navigation restructuring is pure UI wiring — no new error paths or observability surfaces added
  - Pre-existing console.error prefixes from T01/T02 components remain ([ShareButtonNative], [CloneButtonNative], [FeedScreen], [ProfileScreen])
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Restructure navigation, wire social features into WorkoutCard, and verify TypeScript across all packages

**Restructured MainTabs from 5 tabs to 6 tabs (Feed + Profile replacing Settings), wired PrivacyToggleNative and ShareButtonNative into WorkoutCard for completed workouts, and verified TypeScript compilation across all 3 packages.**

## What Happened

### Navigation Restructure (MainTabs.tsx)
- Defined `FeedStackParamList` (FeedMain, OtherProfile, SharedWorkout) and `ProfileStackParamList` (ProfileMain, ProfileSetup, OtherProfile) as exported types
- Created FeedTab stack: FeedScreen → OtherProfileScreen → SharedWorkoutScreen drill-down
- Created ProfileTab stack: ProfileScreen → ProfileSetupScreen → OtherProfileScreen drill-down
- Updated TAB_ICONS: removed Settings entry, added Feed (newspaper/newspaper-outline) and Profile (person/person-outline)
- Updated Tab.Navigator: 6 Tab.Screen entries (Exercises, Workouts, Templates, Analytics, Feed, Profile)
- Removed SettingsStack and SettingsTab entirely — settings functionality preserved in ProfileScreen (verified via signOut, setUnitPreference, setDefaultRestSeconds grep)

### WorkoutCard Social Wiring
- Added `isPublic?: boolean` to WorkoutCardProps.workout interface
- Imported PrivacyToggleNative and ShareButtonNative
- Added social controls row for completed workouts: PrivacyToggle always shown, ShareButton conditionally shown when `isPublic !== false` (matching web pattern)
- Social row placed above Save-as-Template button using `styles.socialRow` (flexDirection: row, space-between)

### TypeScript Verification
- Backend: 0 errors (no backend files modified)
- Web: 0 new errors (pre-existing TS2307 for clsx only)
- Native: 0 new errors (pre-existing TS2307 for convex/react module resolution only — 34 total, all same category)

## Verification

### Task-level checks (all ✅):
- `grep -c "Tab.Screen" apps/native/src/navigation/MainTabs.tsx` → 6
- `grep "newspaper" apps/native/src/navigation/MainTabs.tsx` → Feed icon present
- `grep "person" apps/native/src/navigation/MainTabs.tsx` → Profile icon present
- `grep "Tab.Screen.*Settings" apps/native/src/navigation/MainTabs.tsx` → No Settings Tab.Screen
- `grep "PrivacyToggleNative" apps/native/src/components/WorkoutCard.tsx` → import + render
- `grep "ShareButtonNative" apps/native/src/components/WorkoutCard.tsx` → import + conditional render
- `grep "signOut" apps/native/src/screens/ProfileScreen.tsx` → Settings preserved in Profile
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` → 0 errors
- `tsc --noEmit -p apps/web/tsconfig.json` → 0 new errors (1 pre-existing TS2307 for clsx)
- `tsc --noEmit -p apps/native/tsconfig.json` → 0 new errors (34 pre-existing TS2307 for convex/react)
- `git diff --name-only packages/backend/scripts/` → no changes
- `grep "export type.*ParamList" apps/native/src/navigation/MainTabs.tsx` → FeedStackParamList, ProfileStackParamList exported

### Slice-level checks (all ✅ — final task):
- ✅ All 8 components exist: `ls apps/native/src/components/social/` — 8 files
- ✅ All 5 screens exist: FeedScreen, ProfileScreen, ProfileSetupScreen, OtherProfileScreen, SharedWorkoutScreen
- ✅ `grep -r "usePaginatedQuery" apps/native/src/` — FeedScreen usage confirmed
- ✅ `grep "expo-clipboard" apps/native/package.json` — ~55.0.8
- ✅ `grep -c "Tab.Screen" MainTabs.tsx` → 6
- ✅ SettingsScreen functionality preserved in ProfileScreen (signOut, setUnitPreference, setDefaultRestSeconds)
- ✅ Backend verification scripts unchanged: `wc -l packages/backend/scripts/verify-s0*-m03.ts` — 479 + 713 + 912 = 2104 total (unchanged)
- ✅ `tsc --noEmit` all 3 packages — 0 new errors

## Diagnostics

- TypeScript compilation is the primary diagnostic — 0 new errors confirms all navigation types and component wiring are correct
- Navigation type errors would surface as TypeScript compilation failures (not runtime crashes)
- No new observability surfaces added — this task is pure UI wiring

## Deviations

None. Implementation matched the task plan exactly.

## Known Issues

- Pre-existing TS2307 errors for `convex/react` and `@clerk` module resolution in native app (34 total). This is a pnpm workspace + expo tsconfig interop issue that predates the entire S04 slice. All errors are the same category (module resolution, not type errors) and don't affect runtime behavior.
- Pre-existing TS2307 for `clsx` in `apps/web/src/lib/utils.ts` — same class of issue, predates S04.

## Files Created/Modified

- `apps/native/src/navigation/MainTabs.tsx` — Restructured from 5 tabs to 6 tabs with Feed and Profile stacks, typed navigation params, removed Settings tab
- `apps/native/src/components/WorkoutCard.tsx` — Added PrivacyToggleNative and ShareButtonNative for completed workouts, added isPublic to props interface
