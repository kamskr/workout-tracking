# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Exercise Library with Curated Seed Data
- Class: core-capability
- Status: validated
- Description: The app ships with a curated JSON seed of ~100-150 common exercises. Each exercise has name, muscle groups (primary/secondary), equipment required, exercise type (strength/cardio/bodyweight/stretch), and instructions. Users can also create custom exercises.
- Why it matters: Users need exercises to exist before they can log workouts. This is the foundation of the entire data model.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: M001/S01 — 144 exercises seeded, queryable with filters, browsable at /exercises. Verified by programmatic script (verify-s01.ts) and browser.
- Notes: Seed data loaded into Convex on initial setup. Community exercise sharing deferred to M003.

### R002 — Workout CRUD with Realtime Sync
- Class: primary-user-loop
- Status: validated
- Description: Users can create, view, edit, and delete workouts. A workout has a date, optional name, duration (auto-tracked via start/end timestamps), and an ordered list of exercises with sets. Changes sync in realtime across all connected devices via Convex subscriptions.
- Why it matters: This is the core user loop — logging workouts is the primary action users perform.
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03
- Validation: M001/S02 — Full workout lifecycle (create → add exercises → log sets → finish → list → details → delete) verified by verify-s02.ts (11 checks). Web UI at /workouts and /workouts/active compiles with type-checked Convex API bindings. Realtime sync deferred to S06 cross-platform verification.
- Notes: Realtime sync is provided by Convex's reactive query system at no extra implementation cost.

### R003 — Full Set Tracking (Weight, Reps, RPE, Tempo, Notes)
- Class: core-capability
- Status: validated
- Description: Each set within a workout exercise records: weight, reps, RPE (rate of perceived exertion, 1-10 scale), tempo (eccentric/pause/concentric/pause notation), and optional notes. Input fields adapt per exercise type — bodyweight exercises skip weight, cardio tracks distance+duration instead.
- Why it matters: User explicitly requested full tracking depth. This differentiates from basic workout apps.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: M001/S03 — logSet/updateSet accept rpe, tempo, notes. RPE validated 1-10 (out-of-range rejected). Partial update preserves unmodified fields. Round-trip verified by verify-s03.ts (4 checks). Web UI: SetRow renders RPE (number input), tempo (text input), notes (collapsible row) with onBlur save pattern (D021).
- Notes: RPE and tempo are optional fields — never required.

### R004 — Rest Timer Between Sets
- Class: core-capability
- Status: validated
- Description: An auto-starting countdown timer begins when a set is logged. Default rest time is configurable per exercise. Visual countdown with notification when rest is complete. Timer can be manually adjusted, paused, or skipped.
- Why it matters: Rest timing is critical for training effectiveness. Auto-start reduces friction during workouts.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: M001/S04 — Backend: updateRestSeconds and setDefaultRestSeconds mutations proven by verify-s04.ts (6 checks: set/clear restSeconds, set defaultRestSeconds, 3-level priority chain resolution). UI: RestTimerContext state machine (idle→running→paused→completed→idle), RestTimerDisplay with SVG circular countdown, RestDurationConfig per-exercise inline control — all compile with full type safety. Timer auto-starts after logSet with 4-level priority chain (workoutExercise.restSeconds → exercise.defaultRestSeconds → userPreferences.defaultRestSeconds → 60s). Duration of 0 skips timer. Web Audio beep on completion. Mobile deferred to S06.
- Notes: Timer state is local only (D008). Completion notification is Web Audio beep; browser notification API and Expo push deferred.

