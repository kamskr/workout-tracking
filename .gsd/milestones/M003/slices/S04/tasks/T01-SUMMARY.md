---
id: T01
parent: S04
milestone: M003
provides:
  - 8 native social components in apps/native/src/components/social/
  - formatRelativeTime utility in apps/native/src/lib/units.ts
  - expo-clipboard dependency for clipboard functionality
key_files:
  - apps/native/src/components/social/FeedItemNative.tsx
  - apps/native/src/components/social/ReactionBarNative.tsx
  - apps/native/src/components/social/FollowButtonNative.tsx
  - apps/native/src/components/social/ProfileStatsNative.tsx
  - apps/native/src/components/social/ProfileSetupFormNative.tsx
  - apps/native/src/components/social/PrivacyToggleNative.tsx
  - apps/native/src/components/social/ShareButtonNative.tsx
  - apps/native/src/components/social/CloneButtonNative.tsx
  - apps/native/src/lib/units.ts
  - apps/native/package.json
key_decisions:
  - Used expo-clipboard ~55.0.8 (latest stable) instead of ~7.0.3 from plan (which doesn't exist on npm)
  - ReactionBarNative exports ReactionSummary type for FeedItemNative to import
  - ShareButtonNative uses hardcoded SHARE_BASE_URL constant since there's no window.location.origin in RN
patterns_established:
  - Native social component pattern: memo + useCallback + StyleSheet + theme.ts tokens + Alert.alert for errors
  - Optimistic state overlay for reactions: same D092 pattern as web, with setOptimisticState + server sync
  - TextInputModal for any prompt-like interaction (replacing iOS-only Alert.prompt)
observability_surfaces:
  - "[ShareButtonNative]" console.error prefix on share mutation failures
  - "[CloneButtonNative]" console.error prefix on clone mutation failures
  - Alert.alert surfaces all mutation errors to user with descriptive messages
duration: 20m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Build 8 native social components

**Built all 8 React Native social components porting web counterparts to native patterns with expo-clipboard, optimistic reactions, and TextInputModal prompts.**

## What Happened

Installed `expo-clipboard` (~55.0.8) as a dependency in apps/native. Added `formatRelativeTime` utility to `apps/native/src/lib/units.ts`, ported directly from web's FeedItem.tsx.

Built all 8 components in `apps/native/src/components/social/`:

1. **ReactionBarNative** — 5 emoji buttons (fire/fistBump/clap/strongArm/trophy) with optimistic toggle state using D092 pattern. Counts update instantly before server confirms.
2. **FeedItemNative** — Author avatar (View+Text initials or Image), displayName, @username, workout summary card (name, duration, exercises, PRs), relative timestamp, embedded ReactionBarNative. Accepts `onPressAuthor` callback for navigation.
3. **FollowButtonNative** — Self-contained: queries getFollowStatus + getFollowCounts, renders tap-to-toggle "Follow"/"Following" button (no hover states — mobile).
4. **ProfileStatsNative** — Queries getProfileStats, renders 4 stat cards in flex-wrap row + top exercises list. Loading spinner placeholder.
5. **ProfileSetupFormNative** — Username TextInput with USERNAME_REGEX validation, debounced availability check via getProfileByUsername query with "skip". Display name (pre-filled), multiline bio, error display, submit with createProfile mutation. KeyboardAvoidingView + ScrollView. Accepts onSuccess(username) callback.
6. **PrivacyToggleNative** — RN Switch component + toggleWorkoutPrivacy mutation. Shows "Public"/"Private" label with color coding.
7. **ShareButtonNative** — Calls shareWorkout mutation, copies URL via expo-clipboard setStringAsync(), shows "Link copied!" flash (2.5s timeout), errors via Alert.alert.
8. **CloneButtonNative** — Opens TextInputModal for template name (not Alert.prompt which is iOS-only), calls cloneSharedWorkoutAsTemplate, shows "Cloned!" flash, errors via Alert.alert.

All components use theme.ts tokens (colors, spacing, fontFamily), memo for performance, and follow the WorkoutCard pattern for error handling.

## Verification

- `ls apps/native/src/components/social/` — ✅ All 8 files present
- `grep "expo-clipboard" apps/native/package.json` — ✅ `"expo-clipboard": "~55.0.8"`
- `grep "formatRelativeTime" apps/native/src/lib/units.ts` — ✅ Exported function
- `grep "Alert.alert" apps/native/src/components/social/ShareButtonNative.tsx` — ✅ Present
- `grep "setStringAsync" apps/native/src/components/social/ShareButtonNative.tsx` — ✅ Uses expo-clipboard
- `grep "TextInputModal" apps/native/src/components/social/CloneButtonNative.tsx` — ✅ Uses modal, not Alert.prompt
- `grep "optimisticState" apps/native/src/components/social/ReactionBarNative.tsx` — ✅ D092 pattern
- `grep "USERNAME_REGEX" apps/native/src/components/social/ProfileSetupFormNative.tsx` — ✅ Live validation
- All 8 components import from `../../lib/theme` — ✅ Theme tokens used
- `tsc --noEmit -p apps/native/tsconfig.json` — All errors are pre-existing TS2307 (convex/react module resolution in pnpm workspace). Zero new error categories. No expo-clipboard type errors. Exit code matches baseline (pre-existing).
- `tsc --noEmit -p packages/backend/convex/tsconfig.json` — ✅ 0 errors (no backend changes)
- `tsc --noEmit -p apps/web/tsconfig.json` — ✅ 0 errors besides pre-existing TS2307 for clsx (no web changes)

### Slice-level checks (partial — T01 is intermediate):
- ✅ All 8 components exist in social/
- ✅ expo-clipboard in package.json
- ✅ Backend tsc green
- ✅ Web tsc green
- ⏳ 5 screens (T02)
- ⏳ usePaginatedQuery usage (T02)
- ⏳ 6 Tab.Screen entries (T03)
- ⏳ MainTabs restructure (T03)

## Diagnostics

- TypeScript compilation is the primary diagnostic. Zero new error types introduced.
- `[ShareButtonNative]` and `[CloneButtonNative]` console.error prefixes on mutation failures, matching existing WorkoutCard pattern.
- All mutation errors surface to user via Alert.alert with descriptive messages.
- No secrets or sensitive data logged.

## Deviations

- expo-clipboard version changed from `~7.0.3` (plan) to `~55.0.8` (actual latest stable on npm). The ~7.x version does not exist.
- ShareButtonNative uses a hardcoded `SHARE_BASE_URL` constant since React Native has no `window.location.origin`. This is appropriate for mobile deep links.

## Known Issues

- Pre-existing TS2307 errors for `convex/react` module resolution affect all native components (including pre-existing ones). This is a pnpm workspace + expo tsconfig interop issue that predates this task. All 30 errors are the same type (TS2307) and don't indicate actual runtime issues.

## Files Created/Modified

- `apps/native/src/components/social/FeedItemNative.tsx` — Feed card with author info, summary, reactions, relative timestamp
- `apps/native/src/components/social/ReactionBarNative.tsx` — 5 emoji buttons with optimistic toggle (D092)
- `apps/native/src/components/social/FollowButtonNative.tsx` — Self-contained follow/unfollow with counts
- `apps/native/src/components/social/ProfileStatsNative.tsx` — Stat cards + top exercises
- `apps/native/src/components/social/ProfileSetupFormNative.tsx` — Username creation form with validation
- `apps/native/src/components/social/PrivacyToggleNative.tsx` — Switch toggle for public/private
- `apps/native/src/components/social/ShareButtonNative.tsx` — Share + clipboard copy via expo-clipboard
- `apps/native/src/components/social/CloneButtonNative.tsx` — Clone with TextInputModal name input
- `apps/native/src/lib/units.ts` — Added formatRelativeTime export
- `apps/native/package.json` — Added expo-clipboard ~55.0.8 dependency
- `pnpm-lock.yaml` — Updated with expo-clipboard resolution
