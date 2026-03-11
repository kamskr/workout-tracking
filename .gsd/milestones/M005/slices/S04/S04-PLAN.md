# S04: Mobile Port — Group Session Screens

**Goal:** Mobile users can create group sessions, join via invite code entry, see live participant list with presence indicators, log sets in the shared feed, use the synchronized timer, and view the combined summary — all within the existing Workouts tab stack using the same Convex APIs as web.

**Demo:** On mobile, tap "Start Group Session" on WorkoutsScreen → push to GroupSessionScreen showing invite code, participant list, shared timer, and live set feed. A second user enters the invite code on JoinSessionScreen → navigates to GroupSessionScreen showing the same session. Both see each other's presence and logged sets. Host taps "End Session" → both see summary view with per-participant stats.

## Must-Haves

- `WorkoutsStackParamList` type added with typed navigation for all 4 screens (WorkoutHistory, ActiveWorkout, GroupSession, JoinSession)
- "Start Group Session" button on WorkoutsScreen that creates a session and pushes to GroupSessionScreen
- "Join Session" button on WorkoutsScreen that pushes to JoinSessionScreen
- `JoinSessionScreen` with 6-char invite code TextInput (auto-uppercase, maxLength 6, monospace) + join flow
- `GroupSessionScreen` handling all session states (loading, not-found, waiting, active, completed)
- `SessionParticipantListNative` with presence dots (green/yellow/gray) from `getSessionParticipants` query
- `SessionSetFeedNative` with exercise-grouped feed and deterministic participant color badges
- `SharedTimerDisplayNative` with View-based ProgressRing, 100ms countdown, Start/Pause/Skip controls, and `Vibration.vibrate()` on completion
- `SessionSummaryNative` showing per-participant stats (exercises, sets, volume, duration)
- Heartbeat: 10s `setInterval` with `useEffect` cleanup on unmount, stops on mutation error
- Host-only "End Session" button with confirmation Alert
- Invite code copy to clipboard via `expo-clipboard` with "Copied!" feedback
- TypeScript compiles with 0 new errors on native (38 pre-existing TS2307 is the baseline)

## Proof Level

- This slice proves: integration (mobile UI consuming production backend APIs with correct typing)
- Real runtime required: yes (Expo runtime for manual UAT), no for structural proof (TypeScript compilation)
- Human/UAT required: yes (manual testing on device/simulator for heartbeat, timer, navigation)

## Verification

- `cd apps/native && npx tsc --noEmit` — 0 new errors beyond 38 pre-existing TS2307 (convex/react path resolution)
- `cd packages/backend && npx tsc --noEmit -p convex/tsconfig.json` — 0 errors (regression)
- `cd apps/web && npx tsc --noEmit` — 0 errors (regression)
- File existence checks: all 6 new files exist (`GroupSessionScreen.tsx`, `JoinSessionScreen.tsx`, `SessionParticipantListNative.tsx`, `SessionSetFeedNative.tsx`, `SharedTimerDisplayNative.tsx`, `SessionSummaryNative.tsx`)
- `MainTabs.tsx` exports `WorkoutsStackParamList` type
- `MainTabs.tsx` registers `GroupSession` and `JoinSession` screens in `WorkoutsStack`
- `WorkoutsScreen.tsx` has both "Start Group Session" and "Join Session" buttons
- All 4 session component files import from `@packages/backend/convex/_generated/api`
- `GroupSessionScreen.tsx` contains heartbeat `setInterval` with 10_000ms interval
- `SharedTimerDisplayNative.tsx` imports `Vibration` from `react-native`

## Observability / Diagnostics

- Runtime signals: `console.log("[Session] Heartbeat started/stopped")` in GroupSessionScreen; `console.log("[Session] Join success/failed")` in JoinSessionScreen; `console.error("[Session] ...")` on all mutation failures with descriptive messages
- Inspection surfaces: Session state visible via `useQuery(api.sessions.getSession)` — renders status badge (Waiting/Active/Completed) on GroupSessionScreen header. Participant presence derived from `getSessionParticipants` query (derivedStatus field). Timer state derived from `session.sharedTimerEndAt`.
- Failure visibility: Mutation errors surface via `Alert.alert("Error", message)` on all action handlers (join, end, timer start/pause/skip). Heartbeat failures auto-stop the interval with console error.
- Redaction constraints: none — no secrets or PII in session data