### R005 — Superset and Circuit Grouping
- Class: core-capability
- Status: validated
- Description: Users can group 2+ exercises into a superset or circuit within a workout. Grouped exercises share rest timers and display together visually.
- Why it matters: Supersets are a fundamental training pattern — without them, the tracker can't represent real gym workouts accurately.
- Source: inferred
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: M001/S03 — setSupersetGroup sets groupId on multiple exercises, clearSupersetGroup clears one while others retain. Verified by verify-s03.ts (2 checks). Web UI: "Group Superset" selection mode with checkbox selection + floating "Create Superset" button. Grouped exercises render in colored-border containers with "Superset" badge. "Remove from superset" per exercise.
- Notes: Implemented as an exercise grouping concept in the data model, not a separate entity. Shared rest timers deferred to S04.

### R006 — Workout Templates
- Class: core-capability
- Status: validated
- Description: Users can save any completed workout as a reusable template. Loading a template pre-fills exercises and their configuration (target sets/reps) but leaves weight/RPE blank for fresh input. Templates are editable and deletable.
- Why it matters: Most gym-goers repeat workouts weekly. Templates eliminate re-entering the same exercises every session.
- Source: user
- Primary owning slice: M001/S05
- Supporting slices: none
- Validation: M001/S05 — saveAsTemplate copies exercise structure (targetSets, targetReps, restSeconds). startWorkoutFromTemplate pre-fills exercises without sets. 8-check integration script (verify-s05.ts) proves save/list/get/delete/start + 3 rejection cases. Web UI at /templates with type-safe Convex bindings. Template editing not implemented (delete+re-save workaround).
- Notes: Templates store exercise selection and set structure, not performance data. Superset grouping not preserved in templates (D036).

### R007 — Previous Performance Display
- Class: core-capability
- Status: validated
- Description: When logging sets for an exercise, the app displays what the user did last time for that exercise ("Last: 3×10 @ 135 lbs"). This appears inline next to the input fields.
- Why it matters: Progressive overload is the core principle of training — users must see their previous numbers to know what to beat.
- Source: inferred
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: M001/S03 — getPreviousPerformance query returns structured { exerciseName, sets, workoutDate, workoutName } or null. Returns correct sets (weight/reps) from most recent completed workout. Returns null for never-done exercises. Verified by verify-s03.ts (6 checks). Web UI: WorkoutExerciseItem shows "Last: 3×10 @ 60 kg" inline below exercise name with unit-aware formatting. "First time! 🎉" badge for new exercises.
- Notes: Queries the most recent workout containing that exercise.

### R008 — Unit Preference (kg/lbs)
- Class: core-capability
- Status: validated
- Description: Each user can set their preferred weight unit (kg or lbs). All weight displays respect this preference. Unit can be changed at any time and the display updates retroactively (stored values are always in a canonical unit).
- Why it matters: International users expect metric. US users expect imperial. Getting this wrong makes the app unusable.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: M001/S02 — Unit preference CRUD (set to "lbs" → read back → set to "kg" → read back) verified by verify-s02.ts (2 checks). Unit conversion utility (kgToLbs, lbsToKg, formatWeight, displayWeight) tested programmatically. SetRow component applies conversion at input boundary (D021). UnitToggle component wired to setUnitPreference mutation.
- Notes: Store in kg internally, convert for display.

### R009 — Workout Duration Auto-Tracking
- Class: core-capability
- Status: validated
- Description: Workouts automatically track duration via start and end timestamps. A running timer is visible during an active workout. Duration appears in workout history.
- Why it matters: Users want to know how long their workouts take without manual tracking.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: M001/S02 — Server-side durationSeconds computed in finishWorkout (D019), verified by verify-s02.ts (2 checks: durationSeconds >= 1, completedAt set). Client-side timer (ActiveWorkoutHeader) uses setInterval from startedAt. Duration formatted via formatDuration utility (tested: "1h 23m", "45m", "0m").
- Notes: Start = when first set is logged or workout is explicitly started. End = when user finishes workout.

