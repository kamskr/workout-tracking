---
id: T01
parent: S06
milestone: M006
provides:
  - Authoritative native-runtime boundary evidence showing the first stop point is machine tooling, not app code.
key_files:
  - apps/native/package.json
  - apps/native/.env
  - apps/native/app.json
  - .gsd/milestones/M006/slices/S06/tasks/T01-SUMMARY.md
key_decisions:
  - Treat the active `/Library/Developer/CommandLineTools` developer path as the first blocker seam for S06 and keep native typecheck evidence separate from simulator/runtime launch evidence.
patterns_established:
  - For S06 native proof, always run `xcode-select -p` and `xcrun simctl list devices` before `expo start --ios`; if `simctl` is missing, still run native typecheck and one real Expo iOS launch attempt to record the exact machine/runtime stop phase.
observability_surfaces:
  - xcode-select -p
  - xcrun simctl list devices
  - pnpm --filter native-app typecheck
  - pnpm --filter native-app exec expo start --ios
duration: 15m
verification_result: passed
completed_at: 2026-03-16T14:51:00+01:00
blocker_discovered: false
---

# T01: Prove simulator readiness and native boot boundary

**Recorded a machine-level iOS tooling blocker while proving native typecheck still passes from the `native-app` package boundary.**

## What Happened

I followed the proof order from the task plan instead of debugging app code speculatively.

First, I checked the machine boundary. `xcode-select -p` resolves to `/Library/Developer/CommandLineTools`, and `xcrun simctl list devices` fails immediately with `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH` (exit 72). That classifies the machine as **Xcode-path blocked**, not simulator-ready.

Before treating that as the whole story, I confirmed the native package/runtime boundary from the intended package. `apps/native/package.json` exposes the expected Expo entrypoints (`expo start --ios`) and `typecheck` script, `apps/native/.env` contains the mirrored public env keys consumed by the native runtime (`EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`), and `apps/native/app.json` is the Expo iOS configuration boundary.

I then ran `pnpm --filter native-app typecheck` to separate compile health from runtime/tooling health. TypeScript completed cleanly with `tsc --noEmit`.

Finally, I ran the real iOS boot command from the `native-app` package boundary: `pnpm --filter native-app exec expo start --ios`. Expo loaded `.env`, exported the expected public env keys, started Metro, and then stopped at the same tooling seam. The earliest launch failure remained outside app code: `Unable to run simctl: Error: xcrun simctl help exited with non-zero code: 72`, followed by Expo’s non-interactive Xcode prompt stating that full Xcode must be installed and, if already installed, the developer tools may need to be pointed at `/Applications/Xcode.app/Contents/Developer` with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.

The first truthful S06 boundary is therefore: **native compile is green, Expo can start Metro from `apps/native`, but iOS launch is blocked before simulator startup by the active CommandLineTools developer path / missing full Xcode toolchain**.

## Verification

Executed from the M006 worktree root:

- `xcode-select -p` → `/Library/Developer/CommandLineTools`
- `xcrun simctl list devices` → failed with `unable to find utility "simctl"` (exit 72)
- `pnpm --filter native-app typecheck` → passed (`tsc --noEmit`)
- `pnpm --filter native-app exec expo start --ios` → loaded `apps/native/.env`, started Metro, then failed at the same `simctl` seam with Expo’s sanitized Xcode-install / `xcode-select -s /Applications/Xcode.app/Contents/Developer` guidance

Must-haves satisfied:

- Machine readiness classified explicitly as **Xcode-path blocked**.
- Native typecheck result recorded separately from simulator/runtime behavior.
- Real Expo iOS launch attempted from the `native-app` package boundary with the exact first failure phase captured.

## Diagnostics

Use these commands in order to inspect the same boundary later:

1. `xcode-select -p` — shows whether the active developer path still points at CommandLineTools or full Xcode.
2. `xcrun simctl list devices` — fastest truth check for simulator tooling availability.
3. `pnpm --filter native-app typecheck` — confirms native compile health independently of machine tooling.
4. `pnpm --filter native-app exec expo start --ios` — reproduces the current stop point. In this task, Expo reached env load + Metro startup, then failed before simulator launch on `simctl`/Xcode tooling.

Sanitized blocker text worth preserving for follow-up:

- `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH`
- `Xcode must be fully installed before you can continue... you may need to finish the installation of the developer tools by running: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

## Deviations

- none

## Known Issues

- The machine is not currently capable of launching iOS Simulator because the active developer path is `/Library/Developer/CommandLineTools` and `simctl` is unavailable.
- Expo also emitted package-version compatibility warnings during `expo start --ios`. They did not become the first failing boundary because launch stopped earlier at Xcode/simulator tooling, but T02 should re-check them after the machine seam is resolved.
- Because simulator launch never began, this task produced no app-level signal yet for auth gate, tab shell, or screen render behavior.

## Files Created/Modified

- `.gsd/milestones/M006/slices/S06/tasks/T01-SUMMARY.md` — recorded the verified Xcode-path blocker, native env/package boundary, typecheck result, and first Expo iOS launch outcome for T02 handoff.
- `.gsd/milestones/M006/slices/S06/S06-PLAN.md` — marked T01 complete after capturing the required blocker evidence.
- `.gsd/KNOWLEDGE.md` — appended the native proof-order rule and the current CommandLineTools/`simctl` blocker seam for future S06 work.
- `.gsd/STATE.md` — updated active blockers and next action to reflect the machine-level iOS tooling stop point.
