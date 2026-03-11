---
estimated_steps: 3
estimated_files: 3
---

# T04: TypeScript compilation check and native compatibility

**Slice:** S01 — Session Creation, Joining, Presence & Live Set Feed
**Milestone:** M005

## Description

Final compilation gate for all 3 packages. The schema changes (new tables, optional `sessionId` on workouts) and new `sessions.ts` API exports must compile cleanly across backend, web, and native. Fix any type errors. This ensures the S01 boundary contract is stable for S02 consumption and the mobile package isn't broken by schema additions.

## Steps

1. **Run backend compilation** — `npx tsc --noEmit -p packages/backend/tsconfig.json`. Fix any errors. Confirm `sessions.ts` exports appear in generated types (`_generated/api.d.ts` should have `sessions` namespace).

2. **Run web compilation** — `cd apps/web && npx tsc --noEmit`. Confirm 0 new errors (only pre-existing clsx TS2307). Check that all new pages and components compile: session page, join page, SessionParticipantList, SessionSetFeed.

3. **Run native compilation** — `cd apps/native && npx tsc --noEmit`. Confirm 0 new errors (only pre-existing 30 convex/react TS2307). The native app imports from `@packages/backend` for types — verify the new `sessionId` optional field on workouts doesn't break any existing mobile workout code. No new mobile screens in S01 (that's S04), but the schema types must be compatible.

## Must-Haves

- [ ] `npx tsc --noEmit -p packages/backend/tsconfig.json` — 0 errors
- [ ] `npx tsc --noEmit -p apps/web/tsconfig.json` — 0 new errors (clsx only)
- [ ] `npx tsc --noEmit -p apps/native/tsconfig.json` — 0 new errors (convex/react only)
- [ ] No regression in existing workout/exercise/analytics/social/competitive code caused by schema additions

## Verification

- All 3 TypeScript compilation commands exit with code 0 (or only pre-existing known errors)
- `grep -c "sessions" packages/backend/convex/_generated/api.d.ts` returns > 0 (sessions module is registered)

## Observability Impact

- Signals added/changed: None — this is a compile-time check only
- How a future agent inspects this: Run the 3 tsc commands. Check exit codes. Pre-existing errors are documented in STATE.md.
- Failure state exposed: TypeScript compiler output shows exact file/line/error for any new issues

## Inputs

- All files modified in T01, T02, T03
- `packages/backend/tsconfig.json`, `apps/web/tsconfig.json`, `apps/native/tsconfig.json` — existing TypeScript configurations
- `.gsd/STATE.md` — documents pre-existing known errors (clsx on web, convex/react on native)

## Expected Output

- Clean compilation across all 3 packages (no new errors)
- Confidence that S01 boundary contract (schema + sessions API) is stable for S02
- Updated `.gsd/STATE.md` if any compilation notes need recording