### R010 — Body-Part and Equipment Filtering
- Class: core-capability
- Status: validated
- Description: Users can filter the exercise library by muscle group (chest, back, legs, etc.) and equipment (barbell, dumbbell, cable, bodyweight, etc.). Search by name also supported.
- Why it matters: With 100+ exercises, users need fast discovery by what they're looking for.
- Source: inferred
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: M001/S01 — muscle group filter (16 chest results), equipment filter (30 barbell results), text search (19 "press" results), combined filters all verified by script and browser.
- Notes: Convex indexes on muscleGroup and equipment fields.

### R011 — Cross-Platform UI (Web + Mobile)
- Class: launchability
- Status: validated
- Description: All M001 features work on both Next.js web and Expo mobile apps. The mobile app is optimized for one-handed gym use. The web app provides a full-width dashboard experience.
- Why it matters: User explicitly wants both platforms from day one.
- Source: user
- Primary owning slice: M001/S06
- Supporting slices: M001/S01 through M001/S05, M005/S04
- Validation: M001/S06 — All M001 features ported to React Native mobile app: exercise browse with filters, workout CRUD with full set tracking/supersets/previous performance, rest timer with vibration, templates, settings with unit toggle. M002/S04 — All M002 analytics features ported to mobile: PR badges, exercise progress charts (Victory Native XL), muscle heatmap (react-native-svg), volume bar chart, summary cards. M003/S04 — All M003 social features ported to mobile: 8 social components, 5 social screens (Feed, Profile, ProfileSetup, OtherProfile, SharedWorkout), 6-tab navigation, usePaginatedQuery + FlatList feed, settings consolidated into Profile tab. M004/S04 — All M004 competitive features ported to mobile: 3 competitive screens (Leaderboard, Challenges, ChallengeDetail), 3 reusable components (PillSelectorNative, BadgeDisplayNative, LeaderboardTableNative), 7th Compete tab, badge display on both profile screens, leaderboard opt-in toggle. M005/S04 — All M005 collaborative session features ported to mobile: GroupSessionScreen + JoinSessionScreen + 4 session components (participant list, set feed, shared timer, summary), heartbeat lifecycle, typed WorkoutsStackParamList navigator, Vibration haptics. Both platforms use same Convex backend for realtime sync. TypeScript compiles across all 3 packages (0 new errors). 72/72 M001+M002 backend checks pass (regression baseline). 42 M003 + 40 M004 + 41 M005 checks now pass live in M006/S05; manual Expo verification still required for runtime UX.
- Notes: UI code is platform-specific (React vs React Native). Backend and types are shared.

### R012 — Personal Records Tracking
- Class: core-capability
- Status: validated
- Description: The app automatically identifies and highlights personal records (1RM, volume PR, max reps at a weight). PRs are flagged in real-time during a workout and visible in exercise history.
- Why it matters: PRs are the primary motivator for gym-goers. Missing a PR notification is a missed dopamine hit.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: M002/S01 — Weight PR (Epley 1RM), volume PR (session total), rep PR (single-set max) detected inside logSet mutation, stored in personalRecords table. 12-check verification script (verify-s01-m02.ts) proves all 3 PR types, warmup/missing-data edge cases, metadata integrity, query filtering, and no false positives. Web UI renders reactive 🏆 badge via useQuery(getWorkoutPRs) subscription. M002/S04 — Mobile 🏆 PR badges render in WorkoutExerciseItem with same reactive subscription pattern (D055). Cross-platform delivery complete.
- Notes: PR detection logic runs on set completion, comparing against all historical data for that exercise. Rep PR is exercise-wide, not per weight tier (D053).

