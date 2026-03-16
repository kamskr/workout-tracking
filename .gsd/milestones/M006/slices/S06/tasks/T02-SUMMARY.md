---
id: T02
parent: S06
milestone: M006
provides:
  - Native startup now exposes provider/env failures instead of hiding them behind global log suppression, while preserving the current machine-level simulator blocker evidence for T03.
key_files:
  - apps/native/App.tsx
  - apps/native/ConvexClientProvider.tsx
  - .gsd/milestones/M006/slices/S06/tasks/T02-SUMMARY.md
key_decisions:
  - Remove global native log suppression and fail startup with sanitized missing-key diagnostics so future simulator runs can distinguish env/provider boot failures from later auth/navigation issues.
patterns_established:
  - For S06 native debugging, fix only runtime-proven seams; if simulator launch is still blocked at `simctl`, limit app-code changes to observability improvements that are directly justified by the inability to see startup failures.
observability_surfaces:
  - pnpm --filter native-app typecheck
  - pnpm --filter native-app exec expo start --ios
  - apps/native/App.tsx targeted LogBox suppression
  - apps/native/ConvexClientProvider.tsx sanitized startup error + console.error for missing public env keys
duration: 25m
verification_result: passed
completed_at: 2026-03-16T14:51:04+01:00
blocker_discovered: false
---

# T02: Fix startup and screen-level native runtime failures

**Removed global native log suppression and added sanitized provider/env startup diagnostics while confirming the real iOS path is still blocked at `simctl` before app launch.**

## What Happened

I started by re-running the same proof path from T01 instead of guessing at app code. The machine is still pointed at `/Library/Developer/CommandLineTools`, `xcrun simctl list devices` still fails with `unable to find utility "simctl"`, `pnpm --filter native-app typecheck` still passes, and `pnpm --filter native-app exec expo start --ios` still loads env + starts Metro before stopping at the same Xcode/simulator tooling prompt. That means the originally proven stop point remains outside app code.

Given that constraint, the only truthful startup fix available in this task was observability. `apps/native/App.tsx` was suppressing all React Native logs with `LogBox.ignoreAllLogs()`, which would hide the next real provider/auth/screen failure once simulator access is restored. I removed the blanket suppression and kept only targeted ignored warning patterns.

I also tightened the provider boot seam in `apps/native/ConvexClientProvider.tsx`. Instead of constructing providers unconditionally, it now checks `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` up front. If either is missing, native startup now logs a sanitized `[NativeStartup]` console error naming only the missing keys and renders an inline startup-blocked screen telling the next agent where to look (`apps/native/.env`). No secret values are printed.

I did not make speculative changes to `Navigation.tsx`, `MainTabs.tsx`, or the screen files because the real simulator path never reached those seams in this environment. The tab shell and screen-level proof still need a machine with working `simctl` / full Xcode developer path before they can be truthfully exercised.

## Verification

Executed from the M006 worktree root:

- `xcode-select -p` → `/Library/Developer/CommandLineTools`
- `xcrun simctl list devices` → failed with `xcrun: error: unable to find utility "simctl", not a developer tool or in PATH` (exit 72)
- `pnpm --filter native-app typecheck` → passed before and after the code changes (`tsc --noEmit`)
- `pnpm --filter native-app exec expo start --ios` → before and after the code changes, Expo loaded `apps/native/.env`, exported the public env keys, started Metro, then failed at the same `simctl` / full-Xcode prompt before launching the simulator

Must-have status:

- Every code change is tied to a reproduced runtime need: startup evidence was being globally hidden.
- Startup diagnostics are now good enough to distinguish a future env/provider boot failure from a blank screen.
- The app still could not be rechecked at the tab shell or screen level because the real iOS launch path remains machine-blocked before app execution.

## Diagnostics

Use these surfaces in order on the next native run:

1. `xcode-select -p` — if this still points at `/Library/Developer/CommandLineTools`, the blocker is still machine-level.
2. `xcrun simctl list devices` — confirms whether simulator tooling is available.
3. `pnpm --filter native-app exec expo start --ios` — once the machine seam is fixed, Expo startup will no longer hide app-side warnings globally.
4. `apps/native/ConvexClientProvider.tsx` — if env boot is wrong, the app now emits `[NativeStartup] Missing required public env keys: ...` and renders an inline startup-blocked screen naming only the missing variable names.
5. `apps/native/App.tsx` — targeted `LogBox.ignoreLogs(...)` remains, but blanket `ignoreAllLogs()` is gone, so React Native / Clerk / Convex startup failures should now surface normally.

## Deviations

- The plan expected screen-level rechecks after fixes, but the real iOS launch path never progressed past the same `simctl` / full-Xcode machine blocker, so this task was limited to startup observability improvements instead of tab/screen repairs.

## Known Issues

- The machine still cannot launch iOS Simulator because the active developer path is `/Library/Developer/CommandLineTools` and `simctl` is unavailable.
- Because the simulator never launched, T02 could not truthfully verify tab-shell rendering, auth-gate behavior, Exercises, Workouts, Active Workout, or Analytics on-device.
- Expo still reports package-version compatibility warnings during `expo start --ios`; they remain secondary until simulator/Xcode tooling is fixed and the app can actually boot.

## Files Created/Modified

- `apps/native/App.tsx` — removed `LogBox.ignoreAllLogs()` and kept only targeted warning suppression so real startup/runtime failures surface.
- `apps/native/ConvexClientProvider.tsx` — added guarded env boot with sanitized missing-key diagnostics and a visible startup-blocked fallback screen.
- `.gsd/DECISIONS.md` — recorded the native startup observability decision for S06 follow-up.
- `.gsd/KNOWLEDGE.md` — recorded the native startup diagnostics rule and the exact sanitized env-key failure surface.
- `.gsd/milestones/M006/slices/S06/S06-PLAN.md` — marked T02 complete.
- `.gsd/milestones/M006/slices/S06/tasks/T02-SUMMARY.md` — recorded the reproduced blocker, the observability fix, and the remaining simulator-bound limitation.
- `.gsd/STATE.md` — updated current slice status and next action for T03 handoff.
