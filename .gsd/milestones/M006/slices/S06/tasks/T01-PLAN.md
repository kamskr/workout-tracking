---
estimated_steps: 5
estimated_files: 4
---

# T01: Prove simulator readiness and native boot boundary

**Slice:** S06 — Mobile Testing & Bug Fixes
**Milestone:** M006

## Description

Establish the first truthful mobile runtime boundary. Before any app-level debugging, prove whether this machine can run iOS Simulator, whether the native package still typechecks under the S01 env contract, and whether Expo can launch the real iOS entrypoint from `apps/native`. If the stop point is outside app code, capture it as a precise blocker instead of blurring it into “mobile bugs.”

## Steps

1. Verify machine readiness with `xcode-select -p` and `xcrun simctl list devices`, recording the exact developer-tools path and whether `simctl` exists. If the machine still points at CommandLineTools, treat that as the first blocker seam and document the exact command/error needed for follow-up.
2. Confirm the native package boundary and env assumptions before runtime: inspect `apps/native/package.json`, `apps/native/.env`, and `apps/native/app.json` only as needed to ensure the executor is launching from the right package with the mirrored public env vars expected by S01.
3. Run `pnpm --filter native-app typecheck` so native compile regressions are separated from simulator/runtime failures.
4. Launch Expo through the real iOS path with `pnpm --filter native-app exec expo start --ios`, capturing whether the app reaches simulator launch, Expo bundling, native startup, auth gate, or an earlier failure phase.
5. Write down the first failing or passing boundary in task summary form so T02 inherits an exact runtime starting point instead of reopening environment discovery.

## Must-Haves

- [ ] Machine readiness is classified explicitly as ready, Xcode-path blocked, or simulator-command blocked.
- [ ] Native typecheck result is recorded separately from simulator/Expo runtime behavior.
- [ ] The first real Expo/iOS boot attempt runs from the `native-app` package boundary and yields an exact phase/result for T02.

## Verification

- `xcode-select -p`
- `xcrun simctl list devices`
- `pnpm --filter native-app typecheck`
- `pnpm --filter native-app exec expo start --ios`

## Inputs

- `apps/native/package.json` — authoritative native package commands and dependency context.
- `apps/native/.env` — mirrored public env contract consumed by the native runtime.
- `apps/native/app.json` — Expo iOS app configuration boundary.
- `.gsd/milestones/M006/slices/S06/S06-RESEARCH.md` — expected build order, current simulator risk, and proof seam priorities.
- `.gsd/milestones/M006/slices/S05/S05-SUMMARY.md` — backend already verified live; do not reopen backend debugging unless the native boot evidence points there.

## Expected Output

- Task summary evidence showing the exact `xcode-select` state, `simctl` availability, native typecheck result, and first Expo/iOS launch outcome.
- If blocked, a sanitized machine/runtime blocker record that localizes the stop point before app-code work.
- If unblocked, a clear handoff to T02 naming the first runtime failure inside the app (startup, auth, navigation, or screen render).

## Observability Impact

- Signals changed: this task establishes the authoritative native-runtime starting signals for S06 — developer-tools path, simulator availability, native typecheck status, and Expo/iOS launch phase.
- Inspection path: start with `xcode-select -p` and `xcrun simctl list devices`, then `pnpm --filter native-app typecheck`, then the `expo start --ios` output from the native package boundary.
- Failure state visibility: the result must make it obvious whether the blocker is machine tooling, Expo launch, bundling, or app startup. Secret values must stay redacted; only file paths, variable names, and sanitized errors belong in the record.