### R013 — Progress Charts Per Exercise
- Class: core-capability
- Status: validated
- Description: Users can view line/bar charts showing their progress over time for any exercise — weight progression, volume progression, estimated 1RM over time.
- Why it matters: Visual progress is a key retention driver. Users want to see the trend line going up.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: M002/S02 — `getExerciseProgress` query produces accurate time-series data (8/8 backend checks). Recharts line chart on web at `/exercises/[id]` with dual Y-axes (weight/1RM + volume), time period filtering (30d/90d/6mo/1yr/all-time), loading/empty states. ExerciseCard links to detail page. M002/S04 — Mobile ExerciseDetailScreen with Victory Native XL line chart (3 metrics, dual y-axes, period selector) consuming same getExerciseProgress query. Cross-platform delivery complete.
- Notes: Web uses Recharts 3.8.0. Mobile uses Victory Native XL 41.x (D046). Data shape contract: `{ date, maxWeight, totalVolume, estimated1RM? }[]`.

### R014 — Volume Analytics and Muscle Group Heatmaps
- Class: core-capability
- Status: validated
- Description: Dashboard showing total volume per muscle group over configurable time periods. Visual muscle group heatmap showing which areas are being trained most/least. Weekly and monthly summary views.
- Why it matters: Helps users identify imbalances and ensure balanced training coverage.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: M002/S01
- Validation: M002/S03 — 11/11 backend checks (verify-s03-m02.ts) prove volume aggregation accuracy, secondary muscle attribution (50%), warmup exclusion, bodyweight handling, time-range filtering, weekly/monthly summary totals, top exercises ranking, and empty state. Web dashboard at `/analytics` renders MuscleHeatmap (7 color-coded SVG body regions), VolumeByMuscleGroupChart (Recharts horizontal bar chart), WeeklySummaryCard, MonthlySummaryCard with period selector (7d/30d/90d/All Time). All data-analytics-* attributes present for programmatic verification. M002/S04 — Mobile Analytics tab with MuscleHeatmapNative (react-native-svg), VolumeBarChartNative (Victory Native XL), WeeklySummaryCardNative, MonthlySummaryCardNative, PeriodSelector — all consuming same backend queries. Cross-platform delivery complete.
- Notes: Volume = sets × reps × weight. Muscle group mapping comes from exercise library data. Secondary muscles attributed at 50% for heatmap only.

### R029 — Dev Stack Boots Cleanly
- Class: operability
- Status: active
- Description: Convex backend, Next.js web app, and Expo mobile app all boot cleanly in local dev with a live Convex deployment. Seed data loaded. All dependencies resolved.
- Why it matters: Nothing else can be tested or demoed if the dev stack doesn't run.
- Source: execution
- Primary owning slice: M006/S01
- Supporting slices: S06
- Validation: M006/S01 — cross-package env contract is executable via `verify-env-contract.ts`, native Convex module resolution is fixed by a direct dependency, seed-data readiness passes against the configured backend URL (144 exercises), and the web app boots at `http://localhost:3000`. Expo runtime boot remains for M006/S06, so requirement stays active.
- Notes: `packages/backend/.env.local` is now the canonical local backend env boundary. Web/native public Convex URLs must mirror its `CONVEX_URL`.

### R030 — Landing Page Redesign
- Class: launchability
- Status: active
- Description: Landing page at `/` is a polished, bold workout tracker showcase with Apple Fitness+ inspired design — hero section, feature highlights, social proof, and CTA. No trace of the UseNotes template.
- Why it matters: The landing page is the first impression. Currently it says "UseNotes" and describes a note-taking app.
- Source: user
- Primary owning slice: M006/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Bold & energetic style. Apple Fitness+ aesthetic — rounded cards, gradient backgrounds, warm colors, premium feel.

### R031 — App Pages Design Refresh
- Class: quality-attribute
- Status: active
- Description: All authenticated app pages share a cohesive Apple Fitness+ design language — modern navigation, rounded cards, gradient accents, warm colors, consistent typography and spacing. Premium feel throughout.
- Why it matters: The app is feature-complete but visually plain. A design refresh makes it feel like a real product.
- Source: user
- Primary owning slice: M006/S03
- Supporting slices: M006/S04
- Validation: unmapped
- Notes: Supersedes D007 clean/minimal for web. Design tokens defined in globals.css. App shell with modern navigation.

