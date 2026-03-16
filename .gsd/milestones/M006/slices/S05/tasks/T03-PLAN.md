---
estimated_steps: 5
estimated_files: 7
---

# T03: Record validation evidence and close the slice contract

**Slice:** S05 — Backend Testing & Bug Fixes
**Milestone:** M006

## Description

Turn the passing backend sweep into durable milestone evidence. Update requirement status and proof text for R015–R021 and R032, record any reusable verification/cleanup knowledge discovered during the sweep, append only real structural decisions, and write the slice summary/UAT artifacts so later slices can consume S05 as validated backend input rather than tribal memory.

## Steps

1. Read the execution summaries from T01 and T02 and confirm the final passing command set, script totals, and any noteworthy rerun/failure patterns that should become project knowledge.
2. Update `.gsd/REQUIREMENTS.md` so R015–R021 move from active to validated only if the live scripts passed, and update R032 with the same concrete evidence. Keep proof text tied to actual commands/results rather than generic claims.
3. Update `.gsd/milestones/M006/M006-ROADMAP.md` to mark S05 complete if the slice contract is satisfied, then write `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md` and `.gsd/milestones/M006/slices/S05/S05-UAT.md` to capture what shipped, what passed, and any remaining non-S05 blockers for the milestone.
4. Append only durable lessons to `.gsd/KNOWLEDGE.md` and only structural choices to `.gsd/DECISIONS.md`; do not add history or noise that belongs in the slice summary instead.
5. Update `.gsd/STATE.md` so the active milestone/slice status and next action reflect the post-S05 reality.

## Must-Haves

- [ ] Requirement evidence for R015–R021 and R032 reflects the actual live verification results, not planned intent.
- [ ] Slice summary and roadmap state make it obvious to S06 that backend verification is now validated input, including any remaining out-of-slice blockers.
- [ ] Knowledge and decision entries are appended only when they create durable value for future execution.

## Verification

- Cross-check `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md`, `.gsd/milestones/M006/slices/S05/S05-UAT.md`, and `.gsd/STATE.md` against the final T02 command/results log.
- Ensure every cited verification command in the artifacts matches a command that actually ran successfully during S05.

## Inputs

- `.gsd/milestones/M006/slices/S05/tasks/T01-SUMMARY.md` — baseline and command surface used during the sweep.
- `.gsd/milestones/M006/slices/S05/tasks/T02-SUMMARY.md` — final passing script totals, fixes, and rerun notes.
- `.gsd/REQUIREMENTS.md` — current requirement statuses for R015–R021 and R032.
- `.gsd/milestones/M006/M006-ROADMAP.md` — slice completion state to update after successful close.
- `.gsd/KNOWLEDGE.md`, `.gsd/DECISIONS.md`, `.gsd/STATE.md` — append-only operational artifacts that should reflect durable new truth.

## Expected Output

- `.gsd/REQUIREMENTS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, and `.gsd/STATE.md` — updated to show S05’s validated backend sweep and resulting milestone state.
- `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md` and `.gsd/milestones/M006/slices/S05/S05-UAT.md` — truthful close-out artifacts capturing shipped fixes, verification evidence, and remaining milestone blockers.
- `.gsd/KNOWLEDGE.md` and optionally `.gsd/DECISIONS.md` — appended only with durable lessons/decisions discovered during execution.

## Observability Impact

- Signals changed: S05 closes the backend verification slice by moving the authoritative signal from task-local summaries into enduring milestone artifacts (`.gsd/REQUIREMENTS.md`, roadmap, slice summary/UAT, and state), so future agents can see validated backend status without replaying the whole sweep.
- Inspection path: start with `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md` for the slice-level command ledger, then `.gsd/REQUIREMENTS.md` for requirement-proof text, then T01/T02 summaries if a command/result detail needs drill-down.
- Failure state visibility: any future regression should now show up as drift between the enduring artifacts and rerun command output, especially on the readiness probes, the nine `verify-s*-m0*.ts` runners, and backend typecheck. The slice-close artifacts must preserve the exact commands and totals so that drift is obvious instead of implicit.