## Integration Closure

- Upstream surfaces consumed: `api.sessions.*` (15 functions from S01+S02), `api.userPreferences.getPreferences` (unit display), `@clerk/clerk-expo` `useUser()` (host detection), `expo-clipboard` (invite code copy), `MainTabs.tsx` WorkoutsStack navigator, existing `RestTimerDisplay.tsx` ProgressRing pattern, `PillSelectorNative` for timer presets, `lib/theme.ts` + `lib/units.ts`
- New wiring introduced in this slice: 2 screens registered in WorkoutsStack navigator, 2 buttons added to WorkoutsScreen, `WorkoutsStackParamList` type enabling typed navigation within Workouts tab
- What remains before the milestone is truly usable end-to-end: Two-browser/two-device end-to-end proof with live Convex backend (requires Convex CLI auth). 119 verification checks pending live execution. Deep linking for session invite URLs (deferred — manual code entry for MVP).

## Tasks

- [x] **T01: Add WorkoutsStackParamList, register screens, and wire WorkoutsScreen entry points** `est:20m`
  - Why: Navigation infrastructure must exist before screens can be built. WorkoutsScreen needs "Start Group Session" and "Join Session" buttons. WorkoutsStack needs typed params and 2 new screen registrations. This is the wiring that connects all subsequent work.
  - Files: `apps/native/src/navigation/MainTabs.tsx`, `apps/native/src/screens/WorkoutsScreen.tsx`, `apps/native/src/screens/GroupSessionScreen.tsx`, `apps/native/src/screens/JoinSessionScreen.tsx`
  - Do: Define `WorkoutsStackParamList` type with all 4 screens. Type the `WorkoutsStack` navigator with it. Register `GroupSession` and `JoinSession` screens (use placeholder components initially that just render screen name — they will be fully implemented in T02 and T03). Add "Start Group Session" button to WorkoutsScreen that calls `createSession()` and navigates to GroupSession with sessionId. Add "Join Session" button that navigates to JoinSession. Use `useRef` guard (D022) for double-tap prevention on session creation. Build the full `JoinSessionScreen` with invite code TextInput (auto-uppercase, maxLength 6, monospace, auto-focus) + `getSessionByInviteCode` query for session preview + `joinSession` mutation + navigation to GroupSession on success.
  - Verify: `cd apps/native && npx tsc --noEmit 2>&1 | grep -c "error TS"` shows only pre-existing TS2307 count. WorkoutsScreen, JoinSessionScreen, and placeholder GroupSessionScreen all compile.
  - Done when: WorkoutsStack has typed params, 4 screens registered, WorkoutsScreen has 2 new buttons, JoinSessionScreen fully implemented with invite code entry + join flow.

- [x] **T02: Build 4 session components — participant list, set feed, shared timer, summary** `est:30m`
  - Why: These are the core visual building blocks consumed by GroupSessionScreen. Each is a direct port of the web equivalent using RN primitives. Building all 4 together keeps the component boundary clean and allows T03 to simply compose them.
  - Files: `apps/native/src/components/session/SessionParticipantListNative.tsx`, `apps/native/src/components/session/SessionSetFeedNative.tsx`, `apps/native/src/components/session/SharedTimerDisplayNative.tsx`, `apps/native/src/components/session/SessionSummaryNative.tsx`
  - Do: Port each web component to React Native. SessionParticipantListNative: `useQuery(getSessionParticipants)`, presence dots as colored Views, initials in Text. SessionSetFeedNative: exercise-grouped feed with ScrollView, deterministic badge colors via userId hash, `useQuery(getPreferences)` for weight unit. SharedTimerDisplayNative: View-based ProgressRing (reuse pattern from RestTimerDisplay.tsx), 100ms countdown interval, PillSelectorNative for duration presets (30s/60s/90s/120s), Start/Pause/Skip TouchableOpacity buttons, `Vibration.vibrate()` on timer completion (D039). SessionSummaryNative: per-participant stat cards with exercise count, set count, volume, duration.
  - Verify: `cd apps/native && npx tsc --noEmit 2>&1 | grep -c "error TS"` shows only pre-existing count. All 4 files exist in `components/session/`.
  - Done when: All 4 components compile, import correct Convex APIs, and follow D067 naming convention with `Native` suffix.