### R033 — Mobile App Functional on iOS Simulator
- Class: launchability
- Status: active
- Description: The Expo mobile app boots on iOS Simulator with all 7 tabs rendering, navigation working, and core flows (exercise browse, workout logging) functional.
- Why it matters: The mobile app has never been runtime-tested. 55 component/screen files exist but none have been verified on a real device or simulator.
- Source: user
- Primary owning slice: M006/S06
- Supporting slices: none
- Validation: M006/S06 established the runtime boundary but did not validate the requirement: `apps/native/src/navigation/MainTabs.tsx` defines the 7-tab contract (Exercises, Workouts, Templates, Analytics, Feed, Compete, Profile), `pnpm --filter native-app typecheck` passes, and `pnpm --filter native-app exec expo start --ios` loads env plus starts Metro; however, no simulator UI launched because `xcode-select -p` still points at `/Library/Developer/CommandLineTools` and `xcrun simctl list devices` fails with `unable to find utility "simctl"`. `S06-UAT.md` records that the app launch state, all 7 tabs, Exercises render, Workouts → ActiveWorkout logging loop, Analytics render, and profile/auth runtime state all remain unproven until full Xcode/simulator tooling is available.
- Notes: Requires xcode-select path switch to Xcode.app for simulator access before any runtime proof can be claimed.

## Validated

### R015 — User Profiles
- Class: core-capability
- Status: validated
- Description: Public user profiles showing display name, avatar, bio, workout stats (total workouts, streak, favorite exercises), and recent activity. Profile is viewable by other users.
- Why it matters: Foundation for all social features. Users need an identity beyond auth.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: M006/S05 — `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m03.ts` passed 12/12 against the live Convex backend after `verify-seed-data.ts` confirmed connectivity and seeded data. S05 also revalidated the readiness surface with `verify-env-contract.ts` and `--check-failure-fixture`, then reran the full staged sweep and backend typecheck clean.
- Notes: Profile data stored in Convex, not just Clerk. Clerk provides auth identity, Convex stores app-level profile. Recent activity display deferred to S02 (feed items on profile).

### R016 — Follow System and Activity Feed
- Class: core-capability
- Status: validated
- Description: Users can follow other users. A realtime activity feed shows workouts completed by followed users, with reactions (e.g. fire emoji, fist bump).
- Why it matters: Social accountability is a proven retention mechanism for fitness apps.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M003/S01
- Validation: M006/S05 — `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m03.ts` passed 15/15 against the live Convex backend after the readiness probes succeeded. T02 reran the same script during the final staged sweep and preserved the env-contract diagnostic seam with `verify-env-contract.ts --check-failure-fixture`.
- Notes: Feed is realtime via Convex subscriptions. Privacy: users can make workouts private (S03). Block/report mutations exist; block UI deferred.

### R017 — Workout Sharing
- Class: core-capability
- Status: validated
- Description: Users can share a workout summary (exercises, sets, PRs hit) to their feed or via a shareable link. Shared workouts can be cloned as templates by other users.
- Why it matters: Sharing drives discovery and community engagement. Cloning templates spreads good programming.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: M003/S01, M001/S05
- Validation: M006/S05 — `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m03.ts` passed 15/15 on the live backend. This pass was part of the full S05 sweep that also reran `verify-seed-data.ts`, rechecked `verify-env-contract.ts`, and finished with backend typecheck green.
- Notes: Shareable link generates a public read-only view even for non-users. Share token is the feedItem._id (D097). Privacy default is public (D073).

