# S04: Mobile Port — Research

**Date:** 2026-03-11

## Summary

S04 ports the complete collaborative live workout experience — session creation, invite-based joining, live participant list with presence indicators, shared set feed, server-authoritative synchronized timer, host session ending, and combined summary — to the React Native mobile app. The backend is 100% complete (S01–S03 delivered all 15 functions in `sessions.ts` plus crons, `finishWorkoutCore`, and verification scripts). This slice creates **zero backend changes** — it is purely native UI screens and components consuming the existing Convex APIs via `useQuery`/`useMutation`.

The mobile port is structurally a 1:1 translation of 6 web files (~1,414 LOC total) into React Native equivalents. The web has 4 components (`SessionParticipantList`, `SessionSetFeed`, `SharedTimerDisplay`, `SessionSummary`) and 2 pages (session page, join page). The mobile equivalent is 3 screens (`GroupSessionScreen`, `JoinSessionScreen`, `SessionLobbyScreen` — though the "lobby" is really just the "waiting" state within `GroupSessionScreen`) plus 4 native components in a new `components/session/` subdirectory. The existing `WorkoutsStack` in `MainTabs.tsx` needs 2 new screens added (GroupSession, JoinSession). The `WorkoutsScreen` needs a "Start Group Session" button mirroring the web `/workouts` page.

**Primary recommendation:** Follow the established M002/S04, M003/S04, M004/S04 mobile port pattern exactly: new screens in `screens/`, new components in `components/session/` with `Native` suffix (D067), screens registered in `WorkoutsStack` navigator within the existing Workouts tab (no new tab — D133 ceiling at 7), session join via in-app navigation (deep linking deferred). The heartbeat interval (10s `setInterval` + cleanup on unmount) is the most novel mobile-specific pattern — it must handle app backgrounding gracefully (heartbeat stops → user appears idle → heartbeat resumes on foreground, per D153).

## Recommendation

**3 screens + 4 components within existing WorkoutsStack, no deep linking for MVP.**

The mobile group session flow is:
1. User taps "Start Group Session" on WorkoutsScreen → `createSession()` → push to `GroupSessionScreen`
2. User manually enters/pastes an invite code on a `JoinSessionScreen` (accessible from WorkoutsScreen) → `joinSession({inviteCode})` → navigate to `GroupSessionScreen`
3. `GroupSessionScreen` shows the live session: participant list, shared timer, set feed, invite code display, host-only end button. On completion, shows the combined summary inline.

