---
id: T01
parent: S04
milestone: M005
provides:
  - WorkoutsStackParamList type with typed navigation for 4 screens
  - GroupSession and JoinSession screen registrations in WorkoutsStack
  - "Start Group Session" and "Join Session" buttons on WorkoutsScreen
  - Complete JoinSessionScreen with invite code entry and join flow
  - Minimal GroupSessionScreen placeholder (replaced in T03)
key_files:
  - apps/native/src/navigation/MainTabs.tsx
  - apps/native/src/screens/WorkoutsScreen.tsx
  - apps/native/src/screens/JoinSessionScreen.tsx
  - apps/native/src/screens/GroupSessionScreen.tsx
key_decisions:
  - Used NativeStackScreenProps for GroupSessionScreen and JoinSessionScreen prop typing (consistent with existing patterns like ChallengesScreen)
  - JoinSessionScreen uses navigation.replace for GroupSession to prevent back-navigation to the join screen after joining
  - WorkoutsScreen uses useRef guard on createSession (D022 pattern) with finally-block reset for retry capability
patterns_established:
  - WorkoutsStackParamList exported from MainTabs.tsx — all Workouts tab screens use this for typed navigation
  - Session screen navigation: createSession → navigate with sessionId; joinSession → replace with sessionId
observability_surfaces:
  - "console.log('[Session] Create success: sessionId=..., inviteCode=...')" in WorkoutsScreen
  - "console.error('[Session] Create failed: ...')" in WorkoutsScreen
  - "console.log('[Session] Join success: sessionId=...')" in JoinSessionScreen
  - "console.error('[Session] Join failed: ...')" in JoinSessionScreen
  - Alert.alert("Error", message) on join failure in JoinSessionScreen
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Add WorkoutsStackParamList, register screens, and wire WorkoutsScreen entry points

**Added typed navigation infrastructure for group session screens with complete JoinSessionScreen and WorkoutsScreen entry points.**

## What Happened

1. **Defined `WorkoutsStackParamList`** in `MainTabs.tsx` with 4 screens: `WorkoutHistory`, `ActiveWorkout`, `GroupSession` (takes `sessionId: string`), `JoinSession` (no params). Typed the `WorkoutsStack` navigator with `createNativeStackNavigator<WorkoutsStackParamList>()`. Exported the type for use in screen components.

2. **Registered 2 new screens** in `WorkoutsTab`: `GroupSession` → `GroupSessionScreen`, `JoinSession` → `JoinSessionScreen`. Imported both new screen components.

3. **Added entry points to WorkoutsScreen**: Primary "Start Workout" (existing), secondary "Start Group Session" (outlined button, calls `createSession()` mutation then navigates to GroupSession with sessionId, with `useRef` double-tap guard), and tertiary "Join Session" (text link navigates to JoinSession). Updated navigation prop type to `NativeStackNavigationProp<WorkoutsStackParamList, "WorkoutHistory">`.

4. **Built complete JoinSessionScreen** (~210 lines): Header with back button. 6-character invite code TextInput with `autoCapitalize="characters"`, `maxLength={6}`, monospace font (Courier), auto-focus, centered with letter spacing. Session preview from `useQuery(api.sessions.getSessionByInviteCode, inviteCode.length === 6 ? { inviteCode } : "skip")` showing host name, participant count, status. Join button calling `joinSession({ inviteCode })` with `useRef` guard, navigating to GroupSession via `navigation.replace` on success. Error display via inline card and `Alert.alert`. Loading and not-found states handled.

5. **Created minimal GroupSessionScreen placeholder** (~50 lines): SafeAreaView with "Group Session" text and sessionId display. Accepts typed route params. Will be replaced in T03.

## Verification

- `cd apps/native && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS2307" | wc -l` → **0** (no new errors)
- `cd packages/backend && ./node_modules/.bin/tsc --noEmit -p convex/tsconfig.json` → **0 errors** (no regression)
- `cd apps/web && ./node_modules/.bin/tsc --noEmit` → **0 errors** (no regression)
- `grep "WorkoutsStackParamList" apps/native/src/navigation/MainTabs.tsx` → shows exported type + typed navigator
- `grep "GroupSession\|JoinSession" apps/native/src/navigation/MainTabs.tsx` → shows 2 screen registrations
- `grep "Start Group Session\|Join Session" apps/native/src/screens/WorkoutsScreen.tsx` → shows both buttons
- `JoinSessionScreen.tsx` exists and imports `api.sessions.joinSession` and `api.sessions.getSessionByInviteCode`
- `GroupSessionScreen.tsx` exists with typed route params

### Slice-Level Checks (Intermediate — T01 of 4)

| Check | Status |
|-------|--------|
| Native tsc: 0 new errors | ✅ |
| Backend tsc: 0 errors | ✅ |
| Web tsc: 0 errors | ✅ |
| GroupSessionScreen.tsx exists | ✅ |
| JoinSessionScreen.tsx exists | ✅ |
| SessionParticipantListNative.tsx exists | ⏳ T02 |
| SessionSetFeedNative.tsx exists | ⏳ T02 |
| SharedTimerDisplayNative.tsx exists | ⏳ T02 |
| SessionSummaryNative.tsx exists | ⏳ T02 |
| MainTabs exports WorkoutsStackParamList | ✅ |
| MainTabs registers GroupSession + JoinSession | ✅ |
| WorkoutsScreen has both buttons | ✅ |
| GroupSessionScreen heartbeat setInterval 10_000ms | ⏳ T03 |
| SharedTimerDisplayNative imports Vibration | ⏳ T02 |

## Diagnostics

- **JoinSessionScreen errors**: Displayed inline via red error card + `Alert.alert("Error", message)`. Logged to console as `[Session] Join failed: ...`.
- **WorkoutsScreen create errors**: Logged to console as `[Session] Create failed: ...`. No Alert (silent failure with console log — user sees button return to enabled state).
- **Session preview**: Query result from `getSessionByInviteCode` rendered as preview card showing host, participants, status. Loading spinner while query resolves. "Session not found" card on null result.
- **Navigation typing**: All Workouts tab navigation is now typed via `WorkoutsStackParamList` — TypeScript catches invalid screen names or missing params at compile time.

## Deviations

- Used `navigation.replace` instead of `navigation.navigate` for the join-to-GroupSession transition. This prevents the user from navigating back to the join screen after successfully joining (better UX — the join screen is a one-shot entry point).
- Added `finally` block to reset the `createInFlight` ref in WorkoutsScreen, allowing retry after create failure. The task plan mentioned `useRef` guard but didn't specify reset behavior.

## Known Issues

None.

## Files Created/Modified

- `apps/native/src/navigation/MainTabs.tsx` — Added `WorkoutsStackParamList` type export, typed `WorkoutsStack` navigator, registered `GroupSession` and `JoinSession` screens, imported new screen components
- `apps/native/src/screens/WorkoutsScreen.tsx` — Added `useMutation(createSession)`, `useRef` double-tap guard, "Start Group Session" button, "Join Session" link, typed navigation prop
- `apps/native/src/screens/JoinSessionScreen.tsx` — New: complete invite code entry + join flow (~210 lines)
- `apps/native/src/screens/GroupSessionScreen.tsx` — New: minimal placeholder with typed route params (~50 lines)