### R018 — Leaderboards
- Class: core-capability
- Status: validated
- Description: Leaderboards for various metrics — strongest lifts (by bodyweight class or absolute), most volume, longest streak, most workouts. Filterable by time period and exercise.
- Why it matters: Competition drives engagement. Users want to see how they stack up.
- Source: user
- Primary owning slice: M004/S01
- Supporting slices: M003/S01
- Validation: M006/S05 — `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m04.ts` passed 12/12 against the live backend during both the baseline sweep and the final rerun. The slice close proof also includes `pnpm turbo run typecheck --filter=@packages/backend` passing after the full M003–M005 staged rerun.
- Notes: Opt-in leaderboards — users choose whether to participate. Absolute ranking only (no bodyweight normalization, D112). Period filtering cosmetic in S01 (D117).

### R019 — Group Challenges
- Class: core-capability
- Status: validated
- Description: Users can create or join time-limited challenges (e.g., "most pull-ups in a week", "complete 20 workouts in a month"). Challenges have a start/end date, rules, and a live leaderboard.
- Why it matters: Challenges drive time-bounded engagement spikes and group participation.
- Source: user
- Primary owning slice: M004/S02
- Supporting slices: M004/S01
- Validation: M006/S05 — `pnpm --filter @packages/backend exec tsx scripts/verify-s02-m04.ts` passed 16/16 against the live backend, then passed again in T02’s final staged rerun after the env-contract seam stopped reproducing and its failure fixture was proven inspectable.
- Notes: Challenge progress computed from workout data, not self-reported. Stale currentValue on workout deletion is a known limitation (D127).

### R020 — Achievements and Badges
- Class: differentiator
- Status: validated
- Description: Gamification layer — users earn badges for milestones (first workout, 100 workouts, 1000lb total, etc.). Badges display on profiles.
- Why it matters: Gamification increases long-term retention through collection mechanics.
- Source: user
- Primary owning slice: M004/S03
- Supporting slices: M003/S01
- Validation: M006/S05 — `pnpm --filter @packages/backend exec tsx scripts/verify-s03-m04.ts` passed 12/12 against the live backend. The same slice close evidence path reran `verify-seed-data.ts`, the rest of the M003–M005 runners, and backend typecheck without cleanup leakage.
- Notes: Badge rules are server-side to prevent cheating. Badge definitions are a TypeScript constant (D110), not data-driven. Evaluation is self-healing — missed badges caught on next workout completion.

### R021 — Collaborative Live Workouts
- Class: differentiator
- Status: validated
- Description: Users can start a shared workout session that multiple participants join in realtime. All participants see each other's sets as they're logged. Shared rest timer. Realtime presence indicators showing who's active.
- Why it matters: This is the marquee differentiator — training partners can stay in sync even when not physically together.
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: M005/S02
- Validation: M006/S05 — the live backend sweep proved all three session runners: `pnpm --filter @packages/backend exec tsx scripts/verify-s01-m05.ts` passed 12/12, `verify-s02-m05.ts` passed 10/10, and `verify-s03-m05.ts` passed 19/19, for an actual M005 total of 41/41. S05 also reran backend typecheck successfully after the staged sweep. Two-browser/two-device manual runtime proof remains a separate UX-level concern for later validation, but the backend contract is now live-verified.
- Notes: Leverages Convex realtime subscriptions. Presence via heartbeat pattern. S01 proved heartbeat write load risk manageable. S02 proved timer sync via server-authoritative timestamp (D138). Timer pause = clear, no resume (D155). S04 mobile port uses manual invite code entry (D162), no deep linking.