**Deep linking deferred.** The web uses `/session/join/[inviteCode]` URL routing. Mobile deep linking requires `expo-linking` configuration, URL scheme registration in `app.json`, and `NavigationContainer` `linking` prop setup — none of which exist in the app today. For S04 MVP, the join flow uses a manual invite code entry screen (user copies code from friend's share, pastes into a TextInput). Deep linking can be added as a follow-up with minimal changes (the JoinSessionScreen already accepts an inviteCode param).

**SessionLobbyScreen is unnecessary as a separate screen.** The "waiting" status is just a state within `GroupSessionScreen` — when `session.status === "waiting"`, show a "Waiting for participants..." message with the invite code prominently displayed. This matches the web implementation where the session page handles all states (waiting, active, completed).

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Session API calls | `api.sessions.*` (15 functions) | Complete backend — zero modifications needed |
| Heartbeat interval | `useEffect` + `setInterval(10s)` + cleanup | Exact same pattern as web session page; also mirrors `RestTimerDisplay` 100ms interval |
| Circular timer display | `RestTimerDisplay.tsx` ProgressRing component | View-based half-circle rotation (D042) already proven for individual timer. Adapt for shared timer. |
| Pill selector (timer presets) | `PillSelectorNative` in `components/competitive/` | Generic `<T extends string>` pill selector. Reuse for timer duration presets (30s/60s/90s/120s). |
| Clipboard copy for invite code | `expo-clipboard` (~55.0.8) | Already installed and used by `ShareButtonNative`. Same `Clipboard.setStringAsync` pattern. |
| User identity check | `useUser()` from `@clerk/clerk-expo` | Already used in ChallengeDetailScreen for host/participant checks. Same pattern for session host detection. |
| Unit preferences | `useQuery(api.userPreferences.getPreferences)` | Already used in ActiveWorkoutScreen for weight display. Set feed needs same pattern. |
| Stack navigation drill-down | `WorkoutsStack` in `MainTabs.tsx` | Add GroupSession and JoinSession as push targets within existing Workouts tab stack. |
| Loading/empty states | `ActivityIndicator` + state-driven rendering | Established pattern across all native screens (FeedScreen, ChallengesScreen, etc.) |
| Participant color badges | Hash-based color mapping from web `SessionSetFeed` | Same `(hash * 31 + charCode) | 0` algorithm ported to native `View` + `Text` styles. |

## Existing Code and Patterns

### Navigation — Direct Reuse

- `apps/native/src/navigation/MainTabs.tsx` — `WorkoutsStack` currently has 2 screens (WorkoutHistory, ActiveWorkout). **Add 2 more:** `GroupSession` and `JoinSession`. Follow the exact pattern of `CompeteStack` which has 3 screens (CompeteMain, Leaderboard, ChallengeDetail). Need to add `WorkoutsStackParamList` type for typed navigation (currently untyped — uses plain `createNativeStackNavigator()` without generics).
- `apps/native/src/navigation/Navigation.tsx` — No changes needed. Auth gating already wraps all tabs.

### Screens — Pattern Templates

- `apps/native/src/screens/ChallengeDetailScreen.tsx` — **Primary template** for `GroupSessionScreen`. Same shape: route params for ID, `useQuery` for data loading, `useUser()` for host/creator checks, action buttons with loading states, FlatList for participant data, back button header. ~450 lines. Session screen will be similar complexity.
- `apps/native/src/screens/WorkoutsScreen.tsx` — **Modify to add** "Start Group Session" button mirroring web's `/workouts` page. Current bottom bar has "Start Workout" button — add a second button or row for group session creation.
- `apps/native/src/screens/SharedWorkoutScreen.tsx` — Template for screens that accept route params (`feedItemId: string`). `JoinSessionScreen` follows the same pattern with `inviteCode: string` param.

### Components — Direct Reuse / Adaptation

- `apps/native/src/components/RestTimerDisplay.tsx` — **ProgressRing component** can be directly reused or adapted for `SharedTimerDisplayNative`. The View-based half-circle rotation approach (D042) works identically for shared timer visualization. The surrounding controls (start/pause/skip buttons) need to call session mutations instead of local timer actions.
- `apps/native/src/components/competitive/PillSelectorNative.tsx` — **Reuse directly** for timer duration preset selection (30s, 60s, 90s, 120s). Accepts `PillOption<T extends string>[]`.
- `apps/native/src/components/social/FollowButtonNative.tsx` — **Pattern template** for self-contained components with own query subscriptions. Presence indicator component follows the same pattern.
- `apps/native/src/components/social/ShareButtonNative.tsx` — **Clipboard pattern template** for invite code copy. Same `Clipboard.setStringAsync()` + "Copied!" feedback flash.

### Web Components — Port Source

- `apps/web/src/components/session/SessionParticipantList.tsx` (96 lines) — Port to `SessionParticipantListNative`. Replace Avatar/cn with RN View/Image/Text. Presence dots become `View` with border-radius and background color.
- `apps/web/src/components/session/SessionSetFeed.tsx` (188 lines) — Port to `SessionSetFeedNative`. Replace Tailwind classes with StyleSheet. Keep the same data processing (exerciseMap grouping, completion sort). Use `ScrollView` or `FlatList` for the feed.
- `apps/web/src/components/session/SharedTimerDisplay.tsx` (381 lines) — Port to `SharedTimerDisplayNative`. Replace SVG ring with existing ProgressRing from `RestTimerDisplay.tsx`. Replace Tailwind buttons with `TouchableOpacity`. Keep the same countdown logic (100ms interval from `sharedTimerEndAt`).
- `apps/web/src/components/session/SessionSummary.tsx` (164 lines) — Port to `SessionSummaryNative`. Replace grid layout with RN `View` flex. Keep same `getSessionSummary` query and stat display.
- `apps/web/src/app/workouts/session/[id]/page.tsx` (365 lines) — Main orchestration becomes `GroupSessionScreen`. Replace Next.js routing with React Navigation. Replace `useParams` with `useRoute().params`. Keep heartbeat logic identical.
- `apps/web/src/app/session/join/[inviteCode]/page.tsx` (220 lines) — Becomes `JoinSessionScreen`. Replace `useRouter.push` with `navigation.navigate`. Invite code from route params or TextInput entry.

### Theme & Utilities — Direct Reuse

- `apps/native/src/lib/theme.ts` — `colors`, `spacing`, `fontFamily` constants for D007 compliance.
- `apps/native/src/lib/units.ts` — `formatWeight`, `formatDuration`, `formatRestTime` all exist and match web.

## Constraints

- **7-tab maximum already hit** — 7 tabs currently (Exercises, Workouts, Templates, Analytics, Feed, Compete, Profile). Group session flows MUST nest within the existing Workouts tab stack, not add an 8th tab. This is per D133/D145.
- **No deep linking configured** — `NavigationContainer` has no `linking` prop, `app.json` has no URL scheme, `expo-linking` is not installed. Deep link-based session joining requires setup that is out of scope for S04 MVP.
- **WorkoutsStack is untyped** — `createNativeStackNavigator()` has no type parameter (unlike `FeedStack`, `ProfileStack`, `CompeteStack` which have typed param lists). Adding `GroupSession` and `JoinSession` requires adding a `WorkoutsStackParamList` type.
- **38 pre-existing TS2307 errors** — All `Cannot find module 'convex/react'` path resolution issues in native. Don't affect runtime. New screens will add to this count (each file importing `convex/react` adds 1 error). The acceptance criterion is "0 new errors" meaning the delta from 38 stays at 0 new errors beyond the expected convex/react ones.
- **No `cn()` / clsx in native** — All conditional styling uses `[baseStyle, condition && modifierStyle]` array pattern.
- **App backgrounding stops setInterval** — iOS/Android aggressively suspend background JS. The 10s heartbeat interval stops when the app enters background. This is actually correct behavior (D153, research pitfall) — user appears "idle" when backgrounded, presence recovers on next heartbeat when foregrounded. No special handling needed.
- **No `window.navigator.clipboard`** — Invite link copy must use `expo-clipboard` (`Clipboard.setStringAsync`), already installed.
- **Vibration on timer completion** — Web uses Web Audio beep. Mobile should use `Vibration.vibrate()` from `react-native` — same pattern as `RestTimerContext.tsx` (D039).

## Common Pitfalls

- **Heartbeat not cleaned up on navigation away** — If user navigates away from GroupSessionScreen without the heartbeat cleanup firing, the interval keeps running and eventually throws (session participant not found). **Mitigation:** Use `useEffect` cleanup function (return `() => clearInterval(intervalRef.current)`) — standard React pattern. Also consider React Navigation's `useFocusEffect` to pause heartbeat when screen loses focus.

- **Double-creation of session on "Start Group Session" tap** — Fast double-tap creates two sessions. **Mitigation:** Use `useRef` guard (D022 pattern, proven in `ActiveWorkoutScreen` and web `JoinSessionPage`). Set flag on first tap, prevent second.

- **WorkoutsStackParamList type mismatch** — Adding typed params requires updating all `navigation.navigate()` calls to match. **Mitigation:** Define `WorkoutsStackParamList` with all 4 screens, update `WorkoutsScreen` and `ActiveWorkoutScreen` navigation props to use the typed navigator.

- **SharedTimerDisplayNative 100ms interval battery drain** — Running `setInterval(100ms)` continuously while the session is active (even when timer is idle) wastes battery. **Mitigation:** Only start the 100ms interval when `sharedTimerEndAt` is defined and in the future. When timer is idle, no interval runs. Same conditional as web.

- **Invite code entry UX** — Without deep linking, users must manually enter a 6-character code. **Mitigation:** Auto-uppercase the TextInput, set `maxLength={6}`, use monospace font, auto-focus. The 6-char unambiguous charset (D146: no 0/O/1/I) helps reduce entry errors.

- **Session data loading cascade** — GroupSessionScreen needs `getSession` → then conditionally `getSessionParticipants` and `getSessionSets`. Multiple loading states. **Mitigation:** Follow the web's three-query architecture (D085 conditional queries with "skip"). Show single loading spinner until session loads, then components load independently.

- **Completed session rendering** — When host ends session, all participants' UI must switch from live view to summary view. **Mitigation:** Convex reactive subscription handles this automatically — `session.status` changes to "completed" and the conditional rendering switches. Same as web.

## Open Risks

- **Heartbeat reliability on low-end Android devices** — React Native's JavaScript thread can be slow on low-end devices, potentially causing heartbeat intervals to be delayed beyond the 30-second threshold. Users might appear idle despite being active. **Low risk:** The 10-second heartbeat interval with 30-second threshold provides 20 seconds of slack — more than enough for JS thread delays.

- **SessionSetFeed performance with many exercises** — The feed groups all participants' sets by exercise, then renders them in a ScrollView. For sessions with 10 participants each having 10+ exercises, this could be a long scrollable list. **Low risk:** Sessions are capped at 10 participants, and typical gym workouts have 4-6 exercises. The list is well within FlatList performance bounds.

- **No back navigation guard for active sessions** — User could press the hardware/gesture back button while in an active session, leaving the heartbeat running in the unmount cleanup but losing their session view. **Mitigation:** Standard `useEffect` cleanup handles this. Consider an `Alert.alert("Leave session?")` confirmation on back press (via `beforeRemove` listener), but this is a UX refinement, not a correctness issue.

- **Invite code sharing on mobile** — Web copies a full URL to clipboard. Mobile can't construct a working URL without deep linking. **Mitigation:** Copy just the 6-character invite code to clipboard (not a URL). The receiving user enters it in the JoinSessionScreen. Alternatively, copy a placeholder URL that can work when deep linking is configured later (`workout-tracking://join/[code]`).

- **Timer state sync across app backgrounding** — If the app is backgrounded while a shared timer is running, when it returns to foreground the timer display should show the correct remaining time (not restart from where it was). **No risk:** The timer derives state from `sharedTimerEndAt` (server timestamp) minus `Date.now()` — this is inherently correct regardless of background duration. The 100ms interval restarts on foreground and computes the correct remaining time immediately.

## Proposed File Structure

```
apps/native/src/
├── screens/
│   ├── GroupSessionScreen.tsx       # Live session view (waiting/active/completed states)
│   └── JoinSessionScreen.tsx        # Invite code entry + join flow
├── components/
│   └── session/                     # New subdirectory (D100 pattern)
│       ├── SessionParticipantListNative.tsx  # Participant list with presence dots
│       ├── SessionSetFeedNative.tsx          # Exercise-grouped set feed
│       ├── SharedTimerDisplayNative.tsx      # SVG ring countdown + controls
│       └── SessionSummaryNative.tsx          # Per-participant stats grid
├── navigation/
│   └── MainTabs.tsx                 # Modified: add WorkoutsStackParamList, 2 screens
```

**Estimated LOC:** ~1,200-1,500 total (4 components ~200 lines each, 2 screens ~300 lines each, plus navigation changes).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Convex | `waynesutton/convexskills@convex` (4.6K installs) | available — recommended if not already installed |
| React Native | `vercel-labs/agent-skills@vercel-react-native-skills` (55.3K installs) | available — high install count, directly relevant |
| React Native | `callstackincubator/agent-skills@react-native-best-practices` (7K installs) | available — relevant for component patterns |
| Expo | `expo/skills@expo-dev-client` (9.4K installs) | available — less directly relevant (deployment focused) |

**Note:** The React Native skills have very high install counts and are directly relevant to this mobile port work. The Convex skill was noted in M005 research already.

## Sources

- `setInterval` stops in iOS/Android background — React Native JS thread suspended (source: existing `RestTimerContext.tsx` which uses `Vibration.vibrate()` instead of Web Audio for the same reason)
- `expo-clipboard` ~55.0.8 follows Expo SDK versioning (D104) — already installed and proven in `ShareButtonNative.tsx`
- React Navigation typed stack navigators — `FeedStackParamList`, `ProfileStackParamList`, `CompeteStackParamList` already defined in `MainTabs.tsx`
- 7-tab bottom navigation ceiling established by D133 — group session flows must nest in existing Workouts tab
- Web session page uses three independent queries (getSession, getSessionParticipants, getSessionSets) — same architecture on mobile (source: S01 forward intelligence)
- Heartbeat 10s interval with 30s cron cleanup (D139) — mobile uses identical timing
- Session participant limit of 10 (D147) bounds all list rendering to manageable sizes
- `finishWorkoutCore` called from `endSession` for per-participant workout completion (D159) — mobile UI only needs to call `endSession`, hooks fire server-side
- Invite code is 6-char from unambiguous charset ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (D146) — optimize TextInput for this
