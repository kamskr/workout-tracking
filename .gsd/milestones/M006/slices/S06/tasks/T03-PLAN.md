---
estimated_steps: 5
estimated_files: 7
---

# T03: Execute 7-tab proof and close the native runtime contract

**Slice:** S06 — Mobile Testing & Bug Fixes
**Milestone:** M006

## Description

Turn the simulator result into durable slice truth. Perform the manual/runtime pass across the 7-tab contract and the core flows required by R033, then update the enduring milestone artifacts so later agents can tell whether native runtime is validated or still blocked without replaying the whole slice.

## Steps

1. Starting from T02’s stable runtime baseline, execute and document the required manual checks in simulator: app launch state, all 7 tabs in `MainTabs.tsx`, Exercises list render, Workouts → ActiveWorkout exercise add/log loop, Analytics render, and any relevant profile/auth state needed to explain the observed UX.
2. Write `.gsd/milestones/M006/slices/S06/S06-UAT.md` as the authoritative manual/runtime proof record, including preconditions, exact checks, expected outcomes, observed blockers if any, and which requirements are or are not proven by the run.
3. Update `.gsd/REQUIREMENTS.md` for R029 and R033 only according to the actual simulator result: advance proof text and status if the runtime contract is met, or record a precise remaining blocker if it is not. Keep claims tied to commands and observed runtime behavior.
4. Update `.gsd/milestones/M006/M006-ROADMAP.md`, `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md`, and `.gsd/STATE.md` so slice completion, next action, and remaining milestone blockers all match the real runtime outcome. Append only durable lessons to `.gsd/KNOWLEDGE.md` and only structural decisions to `.gsd/DECISIONS.md` if the execution created them.
5. Cross-check the enduring artifacts against the final verification surface (`xcode-select`, `simctl`, native typecheck, Expo/iOS launch, UAT evidence) so the recorded story matches what actually ran.

## Must-Haves

- [ ] The 7-tab and core-flow proof is captured in one durable UAT artifact rather than scattered task notes.
- [ ] R029 and R033 reflect the truthful native runtime outcome — validated if proved, still active only with a concrete blocker.
- [ ] Roadmap, summary, knowledge/state, and any decisions all tell the same post-S06 story.

## Verification

- `xcode-select -p`
- `xcrun simctl list devices`
- `pnpm --filter native-app typecheck`
- `pnpm --filter native-app exec expo start --ios`
- Cross-check `.gsd/milestones/M006/slices/S06/S06-UAT.md`, `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md`, `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, and `.gsd/STATE.md` against the final runtime evidence.

## Inputs

- `.gsd/milestones/M006/slices/S06/tasks/T02-SUMMARY.md` — stable runtime baseline and resolved blockers.
- `.gsd/REQUIREMENTS.md` — current R029/R033 status and proof text.
- `.gsd/milestones/M006/M006-ROADMAP.md` — slice completion state.
- `.gsd/STATE.md`, `.gsd/KNOWLEDGE.md`, `.gsd/DECISIONS.md` — enduring project state artifacts to update carefully.
- `apps/native/src/navigation/MainTabs.tsx` — authoritative 7-tab contract for manual proof.

## Expected Output

- `.gsd/milestones/M006/slices/S06/S06-UAT.md` and `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md` — truthful slice-close artifacts capturing the native runtime proof, fixes, remaining limitations, and command ledger.
- `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, and `.gsd/STATE.md` — updated to reflect the real post-S06 requirement and milestone state.
- Optional append-only updates to `.gsd/KNOWLEDGE.md` and `.gsd/DECISIONS.md` only if execution surfaces durable lessons or structural choices.

## Observability Impact

- Signals changed: S06 closes the loop by moving native runtime truth out of ephemeral simulator sessions and into enduring artifacts with explicit command-level and manual-proof evidence.
- Inspection path: read `S06-SUMMARY.md` for the slice-level narrative, `S06-UAT.md` for the manual/runtime checks, then `REQUIREMENTS.md` and roadmap/state for enduring project status.
- Failure state visibility: if native runtime remains blocked, the artifacts must name the exact blocking phase and command/UI evidence so the next agent can resume immediately instead of rediscovering the seam.
