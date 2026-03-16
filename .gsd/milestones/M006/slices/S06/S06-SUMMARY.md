---
id: S06
parent: M006
milestone: M006
provides:
  - Authoritative native runtime closure for M006: native code compiles, Expo reaches Metro, startup diagnostics are now visible, and the remaining stop point is the machine-level Xcode/simctl boundary rather than app UI logic.
requires:
  - slice: S01
    provides: Live Convex env wiring and working local dev-stack baseline consumed by the native package.
  - slice: S05
    provides: Live backend verification confidence so S06 could treat backend/API behavior as proven input while isolating native runtime seams.
affects:
  - none
key_files:
  - apps/native/App.tsx
  - apps/native/ConvexClientProvider.tsx
  - apps/native/src/navigation/MainTabs.tsx
  - .gsd/milestones/M006/slices/S06/S06-UAT.md
  - .gsd/REQUIREMENTS.md
  - .gsd/STATE.md
key_decisions:
  - Keep native startup diagnostics targeted and visible; do not globally suppress React Native logs while simulator/runtime proof is still incomplete.
patterns_established:
  - For native runtime proof, verify `xcode-select -p` and `xcrun simctl list devices` before `expo start --ios`; if simulator tooling is missing, still run native typecheck and one Expo iOS launch attempt to localize the stop phase before editing app code.
observability_surfaces:
  - xcode-select -p
  - xcrun simctl list devices
  - pnpm --filter native-app typecheck
  - pnpm --filter native-app exec expo start --ios
  - apps/native/ConvexClientProvider.tsx sanitized `[NativeStartup]` startup failure surface
  - .gsd/milestones/M006/slices/S06/S06-UAT.md
  - .gsd/milestones/M006/slices/S06/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S06/tasks/T02-SUMMARY.md
drill_down_paths:
  - .gsd/milestones/M006/slices/S06/tasks/T01-SUMMARY.md
  - .gsd/milestones/M006/slices/S06/tasks/T02-SUMMARY.md
  - .gsd/milestones/M006/slices/S06/tasks/T03-SUMMARY.md
duration: 50m
verification_result: passed
completed_at: 2026-03-16T14:51:04+01:00
---

# S06: Mobile Testing & Bug Fixes

**Closed the native runtime slice with truthful blocker evidence: native compile is green and Expo reaches Metro, but iOS Simulator proof is still blocked by the machine’s CommandLineTools/`simctl` boundary before app UI launch.**

## What Happened

S06 started by proving the machine/runtime boundary before touching app code. The active developer path was `/Library/Developer/CommandLineTools`, `xcrun simctl list devices` failed because `simctl` was unavailable, `pnpm --filter native-app typecheck` passed, and `pnpm --filter native-app exec expo start --ios` loaded env plus started Metro before stopping at the same Xcode-install / `xcode-select -s /Applications/Xcode.app/Contents/Developer` prompt. That localized the first real stop point outside app code.

With the simulator path still blocked, the slice made only one app-side change class that runtime evidence justified: observability. `apps/native/App.tsx` no longer suppresses all logs globally, and `apps/native/ConvexClientProvider.tsx` now fails startup with sanitized missing-key diagnostics so the next run can distinguish env/provider boot issues from auth, navigation, or screen-level failures once the machine seam is fixed.

T03 then re-ran the final verification surface and converted the result into durable slice truth. The seven-tab contract in `MainTabs.tsx` was confirmed in code (Exercises, Workouts, Templates, Analytics, Feed, Compete, Profile), but no simulator UI proof was possible because Expo never reached simulator launch. `S06-UAT.md` therefore records the exact commands, blocker phase, and what remains unproven rather than pretending the runtime pass happened.

The slice closes as a truthful blocker slice, not a green runtime slice: native compile health and startup diagnostics improved, but iOS simulator runtime validation for the 7 tabs and core flows still requires full Xcode / working `simctl` on the machine.

## Verification

Executed from `/Users/kamsagent/Files/projects/workout-tracking/.gsd/worktrees/M006`:

- `xcode-select -p` → `/Library/Developer/CommandLineTools`
- `xcrun simctl list devices` → failed with `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH` (exit 72)
- `pnpm --filter native-app typecheck` → passed (`tsc --noEmit`)
- `pnpm --filter native-app exec expo start --ios` → loaded `apps/native/.env`, exported public env keys, started Metro, then failed before simulator launch with the full-Xcode / `xcode-select -s /Applications/Xcode.app/Contents/Developer` prompt
- `apps/native/src/navigation/MainTabs.tsx` → verified the intended 7-tab runtime contract in code
- `.gsd/milestones/M006/slices/S06/S06-UAT.md` → recorded the blocker-phase UAT result and the unproven runtime flows

## Requirements Advanced

- R029 — advanced the requirement evidence from “native compiles” toward “Expo reaches Metro but the iOS launch path is still blocked at the machine Xcode/simulator seam,” making the remaining blocker explicit instead of implicit.
- R033 — advanced from unmapped to blocker-backed active status by recording the exact point where simulator proof failed before any tab or core-flow runtime checks could start.

## Requirements Validated

- none

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- The slice plan expected a live simulator walkthrough of the 7 tabs and core flows. The machine never reached simulator launch, so S06 closed with blocker documentation and startup observability improvements instead of UI/runtime bug fixes inside the app.

## Known Limitations

- The active developer path is still `/Library/Developer/CommandLineTools`, so this machine cannot launch iOS Simulator.
- `xcrun simctl list devices` still fails, which means no native auth shell, tabs, or screen flows were exercised.
- R029 remains active because the Expo/iOS portion of the local dev stack is not booting cleanly yet.
- R033 remains active because the mobile app has not been runtime-proven on iOS Simulator.
- Expo reports package-version compatibility warnings during `expo start --ios`; they remain secondary until the machine can actually launch the simulator.

## Follow-ups

- Install and/or finish full Xcode setup, then point the active developer path at `/Applications/Xcode.app/Contents/Developer`.
- Re-run the S06 verification surface in the same order: `xcode-select -p`, `xcrun simctl list devices`, `pnpm --filter native-app typecheck`, `pnpm --filter native-app exec expo start --ios`.
- Once simulator launch works, replace the blocker-only UAT with a real manual proof covering all 7 tabs plus Exercises, Workouts → ActiveWorkout, Analytics, and relevant auth/profile state.

## Files Created/Modified

- `apps/native/App.tsx` — removed blanket log suppression so future native startup/runtime failures surface normally.
- `apps/native/ConvexClientProvider.tsx` — added sanitized startup failure handling for missing public env keys.
- `apps/native/src/navigation/MainTabs.tsx` — read as the authoritative 7-tab contract for the blocked UAT record.
- `.gsd/milestones/M006/slices/S06/S06-UAT.md` — authoritative runtime/UAT record for the blocked simulator proof.
- `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md` — slice-close narrative tying command evidence, observability changes, and remaining blockers together.
- `.gsd/REQUIREMENTS.md` — updated R029 and R033 to reflect the truthful post-S06 native runtime state.
- `.gsd/milestones/M006/M006-ROADMAP.md` — marked S06 complete as a blocker-documentation slice and captured the remaining milestone blocker explicitly.
- `.gsd/STATE.md` — updated milestone/slice status, blockers, and next action.

## Forward Intelligence

### What the next slice should know
- The first trustworthy native stop point on this machine is still outside app code. Until `simctl` works, tab and screen debugging is guesswork.

### What's fragile
- Native runtime closure for M006 — the milestone is now blocked on local macOS/Xcode tooling, not on a proved app-code defect.

### Authoritative diagnostics
- `xcode-select -p` and `xcrun simctl list devices` — they fail before any Expo/native UI path starts, so they cleanly distinguish machine readiness from app runtime issues.

### What assumptions changed
- Original assumption: S06 would end with a live iOS simulator walkthrough of all 7 tabs and core flows.
- What actually happened: Expo could start Metro, but the machine never reached simulator launch because the active developer tools path still points at CommandLineTools and `simctl` is unavailable.