- [x] **T03: Build GroupSessionScreen — full session lifecycle with heartbeat, timer, and summary** `est:25m`
  - Why: This is the main orchestration screen that composes all 4 components and manages the session lifecycle — the mobile equivalent of the web session page. Heartbeat, host detection, invite code copy, end session, and state-driven rendering all live here.
  - Files: `apps/native/src/screens/GroupSessionScreen.tsx`
  - Do: Replace the T01 placeholder with the full implementation. Accept `{ sessionId: string }` route param. Three-query architecture: `getSession` (session data), child components own their queries independently. Heartbeat via `useEffect` + `setInterval(10_000)` + `useRef(intervalRef)` + cleanup on unmount + stop on mutation error. Host detection via `useUser().user.id === session.hostId`. Invite code display + clipboard copy via `expo-clipboard`. Status-driven rendering: loading (ActivityIndicator), not-found (error message), waiting/active (live view: SharedTimerDisplayNative + SessionParticipantListNative sidebar + SessionSetFeedNative), completed (SessionSummaryNative). Host-only "End Session" button with `Alert.alert` confirmation. Back navigation header with `navigation.goBack()`. Status badge (Waiting/Active/Completed). Log `[Session] Heartbeat started/stopped` for diagnostics. Don't heartbeat for completed sessions.
  - Verify: `cd apps/native && npx tsc --noEmit 2>&1 | grep -c "error TS"` shows only pre-existing count. GroupSessionScreen.tsx has heartbeat interval, session state rendering, all 4 child components imported.
  - Done when: GroupSessionScreen handles all session states, heartbeat runs with cleanup, host controls work, and all 4 session components are composed.

- [x] **T04: TypeScript compilation gate and final structural verification** `est:5m`
  - Why: Gate check confirming zero regressions across all 3 packages, all files exist with correct patterns, and the full file manifest matches the S04 boundary contract.
  - Files: (verification only — no file changes expected)
  - Do: Run `tsc --noEmit` across all 3 packages. Verify file existence for all 6 new files. Grep for key patterns: heartbeat interval (10_000), Vibration import, WorkoutsStackParamList export, 4 screen registrations in WorkoutsStack, expo-clipboard import in GroupSessionScreen. Count native TS errors to confirm 0 new beyond baseline 38.
  - Verify: All 3 packages compile. 6 new files exist. Key patterns present. 0 new TS errors.
  - Done when: All structural checks pass, compilation clean, S04 boundary contract satisfied.

## Files Likely Touched

- `apps/native/src/navigation/MainTabs.tsx` — WorkoutsStackParamList type, 2 screen registrations
- `apps/native/src/screens/WorkoutsScreen.tsx` — "Start Group Session" + "Join Session" buttons
- `apps/native/src/screens/GroupSessionScreen.tsx` — New: full session lifecycle screen
- `apps/native/src/screens/JoinSessionScreen.tsx` — New: invite code entry + join flow
- `apps/native/src/components/session/SessionParticipantListNative.tsx` — New: participant list with presence
- `apps/native/src/components/session/SessionSetFeedNative.tsx` — New: exercise-grouped set feed
- `apps/native/src/components/session/SharedTimerDisplayNative.tsx` — New: timer with ProgressRing
- `apps/native/src/components/session/SessionSummaryNative.tsx` — New: per-participant summary stats
