---
estimated_steps: 5
estimated_files: 10
---

# T01: Build 8 native social components

**Slice:** S04 — Mobile Social Port
**Milestone:** M003

## Description

Create all 8 native social components in `apps/native/src/components/social/`, porting each web counterpart to React Native using established patterns (View/Text/TouchableOpacity/StyleSheet, theme.ts tokens). Install `expo-clipboard` for clipboard functionality. Add `formatRelativeTime` utility to `apps/native/src/lib/units.ts`. Each component mirrors its web counterpart's Convex API usage but replaces web-specific APIs (window.alert → Alert.alert, window.prompt → TextInputModal, navigator.clipboard → expo-clipboard, CSS → StyleSheet, Radix Avatar → View+Image, hover → tap).

## Steps

1. **Install expo-clipboard** — Run `npx expo install expo-clipboard` in `apps/native/`. Add `formatRelativeTime` function to `apps/native/src/lib/units.ts` (copy pure logic from web's FeedItem.tsx).

2. **Build FeedItemNative and ReactionBarNative** — FeedItemNative renders author avatar (View + Text initials + optional Image), displayName, @username, workout summary card (name, duration, exercise count, PRs), relative timestamp, and ReactionBarNative. ReactionBarNative renders 5 emoji buttons (fire/fistBump/clap/strongArm/trophy) with counts and optimistic toggle state (same local state overlay pattern as web D092). Replace `cn()` with conditional StyleSheet. Use `useCallback` for toggle handlers. Accept `onPressAuthor` callback prop for navigation.

3. **Build FollowButtonNative and ProfileStatsNative** — FollowButtonNative is self-contained: queries `getFollowStatus` + `getFollowCounts`, renders "Follow"/"Following" button (tap toggles, no hover). ProfileStatsNative mirrors web ProfileStats: queries `getProfileStats`, renders 4 stat cards in flex row + top exercises list. Uses theme.ts spacing and colors.

4. **Build ProfileSetupFormNative** — Username TextInput with live format validation (`USERNAME_REGEX`) and debounced availability check via `getProfileByUsername` query with "skip". Display name TextInput (pre-filled from Clerk). Bio TextInput (multiline). Error display. Submit button calls `createProfile` mutation. Uses KeyboardAvoidingView. Accept `onSuccess(username)` callback for navigation.

5. **Build PrivacyToggleNative, ShareButtonNative, CloneButtonNative** — PrivacyToggleNative uses RN `Switch` component + `toggleWorkoutPrivacy` mutation. ShareButtonNative calls `shareWorkout` mutation, copies URL via `expo-clipboard` `setStringAsync()`, shows "Link copied!" flash via state (2.5s timeout), errors via `Alert.alert`. CloneButtonNative opens TextInputModal for name, calls `cloneSharedWorkoutAsTemplate`, shows "Cloned!" flash, errors via Alert.alert.

## Must-Haves

- [ ] All 8 component files exist in `apps/native/src/components/social/`
- [ ] `expo-clipboard` added to `apps/native/package.json`
- [ ] `formatRelativeTime` exported from `apps/native/src/lib/units.ts`
- [ ] ReactionBarNative uses optimistic state overlay pattern (D092) — not blocking on server response
- [ ] FollowButtonNative uses tap-to-toggle (no hover states — mobile constraint)
- [ ] ProfileSetupFormNative validates username with `USERNAME_REGEX` and debounced availability check
- [ ] ShareButtonNative uses `expo-clipboard` setStringAsync (not deprecated react-native Clipboard)
- [ ] CloneButtonNative uses TextInputModal (not Alert.prompt which is iOS-only)
- [ ] All components use theme.ts tokens (colors, spacing, fontFamily)
- [ ] All mutation error handlers use `Alert.alert()` (not window.alert)
- [ ] `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors

## Verification

- `tsc --noEmit -p apps/native/tsconfig.json` — 0 errors
- `ls apps/native/src/components/social/` — shows all 8 files
- `grep "expo-clipboard" apps/native/package.json` — confirms dependency present
- `grep "formatRelativeTime" apps/native/src/lib/units.ts` — confirms utility exported
- `grep "Alert.alert" apps/native/src/components/social/ShareButtonNative.tsx` — confirms RN alert pattern
- `grep "setStringAsync" apps/native/src/components/social/ShareButtonNative.tsx` — confirms expo-clipboard usage
- `grep "TextInputModal" apps/native/src/components/social/CloneButtonNative.tsx` — confirms modal usage

## Observability Impact

- Signals added/changed: `[ShareButtonNative]` and `[CloneButtonNative]` console.error prefixes on mutation failures, matching existing WorkoutCard pattern
- How a future agent inspects this: TypeScript compilation (0 errors = all API types correct). Component existence check via `ls`. Grep for API usage patterns.
- Failure state exposed: Alert.alert surfaces all mutation errors to user with descriptive messages

## Inputs

- `apps/web/src/components/feed/FeedItem.tsx` — Web FeedItem for port reference (author layout, summary card, formatRelativeTime)
- `apps/web/src/components/feed/ReactionBar.tsx` — Web ReactionBar for optimistic state pattern (D092)
- `apps/web/src/app/profile/[username]/page.tsx` — Web FollowButton for self-contained query + mutation pattern (D093)
- `apps/web/src/components/profile/ProfileStats.tsx` — Web ProfileStats for stat cards layout
- `apps/web/src/components/profile/ProfileSetupForm.tsx` — Web ProfileSetupForm for username validation and availability check
- `apps/web/src/components/sharing/PrivacyToggle.tsx` — Web PrivacyToggle for toggle pattern
- `apps/web/src/components/sharing/ShareButton.tsx` — Web ShareButton for share flow + clipboard copy
- `apps/web/src/components/sharing/CloneButton.tsx` — Web CloneButton for clone flow + prompt
- `apps/native/src/components/WorkoutCard.tsx` — Established native component patterns (memo, Alert.alert, TextInputModal)
- `apps/native/src/lib/theme.ts` — Theme tokens
- `apps/native/src/components/TextInputModal.tsx` — Reusable modal for text input

## Expected Output

- `apps/native/src/components/social/FeedItemNative.tsx` — Feed card with author info, summary, reactions, relative timestamp
- `apps/native/src/components/social/ReactionBarNative.tsx` — 5 emoji buttons with optimistic toggle
- `apps/native/src/components/social/FollowButtonNative.tsx` — Self-contained follow/unfollow with counts
- `apps/native/src/components/social/ProfileStatsNative.tsx` — Stat cards + top exercises
- `apps/native/src/components/social/ProfileSetupFormNative.tsx` — Username creation form with validation
- `apps/native/src/components/social/PrivacyToggleNative.tsx` — Switch toggle for public/private
- `apps/native/src/components/social/ShareButtonNative.tsx` — Share + clipboard copy via expo-clipboard
- `apps/native/src/components/social/CloneButtonNative.tsx` — Clone with TextInputModal name input
- `apps/native/src/lib/units.ts` — Updated with formatRelativeTime export
- `apps/native/package.json` — Updated with expo-clipboard dependency
