# S06: Mobile Testing & Bug Fixes

**Goal:** Prove the Expo native app actually runs on iOS Simulator against the live Convex backend, then fix the runtime issues needed for stable tab rendering and core mobile flows.
**Demo:** On this worktree, the iOS Simulator launches the Expo app, reaches the authenticated/native tab shell, all 7 tabs render without red-screen blockers, and the primary mobile flows (exercise browse, workout logging, analytics) are exercised with recorded evidence.

## Must-Haves

- iOS Simulator tooling is truthfully ready on this machine, or a precise system-level blocker is surfaced with reproducible evidence.
- Expo boots from `apps/native` against the existing S01 env contract and exposes actionable startup diagnostics instead of a silent hang.
- The mobile app renders all 7 tabs defined in `apps/native/src/navigation/MainTabs.tsx` and the slice records manual/runtime proof for tab switching plus the core flows called out in R033.
- Runtime-proven native bugs uncovered during simulator testing are fixed and reverified on the real app path.
- R029 is advanced from “native compiles” toward “native boots”, and R033 receives concrete runtime evidence or an explicit blocker record.

## Proof Level

- This slice proves: operational
- Real runtime required: yes
- Human/UAT required: yes

## Verification

- `xcode-select -p`
- `xcrun simctl list devices`
- `pnpm --filter native-app typecheck`
- `pnpm --filter native-app exec expo start --ios`
- Simulator/runtime proof recorded in `.gsd/milestones/M006/slices/S06/S06-UAT.md` covering: app launch state, 7-tab rendering, Exercises tab live data, Workouts → active workout logging loop, Analytics render, and any blocker/fix evidence.

## Observability / Diagnostics

- Runtime signals: Xcode developer path, `simctl` availability, Expo CLI/iOS launch output, visible app state at auth gate/tab shell, and any surfaced React Native/Clerk/Convex startup errors.
- Inspection surfaces: `xcode-select -p`, `xcrun simctl list devices`, `pnpm --filter native-app typecheck`, Expo CLI output from `apps/native`, `apps/native/App.tsx` log-suppression behavior, and the simulator UI/UAT record.
- Failure visibility: startup phase must be distinguishable as machine tooling, env/provider initialization, auth gate stall, tab/screen render failure, or interaction-specific runtime bug.
- Redaction constraints: never print secret values; reference only env file paths, variable names, and sanitized runtime error text.

## Integration Closure

- Upstream surfaces consumed: S01 local env contract (`packages/backend/.env.local`, mirrored native env), S05 live backend verification confidence, `apps/native/ConvexClientProvider.tsx`, `apps/native/App.tsx`, `apps/native/src/navigation/Navigation.tsx`, and `apps/native/src/navigation/MainTabs.tsx`.
- New wiring introduced in this slice: any native runtime observability adjustments needed for truthful Expo/simulator debugging, plus targeted mobile bug fixes discovered in real execution.
- What remains before the milestone is truly usable end-to-end: if S06 closes green, only the broader milestone close-out remains; if simulator access or native auth boot stays blocked, that blocker must be explicit enough for immediate follow-up.

## Tasks

- [x] **T01: Prove simulator readiness and native boot boundary** `est:1h`
  - Why: S06 cannot truthfully debug “mobile bugs” until the machine can launch iOS Simulator and Expo can attempt the real native entrypoint against the existing env contract.
  - Files: `apps/native/package.json`, `apps/native/.env`, `apps/native/app.json`, `.gsd/milestones/M006/slices/S06/tasks/T01-PLAN.md`
  - Do: Verify the Xcode developer-tools path and `simctl` availability, switch to the full slice-level blocker if the machine still points at CommandLineTools, confirm native typecheck still passes, and start Expo from the native package boundary with iOS launch so the first failing startup phase is captured cleanly.
  - Verify: `xcode-select -p && xcrun simctl list devices && pnpm --filter native-app typecheck && pnpm --filter native-app exec expo start --ios`
  - Done when: the executor has either launched the app into iOS Simulator or produced precise, reproducible machine/runtime blocker evidence that localizes the stop point before app code.
- [x] **T02: Fix startup and screen-level native runtime failures** `est:2h`
  - Why: Once the real boot path exists, the highest-value work is to remove the specific runtime failures preventing auth/tab shell render and core flows, not to make speculative native changes.
  - Files: `apps/native/App.tsx`, `apps/native/ConvexClientProvider.tsx`, `apps/native/src/navigation/Navigation.tsx`, `apps/native/src/navigation/MainTabs.tsx`, `apps/native/src/screens/ExercisesScreen.tsx`, `apps/native/src/screens/WorkoutsScreen.tsx`, `apps/native/src/screens/ActiveWorkoutScreen.tsx`, `apps/native/src/screens/AnalyticsScreen.tsx`
  - Do: Use the first truthful simulator failure to guide targeted fixes, starting with startup observability if `LogBox.ignoreAllLogs()` hides evidence, then repair env/auth/provider, navigation, or screen/component bugs only where runtime proves them. Keep scope to the issues blocking 7-tab rendering and the primary exercise/workout/analytics loop.
  - Verify: `pnpm --filter native-app typecheck` plus a fresh `pnpm --filter native-app exec expo start --ios` run that reaches the relevant app state after each fix.
  - Done when: the app boots without the original runtime blocker, reaches the signed-in/tab-shell path needed for testing, and the known failing native surfaces from the first pass have been rechecked on the real simulator path.
- [x] **T03: Execute 7-tab and core-flow proof, then close the slice artifacts** `est:1h`
  - Why: S06 is only done when the runtime result is durable project truth — 7-tab proof, core-flow evidence, remaining limitations, and requirement/state updates that let the milestone consume native runtime as validated or explicitly blocked input.
  - Files: `.gsd/REQUIREMENTS.md`, `.gsd/STATE.md`, `.gsd/KNOWLEDGE.md`, `.gsd/DECISIONS.md`, `.gsd/milestones/M006/M006-ROADMAP.md`, `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md`, `.gsd/milestones/M006/slices/S06/S06-UAT.md`
  - Do: Perform and record the manual/runtime verification pass across all 7 tabs plus the required exercise/workout/analytics flows, document any remaining non-slice limitations, update requirement status/evidence for R029 and R033 as warranted by the actual runtime outcome, and close the roadmap/state artifacts consistently.
  - Verify: Re-run the final native verification surface (`xcode-select -p`, `xcrun simctl list devices`, `pnpm --filter native-app typecheck`, `pnpm --filter native-app exec expo start --ios`) and cross-check the resulting runtime evidence against `S06-SUMMARY.md`, `S06-UAT.md`, `REQUIREMENTS.md`, roadmap, and state.
  - Done when: the enduring artifacts tell the truthful final story of S06 — either green native runtime proof with requirement advancement or a crisply localized blocker with enough evidence for immediate continuation.

## Files Likely Touched

- `apps/native/App.tsx`
- `apps/native/ConvexClientProvider.tsx`
- `apps/native/src/navigation/Navigation.tsx`
- `apps/native/src/navigation/MainTabs.tsx`
- `apps/native/src/screens/ExercisesScreen.tsx`
- `apps/native/src/screens/WorkoutsScreen.tsx`
- `apps/native/src/screens/ActiveWorkoutScreen.tsx`
- `apps/native/src/screens/AnalyticsScreen.tsx`
- `.gsd/milestones/M006/slices/S06/S06-SUMMARY.md`
- `.gsd/milestones/M006/slices/S06/S06-UAT.md`
- `.gsd/REQUIREMENTS.md`
- `.gsd/STATE.md`
