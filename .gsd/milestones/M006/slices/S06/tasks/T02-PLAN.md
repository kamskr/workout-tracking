---
estimated_steps: 5
estimated_files: 8
---

# T02: Fix startup and screen-level native runtime failures

**Slice:** S06 — Mobile Testing & Bug Fixes
**Milestone:** M006

## Description

Repair only the native issues proven by the first real simulator run. Start with startup visibility if the app hides its own errors, then fix the concrete env/provider/auth/navigation/screen problems that prevent the tab shell and primary mobile flows from working. This task owns app-code repair, but only for runtime-proven failures.

## Steps

1. Read T01’s recorded runtime boundary and reproduce the first in-app failure on the same `pnpm --filter native-app exec expo start --ios` path before changing code.
2. If startup evidence is low-signal because `apps/native/App.tsx` suppresses all logs, reduce or replace `LogBox.ignoreAllLogs()` with targeted suppression so real React Native / Clerk / Convex failures surface during debugging without leaving noisy permanent instrumentation.
3. Fix the confirmed startup blocker in the smallest truthful seam: `ConvexClientProvider.tsx` for missing/unguarded env boot, `Navigation.tsx` for auth-gate stall, `MainTabs.tsx` for tab-shell wiring, or the specific screen/component files for render-time failures. Do not broaden scope beyond the blockers preventing S06 proof.
4. Re-run native typecheck and the Expo/iOS path after each fix until the app reaches the stable tab-shell state needed for manual testing, then re-check the originally failing screen(s) inside the simulator.
5. Record the exact fixes, the resolved failure modes, and any still-open but non-blocking native issues so T03 can perform proof from a stable baseline.

## Must-Haves

- [ ] Every code change is tied to a reproduced simulator failure, not a guessed risk.
- [ ] Startup diagnostics are good enough that a future agent can distinguish env/provider/auth failure from a blank screen or hidden warning.
- [ ] The app reaches the tab shell and unblocks manual verification of Exercises, Workouts, and Analytics on the real simulator path.

## Verification

- `pnpm --filter native-app typecheck`
- `pnpm --filter native-app exec expo start --ios`
- Fresh simulator rechecks of the originally failing startup/tab/screen path after each fix.

## Inputs

- `.gsd/milestones/M006/slices/S06/tasks/T01-SUMMARY.md` — exact first failing boundary and machine/runtime context.
- `apps/native/App.tsx` — startup logging/log-suppression seam.
- `apps/native/ConvexClientProvider.tsx` — env, Convex client, and Clerk provider boot seam.
- `apps/native/src/navigation/Navigation.tsx` — auth/loading gate before the tab shell.
- `apps/native/src/navigation/MainTabs.tsx` — 7-tab contract to preserve.
- `apps/native/src/screens/ExercisesScreen.tsx`, `apps/native/src/screens/WorkoutsScreen.tsx`, `apps/native/src/screens/ActiveWorkoutScreen.tsx`, `apps/native/src/screens/AnalyticsScreen.tsx` — highest-priority flow surfaces if simulator proof fails after startup.

## Expected Output

- Targeted native code changes that resolve the runtime-proven startup and/or screen blockers preventing S06 proof.
- A passing native typecheck after the fixes.
- A task summary that names the reproduced failures, the exact files changed, and the now-working simulator states handed to T03.

## Observability Impact

- Signals changed: native startup must now expose enough evidence to tell whether failures occur in provider initialization, auth loading, navigation shell creation, or individual screen rendering.
- Inspection path: reproduce via `pnpm --filter native-app exec expo start --ios`, inspect surfaced runtime errors/logs, then confirm resolution through the simulator UI and a follow-up run.
- Failure state visibility: avoid global log suppression that hides root causes. Permanent diagnostics should stay lightweight and redact secrets; refer only to missing variable names or sanitized error text.
