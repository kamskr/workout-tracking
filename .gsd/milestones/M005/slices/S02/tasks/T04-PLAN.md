---
estimated_steps: 3
estimated_files: 0
---

# T04: TypeScript compilation gate and regression check

**Slice:** S02 — Shared Timer, Session Lifecycle & Combined Summary
**Milestone:** M005

## Description

Final compilation gate ensuring all S02 changes compile cleanly across all 3 packages (backend, web, native). Regression check on S01 verification script. Structural verification of expected function/cron/helper counts. This task catches any compilation issues before the slice is marked complete.

## Steps

1. **Run TypeScript compilation across all 3 packages**:
   - `tsc --noEmit -p packages/backend/convex/tsconfig.json` — 0 errors
   - `tsc --noEmit` in `apps/web` — 0 errors
   - `tsc --noEmit` in `apps/native` — 0 new errors (38 pre-existing TS2307 for `convex/react` accepted)

2. **Regression check on S01 artifacts**:
   - `verify-s01-m05.ts` still compiles (no broken imports from S02 changes)
   - `verify-s02-m05.ts` compiles
   - S01's 9 session functions still present in `sessions.ts`
   - S01's 10 test helpers still present in `testing.ts`

3. **Structural verification of S02 additions**:
   - `sessions.ts` exports 15 functions total (9 S01 + 6 S02: startSharedTimer, pauseSharedTimer, skipSharedTimer, endSession, getSessionSummary, checkSessionTimeouts)
   - `crons.ts` has 3 `crons.interval` entries
   - `testing.ts` has 16 session test helpers
   - `SharedTimerDisplay.tsx` has `data-session-timer`
   - `SessionSummary.tsx` has `data-session-summary`
   - Session page has `data-session-end-button`

## Must-Haves

- [ ] Backend: 0 TypeScript errors
- [ ] Web: 0 TypeScript errors
- [ ] Native: 0 new TypeScript errors
- [ ] Both verification scripts compile cleanly
- [ ] 15 session functions in sessions.ts
- [ ] 3 cron entries in crons.ts
- [ ] All 3 new data-* attributes present in web components

## Verification

- `tsc --noEmit -p packages/backend/convex/tsconfig.json` exits 0
- `cd apps/web && npx tsc --noEmit` exits 0
- `cd apps/native && npx tsc --noEmit 2>&1 | grep -c "error TS"` — only pre-existing TS2307 errors
- `grep -c "export const" packages/backend/convex/sessions.ts` — 15
- `grep -c "crons.interval" packages/backend/convex/crons.ts` — 3
- `grep "data-session-timer\|data-session-summary\|data-session-end-button" apps/web/src -r` — 3 matches

## Observability Impact

- Signals added/changed: None (compilation check only)
- How a future agent inspects this: Re-run the same tsc commands to verify compilation state
- Failure state exposed: None

## Inputs

- All files modified in T01, T02, T03
- S01 artifacts: `verify-s01-m05.ts`, `sessions.ts` S01 functions, `testing.ts` S01 helpers

## Expected Output

- No files created or modified — this task is a verification gate
- Confirmation that all 3 packages compile, both verification scripts compile, and structural counts match expectations
