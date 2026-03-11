---
estimated_steps: 4
estimated_files: 0
---

# T04: TypeScript compilation gate and final structural verification

**Slice:** S04 — Mobile Port
**Milestone:** M005

## Description

Final compilation and structural verification gate for S04. Confirms zero TypeScript regressions across all 3 packages, all 6 new files exist with correct patterns, and the full S04 boundary contract is satisfied. No file changes expected — this is a read-only verification task.

## Steps

1. **Run TypeScript compilation across all 3 packages** — `tsc --noEmit` on `packages/backend/convex/tsconfig.json` (expect 0 errors), `apps/web` (expect 0 errors), `apps/native` (expect 0 new errors beyond 38 pre-existing TS2307). Count native errors precisely to confirm no regression.

2. **Verify file existence and structure** — Confirm all 6 new files exist: `GroupSessionScreen.tsx`, `JoinSessionScreen.tsx`, `SessionParticipantListNative.tsx`, `SessionSetFeedNative.tsx`, `SharedTimerDisplayNative.tsx`, `SessionSummaryNative.tsx`. Confirm `components/session/` directory has exactly 4 files.

3. **Verify key patterns via grep** — Confirm: `WorkoutsStackParamList` exported from MainTabs.tsx; 4 screens registered in WorkoutsStack (WorkoutHistory, ActiveWorkout, GroupSession, JoinSession); heartbeat interval 10_000 in GroupSessionScreen; `Vibration` import in SharedTimerDisplayNative; `PillSelectorNative` import in SharedTimerDisplayNative; `expo-clipboard` import in GroupSessionScreen and JoinSessionScreen; `useUser` import in GroupSessionScreen; all 4 session component imports in GroupSessionScreen.

4. **Verify boundary contract completeness** — Confirm S04 produces: 2 screens in `screens/` (GroupSessionScreen, JoinSessionScreen), 4 components in `components/session/`, WorkoutsStackParamList type, 2 new screen registrations in WorkoutsStack, 2 entry point buttons on WorkoutsScreen. Cross-reference against S04-PLAN must-haves.

## Must-Haves

- [ ] `tsc --noEmit` backend: 0 errors
- [ ] `tsc --noEmit` web: 0 errors
- [ ] `tsc --noEmit` native: 0 new errors beyond 38 pre-existing TS2307
- [ ] All 6 new files exist
- [ ] Key patterns verified: heartbeat, Vibration, PillSelector, clipboard, useUser, 4 component imports

## Verification

- `cd packages/backend && npx tsc --noEmit -p convex/tsconfig.json 2>&1 | tail -1` shows no errors
- `cd apps/web && npx tsc --noEmit 2>&1 | tail -1` shows no errors
- `cd apps/native && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l` ≤ 38
- `ls apps/native/src/screens/GroupSessionScreen.tsx apps/native/src/screens/JoinSessionScreen.tsx apps/native/src/components/session/SessionParticipantListNative.tsx apps/native/src/components/session/SessionSetFeedNative.tsx apps/native/src/components/session/SharedTimerDisplayNative.tsx apps/native/src/components/session/SessionSummaryNative.tsx` — all exist
- All grep checks from step 3 produce matches

## Observability Impact

- Signals added/changed: None — verification only
- How a future agent inspects this: The compilation commands in this task serve as the canonical verification commands for S04. Future regression checks rerun these same 3 commands.
- Failure state exposed: None — no new runtime code

## Inputs

- All files from T01, T02, T03 — complete S04 implementation
- Pre-existing native error count: 38 TS2307 errors (convex/react path resolution)
- S04-PLAN must-haves list for cross-reference

## Expected Output

- No file changes — this task produces only verification results
- Confirmation that S04 boundary contract is fully satisfied
- TypeScript compilation results: 0 errors backend, 0 errors web, ≤38 errors native
