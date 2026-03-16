---
id: T03
parent: S06
milestone: M006
provides:
  - Durable slice-close artifacts that record the truthful native runtime outcome: native compile passes, Expo reaches Metro, and iOS simulator proof remains blocked at the machine Xcode/`simctl` boundary.
key_files:
  - .gsd/milestones/M006/slices/S06/S06-UAT.md
  - .gsd/milestones/M006/slices/S06/S06-SUMMARY.md
  - .gsd/REQUIREMENTS.md
  - .gsd/milestones/M006/M006-ROADMAP.md
  - .gsd/STATE.md
key_decisions:
  - Treat S06 closure as blocker documentation, not green runtime proof, when the final verification surface still stops before simulator launch.
patterns_established:
  - When native simulator proof is blocked at machine tooling, close the slice with one authoritative UAT artifact plus requirement/roadmap/state updates tied directly to `xcode-select`, `simctl`, native typecheck, and Expo iOS launch output.
observability_surfaces:
  - xcode-select -p
  - xcrun simctl list devices
  - pnpm --filter native-app typecheck
  - pnpm --filter native-app exec expo start --ios
  - .gsd/milestones/M006/slices/S06/S06-UAT.md
  - .gsd/milestones/M006/slices/S06/S06-SUMMARY.md
duration: 25m
verification_result: passed
completed_at: 2026-03-16T14:51:04+01:00
blocker_discovered: false
---

# T03: Execute 7-tab and core-flow proof, then close the slice artifacts

**Closed S06 with durable blocker-backed runtime artifacts instead of a false green simulator proof.**

## What Happened

I started T03 by re-running the full native verification surface rather than assuming T01/T02 still held. The result was unchanged: `xcode-select -p` still resolves to `/Library/Developer/CommandLineTools`, `xcrun simctl list devices` still fails because `simctl` is unavailable, `pnpm --filter native-app typecheck` still passes, and `pnpm --filter native-app exec expo start --ios` still loads env plus starts Metro before stopping at the same Xcode-install / `xcode-select -s /Applications/Xcode.app/Contents/Developer` prompt.

That meant the plan’s requested 7-tab and core-flow walkthrough could not be executed truthfully on this machine. Instead of scattering that fact across task notes, I turned it into durable slice truth. I wrote `S06-UAT.md` as the authoritative runtime record: preconditions, exact commands, observed outputs, the 7-tab contract from `apps/native/src/navigation/MainTabs.tsx`, and an explicit list of what remains unproven because simulator launch never happened.

I then updated the enduring artifacts to match the executed outcome. `REQUIREMENTS.md` now advances R029 and R033 from vague/pending state to concrete blocker-backed state. `M006-ROADMAP.md` marks S06 complete as a blocker-documentation slice and calls out the remaining milestone blocker explicitly. `S06-SUMMARY.md` compresses T01–T03 into one slice narrative, and `STATE.md` now points at the real next action: fix the local Xcode/simulator tooling seam, then rerun S06 runtime proof.

No new app-code changes were needed in T03. The work here was closure and consistency: make every enduring artifact tell the same post-S06 story without overstating what the runtime actually proved.

## Verification

Re-ran the required slice verification commands from the worktree root:

- `xcode-select -p` → `/Library/Developer/CommandLineTools`
- `xcrun simctl list devices` → `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH` (exit 72)
- `pnpm --filter native-app typecheck` → passed (`tsc --noEmit`)
- `pnpm --filter native-app exec expo start --ios` → loaded `apps/native/.env`, exported `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, started Metro, then failed before simulator launch with the full-Xcode / `xcode-select -s /Applications/Xcode.app/Contents/Developer` prompt
- Cross-checked `.gsd/milestones/M006/slices/S06/S06-UAT.md`, `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, and `.gsd/STATE.md` against that same command evidence
- Read `apps/native/src/navigation/MainTabs.tsx` to anchor the unproven 7-tab contract in code: Exercises, Workouts, Templates, Analytics, Feed, Compete, Profile

## Diagnostics

Start future inspection at these surfaces in this order:

1. `xcode-select -p`
2. `xcrun simctl list devices`
3. `pnpm --filter native-app typecheck`
4. `pnpm --filter native-app exec expo start --ios`
5. `.gsd/milestones/M006/slices/S06/S06-UAT.md` for the durable blocker/UAT record
6. `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md` for the slice-level compressed narrative

If machine tooling is fixed, the next app-side startup failure should surface through the targeted native diagnostics added in T02 rather than being hidden by blanket log suppression.

## Deviations

- The written plan expected a manual simulator pass across the 7 tabs and core flows. The real execution never reached simulator launch, so this task closed the slice with blocker-backed artifacts instead of fabricated runtime proof.

## Known Issues

- The machine still cannot launch iOS Simulator because the active developer path is `/Library/Developer/CommandLineTools` and `simctl` is unavailable.
- R029 remains active until Expo can complete iOS launch on this machine.
- R033 remains active because no app launch state, auth state, tab shell, screen rendering, or core-flow interaction was observed in a simulator session.
- Expo still reports package-version compatibility warnings during `expo start --ios`; they remain secondary until simulator tooling is fixed.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S06/S06-UAT.md` — created the authoritative runtime/UAT artifact recording the blocker phase, command outputs, 7-tab contract, and unproven flows.
- `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md` — created the slice-close summary tying T01–T03 evidence into one durable narrative.
- `.gsd/REQUIREMENTS.md` — updated R029 and R033 validation text plus traceability rows to reflect the actual post-S06 native runtime state.
- `.gsd/milestones/M006/M006-ROADMAP.md` — marked S06 complete and added explicit milestone-level blocker status.
- `.gsd/STATE.md` — updated active slice state, blockers, and next action for follow-up work.
- `.gsd/milestones/M006/slices/S06/S06-PLAN.md` — marked T03 complete.
- `.gsd/milestones/M006/slices/S06/tasks/T03-SUMMARY.md` — recorded task-level execution, verification, and remaining issues for clean resume.