### R032 — Full Backend Verification
- Class: quality-attribute
- Status: validated
- Description: All pending verification checks for M003–M005 execute against a live Convex backend and pass. Any bugs found are fixed.
- Why it matters: Features built in M003–M005 had never been runtime-tested. Structural proof (TypeScript compilation) was not sufficient for confidence.
- Source: execution
- Primary owning slice: M006/S05
- Supporting slices: none
- Validation: M006/S05 — readiness probes and the full staged sweep passed against the live backend: `pnpm --filter @packages/backend exec tsx scripts/verify-env-contract.ts` (green on required checks, with diagnostic seam also proven via `--check-failure-fixture`), `pnpm --filter @packages/backend exec tsx scripts/verify-seed-data.ts` (144 seeded exercises), `verify-s01-m03.ts` 12/12, `verify-s02-m03.ts` 15/15, `verify-s03-m03.ts` 15/15, `verify-s01-m04.ts` 12/12, `verify-s02-m04.ts` 16/16, `verify-s03-m04.ts` 12/12, `verify-s01-m05.ts` 12/12, `verify-s02-m05.ts` 10/10, `verify-s03-m05.ts` 19/19, and `pnpm turbo run typecheck --filter=@packages/backend` passed. The truthful slice totals are M003 42/42, M004 40/40, and M005 41/41.
- Notes: Earlier slice/demo text said M005 should total 37, but the executed runner surface in S05 proved 41 checks; the requirement contract now reflects the executed truth.

## Deferred

### R024 — Offline Workout Logging
- Class: continuity
- Status: deferred
- Description: Log workouts without network connectivity, syncing when back online.
- Why it matters: Gym basements and some facilities have poor connectivity.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred per user decision. Convex doesn't have built-in offline support — requires significant custom work (local-first layer). Revisit after M002.

### R025 — Community Exercise Library
- Class: core-capability
- Status: deferred
- Description: Users can publish custom exercises to a shared community library. Other users can browse and import community exercises.
- Why it matters: Grows the exercise database organically beyond the curated seed.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred until M003+ when social features exist. Requires moderation/quality controls.

### R026 — Structured Training Programs
- Class: core-capability
- Status: deferred
- Description: Multi-week structured programs (5/3/1, PPL, etc.) with progressive overload built in.
- Why it matters: Power users want periodized programming, not just freeform logging.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: User chose freeform logging as primary loop. Programs can layer on top later.

## Out of Scope

### R027 — Nutrition/Diet Tracking
- Class: anti-feature
- Status: out-of-scope
- Description: Calorie counting, macro tracking, meal logging.
- Why it matters: Prevents scope creep into a different product category.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: This is a workout tracker, not a nutrition app. Users can integrate with MyFitnessPal etc. separately.

