---
estimated_steps: 5
estimated_files: 4
---

# T01: Add WorkoutsStackParamList, register screens, and wire WorkoutsScreen entry points

**Slice:** S04 — Mobile Port
**Milestone:** M005

## Description

Set up the navigation infrastructure for group session screens within the existing Workouts tab stack. Define `WorkoutsStackParamList` type for typed navigation, register 2 new screens (`GroupSession`, `JoinSession`) in WorkoutsStack, add entry point buttons ("Start Group Session" and "Join Session") to WorkoutsScreen, and build the complete `JoinSessionScreen` with invite code entry and join flow. GroupSessionScreen gets a minimal placeholder (full implementation in T03).

## Steps

1. **Define `WorkoutsStackParamList` in `MainTabs.tsx`** — Add type with 4 screens: `WorkoutHistory: undefined`, `ActiveWorkout: undefined`, `GroupSession: { sessionId: string }`, `JoinSession: undefined`. Type the `WorkoutsStack` navigator with this type: `createNativeStackNavigator<WorkoutsStackParamList>()`. Export the type for use in screen components.

2. **Register 2 new screens in `WorkoutsTab` function** — Add `GroupSession` and `JoinSession` screen entries in the WorkoutsStack.Navigator. Import placeholder GroupSessionScreen and real JoinSessionScreen. For GroupSessionScreen, create a minimal placeholder file that renders a SafeAreaView with "Group Session" text (will be replaced in T03).

3. **Add "Start Group Session" and "Join Session" buttons to WorkoutsScreen** — Import `useMutation` and `api.sessions.createSession`. Add a `useRef` guard (D022) for double-tap prevention. Add two buttons in the `bottomBar`: primary "Start Workout" (existing), secondary "Start Group Session" (calls `createSession()` then navigates to GroupSession with sessionId), and a text/link "Join Session" that navigates to JoinSession. Update the `WorkoutsScreenProps` interface to use `NativeStackNavigationProp<WorkoutsStackParamList>` for typed navigation.

4. **Build complete `JoinSessionScreen`** — Accept no route params (invite code entered manually). Render: header with back button, 6-character invite code TextInput (auto-uppercase via `autoCapitalize="characters"`, `maxLength={6}`, monospace font, auto-focus, placeholder "Enter code"). Below the TextInput: preview section showing session info from `useQuery(api.sessions.getSessionByInviteCode, inviteCode.length === 6 ? { inviteCode } : "skip")` — host name, participant count, status. "Join Session" button calling `joinSession({ inviteCode })` mutation with `useRef` guard, navigating to GroupSession with the returned sessionId on success. Error display and loading states. Console logs: `[Session] Join success/failed`.

5. **Verify compilation** — Run `tsc --noEmit` on native package. Confirm only pre-existing TS2307 errors (no new errors). Verify the 4 screen registrations in WorkoutsStack.

## Must-Haves

- [ ] `WorkoutsStackParamList` type exported from `MainTabs.tsx` with all 4 screens typed
- [ ] `WorkoutsStack` navigator created with `createNativeStackNavigator<WorkoutsStackParamList>()`
- [ ] `GroupSession` and `JoinSession` screens registered in WorkoutsStack.Navigator
- [ ] "Start Group Session" button on WorkoutsScreen calls `createSession()` + navigates with `useRef` guard
- [ ] "Join Session" entry point on WorkoutsScreen navigates to JoinSession
- [ ] JoinSessionScreen: 6-char TextInput with auto-uppercase, maxLength, monospace, auto-focus
- [ ] JoinSessionScreen: session preview from `getSessionByInviteCode` query with "skip" pattern
- [ ] JoinSessionScreen: join mutation with `useRef` guard + navigation to GroupSession on success
- [ ] JoinSessionScreen: error display and loading states

## Verification

- `cd apps/native && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS2307" | wc -l` returns 0
- `grep "WorkoutsStackParamList" apps/native/src/navigation/MainTabs.tsx` shows the type export
- `grep "GroupSession\|JoinSession" apps/native/src/navigation/MainTabs.tsx` shows 2 screen registrations
- `grep "Start Group Session\|Join Session" apps/native/src/screens/WorkoutsScreen.tsx` shows both buttons
- `apps/native/src/screens/JoinSessionScreen.tsx` exists and imports `api.sessions.joinSession` and `api.sessions.getSessionByInviteCode`

## Observability Impact

- Signals added/changed: `console.log("[Session] Join success: sessionId=...")` and `console.error("[Session] Join failed: ...")` in JoinSessionScreen. `console.error("[Session] Create failed: ...")` in WorkoutsScreen.
- How a future agent inspects this: Check JoinSessionScreen error state rendering (error message displayed to user). Check WorkoutsScreen navigation prop types for correctness.
- Failure state exposed: Join errors shown via `Alert.alert("Error", message)`. Create errors logged to console.

## Inputs

- `apps/native/src/navigation/MainTabs.tsx` — Current untyped WorkoutsStack with 2 screens. Need to add type param and 2 more screens.
- `apps/native/src/screens/WorkoutsScreen.tsx` — Current screen with single "Start Workout" button. Need to add group session buttons.
- `apps/web/src/app/session/join/[inviteCode]/page.tsx` — Web join page source for JoinSessionScreen port.
- S01 summary: `joinSession` mutation returns `{ sessionId }`, `getSessionByInviteCode` returns session info including `host.displayName`, `participantCount`, `status`.

## Expected Output

- `apps/native/src/navigation/MainTabs.tsx` — Modified: `WorkoutsStackParamList` type exported, `WorkoutsStack` typed, 2 new screen entries
- `apps/native/src/screens/WorkoutsScreen.tsx` — Modified: "Start Group Session" + "Join Session" buttons added, typed navigation prop
- `apps/native/src/screens/JoinSessionScreen.tsx` — New: ~200 lines, complete invite code entry + join flow
- `apps/native/src/screens/GroupSessionScreen.tsx` — New: ~30 lines, minimal placeholder (replaced in T03)
