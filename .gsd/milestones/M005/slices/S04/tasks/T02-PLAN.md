---
estimated_steps: 5
estimated_files: 4
---

# T02: Build 4 session components — participant list, set feed, shared timer, summary

**Slice:** S04 — Mobile Port
**Milestone:** M005

## Description

Create the 4 core session UI components as direct React Native ports of their web equivalents. Each component manages its own Convex query subscription independently (D085 session component architecture) and uses React Native primitives (View, Text, FlatList/ScrollView, TouchableOpacity, StyleSheet) with the established theme tokens. These components will be composed by GroupSessionScreen in T03.

## Steps

1. **Build `SessionParticipantListNative`** — Port `apps/web/src/components/session/SessionParticipantList.tsx`. Accept `sessionId` prop. `useQuery(api.sessions.getSessionParticipants, { sessionId })`. Render participant list with: initials in a circular View (first letter of display name), presence dot overlay (green `#34C759` for active, yellow `#F59E0B` for idle, gray `#9CA3AF` for left), display name, and status text. Loading state: ActivityIndicator. Use `FlatList` for participant rendering.

2. **Build `SessionSetFeedNative`** — Port `apps/web/src/components/session/SessionSetFeed.tsx`. Accept `sessionId` prop. `useQuery(api.sessions.getSessionSets, { sessionId })` + `useQuery(api.userPreferences.getPreferences)`. Same exercise-grouped data processing: build `exerciseMap` from participant data, sort entries by completedAt descending. Render with `ScrollView`: exercise header cards containing set entries with participant name badge (deterministic color from `(hash * 31 + charCode) | 0` algorithm — use 8 RN-compatible color pairs as `{ bg: string, text: string }` objects), weight × reps display via `formatWeight`, RPE, set number. Empty state with icon and text.

3. **Build `SharedTimerDisplayNative`** — Port `apps/web/src/components/session/SharedTimerDisplay.tsx`. Accept `session` object prop and `sessionId` prop. Derive timer state from `session.sharedTimerEndAt` — compute `remaining` via `setInterval(100ms)` only when timer is running (conditional interval per research pitfall). Three visual states: idle (PillSelectorNative for duration presets 30s/60s/90s/120s + "Start Timer" button), running (View-based ProgressRing from RestTimerDisplay.tsx pattern + time display + Pause/Skip buttons), done (checkmark icon + "Done!" text, auto-clear after 3s grace). Call `Vibration.vibrate()` from `react-native` when timer hits 0 (D039). Wire `startSharedTimer`, `pauseSharedTimer`, `skipSharedTimer` mutations. Don't render for completed sessions.

4. **Build `SessionSummaryNative`** — Port `apps/web/src/components/session/SessionSummary.tsx`. Accept `sessionId` prop. `useQuery(api.sessions.getSessionSummary, { sessionId })`. Render "Session Complete!" header with checkmark icon, completion time, participant count. Per-participant cards with deterministic border/background colors (same hash algorithm), displaying: exercise count, set count, total volume (via `formatWeight` with hardcoded "kg" per S02 known limitation), duration (via `formatDuration`). Loading state: ActivityIndicator. Empty state: "No workout data was recorded."

5. **Verify compilation and file structure** — Run `tsc --noEmit` on native. Confirm all 4 files exist in `apps/native/src/components/session/`. Confirm each file imports from `@packages/backend/convex/_generated/api`. Confirm SharedTimerDisplayNative imports `Vibration` from `react-native`.

## Must-Haves

- [ ] `SessionParticipantListNative` renders participant list with presence dots (3 colors by derivedStatus)
- [ ] `SessionSetFeedNative` groups sets by exercise with deterministic participant color badges
- [ ] `SessionSetFeedNative` uses `formatWeight` with user's unit preference
- [ ] `SharedTimerDisplayNative` has 3 visual states: idle (presets + start), running (ring + pause/skip), done (checkmark)
- [ ] `SharedTimerDisplayNative` uses View-based ProgressRing (no SVG dependency — matches D042)
- [ ] `SharedTimerDisplayNative` calls `Vibration.vibrate()` on timer completion
- [ ] `SharedTimerDisplayNative` uses `PillSelectorNative` for duration presets
- [ ] `SharedTimerDisplayNative` only runs 100ms interval when timer is active (battery optimization)
- [ ] `SessionSummaryNative` shows per-participant stats: exercises, sets, volume, duration
- [ ] All 4 components use D007 theme tokens from `lib/theme.ts`
- [ ] All 4 components have loading states (ActivityIndicator)

## Verification

- `cd apps/native && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS2307" | wc -l` returns 0
- `ls apps/native/src/components/session/` shows 4 files
- `grep "api.sessions" apps/native/src/components/session/*.tsx` shows correct API imports in each file
- `grep "Vibration" apps/native/src/components/session/SharedTimerDisplayNative.tsx` shows Vibration import
- `grep "PillSelectorNative" apps/native/src/components/session/SharedTimerDisplayNative.tsx` shows reuse

## Observability Impact

- Signals added/changed: `console.error("[Session] Timer start/pause/skip failed: ...")` in SharedTimerDisplayNative on mutation errors
- How a future agent inspects this: Each component's loading/empty/populated state is visually distinct. Presence dots provide instant visual feedback on participant status. Timer ring shows progress visually.
- Failure state exposed: Mutation errors in SharedTimerDisplayNative logged to console. Query loading states shown as ActivityIndicator.

## Inputs

- `apps/web/src/components/session/SessionParticipantList.tsx` — Web source (96 lines) for participant list port
- `apps/web/src/components/session/SessionSetFeed.tsx` — Web source (188 lines) for set feed port
- `apps/web/src/components/session/SharedTimerDisplay.tsx` — Web source (381 lines) for timer port
- `apps/web/src/components/session/SessionSummary.tsx` — Web source (164 lines) for summary port
- `apps/native/src/components/RestTimerDisplay.tsx` — ProgressRing and ringStyles pattern to reuse for SharedTimerDisplayNative
- `apps/native/src/components/competitive/PillSelectorNative.tsx` — Reuse for timer duration presets
- `apps/native/src/lib/theme.ts` — Colors, spacing, fontFamily constants
- `apps/native/src/lib/units.ts` — `formatWeight`, `formatDuration`, `formatRestTime` utilities

## Expected Output

- `apps/native/src/components/session/SessionParticipantListNative.tsx` — New: ~120 lines
- `apps/native/src/components/session/SessionSetFeedNative.tsx` — New: ~200 lines
- `apps/native/src/components/session/SharedTimerDisplayNative.tsx` — New: ~280 lines
- `apps/native/src/components/session/SessionSummaryNative.tsx` — New: ~180 lines
