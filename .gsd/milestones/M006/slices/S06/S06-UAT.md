# S06: Mobile Testing & Bug Fixes — UAT

**Milestone:** M006
**Written:** 2026-03-16

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: the required live-runtime iOS proof could not start because the machine never reached simulator launch. This artifact records the exact runtime boundary that was exercised, the 7-tab/core-flow contract that remains unproven, and the commands that reproduced the blocker.

## Preconditions

- Worktree root: `/Users/kamsagent/Files/projects/workout-tracking/.gsd/worktrees/M006`
- Native public env file present at `apps/native/.env`
- Native startup observability from T02 is in place:
  - `apps/native/App.tsx` no longer uses `LogBox.ignoreAllLogs()`
  - `apps/native/ConvexClientProvider.tsx` surfaces sanitized missing-key startup failures by variable name only
- Required verification commands are run in this order:
  1. `xcode-select -p`
  2. `xcrun simctl list devices`
  3. `pnpm --filter native-app typecheck`
  4. `pnpm --filter native-app exec expo start --ios`

## Smoke Test

1. Run `xcode-select -p`.
2. Run `xcrun simctl list devices`.
3. **Expected:** active developer path points to full Xcode and `simctl` lists simulator devices.
4. **Observed:** active developer path remained `/Library/Developer/CommandLineTools`, and `xcrun simctl list devices` failed with `unable to find utility "simctl", not a developer tool or in PATH`.

## Test Cases

### 1. Machine and simulator readiness

1. Run `xcode-select -p` from the worktree root.
2. Run `xcrun simctl list devices`.
3. **Expected:** `/Applications/Xcode.app/Contents/Developer` (or equivalent full Xcode path) is active and `simctl` lists available simulators.
4. **Observed:** `/Library/Developer/CommandLineTools` was active and `simctl` failed before any app launch path could begin.

### 2. Native compile health independent of simulator tooling

1. Run `pnpm --filter native-app typecheck`.
2. **Expected:** the native package compiles cleanly even if simulator tooling is broken.
3. **Observed:** `tsc --noEmit` passed.

### 3. Real Expo iOS launch boundary

1. Run `pnpm --filter native-app exec expo start --ios`.
2. Wait for Expo CLI startup output.
3. **Expected:** Expo loads env, starts Metro, launches iOS Simulator, and the app reaches the native auth/tab shell for manual checks.
4. **Observed:** Expo loaded `.env`, exported `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, and started Metro, but then stopped before simulator launch with:
   - `Unable to run simctl: Error: xcrun simctl help exited with non-zero code: 72`
   - `Xcode must be fully installed before you can continue... you may need to finish the installation of the developer tools by running: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

### 4. Seven-tab contract review

1. Read `apps/native/src/navigation/MainTabs.tsx`.
2. Confirm the intended tab contract.
3. **Expected:** seven tabs are available for simulator proof.
4. **Observed:** the contract is present in code and defines these tabs:
   - Exercises
   - Workouts
   - Templates
   - Analytics
   - Feed
   - Compete
   - Profile

### 5. Core-flow runtime proof status

1. Attempt to proceed from Expo launch into manual app checks.
2. **Expected:** verify app launch state, all 7 tabs, Exercises list render, Workouts → ActiveWorkout add/log loop, Analytics render, and relevant auth/profile state.
3. **Observed:** not reachable. The process stopped at machine tooling before the simulator or app UI opened, so no auth gate, tab shell, screen render, or interaction proof was possible.

## Edge Cases

### Startup env/provider failure visibility after machine fix

1. Once Xcode/simulator tooling is repaired, rerun `pnpm --filter native-app exec expo start --ios`.
2. **Expected:** if the next failure is app-side rather than machine-side, native startup now surfaces it truthfully:
   - blanket RN log suppression is gone
   - missing public env keys render an inline blocked-startup screen and emit `[NativeStartup] Missing required public env keys: ...`

## Failure Signals

- `xcode-select -p` returns `/Library/Developer/CommandLineTools`
- `xcrun simctl list devices` exits non-zero or reports missing `simctl`
- `expo start --ios` starts Metro but stops with the Xcode-install / `xcode-select -s` prompt before opening Simulator
- No simulator window opens and no native auth/tab shell appears
- After machine repair, `[NativeStartup] Missing required public env keys: ...` would indicate env/provider boot failure rather than simulator failure

## Requirements Proved By This UAT

- none — this UAT does not prove R033 because no simulator runtime UI was reached

## Not Proven By This UAT

- R033 — all 7 tabs rendering, navigation working, Exercises data render, Workouts → ActiveWorkout logging loop, Analytics render, and profile/auth runtime state remain unproven because the machine stopped before simulator launch
- R029 full closure — web and backend boot were already proven earlier in M006, but the Expo/iOS portion remains blocked at the Xcode/simulator tooling boundary
- Any live native UX quality claim beyond compile health and startup diagnostics

## Notes for Tester

- Treat this artifact as the authoritative blocker record for S06 on this machine, not as a green runtime pass.
- Do not spend time debugging tab or screen code until `xcode-select -p` points to full Xcode and `xcrun simctl list devices` succeeds.
- Once simulator tooling is fixed, resume with the same command order and replace this blocker record with actual manual checks for the 7-tab contract and the core flows.