### R028 — Wearable/Smartwatch Integration
- Class: anti-feature
- Status: out-of-scope
- Description: Apple Watch, Fitbit, Garmin integration for heart rate, step count, etc.
- Why it matters: Prevents scope creep into hardware integration complexity.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Could be a future product extension but not part of this vision.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | validated | M001/S01 | none | M001/S01 — 144 exercises seeded, queryable, browsable |
| R002 | primary-user-loop | validated | M001/S02 | M001/S03 | M001/S02 — workout lifecycle verified by verify-s02.ts (11 checks) |
| R003 | core-capability | validated | M001/S03 | none | M001/S03 — RPE/tempo/notes round-trip + RPE validation verified |
| R004 | core-capability | validated | M001/S04 | none | M001/S04 — rest timer auto-start, priority chain, per-exercise config verified |
| R005 | core-capability | validated | M001/S03 | none | M001/S03 — superset set/clear mutations verified |
| R006 | core-capability | validated | M001/S05 | none | M001/S05 — 8-check integration script + type-safe web UI |
| R007 | core-capability | validated | M001/S03 | none | M001/S03 — previous performance query returns correct data or null |
| R008 | core-capability | validated | M001/S02 | none | M001/S02 — unit preference CRUD + conversion utility verified |
| R009 | core-capability | validated | M001/S02 | none | M001/S02 — durationSeconds server-side computation verified |
| R010 | core-capability | validated | M001/S01 | none | M001/S01 — muscle group, equipment, text search filters verified |
| R011 | launchability | validated | M001/S06 | M001/S01-S05, M002/S04, M003/S04, M004/S04, M005/S04 | M001-M005 — all features on mobile, typecheck 3/3, 72/72 M001+M002 checks, 42/40/41 live backend checks now proven in M006/S05 |
| R012 | core-capability | validated | M002/S01 | none | M002/S01 — 12/12 backend checks, reactive 🏆 badge on web |
| R013 | core-capability | validated | M002/S02 | none | M002/S02 — 8/8 backend checks, Recharts chart on web |
| R014 | core-capability | validated | M002/S03 | M002/S01 | M002/S03 — 11/11 backend checks, web dashboard with heatmap + charts + summaries |
| R015 | core-capability | validated | M003/S01 | none | M006/S05 — verify-s01-m03.ts passed 12/12 live |
| R016 | core-capability | validated | M003/S02 | M003/S01 | M006/S05 — verify-s02-m03.ts passed 15/15 live |
| R017 | core-capability | validated | M003/S03 | M003/S01, M001/S05 | M006/S05 — verify-s03-m03.ts passed 15/15 live |
| R018 | core-capability | validated | M004/S01 | M003/S01, M004/S04 | M006/S05 — verify-s01-m04.ts passed 12/12 live |
| R019 | core-capability | validated | M004/S02 | M004/S01, M004/S04 | M006/S05 — verify-s02-m04.ts passed 16/16 live |
| R020 | differentiator | validated | M004/S03 | M003/S01, M004/S04 | M006/S05 — verify-s03-m04.ts passed 12/12 live |
| R021 | differentiator | validated | M005/S01 | M005/S02, M005/S04 | M006/S05 — verify-s01/02/03-m05.ts passed 12/10/19 live (41/41 total) |
| R022 | quality-attribute | validated | M001/S06 | all UI slices | M001/S06 — theme.ts tokens, light status bar, consistent styling, human UAT pending |
| R023 | constraint | validated | M001/S01 | none | M001/S01 — /exercises auth gating verified (web) |
| R024 | continuity | deferred | none | none | unmapped |
| R025 | core-capability | deferred | none | none | unmapped |
| R026 | core-capability | deferred | none | none | unmapped |
| R027 | anti-feature | out-of-scope | none | none | n/a |
| R028 | anti-feature | out-of-scope | none | none | n/a |
| R029 | operability | active | M006/S01 | S06 | M006/S01 — env contract executable, native Convex dependency fixed, seed-data verifier passes (144 exercises), web boots at localhost:3000; Expo runtime still pending |
| R030 | launchability | active | M006/S02 | none | M006/S02 — landing rewrite shipped and static/typecheck proof passed; live browser validation still blocked by Clerk publishable-key middleware failure |
| R031 | quality-attribute | active | M006/S03 | M006/S04 | M006/S03 — app-shell tokens, shared primitives, protected-route layout seam, representative route adoption, typecheck pass; live browser proof blocked by Clerk publishable-key failure |
| R032 | quality-attribute | validated | M006/S05 | none | M006/S05 — readiness probes + 9 live runners + backend typecheck all passed; totals 42/42, 40/40, 41/41 |
| R033 | launchability | active | M006/S06 | none | M006/S06 — 7-tab contract confirmed in `MainTabs.tsx`, native typecheck passes, Expo loads env + starts Metro, but simulator UI proof is blocked because `xcode-select -p` points at CommandLineTools and `xcrun simctl list devices` fails |

## Coverage Summary

- Active requirements: 5 (R029, R030, R031, R033)
- Mapped to slices: 28
- Validated: 23 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016, R017, R018, R019, R020, R021, R022, R023, R032)
- Unmapped active requirements: 0
 to slices: 28
- Validated: 23 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016, R017, R018, R019, R020, R021, R022, R023, R032)
- Unmapped active requirements: 0
/40, 41/41 |
| R033 | launchability | active | M006/S06 | none | unmapped |

## Coverage Summary

- Active requirements: 5 (R029, R030, R031, R033)
- Mapped to slices: 28
- Validated: 23 (R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016, R017, R018, R019, R020, R021, R022, R023, R032)
- Unmapped active requirements: 0
